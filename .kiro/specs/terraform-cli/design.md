# Design Document

## Overview

The IDP Terraform CLI is a Rust-based command-line application that bridges the IDP API and Terraform infrastructure-as-code. It queries stack and resource definitions from the IDP API and generates cloud-provider-specific Terraform configurations. The CLI emphasizes developer experience with clear error messages, flexible configuration options, and support for multiple cloud providers.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   CLI User      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         CLI Application                 │
│  ┌───────────────────────────────────┐  │
│  │   Command Parser (clap)           │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   Configuration Manager           │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   API Client (reqwest)            │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   Terraform Generator             │  │
│  │   ┌─────────────────────────────┐ │  │
│  │   │  Provider Mappers           │ │  │
│  │   │  - AWS Mapper               │ │  │
│  │   │  - Azure Mapper             │ │  │
│  │   │  - GCP Mapper               │ │  │
│  │   │  - Kubernetes Mapper        │ │  │
│  │   └─────────────────────────────┘ │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   File Writer                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   IDP API       │
└─────────────────┘
```

### Module Structure

```
idp-cli/
├── Cargo.toml
├── src/
│   ├── main.rs                    # Entry point, CLI setup
│   ├── cli/
│   │   ├── mod.rs                 # CLI module exports
│   │   ├── commands.rs            # Command definitions
│   │   └── args.rs                # Argument parsing structures
│   ├── config/
│   │   ├── mod.rs                 # Configuration module exports
│   │   ├── loader.rs              # Config file loading
│   │   └── settings.rs            # Settings structure
│   ├── api/
│   │   ├── mod.rs                 # API module exports
│   │   ├── client.rs              # HTTP client wrapper
│   │   ├── models.rs              # API response models
│   │   └── endpoints.rs           # API endpoint definitions
│   ├── terraform/
│   │   ├── mod.rs                 # Terraform module exports
│   │   ├── generator.rs           # Main generation orchestrator
│   │   ├── hcl_builder.rs         # HCL syntax builder
│   │   ├── providers/
│   │   │   ├── mod.rs             # Provider module exports
│   │   │   ├── aws.rs             # AWS resource mapper
│   │   │   ├── azure.rs           # Azure resource mapper
│   │   │   ├── gcp.rs             # GCP resource mapper
│   │   │   └── kubernetes.rs      # Kubernetes resource mapper
│   │   └── templates/
│   │       ├── mod.rs             # Template module exports
│   │       ├── compute.rs         # Compute resource templates
│   │       ├── database.rs        # Database resource templates
│   │       ├── networking.rs      # Networking resource templates
│   │       └── storage.rs         # Storage resource templates
│   ├── output/
│   │   ├── mod.rs                 # Output module exports
│   │   ├── writer.rs              # File writing logic
│   │   └── formatter.rs           # Output formatting
│   └── error.rs                   # Error types and handling
└── tests/
    ├── integration/
    │   ├── api_tests.rs           # API client tests
    │   └── generation_tests.rs    # Terraform generation tests
    └── fixtures/
        └── sample_responses.json  # Mock API responses
```

## Components and Interfaces

### 1. CLI Command Parser

**Responsibility:** Parse command-line arguments and route to appropriate handlers

**Key Dependencies:**
- `clap` v4.x for argument parsing with derive macros
- `clap_complete` for shell completion generation

**Commands:**
```rust
pub enum Command {
    // Stack operations
    ListStacks {
        stack_type: Option<String>,
        cloud_provider: Option<String>,
    },
    GetStack {
        id: String,
    },
    Generate {
        stack_id: String,
        output_dir: Option<PathBuf>,
        dry_run: bool,
        force: bool,
        skip_validation: bool,
    },
    
    // Resource type operations
    ListResourceTypes {
        category: Option<String>,
    },
    
    // Configuration operations
    InitConfig {
        output_path: Option<PathBuf>,
    },
    
