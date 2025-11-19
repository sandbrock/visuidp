# Cost Management Module
# Implements billing alarms, budgets, and cost optimization monitoring

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# SNS Topic for Cost Alerts
resource "aws_sns_topic" "cost_alerts" {
  name = "visuidp-cost-alerts-${var.environment}"

  tags = {
    Name        = "visuidp-cost-alerts-${var.environment}"
    Environment = var.environment
    Purpose     = "Cost monitoring and alerts"
  }
}

# SNS Topic Subscription
resource "aws_sns_topic_subscription" "cost_alerts_email" {
  count     = length(var.alert_email_addresses)
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_addresses[count.index]
}

# Monthly Budget
resource "aws_budgets_budget" "monthly" {
  name              = "visuidp-monthly-budget-${var.environment}"
  budget_type       = "COST"
  limit_amount      = var.monthly_budget_limit
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2024-01-01_00:00"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$VisuIDP",
      "Environment$${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_email_addresses
  }
}

# Daily Budget (for tighter control in production)
resource "aws_budgets_budget" "daily" {
  count             = var.environment == "prod" ? 1 : 0
  name              = "visuidp-daily-budget-${var.environment}"
  budget_type       = "COST"
  limit_amount      = var.daily_budget_limit
  limit_unit        = "USD"
  time_unit         = "DAILY"
  time_period_start = "2024-01-01_00:00"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Project$VisuIDP",
      "Environment$${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_email_addresses
  }
}

# Billing Alarm - Total Estimated Charges
resource "aws_cloudwatch_metric_alarm" "estimated_charges" {
  alarm_name          = "visuidp-estimated-charges-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600 # 6 hours
  statistic           = "Maximum"
  threshold           = var.billing_alarm_threshold
  alarm_description   = "Alert when estimated charges exceed ${var.billing_alarm_threshold} USD"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency = "USD"
  }

  tags = {
    Name        = "visuidp-estimated-charges-${var.environment}"
    Environment = var.environment
  }
}

# Lambda Cost Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_cost" {
  count               = var.enable_service_cost_alarms ? 1 : 0
  alarm_name          = "visuidp-lambda-cost-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.lambda_cost_threshold
  alarm_description   = "Alert when Lambda costs exceed ${var.lambda_cost_threshold} USD"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "AWS Lambda"
  }

  tags = {
    Name        = "visuidp-lambda-cost-${var.environment}"
    Environment = var.environment
  }
}

# DynamoDB Cost Alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_cost" {
  count               = var.enable_service_cost_alarms ? 1 : 0
  alarm_name          = "visuidp-dynamodb-cost-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.dynamodb_cost_threshold
  alarm_description   = "Alert when DynamoDB costs exceed ${var.dynamodb_cost_threshold} USD"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "Amazon DynamoDB"
  }

  tags = {
    Name        = "visuidp-dynamodb-cost-${var.environment}"
    Environment = var.environment
  }
}

# CloudFront Cost Alarm
resource "aws_cloudwatch_metric_alarm" "cloudfront_cost" {
  count               = var.enable_service_cost_alarms ? 1 : 0
  alarm_name          = "visuidp-cloudfront-cost-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = var.cloudfront_cost_threshold
  alarm_description   = "Alert when CloudFront costs exceed ${var.cloudfront_cost_threshold} USD"
  alarm_actions       = [aws_sns_topic.cost_alerts.arn]

  dimensions = {
    Currency    = "USD"
    ServiceName = "Amazon CloudFront"
  }

  tags = {
    Name        = "visuidp-cloudfront-cost-${var.environment}"
    Environment = var.environment
  }
}

# Cost Anomaly Detection (if enabled)
resource "aws_ce_anomaly_monitor" "visuidp" {
  count             = var.enable_anomaly_detection ? 1 : 0
  name              = "visuidp-anomaly-monitor-${var.environment}"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"

  tags = {
    Name        = "visuidp-anomaly-monitor-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ce_anomaly_subscription" "visuidp" {
  count     = var.enable_anomaly_detection ? 1 : 0
  name      = "visuidp-anomaly-subscription-${var.environment}"
  frequency = "DAILY"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.visuidp[0].arn
  ]

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = [tostring(var.anomaly_threshold)]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  tags = {
    Name        = "visuidp-anomaly-subscription-${var.environment}"
    Environment = var.environment
  }
}
