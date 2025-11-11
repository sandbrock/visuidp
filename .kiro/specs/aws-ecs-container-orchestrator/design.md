# Design Document: AWS ECS Container Orchestrator Properties

## Overview

This feature replaces the Kubernetes (EKS) property schemas for AWS Managed Container Orchestrator with ECS (Elastic Container Service) property schemas. AWS ECS is AWS's native container orchestration service and is more commonly used than EKS for AWS-native deployments. The implementation directly modifies the existing V2 migration file to use ECS instead of EKS from the start.

The frontend dynamic forms system will automatically render the new ECS properties once the database is updated.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  V2__data.sql (MODIFIED)                             │  │
│  │  (Flyway Migration - uses ECS instead of EKS)        │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  resource_type_cloud_mappings                        │  │
│  │  Uses: terraform-aws-ecs (not terraform-aws-eks)    │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  property_schemas                                    │  │
│  │  Contains: ECS properties (launchType, taskCpu, etc)│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Read by existing API endpoints
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (No Changes)                        │
│  GET /v1/blueprints/resource-schema/{rtId}/{cpId}           │
│  GET /v1/stacks/resource-schema/{rtId}/{cpId}               │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Consumed by existing frontend
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend (No Changes)                              │
│  DynamicResourceForm renders ECS properties dynamically      │
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
   (ECS properties: launchType, taskCpu, taskMemory, etc.)
       │
       ▼
6. Data available to existing API endpoints
       │
       ▼
7. Frontend fetches and renders ECS properties
```

## Components and Interfaces

### 1. Modified V2 Migration Script

**File**: `idp-api/src/main/resources/db/migration/V2__data.sql`

**Purpose**: Seeds initial data with ECS properties instead of EKS properties for AWS Managed Container Orchestrator

**Modified Sections**:
```sql
-- Section 4: Resource Type Cloud Mappings (MODIFIED)
-- Managed Container Orchestrator + AWS uses terraform-aws-ecs (not terraform-aws-eks)

-- Section 7: Managed Container Orchestrator Properties (REPLACED)
-- ECS properties instead of EKS properties
-- (launchType, taskCpu, taskMemory, desiredTaskCount, enableAutoScaling, 
--  minTaskCount, maxTaskCount, instanceType)
```

### 2. UUID Strategy

**Property Schema IDs**: Use sequential UUIDs with ECS prefix
```sql
-- Pattern: '04{property_num}0000-0000-0000-0000-000000000000'
-- launchType:           '04010000-0000-0000-0000-000000000001'
-- taskCpu:              '04010000-0000-0000-0000-000000000002'
-- taskMemory:           '04010000-0000-0000-0000-000000000003'
-- desiredTaskCount:     '04010000-0000-0000-0000-000000000004'
-- enableAutoScaling:    '04010000-0000-0000-0000-000000000005'
-- minTaskCount:         '04010000-0000-0000-0000-000000000006'
-- maxTaskCount:         '04010000-0000-0000-0000-000000000007'
-- instanceType:         '04010000-0000-0000-0000-000000000008'
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

### ECS Property Schemas

#### 1. Launch Type

| Field | Value |
|-------|-------|
| **Property Name** | launchType |
| **Display Name** | Launch Type |
| **Description** | The launch type determines how your containers run. FARGATE is serverless and AWS manages the infrastructure. EC2 gives you more control over the underlying instances but requires managing the cluster. FARGATE is recommended for most use cases. |
| **Data Type** | LIST |
| **Required** | Yes |
| **Default Value** | "FARGATE" |
| **Validation Rules** | allowedValues: FARGATE, EC2 |
| **Display Order** | 10 |

#### 2. Task CPU

| Field | Value |
|-------|-------|
| **Property Name** | taskCpu |
| **Display Name** | Task CPU (CPU Units) |
| **Description** | The number of CPU units reserved for the task. 1024 CPU units = 1 vCPU. Valid values depend on task memory: 256 (.25 vCPU), 512 (.5 vCPU), 1024 (1 vCPU), 2048 (2 vCPU), 4096 (4 vCPU). |
| **Data Type** | LIST |
| **Required** | Yes |
| **Default Value** | "512" |
| **Validation Rules** | allowedValues: 256, 512, 1024, 2048, 4096 |
| **Display Order** | 20 |

#### 3. Task Memory

| Field | Value |
|-------|-------|
| **Property Name** | taskMemory |
| **Display Name** | Task Memory (MiB) |
| **Description** | The amount of memory (in MiB) reserved for the task. Valid values depend on task CPU. For 512 CPU: 1024-4096 MiB. For 1024 CPU: 2048-8192 MiB. For 2048 CPU: 4096-16384 MiB. For 4096 CPU: 8192-30720 MiB. |
| **Data Type** | LIST |
| **Required** | Yes |
| **Default Value** | "1024" |
| **Validation Rules** | allowedValues: 512, 1024, 2048, 4096, 8192, 16384, 30720 |
| **Display Order** | 30 |