    // Utility operations
    Version,
}
```

**Global Options:**
```rust
pub struct GlobalOpts {
    pub api_url: Option<String>,
    pub api_key: Option<String>,
    pub verbose: bool,
    pub config_file: Option<PathBuf>,
}
```

### 2. Configuration Manager

**Responsibility:** Load and merge configuration from multiple sources (file, env vars, CLI args)

**Configuration Priority (highest to lowest):**
1. Command-line flags
2. Environment variables
3. Local config file (`.idp-cli.toml`)
4. User config file (`~/.config/idp-cli/config.toml`)
5. Default values

**Configuration Structure:**
```rust
#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub api: ApiConfig,
    pub output: OutputConfig,
    pub terraform: TerraformConfig,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ApiConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OutputConfig {
    pub default_directory: PathBuf,
    pub overwrite_without_prompt: bool,
    pub use_colors: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TerraformConfig {
    pub validate_after_generation: bool,
    pub terraform_binary_path: Option<PathBuf>,
    pub backend: Option<BackendConfig>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BackendConfig {
    pub backend_type: String,  // "s3", "azurerm", "gcs", "local"
    pub config: HashMap<String, String>,
}
```

**File Format (TOML):**
```toml
[api]
base_url = "https://api.example.com/api/v1"
timeout_seconds = 30

[output]
default_directory = "./terraform-output"
overwrite_without_prompt = false
use_colors = true

[terraform]
validate_after_generation = true

[terraform.backend]
backend_type = "s3"
config = { bucket = "my-terraform-state", key = "idp/terraform.tfstate", region = "us-east-1" }
```

### 3. API Client

**Responsibility:** Handle HTTP communication with IDP API

**Key Dependencies:**
- `reqwest` for HTTP client with async support
- `serde` and `serde_json` for JSON serialization

**Interface:**
```rust
pub struct ApiClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl ApiClient {
    pub fn new(base_url: String, api_key: String) -> Result<Self>;
    
    // Stack operations
    pub async fn list_stacks(&self, filters: StackFilters) -> Result<Vec<Stack>>;
    pub async fn get_stack(&self, id: &str) -> Result<StackDetail>;
    
    // Resource type operations
    pub async fn list_resource_types(&self, category: Option<&str>) -> Result<Vec<ResourceType>>;
    pub async fn list_cloud_mappings(&self) -> Result<Vec<ResourceTypeCloudMapping>>;
    
    // Cloud provider operations
    pub async fn list_cloud_providers(&self) -> Result<Vec<CloudProvider>>;
}
```

**Error Handling:**
```rust
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Authentication failed: {0}")]
    Unauthorized(String),
    
    #[error("Resource not found: {0}")]
    NotFound(String),
    
    #[error("API request failed: {status} - {message}")]
    RequestFailed { status: u16, message: String },
    
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("Invalid response format: {0}")]
    ParseError(#[from] serde_json::Error),
}
```

### 4. Data Models

**Responsibility:** Represent API response data structures

**Key Models:**
```rust
#[derive(Debug, Deserialize, Serialize)]
pub struct Stack {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cloud_name: String,
    pub route_path: String,
    pub repository_url: Option<String>,
    pub stack_type: StackType,
    pub programming_language: Option<ProgrammingLanguage>,
    pub is_public: Option<bool>,
    pub created_by: String,
    pub team_id: Option<String>,
    pub cloud_provider_id: Option<String>,
    pub configuration: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StackDetail {
    #[serde(flatten)]
    pub stack: Stack,
    pub stack_resources: Vec<StackResource>,
    pub cloud_provider: Option<CloudProvider>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StackResource {
    pub id: String,
    pub resource_type_id: String,
    pub configuration: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ResourceType {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub category: ResourceCategory,
    pub enabled: bool,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ResourceTypeCloudMapping {
    pub id: String,
    pub resource_type_id: String,
    pub cloud_provider_id: String,
    pub cloud_resource_type: String,
    pub configuration_schema: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CloudProvider {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StackType {
    Infrastructure,
    RestfulServerless,
    RestfulApi,
    JavascriptWebApplication,
    EventDrivenServerless,
    EventDrivenApi,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResourceCategory {
    Compute,
    Database,
    Cache,
    Queue,
    Storage,
    Networking,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProgrammingLanguage {
    Java,
    Nodejs,
    Python,
    Go,
}
```

### 5. Terraform Generator

**Responsibility:** Orchestrate Terraform configuration generation

**Interface:**
```rust
pub struct TerraformGenerator {
    provider_mappers: HashMap<String, Box<dyn ProviderMapper>>,
}

impl TerraformGenerator {
    pub fn new() -> Self;
    
    pub fn generate(
        &self,
        stack: &StackDetail,
        mappings: &[ResourceTypeCloudMapping],
        output_dir: &Path,
        options: &GenerationOptions,
    ) -> Result<GeneratedFiles>;
    
    fn generate_provider_config(&self, stack: &StackDetail) -> Result<String>;
    fn generate_variables(&self, stack: &StackDetail) -> Result<String>;
    fn generate_outputs(&self, stack: &StackDetail) -> Result<String>;
    fn generate_backend(&self, backend_config: &BackendConfig) -> Result<String>;
}

pub struct GenerationOptions {
    pub include_backend: bool,
    pub backend_config: Option<BackendConfig>,
    pub dry_run: bool,
    pub validate: bool,
}

pub struct GeneratedFiles {
    pub files: HashMap<PathBuf, String>,
    pub summary: GenerationSummary,
}

pub struct GenerationSummary {
    pub total_resources: usize,
    pub resources_by_type: HashMap<String, usize>,
    pub warnings: Vec<String>,
}
```

### 6. Provider Mappers

**Responsibility:** Map IDP resource types to cloud-specific Terraform resources

**Trait Definition:**
```rust
pub trait ProviderMapper: Send + Sync {
    fn provider_name(&self) -> &str;
    
    fn generate_provider_block(&self, config: &serde_json::Value) -> Result<String>;
    
    fn map_compute_resource(
        &self,
        stack: &Stack,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
    
    fn map_database_resource(
        &self,
        resource_type: &str,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
    
    fn map_cache_resource(
        &self,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
    
    fn map_queue_resource(
        &self,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
    
    fn map_storage_resource(
        &self,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
    
    fn map_networking_resource(
        &self,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>>;
}

pub struct TerraformResource {
    pub resource_type: String,  // e.g., "aws_lambda_function"
    pub resource_name: String,  // e.g., "api_function"
    pub attributes: HashMap<String, serde_json::Value>,
    pub depends_on: Vec<String>,
}
```

**AWS Mapper Example:**
```rust
pub struct AwsMapper;

impl ProviderMapper for AwsMapper {
    fn provider_name(&self) -> &str {
        "aws"
    }
    
    fn map_compute_resource(
        &self,
        stack: &Stack,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>> {
        match stack.stack_type {
            StackType::RestfulServerless | StackType::EventDrivenServerless => {
                self.generate_lambda_resources(stack, config)
            }
            StackType::RestfulApi | StackType::EventDrivenApi => {
                self.generate_ecs_fargate_resources(stack, config)
            }
            _ => Ok(vec![]),
        }
    }
    
    fn map_database_resource(
        &self,
        resource_type: &str,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>> {
        match resource_type {
            "postgresql" => self.generate_aurora_postgresql(config),
            _ => Err(Error::UnsupportedResourceType(resource_type.to_string())),
        }
    }
}

impl AwsMapper {
    fn generate_lambda_resources(
        &self,
        stack: &Stack,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>> {
        let mut resources = vec![];
        
        // IAM role for Lambda
        resources.push(TerraformResource {
            resource_type: "aws_iam_role".to_string(),
            resource_name: format!("{}_lambda_role", stack.cloud_name),
            attributes: self.lambda_role_attributes(stack),
            depends_on: vec![],
        });
        
        // Lambda function
        resources.push(TerraformResource {
            resource_type: "aws_lambda_function".to_string(),
            resource_name: stack.cloud_name.clone(),
            attributes: self.lambda_function_attributes(stack, config),
            depends_on: vec![format!("aws_iam_role.{}_lambda_role", stack.cloud_name)],
        });
        
        Ok(resources)
    }
    
    fn generate_aurora_postgresql(
        &self,
        config: &serde_json::Value,
    ) -> Result<Vec<TerraformResource>> {
        // Generate RDS Aurora PostgreSQL cluster and instances
        // ...
    }
}
```

### 7. HCL Builder

**Responsibility:** Generate valid Terraform HCL syntax

**Interface:**
```rust
pub struct HclBuilder {
    indent_level: usize,
    buffer: String,
}

impl HclBuilder {
    pub fn new() -> Self;
    
    pub fn add_provider(&mut self, name: &str, attributes: &HashMap<String, serde_json::Value>);
    pub fn add_resource(&mut self, resource: &TerraformResource);
    pub fn add_variable(&mut self, name: &str, var_type: &str, description: Option<&str>, default: Option<&serde_json::Value>);
    pub fn add_output(&mut self, name: &str, value: &str, description: Option<&str>);
    pub fn add_backend(&mut self, backend_type: &str, config: &HashMap<String, String>);
    
    pub fn build(self) -> String;
    
    fn write_block(&mut self, block_type: &str, labels: &[&str], body: &str);
    fn write_attribute(&mut self, key: &str, value: &serde_json::Value);
    fn indent(&mut self);
    fn dedent(&mut self);
}
```

**Example Usage:**
```rust
let mut builder = HclBuilder::new();

builder.add_provider("aws", &hashmap! {
    "region" => json!("us-east-1"),
    "default_tags" => json!({
        "tags" => {
            "ManagedBy" => "IDP",
            "Stack" => stack.name
        }
    })
});

builder.add_resource(&TerraformResource {
    resource_type: "aws_lambda_function".to_string(),
    resource_name: "api_function".to_string(),
    attributes: hashmap! {
        "function_name" => json!("my-api-function"),
        "runtime" => json!("java21"),
        "handler" => json!("com.example.Handler"),
        "role" => json!("${aws_iam_role.api_function_role.arn}"),
    },
    depends_on: vec!["aws_iam_role.api_function_role".to_string()],
});

let hcl = builder.build();
```

### 8. File Writer

**Responsibility:** Write generated Terraform files to disk

**Interface:**
```rust
pub struct FileWriter {
    output_dir: PathBuf,
    force_overwrite: bool,
}

impl FileWriter {
    pub fn new(output_dir: PathBuf, force_overwrite: bool) -> Self;
    
    pub fn write_files(&self, files: &HashMap<PathBuf, String>) -> Result<()>;
    
    pub fn validate_terraform(&self, terraform_binary: Option<&Path>) -> Result<ValidationResult>;
    
    fn check_existing_files(&self, files: &HashMap<PathBuf, String>) -> Result<Vec<PathBuf>>;
    fn prompt_overwrite(&self, existing_files: &[PathBuf]) -> Result<bool>;
}

pub struct ValidationResult {
    pub success: bool,
    pub output: String,
    pub errors: Vec<String>,
}
```

### 9. Output Formatter

**Responsibility:** Format CLI output with colors and structure

**Key Dependencies:**
- `colored` for terminal color output
- `prettytable-rs` for table formatting

**Interface:**
```rust
pub struct OutputFormatter {
    use_colors: bool,
}

impl OutputFormatter {
    pub fn new(use_colors: bool) -> Self;
    
    pub fn print_success(&self, message: &str);
    pub fn print_error(&self, message: &str);
    pub fn print_warning(&self, message: &str);
    pub fn print_info(&self, message: &str);
    
    pub fn print_stack_list(&self, stacks: &[Stack]);
    pub fn print_stack_detail(&self, stack: &StackDetail);
    pub fn print_resource_types(&self, resource_types: &[ResourceType]);
    pub fn print_generation_summary(&self, summary: &GenerationSummary);
}
```

## Data Models

### Resource Type to Terraform Mapping

The CLI maintains mappings from IDP resource types to cloud-specific Terraform resources:

**AWS Mappings:**
- PostgreSQL Database → `aws_rds_cluster` (Aurora PostgreSQL)
- Cache → `aws_elasticache_cluster` (Redis)
- Queue → `aws_sqs_queue`
- Lambda Compute → `aws_lambda_function` + `aws_iam_role`
- ECS Compute → `aws_ecs_task_definition` + `aws_ecs_service`

**Azure Mappings:**
- PostgreSQL Database → `azurerm_postgresql_flexible_server`
- Cache → `azurerm_redis_cache`
- Queue → `azurerm_servicebus_queue`
- Container Compute → `azurerm_container_app`

**GCP Mappings:**
- PostgreSQL Database → `google_sql_database_instance`
- Cache → `google_redis_instance`
- Queue → `google_pubsub_topic` + `google_pubsub_subscription`
- Cloud Run Compute → `google_cloud_run_service`

**Kubernetes Mappings:**
- PostgreSQL Database → `kubernetes_stateful_set` (PostgreSQL)
- Cache → `kubernetes_stateful_set` (Redis)
- Queue → External RabbitMQ (documented, not provisioned)
- Application Compute → `kubernetes_deployment` + `kubernetes_service`

## Error Handling

### Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("Configuration error: {0}")]
    Config(String),
    
    #[error("API error: {0}")]
    Api(#[from] ApiError),
    
    #[error("Terraform generation error: {0}")]
    Generation(String),
    
    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Unsupported resource type: {0}")]
    UnsupportedResourceType(String),
    
    #[error("Unsupported cloud provider: {0}")]
    UnsupportedCloudProvider(String),
}
```

### Error Display Strategy

- Use colored output to distinguish error types
- Provide actionable error messages with suggestions
- Include relevant context (stack ID, resource type, etc.)
- In verbose mode, include full error chain and debug information

## Testing Strategy

### Unit Tests

- Test each provider mapper independently with mock data
- Test HCL builder output for correctness
- Test configuration loading from various sources
- Test error handling and edge cases

### Integration Tests

- Test API client with mock HTTP server (using `wiremock`)
- Test end-to-end generation with sample API responses
- Test file writing and validation
- Test configuration precedence

### Test Fixtures

- Sample API responses for stacks, resources, and mappings
- Expected Terraform output for various scenarios
- Configuration file examples

### Manual Testing Checklist

- Generate Terraform for each stack type
- Generate Terraform for each cloud provider
- Test with missing/invalid API keys
- Test with unreachable API
- Test dry-run mode
- Test validation with and without Terraform installed
- Test configuration file loading
- Test overwrite prompts

## Dependencies

### Core Dependencies

```toml
[dependencies]
# CLI framework
clap = { version = "4.5", features = ["derive", "env"] }
clap_complete = "4.5"

# HTTP client
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
tokio = { version = "1.40", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
toml = "0.8"

# Error handling
thiserror = "1.0"
anyhow = "1.0"

# Output formatting
colored = "2.1"
prettytable-rs = "0.10"

# Configuration
config = "0.14"
dirs = "5.0"

[dev-dependencies]
# Testing
wiremock = "0.6"
tempfile = "3.12"
assert_cmd = "2.0"
predicates = "3.1"
```

## Performance Considerations

- Use async/await for API calls to enable concurrent requests
- Cache resource type mappings to avoid repeated API calls
- Stream large file writes instead of buffering entire content
- Use connection pooling for HTTP client

## Security Considerations

- Never log or display API keys in output
- Store API keys securely in configuration files with appropriate permissions
- Validate all user input before using in API requests
- Use HTTPS for all API communication
- Support environment variables for sensitive configuration

## Future Enhancements

- Support for Terraform modules and reusable components
- Integration with Terraform Cloud/Enterprise
- Support for generating Terragrunt configurations
- Automatic Terraform plan execution
- Interactive mode for guided generation
- Support for custom resource type mappings
- Plugin system for extending provider support
