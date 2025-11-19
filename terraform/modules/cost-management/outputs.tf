# Cost Management Module Outputs

output "cost_alerts_topic_arn" {
  description = "ARN of the SNS topic for cost alerts"
  value       = aws_sns_topic.cost_alerts.arn
}

output "monthly_budget_name" {
  description = "Name of the monthly budget"
  value       = aws_budgets_budget.monthly.name
}

output "billing_alarm_name" {
  description = "Name of the billing alarm"
  value       = aws_cloudwatch_metric_alarm.estimated_charges.alarm_name
}

output "anomaly_monitor_arn" {
  description = "ARN of the cost anomaly monitor"
  value       = var.enable_anomaly_detection ? aws_ce_anomaly_monitor.visuidp[0].arn : null
}
