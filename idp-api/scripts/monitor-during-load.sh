#!/bin/bash

# Monitor connection pool metrics during load test

HEALTH_ENDPOINT="http://localhost:8082/api/q/health/ready"
DURATION=10
INTERVAL=0.5

echo "Monitoring connection pool for ${DURATION} seconds..."
echo "Timestamp,Active,Available,Max,Awaiting,Created,Destroyed"

end_time=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $end_time ]; do
    timestamp=$(date +%H:%M:%S)
    metrics=$(curl -s "$HEALTH_ENDPOINT" | jq '.checks[] | select(.name == "database-postgresql") | .data')
    
    active=$(echo "$metrics" | jq -r '."connectionPool.active"')
    available=$(echo "$metrics" | jq -r '."connectionPool.available"')
    max=$(echo "$metrics" | jq -r '."connectionPool.max"')
    awaiting=$(echo "$metrics" | jq -r '."connectionPool.awaiting"')
    created=$(echo "$metrics" | jq -r '."connectionPool.created"')
    destroyed=$(echo "$metrics" | jq -r '."connectionPool.destroyed"')
    
    echo "$timestamp,$active,$available,$max,$awaiting,$created,$destroyed"
    
    sleep $INTERVAL
done
