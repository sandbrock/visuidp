#!/usr/bin/env bash
set -euo pipefail

# Determine idp-api directory (script is in idp-api/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDP_API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$IDP_API_ROOT"
echo "Running Flyway clean at start via Quarkus dev in: $IDP_API_ROOT"
exec ./mvnw quarkus:dev -Dquarkus.flyway.clean-at-start=true -DskipTests

