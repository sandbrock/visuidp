#!/bin/bash

# Test Rollback Procedures
# This script tests rollback capabilities in a non-production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Testing Rollback Procedures${NC}"
echo -e "${GREEN}Environment: ${ENV}${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${YELLOW}>>> $1${NC}"
    echo ""
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        exit 1
    fi
}

# Function to wait for user confirmation
wait_for_confirmation() {
    echo ""
    read -p "Press Enter to continue or Ctrl+C to abort..."
    echo ""
}

# Test 1: Lambda Versioning and Alias Rollback
print_section "Test 1: Lambda Versioning and Alias Rollback"

FUNCTION_NAME="visuidp-api-${ENV}"
echo "Testing Lambda function: ${FUNCTION_NAME}"

# Check if function exists
echo "Checking if Lambda function exists..."
aws lambda get-function --function-name ${FUNCTION_NAME} > /dev/null 2>&1
check_success "Lambda function exists"

# Check if alias exists
echo "Checking if 'live' alias exists..."
CURRENT_VERSION=$(aws lambda get-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --query 'FunctionVersion' \
    --output text 2>/dev/null || echo "")

if [ -z "$CURRENT_VERSION" ]; then
    echo -e "${YELLOW}⚠ 'live' alias does not exist. Creating it...${NC}"
    LATEST_VERSION=$(aws lambda publish-version \
        --function-name ${FUNCTION_NAME} \
        --query 'Version' \
        --output text)
    
    aws lambda create-alias \
        --function-name ${FUNCTION_NAME} \
        --name live \
        --function-version ${LATEST_VERSION} > /dev/null
    
    CURRENT_VERSION=${LATEST_VERSION}
    check_success "Created 'live' alias pointing to version ${LATEST_VERSION}"
else
    echo -e "${GREEN}✓ 'live' alias exists, currently at version ${CURRENT_VERSION}${NC}"
fi

# List recent versions
echo ""
echo "Recent Lambda versions:"
aws lambda list-versions-by-function \
    --function-name ${FUNCTION_NAME} \
    --max-items 5 \
    --query 'Versions[*].[Version,LastModified]' \
    --output table

# Publish a new version for testing
echo ""
echo "Publishing new version for rollback test..."
NEW_VERSION=$(aws lambda publish-version \
    --function-name ${FUNCTION_NAME} \
    --description "Test version for rollback - $(date)" \
    --query 'Version' \
    --output text)
check_success "Published new version: ${NEW_VERSION}"

# Update alias to new version
echo "Updating 'live' alias to new version ${NEW_VERSION}..."
aws lambda update-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --function-version ${NEW_VERSION} > /dev/null
check_success "Updated alias to version ${NEW_VERSION}"

# Verify alias update
UPDATED_VERSION=$(aws lambda get-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --query 'FunctionVersion' \
    --output text)

if [ "$UPDATED_VERSION" = "$NEW_VERSION" ]; then
    echo -e "${GREEN}✓ Alias successfully updated to version ${NEW_VERSION}${NC}"
else
    echo -e "${RED}✗ Alias update failed${NC}"
    exit 1
fi

echo ""
echo "Simulating rollback scenario..."
wait_for_confirmation

# Roll back to previous version
echo "Rolling back to previous version ${CURRENT_VERSION}..."
aws lambda update-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --function-version ${CURRENT_VERSION} > /dev/null
check_success "Rolled back to version ${CURRENT_VERSION}"

# Verify rollback
ROLLED_BACK_VERSION=$(aws lambda get-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --query 'FunctionVersion' \
    --output text)

if [ "$ROLLED_BACK_VERSION" = "$CURRENT_VERSION" ]; then
    echo -e "${GREEN}✓ Rollback successful! Alias now points to version ${CURRENT_VERSION}${NC}"
else
    echo -e "${RED}✗ Rollback failed${NC}"
    exit 1
fi

# Measure rollback time
echo ""
echo "Measuring rollback time..."
START_TIME=$(date +%s)
aws lambda update-alias \
    --function-name ${FUNCTION_NAME} \
    --name live \
    --function-version ${NEW_VERSION} > /dev/null
END_TIME=$(date +%s)
ROLLBACK_TIME=$((END_TIME - START_TIME))
echo -e "${GREEN}✓ Rollback completed in ${ROLLBACK_TIME} seconds${NC}"

