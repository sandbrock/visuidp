# CLI Gateway Module

This Terraform module creates the infrastructure for the IDP CLI Lambda function, including:

- API Gateway routes for CLI operations
- S3 buckets for template storage and outputs
- IAM policies for S3 access
- Lambda permissions for API Gateway invocation

## Features

### API Gateway Routes

- **POST /cli/generate** - Generate infrastructure files from blueprint or stack
- **POST /cli/list-variables** - List available variables for a blueprint or stack

### S3 Buckets

- **Templates Bucket** - Stores Handlebars templates for infrastructure generation
  - Versioning enabled
  - Private access only
  - Read access for CLI Lambda

- **Outputs Bucket** - Stores generated infrastructure files
  - Lifecycle policy: Delete files after 7 days
  - Private access only
  - Read/write access for CLI Lambda

### Security

- JWT authentication via Entra ID (unless demo mode is enabled)
- IAM role-based access to S3 buckets
- No public access to S3 buckets
- Lambda execution timeout: 60 seconds

## Usage

```hcl
module "cli_gateway" {
  source = "./modules/cli-gateway"

  api_gateway_id            = module.api_gateway.api_id
  api_gateway_execution_arn = module.api_gateway.execution_arn
  jwt_authorizer_id         = module.api_gateway.jwt_authorizer_id
  
  cli_lambda_arn        = module.lambda_cli.function_arn
  cli_lambda_invoke_arn = module.lambda_cli.function_invoke_arn
  cli_lambda_role_name  = module.lambda_cli.role_name
  
  bucket_prefix    = "visuidp-dev"
  enable_demo_mode = false
  
  tags = {
    Environment = "dev"
    Project     = "VisuIDP"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| api_gateway_id | ID of the API Gateway | string | - | yes |
| api_gateway_execution_arn | Execution ARN of the API Gateway | string | - | yes |
| jwt_authorizer_id | ID of the JWT authorizer | string | null | no |
| cli_lambda_arn | ARN of the CLI Lambda function | string | - | yes |
| cli_lambda_invoke_arn | Invoke ARN of the CLI Lambda function | string | - | yes |
| cli_lambda_role_name | Name of the CLI Lambda execution role | string | - | yes |
| bucket_prefix | Prefix for S3 bucket names | string | - | yes |
| enable_demo_mode | Enable demo mode (bypasses JWT authentication) | bool | false | no |
| tags | Tags to apply to resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| templates_bucket_name | Name of the S3 bucket for templates |
| templates_bucket_arn | ARN of the S3 bucket for templates |
| outputs_bucket_name | Name of the S3 bucket for outputs |
| outputs_bucket_arn | ARN of the S3 bucket for outputs |
| cli_generate_endpoint | API Gateway endpoint for CLI generate operation |
| cli_list_variables_endpoint | API Gateway endpoint for CLI list-variables operation |

## Request Format

### Generate Operation

```bash
curl -X POST https://api.example.com/cli/generate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "generate",
    "data_source": "blueprint",
    "identifier": "my-blueprint-name",
    "variables": {
      "custom_var": "value"
    }
  }'
```

### List Variables Operation

```bash
curl -X POST https://api.example.com/cli/list-variables \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list-variables",
    "data_source": "stack",
    "identifier": "my-stack-name"
  }'
```

## Template Storage

Templates should be uploaded to the templates bucket with the following structure:

```
s3://bucket-name-templates/
├── terraform/
│   ├── main.tf.hbs
│   ├── variables.tf.hbs
│   └── outputs.tf.hbs
├── kubernetes/
│   ├── deployment.yaml.hbs
│   └── service.yaml.hbs
└── ...
```

The CLI Lambda will discover and process all `.hbs` files in the `/tmp/templates` directory.

## Cost Optimization

- **S3 Lifecycle**: Outputs are automatically deleted after 7 days
- **Lambda Timeout**: Set to 60 seconds (maximum needed for complex templates)
- **S3 Versioning**: Only enabled for templates (not outputs) to reduce storage costs

## Monitoring

Monitor CLI operations through:

- CloudWatch Logs: `/aws/lambda/{function-name}`
- API Gateway access logs
- S3 bucket metrics

## Troubleshooting

### Templates Not Found

If the CLI Lambda reports "No template files found":

1. Verify templates are uploaded to the templates bucket
2. Check Lambda has read permissions to the bucket
3. Ensure templates have `.hbs` extension

### S3 Access Denied

If Lambda cannot access S3:

1. Verify IAM role has correct permissions
2. Check bucket policies don't block Lambda access
3. Ensure bucket names are correct in environment variables

### Timeout Errors

If CLI operations timeout:

1. Increase Lambda timeout (currently 60 seconds)
2. Optimize template complexity
3. Consider breaking large template sets into smaller batches
