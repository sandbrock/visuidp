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
    IoError(#[from] std::io::Error),

    #[error("Invalid configuration: {0}")]
    ConfigurationError(String),

    #[error("Code generation error: {0}")]
    GenerationError(String),
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
            _ => self.to_string(),
        }
    }
}
