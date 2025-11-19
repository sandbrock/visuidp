# DynamoDB Single Table Module

resource "aws_dynamodb_table" "main" {
  name         = var.table_name
  billing_mode = var.billing_mode
  hash_key     = "PK"
  range_key    = "SK"

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1 - Query by secondary identifier (e.g., team -> stacks)
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI2 - Query by type and attribute (e.g., provider -> blueprints)
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  # Global Secondary Index 1
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # Global Secondary Index 2
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption with AWS managed keys (default) or customer managed KMS key
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  # Tags
  tags = merge(
    var.tags,
    {
      Name = var.table_name
    }
  )
}

# IAM Policy Document for DynamoDB Access
data "aws_iam_policy_document" "dynamodb_access" {
  # Allow basic DynamoDB operations on the table
  statement {
    sid    = "DynamoDBTableAccess"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem"
    ]
    resources = [
      aws_dynamodb_table.main.arn
    ]
  }

  # Allow operations on Global Secondary Indexes
  statement {
    sid    = "DynamoDBIndexAccess"
    effect = "Allow"
    actions = [
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [
      "${aws_dynamodb_table.main.arn}/index/GSI1",
      "${aws_dynamodb_table.main.arn}/index/GSI2"
    ]
  }

  # Allow DescribeTable for table metadata
  statement {
    sid    = "DynamoDBDescribeAccess"
    effect = "Allow"
    actions = [
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive"
    ]
    resources = [
      aws_dynamodb_table.main.arn
    ]
  }
}

# IAM Policy Resource
resource "aws_iam_policy" "dynamodb_access" {
  name        = "${var.table_name}-access-policy"
  description = "IAM policy for Lambda functions to access DynamoDB table ${var.table_name}"
  policy      = data.aws_iam_policy_document.dynamodb_access.json

  tags = merge(
    var.tags,
    {
      Name = "${var.table_name}-access-policy"
    }
  )
}
