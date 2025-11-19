# Parameter Store Module

This module creates AWS Systems Manager Parameter Store parameters for application configuration.

## Purpose

The Parameter Store module provides centralized configuration management for the VisuIDP application running on AWS Lambda. It stores application settings, API key configuration, DynamoDB connection details, and Entra ID authentication parameters.

## Features

- **Centralized Configuration**: All application settings in one place
- **Environment-Specific**: Separate parameters per environment (dev, staging, prod)
- **Secure Storage**: Support for SecureString parameters with KMS encryption
- **Version Control**: Parameter versioning for configuration history
- **IAM Integration**: Lambda functions access parameters using IAM roles

## Parameters Created

### Application Configuration
- `admin-group`: Admin group name for authorization
- `logging/level`: Application log level (ERROR, INFO, DEBUG, etc.)

### API Key Configuration
- `api-key/default-expiration-days`: Default expiration for API keys (90 days)
- `api-key/rotation-grace-period-hours`: Grace period for key rotation (24 hours)
- `api-key/max-keys-per-user`: Maximum keys per user (10)
- `api-key/bcrypt-cost-factor`: BCrypt hashing cost (12)
- `api-key/key-length`: Generated key length (32 characters)

### DynamoDB Configuration
- `dynamodb/table-name`: DynamoDB table name
- `dynamodb/region`: AWS region for DynamoDB

### Entra ID Configuration
- `entra-id/tenant-id`: Microsoft Entra ID tenant ID
- `entra-id/client-id`: Application client ID
- `entra-id/issuer-url`: OIDC issuer URL

### Demo Mode Configuration
- `demo-mode/enabled`: Enable demo mode for hackathon judges

## Usage

```hcl
module "parameter_store" {
  source = "./modules/parameter-store"

  parameter_prefix = "/visuidp/dev"
  aws_region       = "us-east-1"
  environment      = "dev"

  # Application configuration
  admin_group = "IDP-Admins"
  log_level   = "INFO"

  # API Key configuration
  api_key_default_expiration_days     = 90
  api_key_rotation_grace_period_hours = 24
  api_key_max_keys_per_user           = 10

  # DynamoDB configuration
  dynamodb_table_name = "visuidp-dev-data"

  # Entra ID configuration
  entra_id_tenant_id  = "your-tenant-id"
  entra_id_client_id  = "your-client-id"
  entra_id_issuer_url = "https://login.microsoftonline.com/your-tenant-id/v2.0"

  # Demo mode
  enable_demo_mode = false

  tags = {
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}
```

## Parameter Naming Convention

Parameters follow a hierarchical naming structure:
```
/{project}/{environment}/{category}/{parameter}
```

Examples:
- `/visuidp/dev/admin-group`
- `/visuidp/prod/api-key/default-expiration-days`
- `/visuidp/staging/dynamodb/table-name`

## Accessing Parameters in Lambda

Lambda functions access parameters using the AWS SDK:

```java
// Java example
SsmClient ssmClient = SsmClient.builder()
    .region(Region.of(System.getenv("AWS_REGION")))
    .build();

GetParameterRequest request = GetParameterRequest.builder()
    .name("/visuidp/dev/admin-group")
    .build();

GetParameterResponse response = ssmClient.getParameter(request);
String adminGroup = response.parameter().value();
```

## Secure Parameters

For sensitive data (passwords, API keys, tokens), use SecureString type:

```hcl
resource "aws_ssm_parameter" "database_password" {
  name        = "${var.parameter_prefix}/database/password"
  description = "Database password"
  type        = "SecureString"
  value       = var.database_password
  key_id      = var.kms_key_id  # Optional: custom KMS key

  tags = var.tags
}
```

Lambda IAM role needs KMS decrypt permission:
```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt"],
  "Resource": "*"
}
```

## Parameter Updates

To update a parameter value:

1. Update the variable in `terraform.tfvars`
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to update the parameter
4. Lambda functions will read the new value on next invocation (no restart needed)

## Cost

Parameter Store pricing:
- **Standard parameters**: Free (up to 10,000 parameters)
- **Advanced parameters**: $0.05 per parameter per month
- **API calls**: Free for standard tier (up to 1M calls/month)

For this application with ~15 parameters: **$0/month** (using standard tier)

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| parameter_prefix | Prefix for parameter names | string | - | yes |
| aws_region | AWS region | string | - | yes |
| environment | Environment name | string | - | yes |
| admin_group | Admin group name | string | "admin" | no |
| log_level | Application log level | string | "ERROR" | no |
| api_key_default_expiration_days | API key expiration days | number | 90 | no |
| dynamodb_table_name | DynamoDB table name | string | - | yes |
| entra_id_tenant_id | Entra ID tenant ID | string | - | yes |
| entra_id_client_id | Entra ID client ID | string | - | yes |
| entra_id_issuer_url | Entra ID issuer URL | string | - | yes |
| enable_demo_mode | Enable demo mode | bool | false | no |
| tags | Resource tags | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| parameter_prefix | Prefix used for all parameters |
| parameter_names | List of all parameter names |
| parameter_arns | Map of parameter names to ARNs |

## Best Practices

1. **Use Environment-Specific Prefixes**: Separate parameters by environment
2. **Secure Sensitive Data**: Use SecureString for passwords and secrets
3. **Version Control**: Parameter Store maintains version history
4. **Least Privilege**: Grant Lambda only necessary parameter access
5. **Monitoring**: Enable CloudWatch alarms for parameter access failures
6. **Documentation**: Document parameter purpose and valid values
7. **Validation**: Use Terraform validation rules for parameter values

## Troubleshooting

### Lambda can't access parameters

Check IAM role has SSM permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameter",
    "ssm:GetParameters",
    "ssm:GetParametersByPath"
  ],
  "Resource": "arn:aws:ssm:*:*:parameter/*"
}
```

### SecureString decryption fails

Ensure Lambda role has KMS decrypt permission:
```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt"],
  "Resource": "*"
}
```

### Parameter not found

Verify parameter name matches exactly (case-sensitive):
```bash
aws ssm get-parameter --name "/visuidp/dev/admin-group"
```

## References

- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Parameter Store Pricing](https://aws.amazon.com/systems-manager/pricing/)
- [IAM Policies for Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html)
