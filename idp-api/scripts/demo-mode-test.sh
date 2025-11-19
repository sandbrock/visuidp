#!/bin/bash

# Demo Mode Test Script
# Tests the demo mode authentication mechanism

set -e

echo "================================"
echo "Demo Mode Test Script"
echo "================================"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:8082/api}"
DEMO_MODE="${DEMO_MODE:-true}"

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Demo Mode: $DEMO_MODE"
echo ""

# Test 1: Health check without authentication
echo "Test 1: Health check without authentication"
echo "  Request: GET $API_URL/v1/health"
response=$(curl -s -w "\n%{http_code}" "$API_URL/v1/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "  ✅ SUCCESS: Health check returned 200"
    echo "  Response: $body"
else
    echo "  ❌ FAILED: Expected 200, got $http_code"
    echo "  Response: $body"
    exit 1
fi
echo ""

# Test 2: List stacks without authentication
echo "Test 2: List stacks without authentication"
echo "  Request: GET $API_URL/v1/stacks"
response=$(curl -s -w "\n%{http_code}" "$API_URL/v1/stacks")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "  ✅ SUCCESS: Stacks endpoint returned 200"
    echo "  Response: $body"
else
    echo "  ❌ FAILED: Expected 200, got $http_code"
    echo "  Response: $body"
    exit 1
fi
echo ""

# Test 3: Admin endpoint without authentication
echo "Test 3: Admin endpoint without authentication"
echo "  Request: GET $API_URL/v1/admin/cloud-providers"
response=$(curl -s -w "\n%{http_code}" "$API_URL/v1/admin/cloud-providers")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "  ✅ SUCCESS: Admin endpoint returned 200"
    echo "  Response: $body"
else
    echo "  ❌ FAILED: Expected 200, got $http_code"
    echo "  Response: $body"
    exit 1
fi
echo ""

# Test 4: List teams without authentication
echo "Test 4: List teams without authentication"
echo "  Request: GET $API_URL/v1/teams"
response=$(curl -s -w "\n%{http_code}" "$API_URL/v1/teams")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "  ✅ SUCCESS: Teams endpoint returned 200"
    echo "  Response: $body"
else
    echo "  ❌ FAILED: Expected 200, got $http_code"
    echo "  Response: $body"
    exit 1
fi
echo ""

# Test 5: List blueprints without authentication
echo "Test 5: List blueprints without authentication"
echo "  Request: GET $API_URL/v1/blueprints"
response=$(curl -s -w "\n%{http_code}" "$API_URL/v1/blueprints")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo "  ✅ SUCCESS: Blueprints endpoint returned 200"
    echo "  Response: $body"
else
    echo "  ❌ FAILED: Expected 200, got $http_code"
    echo "  Response: $body"
    exit 1
fi
echo ""

echo "================================"
echo "All tests passed! ✅"
echo "================================"
echo ""
echo "Demo mode is working correctly."
echo "All endpoints are accessible without authentication."
echo ""
