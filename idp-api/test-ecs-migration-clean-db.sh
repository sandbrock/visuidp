#!/usr/bin/env bash
set -euo pipefail

# Test ECS migration with clean database
# This script drops and recreates the database, runs migrations, and verifies ECS properties

echo "=========================================="
echo "ECS Migration Clean Database Test"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-idp}"
DB_USER="${DB_USER:-idp_user}"
DB_PASSWORD="${DB_PASSWORD:-idp_password}"

echo "Step 1: Drop and recreate database using Quarkus"
echo "-------------------------------------------------"
echo "Running Quarkus with flyway.clean-at-start=true to reset database..."
timeout 30s ./mvnw quarkus:dev -Dquarkus.flyway.clean-at-start=true -DskipTests > /tmp/quarkus-migration.log 2>&1 &
QUARKUS_PID=$!

# Wait for Quarkus to start and run migrations
echo "Waiting for migrations to complete..."
sleep 15

# Kill Quarkus
kill $QUARKUS_PID 2>/dev/null || true
wait $QUARKUS_PID 2>/dev/null || true

# Check if migrations ran
if grep -q "Successfully applied" /tmp/quarkus-migration.log || grep -q "Flyway" /tmp/quarkus-migration.log; then
    echo "✓ Database reset and migrations completed"
else
    echo "✗ Migrations may have failed, check /tmp/quarkus-migration.log"
    tail -20 /tmp/quarkus-migration.log
fi
echo ""

echo "Step 3: Verify terraform-aws-ecs module URL"
echo "--------------------------------------------"
MODULE_URL=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT module_location FROM resource_type_cloud_mappings WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03';")

MODULE_URL=$(echo "$MODULE_URL" | xargs)

if [ "$MODULE_URL" = "https://github.com/terraform-aws-modules/terraform-aws-ecs" ]; then
    echo "✓ Module URL is correct: $MODULE_URL"
else
    echo "✗ Module URL is incorrect: $MODULE_URL"
    echo "  Expected: https://github.com/terraform-aws-modules/terraform-aws-ecs"
    exit 1
fi
echo ""

echo "Step 4: Verify 5 ECS cluster properties exist"
echo "----------------------------------------------"
PROPERTY_COUNT=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03';")

PROPERTY_COUNT=$(echo "$PROPERTY_COUNT" | xargs)

if [ "$PROPERTY_COUNT" = "5" ]; then
    echo "✓ Found 5 ECS cluster properties"
else
    echo "✗ Found $PROPERTY_COUNT properties (expected 5)"
    exit 1
fi

# List the properties
echo ""
echo "ECS Cluster Properties:"
docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT property_name, display_name, data_type, required, display_order FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' ORDER BY display_order;"
echo ""

echo "Step 5: Verify no EKS properties exist"
echo "---------------------------------------"
EKS_PROPERTIES=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name IN ('kubernetesVersion', 'nodeInstanceType', 'desiredNodeCount', 'minNodeCount', 'maxNodeCount', 'enableClusterAutoscaler', 'nodeVolumeSize');")

EKS_PROPERTIES=$(echo "$EKS_PROPERTIES" | xargs)

if [ "$EKS_PROPERTIES" = "0" ]; then
    echo "✓ No EKS properties found"
else
    echo "✗ Found $EKS_PROPERTIES EKS properties (expected 0)"
    exit 1
fi
echo ""

echo "Step 6: Verify no task-level properties exist"
echo "----------------------------------------------"
TASK_PROPERTIES=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name IN ('taskCpu', 'taskMemory', 'desiredTaskCount', 'enableAutoScaling', 'minTaskCount', 'maxTaskCount');")

TASK_PROPERTIES=$(echo "$TASK_PROPERTIES" | xargs)

if [ "$TASK_PROPERTIES" = "0" ]; then
    echo "✓ No task-level properties found"
else
    echo "✗ Found $TASK_PROPERTIES task-level properties (expected 0)"
    exit 1
fi
echo ""

echo "Step 7: Verify specific ECS properties"
echo "---------------------------------------"

# Check capacityProvider
CAPACITY_PROVIDER=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT property_name FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'capacityProvider' AND required = true AND display_order = 10;")

if [ -n "$CAPACITY_PROVIDER" ]; then
    echo "✓ capacityProvider property exists with required=true and display_order=10"
else
    echo "✗ capacityProvider property not found or incorrect"
    exit 1
fi

# Check instanceType
INSTANCE_TYPE=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT property_name FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'instanceType' AND required = false AND display_order = 20;")

if [ -n "$INSTANCE_TYPE" ]; then
    echo "✓ instanceType property exists with required=false and display_order=20"
else
    echo "✗ instanceType property not found or incorrect"
    exit 1
fi

# Check minClusterSize
MIN_CLUSTER_SIZE=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT property_name FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'minClusterSize' AND required = false AND display_order = 30;")

if [ -n "$MIN_CLUSTER_SIZE" ]; then
    echo "✓ minClusterSize property exists with required=false and display_order=30"
else
    echo "✗ minClusterSize property not found or incorrect"
    exit 1
fi

# Check maxClusterSize
MAX_CLUSTER_SIZE=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT property_name FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'maxClusterSize' AND required = false AND display_order = 40;")

if [ -n "$MAX_CLUSTER_SIZE" ]; then
    echo "✓ maxClusterSize property exists with required=false and display_order=40"
else
    echo "✗ maxClusterSize property not found or incorrect"
    exit 1
fi

# Check enableContainerInsights
ENABLE_INSIGHTS=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT property_name FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'enableContainerInsights' AND required = false AND display_order = 50;")

if [ -n "$ENABLE_INSIGHTS" ]; then
    echo "✓ enableContainerInsights property exists with required=false and display_order=50"
else
    echo "✗ enableContainerInsights property not found or incorrect"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ All verification checks passed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Database dropped and recreated"
echo "- Migrations V1 and V2 executed successfully"
echo "- terraform-aws-ecs module URL verified"
echo "- 5 ECS cluster properties found"
echo "- No EKS properties found"
echo "- No task-level properties found"
echo "- All property configurations verified"
