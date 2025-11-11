#!/bin/bash

# Verification script for ECS Cluster migration (Task 3)
# This script verifies the V2__data.sql migration file meets all requirements

echo "=========================================="
echo "ECS Cluster Migration Verification"
echo "=========================================="
echo ""

# Get the script directory and find the migration file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/src/main/resources/db/migration/V2__data.sql"
ERRORS=0

# Check 1: Verify terraform-aws-ecs module URL
echo "✓ Check 1: Terraform module URL"
if grep -q "terraform-aws-modules/terraform-aws-ecs" "$MIGRATION_FILE"; then
    echo "  ✓ PASS: ECS module URL found"
else
    echo "  ✗ FAIL: ECS module URL not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Verify all 5 ECS properties exist
echo "✓ Check 2: ECS property existence"
PROPERTIES=("capacityProvider" "instanceType" "minClusterSize" "maxClusterSize" "enableContainerInsights")
for prop in "${PROPERTIES[@]}"; do
    if grep -q "'$prop'" "$MIGRATION_FILE"; then
        echo "  ✓ PASS: $prop property found"
    else
        echo "  ✗ FAIL: $prop property not found"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 3: Verify UUIDs are unique and follow pattern
echo "✓ Check 3: UUID uniqueness and pattern"
EXPECTED_UUIDS=(
    "04010000-0000-0000-0000-000000000001"
    "04010000-0000-0000-0000-000000000002"
    "04010000-0000-0000-0000-000000000003"
    "04010000-0000-0000-0000-000000000004"
    "04010000-0000-0000-0000-000000000005"
)
for uuid in "${EXPECTED_UUIDS[@]}"; do
    COUNT=$(grep -c "'$uuid'" "$MIGRATION_FILE")
    if [ "$COUNT" -eq 1 ]; then
        echo "  ✓ PASS: UUID $uuid is unique"
    elif [ "$COUNT" -eq 0 ]; then
        echo "  ✗ FAIL: UUID $uuid not found"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✗ FAIL: UUID $uuid appears $COUNT times (should be 1)"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 4: Verify ON CONFLICT clauses
echo "✓ Check 4: ON CONFLICT clauses"
ECS_SECTION=$(awk '/04010000-0000-0000-0000-000000000001/,/AWS Service Bus/' "$MIGRATION_FILE")
CONFLICT_COUNT=$(echo "$ECS_SECTION" | grep -c "ON CONFLICT (mapping_id, property_name) DO NOTHING")
if [ "$CONFLICT_COUNT" -eq 5 ]; then
    echo "  ✓ PASS: All 5 properties have correct ON CONFLICT clause"
else
    echo "  ✗ FAIL: Found $CONFLICT_COUNT ON CONFLICT clauses (expected 5)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Verify display_order values
echo "✓ Check 5: Display order values"
EXPECTED_ORDERS=(10 20 30 40 50)
for i in "${!EXPECTED_ORDERS[@]}"; do
    uuid_num=$((i + 1))
    uuid="04010000-0000-0000-0000-00000000000$uuid_num"
    order="${EXPECTED_ORDERS[$i]}"
    
    # Extract the property block and check display_order
    BLOCK=$(awk "/'$uuid'/,/ON CONFLICT/" "$MIGRATION_FILE")
    if echo "$BLOCK" | grep -q "display_order.*$order"; then
        echo "  ✓ PASS: Property $uuid_num has display_order=$order"
    else
        echo "  ✗ FAIL: Property $uuid_num does not have display_order=$order"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 6: Verify only capacityProvider is required
echo "✓ Check 6: Required field validation"
# Check capacityProvider is required=true
BLOCK=$(awk "/'04010000-0000-0000-0000-000000000001'/,/ON CONFLICT/" "$MIGRATION_FILE")
if echo "$BLOCK" | grep -q "required.*true"; then
    echo "  ✓ PASS: capacityProvider is required=true"
else
    echo "  ✗ FAIL: capacityProvider is not required=true"
    ERRORS=$((ERRORS + 1))
fi

# Check other properties are required=false
for i in 2 3 4 5; do
    uuid="04010000-0000-0000-0000-00000000000$i"
    BLOCK=$(awk "/'$uuid'/,/ON CONFLICT/" "$MIGRATION_FILE")
    if echo "$BLOCK" | grep -q "required.*false"; then
        echo "  ✓ PASS: Property $i is required=false"
    else
        echo "  ✗ FAIL: Property $i is not required=false"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 7: Verify default values are properly quoted JSON strings
echo "✓ Check 7: Default value formatting"
EXPECTED_DEFAULTS=(
    '"FARGATE"'
    '"t3.medium"'
    '"1"'
    '"10"'
    'true'
)
for i in "${!EXPECTED_DEFAULTS[@]}"; do
    uuid_num=$((i + 1))
    uuid="04010000-0000-0000-0000-00000000000$uuid_num"
    default="${EXPECTED_DEFAULTS[$i]}"
    
    BLOCK=$(awk "/'$uuid'/,/ON CONFLICT/" "$MIGRATION_FILE")
    if echo "$BLOCK" | grep -q "default_value.*$default"; then
        echo "  ✓ PASS: Property $uuid_num has correct default value"
    else
        echo "  ✗ FAIL: Property $uuid_num does not have expected default value"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 8: Verify EC2-specific properties are optional
echo "✓ Check 8: EC2-specific properties are optional"
EC2_PROPS=("instanceType" "minClusterSize" "maxClusterSize")
for prop in "${EC2_PROPS[@]}"; do
    BLOCK=$(awk "/'$prop'/,/ON CONFLICT/" "$MIGRATION_FILE")
    if echo "$BLOCK" | grep -q "required.*false"; then
        echo "  ✓ PASS: $prop is optional (required=false)"
    else
        echo "  ✗ FAIL: $prop is not optional"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check 9: Verify no EKS properties exist
echo "✓ Check 9: No EKS properties"
EKS_PROPS=("kubernetesVersion" "nodeInstanceType" "desiredNodeCount" "minNodeCount" "maxNodeCount" "enableClusterAutoscaler" "nodeVolumeSize")
for prop in "${EKS_PROPS[@]}"; do
    if grep -q "'$prop'" "$MIGRATION_FILE"; then
        echo "  ✗ FAIL: EKS property $prop still exists"
        ERRORS=$((ERRORS + 1))
    else
        echo "  ✓ PASS: EKS property $prop removed"
    fi
done
echo ""

# Check 10: Verify section comment is correct
echo "✓ Check 10: Section comment"
if grep -q "AWS Managed Container Orchestrator (ECS Cluster)" "$MIGRATION_FILE"; then
    echo "  ✓ PASS: Section comment updated to ECS Cluster"
else
    echo "  ✗ FAIL: Section comment not updated"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✓ ALL CHECKS PASSED"
    echo "=========================================="
    exit 0
else
    echo "✗ $ERRORS CHECK(S) FAILED"
    echo "=========================================="
    exit 1
fi
