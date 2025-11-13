# Stack Cloud-Agnostic Design

## Overview

As of migration V4, stacks in VisuIDP are fully cloud-agnostic. This document explains the architectural decision to remove cloud provider, domain, and category associations from the Stack entity.

## Architectural Principle

**Core Principle**: Stacks represent logical service definitions that are independent of cloud providers. Cloud provider selection happens at the environment level, not at the stack level.

This design enables:
- **True Portability**: The same stack definition can be deployed to multiple cloud providers
- **Multi-Cloud Strategies**: Deploy dev to AWS, staging to Azure, production to GCP
- **Hybrid Deployments**: Mix on-premises and cloud deployments for the same stack
- **Simplified Stack Model**: Reduced complexity by removing unnecessary organizational fields

## What Changed

### Removed Fields

The following fields were removed from the Stack entity in migration V4:

1. **cloud_provider_id**: Direct association with a cloud provider
2. **domain_id**: Organizational grouping (removed as unnecessary overhead)
3. **category_id**: Classification field (removed as unnecessary overhead)

### Database Changes

```sql
-- Foreign key constraints removed
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_cloud_provider;
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_domain;
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_category;

-- Indexes removed
DROP INDEX IF EXISTS idx_stacks_cloud_provider;
DROP INDEX IF EXISTS idx_stacks_domain_id;
DROP INDEX IF EXISTS idx_stacks_category_id;

-- Columns removed
ALTER TABLE stacks DROP COLUMN IF EXISTS cloud_provider_id;
ALTER TABLE stacks DROP COLUMN IF EXISTS domain_id;
ALTER TABLE stacks DROP COLUMN IF EXISTS category_id;
```

### Code Changes

**Entity Layer**:
- Removed `cloudProvider`, `domain`, and `category` fields from Stack entity
- Removed validation methods: `validateCloudProvider()`
- Removed finder methods: `findByCloudProviderId()`, `findByDomainId()`, `findByCategoryId()`

**DTO Layer**:
- Removed `domainId` and `categoryId` from StackCreateDto
- Removed `domainId` and `categoryId` from StackResponseDto

**Service Layer**:
- Removed domain/category lookup logic from StackService
- Removed cloud provider validation logic

**Frontend**:
- Removed cloud provider, domain, and category selection fields from StackForm
- Removed cloud provider, domain, and category columns from StackList
- Removed cloud provider, domain, and category display from StackDetails

## How Cloud Provider Selection Works Now

### Environment-Level Association

Cloud providers are now associated at the **environment level**, not the stack level:

```
Stack (cloud-agnostic)
  └─> Environment (dev, staging, prod)
        └─> Cloud Provider (AWS, Azure, GCP, on-premises)
```

### Deployment Flow

1. **Stack Creation**: Developer creates a stack without specifying a cloud provider
2. **Environment Selection**: When provisioning, developer selects target environment
3. **Cloud Provider Resolution**: System determines cloud provider from environment configuration
4. **Resource Provisioning**: Resources are created on the environment's cloud provider

### Example Scenario

```
Stack: "user-api-service"
  ├─> dev environment → AWS (us-east-1)
  ├─> staging environment → Azure (eastus)
  └─> production environment → GCP (us-central1)
```

The same stack definition is deployed to three different cloud providers through three different environments.

## Benefits

### 1. True Cloud Agnosticism

Stacks are no longer tied to a specific cloud provider, enabling genuine multi-cloud strategies.

### 2. Simplified Stack Model

Removing domain and category fields reduces complexity without losing functionality:
- Domains provided no clear organizational value
- Categories added classification overhead without clear benefits
- Simpler model is easier to understand and maintain

### 3. Flexible Deployment Strategies

Organizations can:
- Test on one cloud provider, deploy to another
- Gradually migrate between cloud providers
- Maintain hybrid cloud/on-premises deployments
- Use different cloud providers for different environments

### 4. Reduced Coupling

