use crate::error::CliError;
use crate::generator::GeneratedCode;
use std::fs;
use std::path::PathBuf;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub struct FileWriter {
    output_dir: PathBuf,
}

impl FileWriter {
    pub fn new(output_dir: PathBuf) -> Self {
        Self { output_dir }
    }

    pub fn write_generated_code(&self, code: &GeneratedCode) -> Result<Vec<PathBuf>, CliError> {
        // Ensure output directory exists
        self.ensure_directory_exists()?;

        let mut written_files = Vec::new();

        // Define files to write
        let files = vec![
            ("main.tf", &code.main_tf),
            ("variables.tf", &code.variables_tf),
            ("providers.tf", &code.providers_tf),
            ("outputs.tf", &code.outputs_tf),
        ];

        // Write each file
        for (filename, content) in files {
            let file_path = self.output_dir.join(filename);

            // Check if file exists and warn user
            if file_path.exists() {
                eprintln!("Warning: Overwriting existing file: {}", file_path.display());
            }

            // Write file content
            fs::write(&file_path, content).map_err(|e| {
                CliError::IoError(std::io::Error::new(
                    e.kind(),
                    format!("Failed to write {}: {}", filename, e),
                ))
            })?;

            // Set restrictive file permissions (0600) on Unix systems
            #[cfg(unix)]
            {
                let metadata = fs::metadata(&file_path)?;
                let mut permissions = metadata.permissions();
                permissions.set_mode(0o600);
                fs::set_permissions(&file_path, permissions)?;
            }

            written_files.push(file_path);
        }

        Ok(written_files)
    }

    fn ensure_directory_exists(&self) -> Result<(), CliError> {
        if !self.output_dir.exists() {
            fs::create_dir_all(&self.output_dir).map_err(|e| {
                CliError::IoError(std::io::Error::new(
                    e.kind(),
                    format!(
                        "Failed to create output directory {}: {}",
                        self.output_dir.display(),
                        e
                    ),
                ))
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
        writer.ensure_directory_exists().unwrap();
        
        // Directory should now exist
        assert!(output_dir.exists());
    }

    #[test]
    fn test_write_generated_code_creates_all_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let code = GeneratedCode {
            main_tf: "resource \"aws_instance\" \"example\" {}".to_string(),
            variables_tf: "variable \"region\" {}".to_string(),
            providers_tf: "provider \"aws\" {}".to_string(),
            outputs_tf: "output \"instance_id\" {}".to_string(),
        };
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_generated_code(&code).unwrap();
        
        // Should have written 4 files
        assert_eq!(written_files.len(), 4);
        
        // Verify all files exist
        assert!(output_dir.join("main.tf").exists());
        assert!(output_dir.join("variables.tf").exists());
        assert!(output_dir.join("providers.tf").exists());
        assert!(output_dir.join("outputs.tf").exists());
        
        // Verify file contents
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, code.main_tf);
        
        let variables_content = fs::read_to_string(output_dir.join("variables.tf")).unwrap();
        assert_eq!(variables_content, code.variables_tf);
        
        let providers_content = fs::read_to_string(output_dir.join("providers.tf")).unwrap();
        assert_eq!(providers_content, code.providers_tf);
        
        let outputs_content = fs::read_to_string(output_dir.join("outputs.tf")).unwrap();
        assert_eq!(outputs_content, code.outputs_tf);
    }

    #[test]
    #[cfg(unix)]
    fn test_file_permissions_are_restrictive() {
        use std::os::unix::fs::PermissionsExt;
        
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let code = GeneratedCode {
            main_tf: "resource \"aws_instance\" \"example\" {}".to_string(),
            variables_tf: "variable \"region\" {}".to_string(),
            providers_tf: "provider \"aws\" {}".to_string(),
            outputs_tf: "output \"instance_id\" {}".to_string(),
        };
        
        let writer = FileWriter::new(output_dir.clone());
        writer.write_generated_code(&code).unwrap();
        
        // Check file permissions (should be 0600)
        let metadata = fs::metadata(output_dir.join("main.tf")).unwrap();
        let permissions = metadata.permissions();
        assert_eq!(permissions.mode() & 0o777, 0o600);
    }

    #[test]
    fn test_overwrite_existing_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let code1 = GeneratedCode {
            main_tf: "original content".to_string(),
            variables_tf: "original variables".to_string(),
            providers_tf: "original providers".to_string(),
            outputs_tf: "original outputs".to_string(),
        };
        
        let code2 = GeneratedCode {
            main_tf: "new content".to_string(),
            variables_tf: "new variables".to_string(),
            providers_tf: "new providers".to_string(),
            outputs_tf: "new outputs".to_string(),
        };
        
        let writer = FileWriter::new(output_dir.clone());
        
        // Write first time
        writer.write_generated_code(&code1).unwrap();
        
        // Verify original content
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "original content");
        
        // Write second time (should overwrite)
        writer.write_generated_code(&code2).unwrap();
        
        // Verify new content
        let main_content = fs::read_to_string(output_dir.join("main.tf")).unwrap();
        assert_eq!(main_content, "new content");
    }

    #[test]
    fn test_returns_list_of_written_files() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("terraform");
        
        let code = GeneratedCode {
            main_tf: "main".to_string(),
            variables_tf: "variables".to_string(),
            providers_tf: "providers".to_string(),
            outputs_tf: "outputs".to_string(),
        };
        
        let writer = FileWriter::new(output_dir.clone());
        let written_files = writer.write_generated_code(&code).unwrap();
        
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
}
