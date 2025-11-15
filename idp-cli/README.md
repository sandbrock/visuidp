# IDP Template CLI

A command-line interface tool for generating infrastructure-as-code and Kubernetes manifests from templates by substituting variables with data from IDP blueprints and stacks.

## Overview

The IDP Template CLI is a flexible, template-driven tool that allows you to use your own Terraform/OpenTofu and Kubernetes templates while leveraging IDP's infrastructure definitions for variable population. Instead of generating opinionated code, the CLI processes your custom templates by substituting variables with data from the IDP API.

## Key Features

- **Template-Based**: Use your own Terraform, OpenTofu, or Kubernetes templates
- **Variable Substitution**: Automatically populate templates with blueprint or stack data
- **Flexible Output**: Preserve your template structure and formatting
- **Multi-Format Support**: Process `.tf`, `.yaml`, `.yml`, and `.json` files
- **Custom Variables**: Override or extend API data with custom variable files
- **Variable Discovery**: List available variables before writing templates

## Project Structure

```
idp-cli/
├── src/
│   ├── main.rs                   # CLI entry point
│   ├── cli.rs                    # Command-line argument parsing
│   ├── api_client.rs             # IDP API communication
│   ├── models.rs                 # Data structures for API responses
│   ├── template_discovery.rs    # Template file discovery
│   ├── variable_context.rs      # Variable context building
│   ├── template_processor.rs    # Template processing and substitution
│   ├── file_writer.rs           # File I/O operations
│   └── error.rs                 # Error types and handling
├── examples/
│   ├── terraform/               # Example Terraform templates
│   └── kubernetes/              # Example Kubernetes templates
├── Cargo.toml                   # Project configuration and dependencies
└── README.md                    # This file
```

## Quick Start

### Installation

```bash
# Build from source
cargo build --release

# The binary will be available at target/release/idp-cli
```

### Basic Usage

```bash
# Generate Terraform code from a blueprint
idp-cli generate \
  --data-source blueprint \
  --identifier web-app-blueprint \
  --template-dir ./templates/terraform \
  --output-dir ./output/terraform \
  --api-key $IDP_API_KEY

# Generate Kubernetes manifests from a stack
idp-cli generate \
  --data-source stack \
  --identifier my-prod-stack \
  --template-dir ./templates/k8s \
  --output-dir ./output/k8s

# List available variables from a blueprint
idp-cli list-variables \
  --data-source blueprint \
  --identifier web-app-blueprint
```

## Commands

### `generate`

Process templates by substituting variables with data from a blueprint or stack.

**Usage:**
```bash
idp-cli generate [OPTIONS] --data-source <SOURCE> --identifier <ID> --template-dir <DIR>
```

**Options:**
- `--data-source <SOURCE>`: Data source type (`blueprint` or `stack`)
- `--identifier <ID>`: Blueprint or stack name/UUID
- `--template-dir <DIR>`: Directory containing template files
- `--output-dir <DIR>`: Output directory (default: `./output`)
- `--variables-file <FILE>`: Optional custom variables file (JSON or YAML)
- `--api-key <KEY>`: API key for authentication (or use `IDP_API_KEY` env var)
- `--api-url <URL>`: IDP API base URL (default: `http://localhost:8082/api/v1`)

**Examples:**

```bash
# Generate from blueprint with custom variables
idp-cli generate \
  --data-source blueprint \
  --identifier web-app-blueprint \
  --template-dir ./templates/terraform \
  --variables-file ./custom-vars.yaml \
  --output-dir ./generated

# Generate Kubernetes manifests from stack
idp-cli generate \
  --data-source stack \
  --identifier production-stack \
  --template-dir ./templates/k8s \
  --output-dir ./k8s-manifests
```

### `list-variables`

Display all available variables from a blueprint or stack without generating files.

**Usage:**
```bash
idp-cli list-variables [OPTIONS] --data-source <SOURCE> --identifier <ID>
```

**Options:**
- `--data-source <SOURCE>`: Data source type (`blueprint` or `stack`)
- `--identifier <ID>`: Blueprint or stack name/UUID
- `--api-key <KEY>`: API key for authentication (or use `IDP_API_KEY` env var)
- `--api-url <URL>`: IDP API base URL

**Example:**

```bash
idp-cli list-variables \
  --data-source blueprint \
  --identifier web-app-blueprint
```

### `version`

Display the CLI version.

```bash
idp-cli version
```

## Template Syntax

### Variable Substitution

Use `{{variable_name}}` syntax to reference variables in your templates.

