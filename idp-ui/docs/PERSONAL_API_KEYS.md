# Personal API Keys Guide

This guide explains how to manage your personal API keys in the Internal Developer Platform UI.

## Overview

Personal API keys allow you to authenticate programmatically with the IDP API without using browser-based OAuth2 authentication. This is essential for:

- **CLI tools and scripts** - Automate infrastructure provisioning
- **CI/CD pipelines** - Deploy stacks from your build system
- **Development tools** - Integrate IDP with your local development environment
- **Automation** - Build custom workflows and integrations

## Accessing Personal API Keys

### From the Navigation Menu

1. Log in to the IDP UI at `https://localhost:8443/ui/`
2. Look for the **API Keys** link in the main navigation menu
3. Click **API Keys** to access your personal API keys page

The API Keys link is located between **Infrastructure** and **Admin** in the navigation bar:

```
Development | Infrastructure | API Keys | Admin
```

### Direct URL

You can also access your personal API keys directly at:
```
https://localhost:8443/ui/api-keys
```

**Note**: You must be logged in to access this page.

## Personal vs Admin API Keys Pages

The IDP provides two different API keys pages depending on your needs:

### Personal API Keys Page (`/api-keys`)

**Who can access**: All authenticated users

**What you see**:
- Only your own personal API keys
- Page title: "My API Keys"
- Simple breadcrumb: "My API Keys"
- Create button for user-type keys only

**Use this page when**:
- You want to manage your own API keys
- You need keys for personal development or automation
- You're working on your own projects

### Admin API Keys Page (`/admin/api-keys`)

**Who can access**: Administrators only

**What you see**:
- All API keys in the system (all users + system keys)
- Page title: "API Keys Management"
- Admin breadcrumb: "Admin Dashboard > API Keys Management"
- Create button with option for system-type keys

**Use this page when**:
- You need to view all API keys across the organization
- You need to create system-level API keys
- You're performing administrative tasks

## Creating Your First API Key

### Step 1: Navigate to Personal API Keys

Click **API Keys** in the main navigation menu.

### Step 2: Click Create New API Key

Click the **Create New API Key** button in the top right corner.

### Step 3: Fill in Key Details

A modal will appear with the following fields:

- **Key Name** (required): A descriptive name for your key
  - Examples: "CI/CD Pipeline", "Local Development", "Testing Scripts"
  - Must be 1-100 characters
  - Should be unique among your keys

- **Expiration Days** (optional): Number of days until the key expires
  - Default: 90 days
  - Range: 1-365 days
  - Recommendation: Use shorter periods (30-90 days) for better security

### Step 4: Save and Copy Your Key

