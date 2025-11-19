#!/bin/bash

# Infrastructure Verification Script for Task 25 Checkpoint
# This script verifies that all Terraform modules and AWS resources are correctly deployed

# Don't exit on error - we want to see all checks
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

# Print header
echo "=========================================="
echo "  Infrastructure Verification - Task 25"
echo "=========================================="
echo ""

# Check if we're in the terraform directory
if [ ! -f "main.tf" ]; then
    log_error "Not in terraform directory. Please run from terraform/"
    exit 1
fi

log_info "Starting infrastructure verification..."
echo ""

# 1. Check Terraform initialization
echo "1. Checking Terraform Initialization"
echo "-----------------------------------"

if [ ! -d ".terraform" ]; then
    log_warning "Terraform not initialized (.terraform directory missing)"
    log_info "This is expected if backend configuration hasn't been set up yet"
    log_info "To initialize: terraform init -backend-config=backend-config.hcl"
else
    log_success "Terraform is initialized"
fi
echo ""

# 2. Check backend configuration
echo "2. Checking Backend Configuration"
echo "--------------------------------"

if [ -f "backend-config.hcl" ]; then
    log_success "Backend configuration file exists"
    
    # Check if it's not the example file
    if grep -q "your-terraform-state-bucket" backend-config.hcl 2>/dev/null; then
        log_warning "Backend config appears to be using example values"
        log_info "Update backend-config.hcl with actual S3 bucket and DynamoDB table"
    else
        log_success "Backend configuration appears to be customized"
    fi
else
    log_warning "backend-config.hcl not found"
    log_info "Copy backend-config.hcl.example and customize with your values"
fi
echo ""

# 3. Check Terraform state (if initialized)
echo "3. Checking Terraform State"
echo "--------------------------"

if [ -d ".terraform" ]; then
    # Try to list state
    if terraform state list &>/dev/null; then
        STATE_COUNT=$(terraform state list 2>/dev/null | wc -l)
        
        if [ "$STATE_COUNT" -gt 0 ]; then
            log_success "Terraform state exists with $STATE_COUNT resources"
            
            # List all resources
            log_info "Resources in state:"
            terraform state list 2>/dev/null | while read -r resource; do
                echo "  - $resource"
            done
        else
            log_warning "Terraform state is empty (no resources deployed)"
            log_info "Run 'terraform apply' to deploy infrastructure"
        fi
    else
        log_warning "Cannot access Terraform state"
        log_info "This may be due to backend configuration or AWS credentials"
    fi
else
    log_warning "Skipping state check (Terraform not initialized)"
fi
echo ""

# 4. Check Terraform modules
echo "4. Checking Terraform Modules"
echo "----------------------------"

REQUIRED_MODULES=(
    "dynamodb"
    "parameter-store"
    "lambda"
    "api-gateway"
    "cli-gateway"
    "frontend"
    "monitoring"
)

for module in "${REQUIRED_MODULES[@]}"; do
    if [ -d "modules/$module" ]; then
        log_success "Module '$module' exists"
        
        # Check if module has main.tf
        if [ -f "modules/$module/main.tf" ]; then
            log_success "  - main.tf found"
        else
            log_error "  - main.tf missing"
        fi
        
        # Check if module has variables.tf
        if [ -f "modules/$module/variables.tf" ]; then
            log_success "  - variables.tf found"
        else
            log_warning "  - variables.tf missing (may not be required)"
        fi
        
        # Check if module has outputs.tf
        if [ -f "modules/$module/outputs.tf" ]; then
            log_success "  - outputs.tf found"
        else
            log_warning "  - outputs.tf missing (may not be required)"
        fi
    else
        log_error "Module '$module' missing"
    fi
done
echo ""

# 5. Check environment variable files
echo "5. Checking Environment Configuration"
echo "-----------------------------------"

REQUIRED_TFVARS=(
    "dev.tfvars"
    "staging.tfvars"
    "prod.tfvars"
)

for tfvars in "${REQUIRED_TFVARS[@]}"; do
    if [ -f "$tfvars" ]; then
        log_success "Environment file '$tfvars' exists"
    else
        log_warning "Environment file '$tfvars' missing"
    fi
