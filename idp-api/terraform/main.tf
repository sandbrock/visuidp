# IDP API Project-Specific Terraform Configuration

# This file can be used for API-specific resources that don't belong in the shared modules
# For example: ECR repository, API-specific IAM policies, etc.

# ECR repository for API container images
resource "aws_ecr_repository" "api" {
  name                 = "visuidp-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project     = "VisuIDP"
    Component   = "API"
    ManagedBy   = "Terraform"
  }
}

# ECR lifecycle policy to keep only recent images
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

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
