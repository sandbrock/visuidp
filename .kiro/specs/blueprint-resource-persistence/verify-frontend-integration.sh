#!/bin/bash

# Script to verify blueprint resource persistence integration
# This tests the full flow: create, read, update, delete

set -e

API_BASE="http://localhost:8082/v1"
USER_EMAIL="test@example.com"

echo "=== Blueprint Resource Persistence Integration Test ==="
echo ""

# Get available cloud providers
echo "1. Fetching available cloud providers..."
CLOUD_PROVIDERS=$(curl -s -X GET "${API_BASE}/admin/cloud-providers" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}")
echo "Cloud Providers: ${CLOUD_PROVIDERS}"
CLOUD_PROVIDER_ID=$(echo "${CLOUD_PROVIDERS}" | jq -r '.[0].id')
echo "Using Cloud Provider ID: ${CLOUD_PROVIDER_ID}"
echo ""

# Get available resource types for blueprints
echo "2. Fetching available resource types for blueprints..."
RESOURCE_TYPES=$(curl -s -X GET "${API_BASE}/blueprint-resource-types" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}")
echo "Resource Types: ${RESOURCE_TYPES}"
RESOURCE_TYPE_ID=$(echo "${RESOURCE_TYPES}" | jq -r '.[0].id')
echo "Using Resource Type ID: ${RESOURCE_TYPE_ID}"
echo ""

# Create a blueprint with resources
echo "3. Creating blueprint with resources..."
CREATE_PAYLOAD=$(cat <<EOF
{
  "name": "Test Blueprint with Resources",
  "description": "Testing resource persistence",
  "supportedCloudProviderIds": ["${CLOUD_PROVIDER_ID}"],
  "resources": [
    {
      "name": "Test Database Server",
      "description": "A test database resource",
      "blueprintResourceTypeId": "${RESOURCE_TYPE_ID}",
      "cloudType": "AWS",
      "configuration": {
        "serverName": "test-db-server",
        "adminUsername": "admin"
      }
    }
  ]
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/blueprints" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}" \
  -d "${CREATE_PAYLOAD}")

echo "Create Response: ${CREATE_RESPONSE}"
BLUEPRINT_ID=$(echo "${CREATE_RESPONSE}" | jq -r '.id')
RESOURCE_COUNT=$(echo "${CREATE_RESPONSE}" | jq -r '.resources | length')
echo "Created Blueprint ID: ${BLUEPRINT_ID}"
echo "Resource Count: ${RESOURCE_COUNT}"

if [ "${RESOURCE_COUNT}" != "1" ]; then
  echo "❌ FAILED: Expected 1 resource, got ${RESOURCE_COUNT}"
  exit 1
fi
echo "✅ PASSED: Blueprint created with resources"
echo ""

# Retrieve the blueprint and verify resources persist
echo "4. Retrieving blueprint to verify resources persist..."
GET_RESPONSE=$(curl -s -X GET "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}")

echo "Get Response: ${GET_RESPONSE}"
RETRIEVED_RESOURCE_COUNT=$(echo "${GET_RESPONSE}" | jq -r '.resources | length')
RESOURCE_NAME=$(echo "${GET_RESPONSE}" | jq -r '.resources[0].name')
echo "Retrieved Resource Count: ${RETRIEVED_RESOURCE_COUNT}"
echo "Resource Name: ${RESOURCE_NAME}"

if [ "${RETRIEVED_RESOURCE_COUNT}" != "1" ]; then
  echo "❌ FAILED: Expected 1 resource after retrieval, got ${RETRIEVED_RESOURCE_COUNT}"
  exit 1
fi

if [ "${RESOURCE_NAME}" != "Test Database Server" ]; then
  echo "❌ FAILED: Expected resource name 'Test Database Server', got '${RESOURCE_NAME}'"
  exit 1
fi
echo "✅ PASSED: Resources persist after creation"
echo ""

# Update the blueprint with modified resources
echo "5. Updating blueprint with modified resources..."
UPDATE_PAYLOAD=$(cat <<EOF
{
  "name": "Test Blueprint with Resources",
  "description": "Testing resource persistence - updated",
  "supportedCloudProviderIds": ["${CLOUD_PROVIDER_ID}"],
  "resources": [
    {
      "name": "Updated Database Server",
      "description": "An updated database resource",
      "blueprintResourceTypeId": "${RESOURCE_TYPE_ID}",
      "cloudType": "AWS",
      "configuration": {
        "serverName": "updated-db-server",
        "adminUsername": "admin"
      }
    },
    {
      "name": "Second Resource",
      "description": "A second resource",
      "blueprintResourceTypeId": "${RESOURCE_TYPE_ID}",
      "cloudType": "AWS",
      "configuration": {
        "serverName": "second-resource",
        "adminUsername": "admin"
      }
    }
  ]
}
EOF
)

UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}" \
  -d "${UPDATE_PAYLOAD}")

