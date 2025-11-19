# Terraform Backend Configuration
# 
# This configuration uses an existing S3 bucket and DynamoDB table for state management.
# The actual backend configuration is provided via backend-config.hcl file.
#
# To initialize:
#   terraform init -backend-config=backend-config.hcl
#
# Example backend-config.hcl:
#   bucket         = "your-terraform-state-bucket"
#   key            = "visuidp/aws-deployment/terraform.tfstate"
#   region         = "us-east-1"
#   dynamodb_table = "your-terraform-locks-table"
#   encrypt        = true

terraform {
  backend "s3" {
    # Backend configuration provided via backend-config.hcl
    # This allows different configurations for different environments
    # without committing sensitive information to version control
  }
}
