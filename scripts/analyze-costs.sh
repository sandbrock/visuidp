#!/bin/bash

# Cost Analysis Script for VisuIDP AWS Deployment
# Analyzes actual costs, compares against estimates, and identifies optimization opportunities

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
START_DATE="${2:-$(date -d '30 days ago' +%Y-%m-%d)}"
END_DATE="${3:-$(date +%Y-%m-%d)}"
REGION="${AWS_REGION:-us-east-1}"

echo -e "${BLUE}=== VisuIDP Cost Analysis ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Period: $START_DATE to $END_DATE"
echo "Region: $REGION"
echo ""

# Function to format currency
format_currency() {
    printf "$%.2f" "$1"
}

# Function to calculate percentage
calc_percentage() {
    local actual=$1
    local estimate=$2
    if [ "$estimate" != "0" ]; then
        echo "scale=2; ($actual / $estimate) * 100" | bc
    else
        echo "N/A"
    fi
}

# Get total cost for the period
echo -e "${BLUE}Fetching total costs...${NC}"
TOTAL_COST=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --filter file:/dev/stdin <<EOF | jq -r '.ResultsByTime[0].Total.BlendedCost.Amount'
{
  "Tags": {
    "Key": "Project",
    "Values": ["VisuIDP"]
  }
}
EOF
)

echo -e "${GREEN}Total Cost: $(format_currency $TOTAL_COST)${NC}"
echo ""

# Get cost by service
echo -e "${BLUE}Fetching costs by service...${NC}"
SERVICE_COSTS=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE \
    --filter file:/dev/stdin <<EOF
{
  "Tags": {
    "Key": "Project",
    "Values": ["VisuIDP"]
  }
}
EOF
)

echo ""
echo "Cost by Service:"
echo "----------------"
echo "$SERVICE_COSTS" | jq -r '.ResultsByTime[0].Groups[] | "\(.Keys[0]): $\(.Metrics.BlendedCost.Amount)"' | sort -t'$' -k2 -rn | head -10

# Get cost by environment
echo ""
echo -e "${BLUE}Fetching costs by environment...${NC}"
ENV_COSTS=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=TAG,Key=Environment \
    --filter file:/dev/stdin <<EOF
{
  "Tags": {
    "Key": "Project",
    "Values": ["VisuIDP"]
  }
}
EOF
)

echo ""
echo "Cost by Environment:"
echo "--------------------"
echo "$ENV_COSTS" | jq -r '.ResultsByTime[0].Groups[] | "\(.Keys[0]): $\(.Metrics.BlendedCost.Amount)"'

# Lambda-specific analysis
echo ""
echo -e "${BLUE}Lambda Function Analysis...${NC}"
LAMBDA_FUNCTIONS=$(aws lambda list-functions \
    --region "$REGION" \
    --query "Functions[?Tags.Project=='VisuIDP' && Tags.Environment=='$ENVIRONMENT'].FunctionName" \
    --output text)

if [ -n "$LAMBDA_FUNCTIONS" ]; then
    echo "Lambda Functions:"
    for FUNC in $LAMBDA_FUNCTIONS; do
        echo "  - $FUNC"
        
        # Get invocation count
        INVOCATIONS=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Invocations \
            --dimensions Name=FunctionName,Value="$FUNC" \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Sum \
            --region "$REGION" \
            --query 'Datapoints[0].Sum' \
            --output text)
        
        # Get average duration
        AVG_DURATION=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Duration \
            --dimensions Name=FunctionName,Value="$FUNC" \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Average \
            --region "$REGION" \
            --query 'Datapoints[0].Average' \
            --output text)
        
        # Get memory size
        MEMORY=$(aws lambda get-function-configuration \
            --function-name "$FUNC" \
            --region "$REGION" \
            --query 'MemorySize' \
            --output text)
        
        echo "    Invocations: ${INVOCATIONS:-0}"
        echo "    Avg Duration: ${AVG_DURATION:-0} ms"
        echo "    Memory: ${MEMORY} MB"
        
        # Calculate estimated cost
        if [ "$INVOCATIONS" != "None" ] && [ "$AVG_DURATION" != "None" ]; then
            GB_SECONDS=$(echo "scale=6; ($INVOCATIONS * $AVG_DURATION / 1000) * ($MEMORY / 1024)" | bc)
            ESTIMATED_COST=$(echo "scale=4; $GB_SECONDS * 0.0000166667" | bc)
            echo "    Estimated Cost: \$$ESTIMATED_COST"
        fi
        echo ""
    done
else
    echo "No Lambda functions found for environment: $ENVIRONMENT"
fi

# DynamoDB analysis
echo ""
echo -e "${BLUE}DynamoDB Table Analysis...${NC}"
DYNAMODB_TABLES=$(aws dynamodb list-tables \
    --region "$REGION" \
    --query "TableNames[?contains(@, 'visuidp')]" \
    --output text)

