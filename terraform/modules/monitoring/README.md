# Monitoring Module

This module implements cost-optimized CloudWatch monitoring for the VisuIDP AWS deployment, staying within AWS Free Tier limits while providing comprehensive observability.

## Features

### Cost Optimization
- **Maximum 10 alarms** (Free Tier limit) for critical issues only
- **Maximum 3 dashboards** (Free Tier limit) covering all key metrics
- **Uses only free AWS service metrics** (no custom metrics)
- **3-7 day log retention** to minimize CloudWatch Logs costs
- **Error-level logging only** to reduce ingestion costs

### Dashboards

#### 1. API Overview Dashboard
Monitors API and Lambda function health:
- Lambda API metrics (invocations, errors, duration, concurrent executions)
- Lambda CLI metrics (invocations, errors, duration, throttles)
- API Gateway metrics (requests, 4XX/5XX errors, latency)
- Calculated error rates for Lambda and API Gateway

#### 2. Database and Storage Dashboard
Monitors DynamoDB and S3:
- DynamoDB capacity consumption (read/write units)
- DynamoDB errors and throttling
- DynamoDB latency (average and P99)
- S3 storage metrics (object count, bucket size)

#### 3. Cost and Performance Dashboard
Tracks cost drivers and performance:
- Lambda invocations (hourly)
- Lambda duration (hourly)
- API Gateway requests (hourly)
- DynamoDB capacity units (hourly)
- CloudWatch Logs ingestion (hourly)

### Alarms

#### Individual Alarms (8 total)

1. **Lambda API Error Rate** - Triggers when error rate exceeds 1%
   - Validates: Requirement 9.5
   - Threshold: >1% error rate
   - Evaluation: 2 periods of 5 minutes

2. **Lambda CLI Error Rate** - Triggers when error rate exceeds 1%
   - Threshold: >1% error rate
   - Evaluation: 2 periods of 5 minutes

3. **API Gateway 5XX Error Rate** - Triggers when 5XX error rate exceeds 0.5%
   - Validates: Requirement 9.5
   - Threshold: >0.5% error rate
   - Evaluation: 2 periods of 5 minutes

4. **DynamoDB Throttling** - Triggers on throttling events
   - Validates: Requirement 9.5
   - Threshold: >10 throttling events
   - Evaluation: 1 period of 5 minutes

5. **Lambda API Concurrent Executions** - Triggers when approaching limit
   - Threshold: >800 concurrent executions (80% of 1000 limit)
   - Evaluation: 1 period of 1 minute

6. **Lambda API Throttles** - Triggers on Lambda throttling
   - Threshold: >5 throttling events
   - Evaluation: 1 period of 5 minutes

7. **Lambda CLI Throttles** - Triggers on Lambda throttling
   - Threshold: >5 throttling events
   - Evaluation: 1 period of 5 minutes

8. **DynamoDB System Errors** - Triggers on DynamoDB system errors
   - Threshold: >5 system errors
   - Evaluation: 1 period of 5 minutes

#### Composite Alarms (2 total)

9. **Critical API Health** - Combines Lambda and API Gateway errors
   - Triggers when BOTH Lambda API error rate AND API Gateway 5XX error rate are in ALARM
   - Indicates severe API health issue requiring immediate attention

10. **Database Performance Degradation** - Combines DynamoDB issues
    - Triggers when EITHER DynamoDB throttling OR system errors are in ALARM
    - Indicates database performance issues

**Total: 10 alarms (within Free Tier limit)**

### SNS Notifications

All alarms send notifications to an SNS topic, which can be subscribed to via:
- Email
- SMS
- Lambda function
- SQS queue
- HTTP/HTTPS endpoint

## Usage

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix = "visuidp-dev"
  environment = "dev"

  # Resources to monitor
  lambda_api_function_name = module.lambda_api.function_name
  lambda_cli_function_name = module.lambda_cli.function_name
  api_gateway_id           = module.api_gateway.api_id
  dynamodb_table_name      = module.dynamodb.table_name

  # CloudWatch configuration
  log_retention_days       = 3  # 3 days for dev, 7 for prod
  enable_cloudwatch_alarms = true
  alarm_email              = "ops-team@example.com"

  tags = {
    Project     = "VisuIDP"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name_prefix | Prefix for resource names | string | - | yes |
| environment | Environment name | string | - | yes |
| lambda_api_function_name | Name of the API Lambda function | string | - | yes |
| lambda_cli_function_name | Name of the CLI Lambda function | string | - | yes |
| api_gateway_id | ID of the API Gateway | string | - | yes |
| dynamodb_table_name | Name of the DynamoDB table | string | - | yes |
| log_retention_days | CloudWatch log retention in days | number | 3 | no |
| enable_cloudwatch_alarms | Enable CloudWatch alarms | bool | true | no |
| alarm_email | Email address for alarm notifications | string | "" | no |
| tags | Tags to apply to resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| dashboard_api_overview_name | Name of the API overview dashboard |
| dashboard_database_storage_name | Name of the database and storage dashboard |
| dashboard_cost_performance_name | Name of the cost and performance dashboard |
| sns_topic_arn | ARN of the SNS topic for alarms |
| alarm_names | List of all CloudWatch alarm names |
| composite_alarm_names | List of composite CloudWatch alarm names |

## Cost Breakdown

### Free Tier Limits
- **Dashboards**: First 3 dashboards free (we use exactly 3)
- **Alarms**: First 10 alarms free (we use exactly 10)
- **Metrics**: All AWS service metrics are free
- **API Requests**: 1 million GetMetricStatistics requests free per month

### Expected Monthly Cost
- **Dashboards**: $0 (within Free Tier)
- **Alarms**: $0 (within Free Tier)
- **Metrics**: $0 (using only free service metrics)
- **Total**: $0/month 🎉

## Alarm Thresholds

Thresholds are configured based on requirements and best practices:

- **Error Rate**: 1% for Lambda, 0.5% for API Gateway (per Requirement 9.5)
- **Throttling**: 10 events for DynamoDB, 5 events for Lambda
- **Concurrent Executions**: 800 (80% of 1000 default limit)
- **System Errors**: 5 events for DynamoDB

These thresholds can be adjusted via variables if needed.

## Monitoring Best Practices

### Dashboard Usage
1. **API Overview**: Check first for API health and error rates
2. **Database Storage**: Monitor for throttling and capacity issues
3. **Cost Performance**: Track cost drivers and optimize accordingly

### Alarm Response
1. **Critical API Health**: Immediate investigation required - both Lambda and API Gateway failing
2. **Database Performance**: Check DynamoDB capacity and query patterns
3. **Error Rate Alarms**: Review CloudWatch Logs for error details
4. **Throttling Alarms**: Consider increasing capacity or optimizing code

### Log Analysis
Use CloudWatch Logs Insights to query logs:
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## Requirements Validation

This module validates the following requirements:

- **Requirement 9.5**: CloudWatch alarms for critical issues (Lambda errors, API Gateway 5xx, DynamoDB throttling)
- **Requirement 12.4**: Cost-optimized monitoring (Free Tier limits, error-level logging, 3-7 day retention)

## Related Documentation

- [CloudWatch Alarms Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [CloudWatch Dashboards Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)
- [Composite Alarms Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html)
- [AWS Free Tier](https://aws.amazon.com/free/)
