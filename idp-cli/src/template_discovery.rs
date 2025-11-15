use std::path::PathBuf;
use walkdir::WalkDir;

/// Handles discovery of template files within a template directory
pub struct TemplateDiscovery {
    /// The root directory containing template files
    pub template_dir: PathBuf,
}

impl TemplateDiscovery {
    /// Creates a new TemplateDiscovery instance
    ///
    /// # Arguments
    ///
    /// * `template_dir` - The root directory to search for template files
    pub fn new(template_dir: PathBuf) -> Self {
        Self { template_dir }
    }

    /// Discovers all template files within the template directory
    ///
    /// This method recursively walks the template directory and identifies
    /// template files by their extensions (.tf, .yaml, .yml, .json).
    /// Hidden files and directories (starting with .) are skipped.
    ///
    /// # Returns
    ///
    /// A Result containing a Vec of TemplateFile instances, or a DiscoveryError
    ///
    /// # Errors
    ///
    /// Returns DiscoveryError if:
    /// - The template directory does not exist
    /// - Permission is denied to read the directory
    /// - An I/O error occurs during directory traversal
    pub fn discover_templates(&self) -> Result<Vec<TemplateFile>, DiscoveryError> {
        // Verify the template directory exists
        if !self.template_dir.exists() {
            return Err(DiscoveryError::DirectoryNotFound(
                self.template_dir.clone(),
            ));
        }

        if !self.template_dir.is_dir() {
            return Err(DiscoveryError::NotADirectory(self.template_dir.clone()));
        }

        let mut template_files = Vec::new();

        // Walk the directory tree
        for entry in WalkDir::new(&self.template_dir)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                // Don't filter the root directory itself
                if e.path() == self.template_dir {
                    return true;
                }
                // Filter out hidden files and directories
                !Self::is_hidden(e)
            })
        {
            let entry = entry.map_err(|e| {
                // Check if this is a permission denied error
                if let Some(io_error) = e.io_error() {
                    if io_error.kind() == std::io::ErrorKind::PermissionDenied {
                        return DiscoveryError::PermissionDenied(
                            e.path()
                                .map(|p| p.display().to_string())
                                .unwrap_or_else(|| "unknown path".to_string()),
                        );
                    }
                }
                // Otherwise, treat as a generic walk error
                DiscoveryError::WalkError(e.to_string())
            })?;

            // Skip directories, only process files
            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();

            // Get the file extension
            let extension = match path.extension() {
                Some(ext) => ext.to_string_lossy().to_string(),
                None => continue, // Skip files without extensions
            };

            // Check if this is a recognized template file type
            if let Some(file_type) = TemplateFileType::from_extension(&extension) {
                // Calculate the relative path from the template directory
                let relative_path = path
                    .strip_prefix(&self.template_dir)
                    .map_err(|e| DiscoveryError::PathError(e.to_string()))?
                    .to_path_buf();

                template_files.push(TemplateFile {
                    path: path.to_path_buf(),
                    relative_path,
                    file_type,
                });
            }
        }

        Ok(template_files)
    }

    /// Checks if a directory entry is hidden (starts with .)
    ///
    /// # Arguments
    ///
    /// * `entry` - The directory entry to check
    ///
    /// # Returns
    ///
    /// true if the entry is hidden, false otherwise
    fn is_hidden(entry: &walkdir::DirEntry) -> bool {
        entry
            .file_name()
            .to_str()
            .map(|s| s.starts_with('.'))
            .unwrap_or(false)
    }
}

/// Represents a discovered template file with its metadata
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TemplateFile {
    /// Absolute path to the template file
    pub path: PathBuf,
    
    /// Path relative to the template directory root
    pub relative_path: PathBuf,
    
    /// The type of template file based on its extension
    pub file_type: TemplateFileType,
}

/// Categorizes template files by their extension
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TemplateFileType {
    /// Terraform configuration files (.tf)
    Terraform,
    
    /// YAML files (.yaml, .yml)
    Yaml,
    
    /// JSON files (.json)
    Json,
}

