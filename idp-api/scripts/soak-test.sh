#!/bin/bash

# Soak Test Script
# Runs application under normal load for 1 hour to verify stability
# and detect any connection pool exhaustion issues over time

set -e

BASE_URL="http://localhost:8082"
HEALTH_ENDPOINT="${BASE_URL}/api/q/health/ready"
DURATION=3600  # 1 hour in seconds
CONCURRENT=20  # Normal load (not peak)
LOG_FILE="soak-test-results.log"
MONITORING_FILE="soak-test-monitoring.csv"
ERROR_LOG="soak-test-errors.log"

echo "========================================" | tee "$LOG_FILE"
echo "Soak Test - 1 Hour Duration" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"
echo "Duration: ${DURATION} seconds (1 hour)" | tee -a "$LOG_FILE"
echo "Concurrent Requests: $CONCURRENT (normal load)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Function to make continuous requests
make_requests() {
    local worker_id=$1
    local end_time=$2
    local count=0
    local errors=0
    
    while [ $(date +%s) -lt $end_time ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" 2>&1)
        
        if [ "$response" = "200" ]; then
            echo "200" >> "/tmp/soak-worker-${worker_id}.txt"
            count=$((count + 1))
        else
            echo "ERROR" >> "/tmp/soak-worker-${worker_id}.txt"
            echo "[$(date)] Worker $worker_id: HTTP $response" >> "$ERROR_LOG"
            errors=$((errors + 1))
        fi
        
        # Small delay to simulate normal load (not stress test)
        sleep 0.1
    done
    
    echo "$count" > "/tmp/soak-worker-${worker_id}-count.txt"
    echo "$errors" > "/tmp/soak-worker-${worker_id}-errors.txt"
}

export -f make_requests
export HEALTH_ENDPOINT
export ERROR_LOG

# Clean up old worker files
rm -f /tmp/soak-worker-*.txt
rm -f "$ERROR_LOG"

# Function to monitor connection pool continuously
monitor_pool() {
    local end_time=$1
    local interval=30  # Check every 30 seconds
    
    echo "timestamp,active,available,awaiting,max,utilization_pct" > "$MONITORING_FILE"
    
    while [ $(date +%s) -lt $end_time ]; do
        timestamp=$(date +%s)
        
        # Get connection pool metrics
        pool_data=$(curl -s "$HEALTH_ENDPOINT" | jq '.checks[] | select(.name == "database-postgresql")')
        
        if [ -n "$pool_data" ]; then
            active=$(echo "$pool_data" | jq -r '.data."connectionPool.active" // "0"')
            available=$(echo "$pool_data" | jq -r '.data."connectionPool.available" // "0"')
            awaiting=$(echo "$pool_data" | jq -r '.data."connectionPool.awaiting" // "0"')
            max_size=$(echo "$pool_data" | jq -r '.data."connectionPool.max" // "20"')
            
            # Calculate utilization
            if [ "$max_size" -gt 0 ]; then
                utilization=$(awk "BEGIN {printf \"%.2f\", ($active / $max_size) * 100}")
            else
                utilization="0.00"
            fi
            
            echo "$timestamp,$active,$available,$awaiting,$max_size,$utilization" >> "$MONITORING_FILE"
            
            # Check for issues
            if (( $(echo "$utilization > 80" | bc -l) )); then
                echo "[$(date)] WARNING: Pool utilization at ${utilization}%" | tee -a "$LOG_FILE"
            fi
            
            if [ "$awaiting" != "0" ]; then
                echo "[$(date)] WARNING: $awaiting connections awaiting" | tee -a "$LOG_FILE"
            fi
        fi
        
        sleep $interval
    done
}

export -f monitor_pool
export MONITORING_FILE
export LOG_FILE

echo "Starting connection pool monitoring..." | tee -a "$LOG_FILE"
bash -c "monitor_pool $(($(date +%s) + DURATION))" &
MONITOR_PID=$!

sleep 2

# Calculate end time
end_time=$(($(date +%s) + DURATION))

echo "Starting soak test with $CONCURRENT concurrent workers..." | tee -a "$LOG_FILE"
echo "Test will run for 1 hour. Progress updates every 5 minutes." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

start_time=$(date +%s)

# Launch worker processes
for i in $(seq 1 $CONCURRENT); do
    bash -c "make_requests $i $end_time" &
done

# Progress reporting
report_interval=300  # 5 minutes
next_report=$((start_time + report_interval))

while [ $(date +%s) -lt $end_time ]; do
    current_time=$(date +%s)
    
    if [ $current_time -ge $next_report ]; then
        elapsed=$((current_time - start_time))
        remaining=$((end_time - current_time))
        
        # Count requests so far
        total_so_far=0
        errors_so_far=0
        for i in $(seq 1 $CONCURRENT); do
            if [ -f "/tmp/soak-worker-${i}.txt" ]; then
                worker_requests=$(wc -l < "/tmp/soak-worker-${i}.txt")
                worker_errors=$(grep -c "ERROR" "/tmp/soak-worker-${i}.txt" || true)
                total_so_far=$((total_so_far + worker_requests))
                errors_so_far=$((errors_so_far + worker_errors))
            fi
        done
        
        echo "[$(date)] Progress: ${elapsed}s elapsed, ${remaining}s remaining" | tee -a "$LOG_FILE"
        echo "  Requests: $total_so_far, Errors: $errors_so_far" | tee -a "$LOG_FILE"
        
        # Check current pool status
        pool_data=$(curl -s "$HEALTH_ENDPOINT" | jq '.checks[] | select(.name == "database-postgresql")')
        if [ -n "$pool_data" ]; then
            active=$(echo "$pool_data" | jq -r '.data."connectionPool.active" // "0"')
            awaiting=$(echo "$pool_data" | jq -r '.data."connectionPool.awaiting" // "0"')
            echo "  Pool: Active=$active, Awaiting=$awaiting" | tee -a "$LOG_FILE"
        fi
        echo "" | tee -a "$LOG_FILE"
        
        next_report=$((next_report + report_interval))
    fi
    
    sleep 10
done

# Wait for all workers to complete
wait

# Stop monitoring
kill $MONITOR_PID 2>/dev/null || true
wait $MONITOR_PID 2>/dev/null || true

actual_duration=$(($(date +%s) - start_time))

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Soak test completed in ${actual_duration} seconds" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Collect final results
total_requests=0
success_count=0
error_count=0

for i in $(seq 1 $CONCURRENT); do
    if [ -f "/tmp/soak-worker-${i}.txt" ]; then
        worker_requests=$(wc -l < "/tmp/soak-worker-${i}.txt")
        worker_success=$(grep -c "200" "/tmp/soak-worker-${i}.txt" || true)
        worker_errors=$(grep -c "ERROR" "/tmp/soak-worker-${i}.txt" || true)
        total_requests=$((total_requests + worker_requests))
        success_count=$((success_count + worker_success))
        error_count=$((error_count + worker_errors))
    fi
done

echo "Final Results:" | tee -a "$LOG_FILE"
echo "  Total Requests: $total_requests" | tee -a "$LOG_FILE"
echo "  Successful (200): $success_count" | tee -a "$LOG_FILE"
echo "  Errors: $error_count" | tee -a "$LOG_FILE"

if [ "$total_requests" -gt 0 ]; then
    success_rate=$(awk "BEGIN {printf \"%.2f\", ($success_count / $total_requests) * 100}")
    echo "  Success Rate: ${success_rate}%" | tee -a "$LOG_FILE"
    echo "  Requests/Second: $(awk "BEGIN {printf \"%.2f\", $total_requests / $actual_duration}")" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"

# Analyze connection pool metrics over time
echo "Analyzing connection pool metrics over 1 hour..." | tee -a "$LOG_FILE"
if [ -f "$MONITORING_FILE" ]; then
    max_active=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f2 | sort -n | tail -1)
    max_awaiting=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f4 | sort -n | tail -1)
    max_utilization=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f6 | sort -n | tail -1)
    avg_active=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f2 | awk '{sum+=$1; count++} END {if(count>0) printf "%.2f", sum/count; else print "0"}')
    
    echo "  Peak Active Connections: $max_active" | tee -a "$LOG_FILE"
    echo "  Average Active Connections: $avg_active" | tee -a "$LOG_FILE"
    echo "  Peak Awaiting Connections: $max_awaiting" | tee -a "$LOG_FILE"
    echo "  Peak Pool Utilization: ${max_utilization}%" | tee -a "$LOG_FILE"
    
    if (( $(echo "$max_utilization > 80" | bc -l) )); then
        echo "  ⚠️  WARNING: Pool utilization exceeded 80% during test!" | tee -a "$LOG_FILE"
    else
        echo "  ✓ Pool utilization stayed below 80% throughout test" | tee -a "$LOG_FILE"
    fi
    
    if [ "$max_awaiting" != "0" ]; then
        echo "  ⚠️  WARNING: Connections had to wait for pool availability" | tee -a "$LOG_FILE"
    else
        echo "  ✓ No connections had to wait (no pool exhaustion)" | tee -a "$LOG_FILE"
    fi