echo "Update Response: ${UPDATE_RESPONSE}"
UPDATED_RESOURCE_COUNT=$(echo "${UPDATE_RESPONSE}" | jq -r '.resources | length')
UPDATED_RESOURCE_NAME=$(echo "${UPDATE_RESPONSE}" | jq -r '.resources[0].name')
echo "Updated Resource Count: ${UPDATED_RESOURCE_COUNT}"
echo "First Resource Name: ${UPDATED_RESOURCE_NAME}"

if [ "${UPDATED_RESOURCE_COUNT}" != "2" ]; then
  echo "❌ FAILED: Expected 2 resources after update, got ${UPDATED_RESOURCE_COUNT}"
  exit 1
fi
echo "✅ PASSED: Resources updated successfully"
echo ""

# Retrieve again to verify update persisted
echo "6. Retrieving blueprint again to verify update persisted..."
GET_RESPONSE_2=$(curl -s -X GET "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}")

FINAL_RESOURCE_COUNT=$(echo "${GET_RESPONSE_2}" | jq -r '.resources | length')
echo "Final Resource Count: ${FINAL_RESOURCE_COUNT}"

if [ "${FINAL_RESOURCE_COUNT}" != "2" ]; then
  echo "❌ FAILED: Expected 2 resources after update retrieval, got ${FINAL_RESOURCE_COUNT}"
  exit 1
fi
echo "✅ PASSED: Updated resources persist correctly"
echo ""

# Update with empty resources to test deletion
echo "7. Updating blueprint with empty resources to test deletion..."
DELETE_RESOURCES_PAYLOAD=$(cat <<EOF
{
  "name": "Test Blueprint with Resources",
  "description": "Testing resource persistence - no resources",
  "supportedCloudProviderIds": ["${CLOUD_PROVIDER_ID}"],
  "resources": []
}
EOF
)

DELETE_RESOURCES_RESPONSE=$(curl -s -X PUT "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}" \
  -d "${DELETE_RESOURCES_PAYLOAD}")

EMPTY_RESOURCE_COUNT=$(echo "${DELETE_RESOURCES_RESPONSE}" | jq -r '.resources | length')
echo "Resource Count after deletion: ${EMPTY_RESOURCE_COUNT}"

if [ "${EMPTY_RESOURCE_COUNT}" != "0" ]; then
  echo "❌ FAILED: Expected 0 resources after deletion, got ${EMPTY_RESOURCE_COUNT}"
  exit 1
fi
echo "✅ PASSED: Resources deleted successfully"
echo ""

# Delete the blueprint and verify cascade
echo "8. Deleting blueprint to verify cascade delete..."
curl -s -X DELETE "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}"

# Try to retrieve the deleted blueprint
GET_DELETED=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/blueprints/${BLUEPRINT_ID}" \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: ${USER_EMAIL}")

HTTP_CODE=$(echo "${GET_DELETED}" | tail -n1)
echo "HTTP Code for deleted blueprint: ${HTTP_CODE}"

if [ "${HTTP_CODE}" != "404" ]; then
  echo "❌ FAILED: Expected 404 for deleted blueprint, got ${HTTP_CODE}"
  exit 1
fi
echo "✅ PASSED: Blueprint deleted successfully"
echo ""

echo "=== All Integration Tests PASSED ✅ ==="
