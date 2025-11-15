# Terraform Template Examples

This directory contains example Terraform templates that demonstrate how to use the IDP CLI with blueprint and stack data.

## Overview

These templates show common patterns for generating Terraform configurations from IDP blueprints and stacks:

- Variable substitution with dot notation
- Conditional blocks for cloud-specific resources
- Loops for creating multiple resources
- Default values for optional configurations
- Nested data access

## Usage

### Generate from Blueprint

```bash
idp-cli generate \
  --data-source blueprint \
  --identifier my-blueprint \
  --template-dir ./examples/terraform \
  --output-dir ./output/terraform \
  --api-key $IDP_API_KEY
```

### Generate from Stack

```bash
idp-cli generate \
  --data-source stack \
  --identifier my-stack \
  --template-dir ./examples/terraform \
  --output-dir ./output/terraform \
  --api-key $IDP_API_KEY
```

### With Custom Variables

```bash
idp-cli generate \
  --data-source blueprint \
  --identifier my-blueprint \
  --template-dir ./examples/terraform \
  --output-dir ./output/terraform \
  --variables-file ./custom-vars.yaml \
  --api-key $IDP_API_KEY
```

## Available Variables

Use the `list-variables` command to see all available variables from your blueprint or stack:

```bash
idp-cli list-variables \
  --data-source blueprint \
  --identifier my-blueprint \
  --api-key $IDP_API_KEY
```

## Template Files

### main.tf
Main resource definitions demonstrating:
- Loop over resources using `{{#each}}`
- Conditional blocks with `{{#if}}`
- Nested property access
- Cloud provider-specific configurations

### variables.tf
Variable declarations showing:
- Default value helper `{{variable|default:"value"}}`
- Type inference from data
- Description generation

### outputs.tf
Output definitions demonstrating:
- Resource attribute references
- Conditional outputs
- Array indexing

### provider.tf
Provider configuration showing:
- Cloud provider selection
- Region/location configuration
- Version constraints

## Common Patterns

### Accessing Blueprint Data

```hcl
# Blueprint metadata
name        = "{{blueprint.name}}"
description = "{{blueprint.description}}"

# First resource
resource_name = "{{resources[0].name}}"

# Resource type
type = "{{resources[0].resource_type.name}}"

# Cloud provider
provider = "{{resources[0].cloud_provider.name}}"
```

### Accessing Stack Data

```hcl
# Stack metadata
stack_name  = "{{stack.name}}"
cloud_name  = "{{stack.cloud_name}}"
stack_type  = "{{stack.stack_type}}"

# Stack resources
resource_name = "{{stack_resources[0].name}}"
```

### Loops

```hcl
{{#each resources}}
resource "aws_instance" "{{this.name}}" {
  ami           = "{{this.configuration.ami}}"
  instance_type = "{{this.configuration.instance_type}}"
  
  tags = {
    Name = "{{this.name}}"
  }
}
{{/each}}
```

### Conditionals

```hcl
{{#if (eq resources[0].cloud_provider.name "AWS")}}
provider "aws" {
  region = "{{resources[0].cloud_specific_properties.region|default:"us-east-1"}}"
}
{{/if}}

{{#if (eq resources[0].cloud_provider.name "Azure")}}
provider "azurerm" {
  features {}
}
{{/if}}
```

### Default Values

```hcl
# Use default if property is missing
instance_type = "{{resources[0].cloud_specific_properties.instance_type|default:"t3.micro"}}"

# Use default for optional fields
description = "{{blueprint.description|default:"No description provided"}}"
```

## Custom Variables

You can provide additional variables via a YAML or JSON file:

**custom-vars.yaml:**
```yaml
environment: production
region: us-west-2
enable_monitoring: true
tags:
  Team: Platform
  CostCenter: Engineering
```

**Usage in templates:**
```hcl
environment = "{{environment}}"
region      = "{{region}}"

{{#if enable_monitoring}}
monitoring_enabled = true
{{/if}}

tags = {
  Team       = "{{tags.Team}}"
  CostCenter = "{{tags.CostCenter}}"
}
```

## Next Steps

After generating Terraform code:

1. Review the generated files in your output directory
2. Initialize Terraform: `terraform init`
3. Validate the configuration: `terraform validate`
4. Plan the changes: `terraform plan`
5. Apply the infrastructure: `terraform apply`

## Tips

- Always review generated code before applying
- Use `terraform fmt` to format generated files
- Test with `terraform plan` before `terraform apply`
- Use version control for generated configurations
- Keep templates simple and maintainable
