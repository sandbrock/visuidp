#!/bin/bash

# Test script for API Gateway JWT validation with Entra ID
# This script tests JWT token validation against the deployed API Gateway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_ENDPOINT="${API_ENDPOINT:-}"
ENTRA_ID_TENANT_ID="${ENTRA_ID_TENANT_ID:-}"
ENTRA_ID_CLIENT_ID="${ENTRA_ID_CLIENT_ID:-}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed"
        exit 1
    fi
    
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        print_info "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    print_success "All prerequisites installed"
}

# Function to get API endpoint from Terraform output
get_api_endpoint() {
    if [ -z "$API_ENDPOINT" ]; then
        print_info "Getting API endpoint from Terraform output..."
        
        if [ ! -f "terraform.tfstate" ]; then
            print_error "terraform.tfstate not found. Run 'terraform apply' first."
            exit 1
        fi
        
        API_ENDPOINT=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
        
        if [ -z "$API_ENDPOINT" ]; then
            print_error "Could not get API endpoint from Terraform output"
            print_info "Please set API_ENDPOINT environment variable"
            exit 1
        fi
    fi
    
    print_success "API Endpoint: $API_ENDPOINT"
}

# Function to get Entra ID configuration from Terraform
get_entra_id_config() {
    if [ -z "$ENTRA_ID_TENANT_ID" ] || [ -z "$ENTRA_ID_CLIENT_ID" ]; then
        print_info "Getting Entra ID configuration from Terraform..."
        
        ENTRA_ID_TENANT_ID=$(terraform output -raw entra_id_tenant_id 2>/dev/null || echo "")
        ENTRA_ID_CLIENT_ID=$(terraform output -raw entra_id_client_id 2>/dev/null || echo "")
        
        if [ -z "$ENTRA_ID_TENANT_ID" ] || [ -z "$ENTRA_ID_CLIENT_ID" ]; then
            print_error "Could not get Entra ID configuration from Terraform"
            print_info "Please set ENTRA_ID_TENANT_ID and ENTRA_ID_CLIENT_ID environment variables"
            exit 1
        fi
    fi
    
    print_success "Entra ID Tenant ID: $ENTRA_ID_TENANT_ID"
    print_success "Entra ID Client ID: $ENTRA_ID_CLIENT_ID"
}

# Function to obtain JWT token from Entra ID
obtain_jwt_token() {
    print_info "Obtaining JWT token from Entra ID..."
    
    # Check if user is logged in to Azure CLI
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure CLI"
        print_info "Run 'az login' to authenticate"
        exit 1
    fi
    
    # Get access token for the application
    TOKEN=$(az account get-access-token \
        --resource "api://${ENTRA_ID_CLIENT_ID}" \
        --query accessToken \
        --output tsv 2>/dev/null || echo "")
    
    if [ -z "$TOKEN" ]; then
        print_error "Failed to obtain JWT token"
        print_info "Ensure the application is registered in Entra ID"
        print_info "Resource URI: api://${ENTRA_ID_CLIENT_ID}"
        exit 1
    fi
    
    print_success "JWT token obtained"
    
    # Decode and display token claims
    print_info "Token claims:"
    echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq . || true
}

# Test 1: Request without authentication (should fail)
test_no_auth() {
    print_info "Test 1: Request without authentication (should return 401)"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_ENDPOINT}/v1/stacks" \
        -H "Content-Type: application/json")
    
    if [ "$HTTP_CODE" = "401" ]; then
        print_success "Test 1 PASSED: Received 401 Unauthorized as expected"
        return 0
    else
        print_error "Test 1 FAILED: Expected 401, got $HTTP_CODE"
        return 1
    fi
}

# Test 2: Request with invalid token (should fail)
test_invalid_token() {
    print_info "Test 2: Request with invalid token (should return 401)"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "${API_ENDPOINT}/v1/stacks" \
        -H "Authorization: Bearer invalid-token-12345" \
        -H "Content-Type: application/json")
    
    if [ "$HTTP_CODE" = "401" ]; then
        print_success "Test 2 PASSED: Received 401 Unauthorized as expected"
        return 0
    else
        print_error "Test 2 FAILED: Expected 401, got $HTTP_CODE"
        return 1
    fi
}

# Test 3: Request with valid JWT token (should succeed)
test_valid_token() {
    print_info "Test 3: Request with valid JWT token (should return 200 or 404)"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X GET "${API_ENDPOINT}/v1/stacks" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    # Accept 200 (success) or 404 (not found) as valid responses
    # 404 is acceptable if no stacks exist yet
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Test 3 PASSED: Received $HTTP_CODE (authentication successful)"
        if [ "$HTTP_CODE" = "200" ]; then
            print_info "Response body:"
            echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        fi
        return 0
    else
        print_error "Test 3 FAILED: Expected 200 or 404, got $HTTP_CODE"
        print_info "Response body:"
        echo "$BODY"
        return 1
    fi
}

# Test 4: Verify JWT claims are passed to Lambda
test_jwt_claims() {
    print_info "Test 4: Verify JWT claims are accessible (check Lambda logs)"
    
    # Make request with valid token
    curl -s -X GET "${API_ENDPOINT}/v1/stacks" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" > /dev/null
    
    print_success "Test 4: Request sent. Check Lambda CloudWatch logs to verify JWT claims are accessible"
    print_info "Expected claims: email, sub, name, oid"
}

# Test 5: Test CORS preflight request
test_cors_preflight() {
    print_info "Test 5: Test CORS preflight request"
    
    RESPONSE=$(curl -s -i -X OPTIONS "${API_ENDPOINT}/v1/stacks" \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization")
    
    if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
        print_success "Test 5 PASSED: CORS headers present"
        echo "$RESPONSE" | grep "Access-Control-Allow"
        return 0
    else
        print_error "Test 5 FAILED: CORS headers missing"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "API Gateway JWT Validation Test Suite"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    get_api_endpoint
    get_entra_id_config
    obtain_jwt_token
    
    echo ""
    echo "=========================================="
    echo "Running Tests"
    echo "=========================================="
    echo ""
    
    PASSED=0
    FAILED=0
    
    if test_no_auth; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    echo ""
    
    if test_invalid_token; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    echo ""
    
    if test_valid_token; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    echo ""
    
    test_jwt_claims
    echo ""
    
    if test_cors_preflight; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    echo ""
    
    echo "=========================================="
    echo "Test Results"
    echo "=========================================="
    print_success "Passed: $PASSED"
    if [ $FAILED -gt 0 ]; then
        print_error "Failed: $FAILED"
        exit 1
    else
        print_success "All tests passed!"
        exit 0
    fi
}

# Run main function
main
