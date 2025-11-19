# Lambda Module Variables

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "function_type" {
  description = "Type of function (api or cli)"
  type        = string
  validation {
    condition     = contains(["api", "cli"], var.function_type)
    error_message = "Function type must be api or cli."
  }
}

variable "image_uri" {
  description = "URI of the container image in ECR"
  type        = string
  default     = ""
}

variable "memory_size" {
  description = "Memory size in MB (optimized for cost/performance balance)"
  type        = number
  default     = 512

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 MB and 10240 MB."
  }
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 30
}

variable "architecture" {
  description = "Lambda architecture (x86_64 or arm64)"
  type        = string
  default     = "arm64"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days (3-7 days for cost optimization)"
  type        = number
  default     = 3

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period."
  }
}

variable "enable_function_url" {
  description = "Enable Lambda function URL"
  type        = bool
  default     = false
}

variable "enable_versioning" {
  description = "Enable Lambda versioning for rollback capability"
  type        = bool
  default     = true
}

variable "alias_name" {
  description = "Name of the Lambda alias (e.g., live, prod)"
  type        = string
  default     = "live"
}

variable "alias_version" {
  description = "Lambda version to point the alias to (empty = latest)"
  type        = string
  default     = ""
}

variable "provisioned_concurrent_executions" {
  description = "Number of provisioned concurrent executions (0 = disabled, use for critical endpoints)"
  type        = number
  default     = 0

  validation {
    condition     = var.provisioned_concurrent_executions >= 0
    error_message = "Provisioned concurrent executions must be >= 0."
  }
}

variable "reserved_concurrent_executions" {
  description = "Reserved concurrent executions limit (-1 = unreserved, use to prevent runaway costs)"
  type        = number
  default     = -1

  validation {
    condition     = var.reserved_concurrent_executions >= -1
    error_message = "Reserved concurrent executions must be >= -1."
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