fi

echo "" | tee -a "$LOG_FILE"

# Check for connection pool errors in application logs
echo "Checking for connection pool errors..." | tee -a "$LOG_FILE"
if [ -f "$ERROR_LOG" ] && [ -s "$ERROR_LOG" ]; then
    error_lines=$(wc -l < "$ERROR_LOG")
    echo "  ⚠️  Found $error_lines errors during test" | tee -a "$LOG_FILE"
    echo "  See $ERROR_LOG for details" | tee -a "$LOG_FILE"
else
    echo "  ✓ No HTTP errors detected during test" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"

# Final health check
echo "Performing final health check..." | tee -a "$LOG_FILE"
final_health=$(curl -s "$HEALTH_ENDPOINT" | jq -r '.status')
echo "  Health Status: $final_health" | tee -a "$LOG_FILE"

pool_data=$(curl -s "$HEALTH_ENDPOINT" | jq '.checks[] | select(.name == "database-postgresql")')
if [ -n "$pool_data" ]; then
    active=$(echo "$pool_data" | jq -r '.data."connectionPool.active" // "0"')
    available=$(echo "$pool_data" | jq -r '.data."connectionPool.available" // "0"')
    awaiting=$(echo "$pool_data" | jq -r '.data."connectionPool.awaiting" // "0"')
    
    echo "  Active Connections: $active" | tee -a "$LOG_FILE"
    echo "  Available Connections: $available" | tee -a "$LOG_FILE"
    echo "  Awaiting Connections: $awaiting" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "End Time: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Determine overall result