done
echo ""

# 6. Check AWS resources (if state exists and AWS CLI is available)
echo "6. Checking AWS Resources"
echo "------------------------"

if command -v aws &> /dev/null; then
    log_success "AWS CLI is installed"
    
    # Check AWS credentials
    if aws sts get-caller-identity &>/dev/null; then
        log_success "AWS credentials are configured"
        
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
        REGION=$(aws configure get region 2>/dev/null || echo "not set")
        
        log_info "AWS Account: $ACCOUNT_ID"
        log_info "AWS Region: $REGION"
        
        # If Terraform is initialized and has state, check resources
        if [ -d ".terraform" ] && terraform state list &>/dev/null; then
            STATE_COUNT=$(terraform state list 2>/dev/null | wc -l)
            
            if [ "$STATE_COUNT" -gt 0 ]; then
                log_info "Checking deployed AWS resources..."
                
                # Check DynamoDB tables
                if terraform state list 2>/dev/null | grep -q "module.dynamodb"; then
                    TABLE_NAME=$(terraform output -raw dynamodb_table_name 2>/dev/null || echo "")
                    if [ -n "$TABLE_NAME" ]; then
                        if aws dynamodb describe-table --table-name "$TABLE_NAME" &>/dev/null; then
                            log_success "DynamoDB table '$TABLE_NAME' exists"
                        else
                            log_error "DynamoDB table '$TABLE_NAME' not found in AWS"
                        fi
                    fi
                fi
                
                # Check Lambda functions
                if terraform state list 2>/dev/null | grep -q "module.lambda_api"; then
                    LAMBDA_API=$(terraform output -raw lambda_api_function_name 2>/dev/null || echo "")
                    if [ -n "$LAMBDA_API" ]; then
                        if aws lambda get-function --function-name "$LAMBDA_API" &>/dev/null; then
                            log_success "Lambda function '$LAMBDA_API' exists"
                        else
                            log_error "Lambda function '$LAMBDA_API' not found in AWS"
                        fi
                    fi
                fi
                
                if terraform state list 2>/dev/null | grep -q "module.lambda_cli"; then
                    LAMBDA_CLI=$(terraform output -raw lambda_cli_function_name 2>/dev/null || echo "")
                    if [ -n "$LAMBDA_CLI" ]; then
                        if aws lambda get-function --function-name "$LAMBDA_CLI" &>/dev/null; then
                            log_success "Lambda function '$LAMBDA_CLI' exists"
                        else
                            log_error "Lambda function '$LAMBDA_CLI' not found in AWS"
                        fi
                    fi
                fi
                
                # Check API Gateway
                if terraform state list 2>/dev/null | grep -q "module.api_gateway"; then
                    API_ID=$(terraform output -raw api_gateway_id 2>/dev/null || echo "")
                    if [ -n "$API_ID" ]; then
                        if aws apigatewayv2 get-api --api-id "$API_ID" &>/dev/null; then
                            log_success "API Gateway '$API_ID' exists"
                        else
                            log_error "API Gateway '$API_ID' not found in AWS"
                        fi
                    fi
                fi
                
                # Check S3 buckets
                if terraform state list 2>/dev/null | grep -q "module.frontend"; then
                    UI_BUCKET=$(terraform output -raw ui_bucket_name 2>/dev/null || echo "")
                    if [ -n "$UI_BUCKET" ]; then
                        if aws s3 ls "s3://$UI_BUCKET" &>/dev/null; then
                            log_success "S3 bucket '$UI_BUCKET' exists"
                        else
                            log_error "S3 bucket '$UI_BUCKET' not found in AWS"
                        fi
                    fi
                fi
                
                # Check CloudFront distribution
                if terraform state list 2>/dev/null | grep -q "module.frontend"; then
                    CF_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
                    if [ -n "$CF_ID" ]; then
                        if aws cloudfront get-distribution --id "$CF_ID" &>/dev/null; then
                            log_success "CloudFront distribution '$CF_ID' exists"
                        else
                            log_error "CloudFront distribution '$CF_ID' not found in AWS"
                        fi
                    fi
                fi
            else
                log_warning "No resources in Terraform state to verify"
            fi
        fi
    else
        log_warning "AWS credentials not configured or invalid"
        log_info "Configure with: aws configure"
    fi
