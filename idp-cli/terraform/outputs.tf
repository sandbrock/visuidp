# IDP CLI Project-Specific Outputs

output "ecr_repository_url" {
  description = "URL of the ECR repository for CLI images"
  value       = aws_ecr_repository.cli.repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.cli.arn
}