if [ -n "$DYNAMODB_TABLES" ]; then
    for TABLE in $DYNAMODB_TABLES; do
        echo "Table: $TABLE"
        
        # Get table details
        TABLE_INFO=$(aws dynamodb describe-table \
            --table-name "$TABLE" \
            --region "$REGION")
        
        BILLING_MODE=$(echo "$TABLE_INFO" | jq -r '.Table.BillingModeSummary.BillingMode // "PROVISIONED"')
        TABLE_SIZE=$(echo "$TABLE_INFO" | jq -r '.Table.TableSizeBytes')
        ITEM_COUNT=$(echo "$TABLE_INFO" | jq -r '.Table.ItemCount')
        
        echo "  Billing Mode: $BILLING_MODE"
        echo "  Size: $(echo "scale=2; $TABLE_SIZE / 1024 / 1024" | bc) MB"
        echo "  Item Count: $ITEM_COUNT"
        
        # Get read/write metrics
        READ_CAPACITY=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/DynamoDB \
            --metric-name ConsumedReadCapacityUnits \
            --dimensions Name=TableName,Value="$TABLE" \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Sum \
            --region "$REGION" \
            --query 'Datapoints[0].Sum' \
            --output text)
        
        WRITE_CAPACITY=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/DynamoDB \
            --metric-name ConsumedWriteCapacityUnits \
            --dimensions Name=TableName,Value="$TABLE" \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Sum \
            --region "$REGION" \
            --query 'Datapoints[0].Sum' \
            --output text)
        
        echo "  Read Capacity Units: ${READ_CAPACITY:-0}"
        echo "  Write Capacity Units: ${WRITE_CAPACITY:-0}"
        
        # Estimate cost for on-demand
        if [ "$READ_CAPACITY" != "None" ] && [ "$WRITE_CAPACITY" != "None" ]; then
            READ_COST=$(echo "scale=4; ($READ_CAPACITY / 1000000) * 0.25" | bc)
            WRITE_COST=$(echo "scale=4; ($WRITE_CAPACITY / 1000000) * 1.25" | bc)
            STORAGE_COST=$(echo "scale=4; ($TABLE_SIZE / 1024 / 1024 / 1024) * 0.25" | bc)
            TOTAL_TABLE_COST=$(echo "scale=4; $READ_COST + $WRITE_COST + $STORAGE_COST" | bc)
            echo "  Estimated Cost: \$$TOTAL_TABLE_COST (Read: \$$READ_COST, Write: \$$WRITE_COST, Storage: \$$STORAGE_COST)"
        fi
        echo ""
    done
else
    echo "No DynamoDB tables found"
fi

# CloudFront analysis
echo ""
echo -e "${BLUE}CloudFront Distribution Analysis...${NC}"
DISTRIBUTIONS=$(aws cloudfront list-distributions \
    --region us-east-1 \
    --query "DistributionList.Items[?Comment=='VisuIDP'].Id" \
    --output text)

if [ -n "$DISTRIBUTIONS" ]; then
    for DIST_ID in $DISTRIBUTIONS; do
        echo "Distribution: $DIST_ID"
        
        # Get request count
        REQUESTS=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/CloudFront \
            --metric-name Requests \
            --dimensions Name=DistributionId,Value="$DIST_ID" Name=Region,Value=Global \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Sum \
            --region us-east-1 \
            --query 'Datapoints[0].Sum' \
            --output text)
        
        # Get bytes downloaded
        BYTES=$(aws cloudwatch get-metric-statistics \
            --namespace AWS/CloudFront \
            --metric-name BytesDownloaded \
            --dimensions Name=DistributionId,Value="$DIST_ID" Name=Region,Value=Global \
            --start-time "$START_DATE" \
            --end-time "$END_DATE" \
            --period 2592000 \
            --statistics Sum \
            --region us-east-1 \
            --query 'Datapoints[0].Sum' \
            --output text)
        
        echo "  Requests: ${REQUESTS:-0}"
        echo "  Data Transfer: $(echo "scale=2; ${BYTES:-0} / 1024 / 1024 / 1024" | bc) GB"
        
        # Estimate cost
        if [ "$REQUESTS" != "None" ] && [ "$BYTES" != "None" ]; then
            REQUEST_COST=$(echo "scale=4; ($REQUESTS / 10000) * 0.0075" | bc)
            DATA_COST=$(echo "scale=4; (${BYTES} / 1024 / 1024 / 1024) * 0.085" | bc)
            TOTAL_CF_COST=$(echo "scale=4; $REQUEST_COST + $DATA_COST" | bc)
            echo "  Estimated Cost: \$$TOTAL_CF_COST (Requests: \$$REQUEST_COST, Data: \$$DATA_COST)"
        fi
        echo ""
    done
else
    echo "No CloudFront distributions found"
fi

# Cost comparison with estimates
echo ""
echo -e "${BLUE}=== Cost Comparison ===${NC}"
echo ""

# Expected costs from design document
case $ENVIRONMENT in
    dev)
        ESTIMATED_COST=11
        ;;
    staging)
        ESTIMATED_COST=25
        ;;
    prod)
        ESTIMATED_COST=50
        ;;
    *)
        ESTIMATED_COST=50
        ;;
esac

