# IDP CLI Project-Specific Terraform Configuration

# This file can be used for CLI-specific resources that don't belong in the shared modules
# For example: ECR repository, CLI-specific IAM policies, etc.

# ECR repository for CLI container images
resource "aws_ecr_repository" "cli" {
  name                 = "visuidp-cli"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project     = "VisuIDP"
    Component   = "CLI"
    ManagedBy   = "Terraform"
  }
}

# ECR lifecycle policy to keep only recent images
resource "aws_ecr_lifecycle_policy" "cli" {
  repository = aws_ecr_repository.cli.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
