#!/bin/bash
set -e

echo "Building IDP CLI for AWS Lambda deployment..."

# Determine build method
BUILD_METHOD=${1:-"container"}

if [ "$BUILD_METHOD" = "container" ]; then
    echo "Building Lambda container image..."
    
    # Build the Docker image
    docker build -f Dockerfile.lambda -t idp-cli-lambda:latest .
    
    echo "✓ Lambda container image built successfully: idp-cli-lambda:latest"
    echo ""
    echo "To push to ECR:"
    echo "  1. Authenticate to ECR:"
    echo "     aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com"
    echo "  2. Tag the image:"
    echo "     docker tag idp-cli-lambda:latest <account-id>.dkr.ecr.<region>.amazonaws.com/idp-cli-lambda:latest"
    echo "  3. Push the image:"
    echo "     docker push <account-id>.dkr.ecr.<region>.amazonaws.com/idp-cli-lambda:latest"
    
elif [ "$BUILD_METHOD" = "cross" ]; then
    echo "Building with cross-compilation for x86_64-unknown-linux-musl..."
    
    # Check if cross is installed
    if ! command -v cross &> /dev/null; then
        echo "Error: 'cross' is not installed. Install it with:"
        echo "  cargo install cross"
        exit 1
    fi
    
    # Build with cross for Lambda runtime
    cross build --release --target x86_64-unknown-linux-musl --bin idp-cli-lambda --features lambda
    
    # Create deployment package
    OUTPUT_DIR="target/lambda"
    mkdir -p "$OUTPUT_DIR"
    
    # Copy binary and rename to bootstrap (required by Lambda)
    cp target/x86_64-unknown-linux-musl/release/idp-cli-lambda "$OUTPUT_DIR/bootstrap"
    
    # Create ZIP package
    cd "$OUTPUT_DIR"
    zip -j idp-cli-lambda.zip bootstrap
    cd -
    
    echo "✓ Lambda deployment package created: target/lambda/idp-cli-lambda.zip"
    echo ""
    echo "To deploy to Lambda:"
    echo "  aws lambda create-function \\"
    echo "    --function-name idp-cli \\"
    echo "    --runtime provided.al2023 \\"
    echo "    --handler bootstrap \\"
    echo "    --zip-file fileb://target/lambda/idp-cli-lambda.zip \\"
    echo "    --role <lambda-execution-role-arn>"
    
elif [ "$BUILD_METHOD" = "native" ]; then
    echo "Building native binary for Lambda (x86_64-unknown-linux-gnu)..."
    
    # Add target if not already added
    rustup target add x86_64-unknown-linux-gnu
    
    # Build for Linux
    cargo build --release --target x86_64-unknown-linux-gnu --bin idp-cli-lambda --features lambda
    
    # Create deployment package
    OUTPUT_DIR="target/lambda"
    mkdir -p "$OUTPUT_DIR"
    
    # Copy binary and rename to bootstrap
    cp target/x86_64-unknown-linux-gnu/release/idp-cli-lambda "$OUTPUT_DIR/bootstrap"
    
    # Create ZIP package
    cd "$OUTPUT_DIR"
    zip -j idp-cli-lambda.zip bootstrap
    cd -
    
    echo "✓ Lambda deployment package created: target/lambda/idp-cli-lambda.zip"
    echo ""
    echo "Note: Native builds may not work on Lambda if built on a different OS."
    echo "Consider using 'container' or 'cross' build methods for production."
    
else
    echo "Error: Unknown build method '$BUILD_METHOD'"
    echo "Usage: $0 [container|cross|native]"
    echo ""
    echo "Build methods:"
    echo "  container - Build Docker container image (recommended)"
    echo "  cross     - Cross-compile using 'cross' tool"
    echo "  native    - Native build (may not work on Lambda)"
    exit 1
fi

echo ""
echo "Build complete!"
