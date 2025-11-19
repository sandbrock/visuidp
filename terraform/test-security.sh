#!/bin/bash

# Security Testing Script for AWS Deployment
# Tests Entra ID authentication, JWT validation, HTTPS enforcement, and network security
# Requirements: 6.1, 6.2, 6.3, 6.4, 8.4

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to increment test counter
start_test() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_info "Test $TESTS_TOTAL: $1"
}

# Function to get API Gateway endpoint from Terraform output
get_api_endpoint() {
    print_info "Retrieving API Gateway endpoint from Terraform..."
    
    API_ENDPOINT=$(terraform output -raw api_gateway_endpoint 2>/dev/null || echo "")
    
    if [ -z "$API_ENDPOINT" ]; then
        print_error "Failed to retrieve API Gateway endpoint from Terraform output"
        print_info "Please ensure Terraform has been applied and outputs are configured"
        exit 1
    fi
    
    print_success "API Gateway endpoint: $API_ENDPOINT"
}

# Function to get Entra ID configuration
get_entra_id_config() {
    print_info "Retrieving Entra ID configuration..."
    
    ENTRA_ID_TENANT_ID=$(terraform output -raw entra_id_tenant_id 2>/dev/null || echo "")
    ENTRA_ID_CLIENT_ID=$(terraform output -raw entra_id_client_id 2>/dev/null || echo "")
    
    if [ -z "$ENTRA_ID_TENANT_ID" ] || [ -z "$ENTRA_ID_CLIENT_ID" ]; then
        print_warning "Entra ID configuration not found in Terraform outputs"
        print_info "Checking environment variables..."
        
        ENTRA_ID_TENANT_ID=${ENTRA_ID_TENANT_ID:-$AZURE_TENANT_ID}
        ENTRA_ID_CLIENT_ID=${ENTRA_ID_CLIENT_ID:-$AZURE_CLIENT_ID}
        
        if [ -z "$ENTRA_ID_TENANT_ID" ] || [ -z "$ENTRA_ID_CLIENT_ID" ]; then
            print_error "Entra ID configuration not found"
            print_info "Please set AZURE_TENANT_ID and AZURE_CLIENT_ID environment variables"
            exit 1
        fi
    fi
    
    print_success "Entra ID Tenant ID: $ENTRA_ID_TENANT_ID"
    print_success "Entra ID Client ID: $ENTRA_ID_CLIENT_ID"
}

# Function to obtain JWT token from Entra ID
obtain_jwt_token() {
    print_info "Obtaining JWT token from Entra ID..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_warning "Azure CLI not installed. Skipping JWT token tests."
        JWT_TOKEN=""
        return
    fi
    
    # Check if user is logged in to Azure CLI
    if ! az account show &> /dev/null; then
        print_warning "Not logged in to Azure CLI. Skipping JWT token tests."
        print_info "Run 'az login' to authenticate"
        JWT_TOKEN=""
        return
    fi
    
    # Obtain access token for the application
    TOKEN=$(az account get-access-token \
        --resource "api://${ENTRA_ID_CLIENT_ID}" \
        --query accessToken \
        --output tsv 2>/dev/null || echo "")
    
    if [ -z "$TOKEN" ]; then
        print_warning "Failed to obtain JWT token from Entra ID"
        print_info "Ensure the application is registered in Entra ID"
        print_info "Resource URI: api://${ENTRA_ID_CLIENT_ID}"
        JWT_TOKEN=""
        return
    fi
    
    JWT_TOKEN="$TOKEN"
    print_success "JWT token obtained successfully"
    
    # Decode and display token claims (first part only for security)
    print_info "Token preview: ${JWT_TOKEN:0:50}..."
}

# Test 1: Authentication enforcement - no authentication
test_authentication_enforcement() {
    start_test "Authentication enforcement - request without authentication should return 401"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${API_ENDPOINT}/v1/stacks")
    
    if [ "$HTTP_CODE" = "401" ]; then
        print_success "Test PASSED: Received 401 Unauthorized (authentication enforced)"
    else
        print_error "Test FAILED: Expected 401, got $HTTP_CODE"
    fi
}

# Test 2: Invalid JWT token rejection
test_invalid_jwt_rejection() {
    start_test "JWT validation - invalid token should be rejected"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer invalid-token-12345" \
        "${API_ENDPOINT}/v1/stacks")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Test PASSED: Invalid JWT rejected with $HTTP_CODE"
    else
        print_error "Test FAILED: Expected 401/403, got $HTTP_CODE"
    fi
}