**Basic substitution:**
```hcl
resource "aws_db_instance" "{{resources[0].name}}" {
  identifier = "{{resources[0].name}}"
  engine     = "{{resources[0].cloud_specific_properties.engine}}"
}
```

**Nested access with dot notation:**
```yaml
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
    cloud: {{stack.cloud_name}}
```

**Array indexing:**
```hcl
# Access first resource
resource "aws_instance" "{{resources[0].name}}" {
  ami = "{{resources[0].configuration.ami}}"
}

# Access second resource
resource "aws_db_instance" "{{resources[1].name}}" {
  engine = "{{resources[1].cloud_specific_properties.engine}}"
}
```

### Default Values

Provide fallback values when a variable might be undefined:

```hcl
resource "aws_instance" "web" {
  instance_type = "{{instance_type|default:"t3.micro"}}"
  count         = {{replica_count|default:"3"}}
}
```

### Conditional Blocks

Use `if/else` blocks for conditional content:

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

Iterate over arrays with `each` blocks:

```yaml
# Iterate over all resources
{{#each resources}}
---
apiVersion: v1
kind: Service
metadata:
  name: {{this.name}}
spec:
  selector:
    app: {{this.name}}
{{/each}}
```

**With index:**
```hcl
{{#each resources}}
resource "aws_instance" "instance_{{@index}}" {
  ami           = "{{this.configuration.ami}}"
  instance_type = "{{this.configuration.instance_type}}"
  
  tags = {
    Name  = "{{this.name}}"
    Index = "{{@index}}"
  }
}
{{/each}}
```

### Built-in Helpers

**Case conversion:**
```hcl
resource "aws_s3_bucket" "{{lowercase blueprint.name}}" {
  bucket = "{{lowercase blueprint.name}}-data"
  
  tags = {
    Name = "{{uppercase blueprint.name}}"
  }
}
```

**String operations:**
```hcl
resource "aws_instance" "web" {
  tags = {
    Name = "{{trim blueprint.name}}"
    Slug = "{{replace blueprint.name " " "-"}}"
  }
}
```

### Comments

Add comments that won't appear in the output:

```hcl
{{!-- This is a template comment --}}
resource "aws_instance" "web" {
  # This is a regular HCL comment that will appear in output
  ami = "{{ami_id}}"
}
```

## Available Variables

### Blueprint Variables

When using `--data-source blueprint`, the following variables are available:

```
blueprint.id                                    # UUID
blueprint.name                                  # String
blueprint.description                           # String (optional)
resources                                       # Array of resources
resources[N].id                                 # UUID
resources[N].name                               # String
resources[N].description                        # String (optional)
resources[N].resource_type.name                 # String (e.g., "RelationalDatabaseServer")
resources[N].resource_type.category             # String
resources[N].cloud_provider.name                # String (e.g., "AWS", "Azure")
resources[N].cloud_provider.display_name        # String
resources[N].configuration.*                    # Dynamic properties
resources[N].cloud_specific_properties.*        # Cloud-specific properties
```

### Stack Variables

When using `--data-source stack`, the following variables are available:

```
stack.id                                        # UUID
stack.name                                      # String
stack.description                               # String (optional)
stack.cloud_name                                # String
stack.stack_type                                # String
stack_resources                                 # Array of resources
stack_resources[N].id                           # UUID
stack_resources[N].name                         # String
stack_resources[N].description                  # String (optional)
stack_resources[N].resource_type.name           # String
stack_resources[N].resource_type.category       # String
stack_resources[N].cloud_provider.name          # String
stack_resources[N].cloud_provider.display_name  # String
stack_resources[N].configuration.*              # Dynamic properties
```

Use `idp-cli list-variables` to see the exact variables available for your specific blueprint or stack.

## Example Templates

### Terraform Template

**File: `templates/terraform/main.tf`**

```hcl
# Generated from blueprint: {{blueprint.name}}
{{#if blueprint.description}}
# {{blueprint.description}}
{{/if}}

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "{{aws_region|default:"us-east-1"}}"
}

{{#each resources}}
{{#if this.resource_type.name == "RelationalDatabaseServer"}}
resource "aws_db_instance" "{{this.name}}" {
  identifier     = "{{this.name}}"
  engine         = "{{this.cloud_specific_properties.engine}}"
  engine_version = "{{this.cloud_specific_properties.engine_version}}"
  instance_class = "{{this.cloud_specific_properties.instance_class}}"
  
  allocated_storage = {{this.cloud_specific_properties.allocated_storage|default:"20"}}
  storage_type      = "{{this.cloud_specific_properties.storage_type|default:"gp3"}}"
  
  db_name  = "{{this.configuration.database_name}}"
  username = "{{this.configuration.admin_username}}"
  password = var.db_password_{{@index}}
  
  skip_final_snapshot = true
  
  tags = {
    Name        = "{{this.name}}"
    ManagedBy   = "IDP"
    Blueprint   = "{{../blueprint.name}}"
  }
}

variable "db_password_{{@index}}" {
  description = "Password for {{this.name}}"
  type        = string
  sensitive   = true
}
{{/if}}
{{/each}}
```

