#!/bin/bash

# Cost Optimization Implementation Script
# Implements cost-saving measures identified in cost analysis

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-dev}"
REGION="${AWS_REGION:-us-east-1}"
DRY_RUN="${DRY_RUN:-true}"

echo -e "${BLUE}=== VisuIDP Cost Optimization ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Dry Run: $DRY_RUN"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}"
    echo "Set DRY_RUN=false to apply changes"
    echo ""
fi

# Function to execute or simulate command
execute_cmd() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${BLUE}$description${NC}"
    if [ "$DRY_RUN" = "true" ]; then
        echo "  Would execute: $cmd"
    else
        echo "  Executing: $cmd"
        eval "$cmd"
    fi
    echo ""
}

# 1. Optimize Lambda memory settings
echo -e "${GREEN}=== Lambda Optimization ===${NC}"
echo ""

LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region "$REGION" \
    --query "Functions[?Tags.Project=='VisuIDP' && Tags.Environment=='$ENVIRONMENT'].FunctionName" \
    --output text)

if [ -n "$LAMBDA_FUNCTIONS" ]; then
    for FUNC in $LAMBDA_FUNCTIONS; do
        echo "Analyzing: $FUNC"
        
        # Get current memory
        CURRENT_MEMORY=$(aws lambda get-function-configuration \
            --function-name "$FUNC" \
            --region "$REGION" \
            --query 'MemorySize' \
            --output text)
        
        # Get average memory usage (if available)
        # Note: This requires Lambda Insights to be enabled
        echo "  Current Memory: ${CURRENT_MEMORY} MB"
        
        # Recommendation based on function type
        if [[ "$FUNC" == *"api"* ]]; then
            RECOMMENDED_MEMORY=512
        elif [[ "$FUNC" == *"cli"* ]]; then
            RECOMMENDED_MEMORY=256
        else
            RECOMMENDED_MEMORY=512
        fi
        
        if [ "$CURRENT_MEMORY" -ne "$RECOMMENDED_MEMORY" ]; then
            execute_cmd \
                "aws lambda update-function-configuration --function-name $FUNC --memory-size $RECOMMENDED_MEMORY --region $REGION" \
                "  Updating memory to ${RECOMMENDED_MEMORY} MB"
        else
            echo "  Memory already optimized"
        fi
        echo ""
    done
else
    echo "No Lambda functions found"
fi

# 2. Optimize CloudWatch log retention
echo -e "${GREEN}=== CloudWatch Logs Optimization ===${NC}"
echo ""

LOG_GROUPS=$(aws logs describe-log-groups \
    --region "$REGION" \
    --query "logGroups[?contains(logGroupName, 'visuidp')].logGroupName" \
    --output text)

if [ -n "$LOG_GROUPS" ]; then
    for LOG_GROUP in $LOG_GROUPS; do
        echo "Analyzing: $LOG_GROUP"
        
        CURRENT_RETENTION=$(aws logs describe-log-groups \
            --log-group-name-prefix "$LOG_GROUP" \
            --region "$REGION" \
            --query 'logGroups[0].retentionInDays' \
            --output text)
        
        # Set retention based on environment
        if [ "$ENVIRONMENT" = "prod" ]; then
            TARGET_RETENTION=7
        else
            TARGET_RETENTION=3
        fi
        
        echo "  Current Retention: ${CURRENT_RETENTION:-Never} days"
        echo "  Target Retention: $TARGET_RETENTION days"
        
        if [ "$CURRENT_RETENTION" != "$TARGET_RETENTION" ]; then
            execute_cmd \
                "aws logs put-retention-policy --log-group-name $LOG_GROUP --retention-in-days $TARGET_RETENTION --region $REGION" \
                "  Setting retention to $TARGET_RETENTION days"
        else
            echo "  Retention already optimized"
        fi
        echo ""
    done
else
    echo "No log groups found"
fi

# 3. Clean up old Lambda versions
echo -e "${GREEN}=== Lambda Version Cleanup ===${NC}"
echo ""

if [ -n "$LAMBDA_FUNCTIONS" ]; then
    for FUNC in $LAMBDA_FUNCTIONS; do
        echo "Cleaning up: $FUNC"
        
        # List all versions except $LATEST
        VERSIONS=$(aws lambda list-versions-by-function \
            --function-name "$FUNC" \
            --region "$REGION" \
            --query 'Versions[?Version!=`$LATEST`].Version' \
            --output text)
        
        if [ -n "$VERSIONS" ]; then
            VERSION_COUNT=$(echo "$VERSIONS" | wc -w)
            echo "  Found $VERSION_COUNT versions"
            
            # Keep only last 5 versions
            VERSIONS_TO_DELETE=$(echo "$VERSIONS" | tr ' ' '\n' | head -n -5)
            
            if [ -n "$VERSIONS_TO_DELETE" ]; then
                DELETE_COUNT=$(echo "$VERSIONS_TO_DELETE" | wc -l)
                echo "  Deleting $DELETE_COUNT old versions"
                
                for VERSION in $VERSIONS_TO_DELETE; do
                    execute_cmd \
                        "aws lambda delete-function --function-name $FUNC --qualifier $VERSION --region $REGION" \
                        "    Deleting version $VERSION"
                done
            else
                echo "  No versions to delete (keeping last 5)"
            fi
        else
            echo "  No old versions found"
        fi
        echo ""
    done
else
    echo "No Lambda functions found"
