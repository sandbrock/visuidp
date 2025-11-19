use crate::error::CliError;
use crate::template_processor::ProcessedFile;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub struct FileWriter {
    output_dir: PathBuf,
}

impl FileWriter {
    pub fn new(output_dir: PathBuf) -> Self {
        Self { output_dir }
    }

    /// Write processed template files to the output directory
    /// 
    /// Preserves the directory structure from the template directory and creates
    /// parent directories as needed. Warns before overwriting existing files.
    /// Uses atomic writes (write to temp, then rename) for safety.
    /// 
    /// # Arguments
    /// * `files` - Vector of ProcessedFile instances to write
    /// 
    /// # Returns
    /// * `Ok(Vec<PathBuf>)` - Paths to all written files
    /// * `Err(CliError)` - If file writing fails
    pub fn write_processed_files(&self, files: &[ProcessedFile]) -> Result<Vec<PathBuf>, CliError> {
        let mut written_files = Vec::new();

        for processed_file in files {
            // Construct the full output path by joining output_dir with relative_path
            let output_path = self.output_dir.join(&processed_file.relative_path);

            // Ensure parent directory exists
            if let Some(parent) = output_path.parent() {
                self.ensure_directory_exists(parent)?;
            }

            // Write file with warning if it exists
            self.write_with_warning(&output_path, &processed_file.content)?;

            written_files.push(output_path);
        }

        Ok(written_files)
    }

    /// Write file content with warning if file exists, using atomic write
    /// 
    /// This method:
    /// 1. Checks if the file already exists and displays a warning
    /// 2. Writes to a temporary file first
    /// 3. Atomically renames the temp file to the target path
    /// 4. Sets appropriate file permissions (0600 on Unix)
    /// 
    /// # Arguments
    /// * `path` - The target file path
    /// * `content` - The content to write
    /// 
    /// # Returns
    /// * `Ok(())` - If file was written successfully
    /// * `Err(CliError)` - If writing fails
    fn write_with_warning(&self, path: &Path, content: &str) -> Result<(), CliError> {
        // Check if file exists and warn user
        if path.exists() {
            eprintln!("Warning: Overwriting existing file: {}", path.display());
        }

        // Create a temporary file in the same directory for atomic write
        let temp_path = path.with_extension("tmp");
        
        // Write content to temporary file
        fs::write(&temp_path, content).map_err(|e| {
            CliError::IoError(format!("Failed to write temporary file {}: {}", temp_path.display(), e))
        })?;

        // Set restrictive file permissions (0600) on Unix systems before rename
        #[cfg(unix)]
        {
            let metadata = fs::metadata(&temp_path)?;
            let mut permissions = metadata.permissions();
            permissions.set_mode(0o600);
            fs::set_permissions(&temp_path, permissions)?;
        }

        // Atomically rename temp file to target path
        fs::rename(&temp_path, path).map_err(|e| {
            // Clean up temp file if rename fails
            let _ = fs::remove_file(&temp_path);
            CliError::IoError(format!("Failed to rename {} to {}: {}", temp_path.display(), path.display(), e))
        })?;

        Ok(())
    }

    /// Ensure a directory exists, creating it and all parent directories if needed
    /// 
    /// # Arguments
    /// * `path` - The directory path to ensure exists
    /// 
    /// # Returns
    /// * `Ok(())` - If directory exists or was created successfully
    /// * `Err(CliError)` - If directory creation fails
    fn ensure_directory_exists(&self, path: &Path) -> Result<(), CliError> {
        if !path.exists() {
            fs::create_dir_all(path).map_err(|e| {
                CliError::IoError(format!("Failed to create directory {}: {}", path.display(), e))
            })?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_ensure_directory_exists_creates_directory() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("test_output");
        
        // Directory should not exist yet
        assert!(!output_dir.exists());
        
        let writer = FileWriter::new(output_dir.clone());
        writer.ensure_directory_exists(&output_dir).unwrap();
        
        // Directory should now exist
        assert!(output_dir.exists());
    }

    #[test]
    fn test_write_processed_files_creates_all_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "resource \"aws_instance\" \"example\" {}".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("variables.tf"),
                "variable \"region\" {}".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("providers.tf"),
                "provider \"aws\" {}".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("outputs.tf"),
                "output \"instance_id\" {}".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_processed_files(&files).unwrap();
        
        // Should have written 4 files
        assert_eq!(written_files.len(), 4);
        
        // Verify all files exist
        assert!(output_dir.join("main.tf").exists());
        assert!(output_dir.join("variables.tf").exists());
        assert!(output_dir.join("providers.tf").exists());
        assert!(output_dir.join("outputs.tf").exists());
        
        // Verify file contents
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "resource \"aws_instance\" \"example\" {}");
        
        let variables_content = fs::read_to_string(output_dir.join("variables.tf")).unwrap();
        assert_eq!(variables_content, "variable \"region\" {}");
        
        let providers_content = fs::read_to_string(output_dir.join("providers.tf")).unwrap();
        assert_eq!(providers_content, "provider \"aws\" {}");
        