### Kubernetes Template

**File: `templates/k8s/deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
    managed-by: idp
spec:
  replicas: {{replicas|default:"3"}}
  selector:
    matchLabels:
      app: {{stack.name}}
  template:
    metadata:
      labels:
        app: {{stack.name}}
    spec:
      containers:
      {{#each stack_resources}}
      {{#if this.resource_type.name == "ContainerOrchestrator"}}
      - name: {{this.name}}
        image: {{this.configuration.image}}
        ports:
        - containerPort: {{this.configuration.port}}
        env:
        {{#each this.configuration.environment_variables}}
        - name: {{this.key}}
          value: "{{this.value}}"
        {{/each}}
        resources:
          requests:
            memory: "{{this.configuration.memory|default:"256Mi"}}"
            cpu: "{{this.configuration.cpu|default:"250m"}}"
          limits:
            memory: "{{this.configuration.memory_limit|default:"512Mi"}}"
            cpu: "{{this.configuration.cpu_limit|default:"500m"}}"
      {{/if}}
      {{/each}}
```

**File: `templates/k8s/service.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{stack.name}}
  labels:
    app: {{stack.name}}
spec:
  type: {{service_type|default:"ClusterIP"}}
  selector:
    app: {{stack.name}}
  ports:
  {{#each stack_resources}}
  {{#if this.resource_type.name == "ContainerOrchestrator"}}
  - name: {{this.name}}
    port: {{this.configuration.port}}
    targetPort: {{this.configuration.port}}
    protocol: TCP
  {{/if}}
  {{/each}}
```

## Custom Variables

You can provide additional variables or override API data using a custom variables file.

### JSON Format

**File: `custom-vars.json`**

```json
{
  "aws_region": "us-west-2",
  "environment": "production",
  "replicas": 5,
  "service_type": "LoadBalancer",
  "tags": {
    "Team": "Platform",
    "CostCenter": "Engineering"
  }
}
```

### YAML Format

**File: `custom-vars.yaml`**

```yaml
aws_region: us-west-2
environment: production
replicas: 5
service_type: LoadBalancer
tags:
  Team: Platform
  CostCenter: Engineering
```

### Usage

```bash
idp-cli generate \
  --data-source blueprint \
  --identifier web-app \
  --template-dir ./templates \
  --variables-file ./custom-vars.yaml \
  --output-dir ./output
```

**Variable Precedence:**
1. Custom variables (highest priority)
2. Blueprint/Stack data from API
3. Default values in templates (lowest priority)

When custom variables conflict with API data, the CLI will display a warning and use the custom value.

## Environment Variables

The CLI supports configuration via environment variables:

- `IDP_API_KEY`: API key for authentication (can be overridden with `--api-key`)
- `IDP_API_URL`: Base URL for IDP API (default: `http://localhost:8082/api/v1`)
- `IDP_OUTPUT_DIR`: Default output directory (default: `./output`)
- `IDP_TEMPLATE_DIR`: Default template directory (no default, must be specified)
- `RUST_LOG`: Logging level (`debug`, `info`, `warn`, `error`)

**Example:**

```bash
export IDP_API_KEY="your-api-key-here"
export IDP_API_URL="https://idp.example.com/api/v1"
export RUST_LOG=info

idp-cli generate \
  --data-source blueprint \
  --identifier web-app \
  --template-dir ./templates
```

## Configuration Precedence

When the same setting is specified in multiple places, the CLI uses this precedence order:

1. Command-line flags (highest priority)
2. Environment variables
3. Default values (lowest priority)

## Troubleshooting

### Template Errors

**Error: "Variable not found: resources[0].name"**

**Cause:** The template references a variable that doesn't exist in the API response.

**Solution:**
1. Use `idp-cli list-variables` to see available variables
2. Check the variable path syntax (use dot notation for nested access)
3. Add a default value: `{{resources[0].name|default:"default-name"}}`

---

**Error: "Template syntax error at line 15"**

**Cause:** Invalid Handlebars syntax in the template.

**Solution:**
1. Check for matching opening and closing tags (`{{#if}}...{{/if}}`)
2. Verify helper syntax (e.g., `{{#each}}...{{/each}}`)
3. Ensure proper escaping of literal braces: `\{{not_a_variable}}`

