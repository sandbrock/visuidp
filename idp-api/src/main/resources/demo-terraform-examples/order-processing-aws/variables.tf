variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "stack_name" {
  description = "Stack name"
  type        = string
  default     = "demo-order-processing"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "demo"
}
