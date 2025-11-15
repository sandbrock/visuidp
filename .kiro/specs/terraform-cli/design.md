# Design Document

## Overview

The IDP Template CLI is a Rust-based command-line tool that processes infrastructure-as-code and Kubernetes manifest templates by substituting variables with data from blueprints and stacks managed by the IDP API. The tool provides a flexible, template-driven approach that allows organizations to define their own Terraform/OpenTofu and Kubernetes configurations while leveraging IDP's infrastructure definitions for variable population.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   CLI User      │
└────────┬────────┘
         │ Commands + Template Directory
         ▼
┌──────────────────────────────────────────────┐
│         IDP Template CLI                     │
│         (Rust source in idp-cli/src/)        │
│  ┌────────────────────────────────────────┐  │
│  │   Command Parser (clap)                │  │
│  └───────────┬────────────────────────────┘  │
│              │                                │
│  ┌───────────▼────────────────────────────┐  │
│  │   Template Discovery                   │  │
│  │   - Scan template directory            │  │
│  │   - Identify file types (.tf, .yaml)   │  │
│  └───────────┬────────────────────────────┘  │
│              │                                │
│  ┌───────────▼────────────────────────────┐  │
│  │   API Client (reqwest)                 │  │
│  │   - Authentication                     │  │
│  │   - Blueprint/Stack Fetching           │  │
│  └───────────┬────────────────────────────┘  │
│              │                                │
│  ┌───────────▼────────────────────────────┐  │
│  │   Variable Context Builder             │  │
│  │   - Extract data from API response     │  │
│  │   - Build variable map                 │  │
│  │   - Merge custom variables             │  │
│  └───────────┬────────────────────────────┘  │
│              │                                │
│  ┌───────────▼────────────────────────────┐  │
│  │   Template Processor                   │  │
│  │   - Parse template files               │  │
│  │   - Substitute {{variables}}           │  │
│  │   - Preserve formatting                │  │
│  └───────────┬────────────────────────────┘  │
│              │                                │
│  ┌───────────▼────────────────────────────┐  │
│  │   File Writer                          │  │
│  │   - Preserve directory structure       │  │
│  │   - Write processed files              │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         │ Processed Template Files
         ▼
┌──────────────────────────┐
│  User-Defined Directory  │
│  (e.g., ./output/)       │
│  - Processed templates   │
│  - Same structure as     │
│    template directory    │
└──────────────────────────┘
```

### Component Interaction Flow

```
User Command + Template Dir → CLI Parser
                                  ↓
                         Template Discovery
                                  ↓
                         API Client → IDP API
                                  ↓
                         Variable Context Builder
                                  ↓
                         Template Processor
                                  ↓
                         Processed Files → File System
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
    Generate {
        data_source: DataSource,
        identifier: String,
        template_dir: PathBuf,
        variables_file: Option<PathBuf>,
    },
    ListVariables {
        data_source: DataSource,
        identifier: String,
    },
    Version,
}

pub enum DataSource {
    Blueprint,
    Stack,
}

pub fn parse_args() -> Result<CliArgs, CliError>;
```

**Key Features**:
- `generate` command for template processing
- `list-variables` command for inspecting available variables
- Global flags: `--api-key`, `--api-url`, `--output-dir`
- Command-specific flags: `--template-dir`, `--variables-file`
- Environment variable support: `IDP_API_KEY`, `IDP_API_URL`, `IDP_OUTPUT_DIR`
- Help text generation with examples
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

### 4. Template Discovery Module

**Responsibility**: Scan template directory and identify template files

**Dependencies**: Standard library `std::fs`, `walkdir` crate

**Interface**:
```rust
pub struct TemplateDiscovery {
    template_dir: PathBuf,
}

impl TemplateDiscovery {
    pub fn new(template_dir: PathBuf) -> Self;
    
    pub fn discover_templates(&self) -> Result<Vec<TemplateFile>, DiscoveryError>;
}

pub struct TemplateFile {
    pub path: PathBuf,
    pub relative_path: PathBuf,
    pub file_type: TemplateFileType,
}

