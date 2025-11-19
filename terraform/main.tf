# Main Terraform Configuration for VisuIDP AWS Deployment

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.additional_tags
  )
}

# DynamoDB Single Table Module
module "dynamodb" {
  source = "./modules/dynamodb"

  table_name                    = "${local.name_prefix}-data"
  billing_mode                  = var.dynamodb_billing_mode
  enable_point_in_time_recovery = var.enable_point_in_time_recovery
  environment                   = var.environment
  tags                          = local.common_tags
}

# Parameter Store Module
module "parameter_store" {
  source = "./modules/parameter-store"

  parameter_prefix = "/${var.project_name}/${var.environment}"
  aws_region       = var.aws_region
  environment      = var.environment

  # Application configuration
  admin_group = var.admin_group
  log_level   = var.environment == "prod" ? "ERROR" : "INFO"

  # API Key configuration
  api_key_default_expiration_days     = var.api_key_default_expiration_days
  api_key_rotation_grace_period_hours = var.api_key_rotation_grace_period_hours
  api_key_max_keys_per_user           = var.api_key_max_keys_per_user
  api_key_bcrypt_cost_factor          = var.api_key_bcrypt_cost_factor
  api_key_length                      = var.api_key_length

  # DynamoDB configuration
  dynamodb_table_name = module.dynamodb.table_name

  # Entra ID configuration
  entra_id_tenant_id  = var.entra_id_tenant_id
  entra_id_client_id  = var.entra_id_client_id
  entra_id_issuer_url = var.entra_id_issuer_url != "" ? var.entra_id_issuer_url : "https://login.microsoftonline.com/${var.entra_id_tenant_id}/v2.0"

  # Demo mode
  enable_demo_mode = var.enable_demo_mode

  tags = local.common_tags
}

# Lambda Function for API Module
module "lambda_api" {
  source = "./modules/lambda"

  function_name = "${local.name_prefix}-api"
  function_type = "api"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  architecture  = var.lambda_architecture
  environment   = var.environment

  # DynamoDB configuration
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  # CloudWatch logging configuration
  log_retention_days = var.log_retention_days

  # Rollback configuration
  enable_versioning = var.enable_lambda_versioning
  alias_name        = var.lambda_alias_name

  # Environment variables
  environment_variables = {
    DYNAMODB_TABLE_NAME    = module.dynamodb.table_name
    AWS_REGION             = var.aws_region
    PARAMETER_STORE_PREFIX = "/${var.project_name}/${var.environment}"
    QUARKUS_PROFILE        = "lambda"
    LOG_LEVEL              = var.environment == "prod" ? "ERROR" : "ERROR"
    DEMO_MODE              = var.enable_demo_mode ? "true" : "false"
  }

  tags = local.common_tags
}

# Lambda Function for CLI Module
module "lambda_cli" {
  source = "./modules/lambda"

  function_name = "${local.name_prefix}-cli"
  function_type = "cli"
  memory_size   = 512
  timeout       = var.cli_lambda_timeout
  architecture  = var.lambda_architecture
  environment   = var.environment

  # DynamoDB configuration (CLI may need to read data)
  dynamodb_table_name = module.dynamodb.table_name
  dynamodb_table_arn  = module.dynamodb.table_arn

  # CloudWatch logging configuration
  log_retention_days = var.log_retention_days

  # Rollback configuration
  enable_versioning = var.enable_lambda_versioning
  alias_name        = var.lambda_alias_name

  # Environment variables
  environment_variables = {
    AWS_REGION       = var.aws_region
    TEMPLATES_BUCKET = module.frontend.templates_bucket_name
    OUTPUTS_BUCKET   = module.frontend.outputs_bucket_name
    LOG_LEVEL        = var.environment == "prod" ? "ERROR" : "ERROR"
  }

  tags = local.common_tags
}

# API Gateway HTTP API Module
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name    = "${local.name_prefix}-api"
  environment = var.environment

  # Lambda integration
  lambda_function_arn        = module.lambda_api.function_arn
  lambda_function_invoke_arn = module.lambda_api.function_invoke_arn

  # Entra ID JWT authorizer configuration
  entra_id_tenant_id  = var.entra_id_tenant_id
  entra_id_client_id  = var.entra_id_client_id
  entra_id_issuer_url = var.entra_id_issuer_url != "" ? var.entra_id_issuer_url : "https://login.microsoftonline.com/${var.entra_id_tenant_id}/v2.0"

  # CORS configuration - allow all origins or custom domain
  # CloudFront domain will be configured separately after deployment
  cors_allowed_origins = var.domain_name != "" ? [
    "https://${var.domain_name}"
  ] : ["*"]

  # Custom domain configuration
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn

  # Demo mode
  enable_demo_mode = var.enable_demo_mode

  tags = local.common_tags
}

# CLI Gateway Module (API Gateway routes for CLI Lambda)
module "cli_gateway" {
  source = "./modules/cli-gateway"

  # API Gateway configuration
  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.execution_arn
  jwt_authorizer_id         = module.api_gateway.jwt_authorizer_id

  # CLI Lambda configuration
  cli_lambda_arn        = module.lambda_cli.function_arn
  cli_lambda_invoke_arn = module.lambda_cli.function_invoke_arn
  cli_lambda_role_name  = module.lambda_cli.role_name

  # S3 buckets (from frontend module)
  bucket_prefix        = local.name_prefix
  templates_bucket_arn = module.frontend.templates_bucket_arn
  outputs_bucket_arn   = module.frontend.outputs_bucket_arn

  # Demo mode
  enable_demo_mode = var.enable_demo_mode

  tags = local.common_tags
}

# Frontend (S3 + CloudFront) Module
module "frontend" {
  source = "./modules/frontend"

  bucket_prefix = local.name_prefix
  environment   = var.environment

  # API Gateway origin for CloudFront
  api_gateway_domain = module.api_gateway.api_domain

  # Custom domain configuration
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn

  tags = local.common_tags
}

# Monitoring (CloudWatch) Module
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix = local.name_prefix
  environment = var.environment

  # Resources to monitor
  lambda_api_function_name = module.lambda_api.function_name
  lambda_cli_function_name = module.lambda_cli.function_name
  api_gateway_id           = module.api_gateway.api_id
  dynamodb_table_name      = module.dynamodb.table_name

  # CloudWatch configuration
  log_retention_days       = var.log_retention_days
  enable_cloudwatch_alarms = var.enable_cloudwatch_alarms
  alarm_email              = var.alarm_email

  tags = local.common_tags
}
