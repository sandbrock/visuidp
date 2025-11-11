#!/bin/bash

# Test script for ECS migration verification
# This script drops and recreates the database, runs migrations, and verifies ECS properties

set -e  # Exit on error

echo "=========================================="
echo "ECS Migration Test Script"
echo "=========================================="
echo ""

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="idp_db"
DB_USER="idp_user"
DB_PASSWORD="idp_password"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if PostgreSQL is running
print_info "Checking PostgreSQL connection..."
if ! docker exec idp-postgres psql -U $POSTGRES_USER -d postgres -c '\q' 2>/dev/null; then
    print_error "Cannot connect to PostgreSQL. Is it running?"
    print_info "Try: docker compose up -d postgres"
    exit 1
fi
print_success "PostgreSQL is running"
echo ""

# Step 1: Drop and recreate the database
print_info "Step 1: Dropping and recreating database '$DB_NAME'..."
docker exec -i idp-postgres psql -U $POSTGRES_USER -d postgres <<EOF
-- Terminate existing connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();

-- Drop and recreate database
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;

-- Drop and recreate user
DROP USER IF EXISTS $DB_USER;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    print_success "Database recreated successfully"
else
    print_error "Failed to recreate database"
    exit 1
fi
echo ""

# Grant schema permissions
print_info "Granting schema permissions..."
docker exec -i idp-postgres psql -U $POSTGRES_USER -d $DB_NAME <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
print_success "Schema permissions granted"
echo ""

# Step 2: Run Flyway migrations
print_info "Step 2: Running Flyway migrations (V1 and V2)..."
cd "$(dirname "$0")"

# Run V1 migration (schema)
print_info "Running V1__schema.sql..."
docker exec -i idp-postgres psql -U $DB_USER -d $DB_NAME < src/main/resources/db/migration/V1__schema.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "V1 migration completed"
else
    print_error "V1 migration failed"
    exit 1
fi

# Run V2 migration (data)
print_info "Running V2__data.sql..."
docker exec -i idp-postgres psql -U $DB_USER -d $DB_NAME < src/main/resources/db/migration/V2__data.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "V2 migration completed"
else
    print_error "V2 migration failed"
    exit 1
fi
echo ""

# Step 3: Verify terraform-aws-ecs module URL
print_info "Step 3: Verifying terraform-aws-ecs module URL..."
MODULE_URL=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT terraform_module_location FROM resource_type_cloud_mappings WHERE id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03';")

MODULE_URL=$(echo $MODULE_URL | xargs)  # Trim whitespace

if [ "$MODULE_URL" = "https://github.com/terraform-aws-modules/terraform-aws-ecs" ]; then
    print_success "Module URL is correct: $MODULE_URL"
else
    print_error "Module URL is incorrect: $MODULE_URL"
    print_error "Expected: https://github.com/terraform-aws-modules/terraform-aws-ecs"
    exit 1
fi
echo ""

# Step 4: Verify 8 ECS properties exist
print_info "Step 4: Verifying 8 ECS properties exist for mapping 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'..."
ECS_PROPERTY_COUNT=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03';")

ECS_PROPERTY_COUNT=$(echo $ECS_PROPERTY_COUNT | xargs)

if [ "$ECS_PROPERTY_COUNT" = "8" ]; then
    print_success "Found 8 ECS properties"
else
    print_error "Found $ECS_PROPERTY_COUNT properties, expected 8"
    exit 1
fi

# List the ECS properties
print_info "ECS Properties found:"
docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -c \
    "SELECT property_name, display_name, data_type, required, display_order FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' ORDER BY display_order;"
echo ""

# Verify specific ECS properties
print_info "Verifying specific ECS properties..."
EXPECTED_PROPERTIES=("launchType" "taskCpu" "taskMemory" "desiredTaskCount" "enableAutoScaling" "minTaskCount" "maxTaskCount" "instanceType")

for prop in "${EXPECTED_PROPERTIES[@]}"; do
    EXISTS=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = '$prop';")
    EXISTS=$(echo $EXISTS | xargs)
    
    if [ "$EXISTS" = "1" ]; then
        print_success "Property '$prop' exists"
    else
        print_error "Property '$prop' not found"
        exit 1
    fi
done
echo ""

# Step 5: Verify no EKS properties exist
print_info "Step 5: Verifying no EKS properties exist..."
EKS_PROPERTIES=("kubernetesVersion" "nodeInstanceType" "desiredNodeCount" "minNodeCount" "maxNodeCount" "enableClusterAutoscaler" "nodeVolumeSize")

EKS_FOUND=0
for prop in "${EKS_PROPERTIES[@]}"; do
    EXISTS=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
        "SELECT COUNT(*) FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = '$prop';")
    EXISTS=$(echo $EXISTS | xargs)
    
    if [ "$EXISTS" != "0" ]; then
        print_error "EKS property '$prop' still exists (should be removed)"
        EKS_FOUND=1
    fi
done

if [ $EKS_FOUND -eq 0 ]; then
    print_success "No EKS properties found (correct)"
else
    print_error "Some EKS properties still exist"
    exit 1
fi
echo ""

# Additional verification: Check property details
print_info "Additional Verification: Checking property details..."

# Verify launchType is first with display_order=10
LAUNCH_TYPE_ORDER=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT display_order FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = 'launchType';")
LAUNCH_TYPE_ORDER=$(echo $LAUNCH_TYPE_ORDER | xargs)

if [ "$LAUNCH_TYPE_ORDER" = "10" ]; then
    print_success "launchType has display_order=10 (first property)"
else
    print_error "launchType has display_order=$LAUNCH_TYPE_ORDER, expected 10"
    exit 1
fi

# Verify required properties
print_info "Verifying required properties..."
REQUIRED_PROPS=("launchType" "taskCpu" "taskMemory" "desiredTaskCount")
for prop in "${REQUIRED_PROPS[@]}"; do
    IS_REQUIRED=$(docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -t -c \
        "SELECT required FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' AND property_name = '$prop';")
    IS_REQUIRED=$(echo $IS_REQUIRED | xargs)
    
    if [ "$IS_REQUIRED" = "t" ]; then
        print_success "Property '$prop' is required"
    else
        print_error "Property '$prop' should be required but is not"
        exit 1
    fi
done
echo ""

# Verify default values
print_info "Verifying default values..."
docker exec idp-postgres psql -U $DB_USER -d $DB_NAME -c \
    "SELECT property_name, default_value FROM property_schemas WHERE mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' ORDER BY display_order;"
echo ""

# Final summary
echo "=========================================="
print_success "All verification checks passed!"
echo "=========================================="
echo ""
print_info "Summary:"
echo "  ✓ Database recreated successfully"
echo "  ✓ Flyway migrations (V1 and V2) completed"
echo "  ✓ Module URL points to terraform-aws-ecs"
echo "  ✓ 8 ECS properties exist"
echo "  ✓ All expected ECS properties found"
echo "  ✓ No EKS properties exist"
echo "  ✓ Property ordering is correct"
echo "  ✓ Required properties are marked correctly"
echo ""
print_success "ECS migration verification complete!"
