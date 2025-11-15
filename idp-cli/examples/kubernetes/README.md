# Kubernetes Template Examples

This directory contains example Kubernetes manifest templates that demonstrate how to use the IDP CLI with stack data to generate deployment configurations.

## Overview

These templates show common patterns for generating Kubernetes manifests from IDP stacks:

- Variable substitution for container images, ports, and configurations
- Conditional resource creation based on stack properties
- Loops for creating multiple resources
- Default values for optional configurations
- ConfigMaps and Secrets management
- Service and Ingress configurations

## Usage

### Generate from Stack

```bash
idp-cli generate \
  --data-source stack \
  --identifier my-stack \
  --template-dir ./examples/kubernetes \
  --output-dir ./output/k8s \
  --api-key $IDP_API_KEY
```

### With Custom Variables

```bash
idp-cli generate \
  --data-source stack \
  --identifier my-stack \
  --template-dir ./examples/kubernetes \
  --output-dir ./output/k8s \
  --variables-file ./k8s-vars.yaml \
  --api-key $IDP_API_KEY
```

### List Available Variables

```bash
idp-cli list-variables \
  --data-source stack \
  --identifier my-stack \
  --api-key $IDP_API_KEY
```

## Template Files

### namespace.yaml
Namespace definition for isolating resources

### deployment.yaml
Deployment configuration demonstrating:
- Container specifications
- Resource limits and requests
- Environment variables
- Health checks (liveness/readiness probes)
- Replica configuration

### service.yaml
Service definition showing:
- Service types (ClusterIP, LoadBalancer, NodePort)
- Port mappings
- Selector configuration

### configmap.yaml
ConfigMap for application configuration:
- Environment-specific settings
- Application properties
- Feature flags

### ingress.yaml
Ingress configuration for external access:
- Host-based routing
- Path-based routing
- TLS configuration

### hpa.yaml
Horizontal Pod Autoscaler for automatic scaling:
- CPU-based scaling
- Memory-based scaling
- Custom metrics

## Common Patterns

### Accessing Stack Data

```yaml
# Stack metadata
name: {{stack.name}}
namespace: {{stack.name}}-{{environment|default:"dev"}}

# Stack resources
image: {{stack_resources[0].configuration.image}}
port: {{stack_resources[0].configuration.port}}

# Cloud provider info
cloud: {{stack.cloud_name}}
```

### Loops

```yaml
# Create multiple containers
containers:
{{#each stack_resources}}
- name: {{this.name}}
  image: {{this.configuration.image}}
  ports:
  - containerPort: {{this.configuration.port}}
{{/each}}
```

### Conditionals

```yaml
{{#if (eq stack.stack_type "RestfulApi")}}
# API-specific configuration
livenessProbe:
  httpGet:
    path: /health
    port: {{stack_resources[0].configuration.port}}
{{/if}}

{{#if enable_monitoring}}
# Monitoring annotations
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "{{metrics_port|default:"9090"}}"
{{/if}}
```

### Default Values

```yaml
# Use defaults for optional values
replicas: {{replicas|default:"3"}}
image: {{stack_resources[0].configuration.image|default:"nginx:latest"}}
port: {{stack_resources[0].configuration.port|default:"80"}}
```

### Resource Limits

```yaml
resources:
  requests:
    memory: "{{memory_request|default:"128Mi"}}"
    cpu: "{{cpu_request|default:"100m"}}"
  limits:
    memory: "{{memory_limit|default:"256Mi"}}"
    cpu: "{{cpu_limit|default:"200m"}}"
```

## Custom Variables

Provide additional configuration via YAML file:

**k8s-vars.yaml:**
```yaml
environment: production
namespace: my-app-prod
replicas: 5
enable_monitoring: true
enable_autoscaling: true

resources:
  requests:
    memory: 256Mi
    cpu: 200m
  limits:
    memory: 512Mi
    cpu: 500m

ingress:
  enabled: true
  host: api.example.com
  tls_enabled: true
  tls_secret: api-tls-cert

database:
  host: postgres.example.com
  port: 5432
  name: myapp_db
```

**Usage in templates:**
```yaml
metadata:
  namespace: {{namespace}}
spec:
  replicas: {{replicas}}
  
{{#if ingress.enabled}}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{stack.name}}-ingress
spec:
  rules:
  - host: {{ingress.host}}
{{/if}}
```

## Multi-Document YAML

Kubernetes manifests often use multi-document YAML (separated by `---`). The CLI preserves this format:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{stack.name}}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{stack.name}}
  namespace: {{stack.name}}
---
apiVersion: v1
kind: Service
metadata:
  name: {{stack.name}}
  namespace: {{stack.name}}
```

## Next Steps

After generating Kubernetes manifests:

1. Review the generated files in your output directory
2. Validate the manifests: `kubectl apply --dry-run=client -f output/`
3. Apply to cluster: `kubectl apply -f output/`
4. Verify deployment: `kubectl get all -n <namespace>`
5. Check logs: `kubectl logs -n <namespace> deployment/<name>`

## Tips

- Always validate manifests before applying to production
- Use namespaces to isolate environments
- Set appropriate resource limits to prevent resource exhaustion
- Use ConfigMaps and Secrets for configuration management
- Enable monitoring and logging for observability
- Test autoscaling behavior under load
- Use version control for generated manifests
- Consider using Kustomize or Helm for advanced scenarios
