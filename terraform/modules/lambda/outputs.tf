# Lambda Module Outputs

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.main.invoke_arn
}

output "function_url" {
  description = "URL of the Lambda function (if enabled)"
  value       = var.enable_function_url ? aws_lambda_function_url.main[0].function_url : ""
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "role_name" {
  description = "Name of the Lambda execution role"
  value       = aws_iam_role.lambda.name
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.main.version
}

output "alias_name" {
  description = "Name of the Lambda alias"
  value       = var.enable_versioning ? aws_lambda_alias.live[0].name : ""
}

output "alias_arn" {
  description = "ARN of the Lambda alias"
  value       = var.enable_versioning ? aws_lambda_alias.live[0].arn : ""
}

output "alias_invoke_arn" {
  description = "Invoke ARN of the Lambda alias"
  value       = var.enable_versioning ? aws_lambda_alias.live[0].invoke_arn : ""
}
