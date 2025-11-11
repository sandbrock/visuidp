#!/bin/bash

# Script to fix numeric default values in the database
# This updates NUMBER property default values from JSON strings to JSON numbers

set -e

echo "Fixing numeric default values in property_schemas table..."

# Check if we're in the idp-api directory
if [ ! -f "pom.xml" ]; then
    echo "Error: This script must be run from the idp-api directory"
    exit 1
fi

# Load database connection details from .env file if it exists
if [ -f ".env" ]; then
    source .env
fi

# Set default values if not provided
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-idp}"
DB_USER="${DB_USER:-idp_user}"

# Prompt for password if not set
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter database password: " DB_PASSWORD
    echo
fi

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

# Run the SQL script
echo "Applying fixes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/fix-numeric-default-values.sql

# Unset password
unset PGPASSWORD

echo "Done! Numeric default values have been fixed."
echo "The following properties were updated:"
echo "  - minClusterSize: default_value changed from '\"1\"' to '1'"
echo "  - maxClusterSize: default_value changed from '\"10\"' to '10'"
