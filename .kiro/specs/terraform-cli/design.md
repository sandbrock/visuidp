# Design Document

## Overview

The IDP Terraform CLI is a Rust-based command-line tool that generates OpenTofu (Terraform-compatible) infrastructure-as-code from blueprints and stacks managed by the IDP API. The tool authenticates using API keys, fetches infrastructure definitions via REST API calls, and generates idiomatic HCL configuration files that can be used for infrastructure provisioning and management.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   CLI User      │
└────────┬────────┘
         │ Commands
         ▼
┌─────────────────────────────────────────┐
│         IDP Terraform CLI               │
│         (Rust source in idp-cli/src/)   │
│  ┌───────────────────────────────────┐  │
│  │   Command Parser (clap)           │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   API Client (reqwest)            │  │
│  │   - Authentication                │  │
│  │   - Blueprint/Stack Fetching      │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   Code Generator                  │  │
│  │   - HCL Generation                │  │
│  │   - Resource Mapping              │  │
│  │   - File Organization             │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │   File Writer                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         │ Generated OpenTofu Files
         ▼
┌──────────────────────────┐
│  User-Defined Directory  │
│  (e.g., ./terraform/)    │
│  - main.tf               │
│  - variables.tf          │
│  - providers.tf          │
│  - outputs.tf            │
└──────────────────────────┘
```

### Component Interaction Flow

```
User Command → CLI Parser → API Client → IDP API
                                ↓
                         JSON Response
                                ↓
                         Code Generator
                                ↓
                         HCL Files → File System
```

## Components and Interfaces

### 1. Command Parser Module

**Responsibility**: Parse command-line arguments and route to appropriate handlers

**Dependencies**: `clap` crate for argument parsing

**Interface**:
```rust
pub struct CliArgs {
    pub command: Command,
    pub api_key: Option<String>,
    pub api_url: Option<String>,
    pub output_dir: Option<PathBuf>,
}

pub enum Command {
    Blueprint { identifier: String },
    Stack { identifier: String },
    Version,
}

pub fn parse_args() -> Result<CliArgs, CliError>;
```

**Key Features**:
- Subcommands for `blueprint` and `stack`
- Global flags: `--api-key`, `--api-url`, `--output-dir`
- Environment variable support: `IDP_API_KEY`, `IDP_API_URL`
- Help text generation
- Version information

### 2. API Client Module

**Responsibility**: Handle HTTP communication with IDP API

**Dependencies**: `reqwest` for HTTP, `serde` for JSON serialization

**Interface**:
```rust
pub struct ApiClient {
    base_url: String,
    api_key: String,
    client: reqwest::Client,
}

impl ApiClient {
    pub fn new(base_url: String, api_key: String) -> Self;
    
    pub async fn get_blueprint(&self, identifier: &str) -> Result<Blueprint, ApiError>;
    
    pub async fn get_stack(&self, identifier: &str) -> Result<Stack, ApiError>;
}
```

**Error Handling**:
- 401 Unauthorized → Authentication error
- 404 Not Found → Resource not found error
- 500 Internal Server Error → Server error
- Network errors → Connection error

**Request Format**:
```
GET /api/v1/blueprints/{id}
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json
```

### 3. Data Models Module

**Responsibility**: Define data structures matching API responses

**Dependencies**: `serde` for JSON deserialization, `uuid` for ID handling

**Structures**:
```rust
#[derive(Debug, Deserialize)]
pub struct Blueprint {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resources: Vec<BlueprintResource>,
    pub supported_cloud_providers: Vec<CloudProvider>,
}

#[derive(Debug, Deserialize)]
pub struct BlueprintResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: serde_json::Value,
    pub cloud_specific_properties: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct Stack {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub cloud_name: String,
    pub stack_type: String,
    pub stack_resources: Vec<StackResource>,
    pub blueprint: Option<Blueprint>,
}