if [ "$error_count" -eq 0 ] && [ "$max_awaiting" = "0" ] && [ "$final_health" = "UP" ]; then
    echo "✓ SOAK TEST PASSED" | tee -a "$LOG_FILE"
    echo "  - All requests successful over 1 hour" | tee -a "$LOG_FILE"
    echo "  - No connection pool exhaustion" | tee -a "$LOG_FILE"
    echo "  - Health checks passed consistently" | tee -a "$LOG_FILE"
    exit_code=0
else
    echo "⚠️  SOAK TEST ISSUES DETECTED" | tee -a "$LOG_FILE"
    if [ "$error_count" -gt 0 ]; then
        echo "  - $error_count request errors occurred" | tee -a "$LOG_FILE"
    fi
    if [ "$max_awaiting" != "0" ]; then
        echo "  - Connection pool exhaustion detected" | tee -a "$LOG_FILE"
    fi
    if [ "$final_health" != "UP" ]; then
        echo "  - Health check failed at end of test" | tee -a "$LOG_FILE"
    fi
    exit_code=1
fi

echo "" | tee -a "$LOG_FILE"
echo "Results saved to:" | tee -a "$LOG_FILE"
echo "  - $LOG_FILE (test results)" | tee -a "$LOG_FILE"
echo "  - $MONITORING_FILE (connection pool metrics)" | tee -a "$LOG_FILE"
if [ -f "$ERROR_LOG" ] && [ -s "$ERROR_LOG" ]; then
    echo "  - $ERROR_LOG (error details)" | tee -a "$LOG_FILE"
fi

# Cleanup
rm -f /tmp/soak-worker-*.txt

exit $exit_code
