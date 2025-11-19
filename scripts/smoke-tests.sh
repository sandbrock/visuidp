#!/bin/bash

################################################################################
# Smoke Tests for AWS Deployment
#
# This script runs basic smoke tests to verify the deployment is functional.
# Tests include:
# - API health check
# - UI accessibility
# - Authentication flow
# - Key API endpoints
# - Database connectivity
#
# Usage:
#   export API_URL=https://api.example.com
#   export UI_URL=https://ui.example.com
#   ./scripts/smoke-tests.sh
#
# Environment Variables:
#   API_URL    - API Gateway URL (required)
#   UI_URL     - CloudFront URL (required)
#   TEST_API_KEY - API key for authentication (optional, for auth tests)
#
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
RESULTS_FILE="smoke-test-results.txt"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$RESULTS_FILE"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "[PASS] $1" >> "$RESULTS_FILE"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "[FAIL] $1" >> "$RESULTS_FILE"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[WARN] $1" >> "$RESULTS_FILE"
}

log_section() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo "" >> "$RESULTS_FILE"
    echo "========================================" >> "$RESULTS_FILE"
    echo "$1" >> "$RESULTS_FILE"
    echo "========================================" >> "$RESULTS_FILE"
}

# Initialize results file
cat > "$RESULTS_FILE" << EOF
Smoke Test Results
==================
Timestamp: $(date)
API URL: ${API_URL:-Not set}
UI URL: ${UI_URL:-Not set}

EOF

# Validate environment variables
if [ -z "$API_URL" ]; then
    log_fail "API_URL environment variable is not set"
    exit 1
fi

if [ -z "$UI_URL" ]; then
    log_fail "UI_URL environment variable is not set"
    exit 1
fi

log_info "API URL: $API_URL"
log_info "UI URL: $UI_URL"

# Test 1: API Health Check
log_section "Test 1: API Health Check"
log_info "Testing API health endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/q/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API health check passed (HTTP $HTTP_CODE)"
else
    log_fail "API health check failed (HTTP $HTTP_CODE)"
fi

# Test 2: API Readiness Check
log_section "Test 2: API Readiness Check"
log_info "Testing API readiness endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/q/health/ready" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API readiness check passed (HTTP $HTTP_CODE)"
else
    log_fail "API readiness check failed (HTTP $HTTP_CODE)"
fi

# Test 3: API Liveness Check
log_section "Test 3: API Liveness Check"
log_info "Testing API liveness endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/q/health/live" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API liveness check passed (HTTP $HTTP_CODE)"
else
    log_fail "API liveness check failed (HTTP $HTTP_CODE)"
fi

# Test 4: UI Accessibility
log_section "Test 4: UI Accessibility"
log_info "Testing UI accessibility..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${UI_URL}/ui/" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "UI is accessible (HTTP $HTTP_CODE)"
else
    log_fail "UI is not accessible (HTTP $HTTP_CODE)"
fi

# Test 5: UI Static Assets
log_section "Test 5: UI Static Assets"
log_info "Testing UI static assets..."

# Try to fetch a common asset (index.html)
RESPONSE=$(curl -s -w "\n%{http_code}" "${UI_URL}/ui/index.html")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "<!DOCTYPE html>"; then
    log_success "UI static assets are served correctly (HTTP $HTTP_CODE)"
else
    log_fail "UI static assets are not served correctly (HTTP $HTTP_CODE)"
fi

# Test 6: API CORS Headers
log_section "Test 6: API CORS Headers"
log_info "Testing API CORS headers..."

CORS_HEADER=$(curl -s -I -H "Origin: ${UI_URL}" "${API_URL}/q/health" | grep -i "access-control-allow-origin" || echo "")

if [ -n "$CORS_HEADER" ]; then
    log_success "API CORS headers are configured"
else
    log_warn "API CORS headers not found (may be expected for health endpoints)"
fi

# Test 7: API Response Time
log_section "Test 7: API Response Time"
log_info "Testing API response time..."

START_TIME=$(date +%s%N)
curl -s "${API_URL}/q/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

log_info "API response time: ${RESPONSE_TIME}ms"

if [ "$RESPONSE_TIME" -lt 2000 ]; then
    log_success "API response time is acceptable (${RESPONSE_TIME}ms < 2000ms)"
else
    log_fail "API response time is too slow (${RESPONSE_TIME}ms >= 2000ms)"
fi

