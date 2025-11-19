# Development Environment Configuration

environment = "dev"
aws_region  = "us-east-1"

# DynamoDB Configuration
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_point_in_time_recovery = false # Disable for dev to save costs

# Lambda Configuration
lambda_memory_size  = 512
lambda_timeout      = 30
lambda_architecture = "arm64" # ARM64 for 20% cost savings
cli_lambda_timeout  = 60

# CloudWatch Configuration
log_retention_days       = 3 # Short retention for dev
enable_cloudwatch_alarms = true
alarm_email              = "" # Set to your email for alarm notifications

# Entra ID Configuration
entra_id_tenant_id = "" # Set your Entra ID tenant ID
entra_id_client_id = "" # Set your Entra ID client ID

# Domain Configuration (optional for dev)
domain_name     = "" # Leave empty to use CloudFront domain
certificate_arn = "" # Leave empty if not using custom domain

# Demo Mode
enable_demo_mode = false # Set to true for hackathon demo

# Rollback Configuration
enable_lambda_versioning = true  # Enable versioning for rollback capability
lambda_alias_name        = "live" # Alias name for stable endpoint

# Additional Tags
additional_tags = {
  CostCenter = "development"
  Owner      = "dev-team"
}
