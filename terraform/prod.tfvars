# Production Environment Configuration

environment = "prod"
aws_region  = "us-east-1"

# DynamoDB Configuration
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_point_in_time_recovery = true

# Lambda Configuration
lambda_memory_size  = 1024 # Higher memory for production (optimize based on testing)
lambda_timeout      = 30
lambda_architecture = "arm64" # ARM64 for 20% cost savings
cli_lambda_timeout  = 60

# Lambda Performance Optimization
# Note: Provisioned concurrency costs ~$0.015/hour per execution unit
# Only enable for critical endpoints if cold starts are unacceptable
lambda_provisioned_concurrency = 0  # Start with 0, enable if needed (1-2 recommended)
lambda_reserved_concurrency    = 10 # Limit to prevent runaway costs

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

# Cost Management Configuration
cost_alert_emails = [] # Add email addresses for cost alerts: ["ops@example.com", "finance@example.com"]

monthly_budget_limit  = 50  # Production budget limit
daily_budget_limit    = 5   # Daily budget for production
billing_alarm_threshold = 40 # Alert at $40 for production

# Service-specific cost thresholds
enable_service_cost_alarms = true
lambda_cost_threshold      = 15
dynamodb_cost_threshold    = 10
cloudfront_cost_threshold  = 10

# Cost anomaly detection (recommended for production)
enable_anomaly_detection = true  # Enable to detect unusual spending patterns
anomaly_threshold        = 10    # Alert on $10+ anomalies

# Additional Tags
additional_tags = {
  CostCenter = "production"
  Owner      = "ops-team"
  Backup     = "required"
}
