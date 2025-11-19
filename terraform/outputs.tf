# Output Values for VisuIDP AWS Deployment

# DynamoDB Outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = module.dynamodb.table_name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = module.dynamodb.table_arn
}

# Lambda Outputs
output "lambda_api_function_name" {
  description = "Name of the API Lambda function"
  value       = module.lambda_api.function_name
}

output "lambda_api_function_arn" {
  description = "ARN of the API Lambda function"
  value       = module.lambda_api.function_arn
}

output "lambda_cli_function_name" {
  description = "Name of the CLI Lambda function"
  value       = module.lambda_cli.function_name
}

output "lambda_cli_function_arn" {
  description = "ARN of the CLI Lambda function"
  value       = module.lambda_cli.function_arn
}

# API Gateway Outputs
output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = module.api_gateway.api_url
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = module.api_gateway.api_id
}

# CLI Gateway Outputs
output "cli_generate_endpoint" {
  description = "CLI generate endpoint"
  value       = "${module.api_gateway.api_url}cli/generate"
}

output "cli_list_variables_endpoint" {
  description = "CLI list-variables endpoint"
  value       = "${module.api_gateway.api_url}cli/list-variables"
}

output "templates_bucket_name" {
  description = "Name of the S3 bucket for CLI templates"
  value       = module.frontend.templates_bucket_name
}

output "outputs_bucket_name" {
  description = "Name of the S3 bucket for CLI outputs"
  value       = module.frontend.outputs_bucket_name
}

# Frontend Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket for UI assets"
  value       = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.frontend.cloudfront_domain_name
}

output "application_url" {
  description = "URL to access the application"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${module.frontend.cloudfront_domain_name}"
}

# Monitoring Outputs
output "cloudwatch_dashboard_api_overview" {
  description = "Name of the API overview CloudWatch dashboard"
  value       = module.monitoring.dashboard_api_overview_name
}

output "cloudwatch_dashboard_database_storage" {
  description = "Name of the database and storage CloudWatch dashboard"
  value       = module.monitoring.dashboard_database_storage_name
}

output "cloudwatch_dashboard_cost_performance" {
  description = "Name of the cost and performance CloudWatch dashboard"
  value       = module.monitoring.dashboard_cost_performance_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = module.monitoring.sns_topic_arn
}

output "cloudwatch_alarm_names" {
  description = "List of all CloudWatch alarm names"
  value       = module.monitoring.alarm_names
}

output "cloudwatch_composite_alarm_names" {
  description = "List of composite CloudWatch alarm names"
  value       = module.monitoring.composite_alarm_names
}

# Parameter Store Outputs
output "parameter_store_prefix" {
  description = "Prefix for Parameter Store parameters"
  value       = module.parameter_store.parameter_prefix
}

output "parameter_store_names" {
  description = "List of all Parameter Store parameter names"
  value       = module.parameter_store.parameter_names
}

# Cost Management Outputs
output "cost_alerts_topic_arn" {
  description = "ARN of the SNS topic for cost alerts"
  value       = module.cost_management.cost_alerts_topic_arn
}

output "monthly_budget_name" {
  description = "Name of the monthly budget"
  value       = module.cost_management.monthly_budget_name
}

output "billing_alarm_name" {
  description = "Name of the billing alarm"
  value       = module.cost_management.billing_alarm_name
}

output "cost_anomaly_monitor_arn" {
  description = "ARN of the cost anomaly monitor (if enabled)"
  value       = module.cost_management.anomaly_monitor_arn
}

# Environment Information
output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}
