use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;

use crate::error::CliError;

/// IDP CLI - Generate infrastructure-as-code from IDP blueprints and stacks using templates
#[derive(Parser, Debug)]
#[command(name = "idp-cli")]
#[command(author, version, about)]
#[command(long_about = "
IDP CLI generates infrastructure-as-code and Kubernetes manifests from templates by substituting \
variables with data from blueprints and stacks managed by the IDP API.

EXAMPLES:
  # Generate Terraform code from a blueprint
  idp-cli generate blueprint web-app-blueprint \\
    --template-dir ./templates/terraform \\
    --output-dir ./generated/terraform \\
    --api-key $IDP_API_KEY

  # Generate Kubernetes manifests from a stack
  idp-cli generate stack my-prod-stack \\
    --template-dir ./templates/k8s \\
    --output-dir ./generated/k8s \\
    --api-url https://api.example.com/v1

  # Generate with custom variables
  idp-cli generate blueprint web-app-blueprint \\
    --template-dir ./templates/terraform \\
    --variables-file ./custom-vars.yaml \\
    --output-dir ./output

  # List available variables from a blueprint
  idp-cli list-variables blueprint web-app-blueprint

  # List available variables from a stack
  idp-cli list-variables stack my-prod-stack

ENVIRONMENT VARIABLES:
  IDP_API_KEY         API key for authentication (can also use --api-key)
  IDP_API_URL         Base URL for IDP API (default: http://localhost:8082/api/v1)
  IDP_OUTPUT_DIR      Output directory for generated files (default: ./output)
  IDP_TEMPLATE_DIR    Template directory path (can also use --template-dir)

CONFIGURATION PRECEDENCE:
  1. Command-line flags (highest priority)
  2. Environment variables
  3. Default values (lowest priority)

TEMPLATE SYNTAX:
  Variables use {{variable_name}} syntax
  Nested access: {{resource.name}}
  Array indexing: {{resources[0].name}}
  Default values: {{variable|default:\"value\"}}
  Conditionals: {{#if variable}}...{{/if}}
  Loops: {{#each resources}}...{{/each}}

For more information, visit: https://github.com/angryss/idp-cli
")]
pub struct CliArgs {
    #[command(subcommand)]
    pub command: Command,

    /// API key for authentication (can also be set via IDP_API_KEY environment variable)
    #[arg(long, env = "IDP_API_KEY")]
    pub api_key: Option<String>,

    /// Base URL for IDP API (can also be set via IDP_API_URL environment variable)
    #[arg(long, env = "IDP_API_URL", default_value = "http://localhost:8082/api/v1")]
    pub api_url: Option<String>,

    /// Output directory for generated files (can also be set via IDP_OUTPUT_DIR environment variable)
    #[arg(long, env = "IDP_OUTPUT_DIR", default_value = "./output")]
    pub output_dir: Option<PathBuf>,
}

/// Data source type for template generation
#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum DataSource {
    /// Use a blueprint as the data source
    Blueprint,
    /// Use a stack as the data source
    Stack,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Generate infrastructure-as-code from templates using blueprint or stack data
    /// 
    /// This command processes template files by substituting variables with data from
    /// blueprints or stacks. Templates can be Terraform (.tf), Kubernetes YAML (.yaml, .yml),
    /// or JSON (.json) files.
    /// 
    /// EXAMPLES:
    ///   # Generate from blueprint
    ///   idp-cli generate blueprint web-app --template-dir ./templates/terraform
    /// 
    ///   # Generate from stack with custom variables
    ///   idp-cli generate stack prod-stack --template-dir ./templates/k8s --variables-file vars.yaml
    /// 
    ///   # Generate with custom output directory
    ///   idp-cli generate blueprint api-service --template-dir ./templates --output-dir ./infra
    Generate {
        /// Data source type (blueprint or stack)
        #[arg(value_enum)]
        data_source: DataSource,
        
        /// Blueprint or stack identifier (name or UUID)
        /// 
        /// Can be either the human-readable name or the UUID of the blueprint/stack.
        /// Examples: "web-app-blueprint", "550e8400-e29b-41d4-a716-446655440000"
        identifier: String,
        
        /// Template directory containing template files
        /// 
        /// The directory should contain template files with .tf, .yaml, .yml, or .json extensions.
        /// The directory structure will be preserved in the output. Can also be set via
        /// IDP_TEMPLATE_DIR environment variable.
        /// 
        /// Example: ./templates/terraform
        #[arg(long, env = "IDP_TEMPLATE_DIR")]
        template_dir: PathBuf,
        
        /// Optional variables file (JSON or YAML) to merge with blueprint/stack data
        /// 
        /// Custom variables will override blueprint/stack variables when conflicts occur.
        /// Supports both JSON and YAML formats.
        /// 
        /// Example: ./custom-vars.yaml
        #[arg(long)]
        variables_file: Option<PathBuf>,
    },
    /// List available variables from a blueprint or stack
    /// 
    /// This command displays all variables that would be available when processing templates
    /// for the specified blueprint or stack. Use this to understand what data you can reference
    /// in your templates.
    /// 
    /// EXAMPLES:
    ///   # List blueprint variables
    ///   idp-cli list-variables blueprint web-app-blueprint
    /// 
    ///   # List stack variables
    ///   idp-cli list-variables stack my-prod-stack
    ListVariables {
        /// Data source type (blueprint or stack)
        #[arg(value_enum)]
        data_source: DataSource,
        
        /// Blueprint or stack identifier (name or UUID)
        /// 
        /// Can be either the human-readable name or the UUID of the blueprint/stack.
        identifier: String,
    },
    /// Display version information
    Version,
}

impl CliArgs {
    /// Parse command-line arguments and validate required fields
    pub fn parse_and_validate() -> Result<Self, CliError> {
        let args = Self::parse();
        args.validate()?;
        Ok(args)
    }

    /// Validate that required arguments are present
    pub fn validate(&self) -> Result<(), CliError> {
        // Version command doesn't require API key
        if matches!(self.command, Command::Version) {
            return Ok(());
        }

        // API key is required for Generate and ListVariables commands
        if self.api_key.is_none() {
            return Err(CliError::ConfigurationError(
                "API key is required. Provide it via --api-key flag or IDP_API_KEY environment variable.".to_string()
            ));
        }

        // Validate API key format (basic check - not empty)
        if let Some(key) = &self.api_key {
            if key.trim().is_empty() {
                return Err(CliError::ConfigurationError(
                    "API key cannot be empty.".to_string()
                ));
            }
        }

        // Validate API URL format
        if let Some(url) = &self.api_url {
            if !url.starts_with("http://") && !url.starts_with("https://") {
                return Err(CliError::ConfigurationError(
                    format!("Invalid API URL '{}'. URL must start with http:// or https://", url)
                ));
            }
        }

        // Validate template directory exists for Generate command
        if let Command::Generate { template_dir, .. } = &self.command {
            if !template_dir.exists() {
                return Err(CliError::ConfigurationError(
                    format!("Template directory does not exist: {}", template_dir.display())
                ));
            }
            if !template_dir.is_dir() {
                return Err(CliError::ConfigurationError(
                    format!("Template path is not a directory: {}", template_dir.display())
                ));
            }
        }

        // Validate variables file exists if provided
        if let Command::Generate { variables_file: Some(vars_file), .. } = &self.command {
            if !vars_file.exists() {
                return Err(CliError::ConfigurationError(
                    format!("Variables file does not exist: {}", vars_file.display())
                ));
            }
            if !vars_file.is_file() {
                return Err(CliError::ConfigurationError(
                    format!("Variables path is not a file: {}", vars_file.display())
                ));
            }
        }

        Ok(())
    }

    /// Get the API key, returning an error if not present
    pub fn get_api_key(&self) -> Result<&str, CliError> {
        self.api_key
            .as_deref()
            .ok_or_else(|| CliError::ConfigurationError(
                "API key is required. Provide it via --api-key flag or IDP_API_KEY environment variable.".to_string()
            ))
    }

    /// Get the API URL with default fallback
    pub fn get_api_url(&self) -> &str {
        self.api_url
            .as_deref()
            .unwrap_or("http://localhost:8082/api/v1")
    }

    /// Get the output directory with default fallback
    pub fn get_output_dir(&self) -> PathBuf {
        self.output_dir
            .clone()
            .unwrap_or_else(|| PathBuf::from("./output"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_version_command_does_not_require_api_key() {
        let args = CliArgs {
            command: Command::Version,
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert!(args.validate().is_ok());
    }

    #[test]
    fn test_generate_command_requires_api_key() {
        // Create a temporary directory for testing
        let temp_dir = std::env::temp_dir().join("test_template_dir");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("API key is required"));

        // Cleanup
        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_list_variables_command_requires_api_key() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Stack,
                identifier: "test-stack".to_string(),
            },
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("API key is required"));
    }

    #[test]
    fn test_empty_api_key_is_invalid() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_2");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: Some("   ".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_invalid_api_url_format() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_3");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("invalid-url".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid API URL"));

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_valid_http_url() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_4");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert!(args.validate().is_ok());

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_valid_https_url() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_5");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("https://api.example.com/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert!(args.validate().is_ok());

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_template_dir_must_exist() {
        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: PathBuf::from("/nonexistent/path"),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Template directory does not exist"));
    }

    #[test]
    fn test_template_dir_must_be_directory() {
        // Create a temporary file (not directory)
        let temp_file = std::env::temp_dir().join("test_template_file.txt");
        fs::write(&temp_file, "test").ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_file.clone(),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not a directory"));

        fs::remove_file(&temp_file).ok();
    }

    #[test]
    fn test_variables_file_must_exist_if_provided() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_6");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: Some(PathBuf::from("/nonexistent/vars.yaml")),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Variables file does not exist"));

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_get_api_key_returns_key() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("my-api-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert_eq!(args.get_api_key().unwrap(), "my-api-key");
    }

    #[test]
    fn test_get_api_key_returns_error_when_missing() {
        let args = CliArgs {
            command: Command::Version,
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert!(args.get_api_key().is_err());
    }

    #[test]
    fn test_get_api_url_returns_provided_url() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("https://api.example.com/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        assert_eq!(args.get_api_url(), "https://api.example.com/v1");
    }

    #[test]
    fn test_get_api_url_returns_default() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: None,
            output_dir: Some(PathBuf::from("./output")),
        };

        assert_eq!(args.get_api_url(), "http://localhost:8082/api/v1");
    }

    #[test]
    fn test_get_output_dir_returns_provided_path() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("/custom/path")),
        };

        assert_eq!(args.get_output_dir(), PathBuf::from("/custom/path"));
    }

    #[test]
    fn test_get_output_dir_returns_default() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Blueprint,
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: None,
        };

        assert_eq!(args.get_output_dir(), PathBuf::from("./output"));
    }

    #[test]
    fn test_data_source_blueprint_variant() {
        let temp_dir = std::env::temp_dir().join("test_template_dir_7");
        fs::create_dir_all(&temp_dir).ok();

        let args = CliArgs {
            command: Command::Generate {
                data_source: DataSource::Blueprint,
                identifier: "my-blueprint".to_string(),
                template_dir: temp_dir.clone(),
                variables_file: None,
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        if let Command::Generate { data_source, identifier, .. } = &args.command {
            assert!(matches!(data_source, DataSource::Blueprint));
            assert_eq!(identifier, "my-blueprint");
        } else {
            panic!("Expected Generate command");
        }

        fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_data_source_stack_variant() {
        let args = CliArgs {
            command: Command::ListVariables {
                data_source: DataSource::Stack,
                identifier: "my-stack".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./output")),
        };

        if let Command::ListVariables { data_source, identifier } = &args.command {
            assert!(matches!(data_source, DataSource::Stack));
            assert_eq!(identifier, "my-stack");
        } else {
            panic!("Expected ListVariables command");
        }
    }
}
