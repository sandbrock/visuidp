# Monitoring (CloudWatch) Module
# Cost-Optimized: Maximum 10 alarms (Free Tier), 3 dashboards (Free Tier)
# Uses only free AWS service metrics (no custom metrics)

# SNS topic for alarms
resource "aws_sns_topic" "alarms" {
  count = var.enable_cloudwatch_alarms ? 1 : 0
  name  = "${var.name_prefix}-alarms"

  tags = var.tags
}

# SNS topic subscription
resource "aws_sns_topic_subscription" "alarms_email" {
  count     = var.enable_cloudwatch_alarms && var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ============================================================================
# DASHBOARDS (Maximum 3 for Free Tier)
# ============================================================================

# Dashboard 1: API and Lambda Overview
resource "aws_cloudwatch_dashboard" "api_overview" {
  dashboard_name = "${var.name_prefix}-api-overview"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda API metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "API Invocations", id = "m1" }],
            [".", "Errors", { stat = "Sum", label = "API Errors", id = "m2" }],
            [".", "Duration", { stat = "Average", label = "API Duration (avg)", id = "m3" }],
            [".", "ConcurrentExecutions", { stat = "Maximum", label = "API Concurrent", id = "m4" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda API Metrics"
          yAxis = {
            left = {
              label = "Count / ms"
            }
          }
        }
      },
      # Lambda CLI metrics
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "CLI Invocations" }],
            [".", "Errors", { stat = "Sum", label = "CLI Errors" }],
            [".", "Duration", { stat = "Average", label = "CLI Duration (avg)" }],
            [".", "Throttles", { stat = "Sum", label = "CLI Throttles" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda CLI Metrics"
          yAxis = {
            left = {
              label = "Count / ms"
            }
          }
        }
      },
      # API Gateway metrics
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "Requests" }],
            [".", "4XXError", { stat = "Sum", label = "4XX Errors" }],
            [".", "5XXError", { stat = "Sum", label = "5XX Errors" }],
            [".", "Latency", { stat = "Average", label = "Latency (avg)" }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "API Gateway Metrics"
          yAxis = {
            left = {
              label = "Count / ms"
            }
          }
        }
      },
      # Error rate calculation
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            [{ expression = "(m2/m1)*100", label = "Lambda Error Rate %", id = "e1" }],
            [{ expression = "(m4/m3)*100", label = "API Gateway 5XX Rate %", id = "e2" }],
            ["AWS/Lambda", "Errors", { stat = "Sum", id = "m2", visible = false }],
            [".", "Invocations", { stat = "Sum", id = "m1", visible = false }],
            ["AWS/ApiGateway", "5XXError", { stat = "Sum", id = "m4", visible = false }],
            [".", "Count", { stat = "Sum", id = "m3", visible = false }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Error Rates"
          yAxis = {
            left = {
              label = "Percentage"
              min   = 0
            }
          }
        }
      }
    ]
  })
}

# Dashboard 2: Database and Storage
resource "aws_cloudwatch_dashboard" "database_storage" {
  dashboard_name = "${var.name_prefix}-database-storage"

  dashboard_body = jsonencode({
    widgets = [
      # DynamoDB read/write metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum", label = "Read Capacity" }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "Write Capacity" }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Capacity Consumption"
          yAxis = {
            left = {
              label = "Units"
            }
          }
        }
      },
      # DynamoDB errors and throttling
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DynamoDB", "UserErrors", { stat = "Sum", label = "User Errors (Throttling)" }],
            [".", "SystemErrors", { stat = "Sum", label = "System Errors" }],
            [".", "ConditionalCheckFailedRequests", { stat = "Sum", label = "Conditional Check Failures" }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Errors"
          yAxis = {
            left = {
              label = "Count"
            }
          }
        }
      },
      # DynamoDB latency
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DynamoDB", "SuccessfulRequestLatency", { stat = "Average", label = "Avg Latency" }],
            ["...", { stat = "p99", label = "P99 Latency" }]
          ]
          period = 300
          region = data.aws_region.current.name
          title  = "DynamoDB Latency"
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      # S3 metrics (if available)
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/S3", "NumberOfObjects", { stat = "Average", label = "Object Count" }],
            [".", "BucketSizeBytes", { stat = "Average", label = "Bucket Size" }]
          ]
          period = 86400
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "S3 Storage Metrics"
          yAxis = {
            left = {
              label = "Count / Bytes"
            }
          }
        }
      }
    ]
  })
}

