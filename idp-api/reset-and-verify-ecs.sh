#!/usr/bin/env bash
set -euo pipefail

# Reset database and verify ECS migration
echo "=========================================="
echo "Reset Database and Verify ECS Migration"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME="${DB_NAME:-idp}"
DB_USER="${DB_USER:-idp_user}"

echo "Step 1: Drop and recreate database"
echo "-----------------------------------"
docker compose exec -T postgres psql -U postgres -d postgres <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo "✓ Database dropped and recreated successfully"
else
    echo "✗ Failed to drop and recreate database"
    exit 1
fi
echo ""

echo "Step 2: Run migrations using Quarkus"
echo "-------------------------------------"
echo "Starting Quarkus to apply migrations..."

# Start Quarkus in background and capture output
./mvnw quarkus:dev -DskipTests > /tmp/quarkus-startup.log 2>&1 &
QUARKUS_PID=$!

# Wait for Quarkus to start (look for "Listening on" or migration messages)
echo "Waiting for Quarkus to start and apply migrations..."
for i in {1..60}; do
    if grep -q "Listening on" /tmp/quarkus-startup.log 2>/dev/null; then
        echo "✓ Quarkus started successfully"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "✗ Quarkus failed to start within 60 seconds"
        kill $QUARKUS_PID 2>/dev/null || true
        tail -50 /tmp/quarkus-startup.log
        exit 1
    fi
    sleep 1
done

# Give migrations a moment to complete
sleep 2

# Stop Quarkus
echo "Stopping Quarkus..."
kill $QUARKUS_PID 2>/dev/null || true
wait $QUARKUS_PID 2>/dev/null || true

echo "✓ Migrations applied"
echo ""

# Now run verification
echo "Step 3: Running verification checks"
echo "------------------------------------"
./verify-ecs-properties.sh
