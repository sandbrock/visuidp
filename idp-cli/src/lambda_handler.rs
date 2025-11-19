use lambda_http::{run, service_fn, Body, Error, Request, Response};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tempfile::TempDir;
use log::{error, info};

use crate::api_client::ApiClient;
use crate::cli::DataSource;
use crate::error::CliError;
use crate::variable_context::VariableContextBuilder;
use crate::template_discovery::TemplateDiscovery;
use crate::template_processor::TemplateProcessor;
use crate::file_writer::FileWriter;
use crate::s3_client::S3Client;

/// Lambda request payload for CLI operations
#[derive(Debug, Deserialize)]
#[serde(tag = "operation")]
enum LambdaRequest {
    #[serde(rename = "generate")]
    Generate {
        data_source: String,
        identifier: String,
        template_dir: Option<String>,
        variables: Option<serde_json::Value>,
    },
    #[serde(rename = "list-variables")]
    ListVariables {
        data_source: String,
        identifier: String,
    },
}

/// Lambda response payload
#[derive(Debug, Serialize)]
struct LambdaResponse {
    success: bool,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    s3_keys: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    variables: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

/// Main Lambda handler function
pub async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    // Parse request body
    let body = event.body();
    let request: LambdaRequest = match body {
        Body::Text(text) => serde_json::from_str(text)?,
        Body::Binary(bytes) => serde_json::from_slice(bytes)?,
        Body::Empty => {
            return Ok(Response::builder()
                .status(400)
                .body(Body::from(serde_json::to_string(&LambdaResponse {
                    success: false,
                    message: "Empty request body".to_string(),
                    files: None,
                    s3_keys: None,
                    variables: None,
                    error: Some("Request body is required".to_string()),
                })?))
                .unwrap());
        }
    };

    // Get API configuration from environment variables
    let api_url = std::env::var("IDP_API_URL")
        .unwrap_or_else(|_| "http://localhost:8082/api/v1".to_string());
    let api_key = std::env::var("IDP_API_KEY")
        .map_err(|_| "IDP_API_KEY environment variable not set")?;

    // Create API client
    let api_client = ApiClient::new(api_url, api_key);

    // Route to appropriate handler
    let response = match request {
        LambdaRequest::Generate { data_source, identifier, template_dir, variables } => {
            handle_generate_lambda(data_source, identifier, template_dir, variables, &api_client).await
        }
        LambdaRequest::ListVariables { data_source, identifier } => {
            handle_list_variables_lambda(data_source, identifier, &api_client).await
        }
    };

    // Convert response to HTTP response
    let response_body = serde_json::to_string(&response)?;
    let status_code = if response.success { 200 } else { 500 };

    Ok(Response::builder()
        .status(status_code)
        .header("content-type", "application/json")
        .body(Body::from(response_body))
        .unwrap())
}