impl TemplateFileType {
    /// Determines the template file type from a file extension
    ///
    /// # Arguments
    ///
    /// * `extension` - The file extension (without the leading dot)
    ///
    /// # Returns
    ///
    /// Some(TemplateFileType) if the extension is recognized, None otherwise
    pub fn from_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "tf" => Some(TemplateFileType::Terraform),
            "yaml" | "yml" => Some(TemplateFileType::Yaml),
            "json" => Some(TemplateFileType::Json),
            _ => None,
        }
    }
}

/// Errors that can occur during template discovery
#[derive(Debug, thiserror::Error)]
pub enum DiscoveryError {
    /// The template directory does not exist
    #[error("Template directory not found: {0}")]
    DirectoryNotFound(PathBuf),

    /// The path exists but is not a directory
    #[error("Path is not a directory: {0}")]
    NotADirectory(PathBuf),

    /// Permission denied when accessing the directory
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    /// Error during directory traversal
    #[error("Error walking directory: {0}")]
    WalkError(String),

    /// Error processing file paths
    #[error("Path error: {0}")]
    PathError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_file_type_from_extension() {
        assert_eq!(
            TemplateFileType::from_extension("tf"),
            Some(TemplateFileType::Terraform)
        );
        assert_eq!(
            TemplateFileType::from_extension("yaml"),
            Some(TemplateFileType::Yaml)
        );
        assert_eq!(
            TemplateFileType::from_extension("yml"),
            Some(TemplateFileType::Yaml)
        );
        assert_eq!(
            TemplateFileType::from_extension("json"),
            Some(TemplateFileType::Json)
        );
        assert_eq!(TemplateFileType::from_extension("txt"), None);
    }

    #[test]
    fn test_template_file_type_case_insensitive() {
        assert_eq!(
            TemplateFileType::from_extension("TF"),
            Some(TemplateFileType::Terraform)
        );
        assert_eq!(
            TemplateFileType::from_extension("YAML"),
            Some(TemplateFileType::Yaml)
        );
        assert_eq!(
            TemplateFileType::from_extension("YML"),
            Some(TemplateFileType::Yaml)
        );
        assert_eq!(
            TemplateFileType::from_extension("JSON"),
            Some(TemplateFileType::Json)
        );
    }

    #[test]
    fn test_template_discovery_new() {
        let template_dir = PathBuf::from("/path/to/templates");
        let discovery = TemplateDiscovery::new(template_dir.clone());
        assert_eq!(discovery.template_dir, template_dir);
    }

    #[test]
    fn test_template_file_equality() {
        let file1 = TemplateFile {
            path: PathBuf::from("/templates/main.tf"),
            relative_path: PathBuf::from("main.tf"),
            file_type: TemplateFileType::Terraform,
        };
        
        let file2 = TemplateFile {
            path: PathBuf::from("/templates/main.tf"),
            relative_path: PathBuf::from("main.tf"),
            file_type: TemplateFileType::Terraform,
        };
        
        assert_eq!(file1, file2);
    }

    #[test]
    fn test_discover_templates_directory_not_found() {
        let non_existent_dir = PathBuf::from("/non/existent/directory");
        let discovery = TemplateDiscovery::new(non_existent_dir.clone());
        
        let result = discovery.discover_templates();
        assert!(result.is_err());
        
        match result.unwrap_err() {
            DiscoveryError::DirectoryNotFound(path) => {
                assert_eq!(path, non_existent_dir);
            }
            _ => panic!("Expected DirectoryNotFound error"),
        }
    }