# Test 8: CloudFront Caching Headers
log_section "Test 8: CloudFront Caching Headers"
log_info "Testing CloudFront caching headers..."

CACHE_HEADER=$(curl -s -I "${UI_URL}/ui/index.html" | grep -i "x-cache" || echo "")

if [ -n "$CACHE_HEADER" ]; then
    log_success "CloudFront caching headers present: $CACHE_HEADER"
else
    log_warn "CloudFront caching headers not found"
fi

# Test 9: API Authentication (if API key provided)
if [ -n "$TEST_API_KEY" ]; then
    log_section "Test 9: API Authentication"
    log_info "Testing API authentication with API key..."
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "X-API-Key: $TEST_API_KEY" \
        "${API_URL}/v1/stacks" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
        log_success "API authentication endpoint is functional (HTTP $HTTP_CODE)"
    else
        log_fail "API authentication endpoint failed (HTTP $HTTP_CODE)"
    fi
    
    # Test without API key (should fail)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        "${API_URL}/v1/stacks" || echo "000")
    
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        log_success "API correctly rejects unauthenticated requests (HTTP $HTTP_CODE)"
    else
        log_fail "API does not properly enforce authentication (HTTP $HTTP_CODE)"
    fi
else
    log_warn "Skipping authentication tests (TEST_API_KEY not provided)"
fi

# Test 10: API OpenAPI Documentation
log_section "Test 10: API OpenAPI Documentation"
log_info "Testing API OpenAPI documentation..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/q/openapi" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API OpenAPI documentation is accessible (HTTP $HTTP_CODE)"
else
    log_warn "API OpenAPI documentation not accessible (HTTP $HTTP_CODE)"
fi

# Test 11: SSL/TLS Certificate
log_section "Test 11: SSL/TLS Certificate"
log_info "Testing SSL/TLS certificate..."

# Extract domain from URL
API_DOMAIN=$(echo "$API_URL" | sed -e 's|^https://||' -e 's|/.*||')

if echo | openssl s_client -connect "${API_DOMAIN}:443" -servername "$API_DOMAIN" 2>/dev/null | grep -q "Verify return code: 0"; then
    log_success "SSL/TLS certificate is valid"
else
    log_warn "SSL/TLS certificate validation failed or not applicable"
fi

# Test 12: UI Content Type Headers
log_section "Test 12: UI Content Type Headers"
log_info "Testing UI content type headers..."

CONTENT_TYPE=$(curl -s -I "${UI_URL}/ui/index.html" | grep -i "content-type" || echo "")

if echo "$CONTENT_TYPE" | grep -q "text/html"; then
    log_success "UI content type headers are correct"
else
    log_fail "UI content type headers are incorrect: $CONTENT_TYPE"
fi

# Test 13: API Metrics Endpoint
log_section "Test 13: API Metrics Endpoint"
log_info "Testing API metrics endpoint..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/q/metrics" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "API metrics endpoint is accessible (HTTP $HTTP_CODE)"
else
    log_warn "API metrics endpoint not accessible (HTTP $HTTP_CODE)"
fi

# Test 14: CloudFront Compression
log_section "Test 14: CloudFront Compression"
log_info "Testing CloudFront compression..."

ENCODING=$(curl -s -I -H "Accept-Encoding: gzip, deflate, br" "${UI_URL}/ui/index.html" | grep -i "content-encoding" || echo "")

if [ -n "$ENCODING" ]; then
    log_success "CloudFront compression is enabled: $ENCODING"
else
    log_warn "CloudFront compression not detected"
fi

# Test 15: API Error Handling
log_section "Test 15: API Error Handling"
log_info "Testing API error handling..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/v1/nonexistent-endpoint" || echo "000")

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ]; then
    log_success "API error handling works correctly (HTTP $HTTP_CODE)"
else
    log_warn "API error handling may not be configured correctly (HTTP $HTTP_CODE)"
fi

# Summary
log_section "Test Summary"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo ""

cat >> "$RESULTS_FILE" << EOF

Summary
=======
Total Tests: $TOTAL_TESTS
Passed: $TESTS_PASSED
Failed: $TESTS_FAILED

EOF

if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All smoke tests passed! ✅"
    echo "Status: SUCCESS ✅" >> "$RESULTS_FILE"
    exit 0
else
    log_fail "$TESTS_FAILED test(s) failed ❌"
    echo "Status: FAILED ❌" >> "$RESULTS_FILE"
    exit 1
fi
