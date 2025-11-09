#!/bin/bash

# Get the WSL2 guest IP that Docker containers can reach
WSL_IP=$(ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d'/' -f1)

if [ -z "$WSL_IP" ]; then
    echo "Error: Could not determine WSL2 IP address"
    exit 1
fi

echo "Updating Traefik configuration with WSL2 IP: $WSL_IP"

# Update the Traefik dynamic configuration
sed -i "s|http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:8082|http://$WSL_IP:8082|g" traefik/dynamic.yml
sed -i "s|http://[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:8083|http://$WSL_IP:8083|g" traefik/dynamic.yml

echo "Updated traefik/dynamic.yml with WSL2 IP: $WSL_IP"
echo "Current idp-api service configuration:"
grep -A 5 "idp-api-service:" traefik/dynamic.yml