pub enum TemplateFileType {
    Terraform,      // .tf files
    Yaml,           // .yaml, .yml files
    Json,           // .json files
}
```

**Discovery Strategy**:
- Recursively walk template directory
- Identify files by extension
- Preserve relative paths for output structure
- Skip hidden files and directories
- Support .gitignore-style exclusions

### 5. Variable Context Builder Module

**Responsibility**: Extract data from API responses and build variable context

**Dependencies**: `serde_json` for JSON manipulation

**Interface**:
```rust
pub struct VariableContextBuilder;

impl VariableContextBuilder {
    pub fn from_blueprint(blueprint: &Blueprint) -> VariableContext;
    
    pub fn from_stack(stack: &Stack) -> VariableContext;
    
    pub fn merge_custom_variables(
        context: &mut VariableContext,
        custom_vars: HashMap<String, serde_json::Value>
    );
}

pub struct VariableContext {
    variables: HashMap<String, serde_json::Value>,
}

impl VariableContext {
    pub fn get(&self, path: &str) -> Option<&serde_json::Value>;
    
    pub fn list_all(&self) -> Vec<(String, &serde_json::Value)>;
}
```

**Variable Extraction Strategy**:
- Flatten nested structures with dot notation
- Create array accessors for list items
- Provide common shortcuts (e.g., `name`, `id`)
- Support both camelCase and snake_case
- Preserve original JSON structure for complex objects

### 6. Template Processor Module

**Responsibility**: Parse templates and substitute variables

**Dependencies**: `handlebars` or custom template engine

**Interface**:
```rust
pub struct TemplateProcessor {
    context: VariableContext,
}

impl TemplateProcessor {
    pub fn new(context: VariableContext) -> Self;
    
    pub fn process_template(&self, template_content: &str) -> Result<String, ProcessError>;
    
    pub fn process_file(&self, template_file: &TemplateFile) -> Result<ProcessedFile, ProcessError>;
}

