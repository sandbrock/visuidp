#!/bin/bash

# API Verification Script for Blueprint Resource Persistence
# This script tests the API endpoints to verify resource persistence functionality

set -e

# Configuration
API_BASE="http://localhost:8082/api/v1"
USER_EMAIL="test@example.com"
BLUEPRINT_ID=""
RESOURCE_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Blueprint Resource Persistence API Tests"
echo "========================================="
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        exit 1
    fi
}

# Function to print info
print_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test 1: Get available resource types
echo "Test 1: Get available resource types for blueprints"
RESOURCE_TYPES=$(curl -s -X GET \
    "${API_BASE}/blueprint-resource-types" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -H "X-Auth-Request-User: testuser")

if echo "$RESOURCE_TYPES" | jq -e '. | length > 0' > /dev/null 2>&1; then
    print_result 0 "Resource types retrieved successfully"
    RESOURCE_TYPE_ID=$(echo "$RESOURCE_TYPES" | jq -r '.[0].id')
    print_info "Using resource type ID: $RESOURCE_TYPE_ID"
else
    print_result 1 "Failed to retrieve resource types"
fi
echo ""

# Test 2: Get available cloud providers
echo "Test 2: Get available cloud providers for blueprints"
CLOUD_PROVIDERS=$(curl -s -X GET \
    "${API_BASE}/cloud-types" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -H "X-Auth-Request-User: testuser")

if echo "$CLOUD_PROVIDERS" | jq -e '. | length > 0' > /dev/null 2>&1; then
    print_result 0 "Cloud providers retrieved successfully"
    CLOUD_PROVIDER_ID=$(echo "$CLOUD_PROVIDERS" | jq -r '.[0].id')
    print_info "Using cloud provider ID: $CLOUD_PROVIDER_ID"
else
    print_result 1 "Failed to retrieve cloud providers"
fi
echo ""

# Test 3: Create a test blueprint
echo "Test 3: Create a test blueprint"
TIMESTAMP=$(date +%s)
BLUEPRINT_NAME="Test Blueprint ${TIMESTAMP}"

CREATE_BLUEPRINT_RESPONSE=$(curl -s -X POST \
    "${API_BASE}/blueprints" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -H "X-Auth-Request-User: testuser" \
    -d "{
        \"name\": \"${BLUEPRINT_NAME}\",
        \"description\": \"Test blueprint for resource persistence verification\",
        \"supportedCloudProviderIds\": [\"${CLOUD_PROVIDER_ID}\"],
        \"resources\": []
    }")

if echo "$CREATE_BLUEPRINT_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    BLUEPRINT_ID=$(echo "$CREATE_BLUEPRINT_RESPONSE" | jq -r '.id')
    print_result 0 "Blueprint created successfully"
    print_info "Blueprint ID: $BLUEPRINT_ID"
else
    print_result 1 "Failed to create blueprint"
    echo "Response: $CREATE_BLUEPRINT_RESPONSE"
fi
echo ""

# Test 4: Add a resource to the blueprint
echo "Test 4: Add a resource to the blueprint"
RESOURCE_NAME="Test Database ${TIMESTAMP}"

UPDATE_WITH_RESOURCE=$(curl -s -X PUT \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -d "{
        \"name\": \"${BLUEPRINT_NAME}\",
        \"description\": \"Test blueprint for resource persistence verification\",
        \"supportedCloudProviderIds\": [\"${CLOUD_PROVIDER_ID}\"],
        \"resources\": [
            {
                \"name\": \"${RESOURCE_NAME}\",
                \"description\": \"Test database resource\",
                \"resourceTypeId\": \"${RESOURCE_TYPE_ID}\",
                \"cloudProviderId\": \"${CLOUD_PROVIDER_ID}\",
                \"configuration\": {
                    \"type\": \"relational-database-server\",
                    \"engine\": \"postgres\",
                    \"version\": \"16\",
                    \"cloudServiceName\": \"test-db-${TIMESTAMP}\"
                },
                \"cloudSpecificProperties\": {}
            }
        ]
    }")

if echo "$UPDATE_WITH_RESOURCE" | jq -e '.resources | length == 1' > /dev/null 2>&1; then
    print_result 0 "Resource added to blueprint successfully"
    RESOURCE_ID=$(echo "$UPDATE_WITH_RESOURCE" | jq -r '.resources[0].id')
    print_info "Resource ID: $RESOURCE_ID"
