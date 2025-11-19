# IDP API Project-Specific Outputs

output "ecr_repository_url" {
  description = "URL of the ECR repository for API images"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.api.arn
}
