# IDP API Terraform Configuration

This directory contains project-specific Terraform configuration for the IDP API Lambda function.

## Purpose

This configuration references the shared modules in the root `terraform/` directory and provides API-specific customizations.

## Structure

```
idp-api/terraform/
├── README.md           # This file
├── main.tf             # API-specific configuration
├── variables.tf        # API-specific variables
└── outputs.tf          # API-specific outputs
```

## Usage

This configuration is typically applied as part of the root terraform deployment. However, it can also be used independently for API-specific updates.

### Apply from root

```bash
cd ../../terraform
terraform apply -var-file=dev.tfvars
```

### Apply independently (if needed)

```bash
cd idp-api/terraform
terraform init -backend-config=../../terraform/backend-config.hcl
terraform apply
```

## Container Image

The Lambda function uses a container image built from the Quarkus application with GraalVM native compilation.

### Build and push image

```bash
# Build native image
./mvnw package -Pnative -Dquarkus.native.container-build=true

# Build Docker image
docker build -f src/main/docker/Dockerfile.native -t visuidp-api:latest .

# Tag for ECR
docker tag visuidp-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/visuidp-api:latest

# Push to ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/visuidp-api:latest
```

## Environment Variables

The Lambda function receives environment variables configured in the root terraform:

- `DYNAMODB_TABLE_NAME`: Name of the DynamoDB table
- `AWS_REGION`: AWS region
- `PARAMETER_STORE_PREFIX`: Prefix for Parameter Store paths
- `QUARKUS_PROFILE`: Quarkus profile (prod)
- `LOG_LEVEL`: Logging level
- `DEMO_MODE`: Enable demo mode (true/false)
