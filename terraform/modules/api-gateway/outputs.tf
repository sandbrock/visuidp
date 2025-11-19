# API Gateway Module Outputs

output "api_id" {
  description = "ID of the API Gateway"
  value       = aws_apigatewayv2_api.main.id
}

output "api_endpoint" {
  description = "Endpoint of the API Gateway"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_url" {
  description = "URL of the API Gateway"
  value       = "${aws_apigatewayv2_api.main.api_endpoint}/"
}

output "api_domain" {
  description = "Domain of the API Gateway"
  value       = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}

output "execution_arn" {
  description = "Execution ARN of the API Gateway"
  value       = aws_apigatewayv2_api.main.execution_arn
}

output "jwt_authorizer_id" {
  description = "ID of the JWT authorizer (if enabled)"
  value       = var.enable_demo_mode ? null : aws_apigatewayv2_authorizer.jwt[0].id
}

output "custom_domain_name" {
  description = "Custom domain name (if configured)"
  value       = var.domain_name != "" ? aws_apigatewayv2_domain_name.main[0].domain_name : ""
}

output "stage_name" {
  description = "Name of the API Gateway stage"
  value       = aws_apigatewayv2_stage.main.name
}