#### 4. Desired Task Count

| Field | Value |
|-------|-------|
| **Property Name** | desiredTaskCount |
| **Display Name** | Desired Task Count |
| **Description** | The number of task instances to run simultaneously. Minimum 2 is recommended for high availability. ECS will maintain this number of running tasks. |
| **Data Type** | NUMBER |
| **Required** | Yes |
| **Default Value** | "2" |
| **Validation Rules** | min: 1, max: 100 |
| **Display Order** | 40 |

#### 5. Enable Auto Scaling

| Field | Value |
|-------|-------|
| **Property Name** | enableAutoScaling |
| **Display Name** | Enable Auto Scaling |
| **Description** | Enable auto scaling to automatically adjust the number of running tasks based on CloudWatch metrics (CPU utilization, memory utilization, or custom metrics). When enabled, ECS will scale between minimum and maximum task counts. |
| **Data Type** | BOOLEAN |
| **Required** | No |
| **Default Value** | "false" |
| **Validation Rules** | - |
| **Display Order** | 50 |

#### 6. Minimum Task Count

| Field | Value |
|-------|-------|
| **Property Name** | minTaskCount |
| **Display Name** | Minimum Task Count |
| **Description** | The minimum number of tasks to maintain when auto scaling is enabled. ECS will not scale below this number even under low load. Only applies when auto scaling is enabled. |
| **Data Type** | NUMBER |
| **Required** | No |
| **Default Value** | "1" |
| **Validation Rules** | min: 1, max: 100 |
| **Display Order** | 60 |

#### 7. Maximum Task Count

| Field | Value |
|-------|-------|
| **Property Name** | maxTaskCount |
| **Display Name** | Maximum Task Count |
| **Description** | The maximum number of tasks to run when auto scaling is enabled. ECS will not scale above this number even under high load. Only applies when auto scaling is enabled. |
| **Data Type** | NUMBER |
| **Required** | No |
| **Default Value** | "10" |
| **Validation Rules** | min: 1, max: 100 |
| **Display Order** | 70 |

#### 8. Instance Type (EC2 Launch Type Only)

| Field | Value |
|-------|-------|
| **Property Name** | instanceType |
| **Display Name** | EC2 Instance Type |
| **Description** | The EC2 instance type for the ECS cluster nodes. Only applies when launch type is EC2. t3 instances are burstable and cost-effective, m5 are general purpose, c5 are compute-optimized. Ignored when using FARGATE launch type. |
| **Data Type** | LIST |
| **Required** | No |
| **Default Value** | "t3.medium" |
| **Validation Rules** | allowedValues: t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge, c5.2xlarge |
| **Display Order** | 80 |

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
   - Add 8 new ECS property INSERT statements
   - Update section comment from "AWS Managed Container Orchestrator (EKS)" to "AWS Managed Container Orchestrator (ECS)"

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

## Testing Strategy

### Database Migration Testing

1. **Clean Database Test**
   - Drop and recreate database
   - Run V1 migration (schema)
   - Run V2 migration (data with ECS properties)
   - Verify mapping uses terraform-aws-ecs
   - Verify ECS properties inserted correctly
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
   - Verify form displays ECS properties
   - Verify validation rules work correctly

3. **Stack Creation**
   - Create stack with ECS-configured resource
   - Verify properties saved correctly
   - Verify properties retrieved correctly

### Frontend Testing

1. **Dynamic Form Rendering**
   - Navigate to Infrastructure page
   - Create new Blueprint
   - Add Managed Container Orchestrator resource
   - Select AWS as cloud provider
   - Verify dynamic form displays all 8 ECS properties
   - Verify properties in correct order
   - Verify default values populated

2. **Validation Testing**
   - Test required field validation
   - Test numeric range validation
   - Test allowed values validation
   - Verify error messages display correctly

3. **Launch Type Conditional Logic**
   - Select FARGATE launch type
   - Verify instanceType field is optional/hidden
   - Select EC2 launch type
   - Verify instanceType field is visible

## Backward Compatibility

**Not Applicable**: Since we're modifying the V2 migration file directly, there are no backward compatibility concerns. The database will be seeded with ECS properties from the start. Any existing databases will need to be reset or manually migrated.

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
- Add ECS property reference documentation
- Document ECS vs EKS decision criteria
- Provide ECS configuration examples

### Developer Documentation

- Document V3 migration script
- Update database schema documentation
- Add ECS property schema reference
- Document migration from EKS to ECS

## Future Enhancements

### EKS Support

If EKS support is needed in the future:
- Create separate resource type "Managed Kubernetes Service"
- Add EKS property schemas for new resource type
- Maintain ECS as default for "Managed Container Orchestrator"

### Additional ECS Properties

Future iterations could add:
- Container insights monitoring
- Service discovery configuration
- Load balancer configuration
- Task placement strategies
- Network mode configuration
- Volume configuration

### Multi-Cloud Support

- Add Azure Container Instances properties
- Add Google Cloud Run properties
- Maintain consistent property naming across clouds
