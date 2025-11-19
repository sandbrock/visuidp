use thiserror::Error;

#[derive(Debug, Error)]
pub enum CliError {
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),

    #[error("Resource not found: {0}")]
    NotFoundError(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Invalid configuration: {0}")]
    ConfigurationError(String),

    #[error("Code generation error: {0}")]
    GenerationError(String),

    #[error("Variable file error: {0}")]
    VariableFileError(String),

    #[error("Template discovery error: {0}")]
    DiscoveryError(String),

    #[error("Template processing error: {0}")]
    ProcessingError(String),

    #[error("Template syntax error at line {line}: {message}")]
    TemplateSyntaxError { line: usize, message: String },

    #[error("Variable not found: {variable}\n{suggestion}")]
    VariableNotFoundError { variable: String, suggestion: String },

    #[error("YAML parsing error: {0}")]
    YamlParseError(#[from] serde_yaml::Error),

    #[error("JSON parsing error: {0}")]
    JsonParseError(#[from] serde_json::Error),

    #[error("S3 error: {0}")]
    S3Error(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),
}

impl CliError {
    pub fn user_message(&self) -> String {
        match self {
            CliError::AuthenticationError(_) => {
                "Authentication failed. Please check your API key.".to_string()
            }
            CliError::NotFoundError(resource) => {
                format!(
                    "Resource '{}' not found. Please verify the identifier.",
                    resource
                )
            }
            CliError::NetworkError(_) => {
                "Network error. Please check your connection and API URL.".to_string()
            }
            CliError::S3Error(_) => {
                "S3 error. Please check your S3 bucket configuration and permissions.".to_string()
            }
            CliError::ConfigError(_) => {
                "Configuration error. Please check your environment variables.".to_string()
            }
            _ => self.to_string(),
        }
    }
}

impl From<std::io::Error> for CliError {
    fn from(err: std::io::Error) -> Self {
        CliError::IoError(err.to_string())
    }
}
