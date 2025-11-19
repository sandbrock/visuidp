# Cost Management Module Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "alert_email_addresses" {
  description = "Email addresses to receive cost alerts"
  type        = list(string)
}

variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 50
}

variable "daily_budget_limit" {
  description = "Daily budget limit in USD (for production)"
  type        = number
  default     = 5
}

variable "billing_alarm_threshold" {
  description = "Threshold for total estimated charges alarm in USD"
  type        = number
  default     = 40
}

variable "enable_service_cost_alarms" {
  description = "Enable per-service cost alarms"
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
  description = "Enable AWS Cost Anomaly Detection"
  type        = bool
  default     = false
}

variable "anomaly_threshold" {
  description = "Threshold for cost anomaly alerts in USD"
  type        = number
  default     = 10
}
