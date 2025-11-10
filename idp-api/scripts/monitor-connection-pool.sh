#!/bin/bash

# Connection Pool Monitoring Script
# Continuously monitors connection pool metrics from the health endpoint

set -e

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:8082/api/q/health/ready}"
INTERVAL="${INTERVAL:-5}"
DURATION="${DURATION:-0}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local active=$1
    local available=$2
    local awaiting=$3
    local max=$4
    
    # Calculate utilization percentage
    local utilization=$((active * 100 / max))
    
    # Determine color based on status
    local color=$GREEN
    if [ $awaiting -gt 0 ]; then
        color=$RED
    elif [ $utilization -gt 80 ]; then
        color=$YELLOW
    fi
    
    echo -e "${color}Active: $active | Available: $available | Awaiting: $awaiting | Utilization: ${utilization}%${NC}"
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo "Error: jq is not installed. Please install jq to use this script."
        echo "  Ubuntu/Debian: sudo apt-get install jq"
        echo "  macOS: brew install jq"
        echo "  RHEL/CentOS: sudo yum install jq"
        exit 1
    fi
}

# Function to check if the health endpoint is accessible
check_endpoint() {
    if ! curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
        echo "Error: Cannot access health endpoint at $HEALTH_URL"
        echo "Make sure the application is running."
        exit 1
    fi
}

# Function to display metrics
display_metrics() {
    local response=$(curl -s "$HEALTH_URL")
    
    # Extract connection pool metrics
    local data=$(echo "$response" | jq -r '.checks[] | select(.name == "database-postgresql") | .data')
    
    if [ -z "$data" ] || [ "$data" == "null" ]; then
        echo "Error: Could not find database-postgresql health check in response"
        return 1
    fi
    
    local active=$(echo "$data" | jq -r '.["connectionPool.active"]')
    local available=$(echo "$data" | jq -r '.["connectionPool.available"]')
    local awaiting=$(echo "$data" | jq -r '.["connectionPool.awaiting"]')
    local max=$(echo "$data" | jq -r '.["connectionPool.max"]')
    local maxUsed=$(echo "$data" | jq -r '.["connectionPool.maxUsed"]')
    local created=$(echo "$data" | jq -r '.["connectionPool.created"]')
    local destroyed=$(echo "$data" | jq -r '.["connectionPool.destroyed"]')
    
    # Display timestamp
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
    
    # Display metrics with color coding
    print_status "$active" "$available" "$awaiting" "$max"
    
    # Display additional metrics
    echo "Max Used: $maxUsed | Created: $created | Destroyed: $destroyed"
    
    # Display warnings if needed
    local utilization=$((active * 100 / max))
    if [ $awaiting -gt 0 ]; then
        echo -e "${RED}⚠️  WARNING: Threads are waiting for connections!${NC}"
    elif [ $utilization -gt 80 ]; then
        echo -e "${YELLOW}⚠️  WARNING: High connection pool utilization (${utilization}%)${NC}"
    fi
    
    echo ""
}

# Main function
main() {
    echo "Connection Pool Monitor"
    echo "======================="
    echo "Endpoint: $HEALTH_URL"
    echo "Interval: ${INTERVAL}s"
    if [ $DURATION -gt 0 ]; then
        echo "Duration: ${DURATION}s"
    else
        echo "Duration: Continuous (Ctrl+C to stop)"
    fi
    echo ""
    
    # Check prerequisites
    check_jq
    check_endpoint
    
    # Monitor loop
    local elapsed=0
    while true; do
        display_metrics
        
        # Check if we should stop
        if [ $DURATION -gt 0 ] && [ $elapsed -ge $DURATION ]; then
            echo "Monitoring complete."
            break
        fi
        
        # Wait for next iteration
        sleep $INTERVAL
        elapsed=$((elapsed + INTERVAL))
    done
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Monitor connection pool metrics from the health endpoint.

OPTIONS:
    -u URL      Health endpoint URL (default: http://localhost:8082/api/q/health/ready)
    -i SECONDS  Polling interval in seconds (default: 5)
    -d SECONDS  Duration to monitor in seconds (default: 0 = continuous)
    -h          Display this help message

EXAMPLES:
    # Monitor continuously with default settings
    $0

    # Monitor for 60 seconds with 2-second intervals
    $0 -i 2 -d 60

    # Monitor a different endpoint
    $0 -u https://production.example.com/api/q/health/ready

    # Monitor through Traefik
    $0 -u https://localhost:8443/api/q/health/ready

ENVIRONMENT VARIABLES:
    HEALTH_URL  Override default health endpoint URL
    INTERVAL    Override default polling interval
    DURATION    Override default duration

EOF
}

# Parse command line arguments
while getopts "u:i:d:h" opt; do
    case $opt in
        u)
            HEALTH_URL="$OPTARG"
            ;;
        i)
            INTERVAL="$OPTARG"
            ;;
        d)
            DURATION="$OPTARG"
            ;;
        h)
            usage
            exit 0
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            exit 1
            ;;
    esac
done

# Run the monitor
main
