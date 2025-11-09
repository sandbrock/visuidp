#!/bin/bash

# ============================================================================
# Start DynamoDB Local for Testing
# ============================================================================
# This script starts DynamoDB Local using Docker Compose for running
# integration tests against DynamoDB.
#
# Usage:
#   ./scripts/start-dynamodb-local.sh
#
# The script will:
# 1. Start DynamoDB Local on port 8000
# 2. Wait for it to be healthy
# 3. Display connection information
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting DynamoDB Local..."
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"

# Start DynamoDB Local
docker compose up -d dynamodb-local

echo ""
echo "Waiting for DynamoDB Local to be ready..."

# Wait for health check
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker compose ps dynamodb-local | grep -q "healthy"; then
        echo ""
        echo "✓ DynamoDB Local is ready!"
        echo ""
        echo "Connection Details:"
        echo "  Endpoint: http://localhost:8000"
        echo "  Region:   us-east-1 (any region works with local)"
        echo ""
        echo "To run DynamoDB integration tests:"
        echo "  ./mvnw test -Dtest=\"*Dynamo*Test\""
        echo ""
        echo "To stop DynamoDB Local:"
        echo "  docker compose stop dynamodb-local"
        echo ""
        echo "To view logs:"
        echo "  docker compose logs -f dynamodb-local"
        echo ""
        exit 0
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
done

echo ""
echo "✗ DynamoDB Local failed to start within 30 seconds"
echo ""
echo "Check logs with:"
echo "  docker compose logs dynamodb-local"
echo ""
exit 1