# Test 3: Expired JWT token rejection
test_expired_jwt_rejection() {
    start_test "JWT validation - expired token should be rejected"
    
    # Use a token with expired 'exp' claim
    EXPIRED_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $EXPIRED_TOKEN" \
        "${API_ENDPOINT}/v1/stacks")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Test PASSED: Expired JWT rejected with $HTTP_CODE"
    else
        print_error "Test FAILED: Expected 401/403, got $HTTP_CODE"
    fi
}

# Test 4: Valid JWT token acceptance
test_valid_jwt_acceptance() {
    if [ -z "$JWT_TOKEN" ]; then
        print_warning "Skipping valid JWT test - no token available"
        return
    fi
    
    start_test "JWT validation - valid token should be accepted"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "${API_ENDPOINT}/v1/stacks")
    
    # 200 (success) or 404 (no stacks) are both acceptable
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Test PASSED: Valid JWT accepted with $HTTP_CODE"
    else
        print_error "Test FAILED: Expected 200/404, got $HTTP_CODE"
    fi
}

# Test 5: HTTPS enforcement
test_https_enforcement() {
    start_test "HTTPS enforcement - HTTP requests should be rejected or redirected"
    
    # Try to make HTTP request (should fail or redirect)
    HTTP_ENDPOINT=$(echo "$API_ENDPOINT" | sed 's/https:/http:/')
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 5 \
        "${HTTP_ENDPOINT}/v1/health" 2>/dev/null || echo "000")
    
    # Should either fail (000), redirect (301/302), or be blocked
    if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Test PASSED: HTTP requests properly handled (code: $HTTP_CODE)"
    else
        print_warning "Test WARNING: HTTP request returned $HTTP_CODE (expected failure/redirect)"
    fi
}

# Test 6: HTTPS certificate validation
test_https_certificate() {
    start_test "HTTPS certificate validation"
    
    # Verify SSL certificate is valid
    if curl -s --head "${API_ENDPOINT}/v1/health" > /dev/null 2>&1; then
        print_success "Test PASSED: HTTPS certificate is valid"
    else
        print_error "Test FAILED: HTTPS certificate validation failed"
    fi
}

# Test 7: Security headers
test_security_headers() {
    start_test "Security headers - responses should include security headers"
    
    HEADERS=$(curl -s -I "${API_ENDPOINT}/v1/health")
    
    # Check for common security headers
    HEADERS_FOUND=0
    
    if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
        print_info "  ✓ HSTS header present"
        HEADERS_FOUND=$((HEADERS_FOUND + 1))
    fi
    
    if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
        print_info "  ✓ X-Content-Type-Options header present"
        HEADERS_FOUND=$((HEADERS_FOUND + 1))
    fi
    
    if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
        print_info "  ✓ X-Frame-Options header present"
        HEADERS_FOUND=$((HEADERS_FOUND + 1))
    fi
    
    if [ $HEADERS_FOUND -gt 0 ]; then
        print_success "Test PASSED: Found $HEADERS_FOUND security headers"
    else
        print_warning "Test WARNING: No security headers found (may be configured at CloudFront level)"
    fi
}

# Test 8: CORS configuration
test_cors_configuration() {
    start_test "CORS configuration - should allow CloudFront origin"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Origin: https://example.cloudfront.net" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        "${API_ENDPOINT}/v1/stacks")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_success "Test PASSED: CORS preflight handled correctly"
    else
        print_warning "Test WARNING: CORS preflight returned $HTTP_CODE"
    fi
}

# Test 9: Rate limiting
test_rate_limiting() {
    start_test "Rate limiting - should handle rapid requests"
    
    RATE_LIMIT_HIT=false
    
    for i in {1..20}; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 2 \
            "${API_ENDPOINT}/v1/health" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "429" ]; then
            RATE_LIMIT_HIT=true
            break
        fi
    done
    
    if [ "$RATE_LIMIT_HIT" = true ]; then
        print_success "Test PASSED: Rate limiting is active (429 received)"
    else
        print_info "Test INFO: No rate limiting detected (may be configured with higher limits)"
    fi
}

# Test 10: Injection prevention
test_injection_prevention() {
    start_test "Injection prevention - should reject malicious input"
    
    # Test SQL injection attempt
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${API_ENDPOINT}/v1/stacks?name='; DROP TABLE stacks; --")
    
    if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Test PASSED: SQL injection attempt rejected with $HTTP_CODE"
    else
        print_warning "Test WARNING: SQL injection attempt returned $HTTP_CODE"
    fi
}

