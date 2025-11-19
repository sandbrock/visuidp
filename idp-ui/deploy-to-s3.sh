#!/bin/bash

# UI Deployment Script for AWS S3 and CloudFront
# This script builds the React application and deploys it to S3 with appropriate cache headers

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy the React UI to AWS S3 and CloudFront

OPTIONS:
    -b, --bucket BUCKET_NAME        S3 bucket name (required)
    -d, --distribution DIST_ID      CloudFront distribution ID (required)
    -r, --region REGION             AWS region (default: us-east-1)
    -p, --profile PROFILE           AWS CLI profile (optional)
    -s, --skip-build                Skip the build step
    -n, --no-invalidation           Skip CloudFront cache invalidation
    -h, --help                      Display this help message

EXAMPLES:
    # Deploy to production
    $0 --bucket visuidp-ui-prod --distribution E1234567890ABC

    # Deploy with specific AWS profile
    $0 --bucket visuidp-ui-dev --distribution E1234567890ABC --profile dev

    # Deploy without rebuilding (use existing dist/)
    $0 --bucket visuidp-ui-dev --distribution E1234567890ABC --skip-build

EOF
    exit 1
}

# Default values
REGION="us-east-1"
SKIP_BUILD=false
NO_INVALIDATION=false
AWS_PROFILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--bucket)
            BUCKET_NAME="$2"
            shift 2
            ;;
        -d|--distribution)
            DISTRIBUTION_ID="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -n|--no-invalidation)
            NO_INVALIDATION=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$BUCKET_NAME" ]; then
    print_error "S3 bucket name is required"
    usage
fi

if [ -z "$DISTRIBUTION_ID" ]; then
    print_error "CloudFront distribution ID is required"
    usage
fi

# Set AWS CLI profile if provided
if [ -n "$AWS_PROFILE" ]; then
    export AWS_PROFILE
    print_info "Using AWS profile: $AWS_PROFILE"
fi

# Verify AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Verify AWS credentials
print_info "Verifying AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured or invalid"
    exit 1
fi
print_success "AWS credentials verified"

# Verify S3 bucket exists
print_info "Verifying S3 bucket exists: $BUCKET_NAME"
if ! aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
    print_error "S3 bucket does not exist or you don't have access: $BUCKET_NAME"
    exit 1
fi
print_success "S3 bucket verified"

# Verify CloudFront distribution exists
print_info "Verifying CloudFront distribution: $DISTRIBUTION_ID"
if ! aws cloudfront get-distribution --id "$DISTRIBUTION_ID" &> /dev/null; then
    print_error "CloudFront distribution does not exist or you don't have access: $DISTRIBUTION_ID"
    exit 1
fi
print_success "CloudFront distribution verified"

# Build the application
if [ "$SKIP_BUILD" = false ]; then
    print_info "Building React application..."
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Running npm install..."
        npm install
    fi
    
    # Run production build
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    print_success "Build completed successfully"
else
    print_warning "Skipping build step"
    
    if [ ! -d "dist" ]; then
        print_error "dist directory not found. Cannot skip build."
        exit 1
    fi
fi

# Upload files to S3
print_info "Uploading files to S3: s3://$BUCKET_NAME/"

# Sync all files to S3 (this will delete files not in dist/)
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --region "$REGION" \
    --delete \
    --exclude "*" \
    --include "*"

print_success "Files uploaded to S3"

# Set cache headers for HTML files (no caching)
print_info "Setting cache headers for HTML files..."
aws s3 cp "s3://$BUCKET_NAME/" "s3://$BUCKET_NAME/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --metadata-directive REPLACE \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

print_success "HTML cache headers set"

# Set cache headers for hashed JavaScript files (long-term caching)
print_info "Setting cache headers for JavaScript files..."
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.js" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "application/javascript"

print_success "JavaScript cache headers set"

# Set cache headers for hashed CSS files (long-term caching)
print_info "Setting cache headers for CSS files..."
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.css" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "text/css"

print_success "CSS cache headers set"

# Set cache headers for compressed files
print_info "Setting cache headers for compressed files..."

# Gzip files
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.gz" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable" \
    --content-encoding "gzip"

# Brotli files
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.br" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable" \
    --content-encoding "br"

print_success "Compressed file cache headers set"

# Set cache headers for images (medium-term caching)
print_info "Setting cache headers for images..."
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.png" \
    --include "*.jpg" \
    --include "*.jpeg" \
    --include "*.gif" \
    --include "*.svg" \
    --include "*.ico" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=86400"

print_success "Image cache headers set"

# Set cache headers for fonts (long-term caching)
print_info "Setting cache headers for fonts..."
aws s3 cp "s3://$BUCKET_NAME/assets/" "s3://$BUCKET_NAME/assets/" \
    --region "$REGION" \
    --recursive \
    --exclude "*" \
    --include "*.woff" \
    --include "*.woff2" \
    --include "*.ttf" \
    --include "*.eot" \
    --include "*.otf" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=31536000, immutable"

print_success "Font cache headers set"

# Invalidate CloudFront cache
if [ "$NO_INVALIDATION" = false ]; then
    print_info "Creating CloudFront cache invalidation..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/ui/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    print_success "CloudFront invalidation created: $INVALIDATION_ID"
    print_info "Waiting for invalidation to complete (this may take a few minutes)..."
    
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID"
    
    print_success "CloudFront cache invalidation completed"
else
    print_warning "Skipping CloudFront cache invalidation"
fi

# Display deployment summary
print_success "========================================="
print_success "Deployment completed successfully!"
print_success "========================================="
print_info "S3 Bucket: s3://$BUCKET_NAME/"
print_info "CloudFront Distribution: $DISTRIBUTION_ID"

# Get CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id "$DISTRIBUTION_ID" \
    --query 'Distribution.DomainName' \
    --output text)

print_info "CloudFront URL: https://$CLOUDFRONT_DOMAIN/ui/"
print_success "========================================="

exit 0