        let outputs_content = fs::read_to_string(output_dir.join("outputs.tf")).unwrap();
        assert_eq!(outputs_content, "output \"instance_id\" {}");
    }

    #[test]
    fn test_write_processed_files_preserves_directory_structure() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("output");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("terraform/main.tf"),
                "resource \"aws_instance\" \"example\" {}".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("terraform/modules/vpc/main.tf"),
                "resource \"aws_vpc\" \"main\" {}".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("k8s/deployment.yaml"),
                "apiVersion: apps/v1".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_processed_files(&files).unwrap();
        
        // Should have written 3 files
        assert_eq!(written_files.len(), 3);
        
        // Verify directory structure is preserved
        assert!(output_dir.join("terraform/main.tf").exists());
        assert!(output_dir.join("terraform/modules/vpc/main.tf").exists());
        assert!(output_dir.join("k8s/deployment.yaml").exists());
        
        // Verify file contents
        let vpc_content = fs::read_to_string(output_dir.join("terraform/modules/vpc/main.tf")).unwrap();
        assert_eq!(vpc_content, "resource \"aws_vpc\" \"main\" {}");
    }

    #[test]
    fn test_write_processed_files_creates_parent_directories() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("output");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("deeply/nested/directory/structure/file.tf"),
                "content".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        writer.write_processed_files(&files).unwrap();
        
        // Verify all parent directories were created
        assert!(output_dir.join("deeply").exists());
        assert!(output_dir.join("deeply/nested").exists());
        assert!(output_dir.join("deeply/nested/directory").exists());
        assert!(output_dir.join("deeply/nested/directory/structure").exists());
        assert!(output_dir.join("deeply/nested/directory/structure/file.tf").exists());
    }

    #[test]
    #[cfg(unix)]
    fn test_file_permissions_are_restrictive() {
        use std::os::unix::fs::PermissionsExt;
        
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "resource \"aws_instance\" \"example\" {}".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        writer.write_processed_files(&files).unwrap();
        
        // Check file permissions (should be 0600)
        let metadata = fs::metadata(output_dir.join("main.tf")).unwrap();
        let permissions = metadata.permissions();
        assert_eq!(permissions.mode() & 0o777, 0o600);
    }

    #[test]
    fn test_overwrite_existing_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let files1 = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "original content".to_string(),
            ),
        ];
        
        let files2 = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "new content".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        
        // Write first time
        writer.write_processed_files(&files1).unwrap();
        
        // Verify original content
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "original content");
        
        // Write second time (should overwrite)
        writer.write_processed_files(&files2).unwrap();
        
        // Verify new content
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "new content");
    }

    #[test]
    fn test_returns_list_of_written_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "main".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("variables.tf"),
                "variables".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("providers.tf"),
                "providers".to_string(),
            ),
            ProcessedFile::new(
                PathBuf::from("outputs.tf"),
                "outputs".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_processed_files(&files).unwrap();
        
        // Should return paths to all 4 files
        assert_eq!(written_files.len(), 4);
        
        // Verify file names
        let file_names: Vec<String> = written_files
            .iter()
            .map(|p| p.file_name().unwrap().to_str().unwrap().to_string())
            .collect();
        
        assert!(file_names.contains(&"main.tf".to_string()));
        assert!(file_names.contains(&"variables.tf".to_string()));
        assert!(file_names.contains(&"providers.tf".to_string()));
        assert!(file_names.contains(&"outputs.tf".to_string()));
    }

    #[test]
    fn test_write_empty_files_list() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("output");
        
        let files: Vec<ProcessedFile> = vec![];
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_processed_files(&files).unwrap();
        
        // Should return empty list
        assert_eq!(written_files.len(), 0);
    }

    #[test]
    fn test_atomic_write_no_temp_file_left_behind() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let files = vec![
            ProcessedFile::new(
                PathBuf::from("main.tf"),
                "resource \"aws_instance\" \"example\" {}".to_string(),
            ),
        ];
        
        let writer = FileWriter::new(output_dir.clone());
        writer.write_processed_files(&files).unwrap();
        
        // Verify the target file exists
        assert!(output_dir.join("main.tf").exists());
        
        // Verify no temporary file is left behind
        assert!(!output_dir.join("main.tmp").exists());
        
        // Verify content is correct
        let content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(content, "resource \"aws_instance\" \"example\" {}");
    }

    #[test]
    fn test_write_with_warning_displays_message_for_existing_file() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        fs::create_dir_all(&output_dir).unwrap();
        
        let target_file = output_dir.join("existing.tf");
        
        // Create an existing file
        fs::write(&target_file, "old content").unwrap();
        assert!(target_file.exists());
        
        let writer = FileWriter::new(output_dir.clone());
        
        // Write new content (should display warning to stderr)
        writer.write_with_warning(&target_file, "new content").unwrap();
        
        // Verify file was overwritten
        let content = fs::read_to_string(&target_file).unwrap();
        assert_eq!(content, "new content");
    }

    #[test]
    fn test_atomic_write_preserves_permissions() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        fs::create_dir_all(&output_dir).unwrap();
        
        let target_file = output_dir.join("secure.tf");
        
        let writer = FileWriter::new(output_dir.clone());
        writer.write_with_warning(&target_file, "sensitive content").unwrap();
        
        // Verify file exists
        assert!(target_file.exists());
        
        // Verify no temp file left behind
        assert!(!output_dir.join("secure.tmp").exists());
        
        // Verify permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = fs::metadata(&target_file).unwrap();
            let permissions = metadata.permissions();
            assert_eq!(permissions.mode() & 0o777, 0o600);
        }
    }
}
