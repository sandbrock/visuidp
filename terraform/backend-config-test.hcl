# Test Backend Configuration
# This is a temporary configuration for testing multi-environment support
# DO NOT use this for actual deployments

bucket         = "test-terraform-state-bucket"
key            = "visuidp/test/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "test-terraform-locks-table"
encrypt        = true