#[derive(Debug, Deserialize)]
pub struct StackResource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub resource_type: ResourceType,
    pub cloud_provider: CloudProvider,
    pub configuration: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ResourceType {
    pub id: Uuid,
    pub name: String,
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct CloudProvider {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
}
```

### 4. Code Generator Module

**Responsibility**: Transform API data into OpenTofu HCL code

**Dependencies**: Custom HCL generation logic

**Interface**:
```rust
pub struct CodeGenerator {
    resource_mapper: ResourceMapper,
}

impl CodeGenerator {
    pub fn new() -> Self;
    
    pub fn generate_from_blueprint(&self, blueprint: &Blueprint) -> GeneratedCode;
    
    pub fn generate_from_stack(&self, stack: &Stack) -> GeneratedCode;
}

pub struct GeneratedCode {
    pub main_tf: String,
    pub variables_tf: String,
    pub providers_tf: String,
    pub outputs_tf: String,
}
```

**HCL Generation Strategy**:
- Use string templates for basic structure
- Generate provider blocks based on cloud providers
- Map resource types to Terraform resource types
- Convert JSON configuration to HCL attributes
- Generate variables for configurable properties
- Create outputs for resource identifiers

### 5. Resource Mapper Module

**Responsibility**: Map IDP resource types to Terraform resource types

**Interface**:
```rust
pub struct ResourceMapper {
    mappings: HashMap<(String, String), TerraformResourceType>,
}

impl ResourceMapper {
    pub fn new() -> Self;
    
    pub fn get_terraform_resource_type(
        &self,
        resource_type: &str,
        cloud_provider: &str
    ) -> Option<&TerraformResourceType>;
}

pub struct TerraformResourceType {
    pub provider: String,
    pub resource_type: String,
    pub attribute_mappings: HashMap<String, String>,
}
```

**Example Mappings**:
- (RelationalDatabaseServer, AWS) → `aws_db_instance`
- (ContainerOrchestrator, AWS) → `aws_ecs_cluster`
- (Storage, AWS) → `aws_s3_bucket`
- (RelationalDatabaseServer, Azure) → `azurerm_mssql_server`
- (ContainerOrchestrator, Azure) → `azurerm_kubernetes_cluster`

### 6. File Writer Module

**Responsibility**: Write generated code to file system

**Dependencies**: Standard library `std::fs`

**Interface**:
```rust
pub struct FileWriter {
    output_dir: PathBuf,
}

impl FileWriter {
    pub fn new(output_dir: PathBuf) -> Self;
    
    pub fn write_generated_code(&self, code: &GeneratedCode) -> Result<Vec<PathBuf>, IoError>;
    
    fn ensure_directory_exists(&self) -> Result<(), IoError>;
}
```

**Rust Source Code Organization** (idp-cli/src/):
```
idp-cli/src/
├── main.rs              # CLI entry point
├── cli.rs               # Command parser
├── api_client.rs        # API communication
├── models.rs            # Data structures
├── generator.rs         # Code generation
├── resource_mapper.rs   # Resource type mapping
├── file_writer.rs       # File I/O
└── error.rs             # Error types
```

**Generated OpenTofu Files** (user-defined output directory):
```
<output-dir>/
├── main.tf          # Main resource definitions
├── variables.tf     # Input variables
├── providers.tf     # Provider configurations
└── outputs.tf       # Output values
```

## Data Models

### Configuration Flow

```
API JSON Response
       ↓
Rust Structs (serde deserialization)
       ↓
Internal Representation
       ↓
HCL Generation
       ↓
String Output
       ↓
File System
```

### Example Blueprint JSON to HCL Transformation

**Input (API Response)**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "web-app-blueprint",
  "resources": [
    {
      "name": "postgres-db",
      "resource_type": {
        "name": "RelationalDatabaseServer"
      },
      "cloud_provider": {
        "name": "AWS"
      },
      "cloud_specific_properties": {
        "engine": "postgres",
        "engine_version": "14.7",
        "instance_class": "db.t3.micro"
      }
    }
  ]
}
```

**Output (main.tf)**:
```hcl
resource "aws_db_instance" "postgres_db" {
  identifier     = var.postgres_db_identifier
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = "db.t3.micro"
  
  tags = {
    Name        = "postgres-db"
    ManagedBy   = "IDP"
    Blueprint   = "web-app-blueprint"
  }
}
```

**Output (variables.tf)**:
```hcl
variable "postgres_db_identifier" {
  description = "Identifier for postgres-db database instance"
  type        = string
  default     = "postgres-db"
}
```

**Output (providers.tf)**:
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Error Handling

### Error Types

```rust
#[derive(Debug, thiserror::Error)]
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
```

### Error Handling Strategy

1. **API Errors**: Map HTTP status codes to specific error types
2. **Network Errors**: Provide clear messages about connectivity issues
3. **File System Errors**: Handle permission and disk space issues
4. **Validation Errors**: Validate inputs before making API calls
5. **Graceful Degradation**: Continue processing when possible, report all errors at end

### User-Facing Error Messages

```rust
impl CliError {
    pub fn user_message(&self) -> String {
        match self {
            CliError::AuthenticationError(_) => {
                "Authentication failed. Please check your API key.".to_string()
            }
            CliError::NotFoundError(resource) => {
                format!("Resource '{}' not found. Please verify the identifier.", resource)
            }
            CliError::NetworkError(_) => {
                "Network error. Please check your connection and API URL.".to_string()
            }
            _ => self.to_string()
        }
    }
}
```

## Testing Strategy

### Unit Tests

**Command Parser Tests**:
- Test argument parsing with various flag combinations
- Test environment variable precedence
- Test validation of required arguments
- Test help text generation

**API Client Tests**:
- Mock HTTP responses using `mockito`
- Test successful blueprint/stack retrieval
- Test error handling for various HTTP status codes
- Test authentication header inclusion

**Code Generator Tests**:
- Test HCL generation from sample data structures
- Test resource mapping for different cloud providers
- Test variable generation
- Test provider configuration generation
- Verify generated HCL syntax validity

**Resource Mapper Tests**:
- Test mapping lookup for known resource types
- Test handling of unknown resource types
- Test attribute mapping transformations

### Integration Tests

**End-to-End Blueprint Flow**:
1. Mock API server returns blueprint JSON
2. CLI fetches blueprint
3. Code generator creates HCL
4. Files written to temporary directory
5. Verify file contents match expected output

**End-to-End Stack Flow**:
1. Mock API server returns stack JSON
2. CLI fetches stack
3. Code generator creates HCL
4. Files written to temporary directory
5. Verify file contents match expected output

**Error Scenarios**:
- Test authentication failure handling
- Test 404 not found handling
- Test network timeout handling
- Test file write permission errors

### Manual Testing

**Local API Testing**:
- Run against local IDP API instance
- Test with real blueprints and stacks
- Verify generated code with `terraform validate`
- Test with different cloud providers

**HCL Validation**:
- Use `terraform fmt` to verify formatting
- Use `terraform validate` to verify syntax
- Use `terraform plan` to verify resource definitions

## Dependencies

### Core Dependencies

```toml
[dependencies]
# CLI argument parsing
clap = { version = "4.4", features = ["derive", "env"] }

# HTTP client
reqwest = { version = "0.11", features = ["json"] }

# Async runtime
tokio = { version = "1.35", features = ["full"] }

# JSON serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# UUID handling
uuid = { version = "1.6", features = ["serde"] }

# Error handling
thiserror = "1.0"
anyhow = "1.0"

# Logging
env_logger = "0.11"
log = "0.4"
```

### Development Dependencies

```toml
[dev-dependencies]
# HTTP mocking
mockito = "1.2"

# Temporary directories for testing
tempfile = "3.8"

# Assertions
assert_cmd = "2.0"
predicates = "3.0"
```

## Configuration

### Environment Variables

- `IDP_API_KEY`: API key for authentication (overridden by `--api-key` flag)
- `IDP_API_URL`: Base URL for IDP API (overridden by `--api-url` flag)
- `IDP_OUTPUT_DIR`: Output directory for generated files (overridden by `--output-dir` flag)
- `RUST_LOG`: Logging level (debug, info, warn, error)

### Default Values

- API URL: `http://localhost:8082/api/v1`
- Output Directory: `./terraform` (current working directory + terraform subdirectory)
- Log Level: `info`

### Configuration Precedence

1. Command-line flags (highest priority)
2. Environment variables
3. Default values (lowest priority)

## Security Considerations

### API Key Handling

- Never log API keys
- Clear API key from memory after use
- Warn users if API key is passed via command-line (visible in process list)
- Recommend environment variable or config file usage

### HTTPS Enforcement

- Warn if API URL uses HTTP instead of HTTPS in production
- Support certificate validation
- Allow certificate validation bypass for local development (with warning)

### File Permissions

- Set restrictive permissions on generated files (0600)
- Warn if output directory has overly permissive permissions
- Never include sensitive data in generated code comments

## Performance Considerations

### API Calls

- Single API call per blueprint/stack
- Reuse HTTP client connection pool
- Implement timeout (default: 30 seconds)
- Support retry with exponential backoff for transient errors

### Code Generation

- Stream large HCL output instead of building in memory
- Use efficient string building (avoid repeated concatenation)
- Generate files in parallel when possible

### File I/O

- Buffer file writes
- Use atomic file writes (write to temp, then rename)
- Verify disk space before writing

## Future Enhancements

### Phase 2 Features

1. **Template Support**: Allow custom HCL templates
2. **Multi-Environment**: Generate code for multiple environments
3. **State Management**: Generate backend configuration for remote state
4. **Module Generation**: Create reusable Terraform modules
5. **Validation**: Validate generated code before writing
6. **Dry Run**: Preview generated code without writing files
7. **Interactive Mode**: Prompt for missing configuration
8. **Diff Mode**: Show changes between existing and new code

### Phase 3 Features

1. **Plan Integration**: Execute `terraform plan` automatically
2. **Apply Integration**: Execute `terraform apply` with approval
3. **State Import**: Import existing infrastructure into state
4. **Drift Detection**: Compare IDP state with Terraform state
5. **Cost Estimation**: Integrate with cost estimation tools
6. **Policy Validation**: Validate against organizational policies

## Deployment

### Binary Distribution

- Build for multiple platforms: Linux (x86_64, ARM64), macOS (x86_64, ARM64), Windows (x86_64)
- Distribute via GitHub Releases
- Provide installation script for Unix-like systems
- Support package managers: Homebrew, apt, yum

### Installation

```bash
# Download and install
curl -sSL https://github.com/angryss/idp-cli/install.sh | bash

# Or using Cargo
cargo install idp-cli

# Or from source
git clone https://github.com/angryss/idp-cli
cd idp-cli
cargo build --release
```

### Version Management

- Semantic versioning (MAJOR.MINOR.PATCH)
- Maintain compatibility with IDP API versions
- Document breaking changes in CHANGELOG.md
- Support version checking against API compatibility
