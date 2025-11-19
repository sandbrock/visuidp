# Systems Manager Parameter Store Module
# Creates application configuration parameters for Lambda functions

# Application Configuration Parameters
resource "aws_ssm_parameter" "admin_group" {
  name        = "${var.parameter_prefix}/admin-group"
  description = "Admin group name for authorization"
  type        = "String"
  value       = var.admin_group

  tags = var.tags
}

resource "aws_ssm_parameter" "api_key_default_expiration_days" {
  name        = "${var.parameter_prefix}/api-key/default-expiration-days"
  description = "Default expiration days for API keys"
  type        = "String"
  value       = tostring(var.api_key_default_expiration_days)

  tags = var.tags
}

resource "aws_ssm_parameter" "api_key_rotation_grace_period_hours" {
  name        = "${var.parameter_prefix}/api-key/rotation-grace-period-hours"
  description = "Grace period in hours for API key rotation"
  type        = "String"
  value       = tostring(var.api_key_rotation_grace_period_hours)

  tags = var.tags
}

resource "aws_ssm_parameter" "api_key_max_keys_per_user" {
  name        = "${var.parameter_prefix}/api-key/max-keys-per-user"
  description = "Maximum number of API keys per user"
  type        = "String"
  value       = tostring(var.api_key_max_keys_per_user)

  tags = var.tags
}

resource "aws_ssm_parameter" "api_key_bcrypt_cost_factor" {
  name        = "${var.parameter_prefix}/api-key/bcrypt-cost-factor"
  description = "BCrypt cost factor for API key hashing"
  type        = "String"
  value       = tostring(var.api_key_bcrypt_cost_factor)

  tags = var.tags
}

resource "aws_ssm_parameter" "api_key_length" {
  name        = "${var.parameter_prefix}/api-key/key-length"
  description = "Length of generated API keys"
  type        = "String"
  value       = tostring(var.api_key_length)

  tags = var.tags
}

# DynamoDB Configuration Parameters
resource "aws_ssm_parameter" "dynamodb_table_name" {
  name        = "${var.parameter_prefix}/dynamodb/table-name"
  description = "DynamoDB table name"
  type        = "String"
  value       = var.dynamodb_table_name

  tags = var.tags
}

resource "aws_ssm_parameter" "dynamodb_region" {
  name        = "${var.parameter_prefix}/dynamodb/region"
  description = "AWS region for DynamoDB"
  type        = "String"
  value       = var.aws_region

  tags = var.tags
}

# Entra ID Configuration Parameters
resource "aws_ssm_parameter" "entra_id_tenant_id" {
  name        = "${var.parameter_prefix}/entra-id/tenant-id"
  description = "Microsoft Entra ID tenant ID"
  type        = "String"
  value       = var.entra_id_tenant_id

  tags = var.tags
}

resource "aws_ssm_parameter" "entra_id_client_id" {
  name        = "${var.parameter_prefix}/entra-id/client-id"
  description = "Microsoft Entra ID application client ID"
  type        = "String"
  value       = var.entra_id_client_id

  tags = var.tags
}

resource "aws_ssm_parameter" "entra_id_issuer_url" {
  name        = "${var.parameter_prefix}/entra-id/issuer-url"
  description = "Entra ID OIDC issuer URL"
  type        = "String"
  value       = var.entra_id_issuer_url

  tags = var.tags
}

# Demo Mode Configuration
resource "aws_ssm_parameter" "demo_mode_enabled" {
  name        = "${var.parameter_prefix}/demo-mode/enabled"
  description = "Enable demo mode for hackathon judges"
  type        = "String"
  value       = tostring(var.enable_demo_mode)

  tags = var.tags
}

# Logging Configuration
resource "aws_ssm_parameter" "log_level" {
  name        = "${var.parameter_prefix}/logging/level"
  description = "Application log level"
  type        = "String"
  value       = var.log_level

  tags = var.tags
}

# Example Secure Parameter (for sensitive data)
# Uncomment and use for secrets like API keys, tokens, etc.
# resource "aws_ssm_parameter" "example_secret" {
#   name        = "${var.parameter_prefix}/secrets/example"
#   description = "Example secure parameter"
#   type        = "SecureString"
#   value       = var.example_secret
#   key_id      = var.kms_key_id  # Optional: use custom KMS key
#
#   tags = var.tags
# }
