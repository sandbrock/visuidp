# Design Document: AWS ECS Container Orchestrator Properties

## Overview

This feature replaces the Kubernetes (EKS) property schemas for AWS Managed Container Orchestrator with ECS (Elastic Container Service) cluster property schemas. The Container Orchestrator blueprint resource represents an ECS cluster only - the shared infrastructure that hosts containerized applications. Task definitions and services (the actual containerized applications) will be configured at the stack level, not the blueprint level.

This separation follows the IDP's architecture where:
- **Blueprints** define reusable infrastructure (ECS clusters)
- **Stacks** define applications that run on that infrastructure (ECS tasks/services)

The implementation directly modifies the existing V2 migration file to use ECS cluster properties instead of EKS from the start. The frontend dynamic forms system will automatically render the new ECS cluster properties once the database is updated.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  V2__data.sql (MODIFIED)                             │  │
│  │  (Flyway Migration - uses ECS cluster properties)    │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  resource_type_cloud_mappings                        │  │
│  │  Uses: terraform-aws-ecs (cluster module)            │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  property_schemas                                    │  │
│  │  Contains: ECS cluster properties only               │  │
│  │  (capacityProvider, instanceType, clusterSize, etc)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Read by existing API endpoints
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (No Changes)                        │
│  GET /v1/blueprints/resource-schema/{rtId}/{cpId}           │
│  (Returns cluster properties for blueprints)                │
│                                                              │
│  GET /v1/stacks/resource-schema/{rtId}/{cpId}               │
│  (Will return task properties for stacks - future work)     │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Consumed by existing frontend
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend (No Changes)                              │
│  DynamicResourceForm renders ECS cluster properties          │
│  for blueprints dynamically                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
V2 Migration Execution
       │
       ▼
1. Seed cloud providers (existing)
       │
       ▼
2. Seed resource types (existing)
       │
       ▼
3. Seed environments (existing)
       │
       ▼
4. Insert resource_type_cloud_mappings (MODIFIED)
   (Managed Container Orchestrator + AWS → terraform-aws-ecs)
       │
       ▼
5. Insert property_schemas (MODIFIED)
   (ECS cluster properties: capacityProvider, instanceType, clusterSize, etc.)
       │
       ▼
6. Data available to existing API endpoints
       │
       ▼
7. Frontend fetches and renders ECS cluster properties for blueprints
```

## Components and Interfaces

### 1. Modified V2 Migration Script

**File**: `idp-api/src/main/resources/db/migration/V2__data.sql`

**Purpose**: Seeds initial data with ECS properties instead of EKS properties for AWS Managed Container Orchestrator

**Modified Sections**:
```sql
-- Section 4: Resource Type Cloud Mappings (MODIFIED)
-- Managed Container Orchestrator + AWS uses terraform-aws-ecs cluster module

-- Section 7: Managed Container Orchestrator Properties (REPLACED)
-- ECS cluster properties instead of EKS properties
-- (capacityProvider, instanceType, minClusterSize, maxClusterSize, 
--  enableContainerInsights)
```

### 2. UUID Strategy

**Property Schema IDs**: Use sequential UUIDs with ECS cluster prefix
```sql
-- Pattern: '04{property_num}0000-0000-0000-0000-000000000000'
-- capacityProvider:         '04010000-0000-0000-0000-000000000001'
-- instanceType:             '04010000-0000-0000-0000-000000000002'
-- minClusterSize:           '04010000-0000-0000-0000-000000000003'
-- maxClusterSize:           '04010000-0000-0000-0000-000000000004'
-- enableContainerInsights:  '04010000-0000-0000-0000-000000000005'
```

### 3. Resource Type Cloud Mapping Update

**Table**: `resource_type_cloud_mappings`

**Existing Record** (to be updated):
- Mapping ID: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03`
- Resource Type: Managed Container Orchestrator
- Cloud Provider: AWS
- Current Module: `https://github.com/terraform-aws-modules/terraform-aws-eks`

**Updated Record**:
- Mapping ID: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03` (same)
- Resource Type: Managed Container Orchestrator (same)
- Cloud Provider: AWS (same)
- New Module: `https://github.com/terraform-aws-modules/terraform-aws-ecs`

## Data Models

### ECS Cluster Property Schemas

#### 1. Capacity Provider

