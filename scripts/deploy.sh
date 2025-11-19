#!/bin/bash

################################################################################
# Generic Deployment Script for AWS
#
# This script orchestrates the complete deployment pipeline:
# 1. Build all components (API, UI, CLI)
# 2. Package container images
# 3. Deploy infrastructure with Terraform
# 4. Run smoke tests
#
# Usage:
#   ./scripts/deploy.sh [OPTIONS]
#
# Options:
#   -e, --environment ENV    Target environment (dev, staging, prod)
#   -s, --skip-build         Skip build phase
#   -t, --skip-tests         Skip test phase
#   -p, --skip-package       Skip package phase
#   -d, --skip-deploy        Skip deploy phase
#   -m, --skip-smoke         Skip smoke tests
#   --plan-only              Run terraform plan only (no apply)
#   -h, --help               Show this help message
#
# Environment Variables:
#   AWS_REGION              AWS region (default: us-east-1)
#   ECR_REGISTRY            ECR registry URL
#   TERRAFORM_BACKEND_KEY   Terraform state key prefix
#
# Examples:
#   # Full deployment to dev
#   ./scripts/deploy.sh --environment dev
#
#   # Deploy to prod (plan only)
#   ./scripts/deploy.sh --environment prod --plan-only
#
#   # Skip build and tests (use existing artifacts)
#   ./scripts/deploy.sh --environment dev --skip-build --skip-tests
################################################################################

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default configuration
ENVIRONMENT=""
AWS_REGION="${AWS_REGION:-us-east-1}"
SKIP_BUILD=false
SKIP_TESTS=false
SKIP_PACKAGE=false
SKIP_DEPLOY=false
SKIP_SMOKE=false
PLAN_ONLY=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy VisuIDP to AWS

OPTIONS:
    -e, --environment ENV    Target environment (dev, staging, prod) [REQUIRED]
    -s, --skip-build         Skip build phase
    -t, --skip-tests         Skip test phase
    -p, --skip-package       Skip package phase
    -d, --skip-deploy        Skip deploy phase
    -m, --skip-smoke         Skip smoke tests
    --plan-only              Run terraform plan only (no apply)
    -h, --help               Show this help message

ENVIRONMENT VARIABLES:
    AWS_REGION              AWS region (default: us-east-1)
    ECR_REGISTRY            ECR registry URL
    TERRAFORM_BACKEND_KEY   Terraform state key prefix

EXAMPLES:
    # Full deployment to dev
    $0 --environment dev

    # Deploy to prod (plan only)
    $0 --environment prod --plan-only

    # Skip build and tests
    $0 --environment dev --skip-build --skip-tests

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -t|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -p|--skip-package)
            SKIP_PACKAGE=true
            shift
            ;;
        -d|--skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        -m|--skip-smoke)
            SKIP_SMOKE=true
            shift
            ;;
        --plan-only)
            PLAN_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    usage
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT (must be dev, staging, or prod)"
    exit 1
fi

# Validate prerequisites
log_section "Validating Prerequisites"

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
fi
log_success "AWS CLI found"

if ! command -v terraform &> /dev/null; then
    log_error "Terraform is not installed"
    exit 1
fi
log_success "Terraform found"

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi
log_success "Docker found"

# Verify AWS credentials
log_info "Verifying AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials are not configured"
    exit 1
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "AWS credentials verified (Account: $ACCOUNT_ID)"

# Set ECR registry if not provided
if [ -z "$ECR_REGISTRY" ]; then
    ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    log_info "ECR Registry: $ECR_REGISTRY"
fi

# Generate image tag
IMAGE_TAG="${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
log_info "Image tag: $IMAGE_TAG"

# Build Phase
if [ "$SKIP_BUILD" = false ]; then
    log_section "Build Phase"
    
    # Build API
    log_info "Building Quarkus API..."
    cd "$PROJECT_ROOT/idp-api"
    if [ "$SKIP_TESTS" = true ]; then
        ./mvnw clean package -Pnative -DskipTests -Dquarkus.profile=lambda
    else
        ./mvnw clean package -Pnative -Dquarkus.profile=lambda
    fi
    log_success "API build completed"
    
    # Build UI
    log_info "Building React UI..."
    cd "$PROJECT_ROOT/idp-ui"
    npm ci
    if [ "$SKIP_TESTS" = false ]; then
        npm test
    fi
    npm run build:prod
    log_success "UI build completed"
    
    # Build CLI
    log_info "Building Rust CLI..."
    cd "$PROJECT_ROOT/idp-cli"
    if [ "$SKIP_TESTS" = false ]; then
        cargo test
    fi
    cargo build --release --bin idp-cli-lambda --features lambda
    log_success "CLI build completed"
else
    log_warn "Skipping build phase"
fi

