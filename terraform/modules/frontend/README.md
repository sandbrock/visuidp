# Frontend Module

This Terraform module creates the infrastructure for hosting the VisuIDP frontend application using Amazon S3 and CloudFront CDN.

## Overview

The module provisions:
- **S3 Buckets**: Three buckets for UI assets, CLI templates, and CLI outputs
- **CloudFront Distribution**: Global CDN for serving static content and proxying API requests
- **Security**: Origin Access Identity (OAI) for secure S3 access, encryption at rest
- **SPA Support**: Custom error responses for single-page application routing

## Architecture

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   CloudFront    │
│  Distribution   │
└────┬───────┬────┘
     │       │
     │       └──────────────┐
     │                      │
     ▼                      ▼
┌─────────────┐    ┌──────────────┐
│  S3 Bucket  │    │ API Gateway  │
│  (UI Assets)│    │  (Backend)   │
└─────────────┘    └──────────────┘
```

## Features

### S3 Buckets

1. **UI Assets Bucket** (`{prefix}-ui`)
   - Stores React application static files
   - Private access via CloudFront OAI
   - Versioning enabled
   - Lifecycle policy: Delete old versions after 30 days
   - Server-side encryption (AES256)

2. **Templates Bucket** (`{prefix}-templates`)
   - Stores CLI templates for infrastructure generation
   - Private access via IAM roles
   - Server-side encryption (AES256)

3. **Outputs Bucket** (`{prefix}-outputs`)
   - Stores generated infrastructure files from CLI
   - Private access via IAM roles
   - Server-side encryption (AES256)

### CloudFront Distribution

**Origins:**
- **S3 Origin**: Serves UI static assets via OAI
- **API Gateway Origin**: Proxies API requests to backend

**Cache Behaviors:**
- **Default** (`/*`): Serves UI assets from S3
  - Caching: 1 hour default, 24 hours max
  - Compression enabled
  - HTTPS redirect
  
- **API** (`/api/*`): Proxies to API Gateway
  - No caching (dynamic content)
  - Forwards Authorization, Accept, Content-Type headers
  - All HTTP methods supported
  - HTTPS redirect

**SPA Routing:**
- 404 errors redirect to `/index.html` (200 status)
- 403 errors redirect to `/index.html` (200 status)
- Enables client-side routing for React Router

**Security:**
- TLS 1.2 minimum
- HTTPS redirect for all requests
- Custom domain support with ACM certificate
- Origin Access Identity prevents direct S3 access

**Cost Optimization:**
- Price Class 100 (North America and Europe only)
- Compression enabled to reduce data transfer
- Lifecycle policies for old S3 versions

## Usage

```hcl
module "frontend" {
  source = "./modules/frontend"

  bucket_prefix      = "visuidp-prod"
  environment        = "prod"
  api_gateway_domain = "abc123.execute-api.us-east-1.amazonaws.com"
  
  # Optional: Custom domain
  domain_name     = "app.example.com"
  certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
  
  tags = {
    Project     = "VisuIDP"
    Environment = "prod"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| bucket_prefix | Prefix for S3 bucket names | string | - | yes |
| environment | Environment name (dev, staging, prod) | string | - | yes |
| api_gateway_domain | Domain of the API Gateway | string | - | yes |
| domain_name | Custom domain name for CloudFront | string | "" | no |
| certificate_arn | ACM certificate ARN (must be in us-east-1) | string | "" | no |
| tags | Tags to apply to resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| s3_bucket_name | Name of the S3 bucket for UI assets |
| s3_bucket_arn | ARN of the S3 bucket for UI assets |
| templates_bucket_name | Name of the S3 bucket for templates |
| outputs_bucket_name | Name of the S3 bucket for outputs |
| cloudfront_distribution_id | ID of the CloudFront distribution |
| cloudfront_domain_name | Domain name of the CloudFront distribution |
| cloudfront_arn | ARN of the CloudFront distribution |

## Deployment Process

### 1. Build React Application

```bash
cd idp-ui
npm run build
```

This generates optimized static assets in `dist/` directory.

### 2. Upload to S3

```bash
aws s3 sync dist/ s3://{bucket-name}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html separately with no-cache
aws s3 cp dist/index.html s3://{bucket-name}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

### 3. Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id {distribution-id} \
  --paths "/*"
```

## Custom Domain Setup

To use a custom domain with CloudFront:

1. **Create ACM Certificate** (in us-east-1 region):
   ```bash
   aws acm request-certificate \
     --domain-name app.example.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**: Add DNS records as instructed by ACM

3. **Configure Module**: Set `domain_name` and `certificate_arn` variables

4. **Create DNS Record**: Point your domain to CloudFront:
   ```
   app.example.com  CNAME  d123456abcdef.cloudfront.net
   ```

## Security Considerations

### S3 Bucket Security
- All buckets have public access blocked
- UI bucket accessible only via CloudFront OAI
- Templates and outputs buckets accessible only via IAM roles
- Server-side encryption enabled (AES256)
- Versioning enabled for UI bucket

### CloudFront Security
- HTTPS enforced for all requests
- TLS 1.2 minimum protocol version
- Origin Access Identity prevents direct S3 access
- Custom domain requires valid ACM certificate

### IAM Permissions
Lambda functions need these permissions for CLI buckets:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::{prefix}-templates/*",
        "arn:aws:s3:::{prefix}-outputs/*"
      ]
    }
  ]
}
```

## Cost Optimization

### CloudFront Free Tier
- 50 GB data transfer out per month
- 2,000,000 HTTP/HTTPS requests per month
- Typical usage for 3-4 users: **$0/month**

### S3 Costs
- Storage: ~$0.023/GB/month
- UI assets: <100MB = **$0/month**
- Free Tier: 5GB storage, 20,000 GET requests

### Optimization Strategies
1. **Price Class 100**: Serve only from North America and Europe
2. **Compression**: Reduce data transfer by 60-80%
3. **Lifecycle Policies**: Delete old versions after 30 days
4. **Caching**: Aggressive caching for static assets
5. **Versioned Filenames**: Enable long-term caching

## Monitoring

### CloudWatch Metrics (Free)
- CloudFront: Requests, bytes downloaded, error rates
- S3: Bucket size, number of objects

### CloudFront Access Logs
Enable for detailed request analysis:
```hcl
logging_config {
  bucket = aws_s3_bucket.logs.bucket_domain_name
  prefix = "cloudfront/"
}
```

## Troubleshooting

### Issue: 403 Forbidden from S3
**Cause**: CloudFront OAI not configured correctly
**Solution**: Verify S3 bucket policy allows OAI access

### Issue: SPA Routes Return 404
**Cause**: CloudFront not redirecting to index.html
**Solution**: Verify custom error responses are configured

### Issue: Stale Content After Deployment
**Cause**: CloudFront cache not invalidated
**Solution**: Create invalidation after S3 upload

### Issue: Custom Domain Not Working
**Cause**: ACM certificate not in us-east-1 or DNS not configured
**Solution**: Verify certificate region and DNS CNAME record

## Requirements

- Terraform >= 1.5
- AWS Provider >= 5.0
- ACM certificate in us-east-1 (for custom domain)
- API Gateway already deployed

## Related Modules

- `api-gateway`: Provides API Gateway domain for CloudFront origin
- `lambda`: Functions that access templates and outputs buckets
- `monitoring`: CloudWatch dashboards for CloudFront metrics

## References

- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront OAI](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [SPA Routing with CloudFront](https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-serve-static-website/)
