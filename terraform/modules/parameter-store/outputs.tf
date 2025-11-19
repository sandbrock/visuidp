# Parameter Store Module Outputs

output "parameter_prefix" {
  description = "Prefix used for all parameters"
  value       = var.parameter_prefix
}

output "parameter_names" {
  description = "List of all parameter names created"
  value = [
    aws_ssm_parameter.admin_group.name,
    aws_ssm_parameter.api_key_default_expiration_days.name,
    aws_ssm_parameter.api_key_rotation_grace_period_hours.name,
    aws_ssm_parameter.api_key_max_keys_per_user.name,
    aws_ssm_parameter.api_key_bcrypt_cost_factor.name,
    aws_ssm_parameter.api_key_length.name,
    aws_ssm_parameter.dynamodb_table_name.name,
    aws_ssm_parameter.dynamodb_region.name,
    aws_ssm_parameter.entra_id_tenant_id.name,
    aws_ssm_parameter.entra_id_client_id.name,
    aws_ssm_parameter.entra_id_issuer_url.name,
    aws_ssm_parameter.demo_mode_enabled.name,
    aws_ssm_parameter.log_level.name,
  ]
}

output "parameter_arns" {
  description = "Map of parameter names to ARNs"
  value = {
    admin_group                         = aws_ssm_parameter.admin_group.arn
    api_key_default_expiration_days     = aws_ssm_parameter.api_key_default_expiration_days.arn
    api_key_rotation_grace_period_hours = aws_ssm_parameter.api_key_rotation_grace_period_hours.arn
    api_key_max_keys_per_user           = aws_ssm_parameter.api_key_max_keys_per_user.arn
    api_key_bcrypt_cost_factor          = aws_ssm_parameter.api_key_bcrypt_cost_factor.arn
    api_key_length                      = aws_ssm_parameter.api_key_length.arn
    dynamodb_table_name                 = aws_ssm_parameter.dynamodb_table_name.arn
    dynamodb_region                     = aws_ssm_parameter.dynamodb_region.arn
    entra_id_tenant_id                  = aws_ssm_parameter.entra_id_tenant_id.arn
    entra_id_client_id                  = aws_ssm_parameter.entra_id_client_id.arn
    entra_id_issuer_url                 = aws_ssm_parameter.entra_id_issuer_url.arn
    demo_mode_enabled                   = aws_ssm_parameter.demo_mode_enabled.arn
    log_level                           = aws_ssm_parameter.log_level.arn
  }
}