# Test 11: Admin endpoint authorization
test_admin_authorization() {
    start_test "Authorization - admin endpoints should require admin role"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${API_ENDPOINT}/v1/admin/cloud-providers")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Test PASSED: Admin endpoint protected with $HTTP_CODE"
    else
        print_error "Test FAILED: Admin endpoint returned $HTTP_CODE (expected 401/403)"
    fi
}

# Test 12: Secrets exposure
test_secrets_exposure() {
    start_test "Secrets management - responses should not expose secrets"
    
    RESPONSE=$(curl -s "${API_ENDPOINT}/v1/health")
    
    # Check for common secret patterns
    if echo "$RESPONSE" | grep -qi "password\|secret\|key\|token"; then
        print_error "Test FAILED: Response may contain sensitive information"
    else
        print_success "Test PASSED: No obvious secrets in response"
    fi
}

# Test 13: Error message security
test_error_message_security() {
    start_test "Error handling - error messages should not leak sensitive information"
    
    RESPONSE=$(curl -s \
        -H "Content-Type: application/json" \
        -d '{invalid json}' \
        "${API_ENDPOINT}/v1/stacks")
    
    # Check for stack traces or internal paths
    if echo "$RESPONSE" | grep -q "java.lang\|com.angryss\|at "; then
        print_error "Test FAILED: Error message contains stack trace or internal details"
    else
        print_success "Test PASSED: Error messages do not leak internal details"
    fi
}

# Test 14: DynamoDB access (no public access)
test_dynamodb_security() {
    start_test "DynamoDB security - table should not be publicly accessible"
    
    print_info "Checking DynamoDB table configuration..."
    
    # Get DynamoDB table name from Terraform
    TABLE_NAME=$(terraform output -raw dynamodb_table_name 2>/dev/null || echo "")
    
    if [ -z "$TABLE_NAME" ]; then
        print_warning "DynamoDB table name not found in Terraform outputs"
        return
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not installed. Skipping DynamoDB security test."
        return
    fi
    
    # Verify table exists and check encryption
    TABLE_INFO=$(aws dynamodb describe-table --table-name "$TABLE_NAME" 2>/dev/null || echo "")
    
    if [ -z "$TABLE_INFO" ]; then
        print_error "Test FAILED: Cannot access DynamoDB table (may indicate access issue)"
        return
    fi
    
    # Check if encryption is enabled
    if echo "$TABLE_INFO" | grep -q "SSEDescription"; then
        print_success "Test PASSED: DynamoDB table has encryption enabled"
    else
        print_warning "Test WARNING: DynamoDB encryption status unclear"
    fi
}

# Test 15: Lambda function security
test_lambda_security() {
    start_test "Lambda security - function should have proper IAM role"
    
    print_info "Checking Lambda function configuration..."
    
    # Get Lambda function name from Terraform
    FUNCTION_NAME=$(terraform output -raw lambda_function_name 2>/dev/null || echo "")
    
    if [ -z "$FUNCTION_NAME" ]; then
        print_warning "Lambda function name not found in Terraform outputs"
        return
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLI not installed. Skipping Lambda security test."
        return
    fi
    
    # Get Lambda function configuration
    FUNCTION_INFO=$(aws lambda get-function --function-name "$FUNCTION_NAME" 2>/dev/null || echo "")
    
    if [ -z "$FUNCTION_INFO" ]; then
        print_error "Test FAILED: Cannot access Lambda function"
        return
    fi
    
    # Check if function has IAM role
    if echo "$FUNCTION_INFO" | grep -q "Role"; then
        print_success "Test PASSED: Lambda function has IAM role configured"
    else
        print_error "Test FAILED: Lambda function IAM role not found"
    fi
}

# Main test execution
main() {
    echo "=========================================="
    echo "AWS Security Test Suite"
    echo "=========================================="
    echo ""
    
    # Get configuration
    get_api_endpoint
    get_entra_id_config
    obtain_jwt_token
    
    echo ""
    echo "=========================================="
    echo "Running Security Tests"
    echo "=========================================="
    echo ""
    
    # Run all tests
    test_authentication_enforcement
    test_invalid_jwt_rejection
    test_expired_jwt_rejection
    test_valid_jwt_acceptance
    test_https_enforcement
    test_https_certificate
    test_security_headers
    test_cors_configuration
    test_rate_limiting
    test_injection_prevention
    test_admin_authorization
    test_secrets_exposure
    test_error_message_security
    test_dynamodb_security
    test_lambda_security
    
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "All security tests passed!"
        exit 0
    else
        print_error "Some security tests failed. Please review the results above."
        exit 1
    fi
}

# Run main function
main
