# CLI Gateway Module Outputs

output "cli_generate_endpoint" {
  description = "API Gateway endpoint for CLI generate operation"
  value       = "POST /cli/generate"
}

output "cli_list_variables_endpoint" {
  description = "API Gateway endpoint for CLI list-variables operation"
  value       = "POST /cli/list-variables"
}

output "cli_integration_id" {
  description = "ID of the CLI Lambda integration"
  value       = aws_apigatewayv2_integration.cli_lambda.id
}
