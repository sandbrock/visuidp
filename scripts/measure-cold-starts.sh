#!/bin/bash

# Lambda Cold Start Measurement Script
#
# This script measures Lambda cold start times by:
# 1. Waiting for Lambda to go idle (15 minutes)
# 2. Invoking the function and measuring response time
# 3. Repeating multiple times to get average cold start time
#
# Requirements: 10.1, 10.2

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/../test-results/cold-starts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="${RESULTS_DIR}/cold-start-results-${TIMESTAMP}.csv"

# Test parameters
NUM_TESTS=${NUM_TESTS:-5}
IDLE_WAIT_TIME=${IDLE_WAIT_TIME:-900}  # 15 minutes in seconds
COLD_START_THRESHOLD=1000  # 1 second in milliseconds (Requirement 10.2)

mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lambda Cold Start Measurement${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed${NC}"
    exit 1
fi

# Check for API URL
if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}Warning: API_URL not set${NC}"
    read -p "Enter API URL: " API_URL
    export API_URL
fi

# Check for authentication
if [ -z "$JWT_TOKEN" ] && [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}Warning: No authentication configured${NC}"
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
echo "  Number of Tests: $NUM_TESTS"
echo "  Idle Wait Time: $IDLE_WAIT_TIME seconds ($(($IDLE_WAIT_TIME / 60)) minutes)"
echo "  Cold Start Threshold: ${COLD_START_THRESHOLD}ms"
echo "  Results File: $RESULTS_FILE"
echo ""

# Prepare CSV file
echo "Test,Timestamp,ResponseTime_ms,Status,IsColdStart" > "$RESULTS_FILE"

# Array to store results
declare -a cold_start_times=()
declare -a warm_start_times=()

# Function to make authenticated request and measure time
measure_request() {
    local test_num=$1
    local is_cold_start=$2
    
    # Build curl command with authentication
    local auth_header=""
    if [ -n "$JWT_TOKEN" ]; then
        auth_header="-H \"Authorization: Bearer $JWT_TOKEN\""
    elif [ -n "$API_KEY" ]; then
        auth_header="-H \"X-API-Key: $API_KEY\""
    fi
    
    # Make request and measure time
    local start_time=$(date +%s%3N)
    local response=$(eval curl -s -w "\n%{http_code}\n%{time_total}" -o /dev/null $auth_header "$API_URL/v1/health")
    local end_time=$(date +%s%3N)
    
    # Parse response
    local http_code=$(echo "$response" | tail -2 | head -1)
    local time_total=$(echo "$response" | tail -1)
    local response_time=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)
    
    # Record result
    local timestamp=$(date +%Y-%m-%d\ %H:%M:%S)
    echo "$test_num,$timestamp,$response_time,$http_code,$is_cold_start" >> "$RESULTS_FILE"
    
    # Store in appropriate array
    if [ "$is_cold_start" = "true" ]; then
        cold_start_times+=($response_time)
    else
        warm_start_times+=($response_time)
    fi
    
    echo "  Response Time: ${response_time}ms (HTTP $http_code)"
    
    # Check if it meets cold start threshold
    if [ "$is_cold_start" = "true" ] && [ "$response_time" -gt "$COLD_START_THRESHOLD" ]; then
        echo -e "  ${YELLOW}⚠ Exceeds cold start threshold of ${COLD_START_THRESHOLD}ms${NC}"
    elif [ "$is_cold_start" = "true" ]; then
        echo -e "  ${GREEN}✓ Meets cold start threshold${NC}"
    fi
}

# Run cold start tests
for i in $(seq 1 $NUM_TESTS); do
    echo -e "${BLUE}Test $i of $NUM_TESTS${NC}"
    
    # Wait for Lambda to go idle
    echo "  Waiting ${IDLE_WAIT_TIME} seconds for Lambda to go idle..."
    echo "  (This ensures the next invocation will be a cold start)"
    
    # Show countdown every minute
    for ((j=$IDLE_WAIT_TIME; j>0; j-=60)); do
        if [ $j -le 60 ]; then
            echo "  ${j} seconds remaining..."
            sleep $j
            break
        else
            echo "  $(($j / 60)) minutes remaining..."
            sleep 60
        fi
    done
    
    echo "  Making cold start request..."
    measure_request $i "true"
    
    # Make a few warm requests immediately after
    echo "  Making warm requests..."
    for w in 1 2 3; do
        sleep 1
        measure_request "${i}.${w}" "false"
    done
    
    echo ""
done

# Calculate statistics
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Cold start statistics
if [ ${#cold_start_times[@]} -gt 0 ]; then
    echo -e "${GREEN}Cold Start Statistics:${NC}"
    
    # Calculate average
    cold_start_sum=0
    cold_start_min=${cold_start_times[0]}
    cold_start_max=${cold_start_times[0]}
    
    for time in "${cold_start_times[@]}"; do
        cold_start_sum=$((cold_start_sum + time))
        if [ $time -lt $cold_start_min ]; then
            cold_start_min=$time
        fi
        if [ $time -gt $cold_start_max ]; then
            cold_start_max=$time
        fi
    done
    
    cold_start_avg=$((cold_start_sum / ${#cold_start_times[@]}))
    
    echo "  Number of Tests: ${#cold_start_times[@]}"
    echo "  Average: ${cold_start_avg}ms"
    echo "  Minimum: ${cold_start_min}ms"
    echo "  Maximum: ${cold_start_max}ms"
    
    # Check against threshold
    if [ $cold_start_avg -le $COLD_START_THRESHOLD ]; then
        echo -e "  ${GREEN}✓ Average cold start meets threshold (<${COLD_START_THRESHOLD}ms)${NC}"
    else
        echo -e "  ${RED}✗ Average cold start exceeds threshold (>${COLD_START_THRESHOLD}ms)${NC}"
    fi
    
    echo ""
fi

# Warm start statistics
if [ ${#warm_start_times[@]} -gt 0 ]; then
    echo -e "${GREEN}Warm Start Statistics:${NC}"
    
    # Calculate average
    warm_start_sum=0
    warm_start_min=${warm_start_times[0]}
    warm_start_max=${warm_start_times[0]}
    
    for time in "${warm_start_times[@]}"; do
        warm_start_sum=$((warm_start_sum + time))
        if [ $time -lt $warm_start_min ]; then
            warm_start_min=$time
        fi
        if [ $time -gt $warm_start_max ]; then
            warm_start_max=$time
        fi
    done
    
    warm_start_avg=$((warm_start_sum / ${#warm_start_times[@]}))
    
    echo "  Number of Tests: ${#warm_start_times[@]}"
    echo "  Average: ${warm_start_avg}ms"
    echo "  Minimum: ${warm_start_min}ms"
    echo "  Maximum: ${warm_start_max}ms"
    echo ""
fi

# Performance comparison
if [ ${#cold_start_times[@]} -gt 0 ] && [ ${#warm_start_times[@]} -gt 0 ]; then
    echo -e "${GREEN}Performance Comparison:${NC}"
    cold_start_overhead=$((cold_start_avg - warm_start_avg))
    cold_start_multiplier=$(echo "scale=2; $cold_start_avg / $warm_start_avg" | bc)
    
    echo "  Cold Start Overhead: ${cold_start_overhead}ms"
    echo "  Cold Start Multiplier: ${cold_start_multiplier}x"
    echo ""
fi

echo "Detailed results saved to: $RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ ${#cold_start_times[@]} -gt 0 ] && [ $cold_start_avg -le $COLD_START_THRESHOLD ]; then
    exit 0
else
    exit 1
fi