| Field | Value |
|-------|-------|
| **Property Name** | capacityProvider |
| **Display Name** | Capacity Provider |
| **Description** | The capacity provider determines how the ECS cluster provisions compute resources. FARGATE is serverless and AWS manages all infrastructure. FARGATE_SPOT uses spare AWS capacity at reduced cost but tasks may be interrupted. EC2 gives you control over instance types and cluster scaling but requires managing the infrastructure. FARGATE is recommended for most use cases. |
| **Data Type** | LIST |
| **Required** | Yes |
| **Default Value** | "FARGATE" |
| **Validation Rules** | allowedValues: FARGATE, FARGATE_SPOT, EC2 |
| **Display Order** | 10 |

#### 2. Instance Type (EC2 Only)

| Field | Value |
|-------|-------|
| **Property Name** | instanceType |
| **Display Name** | EC2 Instance Type |
| **Description** | The EC2 instance type for the ECS cluster nodes. Only applies when capacity provider is EC2. t3 instances are burstable and cost-effective for variable workloads, m5 are general purpose for consistent workloads, c5 are compute-optimized for CPU-intensive applications. Ignored when using FARGATE or FARGATE_SPOT. |
| **Data Type** | LIST |
| **Required** | No |
| **Default Value** | "t3.medium" |
| **Validation Rules** | allowedValues: t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge |
| **Display Order** | 20 |

#### 3. Minimum Cluster Size (EC2 Only)

| Field | Value |
|-------|-------|
| **Property Name** | minClusterSize |
| **Display Name** | Minimum Cluster Size |
| **Description** | The minimum number of EC2 instances to maintain in the cluster. The cluster will not scale below this number even under low load. Setting this to 0 allows the cluster to scale down completely when idle, reducing costs. Only applies when capacity provider is EC2. |
| **Data Type** | NUMBER |
| **Required** | No |
| **Default Value** | "1" |
| **Validation Rules** | min: 0, max: 100 |
| **Display Order** | 30 |

#### 4. Maximum Cluster Size (EC2 Only)

| Field | Value |
|-------|-------|
| **Property Name** | maxClusterSize |
| **Display Name** | Maximum Cluster Size |
| **Description** | The maximum number of EC2 instances allowed in the cluster. The cluster will not scale above this number even under high load. This setting controls cost and resource limits. Must be greater than or equal to minimum cluster size. Only applies when capacity provider is EC2. |
| **Data Type** | NUMBER |
| **Required** | No |
| **Default Value** | "10" |
| **Validation Rules** | min: 1, max: 100 |
| **Display Order** | 40 |

#### 5. Enable Container Insights

| Field | Value |
|-------|-------|
| **Property Name** | enableContainerInsights |
| **Display Name** | Enable Container Insights |
| **Description** | Enable CloudWatch Container Insights to collect, aggregate, and summarize metrics and logs from your containerized applications. Provides cluster-level, task-level, and service-level metrics including CPU, memory, disk, and network utilization. Additional CloudWatch charges apply. |
| **Data Type** | BOOLEAN |
| **Required** | No |
| **Default Value** | "true" |
| **Validation Rules** | - |
| **Display Order** | 50 |

## Migration Strategy

### Modify V2 Migration File

**Approach**: Directly edit the existing V2__data.sql file to replace EKS with ECS

**Changes Required**:

1. **Update Terraform Module Location** (Line ~95 in V2__data.sql)
   ```sql
   -- Change FROM:
   'https://github.com/terraform-aws-modules/terraform-aws-eks'
   
   -- Change TO:
   'https://github.com/terraform-aws-modules/terraform-aws-ecs'
   ```

2. **Replace EKS Property Schemas** (Section 7, starting around line ~423)
   - Remove all 7 EKS property INSERT statements
   - Add 5 new ECS cluster property INSERT statements
   - Update section comment from "AWS Managed Container Orchestrator (EKS)" to "AWS Managed Container Orchestrator (ECS Cluster)"

3. **Update Property Schema IDs**
   - Use new UUID pattern: `04{property_num}0000-0000-0000-0000-000000000001`
   - Ensures no conflicts with existing IDs

## Error Handling

### Migration Failures

**Scenario**: Migration fails due to foreign key constraints or existing data

**Handling**:
- Use transactions to ensure atomic updates
- Verify mapping exists before deleting property schemas
- Use ON CONFLICT DO NOTHING for idempotent inserts

### Data Validation

**Scenario**: Invalid property values in existing blueprints or stacks

**Handling**:
- Existing blueprints/stacks with EKS properties will need manual migration
- Document migration path for existing resources
- Consider adding a data migration script if needed
- Validate that maxClusterSize >= minClusterSize for EC2 capacity provider

