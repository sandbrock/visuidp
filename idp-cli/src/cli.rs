use clap::{Parser, Subcommand};
use std::path::PathBuf;

use crate::error::CliError;

/// IDP CLI - Generate OpenTofu infrastructure-as-code from IDP blueprints and stacks
#[derive(Parser, Debug)]
#[command(name = "idp-cli")]
#[command(author, version, about, long_about = None)]
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
    #[arg(long, env = "IDP_OUTPUT_DIR", default_value = "./terraform")]
    pub output_dir: Option<PathBuf>,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Generate OpenTofu code from a blueprint
    Blueprint {
        /// Blueprint identifier (name or UUID)
        identifier: String,
    },
    /// Generate OpenTofu code from a stack
    Stack {
        /// Stack identifier (name or UUID)
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

        // API key is required for blueprint and stack commands
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
            .unwrap_or_else(|| PathBuf::from("./terraform"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_command_does_not_require_api_key() {
        let args = CliArgs {
            command: Command::Version,
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert!(args.validate().is_ok());
    }

    #[test]
    fn test_blueprint_command_requires_api_key() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("API key is required"));
    }

    #[test]
    fn test_stack_command_requires_api_key() {
        let args = CliArgs {
            command: Command::Stack {
                identifier: "test-stack".to_string(),
            },
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("API key is required"));
    }

    #[test]
    fn test_empty_api_key_is_invalid() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("   ".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_invalid_api_url_format() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("invalid-url".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        let result = args.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid API URL"));
    }

    #[test]
    fn test_valid_http_url() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert!(args.validate().is_ok());
    }

    #[test]
    fn test_valid_https_url() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("https://api.example.com/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert!(args.validate().is_ok());
    }

    #[test]
    fn test_get_api_key_returns_key() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("my-api-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert_eq!(args.get_api_key().unwrap(), "my-api-key");
    }

    #[test]
    fn test_get_api_key_returns_error_when_missing() {
        let args = CliArgs {
            command: Command::Version,
            api_key: None,
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert!(args.get_api_key().is_err());
    }

    #[test]
    fn test_get_api_url_returns_provided_url() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("https://api.example.com/v1".to_string()),
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert_eq!(args.get_api_url(), "https://api.example.com/v1");
    }

    #[test]
    fn test_get_api_url_returns_default() {
        let args = CliArgs {
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: None,
            output_dir: Some(PathBuf::from("./terraform")),
        };

        assert_eq!(args.get_api_url(), "http://localhost:8082/api/v1");
    }

    #[test]
    fn test_get_output_dir_returns_provided_path() {
        let args = CliArgs {
            command: Command::Blueprint {
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
            command: Command::Blueprint {
                identifier: "test-blueprint".to_string(),
            },
            api_key: Some("test-key".to_string()),
            api_url: Some("http://localhost:8082/api/v1".to_string()),
            output_dir: None,
        };

        assert_eq!(args.get_output_dir(), PathBuf::from("./terraform"));
    }
}
