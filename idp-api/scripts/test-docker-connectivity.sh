#!/bin/bash

# Get the WSL2 guest IP that Docker containers can reach
WSL_IP=$(ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d'/' -f1)

if [ -z "$WSL_IP" ]; then
    echo "❌ Error: Could not determine WSL2 IP address"
    exit 1
fi

echo "🔍 Testing Docker container connectivity to WSL2 IP: $WSL_IP"
echo "📍 Target: http://$WSL_IP:8082/api/q/health"
echo ""

# Run curl from inside a Docker container to test connectivity
docker run --rm curlimages/curl:latest curl -v --connect-timeout 5 --max-time 10 http://$WSL_IP:8082/api/q/health

CURL_EXIT_CODE=$?

echo ""
if [ $CURL_EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS: Docker containers can reach idp-api at $WSL_IP:8082"
else
    echo "❌ FAILED: Docker containers cannot reach idp-api at $WSL_IP:8082"
    echo "   Exit code: $CURL_EXIT_CODE"
fi

exit $CURL_EXIT_CODE