# Package Phase
if [ "$SKIP_PACKAGE" = false ]; then
    log_section "Package Phase"
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
    log_success "ECR login successful"
    
    # Package API
    log_info "Packaging API Lambda container..."
    cd "$PROJECT_ROOT/idp-api"
    
    # Ensure ECR repository exists
    aws ecr describe-repositories --repository-names idp-api-lambda --region "$AWS_REGION" &>/dev/null || \
        aws ecr create-repository --repository-name idp-api-lambda --region "$AWS_REGION"
    
    docker build -f Dockerfile.lambda -t "$ECR_REGISTRY/idp-api-lambda:$IMAGE_TAG" .
    docker push "$ECR_REGISTRY/idp-api-lambda:$IMAGE_TAG"
    docker tag "$ECR_REGISTRY/idp-api-lambda:$IMAGE_TAG" "$ECR_REGISTRY/idp-api-lambda:latest"
    docker push "$ECR_REGISTRY/idp-api-lambda:latest"
    log_success "API image pushed: $ECR_REGISTRY/idp-api-lambda:$IMAGE_TAG"
    
    # Package CLI
    log_info "Packaging CLI Lambda container..."
    cd "$PROJECT_ROOT/idp-cli"
    
    # Ensure ECR repository exists
    aws ecr describe-repositories --repository-names idp-cli-lambda --region "$AWS_REGION" &>/dev/null || \
        aws ecr create-repository --repository-name idp-cli-lambda --region "$AWS_REGION"
    
    docker build -f Dockerfile.lambda -t "$ECR_REGISTRY/idp-cli-lambda:$IMAGE_TAG" .
    docker push "$ECR_REGISTRY/idp-cli-lambda:$IMAGE_TAG"
    docker tag "$ECR_REGISTRY/idp-cli-lambda:$IMAGE_TAG" "$ECR_REGISTRY/idp-cli-lambda:latest"
    docker push "$ECR_REGISTRY/idp-cli-lambda:latest"
    log_success "CLI image pushed: $ECR_REGISTRY/idp-cli-lambda:$IMAGE_TAG"
else
    log_warn "Skipping package phase"
fi

# Deploy Phase
if [ "$SKIP_DEPLOY" = false ]; then
    log_section "Deploy Phase"
    
    cd "$PROJECT_ROOT/terraform"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    BACKEND_KEY="${TERRAFORM_BACKEND_KEY:-visuidp/aws-deployment}/${ENVIRONMENT}/terraform.tfstate"
    terraform init -backend-config="key=$BACKEND_KEY"
    log_success "Terraform initialized"
    
    # Terraform Plan
    log_info "Running Terraform plan..."
    terraform plan \
        -var-file="${ENVIRONMENT}.tfvars" \
        -var="image_tag=$IMAGE_TAG" \
        -out=tfplan
    log_success "Terraform plan completed"
    
    # Terraform Apply
    if [ "$PLAN_ONLY" = false ]; then
        log_info "Applying Terraform changes..."
        terraform apply -auto-approve tfplan
        log_success "Terraform apply completed"
        
        # Get outputs
        API_URL=$(terraform output -raw api_gateway_url)
        CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
        S3_BUCKET=$(terraform output -raw ui_bucket_name)
        CLOUDFRONT_DIST=$(terraform output -raw cloudfront_distribution_id)
        
        log_info "API URL: $API_URL"
        log_info "CloudFront URL: $CLOUDFRONT_URL"
        
        # Deploy UI to S3
        log_info "Deploying UI to S3..."
        cd "$PROJECT_ROOT/idp-ui"
        chmod +x deploy-to-s3.sh
        ./deploy-to-s3.sh \
            --bucket "$S3_BUCKET" \
            --distribution "$CLOUDFRONT_DIST" \
            --skip-build
        log_success "UI deployed to S3"
        
        # Save deployment info
        DEPLOY_INFO_FILE="$PROJECT_ROOT/deployment-info-${ENVIRONMENT}.txt"
        cat > "$DEPLOY_INFO_FILE" << EOF
Deployment Information
======================
Environment: $ENVIRONMENT
Timestamp: $(date)
Image Tag: $IMAGE_TAG
API URL: $API_URL
CloudFront URL: $CLOUDFRONT_URL
S3 Bucket: $S3_BUCKET
CloudFront Distribution: $CLOUDFRONT_DIST
EOF
        log_success "Deployment info saved to $DEPLOY_INFO_FILE"
    else
        log_warn "Plan-only mode: skipping apply"
    fi
else
    log_warn "Skipping deploy phase"
fi

# Smoke Tests
if [ "$SKIP_SMOKE" = false ] && [ "$PLAN_ONLY" = false ] && [ "$SKIP_DEPLOY" = false ]; then
    log_section "Smoke Tests"
    
    cd "$PROJECT_ROOT"
    
    # Get deployment URLs
    cd terraform
    API_URL=$(terraform output -raw api_gateway_url)
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
    
    # Run smoke tests
    cd "$PROJECT_ROOT"
    export API_URL
    export UI_URL="$CLOUDFRONT_URL"
    
    if [ -f "scripts/smoke-tests.sh" ]; then
        chmod +x scripts/smoke-tests.sh
        ./scripts/smoke-tests.sh
        log_success "Smoke tests completed"
    else
        log_warn "Smoke test script not found, skipping"
    fi
else
    log_warn "Skipping smoke tests"
fi

# Summary
log_section "Deployment Summary"
log_success "Deployment to $ENVIRONMENT completed successfully!"
echo ""
log_info "Environment: $ENVIRONMENT"
log_info "Image Tag: $IMAGE_TAG"
if [ "$PLAN_ONLY" = false ] && [ "$SKIP_DEPLOY" = false ]; then
    log_info "API URL: $API_URL"
    log_info "CloudFront URL: $CLOUDFRONT_URL"
fi
echo ""
log_success "All done! 🚀"
