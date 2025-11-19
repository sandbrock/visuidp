# CLI API Gateway Module
# Provides API Gateway endpoints for CLI Lambda invocation

# Lambda integration for CLI
resource "aws_apigatewayv2_integration" "cli_lambda" {
  api_id           = var.api_gateway_id
  integration_type = "AWS_PROXY"
  integration_uri  = var.cli_lambda_invoke_arn

  payload_format_version = "2.0"
  timeout_milliseconds   = 60000 # 60 seconds for CLI operations
}

# POST /cli/generate - Generate infrastructure files from blueprint/stack
resource "aws_apigatewayv2_route" "cli_generate" {
  api_id    = var.api_gateway_id
  route_key = "POST /cli/generate"
  target    = "integrations/${aws_apigatewayv2_integration.cli_lambda.id}"

  # Use JWT authorizer unless demo mode is enabled
  authorization_type = var.enable_demo_mode ? "NONE" : "JWT"
  authorizer_id      = var.enable_demo_mode ? null : var.jwt_authorizer_id
}

# POST /cli/list-variables - List available variables for blueprint/stack
resource "aws_apigatewayv2_route" "cli_list_variables" {
  api_id    = var.api_gateway_id
  route_key = "POST /cli/list-variables"
  target    = "integrations/${aws_apigatewayv2_integration.cli_lambda.id}"

  # Use JWT authorizer unless demo mode is enabled
  authorization_type = var.enable_demo_mode ? "NONE" : "JWT"
  authorizer_id      = var.enable_demo_mode ? null : var.jwt_authorizer_id
}

# Lambda permission for API Gateway to invoke CLI Lambda
resource "aws_lambda_permission" "api_gateway_cli" {
  statement_id  = "AllowAPIGatewayInvokeCLI"
  action        = "lambda:InvokeFunction"
  function_name = var.cli_lambda_arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}

# IAM policy for CLI Lambda to access S3 buckets
resource "aws_iam_role_policy" "cli_s3_access" {
  name = "${var.bucket_prefix}-cli-s3-policy"
  role = var.cli_lambda_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.templates_bucket_arn,
          "${var.templates_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.outputs_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          var.outputs_bucket_arn
        ]
      }
    ]
  })
}
