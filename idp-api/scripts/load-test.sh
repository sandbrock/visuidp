#!/bin/bash

# Load Test Script for Transaction Management Audit
# This script performs load testing with 100+ concurrent requests
# and monitors connection pool metrics

set -e

# Configuration
BASE_URL="http://localhost:8082"
HEALTH_ENDPOINT="${BASE_URL}/api/q/health/ready"
METRICS_ENDPOINT="${BASE_URL}/api/q/metrics"
NUM_REQUESTS=500
CONCURRENT_REQUESTS=100
LOG_FILE="load-test-results.log"
METRICS_FILE="load-test-metrics.log"

echo "========================================" | tee "$LOG_FILE"
echo "Transaction Management Load Test" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"
echo "Total Requests: $NUM_REQUESTS" | tee -a "$LOG_FILE"
echo "Concurrent Requests: $CONCURRENT_REQUESTS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Function to check health and get connection pool metrics
check_metrics() {
    local label=$1
    echo "[$label] Checking connection pool metrics..." | tee -a "$LOG_FILE"
    
    # Get health status
    health_status=$(curl -s "$HEALTH_ENDPOINT" | jq -r '.status')
    echo "  Health Status: $health_status" | tee -a "$LOG_FILE"
    
    # Get connection pool metrics from health endpoint
    pool_metrics=$(curl -s "$HEALTH_ENDPOINT" | jq '.checks[] | select(.name == "database-postgresql")')
    
    if [ -n "$pool_metrics" ]; then
        active=$(echo "$pool_metrics" | jq -r '.data."connectionPool.active" // "N/A"')
        available=$(echo "$pool_metrics" | jq -r '.data."connectionPool.available" // "N/A"')
        awaiting=$(echo "$pool_metrics" | jq -r '.data."connectionPool.awaiting" // "N/A"')
        max_size=$(echo "$pool_metrics" | jq -r '.data."connectionPool.max" // "N/A"')
        
        echo "  Active Connections: $active" | tee -a "$LOG_FILE"
        echo "  Available Connections: $available" | tee -a "$LOG_FILE"
        echo "  Awaiting Connections: $awaiting" | tee -a "$LOG_FILE"
        echo "  Max Pool Size: $max_size" | tee -a "$LOG_FILE"
        
        # Calculate utilization if we have the data
        if [ "$active" != "N/A" ] && [ "$max_size" != "N/A" ] && [ "$max_size" -gt 0 ]; then
            utilization=$(awk "BEGIN {printf \"%.2f\", ($active / $max_size) * 100}")
            echo "  Pool Utilization: ${utilization}%" | tee -a "$LOG_FILE"
            
            # Check if utilization exceeds 80%
            if (( $(echo "$utilization > 80" | bc -l) )); then
                echo "  ⚠️  WARNING: Pool utilization exceeds 80%!" | tee -a "$LOG_FILE"
            else
                echo "  ✓ Pool utilization is healthy (< 80%)" | tee -a "$LOG_FILE"
            fi
        fi
    else
        echo "  ⚠️  Could not retrieve connection pool metrics" | tee -a "$LOG_FILE"
    fi
    
    echo "" | tee -a "$LOG_FILE"
}

# Check initial metrics
check_metrics "BEFORE LOAD TEST"

echo "Starting load test..." | tee -a "$LOG_FILE"
echo "Executing $NUM_REQUESTS requests with $CONCURRENT_REQUESTS concurrent connections..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Start time
start_time=$(date +%s)

# Execute load test using background processes
> /tmp/load-test-responses.txt
for i in $(seq 1 "$NUM_REQUESTS"); do
    # Launch requests in batches to maintain concurrency
    if [ $((i % CONCURRENT_REQUESTS)) -eq 0 ]; then
        wait  # Wait for current batch to complete
    fi
    (curl -s -o /dev/null -w "%{http_code}\n" "$HEALTH_ENDPOINT" >> /tmp/load-test-responses.txt) &
done
wait  # Wait for all remaining requests

# End time
end_time=$(date +%s)
duration=$((end_time - start_time))
if [ "$duration" -eq 0 ]; then
    duration=1  # Avoid division by zero
fi

echo "Load test completed in ${duration} seconds" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Analyze responses
total_requests=$(wc -l < /tmp/load-test-responses.txt)
success_count=$(grep -c "200" /tmp/load-test-responses.txt || true)
error_count=$((total_requests - success_count))

echo "Results:" | tee -a "$LOG_FILE"
echo "  Total Requests: $total_requests" | tee -a "$LOG_FILE"
echo "  Successful (200): $success_count" | tee -a "$LOG_FILE"
echo "  Errors: $error_count" | tee -a "$LOG_FILE"
echo "  Success Rate: $(awk "BEGIN {printf \"%.2f\", ($success_count / $total_requests) * 100}")%" | tee -a "$LOG_FILE"
echo "  Requests/Second: $(awk "BEGIN {printf \"%.2f\", $total_requests / $duration}")" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Check metrics after load test
check_metrics "AFTER LOAD TEST"

# Wait a bit and check metrics again to see if connections are released
echo "Waiting 10 seconds for connections to be released..." | tee -a "$LOG_FILE"
sleep 10
check_metrics "AFTER COOLDOWN"

# Check application logs for errors
echo "Checking application logs for connection errors..." | tee -a "$LOG_FILE"
if docker logs idp-api-postgres-1 2>&1 | grep -i "timeout\|exhausted\|acquisition" | tail -20 > /tmp/connection-errors.txt 2>&1; then
    if [ -s /tmp/connection-errors.txt ]; then
        echo "⚠️  Found potential connection errors in logs:" | tee -a "$LOG_FILE"
        cat /tmp/connection-errors.txt | tee -a "$LOG_FILE"
    else
        echo "✓ No connection timeout or exhaustion errors found in logs" | tee -a "$LOG_FILE"
    fi
else
    echo "✓ No connection timeout or exhaustion errors found in logs" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Load Test Summary" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "End Time: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$error_count" -eq 0 ]; then
    echo "✓ All requests completed successfully" | tee -a "$LOG_FILE"
else
    echo "⚠️  Some requests failed ($error_count errors)" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Full results saved to: $LOG_FILE" | tee -a "$LOG_FILE"

# Cleanup
rm -f /tmp/load-test-responses.txt /tmp/connection-errors.txt

exit 0
