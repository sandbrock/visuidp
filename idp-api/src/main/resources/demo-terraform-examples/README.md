# Demo Mode Terraform Examples

This directory contains pre-generated Terraform examples for demo mode stacks.
These examples are used to demonstrate the Terraform generation capability
without actually deploying infrastructure.

## Structure

Each subdirectory corresponds to a demo stack and contains:
- `main.tf` - Main Terraform configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `README.md` - Stack-specific documentation

## Demo Stacks

1. **user-service-aws** - Microservice with Database on AWS ECS
2. **payment-api-azure** - Serverless API on Azure Functions
3. **marketing-site-gcp** - Static Website on GCP Cloud Storage
4. **order-processing-aws** - Event-Driven Service on AWS Lambda
5. **analytics-pipeline-azure** - Data Pipeline on Azure

## Usage in Demo Mode

When demo mode is enabled, the system returns these pre-generated Terraform
configurations instead of generating new ones. This allows judges to see
realistic Terraform code without triggering actual infrastructure deployments.
