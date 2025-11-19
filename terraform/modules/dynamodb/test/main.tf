# Test configuration for DynamoDB module

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
  region = "us-east-1"

  # Skip credentials for validation
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

module "dynamodb_test" {
  source = "../"

  table_name                    = "test-visuidp-data"
  billing_mode                  = "PAY_PER_REQUEST"
  enable_point_in_time_recovery = true
  environment                   = "test"

  tags = {
    Environment = "test"
    ManagedBy   = "Terraform"
  }
}

# Outputs for verification
output "table_name" {
  value = module.dynamodb_test.table_name
}

output "table_arn" {
  value = module.dynamodb_test.table_arn
}

output "gsi1_name" {
  value = module.dynamodb_test.gsi1_name
}

output "gsi2_name" {
  value = module.dynamodb_test.gsi2_name
}

output "access_policy_arn" {
  value = module.dynamodb_test.access_policy_arn
}

output "access_policy_name" {
  value = module.dynamodb_test.access_policy_name
}