ACTUAL_COST=$(echo "$TOTAL_COST" | awk '{printf "%.2f", $1}')
PERCENTAGE=$(calc_percentage "$ACTUAL_COST" "$ESTIMATED_COST")

echo "Estimated Monthly Cost: \$$ESTIMATED_COST"
echo "Actual Cost (period):   \$$ACTUAL_COST"

if [ "$PERCENTAGE" != "N/A" ]; then
    PERCENTAGE_INT=$(echo "$PERCENTAGE" | awk '{print int($1)}')
    if [ "$PERCENTAGE_INT" -gt 120 ]; then
        echo -e "${RED}Status: Over budget (${PERCENTAGE}%)${NC}"
        echo -e "${YELLOW}⚠️  Cost is significantly higher than estimated${NC}"
    elif [ "$PERCENTAGE_INT" -gt 100 ]; then
        echo -e "${YELLOW}Status: Slightly over budget (${PERCENTAGE}%)${NC}"
    else
        echo -e "${GREEN}Status: Within budget (${PERCENTAGE}%)${NC}"
    fi
fi

# Optimization recommendations
echo ""
echo -e "${BLUE}=== Optimization Recommendations ===${NC}"
echo ""

# Check Lambda memory utilization
echo "Lambda Optimization:"
for FUNC in $LAMBDA_FUNCTIONS; do
    MAX_MEMORY=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name MemoryUtilization \
        --dimensions Name=FunctionName,Value="$FUNC" \
        --start-time "$START_DATE" \
        --end-time "$END_DATE" \
        --period 2592000 \
        --statistics Maximum \
        --region "$REGION" \
        --query 'Datapoints[0].Maximum' \
        --output text 2>/dev/null || echo "None")
    
    if [ "$MAX_MEMORY" != "None" ] && [ -n "$MAX_MEMORY" ]; then
        MAX_MEMORY_INT=$(echo "$MAX_MEMORY" | awk '{print int($1)}')
        if [ "$MAX_MEMORY_INT" -lt 60 ]; then
            echo -e "  ${YELLOW}✓ Consider reducing memory for $FUNC (max usage: ${MAX_MEMORY}%)${NC}"
        elif [ "$MAX_MEMORY_INT" -gt 90 ]; then
            echo -e "  ${YELLOW}✓ Consider increasing memory for $FUNC (max usage: ${MAX_MEMORY}%)${NC}"
        fi
    fi
done

# Check DynamoDB billing mode
echo ""
echo "DynamoDB Optimization:"
for TABLE in $DYNAMODB_TABLES; do
    BILLING_MODE=$(aws dynamodb describe-table \
        --table-name "$TABLE" \
        --region "$REGION" \
        --query 'Table.BillingModeSummary.BillingMode' \
        --output text)
    
    if [ "$BILLING_MODE" = "PROVISIONED" ]; then
        echo -e "  ${YELLOW}✓ Consider switching $TABLE to on-demand billing for variable workloads${NC}"
    fi
done

# Check log retention
echo ""
echo "CloudWatch Logs Optimization:"
LOG_GROUPS=$(aws logs describe-log-groups \
    --region "$REGION" \
    --query "logGroups[?contains(logGroupName, 'visuidp')].logGroupName" \
    --output text)

for LOG_GROUP in $LOG_GROUPS; do
    RETENTION=$(aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region "$REGION" \
        --query 'logGroups[0].retentionInDays' \
        --output text)
    
    if [ "$RETENTION" = "None" ] || [ "$RETENTION" -gt 7 ]; then
        echo -e "  ${YELLOW}✓ Consider reducing retention for $LOG_GROUP (current: ${RETENTION:-Never} days)${NC}"
    fi
done

# Check for unused resources
echo ""
echo "Resource Cleanup:"
echo "  ✓ Review and delete old Lambda versions"
echo "  ✓ Clean up old ECR images"
echo "  ✓ Remove unused S3 objects"
echo "  ✓ Delete old CloudWatch log streams"

# Cost forecast
echo ""
echo -e "${BLUE}=== Cost Forecast ===${NC}"
FORECAST=$(aws ce get-cost-forecast \
    --time-period Start="$(date +%Y-%m-%d)",End="$(date -d '+30 days' +%Y-%m-%d)" \
    --metric BLENDED_COST \
    --granularity MONTHLY \
    --filter file:/dev/stdin <<EOF 2>/dev/null || echo "N/A"
{
  "Tags": {
    "Key": "Project",
    "Values": ["VisuIDP"]
  }
}
EOF
)

if [ "$FORECAST" != "N/A" ]; then
    FORECAST_AMOUNT=$(echo "$FORECAST" | jq -r '.Total.Amount')
    echo "Forecasted cost for next 30 days: \$$FORECAST_AMOUNT"
else
    echo "Cost forecast not available (requires historical data)"
fi

echo ""
echo -e "${GREEN}=== Analysis Complete ===${NC}"
echo ""
echo "For detailed cost analysis, visit AWS Cost Explorer:"
echo "https://console.aws.amazon.com/cost-management/home#/cost-explorer"