    #[test]
    fn test_discover_templates_with_valid_files() {
        use std::fs;
        use tempfile::TempDir;

        // Create a temporary directory structure
        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        // Create test files
        fs::write(template_dir.join("main.tf"), "resource {}").unwrap();
        fs::write(template_dir.join("variables.tf"), "variable {}").unwrap();
        fs::write(template_dir.join("config.yaml"), "key: value").unwrap();
        fs::write(template_dir.join("data.yml"), "data: test").unwrap();
        fs::write(template_dir.join("settings.json"), "{}").unwrap();

        // Create a subdirectory with more files
        let subdir = template_dir.join("k8s");
        fs::create_dir(&subdir).unwrap();
        fs::write(subdir.join("deployment.yaml"), "apiVersion: v1").unwrap();
        fs::write(subdir.join("service.yml"), "kind: Service").unwrap();

        // Create files that should be ignored
        fs::write(template_dir.join("README.md"), "# README").unwrap();
        fs::write(template_dir.join("notes.txt"), "notes").unwrap();

        let discovery = TemplateDiscovery::new(template_dir.to_path_buf());
        let result = discovery.discover_templates();
        
        assert!(result.is_ok());
        let templates = result.unwrap();

        // Should find 7 template files (2 .tf, 4 .yaml/.yml, 1 .json)
        assert_eq!(templates.len(), 7);

        // Verify file types
        let tf_files: Vec<_> = templates
            .iter()
            .filter(|t| t.file_type == TemplateFileType::Terraform)
            .collect();
        assert_eq!(tf_files.len(), 2);

        let yaml_files: Vec<_> = templates
            .iter()
            .filter(|t| t.file_type == TemplateFileType::Yaml)
            .collect();
        assert_eq!(yaml_files.len(), 4);

        let json_files: Vec<_> = templates
            .iter()
            .filter(|t| t.file_type == TemplateFileType::Json)
            .collect();
        assert_eq!(json_files.len(), 1);

        // Verify relative paths are preserved
        let deployment_file = templates
            .iter()
            .find(|t| t.relative_path == PathBuf::from("k8s/deployment.yaml"))
            .expect("Should find k8s/deployment.yaml");
        assert_eq!(deployment_file.file_type, TemplateFileType::Yaml);
    }

    #[test]
    fn test_discover_templates_skips_hidden_files() {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        // Create visible files
        fs::write(template_dir.join("main.tf"), "resource {}").unwrap();

        // Create hidden files (should be skipped)
        fs::write(template_dir.join(".hidden.tf"), "hidden").unwrap();
        fs::write(template_dir.join(".gitignore"), "*.log").unwrap();

        // Create hidden directory (should be skipped)
        let hidden_dir = template_dir.join(".hidden");
        fs::create_dir(&hidden_dir).unwrap();
        fs::write(hidden_dir.join("secret.tf"), "secret").unwrap();

        let discovery = TemplateDiscovery::new(template_dir.to_path_buf());
        let result = discovery.discover_templates();
        
        assert!(result.is_ok());
        let templates = result.unwrap();

        // Should only find the visible main.tf file
        assert_eq!(templates.len(), 1);
        assert_eq!(templates[0].relative_path, PathBuf::from("main.tf"));
    }

    #[test]
    fn test_discover_templates_empty_directory() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        let discovery = TemplateDiscovery::new(template_dir.to_path_buf());
        let result = discovery.discover_templates();
        
        assert!(result.is_ok());
        let templates = result.unwrap();