Stack definitions are decoupled from infrastructure decisions, allowing infrastructure changes without modifying stack definitions.

## Migration Impact

### Backward Compatibility

**Breaking Changes**:
- API endpoints no longer accept `cloudProviderId`, `domainId`, or `categoryId` in stack requests
- API responses no longer include these fields
- Existing data associations are lost (acceptable as they provided no value)

**Non-Breaking**:
- If clients send removed fields, they are silently ignored (no error)
- All other stack functionality remains unchanged
- Existing stacks continue to work normally

### Data Loss

The migration permanently removes:
- Stack-to-cloud-provider associations
- Stack-to-domain associations
- Stack-to-category associations

This data loss is acceptable because:
- Cloud provider is now determined by environment
- Domain and category provided no functional value
- No business logic depended on these associations

## Other Entities

### Entities That Keep Cloud Provider Associations

The following entities **maintain** cloud provider relationships as they are legitimate use cases:

1. **Environment**: Associates environments with cloud providers (core to new design)
2. **StackResource**: May have cloud provider for resource-specific configuration
3. **BlueprintResource**: May have cloud provider for blueprint patterns
4. **Blueprint**: Maintains blueprint_cloud_providers junction table for multi-cloud blueprints
5. **CloudProvider**: Unchanged and fully functional

### Why These Keep Cloud Providers

- **Environment**: Determines where resources are provisioned (essential)
- **Resources**: May need cloud-specific configuration or metadata
- **Blueprints**: Can define patterns for multiple cloud providers

## API Contract Changes

### Before (Deprecated)

```json
POST /v1/stacks
{
  "name": "my-service",
  "stackType": "RESTFUL_API",
  "cloudProviderId": "uuid-here",
  "domainId": "uuid-here",
  "categoryId": "uuid-here"
}
```

### After (Current)

```json
POST /v1/stacks
{
  "name": "my-service",
  "stackType": "RESTFUL_API"
}
```

Cloud provider is determined when provisioning to an environment:

```json
POST /v1/stacks/{id}/provision
{
  "environmentId": "uuid-here"
}
```

The environment's cloud provider configuration determines where resources are created.

## Testing

All tests have been updated to reflect the cloud-agnostic design:

- **Entity Tests**: No longer test cloud provider, domain, or category associations
- **Service Tests**: No longer test organizational field logic
- **Integration Tests**: No longer validate removed fields in API responses
- **Frontend Tests**: Verify removed fields are not displayed or submitted
- **Migration Tests**: Verify schema changes and data preservation

## Documentation Updates

The following documentation has been updated:

1. **Architecture Documentation**: Explains cloud-agnostic stack design
2. **API Documentation**: Removed references to removed fields
3. **Database Schema**: Updated table comments to explain design
4. **Migration Script**: Added comprehensive comments explaining changes
5. **This Document**: Comprehensive guide to the new design

## Future Considerations

### Environment Management

Future enhancements may include:
- Environment templates for consistent cloud provider configuration
- Environment promotion workflows
- Multi-region environment support

### Blueprint Enhancements

Blueprints may be enhanced to:
- Define cloud-specific resource configurations
- Support conditional resources based on cloud provider
- Provide cloud provider recommendations

### Validation

Future validation may include:
- Ensuring environments have valid cloud provider configurations
- Validating resource compatibility with target cloud providers
- Warning about cloud-specific features in stack configurations

## References

- **Migration Script**: `src/main/resources/db/migration/V4__remove_stack_organizational_fields.sql`
- **Architecture Documentation**: `docs/ARCHITECTURE.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Requirements**: `.kiro/specs/remove-stack-cloud-provider/requirements.md`
- **Design**: `.kiro/specs/remove-stack-cloud-provider/design.md`

## Questions and Support

For questions about the cloud-agnostic design:
- Review this document and the architecture documentation
- Check the migration script for implementation details
- Consult the requirements and design documents for rationale
- Contact the development team for clarification

---

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Migration Version**: V4__remove_stack_organizational_fields.sql