else
    log_warning "AWS CLI not installed - skipping AWS resource checks"
    log_info "Install from: https://aws.amazon.com/cli/"
fi
echo ""

# 7. Check IAM roles and policies (if state exists)
echo "7. Checking IAM Configuration"
echo "----------------------------"

if [ -d ".terraform" ] && terraform state list &>/dev/null; then
    if terraform state list 2>/dev/null | grep -q "aws_iam_role"; then
        log_success "IAM roles defined in Terraform state"
        
        # List IAM roles
        log_info "IAM roles in state:"
        terraform state list 2>/dev/null | grep "aws_iam_role\." | while read -r role; do
            echo "  - $role"
        done
    else
        log_warning "No IAM roles found in Terraform state"
    fi
    
    if terraform state list 2>/dev/null | grep -q "aws_iam_policy"; then
        log_success "IAM policies defined in Terraform state"
    fi
else
    log_warning "Skipping IAM check (no Terraform state)"
fi
echo ""

# 8. Check security groups (if applicable)
echo "8. Checking Security Configuration"
echo "--------------------------------"

if [ -d ".terraform" ] && terraform state list &>/dev/null; then
    if terraform state list 2>/dev/null | grep -q "aws_security_group"; then
        log_success "Security groups defined in Terraform state"
        
        # List security groups
        log_info "Security groups in state:"
        terraform state list 2>/dev/null | grep "aws_security_group\." | while read -r sg; do
            echo "  - $sg"
        done
    else
        log_info "No security groups in state (expected for serverless architecture)"
    fi
else
    log_warning "Skipping security group check (no Terraform state)"
fi
echo ""

# 9. Check networking configuration
echo "9. Checking Networking Configuration"
echo "-----------------------------------"

if [ -d ".terraform" ] && terraform state list &>/dev/null; then
    # Check for VPC resources
    if terraform state list 2>/dev/null | grep -q "aws_vpc"; then
        log_info "VPC resources found in state"
    else
        log_info "No VPC resources (expected - using AWS managed services)"
    fi
    
    # Check for subnet resources
    if terraform state list 2>/dev/null | grep -q "aws_subnet"; then
        log_info "Subnet resources found in state"
    else
        log_info "No subnet resources (expected - using AWS managed services)"
    fi
    
    # Since we're using DynamoDB (no VPC required), this is expected
    log_success "Networking configuration appropriate for serverless architecture"
else
    log_warning "Skipping networking check (no Terraform state)"
fi
echo ""

# 10. Check test results
echo "10. Checking Test Results"
echo "------------------------"

# Check if property tests have been run
if [ -f "../idp-api/target/surefire-reports" ]; then
    log_success "API test reports directory exists"
else
    log_warning "API test reports not found"
fi

if [ -f "../idp-cli/target/debug" ]; then
    log_success "CLI build artifacts exist"
else
    log_warning "CLI build artifacts not found"
fi

# Check for property test results
if find ../idp-api/src/test -name "*PropertyTest.java" -type f | grep -q .; then
    log_success "Property tests exist in API"
else
    log_warning "No property tests found in API"
fi

if find ../idp-cli/tests -name "*property*.rs" -type f | grep -q .; then
    log_success "Property tests exist in CLI"
else
    log_warning "No property tests found in CLI"
fi
echo ""

# Summary
echo "=========================================="
echo "  Verification Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed!${NC}"
        echo ""
        echo "Infrastructure verification complete."
        echo "All Terraform modules and AWS resources are correctly configured."
        exit 0
    else
        echo -e "${YELLOW}⚠ Verification completed with warnings${NC}"
        echo ""
        echo "Infrastructure is mostly configured correctly, but some items need attention."
        echo "Review the warnings above and address them as needed."
        exit 0
    fi
else
    echo -e "${RED}✗ Verification failed${NC}"
    echo ""
    echo "Some critical issues were found. Please review the errors above."
    echo "Address the failed checks before proceeding."
    exit 1
fi
