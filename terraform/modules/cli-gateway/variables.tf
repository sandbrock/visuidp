# CLI Gateway Module Variables

variable "api_gateway_id" {
  description = "ID of the API Gateway"
  type        = string
}

variable "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway"
  type        = string
}

variable "jwt_authorizer_id" {
  description = "ID of the JWT authorizer"
  type        = string
  default     = null
}

variable "cli_lambda_arn" {
  description = "ARN of the CLI Lambda function"
  type        = string
}

variable "cli_lambda_invoke_arn" {
  description = "Invoke ARN of the CLI Lambda function"
  type        = string
}

variable "cli_lambda_role_name" {
  description = "Name of the CLI Lambda execution role"
  type        = string
}

variable "bucket_prefix" {
  description = "Prefix for S3 bucket names"
  type        = string
}

variable "templates_bucket_arn" {
  description = "ARN of the S3 bucket for templates"
  type        = string
}

variable "outputs_bucket_arn" {
  description = "ARN of the S3 bucket for outputs"
  type        = string
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
