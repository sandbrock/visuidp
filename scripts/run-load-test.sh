#!/bin/bash

# AWS Lambda + DynamoDB Load Test Runner
# 
# This script runs comprehensive load and performance tests against the deployed
# AWS infrastructure including Lambda, API Gateway, and DynamoDB.
#
# Requirements: 10.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../test-results/load-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="${RESULTS_DIR}/load-test-${TIMESTAMP}.json"
SUMMARY_FILE="${RESULTS_DIR}/load-test-summary-${TIMESTAMP}.txt"
METRICS_FILE="${RESULTS_DIR}/cloudwatch-metrics-${TIMESTAMP}.json"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AWS Lambda + DynamoDB Load Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    echo ""
    echo "On Ubuntu/Debian:"
    echo "  sudo gpg -k"
    echo "  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "  echo \"deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install k6"
    echo ""
    echo "On macOS:"
    echo "  brew install k6"
    exit 1
fi

# Check for required environment variables
if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}Warning: API_URL not set${NC}"
    echo "Please set the API Gateway URL:"
    echo "  export API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com"
    echo ""
    read -p "Enter API URL: " API_URL
    export API_URL
fi

if [ -z "$JWT_TOKEN" ] && [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}Warning: No authentication configured${NC}"
    echo "Please set either JWT_TOKEN or API_KEY:"
    echo "  export JWT_TOKEN=your-jwt-token"
    echo "  OR"
    echo "  export API_KEY=your-api-key"
    echo ""
    read -p "Enter JWT Token (or press Enter to skip): " JWT_TOKEN
    if [ -n "$JWT_TOKEN" ]; then
        export JWT_TOKEN
    else
        read -p "Enter API Key (or press Enter to skip): " API_KEY
        export API_KEY
    fi
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Authentication: $([ -n "$JWT_TOKEN" ] && echo "JWT Token" || ([ -n "$API_KEY" ] && echo "API Key" || echo "None"))"
echo "  Results Directory: $RESULTS_DIR"
echo ""

# Test API connectivity
echo -e "${BLUE}Testing API connectivity...${NC}"
if curl -s -f -o /dev/null "$API_URL/v1/health" 2>/dev/null; then
    echo -e "${GREEN}✓ API is reachable${NC}"
else
    echo -e "${RED}✗ API is not reachable${NC}"
    echo "Please check your API_URL and network connectivity"
    exit 1
fi
echo ""

# Run load test
echo -e "${BLUE}Starting load test...${NC}"
echo "This will take approximately 6 minutes"
echo ""

k6 run \
    --out json="${RESULTS_FILE}" \
    --summary-export="${SUMMARY_FILE}" \
    "${SCRIPT_DIR}/load-test-aws.js"

LOAD_TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Load Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $LOAD_TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Load test passed all thresholds${NC}"
else
    echo -e "${YELLOW}⚠ Load test completed with threshold violations${NC}"
fi

echo ""
echo "Results saved to:"
echo "  JSON: $RESULTS_FILE"
echo "  Summary: $SUMMARY_FILE"
echo ""

# Collect CloudWatch metrics if AWS CLI is available
if command -v aws &> /dev/null; then
    echo -e "${BLUE}Collecting CloudWatch metrics...${NC}"
    
    # Get Lambda function name from Terraform output
    LAMBDA_FUNCTION_NAME=$(cd "${SCRIPT_DIR}/../terraform" && terraform output -raw lambda_api_function_name 2>/dev/null || echo "")
    
    if [ -n "$LAMBDA_FUNCTION_NAME" ]; then
        # Get metrics for the last 10 minutes
        END_TIME=$(date -u +%Y-%m-%dT%H:%M:%S)
        START_TIME=$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S)
        
        echo "  Lambda Function: $LAMBDA_FUNCTION_NAME"
        echo "  Time Range: $START_TIME to $END_TIME"
        
        # Collect Lambda metrics
        aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Duration \
            --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION_NAME" \
            --start-time "$START_TIME" \
            --end-time "$END_TIME" \
            --period 60 \
            --statistics Average,Maximum,Minimum \
            --output json > "${METRICS_FILE}.lambda-duration.json" 2>/dev/null || true
        
        aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Errors \
            --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION_NAME" \
            --start-time "$START_TIME" \
            --end-time "$END_TIME" \
            --period 60 \
            --statistics Sum \
            --output json > "${METRICS_FILE}.lambda-errors.json" 2>/dev/null || true
        
        aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name Throttles \
            --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION_NAME" \
            --start-time "$START_TIME" \
            --end-time "$END_TIME" \
            --period 60 \
            --statistics Sum \
            --output json > "${METRICS_FILE}.lambda-throttles.json" 2>/dev/null || true
        
        aws cloudwatch get-metric-statistics \
            --namespace AWS/Lambda \
            --metric-name ConcurrentExecutions \
            --dimensions Name=FunctionName,Value="$LAMBDA_FUNCTION_NAME" \
            --start-time "$START_TIME" \
            --end-time "$END_TIME" \
            --period 60 \
            --statistics Average,Maximum \
            --output json > "${METRICS_FILE}.lambda-concurrency.json" 2>/dev/null || true
        
        echo -e "${GREEN}✓ CloudWatch metrics collected${NC}"
        echo "  Metrics saved to: ${METRICS_FILE}.*.json"
    else
        echo -e "${YELLOW}⚠ Could not determine Lambda function name${NC}"
        echo "  Skipping CloudWatch metrics collection"
    fi
else
    echo -e "${YELLOW}⚠ AWS CLI not installed${NC}"
    echo "  Skipping CloudWatch metrics collection"
fi

echo ""

# Analyze results
echo -e "${BLUE}Analyzing results...${NC}"
echo ""

if [ -f "$SUMMARY_FILE" ]; then
    cat "$SUMMARY_FILE"
else
    echo -e "${YELLOW}⚠ Summary file not found${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. Review the detailed results in: $RESULTS_FILE"
echo "2. Check CloudWatch metrics in AWS Console"
echo "3. Analyze Lambda cold start times"
echo "4. Review DynamoDB throttling events"
echo "5. Document findings in task 27.1"
echo ""

exit $LOAD_TEST_EXIT_CODE
