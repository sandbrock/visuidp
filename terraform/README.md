# VisuIDP AWS Terraform Infrastructure

## Overview

This directory contains Terraform configuration for deploying VisuIDP to AWS using a cost-effective serverless architecture.

## Architecture

- **Compute**: AWS Lambda (ARM64 with GraalVM native image)
- **Database**: DynamoDB (single-table design with on-demand billing)
- **API**: API Gateway HTTP API with JWT authorizer (Entra ID)
- **Frontend**: S3 + CloudFront
- **Authentication**: Microsoft Entra ID (Azure AD) OIDC
- **Configuration**: Systems Manager Parameter Store
- **Monitoring**: CloudWatch (cost-optimized)

## Directory Structure

```
terraform/
├── main.tf                          # Main configuration
├── variables.tf                     # Input variables
├── outputs.tf                       # Output values
├── backend.tf                       # S3 backend configuration
├── providers.tf                     # AWS provider
├── data.tf                          # Data sources
├── dev.tfvars                       # Development environment
├── prod.tfvars                      # Production environment
├── LAMBDA_OPTIMIZATION_GUIDE.md    # Detailed optimization guide
├── OPTIMIZATION_QUICK_START.md     # Quick optimization reference
└── modules/
    ├── dynamodb/                    # DynamoDB single table
    ├── lambda/                      # Lambda functions
    ├── api-gateway/                 # HTTP API + JWT authorizer
    ├── cli-gateway/                 # CLI Lambda routes
    ├── frontend/                    # S3 + CloudFront
    ├── parameter-store/             # Configuration parameters
    └── monitoring/                  # CloudWatch dashboards & alarms
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.5
3. **AWS CLI** configured with credentials
4. **S3 Backend** for Terraform state (already configured)
5. **Microsoft Entra ID** tenant and application registration

## Quick Start

### 1. Configure Backend

The Terraform backend is already configured to use S3 + DynamoDB. Initialize with:

```bash
cd terraform
terraform init
```

### 2. Configure Variables

Edit `dev.tfvars` or `prod.tfvars`:

```hcl
# Required: Entra ID configuration
entra_id_tenant_id = "your-tenant-id"
entra_id_client_id = "your-client-id"

# Optional: Custom domain
domain_name     = "visuidp.example.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."

# Optional: Alarm notifications
alarm_email = "ops-team@example.com"
```

### 3. Deploy Infrastructure

```bash
# Plan deployment
terraform plan -var-file=dev.tfvars

# Apply changes
terraform apply -var-file=dev.tfvars
```

### 4. Deploy Application Code

After infrastructure is created, deploy Lambda container images:

```bash
# Build and push API Lambda
cd ../idp-api
./build-lambda.sh
docker tag idp-api:latest <ecr-repo-url>:latest
docker push <ecr-repo-url>:latest

# Update Lambda function
aws lambda update-function-code \
  --function-name visuidp-dev-api \
  --image-uri <ecr-repo-url>:latest

# Build and deploy UI
cd ../idp-ui
npm run build
aws s3 sync dist/ s3://visuidp-dev-ui-assets/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

## Configuration

### Lambda Configuration

**Memory Optimization**:
- Start with 512 MB for dev, 1024 MB for prod
- Monitor CloudWatch metrics and adjust based on utilization
- See [LAMBDA_OPTIMIZATION_GUIDE.md](./LAMBDA_OPTIMIZATION_GUIDE.md)

**Cold Start Optimization**:
- GraalVM native image provides < 1s cold starts
- Enable provisioned concurrency for critical endpoints if needed
- Cost: $0.015/hour per execution unit (~$21.60/month for 2 units)

**Concurrency Limits**:
- Reserved concurrency prevents runaway costs
- Set to 2x peak concurrent executions
- Example: Peak of 20 → Set to 50

### DynamoDB Configuration

**Billing Mode**:
- On-demand (PAY_PER_REQUEST) for variable workloads
- Scales to zero when idle
- No capacity planning needed

**Backup**:
- Point-in-time recovery enabled for prod
- Disabled for dev to save costs

### CloudWatch Configuration

**Log Retention**:
- Dev: 3 days
- Prod: 7 days
- Saves ~$5-10/month vs 30-day retention

**Alarms**:
- Limited to 10 alarms (Free Tier)
- Focus on critical metrics only
- See monitoring module for details

## Optimization

### Quick Optimization (30 minutes)

See [OPTIMIZATION_QUICK_START.md](./OPTIMIZATION_QUICK_START.md) for a 5-step optimization process:

1. Run performance tests
2. Analyze CloudWatch metrics
3. Make optimization decisions
4. Update configuration
5. Apply and verify

### Detailed Optimization

See [LAMBDA_OPTIMIZATION_GUIDE.md](./LAMBDA_OPTIMIZATION_GUIDE.md) for comprehensive guidance on:

- Memory optimization
- Cold start optimization
- Timeout tuning
- Connection pool configuration
- Cost optimization strategies
- Monitoring and alerting
- Troubleshooting

## Cost Estimates

### Small Workload (3-4 users)
- **Monthly Cost**: $0-2
- **Details**: Within AWS Free Tier limits

### Medium Workload (10-20 users)
- **Monthly Cost**: $2-5
- **Details**: Minimal Lambda and DynamoDB costs

### Large Workload (50-100 users)
- **Monthly Cost**: $10-30
- **Details**: May need provisioned concurrency

