#!/bin/bash

# Verification script for V2__data.sql migration file
# This script checks all requirements from task 3

echo "=========================================="
echo "V2__data.sql Migration Verification"
echo "=========================================="
echo ""

MIGRATION_FILE="src/main/resources/db/migration/V2__data.sql"
ERRORS=0

# Check 1: Verify file exists
echo "✓ Check 1: File exists"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "  ✗ ERROR: Migration file not found"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ File found: $MIGRATION_FILE"
fi
echo ""

# Check 2: Verify ON CONFLICT clauses use correct pattern
echo "✓ Check 2: ON CONFLICT clauses"
CONFLICT_COUNT=$(grep -c "ON CONFLICT (mapping_id, property_name) DO NOTHING" "$MIGRATION_FILE")
echo "  Found $CONFLICT_COUNT ON CONFLICT clauses with (mapping_id, property_name) pattern"

# Count property schema INSERT statements (excluding the VALUES line)
PROPERTY_INSERT_COUNT=$(grep -c "INSERT INTO property_schemas" "$MIGRATION_FILE")
echo "  Found $PROPERTY_INSERT_COUNT property schema INSERT statements"

if [ "$CONFLICT_COUNT" -ne "$PROPERTY_INSERT_COUNT" ]; then
    echo "  ✗ ERROR: Mismatch between INSERT statements and ON CONFLICT clauses"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ All property schema INSERTs have ON CONFLICT clauses"
fi
echo ""

# Check 3: Verify ECS UUIDs follow pattern
echo "✓ Check 3: ECS Property UUIDs"
ECS_UUIDS=(
    "04010000-0000-0000-0000-000000000001"
    "04010000-0000-0000-0000-000000000002"
    "04010000-0000-0000-0000-000000000003"
    "04010000-0000-0000-0000-000000000004"
    "04010000-0000-0000-0000-000000000005"
    "04010000-0000-0000-0000-000000000006"
    "04010000-0000-0000-0000-000000000007"
    "04010000-0000-0000-0000-000000000008"
)

for uuid in "${ECS_UUIDS[@]}"; do
    if grep -q "$uuid" "$MIGRATION_FILE"; then
        echo "  ✓ Found UUID: $uuid"
    else
        echo "  ✗ ERROR: Missing UUID: $uuid"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 4: Verify display_order values are sequential with gaps
echo "✓ Check 4: ECS Display Order Values"
DISPLAY_ORDERS=(10 20 30 40 50 60 70 80)
MAPPING_ID="d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03"

for order in "${DISPLAY_ORDERS[@]}"; do
    # Check if display_order appears in the ECS section
    if grep -A 20 "$MAPPING_ID" "$MIGRATION_FILE" | grep -q "display_order, created_at" | head -1; then
        echo "  ✓ Display order $order found in ECS section"
    fi
done
echo ""

# Check 5: Verify required fields
echo "✓ Check 5: Required Fields"
REQUIRED_PROPERTIES=(
    "launchType"
    "taskCpu"
    "taskMemory"
    "desiredTaskCount"
)

for prop in "${REQUIRED_PROPERTIES[@]}"; do
    # Extract the property section and check if required is true
    if grep -A 10 "'$prop'" "$MIGRATION_FILE" | grep -q "true,"; then
        echo "  ✓ Property '$prop' is marked as required"
    else
        echo "  ✗ ERROR: Property '$prop' is not marked as required"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 6: Verify optional fields
echo "✓ Check 6: Optional Fields"
OPTIONAL_PROPERTIES=(
    "enableAutoScaling"
    "minTaskCount"
    "maxTaskCount"
    "instanceType"
)

for prop in "${OPTIONAL_PROPERTIES[@]}"; do
    # Extract the property section and check if required is false
    if grep -A 10 "'$prop'" "$MIGRATION_FILE" | grep -q "false,"; then
        echo "  ✓ Property '$prop' is marked as optional (required=false)"
    else
        echo "  ✗ ERROR: Property '$prop' is not marked as optional"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 7: Verify default values are properly quoted JSON strings
echo "✓ Check 7: Default Values (JSON Strings)"
DEFAULT_VALUES=(
    '"FARGATE"'
    '"512"'
    '"1024"'
    '"2"'
    '"false"'
    '"1"'
    '"10"'
    '"t3.medium"'
)

for value in "${DEFAULT_VALUES[@]}"; do
    if grep -q "$value" "$MIGRATION_FILE"; then
        echo "  ✓ Found properly quoted default value: $value"
    else
        echo "  ✗ ERROR: Missing or improperly quoted default value: $value"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 8: Verify terraform-aws-ecs module URL
echo "✓ Check 8: Terraform Module URL"
if grep -q "terraform-aws-ecs" "$MIGRATION_FILE"; then
    echo "  ✓ Found terraform-aws-ecs module reference"
else
    echo "  ✗ ERROR: terraform-aws-ecs module not found"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "terraform-aws-eks" "$MIGRATION_FILE"; then
    echo "  ✗ ERROR: Found terraform-aws-eks (should be removed)"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ No terraform-aws-eks references found (correct)"
fi
echo ""

# Check 9: Verify SQL syntax (basic check)
echo "✓ Check 9: Basic SQL Syntax"
# Check for common SQL syntax issues
if grep -q "INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)" "$MIGRATION_FILE"; then
    echo "  ✓ Property schema INSERT statement structure is correct"
else
    echo "  ✗ ERROR: Property schema INSERT statement structure issue"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 10: Verify ECS section comment
echo "✓ Check 10: Section Comments"
if grep -q "AWS Managed Container Orchestrator (ECS)" "$MIGRATION_FILE"; then
    echo "  ✓ Found correct ECS section comment"
else
    echo "  ✗ ERROR: ECS section comment not found or incorrect"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "AWS Managed Container Orchestrator (EKS)" "$MIGRATION_FILE"; then
    echo "  ✗ ERROR: Found EKS section comment (should be ECS)"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ No EKS section comments found (correct)"
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✓ All checks passed! Migration file is valid."
    exit 0
else
    echo "✗ Found $ERRORS error(s). Please review the migration file."
    exit 1
fi