fi

# 4. Clean up old ECR images
echo -e "${GREEN}=== ECR Image Cleanup ===${NC}"
echo ""

ECR_REPOS=$(aws ecr describe-repositories \
    --region "$REGION" \
    --query "repositories[?contains(repositoryName, 'visuidp')].repositoryName" \
    --output text 2>/dev/null || echo "")

if [ -n "$ECR_REPOS" ]; then
    for REPO in $ECR_REPOS; do
        echo "Cleaning up: $REPO"
        
        # Get image count
        IMAGE_COUNT=$(aws ecr describe-images \
            --repository-name "$REPO" \
            --region "$REGION" \
            --query 'length(imageDetails)' \
            --output text 2>/dev/null || echo "0")
        
        echo "  Found $IMAGE_COUNT images"
        
        if [ "$IMAGE_COUNT" -gt 10 ]; then
            # Keep only last 10 images
            IMAGES_TO_DELETE=$(aws ecr describe-images \
                --repository-name "$REPO" \
                --region "$REGION" \
                --query 'sort_by(imageDetails,&imagePushedAt)[:-10].imageDigest' \
                --output text)
            
            if [ -n "$IMAGES_TO_DELETE" ]; then
                DELETE_COUNT=$(echo "$IMAGES_TO_DELETE" | wc -w)
                echo "  Deleting $DELETE_COUNT old images"
                
                for DIGEST in $IMAGES_TO_DELETE; do
                    execute_cmd \
                        "aws ecr batch-delete-image --repository-name $REPO --image-ids imageDigest=$DIGEST --region $REGION" \
                        "    Deleting image $DIGEST"
                done
            fi
        else
            echo "  No images to delete (keeping last 10)"
        fi
        echo ""
    done
else
    echo "No ECR repositories found"
fi

# 5. Optimize S3 lifecycle policies
echo -e "${GREEN}=== S3 Lifecycle Optimization ===${NC}"
echo ""

S3_BUCKETS=$(aws s3api list-buckets \
    --query "Buckets[?contains(Name, 'visuidp')].Name" \
    --output text)

if [ -n "$S3_BUCKETS" ]; then
    for BUCKET in $S3_BUCKETS; do
        echo "Analyzing: $BUCKET"
        
        # Check if lifecycle policy exists
        LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration \
            --bucket "$BUCKET" 2>/dev/null || echo "")
        
        if [ -z "$LIFECYCLE" ]; then
            echo "  No lifecycle policy found"
            
            # Create lifecycle policy
            LIFECYCLE_POLICY=$(cat <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "TransitionOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
EOF
)
            
            echo "$LIFECYCLE_POLICY" > /tmp/lifecycle-policy.json
            
            execute_cmd \
                "aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET --lifecycle-configuration file:///tmp/lifecycle-policy.json" \
                "  Creating lifecycle policy"
            
            rm -f /tmp/lifecycle-policy.json
        else
            echo "  Lifecycle policy already configured"
        fi
        echo ""
    done
else
    echo "No S3 buckets found"
fi

# 6. Review DynamoDB billing mode
echo -e "${GREEN}=== DynamoDB Billing Mode Review ===${NC}"
echo ""

DYNAMODB_TABLES=$(aws dynamodb list-tables \
    --region "$REGION" \
    --query "TableNames[?contains(@, 'visuidp')]" \
    --output text)

if [ -n "$DYNAMODB_TABLES" ]; then
    for TABLE in $DYNAMODB_TABLES; do
        echo "Analyzing: $TABLE"
        
        BILLING_MODE=$(aws dynamodb describe-table \
            --table-name "$TABLE" \
            --region "$REGION" \
            --query 'Table.BillingModeSummary.BillingMode' \
            --output text)
        
        echo "  Current Billing Mode: ${BILLING_MODE:-PROVISIONED}"
        
        if [ "$BILLING_MODE" != "PAY_PER_REQUEST" ]; then
            echo -e "  ${YELLOW}Consider switching to on-demand billing for variable workloads${NC}"
            echo "  Run: aws dynamodb update-table --table-name $TABLE --billing-mode PAY_PER_REQUEST --region $REGION"
        else
            echo "  Already using on-demand billing"
        fi
        echo ""
    done
else
    echo "No DynamoDB tables found"
fi

# 7. Summary and recommendations
echo -e "${GREEN}=== Optimization Summary ===${NC}"
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}This was a DRY RUN - no changes were made${NC}"
    echo ""
    echo "To apply these optimizations, run:"
    echo "  DRY_RUN=false ./scripts/optimize-costs.sh $ENVIRONMENT"
else
    echo -e "${GREEN}Optimizations applied successfully!${NC}"
fi

echo ""
echo "Additional Manual Optimizations:"
echo "  1. Review Lambda provisioned concurrency settings"
echo "  2. Optimize CloudFront cache behaviors"
echo "  3. Review API Gateway caching settings"
echo "  4. Consider using ARM64 architecture for Lambda"
echo "  5. Enable S3 Intelligent-Tiering for large buckets"
echo ""

echo "Cost Monitoring:"
echo "  1. Set up AWS Budgets: terraform apply -target=module.cost_management"
echo "  2. Review AWS Cost Explorer regularly"
echo "  3. Enable AWS Cost Anomaly Detection"
echo "  4. Set up billing alerts"
echo ""

echo -e "${GREEN}=== Optimization Complete ===${NC}"