else
    print_result 1 "Failed to add resource to blueprint"
    echo "Response: $UPDATE_WITH_RESOURCE" | head -100
fi
echo ""

# Test 5: Verify resource persists (retrieve blueprint)
echo "Test 5: Verify resource persists in database"
GET_BLUEPRINT=$(curl -s -X GET \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser")

RESOURCE_COUNT=$(echo "$GET_BLUEPRINT" | jq '.resources | length')
PERSISTED_RESOURCE_NAME=$(echo "$GET_BLUEPRINT" | jq -r '.resources[0].name')

if [ "$RESOURCE_COUNT" -eq 1 ] && [ "$PERSISTED_RESOURCE_NAME" = "$RESOURCE_NAME" ]; then
    print_result 0 "Resource persisted correctly in database"
    print_info "Resource name: $PERSISTED_RESOURCE_NAME"
else
    print_result 1 "Resource did not persist correctly"
    echo "Expected 1 resource named '$RESOURCE_NAME', got $RESOURCE_COUNT resources"
fi
echo ""

# Test 6: Update the resource
echo "Test 6: Update the resource"
UPDATED_RESOURCE_NAME="Updated Database ${TIMESTAMP}"

UPDATE_RESOURCE=$(curl -s -X PUT \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -d "{
        \"name\": \"${BLUEPRINT_NAME}\",
        \"description\": \"Test blueprint for resource persistence verification\",
        \"supportedCloudProviderIds\": [\"${CLOUD_PROVIDER_ID}\"],
        \"resources\": [
            {
                \"name\": \"${UPDATED_RESOURCE_NAME}\",
                \"description\": \"Updated test database resource\",
                \"resourceTypeId\": \"${RESOURCE_TYPE_ID}\",
                \"cloudProviderId\": \"${CLOUD_PROVIDER_ID}\",
                \"configuration\": {
                    \"type\": \"relational-database-server\",
                    \"engine\": \"postgres\",
                    \"version\": \"15\",
                    \"cloudServiceName\": \"updated-db-${TIMESTAMP}\"
                },
                \"cloudSpecificProperties\": {}
            }
        ]
    }")

UPDATED_NAME=$(echo "$UPDATE_RESOURCE" | jq -r '.resources[0].name')
UPDATED_VERSION=$(echo "$UPDATE_RESOURCE" | jq -r '.resources[0].configuration.version')

if [ "$UPDATED_NAME" = "$UPDATED_RESOURCE_NAME" ] && [ "$UPDATED_VERSION" = "15" ]; then
    print_result 0 "Resource updated successfully"
    print_info "Updated name: $UPDATED_NAME"
    print_info "Updated version: $UPDATED_VERSION"
else
    print_result 1 "Failed to update resource"
fi
echo ""

