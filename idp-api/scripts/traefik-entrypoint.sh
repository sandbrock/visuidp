#!/bin/sh
# Traefik entrypoint script to substitute environment variables in dynamic configuration

set -e

# Default values
API_HOST=${API_HOST:-172.22.8.222}
UI_HOST=${UI_HOST:-172.22.8.222}
HTTP_PORT=${HTTP_PORT:-8082}
UI_PORT=${UI_PORT:-8083}
CORS_ORIGINS=${CORS_ORIGINS:-"http://localhost:8082,http://localhost:8083,https://localhost:8443,http://localhost:3000"}

echo "Traefik: Substituting environment variables in dynamic configuration..."
echo "API_HOST=${API_HOST}"
echo "UI_HOST=${UI_HOST}" 
echo "HTTP_PORT=${HTTP_PORT}"
echo "UI_PORT=${UI_PORT}"

# Create the dynamic configuration directory if it doesn't exist
mkdir -p /etc/traefik/dynamic

# Process the dynamic.yml template with environment variable substitution
envsubst '${API_HOST} ${UI_HOST} ${HTTP_PORT} ${UI_PORT}' < /etc/traefik/dynamic/dynamic.yml.template > /etc/traefik/dynamic/dynamic.yml

echo "Traefik: Dynamic configuration updated with environment variables"
echo "Starting Traefik..."

# Start Traefik with the original arguments
exec "$@"