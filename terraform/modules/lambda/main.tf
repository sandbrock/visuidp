# Lambda Function Module

# IAM role for Lambda execution
resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# Basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy
resource "aws_iam_role_policy" "dynamodb" {
  name = "${var.function_name}-dynamodb-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Parameter Store access policy
resource "aws_iam_role_policy" "parameter_store" {
  name = "${var.function_name}-parameter-store-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Logs group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Lambda function
resource "aws_lambda_function" "main" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn

  # Placeholder for container image - will be updated during deployment
  package_type = "Image"
  image_uri    = var.image_uri != "" ? var.image_uri : "public.ecr.aws/lambda/provided:al2"

  memory_size   = var.memory_size
  timeout       = var.timeout
  architectures = [var.architecture]

  # Reserved concurrent executions (limit to prevent runaway costs)
  reserved_concurrent_executions = var.reserved_concurrent_executions

  # Enable versioning for rollback capability
  publish = var.enable_versioning

  environment {
    variables = var.environment_variables
  }

  # Ensure log group exists before Lambda
  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic
  ]

  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of Lambda function
    prevent_destroy = false
    # Ignore changes to image_uri to allow external updates
    ignore_changes = [image_uri]
  }
}

# Lambda alias for stable endpoint (points to specific version)
resource "aws_lambda_alias" "live" {
  count            = var.enable_versioning ? 1 : 0
  name             = var.alias_name
  description      = "Live alias for ${var.function_name}"
  function_name    = aws_lambda_function.main.function_name
  function_version = var.alias_version != "" ? var.alias_version : aws_lambda_function.main.version

  lifecycle {
    # Allow external updates to alias version for rollback
    ignore_changes = [function_version]
  }
}

# Lambda permission for API Gateway to invoke the alias
resource "aws_lambda_permission" "api_gateway_alias" {
  count         = var.enable_versioning ? 1 : 0
  statement_id  = "AllowAPIGatewayInvokeAlias"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  qualifier     = aws_lambda_alias.live[0].name
}

# Provisioned concurrency for critical endpoints (reduces cold starts)
resource "aws_lambda_provisioned_concurrency_config" "main" {
  count                             = var.provisioned_concurrent_executions > 0 && var.enable_versioning ? 1 : 0
  function_name                     = aws_lambda_function.main.function_name
  provisioned_concurrent_executions = var.provisioned_concurrent_executions
  qualifier                         = aws_lambda_alias.live[0].name

  depends_on = [aws_lambda_alias.live]
}

# Lambda function URL (optional, for direct invocation)
resource "aws_lambda_function_url" "main" {
  count              = var.enable_function_url ? 1 : 0
  function_name      = aws_lambda_function.main.function_name
  authorization_type = "NONE" # API Gateway handles auth

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    max_age           = 86400
  }
}
