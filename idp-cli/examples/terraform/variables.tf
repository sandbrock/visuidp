# Terraform Variables
# Generated from IDP Blueprint/Stack

# Environment variable
variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "{{environment|default:"dev"}}"
}

# Region/Location variables
{{#if (eq resources[0].cloud_provider.name "AWS")}}
variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "{{resources[0].cloud_specific_properties.region|default:"us-east-1"}}"
}
{{/if}}

{{#if (eq resources[0].cloud_provider.name "Azure")}}
variable "azure_location" {
  description = "Azure location for resource deployment"
  type        = string
  default     = "{{resources[0].cloud_specific_properties.location|default:"eastus"}}"
}

variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
  default     = "{{blueprint.name}}-rg"
}
{{/if}}

{{#if (eq resources[0].cloud_provider.name "GCP")}}
variable "gcp_project" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region for resource deployment"
  type        = string
  default     = "{{resources[0].cloud_specific_properties.region|default:"us-central1"}}"
}
{{/if}}

# Database passwords (sensitive)
{{#each resources}}
{{#if (eq this.resource_type.name "RelationalDatabaseServer")}}
variable "db_password_{{this.name}}" {
  description = "Database password for {{this.name}}"
  type        = string
  sensitive   = true
}
{{/if}}
{{/each}}

# Optional: Custom tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Blueprint metadata
variable "blueprint_name" {
  description = "Name of the IDP blueprint"
  type        = string
  default     = "{{blueprint.name}}"
}

variable "blueprint_description" {
  description = "Description of the IDP blueprint"
  type        = string
  default     = "{{blueprint.description|default:"No description provided"}}"
}

# Stack metadata (if using stack data source)
{{#if stack}}
variable "stack_name" {
  description = "Name of the IDP stack"
  type        = string
  default     = "{{stack.name}}"
}

variable "stack_cloud_name" {
  description = "Cloud name for the stack"
  type        = string
  default     = "{{stack.cloud_name}}"
}

variable "stack_type" {
  description = "Type of the stack"
  type        = string
  default     = "{{stack.stack_type}}"
}
{{/if}}

# Resource-specific variables
{{#each resources}}
{{#if (eq this.resource_type.name "ContainerOrchestrator")}}
variable "{{this.name}}_container_image" {
  description = "Container image for {{this.name}}"
  type        = string
  default     = "{{this.cloud_specific_properties.image|default:"nginx:latest"}}"
}

variable "{{this.name}}_container_port" {
  description = "Container port for {{this.name}}"
  type        = number
  default     = {{this.cloud_specific_properties.container_port|default:"80"}}
}
{{/if}}

{{#if (eq this.resource_type.name "Storage")}}
variable "{{this.name}}_versioning_enabled" {
  description = "Enable versioning for {{this.name}} storage"
  type        = bool
  default     = {{this.cloud_specific_properties.versioning_enabled|default:"true"}}
}
{{/if}}
{{/each}}
