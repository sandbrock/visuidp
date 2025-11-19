# Frontend Module Outputs

output "s3_bucket_name" {
  description = "Name of the S3 bucket for UI assets"
  value       = aws_s3_bucket.ui.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for UI assets"
  value       = aws_s3_bucket.ui.arn
}

output "templates_bucket_name" {
  description = "Name of the S3 bucket for templates"
  value       = aws_s3_bucket.templates.id
}

output "templates_bucket_arn" {
  description = "ARN of the S3 bucket for templates"
  value       = aws_s3_bucket.templates.arn
}

output "outputs_bucket_name" {
  description = "Name of the S3 bucket for outputs"
  value       = aws_s3_bucket.outputs.id
}

output "outputs_bucket_arn" {
  description = "ARN of the S3 bucket for outputs"
  value       = aws_s3_bucket.outputs.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}
