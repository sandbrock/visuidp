# Terraform Provider Configuration
# Generated from IDP Blueprint/Stack

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    {{#if (eq resources[0].cloud_provider.name "AWS")}}
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    {{/if}}
    
    {{#if (eq resources[0].cloud_provider.name "Azure")}}
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    {{/if}}
    
    {{#if (eq resources[0].cloud_provider.name "GCP")}}
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    {{/if}}
  }
}

{{!-- AWS Provider Configuration --}}
{{#if (eq resources[0].cloud_provider.name "AWS")}}
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = merge(
      local.common_tags,
      var.additional_tags
    )
  }
}
{{/if}}

{{!-- Azure Provider Configuration --}}
{{#if (eq resources[0].cloud_provider.name "Azure")}}
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Create resource group for all resources
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.azure_location
  
  tags = merge(
    local.common_tags,
    var.additional_tags
  )
}
{{/if}}

{{!-- GCP Provider Configuration --}}
{{#if (eq resources[0].cloud_provider.name "GCP")}}
provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}
{{/if}}
