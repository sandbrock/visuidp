#!/bin/bash

# Generate OAuth2 Proxy cookie secret
# This secret must be exactly 32 bytes when base64-decoded

echo "Generating OAuth2 Proxy cookie secret..."
SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo ""
echo "Add this to your .env file:"
echo "OAUTH2_PROXY_COOKIE_SECRET=$SECRET"
echo ""
echo "This secret is used to encrypt OAuth2-Proxy session cookies."