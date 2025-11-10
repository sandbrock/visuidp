#!/bin/bash

# Quick script to check soak test progress

LOG_FILE="soak-test-results.log"
MONITORING_FILE="soak-test-monitoring.csv"

echo "========================================"
echo "Soak Test Progress Check"
echo "========================================"
echo "Current Time: $(date)"
echo ""

if [ -f "$LOG_FILE" ]; then
    echo "Latest log entries:"
    tail -20 "$LOG_FILE"
    echo ""
else
    echo "Log file not found. Test may not have started yet."
    echo ""
fi

if [ -f "$MONITORING_FILE" ]; then
    echo "Latest connection pool metrics:"
    tail -5 "$MONITORING_FILE" | column -t -s','
    echo ""
    
    # Calculate current stats
    max_active=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f2 | sort -n | tail -1)
    max_awaiting=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f4 | sort -n | tail -1)
    max_utilization=$(tail -n +2 "$MONITORING_FILE" | cut -d',' -f6 | sort -n | tail -1)
    
    echo "Current Statistics:"
    echo "  Peak Active: $max_active"
    echo "  Peak Awaiting: $max_awaiting"
    echo "  Peak Utilization: ${max_utilization}%"
    echo ""
else
    echo "Monitoring file not found. Test may not have started yet."
    echo ""
fi

# Check if test is still running
if pgrep -f "soak-test.sh" > /dev/null; then
    echo "Status: ✓ Test is still running"
else
    echo "Status: Test has completed or not started"
fi

echo "========================================"
