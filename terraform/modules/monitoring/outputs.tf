# Monitoring Module Outputs

output "dashboard_api_overview_name" {
  description = "Name of the API overview CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.api_overview.dashboard_name
}

output "dashboard_database_storage_name" {
  description = "Name of the database and storage CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.database_storage.dashboard_name
}

output "dashboard_cost_performance_name" {
  description = "Name of the cost and performance CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.cost_performance.dashboard_name
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = var.enable_cloudwatch_alarms ? aws_sns_topic.alarms[0].arn : ""
}

output "alarm_names" {
  description = "Names of all CloudWatch alarms"
  value = var.enable_cloudwatch_alarms ? [
    aws_cloudwatch_metric_alarm.lambda_api_error_rate[0].alarm_name,
    aws_cloudwatch_metric_alarm.lambda_cli_error_rate[0].alarm_name,
    aws_cloudwatch_metric_alarm.api_gateway_5xx_rate[0].alarm_name,
    aws_cloudwatch_metric_alarm.dynamodb_throttles[0].alarm_name,
    aws_cloudwatch_metric_alarm.lambda_api_concurrent[0].alarm_name,
    aws_cloudwatch_metric_alarm.lambda_api_throttles[0].alarm_name,
    aws_cloudwatch_metric_alarm.lambda_cli_throttles[0].alarm_name,
    aws_cloudwatch_metric_alarm.dynamodb_system_errors[0].alarm_name,
    aws_cloudwatch_composite_alarm.critical_api_health[0].alarm_name,
    aws_cloudwatch_composite_alarm.database_performance[0].alarm_name
  ] : []
}

output "composite_alarm_names" {
  description = "Names of composite CloudWatch alarms"
  value = var.enable_cloudwatch_alarms ? [
    aws_cloudwatch_composite_alarm.critical_api_health[0].alarm_name,
    aws_cloudwatch_composite_alarm.database_performance[0].alarm_name
  ] : []
}