### Cost Breakdown
- Lambda: $0-5 (Free Tier covers most usage)
- API Gateway: $0-1 (Free Tier covers 1M requests)
- DynamoDB: $0-2 (On-demand, scales to zero)
- CloudFront: $0 (Free Tier covers 50GB + 2M requests)
- S3: $0 (Free Tier covers 5GB)
- CloudWatch: $0 (Free Tier covers 5GB logs + 10 alarms)

**Total**: $0-10/month for typical usage

## Environments

### Development (`dev.tfvars`)
- Lower memory (512 MB)
- Short log retention (3 days)
- No provisioned concurrency
- Point-in-time recovery disabled
- Demo mode available

### Production (`prod.tfvars`)
- Higher memory (1024 MB)
- Longer log retention (7 days)
- Provisioned concurrency optional
- Point-in-time recovery enabled
- Reserved concurrency limits

## Monitoring

### CloudWatch Dashboards

Access dashboards in AWS Console:
- Lambda performance metrics
- API Gateway metrics
- DynamoDB metrics
- Cost tracking

### Key Metrics

**Lambda**:
- Duration (p50, p95, p99)
- Memory utilization
- Cold start frequency
- Error rate
- Concurrent executions

**API Gateway**:
- Request count
- 4xx/5xx errors
- Latency
- Throttling events

**DynamoDB**:
- Read/write capacity
- Throttling events
- Query latency

### Alarms

Critical alarms (within Free Tier limit):
1. Lambda error rate > 1%
2. API Gateway 5xx rate > 0.5%
3. DynamoDB throttling
4. Lambda concurrent executions > 80% of limit
5. Memory utilization > 90%

## Rollback

### Lambda Rollback

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name visuidp-prod-api

# Update alias to previous version
aws lambda update-alias \
  --function-name visuidp-prod-api \
  --name live \
  --function-version <previous-version>
```

### Infrastructure Rollback

```bash
# Revert to previous Terraform state
terraform state pull > current-state.json
terraform state push previous-state.json

# Or revert code and re-apply
git revert <commit-hash>
terraform apply -var-file=prod.tfvars
```

## Troubleshooting

### Lambda Cold Starts Too High

**Problem**: Cold starts > 1 second

**Solutions**:
1. Verify GraalVM native image is being used
2. Enable provisioned concurrency
3. Reduce deployment package size
4. Optimize initialization code

See [LAMBDA_OPTIMIZATION_GUIDE.md](./LAMBDA_OPTIMIZATION_GUIDE.md#cold-start-optimization)

### High Memory Utilization

**Problem**: Memory utilization > 90%

**Solutions**:
1. Increase Lambda memory
2. Profile for memory leaks
3. Implement streaming for large data

### Terraform Apply Fails

**Problem**: Resource creation errors

**Common Causes**:
- Missing IAM permissions
- Invalid Entra ID configuration
- Resource limits exceeded
- Backend state lock

**Solutions**:
1. Check AWS credentials and permissions
2. Verify Entra ID tenant and client IDs
3. Check AWS service quotas
4. Release state lock if stuck

## Security

### IAM Roles

- Principle of least privilege
- Separate roles for each Lambda function
- No hardcoded credentials
- IAM authentication for AWS services

### Secrets Management

- All secrets in Parameter Store (SecureString)
- KMS encryption enabled
- No secrets in code or environment variables
- Rotation supported via Parameter Store updates

### Network Security

- DynamoDB is AWS managed (no VPC needed)
- API Gateway enforces JWT validation
- CloudFront serves content over HTTPS
- S3 buckets are private (CloudFront OAI access only)

## Demo Mode

Enable demo mode for hackathon judges:

```hcl
# terraform/dev.tfvars
enable_demo_mode = true
```

**Features**:
- Bypasses Entra ID authentication
- Pre-populated sample data
- Terraform generation without deployment
- Clear UI indicators

## Performance Testing

### Run Load Tests

```bash
# From project root
./scripts/run-load-test.sh
./scripts/measure-cold-starts.sh
./scripts/monitor-dynamodb.sh
```

### Analyze Results

Results are saved to:
- `test-results/load-tests/` - Load test results
- `test-results/cold-starts/` - Cold start measurements
- `test-results/dynamodb-monitoring/` - DynamoDB metrics

See `docs/PERFORMANCE_TEST_RESULTS.md` for detailed analysis.

## Maintenance

### Regular Tasks

**Weekly**:
- Review CloudWatch metrics
- Check error logs
- Monitor costs

**Monthly**:
- Optimize Lambda configuration
- Review and adjust alarms
- Update dependencies

**Quarterly**:
- Run comprehensive load tests
- Review architecture for improvements
- Update documentation

## Support

### Documentation

- [Lambda Optimization Guide](./LAMBDA_OPTIMIZATION_GUIDE.md)
- [Optimization Quick Start](./OPTIMIZATION_QUICK_START.md)
- [Performance Test Results](../docs/PERFORMANCE_TEST_RESULTS.md)
- [Load Testing Guide](../scripts/LOAD_TESTING_README.md)

### AWS Resources

- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html)

## Contributing

When making infrastructure changes:

1. Test in dev environment first
2. Run `terraform plan` and review changes
3. Update documentation
4. Run performance tests
5. Deploy to prod during maintenance window

## License

See LICENSE file in project root.

---

**Last Updated**: 2025-11-18

**Maintained By**: Platform Operations Team
