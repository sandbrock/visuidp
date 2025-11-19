# API Gateway Module Variables

variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_function_arn" {
  description = "ARN of the Lambda function"
  type        = string
}

variable "lambda_function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  type        = string
}

variable "entra_id_tenant_id" {
  description = "Entra ID tenant ID"
  type        = string
}

variable "entra_id_client_id" {
  description = "Entra ID client ID"
  type        = string
}

variable "entra_id_issuer_url" {
  description = "Entra ID OIDC issuer URL"
  type        = string
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "domain_name" {
  description = "Custom domain name"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 3
}

variable "enable_demo_mode" {
  description = "Enable demo mode (bypasses JWT authentication)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
