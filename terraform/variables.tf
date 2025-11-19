# Input Variables for VisuIDP AWS Deployment

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, test, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, test, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "visuidp"
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.dynamodb_billing_mode)
    error_message = "Billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB tables"
  type        = bool
  default     = true
}

# Lambda Configuration
variable "lambda_memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240
    error_message = "Lambda memory must be between 128 and 10240 MB."
  }
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
  validation {
    condition     = var.lambda_timeout >= 1 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 1 and 900 seconds."
  }
}

variable "lambda_architecture" {
  description = "Lambda architecture (x86_64 or arm64)"
  type        = string
  default     = "arm64"
  validation {
    condition     = contains(["x86_64", "arm64"], var.lambda_architecture)
    error_message = "Lambda architecture must be x86_64 or arm64."
  }
}

# CLI Lambda Configuration
variable "cli_lambda_timeout" {
  description = "CLI Lambda timeout in seconds (for template processing)"
  type        = number
  default     = 60
  validation {
    condition     = var.cli_lambda_timeout >= 1 && var.cli_lambda_timeout <= 900
    error_message = "CLI Lambda timeout must be between 1 and 900 seconds."
  }
}

# Domain and SSL Configuration
variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for custom domain (must be in us-east-1 for CloudFront)"
  type        = string
  default     = ""
}

# Entra ID Configuration
variable "entra_id_tenant_id" {
  description = "Microsoft Entra ID tenant ID"
  type        = string
}

variable "entra_id_client_id" {
  description = "Microsoft Entra ID application client ID"
  type        = string
}

variable "entra_id_issuer_url" {
  description = "Entra ID OIDC issuer URL"
  type        = string
  default     = ""
}

# CloudWatch Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 3
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention must be a valid CloudWatch retention period."
  }
}

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms (limited to 10 for Free Tier)"
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

# Demo Mode Configuration
variable "enable_demo_mode" {
  description = "Enable demo mode for hackathon judges (bypasses authentication)"
  type        = bool
  default     = false
}

# Application Configuration
variable "admin_group" {
  description = "Admin group name for authorization"
  type        = string
  default     = "admin"
}

# API Key Configuration
variable "api_key_default_expiration_days" {
  description = "Default expiration days for API keys"
  type        = number
  default     = 90
}

variable "api_key_rotation_grace_period_hours" {
  description = "Grace period in hours for API key rotation"
  type        = number
  default     = 24
}

variable "api_key_max_keys_per_user" {
  description = "Maximum number of API keys per user"
  type        = number
  default     = 10
}

variable "api_key_bcrypt_cost_factor" {
  description = "BCrypt cost factor for API key hashing"
  type        = number
  default     = 12
}

variable "api_key_length" {
  description = "Length of generated API keys"
  type        = number
  default     = 32
}

# Rollback Configuration
variable "enable_lambda_versioning" {
  description = "Enable Lambda versioning for rollback capability"
  type        = bool
  default     = true
}

variable "lambda_alias_name" {
  description = "Name of the Lambda alias for stable endpoint"
  type        = string
  default     = "live"
}

# Lambda Performance Optimization
variable "lambda_provisioned_concurrency" {
  description = "Number of provisioned concurrent executions for API Lambda (0 = disabled, use for critical endpoints to eliminate cold starts)"
  type        = number
  default     = 0
  validation {
    condition     = var.lambda_provisioned_concurrency >= 0
    error_message = "Provisioned concurrency must be >= 0."
  }
}

variable "lambda_reserved_concurrency" {
  description = "Reserved concurrent executions limit for API Lambda (-1 = unreserved, use to prevent runaway costs)"
  type        = number
  default     = -1
  validation {
    condition     = var.lambda_reserved_concurrency >= -1
    error_message = "Reserved concurrency must be >= -1."
  }
}

# Cost Management Configuration
variable "cost_alert_emails" {
  description = "Email addresses to receive cost alerts and budget notifications"
  type        = list(string)
  default     = []
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 50
  validation {
    condition     = var.monthly_budget_limit > 0
    error_message = "Monthly budget limit must be greater than 0."
  }
}

variable "daily_budget_limit" {
  description = "Daily budget limit in USD (for production environment)"
  type        = number
  default     = 5
  validation {
    condition     = var.daily_budget_limit > 0
    error_message = "Daily budget limit must be greater than 0."
  }
}

variable "billing_alarm_threshold" {
  description = "Threshold for total estimated charges alarm in USD"
  type        = number
  default     = 40
  validation {
    condition     = var.billing_alarm_threshold > 0
    error_message = "Billing alarm threshold must be greater than 0."
  }
}

variable "enable_service_cost_alarms" {
  description = "Enable per-service cost alarms (Lambda, DynamoDB, CloudFront)"
  type        = bool
  default     = true
}

variable "lambda_cost_threshold" {
  description = "Threshold for Lambda cost alarm in USD"
  type        = number
  default     = 15
}

variable "dynamodb_cost_threshold" {
  description = "Threshold for DynamoDB cost alarm in USD"
  type        = number
  default     = 10
}

variable "cloudfront_cost_threshold" {
  description = "Threshold for CloudFront cost alarm in USD"
  type        = number
  default     = 10
}

variable "enable_anomaly_detection" {
  description = "Enable AWS Cost Anomaly Detection for unusual spending patterns"
  type        = bool
  default     = false
}

variable "anomaly_threshold" {
  description = "Threshold for cost anomaly alerts in USD"
  type        = number
  default     = 10
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
