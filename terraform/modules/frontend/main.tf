# Frontend (S3 + CloudFront) Module

# S3 bucket for UI assets
resource "aws_s3_bucket" "ui" {
  bucket = "${var.bucket_prefix}-ui"

  tags = merge(
    var.tags,
    {
      Name = "${var.bucket_prefix}-ui"
    }
  )
}

# S3 bucket for templates (CLI)
resource "aws_s3_bucket" "templates" {
  bucket = "${var.bucket_prefix}-templates"

  tags = merge(
    var.tags,
    {
      Name = "${var.bucket_prefix}-templates"
    }
  )
}

# S3 bucket for outputs (CLI)
resource "aws_s3_bucket" "outputs" {
  bucket = "${var.bucket_prefix}-outputs"

  tags = merge(
    var.tags,
    {
      Name = "${var.bucket_prefix}-outputs"
    }
  )
}

# Enable encryption for UI bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "ui" {
  bucket = aws_s3_bucket.ui.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access for UI bucket
resource "aws_s3_bucket_public_access_block" "ui" {
  bucket = aws_s3_bucket.ui.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable encryption for templates bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "templates" {
  bucket = aws_s3_bucket.templates.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access for templates bucket
resource "aws_s3_bucket_public_access_block" "templates" {
  bucket = aws_s3_bucket.templates.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable encryption for outputs bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access for outputs bucket
resource "aws_s3_bucket_public_access_block" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for UI bucket
resource "aws_s3_bucket_versioning" "ui" {
  bucket = aws_s3_bucket.ui.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy for UI bucket - Cost optimized
resource "aws_s3_bucket_lifecycle_configuration" "ui" {
  bucket = aws_s3_bucket.ui.id

  # Delete old versions after 7 days (cost optimization)
  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

  # Transition old versions to cheaper storage after 3 days
  rule {
    id     = "transition-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      noncurrent_days = 3
      storage_class   = "STANDARD_IA"
    }
  }

  # Delete incomplete multipart uploads after 1 day
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Lifecycle policy for templates bucket - Cost optimized
resource "aws_s3_bucket_lifecycle_configuration" "templates" {
  bucket = aws_s3_bucket.templates.id

  # Transition to cheaper storage after 30 days
  rule {
    id     = "transition-old-templates"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }

  # Delete incomplete multipart uploads after 1 day
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Lifecycle policy for outputs bucket - Cost optimized
resource "aws_s3_bucket_lifecycle_configuration" "outputs" {
  bucket = aws_s3_bucket.outputs.id

  # Delete old outputs after 30 days (they can be regenerated)
  rule {
    id     = "delete-old-outputs"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }
  }

  # Transition to cheaper storage after 7 days
  rule {
    id     = "transition-old-outputs"
    status = "Enabled"

    filter {}

    transition {
      days          = 7
      storage_class = "STANDARD_IA"
    }
  }

  # Delete incomplete multipart uploads after 1 day
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${var.bucket_prefix}"
}

# S3 bucket policy for CloudFront
resource "aws_s3_bucket_policy" "ui" {
  bucket = aws_s3_bucket.ui.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.main.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.ui.arn}/*"
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "VisuIDP ${var.environment}"
  default_root_object = "index.html"
  # Cost optimization: PriceClass_100 uses only North America and Europe edge locations
  # Reduces costs by ~30% compared to PriceClass_All while maintaining good performance for target users
  # Free Tier: 50GB data transfer out, 2M HTTP/HTTPS requests per month
  price_class = "PriceClass_100"

  # S3 origin for UI
  origin {
    domain_name = aws_s3_bucket.ui.bucket_regional_domain_name
    origin_id   = "S3-UI"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # API Gateway origin
  origin {
    domain_name = var.api_gateway_domain
    origin_id   = "API-Gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default behavior (UI) - Optimized for Free Tier (50GB, 2M requests)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-UI"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    # Aggressive caching for static assets to maximize Free Tier benefits
    min_ttl     = 0
    default_ttl = 86400    # 24 hours (increased from 1 hour)
    max_ttl     = 31536000 # 1 year for versioned assets
    compress    = true     # Reduce data transfer costs
  }

  # API behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-Gateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept", "Content-Type"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn            = var.domain_name != "" ? var.certificate_arn : null
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  aliases = var.domain_name != "" ? [var.domain_name] : []

  tags = var.tags
}