/// Handle generate operation in Lambda
async fn handle_generate_lambda(
    data_source: String,
    identifier: String,
    template_dir: Option<String>,
    variables: Option<serde_json::Value>,
    api_client: &ApiClient,
) -> LambdaResponse {
    info!("Lambda generate: {} {}", data_source, identifier);

    // Parse data source
    let data_source = match data_source.to_lowercase().as_str() {
        "blueprint" => DataSource::Blueprint,
        "stack" => DataSource::Stack,
        _ => {
            return LambdaResponse {
                success: false,
                message: "Invalid data source".to_string(),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(format!("Data source must be 'blueprint' or 'stack', got: {}", data_source)),
            };
        }
    };

    // Get S3 configuration from environment variables
    let templates_bucket = std::env::var("TEMPLATES_BUCKET")
        .unwrap_or_else(|_| "visuidp-templates".to_string());
    let outputs_bucket = std::env::var("OUTPUTS_BUCKET").ok();
    let aws_region = std::env::var("AWS_REGION").ok();
    let template_prefix = template_dir.unwrap_or_else(|| "templates/".to_string());

    // Create S3 client
    let s3_client = match S3Client::new(templates_bucket.clone(), outputs_bucket.clone(), aws_region).await {
        Ok(client) => client,
        Err(e) => {
            return LambdaResponse {
                success: false,
                message: format!("Failed to create S3 client: {}", e),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(e.to_string()),
            };
        }
    };

    // Create temporary directories for templates and outputs
    let temp_templates_dir = match TempDir::new() {
        Ok(dir) => dir,
        Err(e) => {
            return LambdaResponse {
                success: false,
                message: "Failed to create temporary templates directory".to_string(),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(e.to_string()),
            };
        }
    };

    let temp_output_dir = match TempDir::new() {
        Ok(dir) => dir,
        Err(e) => {
            return LambdaResponse {
                success: false,
                message: "Failed to create temporary output directory".to_string(),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(e.to_string()),
            };
        }
    };

    // Download templates from S3
    info!("Downloading templates from S3 bucket: {}, prefix: {}", templates_bucket, template_prefix);
    if let Err(e) = s3_client.download_templates(&template_prefix, temp_templates_dir.path()).await {
        return LambdaResponse {
            success: false,
            message: format!("Failed to download templates from S3: {}", e.user_message()),
            files: None,
            s3_keys: None,
            variables: None,
            error: Some(format!("{:?}", e)),
        };
    }

    let template_path = temp_templates_dir.path().to_path_buf();

    // Fetch data and build context
    let mut context = match data_source {
        DataSource::Blueprint => {
            match api_client.get_blueprint(&identifier).await {
                Ok(blueprint) => {
                    info!("Retrieved blueprint: {}", blueprint.name);
                    VariableContextBuilder::from_blueprint(&blueprint)
                }
                Err(e) => {
                    return LambdaResponse {
                        success: false,
                        message: format!("Failed to fetch blueprint: {}", e.user_message()),
                        files: None,
                        variables: None,
                        error: Some(format!("{:?}", e)),
                    };
                }
            }
        }
        DataSource::Stack => {
            match api_client.get_stack(&identifier).await {
                Ok(stack) => {
                    info!("Retrieved stack: {}", stack.name);
                    VariableContextBuilder::from_stack(&stack)
                }
                Err(e) => {
                    return LambdaResponse {
                        success: false,
                        message: format!("Failed to fetch stack: {}", e.user_message()),
                        files: None,
                        variables: None,
                        error: Some(format!("{:?}", e)),
                    };
                }
            }
        }
    };

    // Merge custom variables if provided
    if let Some(vars) = variables {
        if let Some(obj) = vars.as_object() {
            for (key, value) in obj {
                context.insert(key.clone(), value.clone());
            }
        }
    }

    // Discover templates
    let discovery = TemplateDiscovery::new(template_path.clone());
    let template_files = match discovery.discover_templates() {
        Ok(files) => files,
        Err(e) => {
            return LambdaResponse {
                success: false,
                message: format!("Failed to discover templates: {}", e),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(e.to_string()),
            };
        }
    };

    if template_files.is_empty() {
        return LambdaResponse {
            success: false,
            message: format!("No template files found in {}", template_path.display()),
            files: None,
            s3_keys: None,
            variables: None,
            error: Some("Template directory is empty".to_string()),
        };
    }

    info!("Discovered {} template files", template_files.len());

    // Process templates
    let processor = TemplateProcessor::new(&context);
    let mut processed_files = Vec::new();

    for template_file in &template_files {
        match processor.process_file(template_file) {
            Ok(processed) => processed_files.push(processed),
            Err(e) => {
                return LambdaResponse {
                    success: false,
                    message: format!("Failed to process template: {}", e.user_message()),
                    files: None,
                    s3_keys: None,
                    variables: None,
                    error: Some(format!("{:?}", e)),
                };
            }
        }
    }

    // Write files to temporary directory
    let file_writer = FileWriter::new(temp_output_dir.path().to_path_buf());
    let written_files = match file_writer.write_processed_files(&processed_files) {
        Ok(files) => files,
        Err(e) => {
            return LambdaResponse {
                success: false,
                message: format!("Failed to write files: {}", e),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(e.to_string()),
            };
        }
    };

    // Convert file paths to strings for response
    let file_paths: Vec<String> = written_files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();

    // Upload to S3 if outputs bucket is configured
    let s3_keys = if outputs_bucket.is_some() {
        let output_prefix = format!("outputs/{}/{}", data_source.to_string().to_lowercase(), identifier);
        match s3_client.upload_outputs(&written_files, &output_prefix).await {
            Ok(keys) => {
                info!("Uploaded {} files to S3", keys.len());
                Some(keys)
            }
            Err(e) => {
                error!("Failed to upload outputs to S3: {}", e);
                // Don't fail the request, just log the error
                None
            }
        }
    } else {
        info!("Outputs bucket not configured, skipping S3 upload");
        None
    };

    info!("Successfully generated {} files", file_paths.len());

    LambdaResponse {
        success: true,
        message: format!("Successfully generated {} files", file_paths.len()),
        files: Some(file_paths),
        s3_keys,
        variables: None,
        error: None,
    }
}

