#!/bin/bash

################################################################################
# Build script for AWS Lambda deployment
#
# This script builds a GraalVM native image and creates a Lambda container image
# optimized for fast cold starts and minimal memory footprint.
#
# Usage:
#   ./build-lambda.sh                    # Build native image only
#   ./build-lambda.sh --docker           # Build native image + Docker image
#   ./build-lambda.sh --docker --push    # Build + push to ECR
#
# Environment Variables:
#   ECR_REPOSITORY    - ECR repository URI (e.g., 123456789.dkr.ecr.us-east-1.amazonaws.com/idp-api)
#   AWS_REGION        - AWS region for ECR (default: us-east-1)
#   IMAGE_TAG         - Docker image tag (default: latest)
#   SKIP_TESTS        - Skip tests during build (default: true)
#
# Requirements:
#   - Docker installed and running
#   - AWS CLI configured (for ECR push)
#   - Maven 3.8+
#   - Java 21
################################################################################

set -e

# Configuration
IMAGE_NAME="idp-api-lambda"
IMAGE_TAG="${IMAGE_TAG:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SKIP_TESTS="${SKIP_TESTS:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
BUILD_DOCKER=false
PUSH_TO_ECR=false

for arg in "$@"; do
    case $arg in
        --docker)
            BUILD_DOCKER=true
            ;;
        --push)
            PUSH_TO_ECR=true
            BUILD_DOCKER=true
            ;;
        --help)
            echo "Usage: $0 [--docker] [--push]"
            echo ""
            echo "Options:"
            echo "  --docker    Build Docker image for Lambda"
            echo "  --push      Push Docker image to ECR (implies --docker)"
            echo "  --help      Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown argument: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate prerequisites
if [ "$BUILD_DOCKER" = true ]; then
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
fi

if [ "$PUSH_TO_ECR" = true ]; then
    if [ -z "$ECR_REPOSITORY" ]; then
        log_error "ECR_REPOSITORY environment variable is not set"
        log_info "Example: export ECR_REPOSITORY=123456789.dkr.ecr.us-east-1.amazonaws.com/idp-api"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
fi

# Build native image
log_info "Building Quarkus native image for Lambda..."
log_info "Profile: lambda"
log_info "Skip tests: $SKIP_TESTS"

if [ "$SKIP_TESTS" = "true" ]; then
    ./mvnw clean package -Pnative -DskipTests -Dquarkus.profile=lambda
else
    ./mvnw clean package -Pnative -Dquarkus.profile=lambda
fi

if [ $? -eq 0 ]; then
    log_info "Native image build complete!"
    RUNNER_PATH=$(find target -name "*-runner" -type f)
    if [ -n "$RUNNER_PATH" ]; then
        RUNNER_SIZE=$(du -h "$RUNNER_PATH" | cut -f1)
        log_info "Native executable: $RUNNER_PATH (Size: $RUNNER_SIZE)"
    fi
else
    log_error "Native image build failed"
    exit 1
fi

# Build Docker image
if [ "$BUILD_DOCKER" = true ]; then
    log_info "Building Lambda container image..."
    log_info "Image name: $IMAGE_NAME:$IMAGE_TAG"
    
    docker build -f Dockerfile.lambda -t $IMAGE_NAME:$IMAGE_TAG .
    
    if [ $? -eq 0 ]; then
        log_info "Lambda container image built successfully: $IMAGE_NAME:$IMAGE_TAG"
        
        # Show image size
        IMAGE_SIZE=$(docker images $IMAGE_NAME:$IMAGE_TAG --format "{{.Size}}")
        log_info "Image size: $IMAGE_SIZE"
    else
        log_error "Docker image build failed"
        exit 1
    fi
fi

# Push to ECR
if [ "$PUSH_TO_ECR" = true ]; then
    log_info "Pushing image to ECR: $ECR_REPOSITORY"
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY
    
    if [ $? -ne 0 ]; then
        log_error "ECR login failed"
        exit 1
    fi
    
    # Tag image
    log_info "Tagging image..."
    docker tag $IMAGE_NAME:$IMAGE_TAG $ECR_REPOSITORY:$IMAGE_TAG
    
    # Push image
    log_info "Pushing image to ECR..."
    docker push $ECR_REPOSITORY:$IMAGE_TAG
    
    if [ $? -eq 0 ]; then
        log_info "Image pushed successfully to ECR"
        log_info "Image URI: $ECR_REPOSITORY:$IMAGE_TAG"
        
        # Also tag and push as 'latest' if not already
        if [ "$IMAGE_TAG" != "latest" ]; then
            log_info "Also tagging as 'latest'..."
            docker tag $IMAGE_NAME:$IMAGE_TAG $ECR_REPOSITORY:latest
            docker push $ECR_REPOSITORY:latest
            log_info "Latest tag pushed: $ECR_REPOSITORY:latest"
        fi
    else
        log_error "Failed to push image to ECR"
        exit 1
    fi
fi

log_info "Build complete!"
log_info ""
log_info "Next steps:"
if [ "$BUILD_DOCKER" = false ]; then
    log_info "  1. Build Docker image: ./build-lambda.sh --docker"
    log_info "  2. Test locally: docker run -p 9000:8080 $IMAGE_NAME:$IMAGE_TAG"
    log_info "  3. Push to ECR: ./build-lambda.sh --docker --push"
elif [ "$PUSH_TO_ECR" = false ]; then
    log_info "  1. Test locally: docker run -p 9000:8080 $IMAGE_NAME:$IMAGE_TAG"
    log_info "  2. Push to ECR: ./build-lambda.sh --docker --push"
else
    log_info "  1. Deploy Lambda function with Terraform"
    log_info "  2. Update Lambda function code: aws lambda update-function-code --function-name <name> --image-uri $ECR_REPOSITORY:$IMAGE_TAG"
fi
