# IDP CLI Lambda Infrastructure

This directory contains Terraform configuration for deploying the IDP CLI as an AWS Lambda function with API Gateway integration.

## Overview

The CLI Lambda infrastructure is deployed as part of the main VisuIDP Terraform configuration in the root `terraform/` directory. This README provides guidance on CLI-specific infrastructure components.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway HTTP API                    │
│                                                              │
│  POST /cli/generate        ──────┐                          │
│  POST /cli/list-variables  ──────┤                          │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │  Lambda Function │
                        │   (IDP CLI)      │
                        │                  │
                        │  - Rust binary   │
                        │  - 512 MB RAM    │
                        │  - 60s timeout   │
                        └────┬────────┬────┘
                             │        │
                    ┌────────┘        └────────┐
                    ▼                          ▼
         ┌──────────────────┐      ┌──────────────────┐
         │  S3: Templates   │      │  S3: Outputs     │
         │                  │      │                  │
         │  - Read access   │      │  - Read/Write    │
         │  - Versioned     │      │  - 7-day expiry  │
         └──────────────────┘      └──────────────────┘
```

## Components

### 1. Lambda Function

**Configuration:**
- **Runtime:** Custom (Rust binary in container image)
- **Memory:** 512 MB
- **Timeout:** 60 seconds
- **Architecture:** ARM64 (cost-optimized)

**Environment Variables:**
- `AWS_REGION` - AWS region
- `TEMPLATES_BUCKET` - S3 bucket name for templates
- `OUTPUTS_BUCKET` - S3 bucket name for outputs
- `IDP_API_URL` - URL of the IDP API (for fetching blueprint/stack data)
- `IDP_API_KEY` - API key for IDP API authentication

### 2. API Gateway Routes

**POST /cli/generate**
- Generates infrastructure files from a blueprint or stack
- Requires JWT authentication (unless demo mode enabled)
- Timeout: 60 seconds

**POST /cli/list-variables**
- Lists available variables for a blueprint or stack
- Requires JWT authentication (unless demo mode enabled)
- Timeout: 60 seconds

### 3. S3 Buckets

**Templates Bucket** (`{prefix}-templates`)
- Stores Handlebars templates for infrastructure generation
- Versioning enabled
- Private access only
- Lambda has read access

**Outputs Bucket** (`{prefix}-outputs`)
- Stores generated infrastructure files
- Lifecycle policy: Delete after 7 days
- Private access only
- Lambda has read/write access

## Deployment

The CLI infrastructure is deployed as part of the main Terraform configuration:

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=dev.tfvars

# Apply deployment
terraform apply -var-file=dev.tfvars
```

## Building and Deploying the Lambda Container

### 1. Build the Container Image

```bash
cd idp-cli

# Build Lambda container image
./build-lambda.sh container
```

This creates a Docker image `idp-cli-lambda:latest`.

### 2. Push to ECR

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag the image
docker tag idp-cli-lambda:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/idp-cli-lambda:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/idp-cli-lambda:latest
```

### 3. Update Lambda Function

After pushing the new image, update the Lambda function:

```bash
# Update Lambda function code
aws lambda update-function-code \
  --function-name visuidp-dev-cli \
  --image-uri <account-id>.dkr.ecr.us-east-1.amazonaws.com/idp-cli-lambda:latest
```

Or use Terraform to update:

```bash
cd terraform
terraform apply -var-file=dev.tfvars
```

## Uploading Templates

Templates should be uploaded to the templates S3 bucket:

```bash
# Upload templates directory
aws s3 sync ./templates/ s3://visuidp-dev-templates/ --delete

# Verify upload
aws s3 ls s3://visuidp-dev-templates/ --recursive
```

### Template Structure

```
templates/
├── terraform/
│   ├── main.tf.hbs
│   ├── variables.tf.hbs
│   └── outputs.tf.hbs
├── kubernetes/
│   ├── deployment.yaml.hbs
│   └── service.yaml.hbs
└── ...
```

## Testing the CLI Lambda

### Using curl

```bash
# Get API endpoint
API_ENDPOINT=$(terraform output -raw api_gateway_url)

# Get JWT token (from Entra ID)
JWT_TOKEN="your-jwt-token"

