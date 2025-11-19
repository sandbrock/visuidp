# Deployment Scripts

This directory contains automation scripts for deploying VisuIDP to AWS.

## Scripts

### deploy.sh

Complete deployment automation script that orchestrates the entire pipeline.

**Usage**:
```bash
./deploy.sh --environment <env> [OPTIONS]
```

**Options**:
- `-e, --environment ENV` - Target environment (dev, staging, prod) [REQUIRED]
- `-s, --skip-build` - Skip build phase
- `-t, --skip-tests` - Skip test phase
- `-p, --skip-package` - Skip package phase
- `-d, --skip-deploy` - Skip deploy phase
- `-m, --skip-smoke` - Skip smoke tests
- `--plan-only` - Run terraform plan only (no apply)
- `-h, --help` - Show help message

**Examples**:
```bash
# Full deployment to dev
./deploy.sh --environment dev

# Deploy to prod (plan only)
./deploy.sh --environment prod --plan-only

# Skip build and tests (use existing artifacts)
./deploy.sh --environment dev --skip-build --skip-tests
```

**Environment Variables**:
- `AWS_REGION` - AWS region (default: us-east-1)
- `ECR_REGISTRY` - ECR registry URL
- `TERRAFORM_BACKEND_KEY` - Terraform state key prefix

### smoke-tests.sh

Automated smoke test suite for verifying deployment health.

**Usage**:
```bash
export API_URL=https://api.example.com
export UI_URL=https://ui.example.com
./smoke-tests.sh
```

**Environment Variables**:
- `API_URL` - API Gateway URL [REQUIRED]
- `UI_URL` - CloudFront URL [REQUIRED]
- `TEST_API_KEY` - API key for authentication tests [OPTIONAL]

**Tests**:
1. API Health Check
2. API Readiness Check
3. API Liveness Check
4. UI Accessibility
5. UI Static Assets
6. API CORS Headers
7. API Response Time
8. CloudFront Caching Headers
9. API Authentication (if API key provided)
10. API OpenAPI Documentation
11. SSL/TLS Certificate
12. UI Content Type Headers
13. API Metrics Endpoint
14. CloudFront Compression
15. API Error Handling

**Output**:
- Console output with colored results
- `smoke-test-results.txt` file with detailed results

## Prerequisites

### Required Tools
- AWS CLI
- Terraform
- Docker
- curl
- bash

### AWS Configuration
- AWS credentials configured
- Appropriate IAM permissions
- ECR repositories created

### Project Setup
- All components built (or use --skip-build)
- Terraform backend configured
- Environment-specific tfvars files

## Quick Start

1. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

2. **Set environment variables** (if needed):
   ```bash
   export AWS_REGION=us-east-1
   export ECR_REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Run deployment**:
   ```bash
   ./deploy.sh --environment dev
   ```

4. **Verify with smoke tests**:
   ```bash
   export API_URL=$(cd ../terraform && terraform output -raw api_gateway_url)
   export UI_URL=$(cd ../terraform && terraform output -raw cloudfront_url)
   ./smoke-tests.sh
   ```

## Troubleshooting

### Script Not Executable
```bash
chmod +x deploy.sh smoke-tests.sh
```

### AWS Credentials Not Found
```bash
aws configure
# Or set environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
```

### Terraform State Locked
```bash
cd ../terraform
terraform force-unlock <lock-id>
```

### Build Failures
```bash
# Clear caches and rebuild
rm -rf ~/.m2/repository  # Maven
rm -rf ../idp-ui/node_modules  # npm
cd ../idp-cli && cargo clean  # Rust

# Retry deployment
./deploy.sh --environment dev
```

## Documentation

For more detailed information, see:
- [Deployment Pipeline Documentation](../docs/DEPLOYMENT_PIPELINE.md)
- [Quick Reference Guide](../docs/DEPLOYMENT_QUICK_REFERENCE.md)
- [Implementation Summary](../DEPLOYMENT_PIPELINE_SUMMARY.md)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the full documentation
- Check CloudWatch logs
- Contact DevOps team