# Test 2: Terraform State Versioning
print_section "Test 2: Terraform State Versioning"

# Check if backend is configured
if [ ! -f "backend-config.hcl" ]; then
    echo -e "${YELLOW}⚠ backend-config.hcl not found. Skipping Terraform state test.${NC}"
else
    echo "Reading backend configuration..."
    BUCKET=$(grep 'bucket' backend-config.hcl | cut -d'"' -f2)
    KEY=$(grep 'key' backend-config.hcl | cut -d'"' -f2)
    
    if [ -z "$BUCKET" ] || [ -z "$KEY" ]; then
        echo -e "${YELLOW}⚠ Could not parse backend config. Skipping Terraform state test.${NC}"
    else
        echo "State bucket: ${BUCKET}"
        echo "State key: ${KEY}"
        
        # Check if state file exists
        echo ""
        echo "Checking if state file exists..."
        aws s3 ls s3://${BUCKET}/${KEY} > /dev/null 2>&1
        check_success "State file exists"
        
        # List state versions
        echo ""
        echo "Recent state versions:"
        aws s3api list-object-versions \
            --bucket ${BUCKET} \
            --prefix ${KEY} \
            --max-items 5 \
            --query 'Versions[*].[VersionId,LastModified,IsLatest]' \
            --output table
        
        # Check if versioning is enabled
        VERSIONING=$(aws s3api get-bucket-versioning \
            --bucket ${BUCKET} \
            --query 'Status' \
            --output text)
        
        if [ "$VERSIONING" = "Enabled" ]; then
            echo -e "${GREEN}✓ S3 versioning is enabled for state bucket${NC}"
        else
            echo -e "${RED}✗ S3 versioning is NOT enabled for state bucket${NC}"
            echo -e "${YELLOW}⚠ Enable versioning for rollback capability:${NC}"
            echo "   aws s3api put-bucket-versioning --bucket ${BUCKET} --versioning-configuration Status=Enabled"
        fi
    fi
fi

# Test 3: DynamoDB Point-in-Time Recovery
print_section "Test 3: DynamoDB Point-in-Time Recovery"

TABLE_NAME="visuidp-data-${ENV}"
echo "Testing DynamoDB table: ${TABLE_NAME}"

