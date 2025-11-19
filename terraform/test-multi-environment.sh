#!/bin/bash
# Test script for multi-environment Terraform configuration
# This script validates that all environment configurations are valid

set -eo pipefail

echo "=========================================="
echo "Multi-Environment Configuration Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 1: Terraform version
echo "Test 1: Checking Terraform version..."
if terraform version > /dev/null 2>&1; then
    TERRAFORM_VERSION=$(terraform version | head -1 | awk '{print $2}')
    print_result 0 "Terraform installed (version $TERRAFORM_VERSION)"
else
    print_result 1 "Terraform not installed or not in PATH"
fi
echo ""

# Test 2: Terraform format check
echo "Test 2: Checking Terraform formatting..."
if terraform fmt -check -recursive > /dev/null 2>&1; then
    print_result 0 "All Terraform files are properly formatted"
else
    echo -e "${YELLOW}Warning: Some files need formatting. Running terraform fmt...${NC}"
    terraform fmt -recursive
    print_result 0 "Terraform files formatted"
fi
echo ""

# Test 3: Terraform validation
echo "Test 3: Validating Terraform configuration..."
terraform init -backend=false > /dev/null 2>&1
if terraform validate > /dev/null 2>&1; then
    print_result 0 "Terraform configuration is valid"
else
    print_result 1 "Terraform configuration validation failed"
fi
echo ""

# Test 4: Check tfvars files exist
echo "Test 4: Checking environment tfvars files..."
ENVIRONMENTS=("dev" "test" "staging" "prod")
for env in "${ENVIRONMENTS[@]}"; do
    if [ -f "${env}.tfvars" ]; then
        print_result 0 "Found ${env}.tfvars"
    else
        print_result 1 "Missing ${env}.tfvars"
    fi
done
echo ""

# Test 5: Validate each environment configuration
echo "Test 5: Validating environment-specific configurations..."
for env in "${ENVIRONMENTS[@]}"; do
    echo "  Validating ${env} environment..."
    
    # Check if environment value is set correctly in tfvars
    if grep -q "^environment[[:space:]]*=[[:space:]]*\"${env}\"" "${env}.tfvars"; then
        print_result 0 "${env}.tfvars has correct environment value"
    else
        print_result 1 "${env}.tfvars missing or incorrect environment value"
    fi
    
    # Check required variables are present
    REQUIRED_VARS=("environment" "aws_region")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}[[:space:]]*=" "${env}.tfvars"; then
            print_result 0 "${env}.tfvars contains ${var}"
        else
            print_result 1 "${env}.tfvars missing ${var}"
        fi
    done
done
echo ""

# Test 6: Check documentation exists
echo "Test 6: Checking documentation..."
DOCS=("README.md" "MULTI_ENVIRONMENT_GUIDE.md" "MULTI_ENVIRONMENT_QUICK_REFERENCE.md" "QUICK_START.md")
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        print_result 0 "Found $doc"
    else
        print_result 1 "Missing $doc"
    fi
done
echo ""

# Test 7: Check backend configuration examples
echo "Test 7: Checking backend configuration..."
if [ -f "backend-config.hcl.example" ]; then
    print_result 0 "Found backend-config.hcl.example"
else
    print_result 1 "Missing backend-config.hcl.example"
fi
echo ""

# Test 8: Validate variable constraints
echo "Test 8: Validating variable constraints..."

# Check environment variable validation
if grep -q 'contains(\["dev", "test", "staging", "prod"\], var.environment)' variables.tf; then
    print_result 0 "Environment variable validation includes all environments"
else
    print_result 1 "Environment variable validation missing or incorrect"
fi

# Check lambda memory validation
if grep -q 'var.lambda_memory_size >= 128 && var.lambda_memory_size <= 10240' variables.tf; then
    print_result 0 "Lambda memory validation is correct"
else
    print_result 1 "Lambda memory validation missing or incorrect"
fi
echo ""

# Test 9: Check module structure
echo "Test 9: Checking module structure..."
MODULES=("dynamodb" "lambda" "api-gateway" "cli-gateway" "frontend" "monitoring" "parameter-store")
for module in "${MODULES[@]}"; do
    if [ -d "modules/${module}" ]; then
        print_result 0 "Found module: ${module}"
        
        # Check for required module files
        if [ -f "modules/${module}/main.tf" ]; then
            print_result 0 "  ${module} has main.tf"
        else
            print_result 1 "  ${module} missing main.tf"
        fi
        
        if [ -f "modules/${module}/variables.tf" ]; then
            print_result 0 "  ${module} has variables.tf"
        else
            print_result 1 "  ${module} missing variables.tf"
        fi
        
        if [ -f "modules/${module}/outputs.tf" ]; then
            print_result 0 "  ${module} has outputs.tf"
        else
            print_result 1 "  ${module} missing outputs.tf"
        fi
    else
        print_result 1 "Missing module: ${module}"
    fi
done
echo ""

# Test 10: Check environment-specific settings
echo "Test 10: Validating environment-specific settings..."

# Dev should have shorter log retention
if grep -q "log_retention_days[[:space:]]*=[[:space:]]*3" dev.tfvars; then
    print_result 0 "Dev has short log retention (3 days)"
else
    print_result 1 "Dev log retention not set correctly"
fi

# Prod should have longer log retention
if grep -q "log_retention_days[[:space:]]*=[[:space:]]*7" prod.tfvars; then
    print_result 0 "Prod has longer log retention (7 days)"
else
    print_result 1 "Prod log retention not set correctly"
fi

# Prod should have higher memory
if grep -q "lambda_memory_size[[:space:]]*=[[:space:]]*1024" prod.tfvars; then
    print_result 0 "Prod has higher Lambda memory (1024 MB)"
else
    print_result 1 "Prod Lambda memory not set correctly"
fi

# Dev should have PITR disabled
if grep -q "enable_point_in_time_recovery[[:space:]]*=[[:space:]]*false" dev.tfvars; then
    print_result 0 "Dev has PITR disabled for cost savings"
else
    print_result 1 "Dev PITR setting not correct"
fi

# Prod should have PITR enabled
if grep -q "enable_point_in_time_recovery[[:space:]]*=[[:space:]]*true" prod.tfvars; then
    print_result 0 "Prod has PITR enabled"
else
    print_result 1 "Prod PITR setting not correct"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Multi-environment configuration is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Configure backend-config.hcl for each environment"
    echo "2. Update tfvars files with your Entra ID credentials"
    echo "3. Initialize Terraform: terraform init -backend-config=backend-config-dev.hcl"
    echo "4. Deploy to dev: terraform apply -var-file=dev.tfvars"
    echo ""
    echo "See MULTI_ENVIRONMENT_GUIDE.md for detailed instructions."
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
