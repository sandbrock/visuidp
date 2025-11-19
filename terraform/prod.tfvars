# Production Environment Configuration

environment = "prod"
aws_region  = "us-east-1"

# DynamoDB Configuration
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_point_in_time_recovery = true

# Lambda Configuration
lambda_memory_size  = 1024 # Higher memory for production
lambda_timeout      = 30
lambda_architecture = "arm64" # ARM64 for 20% cost savings
cli_lambda_timeout  = 60

# CloudWatch Configuration
log_retention_days       = 7 # Balance cost and retention
enable_cloudwatch_alarms = true
alarm_email              = "" # Set to your email for alarm notifications

# Entra ID Configuration
entra_id_tenant_id = "" # Set your Entra ID tenant ID
entra_id_client_id = "" # Set your Entra ID client ID

# Domain Configuration
domain_name     = "" # Set your production domain (e.g., visuidp.example.com)
certificate_arn = "" # Set your ACM certificate ARN (must be in us-east-1)

# Demo Mode
enable_demo_mode = false # Disable for production

# Rollback Configuration
enable_lambda_versioning = true  # Enable versioning for rollback capability
lambda_alias_name        = "live" # Alias name for stable endpoint

# Additional Tags
additional_tags = {
  CostCenter = "production"
  Owner      = "ops-team"
  Backup     = "required"
}