## Testing Strategy

### Database Migration Testing

1. **Clean Database Test**
   - Drop and recreate database
   - Run V1 migration (schema)
   - Run V2 migration (data with ECS cluster properties)
   - Verify mapping uses terraform-aws-ecs
   - Verify 5 ECS cluster properties inserted correctly
   - Verify no EKS properties exist

2. **Idempotency Test**
   - Run V2 migration multiple times
   - Verify ON CONFLICT clauses prevent duplicates
   - Verify final state is consistent

### API Integration Testing

1. **Property Schema Retrieval**
   - GET `/v1/blueprints/resource-schema/{rtId}/{cpId}`
   - Verify returns ECS properties
   - Verify does not return EKS properties
   - Verify property order is correct

2. **Blueprint Creation**
   - Create blueprint with Managed Container Orchestrator
   - Select AWS as cloud provider
   - Verify form displays ECS cluster properties
   - Verify validation rules work correctly
   - Verify EC2-specific properties only appear when EC2 capacity provider is selected

3. **Stack Creation**
   - Create stack that references blueprint with ECS cluster
   - Verify blueprint cluster properties are accessible
   - Note: Task-level properties for stacks are future work

### Frontend Testing

1. **Dynamic Form Rendering**
   - Navigate to Infrastructure page
   - Create new Blueprint
   - Add Managed Container Orchestrator resource
   - Select AWS as cloud provider
   - Verify dynamic form displays all 5 ECS cluster properties
   - Verify properties in correct order
   - Verify default values populated

2. **Validation Testing**
   - Test required field validation (capacityProvider)
   - Test numeric range validation (cluster sizes)
   - Test allowed values validation (capacityProvider, instanceType)
   - Verify error messages display correctly
   - Verify maxClusterSize >= minClusterSize validation

3. **Capacity Provider Conditional Logic**
   - Select FARGATE capacity provider
   - Verify EC2-specific fields (instanceType, cluster sizes) are hidden/optional
   - Select EC2 capacity provider
   - Verify EC2-specific fields are visible
   - Verify cluster size validation works correctly

## Backward Compatibility

**Not Applicable**: Since we're modifying the V2 migration file directly, there are no backward compatibility concerns. The database will be seeded with ECS cluster properties from the start. Any existing databases will need to be reset or manually migrated.

**Note**: This change removes task-level properties from blueprints. Task definitions and services will be configured at the stack level in future work, maintaining a clear separation between infrastructure (blueprints) and applications (stacks).

## Deployment Considerations

### Database Reset Required

**For Existing Databases**: Since we're modifying V2 migration, existing databases need to be reset:
1. Drop existing database
2. Recreate database
3. Run migrations from scratch (V1, V2)

**For New Deployments**: No special considerations - migrations run normally

### Application Deployment

1. **No Code Changes**: No application code changes required
2. **API Compatibility**: Existing API endpoints work unchanged
3. **Frontend Compatibility**: Dynamic forms automatically adapt

## Documentation Updates

### User Documentation

- Update AWS resource configuration guide
- Add ECS cluster property reference documentation
- Document ECS vs EKS decision criteria
- Provide ECS cluster configuration examples
- Document blueprint vs stack property separation
- Explain that task properties will be configured at stack level

### Developer Documentation

- Document V2 migration modifications
- Update database schema documentation
- Add ECS cluster property schema reference
- Document migration from EKS to ECS
- Document blueprint/stack property separation architecture

## Future Enhancements

### Stack-Level Task Properties

The next phase will add task-level properties for stacks:
- Task CPU and memory allocation
- Desired task count
- Auto-scaling configuration (min/max tasks)
- Container image and port configuration
- Environment variables
- Task IAM role
- Load balancer integration

These properties will be configured when creating stacks that reference ECS cluster blueprints.

### EKS Support

If EKS support is needed in the future:
- Create separate resource type "Managed Kubernetes Service"
- Add EKS property schemas for new resource type
- Maintain ECS as default for "Managed Container Orchestrator"

### Additional ECS Cluster Properties

Future iterations could add cluster-level properties:
- Service discovery namespace configuration
- Default task execution role
- Cluster-level encryption settings
- CloudWatch log group configuration
- Capacity provider weights and strategies

### Multi-Cloud Support

- Add Azure Container Instances cluster properties
- Add Google Cloud Run cluster properties
- Maintain consistent property naming across clouds
- Ensure clear separation between cluster (blueprint) and workload (stack) properties