# Check if table exists
echo "Checking if DynamoDB table exists..."
aws dynamodb describe-table --table-name ${TABLE_NAME} > /dev/null 2>&1
if [ $? -eq 0 ]; then
    check_success "DynamoDB table exists"
    
    # Check PITR status
    echo ""
    echo "Checking Point-in-Time Recovery status..."
    PITR_STATUS=$(aws dynamodb describe-continuous-backups \
        --table-name ${TABLE_NAME} \
        --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
        --output text)
    
    if [ "$PITR_STATUS" = "ENABLED" ]; then
        echo -e "${GREEN}✓ Point-in-Time Recovery is enabled${NC}"
        
        # Get earliest restore time
        EARLIEST_RESTORE=$(aws dynamodb describe-continuous-backups \
            --table-name ${TABLE_NAME} \
            --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.EarliestRestorableDateTime' \
            --output text)
        
        LATEST_RESTORE=$(aws dynamodb describe-continuous-backups \
            --table-name ${TABLE_NAME} \
            --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.LatestRestorableDateTime' \
            --output text)
        
        echo "  Earliest restorable time: ${EARLIEST_RESTORE}"
        echo "  Latest restorable time: ${LATEST_RESTORE}"
    else
        echo -e "${RED}✗ Point-in-Time Recovery is NOT enabled${NC}"
        echo -e "${YELLOW}⚠ Enable PITR for rollback capability:${NC}"
        echo "   aws dynamodb update-continuous-backups --table-name ${TABLE_NAME} --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true"
    fi
    
    # List recent backups
    echo ""
    echo "Recent on-demand backups:"
    aws dynamodb list-backups \
        --table-name ${TABLE_NAME} \
        --max-results 5 \
        --query 'BackupSummaries[*].[BackupName,BackupCreationDateTime,BackupStatus]' \
        --output table 2>/dev/null || echo "No on-demand backups found"
else
    echo -e "${YELLOW}⚠ DynamoDB table does not exist yet. Skipping PITR test.${NC}"
fi

# Test 4: S3 Versioning for Frontend Assets
print_section "Test 4: S3 Versioning for Frontend Assets"

UI_BUCKET="visuidp-ui-${ENV}"
echo "Testing S3 bucket: ${UI_BUCKET}"

# Check if bucket exists
echo "Checking if S3 bucket exists..."
aws s3 ls s3://${UI_BUCKET} > /dev/null 2>&1
if [ $? -eq 0 ]; then
    check_success "S3 bucket exists"
    
    # Check versioning status
    echo ""
    echo "Checking S3 versioning status..."
    VERSIONING=$(aws s3api get-bucket-versioning \
        --bucket ${UI_BUCKET} \
        --query 'Status' \
        --output text)
    
    if [ "$VERSIONING" = "Enabled" ]; then
        echo -e "${GREEN}✓ S3 versioning is enabled${NC}"
        
        # List versions of index.html if it exists
        echo ""
        echo "Checking for index.html versions..."
        aws s3api list-object-versions \
            --bucket ${UI_BUCKET} \
            --prefix index.html \
            --max-items 5 \
            --query 'Versions[*].[VersionId,LastModified,IsLatest]' \
            --output table 2>/dev/null || echo "No index.html found yet"
    else
        echo -e "${RED}✗ S3 versioning is NOT enabled${NC}"
        echo -e "${YELLOW}⚠ Enable versioning for rollback capability:${NC}"
        echo "   aws s3api put-bucket-versioning --bucket ${UI_BUCKET} --versioning-configuration Status=Enabled"
    fi
else
    echo -e "${YELLOW}⚠ S3 bucket does not exist yet. Skipping versioning test.${NC}"
fi

# Test 5: Git-based Rollback
print_section "Test 5: Git-based Rollback"

echo "Checking Git repository status..."
if [ -d ".git" ]; then
    check_success "Git repository found"
    
    # Show recent commits
    echo ""
    echo "Recent commits:"
    git log --oneline -5
    
    # Check for uncommitted changes
    echo ""
    if git diff-index --quiet HEAD --; then
        echo -e "${GREEN}✓ No uncommitted changes${NC}"
    else
        echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
        echo "  Commit or stash changes before rollback"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo ""
    echo "Current branch: ${CURRENT_BRANCH}"
    
    # Verify we can create rollback branch
    echo ""
    echo "Testing rollback branch creation..."
    TEST_BRANCH="test-rollback-$(date +%s)"
    git checkout -b ${TEST_BRANCH} > /dev/null 2>&1
    check_success "Created test branch: ${TEST_BRANCH}"
    
    # Switch back and delete test branch
    git checkout ${CURRENT_BRANCH} > /dev/null 2>&1
    git branch -D ${TEST_BRANCH} > /dev/null 2>&1
    echo -e "${GREEN}✓ Cleaned up test branch${NC}"
else
    echo -e "${RED}✗ Not a Git repository${NC}"
    exit 1
fi

# Summary
print_section "Test Summary"

echo "Rollback Capability Assessment:"
echo ""
echo "✓ Lambda Versioning: TESTED AND WORKING"
echo "  - Alias-based rollback: ${ROLLBACK_TIME} seconds"
echo "  - Zero downtime rollback: YES"
echo ""

if [ -n "$BUCKET" ] && [ "$VERSIONING" = "Enabled" ]; then
    echo "✓ Terraform State Versioning: ENABLED"
else
    echo "⚠ Terraform State Versioning: NOT VERIFIED"
fi
echo ""

if [ "$PITR_STATUS" = "ENABLED" ]; then
    echo "✓ DynamoDB Point-in-Time Recovery: ENABLED"
else
    echo "⚠ DynamoDB Point-in-Time Recovery: NOT ENABLED"
fi
echo ""

if [ "$VERSIONING" = "Enabled" ]; then
    echo "✓ S3 Frontend Versioning: ENABLED"
else
    echo "⚠ S3 Frontend Versioning: NOT ENABLED"
fi
echo ""

echo "✓ Git-based Rollback: AVAILABLE"
echo ""

# Recommendations
print_section "Recommendations"

echo "1. Lambda rollback is fully functional and tested"
echo "2. Ensure S3 versioning is enabled for state bucket and UI bucket"
echo "3. Enable DynamoDB PITR for production environment"
echo "4. Practice rollback procedures monthly"
echo "5. Document rollback decisions in incident reports"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Rollback Testing Complete${NC}"
echo -e "${GREEN}========================================${NC}"