# Test 7: Verify update persists
echo "Test 7: Verify resource update persists in database"
GET_UPDATED=$(curl -s -X GET \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser")

PERSISTED_UPDATED_NAME=$(echo "$GET_UPDATED" | jq -r '.resources[0].name')
PERSISTED_VERSION=$(echo "$GET_UPDATED" | jq -r '.resources[0].configuration.version')

if [ "$PERSISTED_UPDATED_NAME" = "$UPDATED_RESOURCE_NAME" ] && [ "$PERSISTED_VERSION" = "15" ]; then
    print_result 0 "Resource update persisted correctly"
else
    print_result 1 "Resource update did not persist correctly"
fi
echo ""

# Test 8: Delete the resource
echo "Test 8: Delete the resource"
DELETE_RESOURCE=$(curl -s -X PUT \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -d "{
        \"name\": \"${BLUEPRINT_NAME}\",
        \"description\": \"Test blueprint for resource persistence verification\",
        \"supportedCloudProviderIds\": [\"${CLOUD_PROVIDER_ID}\"],
        \"resources\": []
    }")

REMAINING_RESOURCES=$(echo "$DELETE_RESOURCE" | jq '.resources | length')

if [ "$REMAINING_RESOURCES" -eq 0 ]; then
    print_result 0 "Resource deleted successfully"
else
    print_result 1 "Failed to delete resource"
fi
echo ""

# Test 9: Verify deletion persists
echo "Test 9: Verify resource deletion persists in database"
GET_AFTER_DELETE=$(curl -s -X GET \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser")

PERSISTED_COUNT=$(echo "$GET_AFTER_DELETE" | jq '.resources | length')

if [ "$PERSISTED_COUNT" -eq 0 ]; then
    print_result 0 "Resource deletion persisted correctly"
else
    print_result 1 "Resource deletion did not persist correctly"
    echo "Expected 0 resources, found $PERSISTED_COUNT"
fi
echo ""

# Test 10: Test multiple resources
echo "Test 10: Test multiple resources in single blueprint"
MULTI_RESOURCE_UPDATE=$(curl -s -X PUT \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser" \
    -d "{
        \"name\": \"${BLUEPRINT_NAME}\",
        \"description\": \"Test blueprint for resource persistence verification\",
        \"supportedCloudProviderIds\": [\"${CLOUD_PROVIDER_ID}\"],
        \"resources\": [
            {
                \"name\": \"Resource 1 ${TIMESTAMP}\",
                \"description\": \"First test resource\",
                \"resourceTypeId\": \"${RESOURCE_TYPE_ID}\",
                \"cloudProviderId\": \"${CLOUD_PROVIDER_ID}\",
                \"configuration\": {
                    \"type\": \"container-orchestrator\",
                    \"cloudServiceName\": \"cluster-1-${TIMESTAMP}\"
                },
                \"cloudSpecificProperties\": {}
            },
            {
                \"name\": \"Resource 2 ${TIMESTAMP}\",
                \"description\": \"Second test resource\",
                \"resourceTypeId\": \"${RESOURCE_TYPE_ID}\",
                \"cloudProviderId\": \"${CLOUD_PROVIDER_ID}\",
                \"configuration\": {
                    \"type\": \"container-orchestrator\",
                    \"cloudServiceName\": \"cluster-2-${TIMESTAMP}\"
                },
                \"cloudSpecificProperties\": {}
            },
            {
                \"name\": \"Resource 3 ${TIMESTAMP}\",
                \"description\": \"Third test resource\",
                \"resourceTypeId\": \"${RESOURCE_TYPE_ID}\",
                \"cloudProviderId\": \"${CLOUD_PROVIDER_ID}\",
                \"configuration\": {
                    \"type\": \"container-orchestrator\",
                    \"cloudServiceName\": \"cluster-3-${TIMESTAMP}\"
                },
                \"cloudSpecificProperties\": {}
            }
        ]
    }")

MULTI_COUNT=$(echo "$MULTI_RESOURCE_UPDATE" | jq '.resources | length')

if [ "$MULTI_COUNT" -eq 3 ]; then
    print_result 0 "Multiple resources added successfully"
    print_info "Resource count: $MULTI_COUNT"
else
    print_result 1 "Failed to add multiple resources"
    echo "Expected 3 resources, got $MULTI_COUNT"
fi
echo ""

# Test 11: Verify multiple resources persist
echo "Test 11: Verify multiple resources persist in database"
GET_MULTI=$(curl -s -X GET \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser")

PERSISTED_MULTI_COUNT=$(echo "$GET_MULTI" | jq '.resources | length')

if [ "$PERSISTED_MULTI_COUNT" -eq 3 ]; then
    print_result 0 "Multiple resources persisted correctly"
else
    print_result 1 "Multiple resources did not persist correctly"
    echo "Expected 3 resources, found $PERSISTED_MULTI_COUNT"
fi
echo ""

# Cleanup: Delete test blueprint
echo "Cleanup: Deleting test blueprint"
DELETE_BLUEPRINT=$(curl -s -X DELETE \
    "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
    -H "X-Auth-Request-Email: ${USER_EMAIL}" \
    -H "X-Auth-Request-User: testuser")

print_info "Test blueprint deleted"
echo ""

echo "========================================="
echo -e "${GREEN}All tests passed successfully!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Resource creation persists to database"
echo "  ✓ Resource updates persist to database"
echo "  ✓ Resource deletion persists to database"
echo "  ✓ Multiple resources can be managed independently"
echo "  ✓ All CRUD operations work correctly"
echo ""
