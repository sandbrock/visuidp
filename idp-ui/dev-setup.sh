#!/bin/bash

# Development setup script for IDP UI
echo "🚀 Setting up IDP UI development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the idp-ui directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start supporting services from idp-api directory
echo "🐳 Starting OAuth2 Proxy and database services..."
if [ -d "../idp-api" ]; then
    cd ../idp-api
    docker-compose up -d
    cd ../idp-ui
    echo "✅ Services started successfully"
else
    echo "⚠️  Warning: ../idp-api directory not found. Please ensure the idp-api project is in the parent directory."
    echo "   You'll need to start OAuth2 Proxy and database services manually."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the React development server:"
echo "  npm run dev"
echo ""
echo "Important: Access the application through OAuth2 Proxy at:"
echo "  http://localhost:8080"
echo ""
echo "Direct access to React (http://localhost:8083) will not have authentication!"
