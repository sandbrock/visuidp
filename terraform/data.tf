# Data Sources for VisuIDP AWS Deployment

# Current AWS account information
data "aws_caller_identity" "current" {}

# Current AWS region
data "aws_region" "current" {}

# Note: No VPC data sources needed
# DynamoDB is an AWS managed service that doesn't require VPC configuration
# Lambda functions can access DynamoDB directly without VPC attachment