pub struct ProcessedFile {
    pub relative_path: PathBuf,
    pub content: String,
}
```

**Template Processing Strategy**:
- Use `{{variable_name}}` syntax for substitution
- Support dot notation: `{{resource.name}}`
- Support array indexing: `{{resources[0].name}}`
- Support default values: `{{variable|default:"value"}}`
- Support conditional blocks: `{{#if variable}}...{{/if}}`
- Support loops: `{{#each resources}}...{{/each}}`
- Preserve file formatting (indentation, line endings)
- Validate YAML/JSON syntax after processing

### 7. File Writer Module

**Responsibility**: Write processed template files to file system

**Dependencies**: Standard library `std::fs`

**Interface**:
```rust
pub struct FileWriter {
    output_dir: PathBuf,
}

impl FileWriter {
    pub fn new(output_dir: PathBuf) -> Self;
    
    pub fn write_processed_files(&self, files: &[ProcessedFile]) -> Result<Vec<PathBuf>, IoError>;
    
    fn ensure_directory_exists(&self, path: &Path) -> Result<(), IoError>;
    
    fn write_with_warning(&self, path: &Path, content: &str) -> Result<(), IoError>;
}
```

**File Writing Strategy**:
- Preserve directory structure from template directory
- Create parent directories as needed
- Warn before overwriting existing files
- Use atomic writes (write to temp, then rename)
- Set appropriate file permissions

**Rust Source Code Organization** (idp-cli/src/):
```
idp-cli/src/
├── main.rs                    # CLI entry point
├── cli.rs                     # Command parser
├── api_client.rs              # API communication
├── models.rs                  # Data structures
├── template_discovery.rs      # Template file discovery
├── variable_context.rs        # Variable context building
├── template_processor.rs      # Template processing
├── file_writer.rs             # File I/O
└── error.rs                   # Error types
```

**Output Directory Structure** (preserves template structure):
```
<output-dir>/
├── <same structure as template-dir>
│   ├── main.tf (if template had main.tf)
│   ├── variables.tf (if template had variables.tf)
│   ├── k8s/
│   │   ├── deployment.yaml (if template had k8s/deployment.yaml)
│   │   └── service.yaml (if template had k8s/service.yaml)
│   └── ... (other processed files)
```

## Data Models

### Processing Flow

```
Template Directory + API JSON Response
              ↓
    Template Discovery
              ↓
    Rust Structs (serde deserialization)
              ↓
    Variable Context Building
              ↓
    Template Processing (variable substitution)
              ↓
    Processed Files
              ↓
    File System
```

### Variable Context Structure

The Variable Context is a flattened representation of the API response that makes data easily accessible in templates:

```rust
// Example variable context for a blueprint
{
  "blueprint.id": "550e8400-e29b-41d4-a716-446655440000",
  "blueprint.name": "web-app-blueprint",
  "blueprint.description": "Web application infrastructure",
  "resources": [...],  // Array of resources
  "resources[0].name": "postgres-db",
  "resources[0].resource_type.name": "RelationalDatabaseServer",
  "resources[0].cloud_provider.name": "AWS",
  "resources[0].cloud_specific_properties.engine": "postgres",
  "resources[0].cloud_specific_properties.engine_version": "14.7",
  "resources[0].cloud_specific_properties.instance_class": "db.t3.micro",
  // ... additional resources
}
```

### Example Template Processing

**Input Template (templates/terraform/main.tf)**:
```hcl
resource "aws_db_instance" "{{resources[0].name}}" {
  identifier     = "{{resources[0].name}}"
  engine         = "{{resources[0].cloud_specific_properties.engine}}"
  engine_version = "{{resources[0].cloud_specific_properties.engine_version}}"
  instance_class = "{{resources[0].cloud_specific_properties.instance_class}}"
  
  tags = {
    Name        = "{{resources[0].name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{blueprint.name}}"
  }
}
```

**Input API Response**:
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

**Output (output/terraform/main.tf)**:
```hcl
resource "aws_db_instance" "postgres-db" {
  identifier     = "postgres-db"
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

### Example Kubernetes Template Processing

**Input Template (templates/k8s/deployment.yaml)**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
spec:
  replicas: {{stack.stack_resources[0].configuration.replicas|default:"3"}}
  selector:
    matchLabels:
      app: {{stack.name}}
  template:
    metadata:
      labels:
        app: {{stack.name}}
    spec:
      containers:
      - name: {{stack.name}}
        image: {{stack.stack_resources[0].configuration.image}}
        ports:
        - containerPort: {{stack.stack_resources[0].configuration.port}}
```

**Output (output/k8s/deployment.yaml)**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  labels:
    app: my-web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: my-web-app
        image: nginx:latest
        ports:
        - containerPort: 80
```

## Template Syntax and Features

### Variable Substitution

**Basic Substitution**:
```
{{variable_name}}
```

**Nested Access**:
```
{{blueprint.name}}
{{resources[0].cloud_provider.name}}
```

**Default Values**:
```
{{variable|default:"default_value"}}
{{resources[0].replicas|default:"3"}}
```

### Conditional Blocks

**If/Else**:
```hcl
{{#if resources[0].cloud_provider.name == "AWS"}}
provider "aws" {
  region = "us-east-1"
}
{{else}}
provider "azurerm" {
  features {}
}
{{/if}}
```

### Loops

**Iterating Over Arrays**:
```yaml
{{#each resources}}
- name: {{this.name}}
  type: {{this.resource_type.name}}
  provider: {{this.cloud_provider.name}}
{{/each}}
```

**Iterating with Index**:
```hcl
{{#each resources}}
resource "aws_instance" "instance_{{@index}}" {
  ami           = "{{this.configuration.ami}}"
  instance_type = "{{this.configuration.instance_type}}"
}
{{/each}}
```

### Comments

**Template Comments** (not included in output):
```
{{!-- This is a comment --}}
```

### Escaping

**Literal Braces**:
```
\{{not_a_variable}}  # Outputs: {{not_a_variable}}
```

### Built-in Helpers

**Case Conversion**:
```
{{uppercase blueprint.name}}
{{lowercase blueprint.name}}
{{capitalize blueprint.name}}
```

**String Operations**:
```
{{trim "  value  "}}
{{replace blueprint.name "-" "_"}}
```

**Type Checking**:
```
{{#if (is_array resources)}}
  # Handle array
{{/if}}
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
    
    #[error("Template error: {0}")]
    TemplateError(String),
    
    #[error("Template discovery error: {0}")]
    DiscoveryError(String),
    
    #[error("Variable not found: {0}")]
    VariableNotFoundError(String),
    
    #[error("Template processing error: {0}")]
    ProcessingError(String),
    
    #[error("YAML validation error: {0}")]
    YamlValidationError(String),
}
```

### Error Handling Strategy

1. **API Errors**: Map HTTP status codes to specific error types
2. **Network Errors**: Provide clear messages about connectivity issues
3. **File System Errors**: Handle permission and disk space issues
4. **Validation Errors**: Validate inputs before making API calls
5. **Template Errors**: Catch and report template syntax errors with line numbers
6. **Variable Errors**: Report missing or undefined variables with suggestions
7. **YAML/JSON Validation**: Validate output syntax before writing files
8. **Graceful Degradation**: Continue processing when possible, report all errors at end

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
serde_yaml = "0.9"

# UUID handling
uuid = { version = "1.6", features = ["serde"] }

# Template engine
handlebars = "5.0"

# Directory walking
walkdir = "2.4"

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
- `IDP_OUTPUT_DIR`: Output directory for processed files (overridden by `--output-dir` flag)
- `IDP_TEMPLATE_DIR`: Template directory path (overridden by `--template-dir` flag)
- `RUST_LOG`: Logging level (debug, info, warn, error)

### Default Values

- API URL: `http://localhost:8082/api/v1`
- Output Directory: `./output` (current working directory + output subdirectory)
- Template Directory: No default (must be specified)
- Log Level: `info`

### Configuration Precedence

1. Command-line flags (highest priority)
2. Environment variables
3. Default values (lowest priority)

### Example Usage

```bash
# Generate from blueprint with templates
idp-cli generate \
  --data-source blueprint \
  --identifier web-app-blueprint \
  --template-dir ./templates/terraform \
  --output-dir ./generated/terraform \
  --api-key $IDP_API_KEY

# Generate Kubernetes manifests from stack
idp-cli generate \
  --data-source stack \
  --identifier my-prod-stack \
  --template-dir ./templates/k8s \
  --output-dir ./generated/k8s \
  --variables-file ./custom-vars.yaml

# List available variables
idp-cli list-variables \
  --data-source blueprint \
  --identifier web-app-blueprint
```

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

1. **Template Helpers**: Add custom Handlebars helpers for common transformations
   - Case conversion (camelCase, snake_case, kebab-case)
   - String manipulation (trim, replace, concat)
   - Math operations (add, subtract, multiply)
   - Conditional logic (equals, contains, greater_than)

2. **Template Validation**: Validate templates before processing
   - Check for undefined variables
   - Validate template syntax
   - Detect circular references

3. **Multi-Environment Support**: Process templates for multiple environments
   - Environment-specific variable files
   - Conditional template sections based on environment
   - Batch processing for dev/staging/prod

4. **Dry Run Mode**: Preview processed templates without writing files
   - Show diff between template and output
   - Highlight variable substitutions
   - Validate output syntax

5. **Interactive Mode**: Prompt for missing variables
   - Detect undefined variables
   - Prompt user for values
   - Save responses to variables file

6. **Template Library**: Built-in template examples
   - AWS Terraform templates
   - Azure Terraform templates
   - GCP Terraform templates
   - Kubernetes manifest templates
   - Helm chart templates

### Phase 3 Features

1. **Integration with IaC Tools**: Execute tools after generation
   - `terraform init/plan/apply`
   - `kubectl apply`
   - `helm install`

2. **Template Marketplace**: Share and discover templates
   - Community-contributed templates
   - Organization-specific template repositories
   - Template versioning and updates

3. **Advanced Variable Sources**: Support additional data sources
   - Environment variables
   - AWS Parameter Store
   - HashiCorp Vault
   - Kubernetes ConfigMaps/Secrets

4. **Policy Validation**: Validate generated output against policies
   - OPA (Open Policy Agent) integration
   - Custom validation rules
   - Security scanning

5. **CI/CD Integration**: Streamline pipeline usage
   - GitHub Actions integration
   - GitLab CI integration
   - Jenkins plugin
   - Automated PR creation with generated code

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
