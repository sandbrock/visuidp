#!/usr/bin/env bash
# Start the Quarkus dev server and ensure it listens on port 8082
# This script forces the port via both env and JVM system property so it wins over any overrides.

set -euo pipefail

echo "=== Starting IDP API on port 8082 ==="

# Ensure QUARKUS_HTTP_PORT is set for this process
export QUARKUS_HTTP_PORT=8082

# Remove any conflicting -Dquarkus.http.port from JAVA_TOOL_OPTIONS/MAVEN_OPTS for this run
if [[ "${JAVA_TOOL_OPTIONS:-}" =~ quarkus\.http\.port ]]; then
  echo "Removing quarkus.http.port from JAVA_TOOL_OPTIONS for this run"
  export JAVA_TOOL_OPTIONS="$(echo "$JAVA_TOOL_OPTIONS" | sed -E 's/-Dquarkus\.http\.port=[0-9]+//g')"
fi
if [[ "${MAVEN_OPTS:-}" =~ quarkus\.http\.port ]]; then
  echo "Removing quarkus.http.port from MAVEN_OPTS for this run"
  export MAVEN_OPTS="$(echo "$MAVEN_OPTS" | sed -E 's/-Dquarkus\.http\.port=[0-9]+//g')"
fi

# Avoid confusion with HTTP_PORT (quarkus reads QUARKUS_HTTP_PORT directly)
unset HTTP_PORT || true

# Move to repo root (script lives in scripts/)
cd "$(dirname "$0")/.."

# Force the port via system property as the final authority
./mvnw quarkus:dev -Dquarkus.http.port=8082