# Test generate operation
curl -X POST "${API_ENDPOINT}cli/generate" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "generate",
    "data_source": "blueprint",
    "identifier": "my-blueprint-name",
    "variables": {
      "custom_var": "value"
    }
  }'

# Test list-variables operation
curl -X POST "${API_ENDPOINT}cli/list-variables" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list-variables",
    "data_source": "stack",
    "identifier": "my-stack-name"
  }'
```

### Using AWS CLI

```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name visuidp-dev-cli \
  --payload '{
    "body": "{\"operation\":\"list-variables\",\"data_source\":\"blueprint\",\"identifier\":\"test-blueprint\"}"
  }' \
  response.json

# View response
cat response.json | jq
```

## Monitoring

### CloudWatch Logs

View Lambda execution logs:

```bash
# Stream logs
aws logs tail /aws/lambda/visuidp-dev-cli --follow

# View recent logs
aws logs tail /aws/lambda/visuidp-dev-cli --since 1h
```

### CloudWatch Metrics

Monitor Lambda performance:

- **Invocations:** Number of times Lambda is invoked
- **Duration:** Execution time per invocation
- **Errors:** Number of failed invocations
- **Throttles:** Number of throttled invocations

### API Gateway Logs

View API Gateway access logs:

```bash
aws logs tail /aws/apigateway/visuidp-dev-api --follow
```

## Troubleshooting

### Lambda Timeout

If operations timeout (60 seconds):

1. Check template complexity - simplify templates
2. Increase Lambda timeout in `terraform/variables.tf`:
   ```hcl
   variable "cli_lambda_timeout" {
     default = 90  # Increase to 90 seconds
   }
   ```
3. Increase Lambda memory (more memory = more CPU)

### Templates Not Found

If Lambda reports "No template files found":

1. Verify templates are uploaded to S3:
   ```bash
   aws s3 ls s3://visuidp-dev-templates/ --recursive
   ```

2. Check Lambda environment variables:
   ```bash
   aws lambda get-function-configuration \
     --function-name visuidp-dev-cli \
     --query 'Environment.Variables'
   ```

3. Verify Lambda has S3 read permissions:
   ```bash
   aws iam get-role-policy \
     --role-name visuidp-dev-cli-role \
     --policy-name visuidp-dev-cli-s3-policy
   ```

### S3 Access Denied

If Lambda cannot access S3:

1. Check IAM role permissions
2. Verify bucket names in environment variables
3. Check bucket policies don't block Lambda access

### API Gateway 401 Unauthorized

If API requests are rejected:

1. Verify JWT token is valid and not expired
2. Check JWT authorizer configuration in API Gateway
3. Ensure token audience matches Entra ID client ID
4. For testing, enable demo mode: `enable_demo_mode = true`

## Cost Optimization

### Lambda

- **Memory:** 512 MB (balance between cost and performance)
- **Timeout:** 60 seconds (minimum needed for complex templates)
- **Architecture:** ARM64 (20% cheaper than x86_64)

### S3

- **Lifecycle Policy:** Outputs deleted after 7 days
- **Versioning:** Only enabled for templates (not outputs)

### API Gateway

- **HTTP API:** 70% cheaper than REST API
- **Caching:** Disabled (CLI operations are not cacheable)

## Security

### Authentication

- JWT authentication via Entra ID
- API Gateway validates tokens before invoking Lambda
- Demo mode available for testing (bypasses authentication)

### IAM Permissions

Lambda execution role has minimal permissions:

- **S3 Templates:** Read-only access
- **S3 Outputs:** Read/write access
- **CloudWatch Logs:** Write access for logging
- **Parameter Store:** Read access for configuration

### Network Security

- Lambda does not require VPC (S3 is AWS managed)
- S3 buckets are private (no public access)
- API Gateway uses HTTPS only

## Next Steps

1. **Upload Templates:** Add your infrastructure templates to S3
2. **Test Operations:** Verify generate and list-variables work
3. **Monitor Performance:** Check CloudWatch metrics and logs
4. **Optimize Settings:** Adjust memory/timeout based on usage
5. **Set Up Alarms:** Create CloudWatch alarms for errors

## Additional Resources

- [Lambda Deployment Guide](../LAMBDA_DEPLOYMENT.md)
- [Main Terraform Configuration](../../terraform/README.md)
- [CLI Gateway Module](../../terraform/modules/cli-gateway/README.md)
