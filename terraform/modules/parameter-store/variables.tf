# Parameter Store Module Variables

variable "parameter_prefix" {
  description = "Prefix for parameter names (e.g., /visuidp/dev)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# Application Configuration
variable "admin_group" {
  description = "Admin group name for authorization"
  type        = string
  default     = "admin"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "ERROR"
  validation {
    condition     = contains(["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], var.log_level)
    error_message = "Log level must be one of: TRACE, DEBUG, INFO, WARN, ERROR."
  }
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

# DynamoDB Configuration
variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
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
}

# Demo Mode Configuration
variable "enable_demo_mode" {
  description = "Enable demo mode for hackathon judges"
  type        = bool
  default     = false
}

# Optional: KMS key for SecureString parameters
variable "kms_key_id" {
  description = "KMS key ID for encrypting SecureString parameters"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
