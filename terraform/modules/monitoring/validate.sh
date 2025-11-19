#!/bin/bash
# Validation script for monitoring module

set -e

echo "Validating monitoring module..."

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "Error: terraform is not installed"
    exit 1
fi

# Format check
echo "Running terraform fmt..."
terraform fmt -check=true -recursive .

echo "Validation complete!"
