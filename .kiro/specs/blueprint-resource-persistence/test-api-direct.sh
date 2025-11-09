#!/bin/bash

# Direct API test script - tests the backend API directly
# This bypasses authentication for testing purposes

set -e

echo "=== Testing Blueprint Resource Persistence API ==="
echo ""
echo "Note: This test accesses the API directly at localhost:8082"
echo "The API is running in dev mode which may have different auth requirements"
echo ""

# Test 1: Check if API is accessible
echo "1. Testing API health endpoint..."
HEALTH=$(curl -s http://localhost:8082/api/v1/health)
echo "Health check: ${HEALTH}"
echo ""

# Test 2: Try to get blueprints (may require auth)
echo "2. Testing blueprints endpoint..."
BLUEPRINTS=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  http://localhost:8082/api/v1/blueprints \
  -H "X-Forwarded-User: testuser" \
  -H "X-Forwarded-Email: test@example.com" 2>&1 || echo "FAILED")

echo "Blueprints response:"
echo "${BLUEPRINTS}"
echo ""

# Check if we got a valid response
if echo "${BLUEPRINTS}" | grep -q "HTTP_CODE:200"; then
  echo "✅ API is accessible and returning data"
else
  echo "⚠️  API may require authentication through Traefik"
  echo "   Access the UI at: https://localhost:8443/ui/"
fi

echo ""
echo "=== Manual Testing Required ==="
echo ""
echo "The backend and frontend are running. To complete integration testing:"
echo ""
echo "1. Open your browser to: https://localhost:8443/ui/"
echo "2. Log in with your credentials"
echo "3. Navigate to Infrastructure → Blueprints"
echo "4. Test the following scenarios:"
echo "   - Create a new blueprint with resources"
echo "   - Verify resources appear in the list"
echo "   - Refresh the page and verify resources persist"
echo "   - Edit the blueprint and modify resources"
echo "   - Delete resources from the blueprint"
echo "   - Delete the blueprint entirely"
echo ""
echo "5. Monitor the backend logs in the terminal running './mvnw quarkus:dev'"
echo "6. Check for any errors in the browser console (F12)"
echo ""
echo "Backend API: http://localhost:8082/api/v1"
echo "Frontend UI: http://localhost:8083/ui/"
echo "Traefik Gateway: https://localhost:8443/"
echo ""
