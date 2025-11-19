# IDP UI Terraform Configuration

This directory contains project-specific Terraform configuration for the IDP UI frontend.

## Purpose

This configuration references the shared modules in the root `terraform/` directory and provides UI-specific customizations.

## Structure

```
idp-ui/terraform/
├── README.md           # This file
├── main.tf             # UI-specific configuration
├── variables.tf        # UI-specific variables
└── outputs.tf          # UI-specific outputs
```

## Usage

This configuration is typically applied as part of the root terraform deployment. However, it can also be used independently for UI-specific updates.

### Apply from root

```bash
cd ../../terraform
terraform apply -var-file=dev.tfvars
```

## Deployment

The UI is deployed to S3 and distributed via CloudFront.

### Build and deploy

```bash
# Build production bundle
npm run build

# Upload to S3
aws s3 sync dist/ s3://<bucket-name>/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

### Deployment script

A deployment script is provided for convenience:

```bash
#!/bin/bash
# deploy-ui.sh

BUCKET_NAME=$1
DISTRIBUTION_ID=$2

# Build
npm run build

# Upload to S3 with cache headers
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

## Environment Configuration

The UI needs to know the API endpoint. This is configured via environment variables during build:

```bash
# .env.production
VITE_API_URL=https://api.visuidp.example.com
```
