variable "azure_region" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "stack_name" {
  description = "Stack name"
  type        = string
  default     = "demo-payment-api"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}
