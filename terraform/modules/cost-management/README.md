# Cost Management Module

This module implements comprehensive cost monitoring and alerting for the VisuIDP AWS deployment.

## Features

- **Monthly Budgets**: Track spending against monthly limits with alerts at 80%, 90%, and 100%
- **Daily Budgets**: Production-only daily spending limits for tighter control
- **Billing Alarms**: CloudWatch alarms for total estimated charges
- **Service-Specific Alarms**: Optional per-service cost alarms (Lambda, DynamoDB, CloudFront)
- **Cost Anomaly Detection**: Optional AWS Cost Anomaly Detection for unusual spending patterns
- **SNS Notifications**: Email alerts for all cost-related events

## Usage

```hcl
module "cost_management" {
  source = "./modules/cost-management"

  environment            = var.environment
  alert_email_addresses  = ["ops@example.com", "finance@example.com"]
  
  # Budget limits
  monthly_budget_limit   = 50
  daily_budget_limit     = 5
  
  # Alarm thresholds
  billing_alarm_threshold    = 40
  lambda_cost_threshold      = 15
  dynamodb_cost_threshold    = 10
  cloudfront_cost_threshold  = 10
  
  # Optional features
  enable_service_cost_alarms = true
  enable_anomaly_detection   = false
  anomaly_threshold          = 10
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| environment | Environment name | string | - | yes |
| alert_email_addresses | Email addresses for alerts | list(string) | - | yes |
| monthly_budget_limit | Monthly budget in USD | number | 50 | no |
| daily_budget_limit | Daily budget in USD | number | 5 | no |
| billing_alarm_threshold | Total charges threshold | number | 40 | no |
| enable_service_cost_alarms | Enable per-service alarms | bool | true | no |
| lambda_cost_threshold | Lambda cost threshold | number | 15 | no |
| dynamodb_cost_threshold | DynamoDB cost threshold | number | 10 | no |
| cloudfront_cost_threshold | CloudFront cost threshold | number | 10 | no |
| enable_anomaly_detection | Enable anomaly detection | bool | false | no |
| anomaly_threshold | Anomaly threshold in USD | number | 10 | no |

## Outputs

| Name | Description |
|------|-------------|
| cost_alerts_topic_arn | ARN of SNS topic for cost alerts |
| monthly_budget_name | Name of monthly budget |
| billing_alarm_name | Name of billing alarm |
| anomaly_monitor_arn | ARN of cost anomaly monitor |

## Cost Optimization

This module itself has minimal cost:
- **AWS Budgets**: First 2 budgets free, $0.02/day per additional budget
- **CloudWatch Alarms**: First 10 alarms free (within Free Tier)
- **SNS**: First 1,000 email notifications free per month
- **Cost Anomaly Detection**: Free service

Total cost: **$0-2/month** depending on configuration

## Alerts

### Budget Alerts
- **80% threshold**: Warning that spending is approaching limit
- **90% forecasted**: Warning that spending is projected to exceed limit
- **100% threshold**: Critical alert that spending has exceeded limit

### Billing Alarms
- Triggered when estimated charges exceed configured threshold
- Evaluated every 6 hours
- Uses AWS Billing metrics

### Service-Specific Alarms
- Optional per-service cost monitoring
- Helps identify which service is driving costs
- Can be disabled to stay within Free Tier alarm limits

### Anomaly Detection
- Detects unusual spending patterns
- Daily notifications
- Configurable threshold for alert sensitivity

## Best Practices

1. **Start Conservative**: Begin with lower thresholds and adjust based on actual usage
2. **Multiple Recipients**: Add both technical and financial stakeholders to alerts
3. **Environment-Specific**: Use different thresholds for dev/staging/prod
4. **Regular Review**: Review and adjust thresholds monthly
5. **Confirm Subscriptions**: Recipients must confirm SNS email subscriptions

## Troubleshooting

### No Alerts Received
- Check SNS subscription confirmation (check spam folder)
- Verify email addresses are correct
- Check CloudWatch alarm state in AWS Console

### False Positives
- Adjust thresholds based on actual usage patterns
- Consider using forecasted alerts instead of actual
- Review cost trends in AWS Cost Explorer

### Missing Billing Metrics
- Billing metrics are only available in us-east-1 region
- Ensure billing alerts are enabled in AWS account settings
- Wait up to 24 hours for first data points

## Related Documentation

- [Cost Optimization Guide](../../../terraform/COST_OPTIMIZATION.md)
- [Monitoring Setup](../../../terraform/MONITORING_SETUP.md)
- [Runbooks](../../../terraform/RUNBOOKS.md)
