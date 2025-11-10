#!/bin/bash

# Sustained Load Test Script
# Runs continuous load for a longer period to observe connection pool behavior

set -e

BASE_URL="http://localhost:8082"
HEALTH_ENDPOINT="${BASE_URL}/api/q/health/ready"
DURATION=30
CONCURRENT=50
LOG_FILE="sustained-load-test-results.log"

echo "========================================" | tee "$LOG_FILE"
echo "Sustained Load Test" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"
echo "Duration: ${DURATION} seconds" | tee -a "$LOG_FILE"
echo "Concurrent Requests: $CONCURRENT" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Function to make continuous requests
make_requests() {
    local worker_id=$1
    local end_time=$2
    local count=0
    
    while [ $(date +%s) -lt $end_time ]; do
        curl -s -o /dev/null -w "%{http_code}\n" "$HEALTH_ENDPOINT" >> "/tmp/worker-${worker_id}.txt"
        count=$((count + 1))
    done
    
    echo "$count" > "/tmp/worker-${worker_id}-count.txt"
}

export -f make_requests
export HEALTH_ENDPOINT

# Clean up old worker files
rm -f /tmp/worker-*.txt

# Start monitoring in background
echo "Starting connection pool monitoring..." | tee -a "$LOG_FILE"
./scripts/monitor-during-load.sh > sustained-load-monitoring.csv &
MONITOR_PID=$!

sleep 1

# Calculate end time
end_time=$(($(date +%s) + DURATION))

echo "Starting sustained load test..." | tee -a "$LOG_FILE"
start_time=$(date +%s)

# Launch worker processes
for i in $(seq 1 $CONCURRENT); do
    bash -c "make_requests $i $end_time" &
done

# Wait for all workers to complete
wait

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true
wait $MONITOR_PID 2>/dev/null || true

actual_duration=$(($(date +%s) - start_time))

echo "" | tee -a "$LOG_FILE"
echo "Load test completed in ${actual_duration} seconds" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Collect results
total_requests=0
success_count=0

for i in $(seq 1 $CONCURRENT); do
    if [ -f "/tmp/worker-${i}.txt" ]; then
        worker_requests=$(wc -l < "/tmp/worker-${i}.txt")
        worker_success=$(grep -c "200" "/tmp/worker-${i}.txt" || true)
        total_requests=$((total_requests + worker_requests))
        success_count=$((success_count + worker_success))
    fi
done

error_count=$((total_requests - success_count))

echo "Results:" | tee -a "$LOG_FILE"
echo "  Total Requests: $total_requests" | tee -a "$LOG_FILE"
echo "  Successful (200): $success_count" | tee -a "$LOG_FILE"
echo "  Errors: $error_count" | tee -a "$LOG_FILE"
echo "  Success Rate: $(awk "BEGIN {printf \"%.2f\", ($success_count / $total_requests) * 100}")%" | tee -a "$LOG_FILE"
echo "  Requests/Second: $(awk "BEGIN {printf \"%.2f\", $total_requests / $actual_duration}")" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Analyze connection pool metrics
echo "Analyzing connection pool metrics..." | tee -a "$LOG_FILE"
if [ -f "sustained-load-monitoring.csv" ]; then
    max_active=$(tail -n +3 sustained-load-monitoring.csv | cut -d',' -f2 | sort -n | tail -1)
    max_awaiting=$(tail -n +3 sustained-load-monitoring.csv | cut -d',' -f5 | sort -n | tail -1)
    total_created=$(tail -n +3 sustained-load-monitoring.csv | cut -d',' -f6 | sort -n | tail -1)
    
    echo "  Peak Active Connections: $max_active" | tee -a "$LOG_FILE"
    echo "  Peak Awaiting Connections: $max_awaiting" | tee -a "$LOG_FILE"
    echo "  Total Connections Created: $total_created" | tee -a "$LOG_FILE"
    
    if [ "$max_active" != "null" ] && [ "$max_active" -gt 0 ]; then
        utilization=$(awk "BEGIN {printf \"%.2f\", ($max_active / 20) * 100}")
        echo "  Peak Pool Utilization: ${utilization}%" | tee -a "$LOG_FILE"
        
        if (( $(echo "$utilization > 80" | bc -l) )); then
            echo "  ⚠️  WARNING: Pool utilization exceeded 80%!" | tee -a "$LOG_FILE"
        else
            echo "  ✓ Pool utilization stayed below 80%" | tee -a "$LOG_FILE"
        fi
    fi
fi

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "End Time: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$error_count" -eq 0 ] && [ "$max_awaiting" = "0" ]; then
    echo "✓ Load test passed: All requests successful, no connection waits" | tee -a "$LOG_FILE"
else
    echo "⚠️  Issues detected during load test" | tee -a "$LOG_FILE"
fi

# Cleanup
rm -f /tmp/worker-*.txt

exit 0