/// Handle list-variables operation in Lambda
async fn handle_list_variables_lambda(
    data_source: String,
    identifier: String,
    api_client: &ApiClient,
) -> LambdaResponse {
    info!("Lambda list-variables: {} {}", data_source, identifier);

    // Parse data source
    let data_source = match data_source.to_lowercase().as_str() {
        "blueprint" => DataSource::Blueprint,
        "stack" => DataSource::Stack,
        _ => {
            return LambdaResponse {
                success: false,
                message: "Invalid data source".to_string(),
                files: None,
                s3_keys: None,
                variables: None,
                error: Some(format!("Data source must be 'blueprint' or 'stack', got: {}", data_source)),
            };
        }
    };

    // Fetch data and build context
    let context = match data_source {
        DataSource::Blueprint => {
            match api_client.get_blueprint(&identifier).await {
                Ok(blueprint) => {
                    info!("Retrieved blueprint: {}", blueprint.name);
                    VariableContextBuilder::from_blueprint(&blueprint)
                }
                Err(e) => {
                    return LambdaResponse {
                        success: false,
                        message: format!("Failed to fetch blueprint: {}", e.user_message()),
                        files: None,
                        s3_keys: None,
                        variables: None,
                        error: Some(format!("{:?}", e)),
                    };
                }
            }
        }
        DataSource::Stack => {
            match api_client.get_stack(&identifier).await {
                Ok(stack) => {
                    info!("Retrieved stack: {}", stack.name);
                    VariableContextBuilder::from_stack(&stack)
                }
                Err(e) => {
                    return LambdaResponse {
                        success: false,
                        message: format!("Failed to fetch stack: {}", e.user_message()),
                        files: None,
                        s3_keys: None,
                        variables: None,
                        error: Some(format!("{:?}", e)),
                    };
                }
            }
        }
    };

    // Convert context to JSON
    let all_vars = context.list_all();
    let variables_json = serde_json::to_value(&all_vars).unwrap_or(serde_json::Value::Null);

    info!("Retrieved {} variables", all_vars.len());

    LambdaResponse {
        success: true,
        message: format!("Retrieved {} variables", all_vars.len()),
        files: None,
        s3_keys: None,
        variables: Some(variables_json),
        error: None,
    }
}

/// Entry point for Lambda runtime
pub async fn run_lambda() -> Result<(), Error> {
    // Initialize logging
    env_logger::init();

    info!("Starting IDP CLI Lambda function");

    // Run the Lambda runtime
    run(service_fn(function_handler)).await
}
