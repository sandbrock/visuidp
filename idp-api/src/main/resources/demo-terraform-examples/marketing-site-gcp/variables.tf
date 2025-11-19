variable "gcp_project" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "stack_name" {
  description = "Stack name"
  type        = string
  default     = "demo-marketing-site"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}
