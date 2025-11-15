use crate::error::CliError;
use crate::models::{Blueprint, Stack};
use reqwest::{Client, StatusCode};
use uuid::Uuid;

pub struct ApiClient {
    base_url: String,
    api_key: String,
    client: Client,
}

impl ApiClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .pool_max_idle_per_host(10)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            base_url,
            api_key,
            client,
        }
    }

    pub async fn get_blueprint(&self, identifier: &str) -> Result<Blueprint, CliError> {
        let url = self.build_blueprint_url(identifier);
        
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        self.handle_response(response, identifier).await
    }

    pub async fn get_stack(&self, identifier: &str) -> Result<Stack, CliError> {
        let url = self.build_stack_url(identifier);
        
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        self.handle_response(response, identifier).await
    }

    fn build_blueprint_url(&self, identifier: &str) -> String {
        // Try to parse as UUID, otherwise treat as name
        if Uuid::parse_str(identifier).is_ok() {
            format!("{}/blueprints/{}", self.base_url, identifier)
        } else {
            format!("{}/blueprints?name={}", self.base_url, identifier)
        }
    }

    fn build_stack_url(&self, identifier: &str) -> String {
        // Try to parse as UUID, otherwise treat as name
        if Uuid::parse_str(identifier).is_ok() {
            format!("{}/stacks/{}", self.base_url, identifier)
        } else {
            format!("{}/stacks?name={}", self.base_url, identifier)
        }
    }

    async fn handle_response<T: serde::de::DeserializeOwned>(
        &self,
        response: reqwest::Response,
        identifier: &str,
    ) -> Result<T, CliError> {
        match response.status() {
            StatusCode::OK => {
                let body = response.json::<T>().await.map_err(|e| {
                    CliError::ApiError(format!("Failed to parse response: {}", e))
                })?;
                Ok(body)
            }
            StatusCode::UNAUTHORIZED => {
                Err(CliError::AuthenticationError(
                    "Invalid or missing API key".to_string(),
                ))
            }
            StatusCode::NOT_FOUND => {
                Err(CliError::NotFoundError(identifier.to_string()))
            }
            StatusCode::INTERNAL_SERVER_ERROR => {
                let error_text = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown server error".to_string());
                Err(CliError::ApiError(format!(
                    "Server error (500): {}",
                    error_text
                )))
            }
            status => {
                let error_text = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Unknown error".to_string());
                Err(CliError::ApiError(format!(
                    "Unexpected status code {}: {}",
                    status, error_text
                )))
            }
        }
    }
}