1. Click **Create** to generate your API key
2. **IMPORTANT**: Copy the full API key immediately - it will only be shown once!
3. Store the key securely (see [Security Best Practices](#security-best-practices))

Your API key will look like this:
```
idp_user_abc123def456ghi789jkl012mno345pqr678
```

### Step 5: Verify Your Key

Test your new API key by making a simple API call:

```bash
curl -X GET https://localhost:8443/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

## Managing Your API Keys

### Viewing Your Keys

The personal API keys page displays all your active keys in a table with the following information:

- **Name**: The descriptive name you gave the key
- **Prefix**: The first few characters of the key (e.g., `idp_user_abc`)
- **Type**: Always "USER" for personal keys
- **Created**: When the key was created
- **Expires**: When the key will expire
- **Last Used**: When the key was last used for authentication
- **Status**: Current status (Active, Expiring Soon, Expired)

### Editing a Key Name

1. Find the key you want to rename in the table
2. Click the **Edit** (pencil) icon
3. Enter the new name
4. Click **Save**

**Note**: You can only change the name - you cannot change the key value itself.

### Rotating a Key

Key rotation generates a new key while keeping the old key active for 24 hours, allowing you to update your systems without downtime.

1. Find the key you want to rotate in the table
2. Click the **Rotate** (refresh) icon
3. Confirm the rotation in the modal
4. **Copy the new key immediately** - it will only be shown once!
5. Update your systems with the new key within 24 hours
6. The old key will automatically be revoked after the grace period

**Best Practice**: Rotate keys regularly (every 90 days) for security.

### Revoking a Key

Revocation immediately invalidates a key. This cannot be undone.

1. Find the key you want to revoke in the table
2. Click the **Revoke** (trash) icon
3. Confirm the revocation in the modal
4. The key is immediately invalidated

**When to revoke**:
- You no longer need the key
- The key may have been compromised
- You're replacing it with a new key
- You're leaving a project

## Using Your API Keys

### Basic Authentication

Include your API key in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer <your_api_key>
```

### Example: List Stacks

```bash
curl -X GET https://localhost:8443/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678"
```

### Example: Create a Stack

```bash
curl -X POST https://localhost:8443/api/v1/stacks \
  -H "Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-api-service",
    "stackType": "RESTFUL_API",
    "environment": "DEV",
    "cloudProvider": "AWS",
    "region": "us-east-1"
  }'
```

### Example: Python Script

```python
import requests
import os

# Load API key from environment variable
API_KEY = os.environ.get('IDP_API_KEY')
BASE_URL = 'https://localhost:8443/api/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# List all your stacks
response = requests.get(f'{BASE_URL}/stacks', headers=headers)
stacks = response.json()
print(f'Found {len(stacks)} stacks')

# Create a new stack
new_stack = {
    'name': 'my-python-api',
    'stackType': 'RESTFUL_API',
    'environment': 'DEV',
    'cloudProvider': 'AWS',
    'region': 'us-east-1'
}
response = requests.post(f'{BASE_URL}/stacks', json=new_stack, headers=headers)
if response.status_code == 201:
    print('Stack created successfully!')
    print(response.json())
```

### Example: Node.js Script

```javascript
const axios = require('axios');

// Load API key from environment variable
const API_KEY = process.env.IDP_API_KEY;
const BASE_URL = 'https://localhost:8443/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function main() {
  // List all your stacks
  const stacks = await client.get('/stacks');
  console.log(`Found ${stacks.data.length} stacks`);

  // Create a new stack
  const newStack = {
    name: 'my-node-api',
    stackType: 'RESTFUL_API',
    environment: 'DEV',
    cloudProvider: 'AWS',
    region: 'us-east-1'
  };
  
  const created = await client.post('/stacks', newStack);
  console.log('Stack created successfully!');
  console.log(created.data);
}

main().catch(console.error);
```

### Example: GitHub Actions CI/CD

```yaml
name: Deploy to IDP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Stack
        env:
          IDP_API_KEY: ${{ secrets.IDP_API_KEY }}
        run: |
          curl -X POST https://localhost:8443/api/v1/stacks \
            -H "Authorization: Bearer $IDP_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
              "name": "my-service",
              "stackType": "RESTFUL_API",
              "environment": "PRODUCTION",
              "cloudProvider": "AWS",
              "region": "us-east-1"
            }'
```

**Setup**: Add your API key as a secret in GitHub:
1. Go to your repository settings
2. Navigate to Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `IDP_API_KEY`
5. Value: Your API key
6. Click "Add secret"

### Example: GitLab CI/CD

```yaml
deploy:
  stage: deploy
  script:
    - |
      curl -X POST https://localhost:8443/api/v1/stacks \
        -H "Authorization: Bearer $IDP_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "my-service",
          "stackType": "RESTFUL_API",
          "environment": "PRODUCTION",
          "cloudProvider": "AWS",
          "region": "us-east-1"
        }'
  only:
    - main
```

**Setup**: Add your API key as a CI/CD variable in GitLab:
1. Go to Settings > CI/CD
2. Expand "Variables"
3. Click "Add variable"
4. Key: `IDP_API_KEY`
5. Value: Your API key
6. Check "Mask variable"
7. Click "Add variable"

## Security Best Practices

### Never Commit API Keys to Version Control

❌ **DON'T DO THIS**:
```python
# bad_example.py
API_KEY = "idp_user_abc123def456ghi789jkl012mno345pqr678"  # NEVER!
```

✅ **DO THIS INSTEAD**:
```python
# good_example.py
import os
API_KEY = os.environ.get('IDP_API_KEY')
```

### Use Environment Variables

Store your API key in environment variables:

**Linux/macOS**:
```bash
# Add to ~/.bashrc or ~/.zshrc
export IDP_API_KEY="idp_user_abc123def456ghi789jkl012mno345pqr678"

# Or use a .env file (never commit this!)
echo 'IDP_API_KEY=idp_user_abc123def456ghi789jkl012mno345pqr678' > .env
```

**Windows**:
```powershell
# PowerShell
$env:IDP_API_KEY = "idp_user_abc123def456ghi789jkl012mno345pqr678"

# Or set permanently
[System.Environment]::SetEnvironmentVariable('IDP_API_KEY', 'idp_user_abc123...', 'User')
```

### Use Secret Management Systems

For production environments, use dedicated secret management:

**AWS Secrets Manager**:
```bash
# Store the key
aws secretsmanager create-secret \
  --name idp-api-key \
  --secret-string "idp_user_abc123def456ghi789jkl012mno345pqr678"

# Retrieve in your application
aws secretsmanager get-secret-value \
  --secret-id idp-api-key \
  --query SecretString \
  --output text
```

**HashiCorp Vault**:
```bash
# Store the key
vault kv put secret/idp api_key="idp_user_abc123def456ghi789jkl012mno345pqr678"

# Retrieve in your application
vault kv get -field=api_key secret/idp
```

### Use Different Keys for Different Environments

Create separate API keys for each environment:

- **Development**: `"Local Development Key"` - Short expiration (30 days)
- **Staging**: `"Staging CI/CD Key"` - Medium expiration (60 days)
- **Production**: `"Production CI/CD Key"` - Regular rotation (90 days)

This limits the impact if a key is compromised.

### Rotate Keys Regularly

Set a reminder to rotate your keys every 90 days:

1. Create a new key with the same name + " (New)"
2. Update all systems to use the new key
3. Verify the new key works
4. Revoke the old key

### Monitor Key Usage

Regularly check the "Last Used" timestamp on your keys:

- If a key hasn't been used in 30+ days, consider revoking it
- If a key shows unexpected usage, investigate immediately
- Review your keys monthly

### Limit Key Scope

Create specific keys for specific purposes:

✅ **Good**:
- "GitHub Actions Production Deploy"
- "Local Development Testing"
- "Staging Automation Scripts"

❌ **Bad**:
- "My Key"
- "Test"
- "Key 1"

Descriptive names help you identify which key to revoke if there's a security issue.

## API Key Lifecycle

### Status Indicators

Your API keys can have the following statuses:

- **Active** (Green): Key is valid and can be used
- **Expiring Soon** (Yellow): Key expires within 7 days - rotate soon!
- **Expired** (Red): Key has passed expiration date - cannot be used
- **Revoked** (Gray): Key has been manually revoked - cannot be used

### Expiration

- Keys expire after the configured period (default: 90 days)
- You'll see a warning when a key expires within 7 days
- Expired keys are automatically invalidated
- You cannot extend expiration - you must rotate or create a new key

### Grace Period During Rotation

When you rotate a key:

1. A new key is generated immediately
2. Both the old and new keys work for 24 hours
3. After 24 hours, the old key is automatically revoked
4. This gives you time to update all systems without downtime

**Timeline**:
```
Hour 0:  Rotate key → New key generated
Hour 0-24: Both old and new keys work
Hour 24: Old key automatically revoked
```

## Troubleshooting

### "Invalid API key" Error

**Possible causes**:
- You copied the key incorrectly (missing characters)
- The key has expired
- The key has been revoked
- You're using the wrong key format

**Solutions**:
1. Verify you copied the entire key including the prefix
2. Check the key status in the UI
3. Ensure you're using `Authorization: Bearer <key>` (note the space)
4. Try creating a new key

### "Unauthorized" Error

**Possible causes**:
- Missing Authorization header
- Incorrect header format
- Key doesn't have permission for the operation

**Solutions**:
1. Verify header format: `Authorization: Bearer <key>`
2. Check that you're using a USER key (not SYSTEM)
3. Ensure you're authenticated as the correct user

### Key Not Showing in List

**Possible causes**:
- You're on the wrong page (admin vs personal)
- The key was created by a different user
- The key has been revoked

**Solutions**:
1. Verify you're on `/api-keys` (not `/admin/api-keys`)
2. Refresh the page
3. Check if the key was revoked

### Cannot Create API Key

**Possible causes**:
- Duplicate key name
- Invalid expiration days
- Maximum keys limit reached

**Solutions**:
1. Use a unique key name
2. Set expiration between 1-365 days
3. Revoke unused keys if you've hit the limit (default: 10 keys per user)

### Key Works in Browser but Not in Script

**Possible causes**:
- Environment variable not set correctly
- Extra whitespace in the key
- Wrong API endpoint URL

**Solutions**:
1. Print the environment variable to verify it's set: `echo $IDP_API_KEY`
2. Trim whitespace from the key
3. Verify the API URL is correct (include `/api/v1` prefix)

## Common Use Cases

### Use Case 1: Local Development

**Scenario**: You're developing a CLI tool that interacts with the IDP API.

**Setup**:
1. Create a key named "Local Development"
2. Set expiration to 30 days (short for security)
3. Store in environment variable
4. Use in your development scripts

```bash
# Create and export the key
export IDP_API_KEY="idp_user_abc123..."

# Test your CLI tool
./my-cli-tool list-stacks
```

### Use Case 2: CI/CD Pipeline

**Scenario**: Your GitHub Actions workflow needs to deploy stacks automatically.

**Setup**:
1. Create a key named "GitHub Actions Production"
2. Set expiration to 90 days
3. Add as GitHub secret
4. Use in workflow

```yaml
- name: Deploy
  env:
    IDP_API_KEY: ${{ secrets.IDP_API_KEY }}
  run: ./deploy.sh
```

### Use Case 3: Automated Testing

**Scenario**: Your test suite needs to create and destroy test stacks.

**Setup**:
1. Create a key named "Automated Testing"
2. Set expiration to 60 days
3. Store in test environment
4. Use in test scripts

```python
import pytest
import os

@pytest.fixture
def idp_client():
    api_key = os.environ.get('IDP_API_KEY')
    return IDPClient(api_key=api_key)

def test_create_stack(idp_client):
    stack = idp_client.create_stack(
        name='test-stack',
        stack_type='RESTFUL_API',
        environment='DEV'
    )
    assert stack.name == 'test-stack'
```

### Use Case 4: Infrastructure as Code

**Scenario**: You're using Terraform or similar tools to manage IDP resources.

**Setup**:
1. Create a key named "Terraform Infrastructure"
2. Set expiration to 90 days
3. Store in Terraform variables
4. Use in provider configuration

```hcl
# variables.tf
variable "idp_api_key" {
  type      = string
  sensitive = true
}

# provider.tf
provider "idp" {
  api_key = var.idp_api_key
  base_url = "https://localhost:8443/api/v1"
}

# main.tf
resource "idp_stack" "my_api" {
  name         = "my-api-service"
  stack_type   = "RESTFUL_API"
  environment  = "PRODUCTION"
}
```

## Additional Resources

### Documentation

- **API Authentication Guide**: `idp-api/docs/API_KEY_AUTHENTICATION.md`
  - Complete API reference for all endpoints
  - Detailed examples in multiple languages
  - Advanced security configurations

- **API Documentation**: `idp-api/docs/API_DOCUMENTATION.md`
  - Overview of all IDP API endpoints
  - Request/response formats
  - Error handling

- **OpenAPI/Swagger UI**: `https://localhost:8443/api/q/swagger-ui`
  - Interactive API documentation
  - Try endpoints directly in your browser
  - View request/response schemas

### Support

For questions or issues:
- **Documentation**: Check the docs directory for detailed guides
- **Swagger UI**: Use the interactive API documentation
- **Admin**: Contact your IDP administrator for help

## FAQ

**Q: Can I use the same API key on multiple machines?**
A: Yes, but it's better to create separate keys for different purposes. This makes it easier to revoke access if one machine is compromised.

**Q: What happens if my API key expires while my script is running?**
A: The script will start receiving 401 Unauthorized errors. Rotate your keys before they expire to avoid this.

**Q: Can I see the full API key after creation?**
A: No, the full key is only shown once when created. If you lose it, you must create a new key.

**Q: How many API keys can I have?**
A: The default limit is 10 keys per user. Revoke unused keys if you need to create more.

**Q: Can I share my API key with teammates?**
A: No, each user should create their own API keys. Sharing keys makes it impossible to track who did what and creates security risks.

**Q: What's the difference between USER and SYSTEM keys?**
A: USER keys are tied to your account and inherit your permissions. SYSTEM keys are not tied to any user and are only available to administrators. You can only create USER keys from the personal API keys page.

**Q: Can I change the expiration date of an existing key?**
A: No, expiration is set when the key is created and cannot be changed. You can rotate the key to create a new one with a different expiration.

**Q: Will rotating a key affect my running applications?**
A: Not immediately. Both the old and new keys work for 24 hours, giving you time to update your applications without downtime.

