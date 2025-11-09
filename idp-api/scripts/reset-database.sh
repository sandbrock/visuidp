#!/usr/bin/env bash
set -euo pipefail

# Determine repository root (prefers git, falls back to script parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if git -C "$SCRIPT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
  REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

cd "$REPO_ROOT"
echo "Running Flyway clean at start via Quarkus dev in: $REPO_ROOT"
exec ./mvnw quarkus:dev -Dquarkus.flyway.clean-at-start=true -DskipTests

