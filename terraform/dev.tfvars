# Development Environment Configuration

environment = "dev"
aws_region  = "us-east-1"

# DynamoDB Configuration
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_point_in_time_recovery = false # Disable for dev to save costs

# Lambda Configuration
lambda_memory_size  = 512 # Start with 512MB, optimize based on CloudWatch metrics
lambda_timeout      = 30
lambda_architecture = "arm64" # ARM64 for 20% cost savings
cli_lambda_timeout  = 60

# Lambda Performance Optimization
lambda_provisioned_concurrency = 0  # Disabled for dev (cold starts acceptable)
lambda_reserved_concurrency    = -1 # Unreserved (no limit)

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

# Cost Management Configuration
cost_alert_emails = [] # Add email addresses for cost alerts: ["ops@example.com"]

monthly_budget_limit  = 20  # Lower budget for dev environment
daily_budget_limit    = 2   # Daily budget for dev
billing_alarm_threshold = 15 # Alert at $15 for dev

# Service-specific cost thresholds
enable_service_cost_alarms = true
lambda_cost_threshold      = 5
dynamodb_cost_threshold    = 5
cloudfront_cost_threshold  = 5

# Cost anomaly detection (optional)
enable_anomaly_detection = false # Disable for dev to save on alerts
anomaly_threshold        = 5

# Additional Tags
additional_tags = {
  CostCenter = "development"
  Owner      = "dev-team"
}
