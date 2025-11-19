use aws_sdk_s3::Client;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::get_object::GetObjectError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use aws_sdk_s3::primitives::ByteStream;
use log::{error, info, warn};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio::fs;
use tokio::io::AsyncWriteExt;

use crate::error::CliError;

/// S3 client for fetching templates and storing outputs
pub struct S3Client {
    client: Client,
    templates_bucket: String,
    outputs_bucket: Option<String>,
}

impl S3Client {
    /// Create a new S3 client with the specified configuration
    pub async fn new(
        templates_bucket: String,
        outputs_bucket: Option<String>,
        region: Option<String>,
    ) -> Result<Self, CliError> {
        let config = if let Some(region_str) = region {
            aws_config::from_env()
                .region(Region::new(region_str))
                .load()
                .await
        } else {
            aws_config::load_from_env().await
        };

        let client = Client::new(&config);

        Ok(Self {
            client,
            templates_bucket,
            outputs_bucket,
        })
    }

    /// Download templates from S3 to a local directory with retry logic
    pub async fn download_templates(&self, template_prefix: &str, local_dir: &Path) -> Result<Vec<PathBuf>, CliError> {
        info!("Downloading templates from s3://{}/{}", self.templates_bucket, template_prefix);

        // Create local directory if it doesn't exist
        fs::create_dir_all(local_dir).await.map_err(|e| {
            CliError::IoError(format!("Failed to create template directory: {}", e))
        })?;

        // List objects in the bucket with the specified prefix
        let mut downloaded_files = Vec::new();
        let mut continuation_token: Option<String> = None;

        loop {
            let list_request = self.client
                .list_objects_v2()
                .bucket(&self.templates_bucket)
                .prefix(template_prefix)
                .set_continuation_token(continuation_token.clone());

            let list_response = self.retry_operation(|| async {
                list_request.clone().send().await
            }, 3).await.map_err(|e| {
                CliError::S3Error(format!("Failed to list templates in S3: {}", e))
            })?;

            let contents = list_response.contents();
            for object in contents {
                if let Some(key) = object.key() {
                    // Skip directories (keys ending with /)
                    if key.ends_with('/') {
                        continue;
                    }

                    // Download the object
                    let local_path = self.download_object(key, local_dir, template_prefix).await?;
                    downloaded_files.push(local_path);
                }
            }

            // Check if there are more objects to list
            if list_response.is_truncated().unwrap_or(false) {
                continuation_token = list_response.next_continuation_token().map(|s| s.to_string());
            } else {
                break;
            }
        }

        info!("Downloaded {} template files from S3", downloaded_files.len());
        Ok(downloaded_files)
    }

    /// Download a single object from S3 with retry logic
    async fn download_object(&self, key: &str, local_dir: &Path, prefix: &str) -> Result<PathBuf, CliError> {
        info!("Downloading s3://{}/{}", self.templates_bucket, key);

        // Get the object from S3 with retry
        let get_response = self.retry_operation(|| async {
            self.client
                .get_object()
                .bucket(&self.templates_bucket)
                .key(key)
                .send()
                .await
        }, 3).await.map_err(|e| {
            CliError::S3Error(format!("Failed to download {}: {}", key, e))
        })?;

        // Determine local file path (remove prefix from key)
        let relative_path = key.strip_prefix(prefix).unwrap_or(key);
        let local_path = local_dir.join(relative_path);

        // Create parent directories if needed
        if let Some(parent) = local_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                CliError::IoError(format!("Failed to create directory {}: {}", parent.display(), e))
            })?;
        }

        // Write the object data to a local file
        let body = get_response.body.collect().await.map_err(|e| {
            CliError::S3Error(format!("Failed to read object body: {}", e))
        })?;

        let mut file = fs::File::create(&local_path).await.map_err(|e| {
            CliError::IoError(format!("Failed to create file {}: {}", local_path.display(), e))
        })?;

        file.write_all(&body.into_bytes()).await.map_err(|e| {
            CliError::IoError(format!("Failed to write file {}: {}", local_path.display(), e))
        })?;

        info!("Downloaded {} to {}", key, local_path.display());
        Ok(local_path)
    }

    /// Upload generated files to S3 with retry logic
    pub async fn upload_outputs(&self, files: &[PathBuf], output_prefix: &str) -> Result<Vec<String>, CliError> {
        let outputs_bucket = self.outputs_bucket.as_ref().ok_or_else(|| {
            CliError::ConfigError("Outputs bucket not configured".to_string())
        })?;

        info!("Uploading {} files to s3://{}/{}", files.len(), outputs_bucket, output_prefix);

        let mut uploaded_keys = Vec::new();

        for file_path in files {
            let key = self.upload_file(file_path, output_prefix, outputs_bucket).await?;
            uploaded_keys.push(key);
        }

        info!("Uploaded {} files to S3", uploaded_keys.len());
        Ok(uploaded_keys)
    }

    /// Upload a single file to S3 with retry logic
    async fn upload_file(&self, file_path: &Path, prefix: &str, bucket: &str) -> Result<String, CliError> {
        // Read file content
        let content = fs::read(file_path).await.map_err(|e| {
            CliError::IoError(format!("Failed to read file {}: {}", file_path.display(), e))
        })?;

        // Determine S3 key
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| CliError::IoError(format!("Invalid file name: {}", file_path.display())))?;

        let key = if prefix.is_empty() {
            file_name.to_string()
        } else {
            format!("{}/{}", prefix.trim_end_matches('/'), file_name)
        };

        info!("Uploading {} to s3://{}/{}", file_path.display(), bucket, key);

        // Upload with retry
        self.retry_operation(|| async {
            self.client
                .put_object()
                .bucket(bucket)
                .key(&key)
                .body(ByteStream::from(content.clone()))
                .send()
                .await
        }, 3).await.map_err(|e| {
            CliError::S3Error(format!("Failed to upload {}: {}", key, e))
        })?;

        info!("Uploaded {}", key);
        Ok(key)
    }

    /// Retry an S3 operation with exponential backoff
    async fn retry_operation<F, Fut, T, E>(&self, operation: F, max_retries: u32) -> Result<T, E>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        let mut retries = 0;
        let mut delay = Duration::from_millis(100);

        loop {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    retries += 1;
                    if retries > max_retries {
                        error!("Operation failed after {} retries: {}", max_retries, e);
                        return Err(e);
                    }

                    warn!("Operation failed (attempt {}/{}): {}. Retrying in {:?}...", 
                          retries, max_retries, e, delay);
                    
                    tokio::time::sleep(delay).await;
                    delay *= 2; // Exponential backoff
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires AWS credentials and S3 bucket
    async fn test_s3_client_creation() {
        let result = S3Client::new(
            "test-bucket".to_string(),
            Some("test-outputs".to_string()),
            Some("us-east-1".to_string()),
        ).await;

        assert!(result.is_ok());
    }
}
