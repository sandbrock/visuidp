variable "azure_region" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "stack_name" {
  description = "Stack name"
  type        = string
  default     = "demo-analytics"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}

variable "sql_admin_username" {
  description = "SQL Server admin username"
  type        = string
  sensitive   = true
}

variable "sql_admin_password" {
  description = "SQL Server admin password"
  type        = string
  sensitive   = true
}