---

**Error: "YAML validation error: expected mapping"**

**Cause:** Variable substitution resulted in invalid YAML syntax.

**Solution:**
1. Check that substituted values are properly quoted in YAML
2. Use quotes around variables that might contain special characters: `name: "{{stack.name}}"`
3. Verify indentation is preserved after substitution

---

**Error: "Template directory not found: ./templates"**

**Cause:** The specified template directory doesn't exist.

**Solution:**
1. Verify the path is correct: `ls -la ./templates`
2. Use an absolute path: `--template-dir /full/path/to/templates`
3. Check current working directory: `pwd`

---

**Error: "Authentication failed: 401 Unauthorized"**

**Cause:** Invalid or missing API key.

**Solution:**
1. Verify API key is set: `echo $IDP_API_KEY`
2. Check API key is valid in IDP
3. Ensure API key has not expired
4. Use `--api-key` flag to override environment variable

---

**Error: "Resource not found: web-app-blueprint"**

**Cause:** The specified blueprint or stack doesn't exist.

**Solution:**
1. Verify the identifier is correct (check spelling)
2. Try using the UUID instead of the name
3. Check you have access to the resource in IDP
4. Verify the API URL is correct: `--api-url`

---

**Error: "Network error: connection refused"**

**Cause:** Cannot connect to the IDP API.

**Solution:**
1. Verify the API is running: `curl $IDP_API_URL/health`
2. Check the API URL is correct: `echo $IDP_API_URL`
3. Verify network connectivity
4. Check firewall rules

### Variable Discovery Issues

**Problem:** Not sure what variables are available

**Solution:**
```bash
# List all available variables
idp-cli list-variables \
  --data-source blueprint \
  --identifier your-blueprint

# Save output to file for reference
idp-cli list-variables \
  --data-source blueprint \
  --identifier your-blueprint > variables.txt
```

### Template Development Tips

1. **Start Simple**: Begin with basic variable substitution before adding conditionals and loops
2. **Test Incrementally**: Process one template file at a time during development
3. **Use list-variables**: Always check available variables before writing templates
4. **Validate Output**: Use `terraform validate` or `kubectl apply --dry-run` to verify generated files
5. **Add Defaults**: Use default values for optional variables to prevent errors
6. **Comment Templates**: Use `{{!-- comments --}}` to document template logic

### Common Patterns

**Handling Optional Fields:**
```hcl
{{#if resources[0].description}}
description = "{{resources[0].description}}"
{{/if}}
```

**Safe Array Access:**
```hcl
{{#if resources}}
{{#each resources}}
resource "aws_instance" "{{this.name}}" {
  # ...
}
{{/each}}
{{else}}
# No resources defined
{{/if}}
```

**Dynamic Resource Names:**
```hcl
resource "aws_instance" "{{replace this.name " " "_"}}" {
  tags = {
    Name = "{{this.name}}"
  }
}
```

## Building and Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-org/idp-cli
cd idp-cli

# Build the project
cargo build --release

# The binary will be at target/release/idp-cli
```

### Development Mode

```bash
# Run in development mode
cargo run -- generate \
  --data-source blueprint \
  --identifier test-blueprint \
  --template-dir ./examples/terraform

# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_template_discovery

# Check code
cargo check

# Format code
cargo fmt

# Lint code
cargo clippy
```

### Project Dependencies

**Core Dependencies:**
- `clap` (4.4): CLI argument parsing
- `reqwest` (0.11): HTTP client
- `tokio` (1.35): Async runtime
- `serde` (1.0): JSON serialization
- `serde_json` (1.0): JSON handling
- `serde_yaml` (0.9): YAML processing
- `uuid` (1.6): UUID support
- `handlebars` (5.0): Template engine
- `walkdir` (2.4): Directory traversal
- `thiserror` (1.0): Error handling
- `anyhow` (1.0): Error utilities
- `env_logger` (0.11): Logging
- `log` (0.4): Logging facade

**Development Dependencies:**
- `mockito` (1.2): HTTP mocking
- `tempfile` (3.8): Temporary directories
- `assert_cmd` (2.0): CLI testing
- `predicates` (3.0): Assertions

## Examples

Complete example templates are available in the `examples/` directory:

- `examples/terraform/`: Terraform/OpenTofu templates for AWS resources
- `examples/kubernetes/`: Kubernetes manifest templates

Each example directory includes a README with usage instructions.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass: `cargo test`
5. Format code: `cargo fmt`
6. Run clippy: `cargo clippy`
7. Submit a pull request

## License

MIT

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/your-org/idp-cli/issues
- Documentation: https://docs.idp.example.com/cli
