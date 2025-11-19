# DynamoDB Module Outputs

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.main.id
}

output "gsi1_name" {
  description = "Name of GSI1"
  value       = "GSI1"
}

output "gsi2_name" {
  description = "Name of GSI2"
  value       = "GSI2"
}

output "access_policy_arn" {
  description = "ARN of the IAM policy for DynamoDB access"
  value       = aws_iam_policy.dynamodb_access.arn
}

output "access_policy_name" {
  description = "Name of the IAM policy for DynamoDB access"
  value       = aws_iam_policy.dynamodb_access.name
}
