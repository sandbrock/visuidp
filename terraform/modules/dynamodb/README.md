# DynamoDB Single Table Module

This Terraform module creates a DynamoDB single table with Global Secondary Indexes (GSIs) for the VisuIDP application.

## Features

- **Single Table Design**: Uses a single DynamoDB table with composite keys (PK, SK) for all entities
- **Global Secondary Indexes**: Two GSIs for efficient querying:
  - **GSI1**: Query by secondary relationships (e.g., team → stacks)
  - **GSI2**: Query by type and attributes (e.g., provider → blueprints)
- **On-Demand Billing**: Pay-per-request billing mode for true serverless scaling to zero
- **Point-in-Time Recovery**: Optional PITR for data protection
- **Server-Side Encryption**: Automatic encryption at rest using AWS managed keys

## Table Schema

### Primary Key
- **PK** (Partition Key): Entity type prefix + ID (e.g., `STACK#uuid`, `TEAM#uuid`)
- **SK** (Sort Key): Metadata or relationship identifier (e.g., `METADATA`, `RESOURCE#uuid`)

### Global Secondary Indexes

#### GSI1 - Secondary Relationships
- **GSI1PK**: Secondary entity reference (e.g., `TEAM#<teamId>`)
- **GSI1SK**: Primary entity reference (e.g., `STACK#<stackId>`)
- **Use Case**: Query all stacks for a team

#### GSI2 - Type and Attributes
- **GSI2PK**: Type-based grouping (e.g., `CLOUDPROVIDER#<providerId>`)
- **GSI2SK**: Related entity reference (e.g., `BLUEPRINT#<blueprintId>`)
- **Use Case**: Query all blueprints for a cloud provider

## Entity Patterns

### Stack
```
PK: STACK#<uuid>
SK: METADATA
GSI1PK: TEAM#<teamId>
GSI1SK: STACK#<uuid>
Attributes: name, routePath, cloudName, stackType, blueprintId, teamId, etc.
```

### Blueprint
```
PK: BLUEPRINT#<uuid>
SK: METADATA
GSI2PK: CLOUDPROVIDER#<providerId>
GSI2SK: BLUEPRINT#<uuid>
Attributes: name, description, cloudProviderId, resources, etc.
```

### Team
```
PK: TEAM#<uuid>
SK: METADATA
Attributes: name, description, createdBy, createdAt, etc.
```

### API Key
```
PK: APIKEY#<keyHash>
SK: METADATA
Attributes: name, type, createdBy, expiresAt, isActive, etc.
```

## Usage

```hcl
module "dynamodb" {
  source = "./modules/dynamodb"

  table_name                    = "visuidp-prod-data"
  billing_mode                  = "PAY_PER_REQUEST"
  enable_point_in_time_recovery = true
  environment                   = "prod"
  
  # Optional: Use customer-managed KMS key for encryption
  # kms_key_arn = aws_kms_key.dynamodb.arn
  
  tags = {
    Environment = "prod"
    ManagedBy   = "Terraform"
  }
}

# Use the outputs
output "dynamodb_table_name" {
  value = module.dynamodb.table_name
}

output "dynamodb_access_policy_arn" {
  value = module.dynamodb.access_policy_arn
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| table_name | Name of the DynamoDB table | string | - | yes |
| billing_mode | DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED) | string | PAY_PER_REQUEST | no |
| enable_point_in_time_recovery | Enable point-in-time recovery | bool | true | no |
| environment | Environment name | string | - | yes |
| kms_key_arn | ARN of KMS key for encryption (optional, uses AWS managed key if not specified) | string | null | no |
| tags | Tags to apply to resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| table_name | Name of the DynamoDB table |
| table_arn | ARN of the DynamoDB table |
| table_id | ID of the DynamoDB table |
| gsi1_name | Name of GSI1 |
| gsi2_name | Name of GSI2 |
| access_policy_arn | ARN of the IAM policy for DynamoDB access |
| access_policy_name | Name of the IAM policy for DynamoDB access |

## IAM Policy

The module automatically creates an IAM policy that grants the necessary permissions for Lambda functions to access the DynamoDB table. The policy includes:

### Permissions Granted

- **Table Operations**: GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem, ConditionCheckItem
- **Index Operations**: Query and Scan on GSI1 and GSI2
- **Metadata Operations**: DescribeTable, DescribeTimeToLive

### Usage with Lambda

Attach the policy to your Lambda execution role:

```hcl
resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = module.dynamodb.access_policy_arn
}
```

The policy is scoped to the specific table and its indexes, following the principle of least privilege.

## Access Patterns

### Get Stack by ID
```
GetItem(PK=STACK#<id>, SK=METADATA)
```

### Get All Stacks for Team
```
Query(GSI1, GSI1PK=TEAM#<teamId>, begins_with(GSI1SK, "STACK#"))
```

### Get All Blueprints for Cloud Provider
```
Query(GSI2, GSI2PK=CLOUDPROVIDER#<id>, begins_with(GSI2SK, "BLUEPRINT#"))
```

### Get API Key
```
GetItem(PK=APIKEY#<hash>, SK=METADATA)
```

## Cost Optimization

- **On-Demand Billing**: Scales to zero when idle, no minimum costs
- **No Provisioned Capacity**: Pay only for actual read/write requests
- **GSI Projection**: Uses `ALL` projection for simplicity (can be optimized to `KEYS_ONLY` or `INCLUDE` for cost savings)
- **Point-in-Time Recovery**: Optional, can be disabled in dev environments to save costs

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | ~> 5.0 |

## Validation

To validate the module configuration:

```bash
cd terraform/modules/dynamodb/test
terraform init
terraform validate
```

## References

- [DynamoDB Single Table Design](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/)
