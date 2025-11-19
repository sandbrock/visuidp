#!/bin/bash

# DynamoDB Performance Monitoring Script
#
# This script monitors DynamoDB metrics during load testing:
# - Read/Write capacity consumption
# - Throttled requests
# - Latency
# - Error rates
#
# Requirements: 10.1

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../test-results/dynamodb-monitoring"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="${RESULTS_DIR}/dynamodb-metrics-${TIMESTAMP}.csv"

# Monitoring parameters
DURATION=${DURATION:-300}  # 5 minutes default
INTERVAL=${INTERVAL:-10}   # 10 seconds between samples

mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DynamoDB Performance Monitoring${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Get DynamoDB table name from Terraform
echo "Getting DynamoDB table name from Terraform..."
TABLE_NAME=$(cd "${SCRIPT_DIR}/../terraform" && terraform output -raw dynamodb_table_name 2>/dev/null || echo "")

if [ -z "$TABLE_NAME" ]; then
    echo -e "${YELLOW}Warning: Could not get table name from Terraform${NC}"
    read -p "Enter DynamoDB table name: " TABLE_NAME
fi

if [ -z "$TABLE_NAME" ]; then
    echo -e "${RED}Error: DynamoDB table name is required${NC}"
    exit 1
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  Table Name: $TABLE_NAME"
echo "  Duration: $DURATION seconds ($(($DURATION / 60)) minutes)"
echo "  Sample Interval: $INTERVAL seconds"
echo "  Results File: $RESULTS_FILE"
echo ""

# Prepare CSV file
echo "Timestamp,ConsumedReadCapacity,ConsumedWriteCapacity,ThrottledReads,ThrottledWrites,UserErrors,SystemErrors" > "$RESULTS_FILE"

echo "Starting monitoring..."
echo "Press Ctrl+C to stop"
echo ""

# Calculate end time
end_time=$(($(date +%s) + DURATION))

# Monitoring loop
while [ $(date +%s) -lt $end_time ]; do
    timestamp=$(date +%Y-%m-%d\ %H:%M:%S)
    
    # Get current time for CloudWatch query
    current_time=$(date -u +%Y-%m-%dT%H:%M:%S)
    start_time=$(date -u -d "${INTERVAL} seconds ago" +%Y-%m-%dT%H:%M:%S)
    
    # Query ConsumedReadCapacityUnits
    read_capacity=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name ConsumedReadCapacityUnits \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Query ConsumedWriteCapacityUnits
    write_capacity=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name ConsumedWriteCapacityUnits \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Query ReadThrottleEvents
    read_throttles=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name ReadThrottleEvents \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Query WriteThrottleEvents
    write_throttles=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name WriteThrottleEvents \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Query UserErrors
    user_errors=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name UserErrors \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Query SystemErrors
    system_errors=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/DynamoDB \
        --metric-name SystemErrors \
        --dimensions Name=TableName,Value="$TABLE_NAME" \
        --start-time "$start_time" \
        --end-time "$current_time" \
        --period $INTERVAL \
        --statistics Sum \
        --output json 2>/dev/null | jq -r '.Datapoints[0].Sum // 0')
    
    # Record metrics
    echo "$timestamp,$read_capacity,$write_capacity,$read_throttles,$write_throttles,$user_errors,$system_errors" >> "$RESULTS_FILE"
    
    # Display current metrics
    echo "[$timestamp]"
    echo "  Read Capacity: $read_capacity units"
    echo "  Write Capacity: $write_capacity units"
    
    if [ "$read_throttles" != "0" ] || [ "$write_throttles" != "0" ]; then
        echo -e "  ${RED}Throttles: Read=$read_throttles, Write=$write_throttles${NC}"
    else
        echo -e "  ${GREEN}Throttles: None${NC}"
    fi
    
    if [ "$user_errors" != "0" ] || [ "$system_errors" != "0" ]; then
        echo -e "  ${RED}Errors: User=$user_errors, System=$system_errors${NC}"
    fi
    
    echo ""
    
    # Wait for next interval
    sleep $INTERVAL
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Monitoring Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Analyze results
echo "Analyzing results..."
echo ""

# Calculate totals and averages
total_read_capacity=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f2 | awk '{s+=$1} END {print s}')
total_write_capacity=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f3 | awk '{s+=$1} END {print s}')
total_read_throttles=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f4 | awk '{s+=$1} END {print s}')
total_write_throttles=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f5 | awk '{s+=$1} END {print s}')
total_user_errors=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f6 | awk '{s+=$1} END {print s}')
total_system_errors=$(tail -n +2 "$RESULTS_FILE" | cut -d',' -f7 | awk '{s+=$1} END {print s}')

num_samples=$(tail -n +2 "$RESULTS_FILE" | wc -l)

if [ "$num_samples" -gt 0 ]; then
    avg_read_capacity=$(echo "scale=2; $total_read_capacity / $num_samples" | bc)
    avg_write_capacity=$(echo "scale=2; $total_write_capacity / $num_samples" | bc)
else
    avg_read_capacity=0
    avg_write_capacity=0
fi

echo -e "${GREEN}Summary:${NC}"
echo "  Total Samples: $num_samples"
echo "  Total Read Capacity: $total_read_capacity units"
echo "  Total Write Capacity: $total_write_capacity units"
echo "  Average Read Capacity: $avg_read_capacity units/sample"
echo "  Average Write Capacity: $avg_write_capacity units/sample"
echo ""

if [ "$total_read_throttles" != "0" ] || [ "$total_write_throttles" != "0" ]; then
    echo -e "${RED}Throttling Detected:${NC}"
    echo "  Read Throttles: $total_read_throttles"
    echo "  Write Throttles: $total_write_throttles"
    echo ""
    echo -e "${YELLOW}Recommendation: Consider increasing provisioned capacity or using on-demand billing${NC}"
    echo ""
fi

if [ "$total_user_errors" != "0" ] || [ "$total_system_errors" != "0" ]; then
    echo -e "${RED}Errors Detected:${NC}"
    echo "  User Errors: $total_user_errors"
    echo "  System Errors: $total_system_errors"
    echo ""
fi

echo "Detailed results saved to: $RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ "$total_read_throttles" = "0" ] && [ "$total_write_throttles" = "0" ] && \
   [ "$total_user_errors" = "0" ] && [ "$total_system_errors" = "0" ]; then
    echo -e "${GREEN}✓ No issues detected${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Issues detected during monitoring${NC}"
    exit 1
fi