        // Should return empty vector for empty directory
        assert_eq!(templates.len(), 0);
    }

    #[test]
    fn test_discover_templates_preserves_directory_structure() {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        // Create nested directory structure
        let terraform_dir = template_dir.join("terraform");
        let k8s_dir = template_dir.join("k8s");
        let k8s_base_dir = k8s_dir.join("base");

        fs::create_dir(&terraform_dir).unwrap();
        fs::create_dir(&k8s_dir).unwrap();
        fs::create_dir(&k8s_base_dir).unwrap();

        fs::write(terraform_dir.join("main.tf"), "resource {}").unwrap();
        fs::write(k8s_dir.join("deployment.yaml"), "apiVersion: v1").unwrap();
        fs::write(k8s_base_dir.join("service.yaml"), "kind: Service").unwrap();

        let discovery = TemplateDiscovery::new(template_dir.to_path_buf());
        let result = discovery.discover_templates();
        
        assert!(result.is_ok());
        let templates = result.unwrap();

        assert_eq!(templates.len(), 3);

        // Verify relative paths preserve directory structure
        let paths: Vec<_> = templates.iter().map(|t| &t.relative_path).collect();
        assert!(paths.contains(&&PathBuf::from("terraform/main.tf")));
        assert!(paths.contains(&&PathBuf::from("k8s/deployment.yaml")));
        assert!(paths.contains(&&PathBuf::from("k8s/base/service.yaml")));
    }

    #[test]
    fn test_is_hidden() {
        use walkdir::WalkDir;
        use tempfile::TempDir;
        use std::fs;

        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        // Create visible and hidden files
        fs::write(template_dir.join("visible.tf"), "visible").unwrap();
        fs::write(template_dir.join(".hidden.tf"), "hidden").unwrap();

        let entries: Vec<_> = WalkDir::new(template_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .collect();

        let visible_entry = entries
            .iter()
            .find(|e| e.file_name() == "visible.tf")
            .unwrap();
        assert!(!TemplateDiscovery::is_hidden(visible_entry));

        let hidden_entry = entries
            .iter()
            .find(|e| e.file_name() == ".hidden.tf")
            .unwrap();
        assert!(TemplateDiscovery::is_hidden(hidden_entry));
    }

    #[test]
    #[cfg(unix)] // Permission tests only work on Unix-like systems
    fn test_discover_templates_permission_denied() {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let template_dir = temp_dir.path();

        // Create a subdirectory with restricted permissions
        let restricted_dir = template_dir.join("restricted");
        fs::create_dir(&restricted_dir).unwrap();
        fs::write(restricted_dir.join("secret.tf"), "secret").unwrap();

        // Remove read permissions from the directory
        let mut perms = fs::metadata(&restricted_dir).unwrap().permissions();
        perms.set_mode(0o000); // No permissions
        fs::set_permissions(&restricted_dir, perms).unwrap();

        let discovery = TemplateDiscovery::new(template_dir.to_path_buf());
        let result = discovery.discover_templates();

        // Restore permissions for cleanup
        let mut perms = fs::metadata(&restricted_dir).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&restricted_dir, perms).unwrap();

        // Should get a permission denied error
        assert!(result.is_err());
        match result.unwrap_err() {
            DiscoveryError::PermissionDenied(path) => {
                assert!(path.contains("restricted"));
            }
            other => panic!("Expected PermissionDenied error, got: {:?}", other),
        }
    }

    #[test]
    fn test_discover_templates_not_a_directory() {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("not_a_directory.txt");
        fs::write(&file_path, "content").unwrap();

        let discovery = TemplateDiscovery::new(file_path.clone());
        let result = discovery.discover_templates();

        assert!(result.is_err());
        match result.unwrap_err() {
            DiscoveryError::NotADirectory(path) => {
                assert_eq!(path, file_path);
            }
            _ => panic!("Expected NotADirectory error"),
        }
    }

    #[test]
    fn test_discovery_error_messages() {
        let dir_not_found = DiscoveryError::DirectoryNotFound(PathBuf::from("/missing"));
        assert_eq!(
            dir_not_found.to_string(),
            "Template directory not found: /missing"
        );

        let not_a_dir = DiscoveryError::NotADirectory(PathBuf::from("/file.txt"));
        assert_eq!(
            not_a_dir.to_string(),
            "Path is not a directory: /file.txt"
        );

        let permission_denied = DiscoveryError::PermissionDenied("/restricted".to_string());
        assert_eq!(
            permission_denied.to_string(),
            "Permission denied: /restricted"
        );

        let walk_error = DiscoveryError::WalkError("I/O error".to_string());
        assert_eq!(walk_error.to_string(), "Error walking directory: I/O error");

        let path_error = DiscoveryError::PathError("Invalid path".to_string());
        assert_eq!(path_error.to_string(), "Path error: Invalid path");
    }
}