# Dashboard 3: Cost and Performance Overview
resource "aws_cloudwatch_dashboard" "cost_performance" {
  dashboard_name = "${var.name_prefix}-cost-performance"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda invocations (cost driver)
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = "Total Invocations" }]
          ]
          period = 3600
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Lambda Invocations (Hourly)"
          yAxis = {
            left = {
              label = "Count"
            }
          }
        }
      },
      # Lambda duration (cost driver)
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", { stat = "Average", label = "Avg Duration" }],
            ["...", { stat = "Maximum", label = "Max Duration" }]
          ]
          period = 3600
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda Duration (Hourly)"
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      # API Gateway requests (cost driver)
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "Total Requests" }]
          ]
          period = 3600
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "API Gateway Requests (Hourly)"
          yAxis = {
            left = {
              label = "Count"
            }
          }
        }
      },
      # DynamoDB read/write units (cost driver)
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum", label = "Read Units" }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum", label = "Write Units" }]
          ]
          period = 3600
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Capacity Units (Hourly)"
          yAxis = {
            left = {
              label = "Units"
            }
          }
        }
      },
      # CloudWatch logs ingestion (cost driver)
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Logs", "IncomingBytes", { stat = "Sum", label = "Log Ingestion" }],
            [".", "IncomingLogEvents", { stat = "Sum", label = "Log Events" }]
          ]
          period = 3600
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "CloudWatch Logs Ingestion (Hourly)"
          yAxis = {
            left = {
              label = "Bytes / Count"
            }
          }
        }
      }
    ]
  })
}

# ============================================================================
# ALARMS (Maximum 10 for Free Tier - Critical Issues Only)
# ============================================================================

# Alarm 1: Lambda API error rate (>1% as per requirements)
resource "aws_cloudwatch_metric_alarm" "lambda_api_error_rate" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-lambda-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1.0
  alarm_description   = "Lambda API error rate exceeded 1% threshold (Requirement 9.5)"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_api_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_api_function_name
      }
    }
  }

  tags = var.tags
}

# Alarm 2: Lambda CLI error rate (>1%)
resource "aws_cloudwatch_metric_alarm" "lambda_cli_error_rate" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-lambda-cli-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1.0
  alarm_description   = "Lambda CLI error rate exceeded 1% threshold"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_cli_function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = var.lambda_cli_function_name
      }
    }
  }

  tags = var.tags
}

# Alarm 3: API Gateway 5XX error rate (>0.5% as per requirements)
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_rate" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-api-gateway-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 0.5
  alarm_description   = "API Gateway 5XX error rate exceeded 0.5% threshold (Requirement 9.5)"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / requests) * 100"
    label       = "5XX Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "5XXError"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "Count"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  tags = var.tags
}

# Alarm 4: DynamoDB throttling events
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "DynamoDB throttling events exceeded threshold (Requirement 9.5)"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = var.tags
}

# Alarm 5: Lambda API concurrent executions (>80% of limit)
resource "aws_cloudwatch_metric_alarm" "lambda_api_concurrent" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-lambda-api-concurrent"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Maximum"
  threshold           = 800 # 80% of default 1000 limit
  alarm_description   = "Lambda API concurrent executions approaching limit"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_api_function_name
  }

  tags = var.tags
}

# Alarm 6: Lambda API throttles
resource "aws_cloudwatch_metric_alarm" "lambda_api_throttles" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-lambda-api-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda API throttling events detected"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_api_function_name
  }

  tags = var.tags
}

# Alarm 7: Lambda CLI throttles
resource "aws_cloudwatch_metric_alarm" "lambda_cli_throttles" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-lambda-cli-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda CLI throttling events detected"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.lambda_cli_function_name
  }

  tags = var.tags
}

# Alarm 8: DynamoDB system errors
resource "aws_cloudwatch_metric_alarm" "dynamodb_system_errors" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${var.name_prefix}-dynamodb-system-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB system errors detected"
  alarm_actions       = [aws_sns_topic.alarms[0].arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = var.tags
}

# ============================================================================
# COMPOSITE ALARMS (Combine multiple conditions)
# ============================================================================

# Composite Alarm 1: Critical API Health (combines Lambda and API Gateway errors)
resource "aws_cloudwatch_composite_alarm" "critical_api_health" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name        = "${var.name_prefix}-critical-api-health"
  alarm_description = "Critical API health issue - both Lambda and API Gateway experiencing errors"
  actions_enabled   = true
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  # Trigger if BOTH Lambda API errors AND API Gateway 5XX errors are in ALARM state
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.lambda_api_error_rate[0].alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.api_gateway_5xx_rate[0].alarm_name})"

  tags = var.tags
}

# Composite Alarm 2: Database Performance Degradation (combines throttling and system errors)
resource "aws_cloudwatch_composite_alarm" "database_performance" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name        = "${var.name_prefix}-database-performance"
  alarm_description = "Database performance degradation - throttling or system errors detected"
  actions_enabled   = true
  alarm_actions     = [aws_sns_topic.alarms[0].arn]
  ok_actions        = [aws_sns_topic.alarms[0].arn]

  # Trigger if EITHER DynamoDB throttling OR system errors are in ALARM state
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.dynamodb_throttles[0].alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.dynamodb_system_errors[0].alarm_name})"

  tags = var.tags
}

# Total Alarms: 8 individual + 2 composite = 10 alarms (within Free Tier limit)

# Data source for current region
data "aws_region" "current" {}
