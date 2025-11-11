# Design Document: AWS Default Properties Initialization

## Overview

This feature initializes the property_schemas table with comprehensive AWS-specific properties for all resource types in the system. The implementation uses a Flyway database migration to insert static configuration data that enables developers to configure AWS resources through the dynamic forms system. This design focuses exclusively on AWS to provide immediate value, with a clear path for adding other cloud providers in future iterations.

The design builds upon the completed dynamic-infrastructure-forms feature, which provides the frontend and backend infrastructure for property schema management. This feature completes the system by populating the database with actual property definitions.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  V2__data.sql (Extended)                             │  │
│  │  (Flyway Migration - adds AWS properties)            │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  resource_type_cloud_mappings                        │  │
│  │  (Links resource types to AWS with Terraform paths) │  │
│  └──────────────┬───────────────────────────────────────┘  │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  property_schemas                                    │  │
│  │  (Defines AWS-specific properties for each type)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Read by existing API endpoints
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Existing)                          │
│  GET /v1/blueprints/resource-schema/{rtId}/{cpId}           │
│  GET /v1/stacks/resource-schema/{rtId}/{cpId}               │
└─────────────────────────────────────────────────────────────┘
                 │
                 │ Consumed by existing frontend
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Frontend (Existing)                                │
│  DynamicResourceForm renders properties dynamically          │
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
4. Insert resource_type_cloud_mappings (NEW)
   (Storage + AWS, RDS + AWS, EKS + AWS, Service Bus + AWS)
       │
       ▼
5. Insert property_schemas for each mapping (NEW)
   (Storage: storageClass, versioning, encryption, etc.)
   (RDS: engine, instanceClass, allocatedStorage, etc.)
   (EKS: kubernetesVersion, nodeInstanceType, etc.)
   (Service Bus: serviceType, retentionPeriod, etc.)
       │
       ▼
6. Data available to existing API endpoints
       │
       ▼
7. Frontend fetches and renders properties
```

## Components and Interfaces

### 1. Extended V2 Migration Script

**File**: `idp-api/src/main/resources/db/migration/V2__data.sql`

**Purpose**: Seeds initial data including cloud providers, resource types, environments, and AWS property schemas

**Extended Structure**:
```sql
-- Existing sections:
-- Section 1: Seed cloud providers
-- Section 2: Seed resource types  
-- Section 3: Seed environments

-- New sections to add:
-- Section 4: Resource Type Cloud Mappings
-- Creates mappings between resource types and AWS with Terraform module locations

-- Section 5: Storage (S3) Properties
-- Defines properties for AWS S3 buckets

-- Section 6: Relational Database Server (RDS) Properties
-- Defines properties for AWS RDS instances

-- Section 7: Managed Container Orchestrator (EKS) Properties
-- Defines properties for AWS EKS clusters

-- Section 8: Service Bus (SNS/SQS) Properties
-- Defines properties for AWS messaging services
```

### 2. UUID Strategy

**Simple UUIDs**: Use straightforward UUID generation for new records

**Approach**: Generate UUIDs that are easy to reference and maintain
```sql
-- Mapping IDs: Simple, memorable UUIDs
-- Storage + AWS: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01'
-- RDS + AWS: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02'
-- EKS + AWS: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
-- Service Bus + AWS: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04'

-- Property Schema IDs: Sequential UUIDs for each property
-- Pattern: 'p{mapping_num}{property_num}...'
```

**Note**: Since we're not worried about backward compatibility, we can use simple, readable UUIDs.

### 3. Resource Type Cloud Mappings

**Table**: `resource_type_cloud_mappings`

**Records to Create**:

| Resource Type | Cloud Provider | Terraform Module Location | Module Type |
|---------------|----------------|---------------------------|-------------|
| Storage | AWS | https://github.com/terraform-aws-modules/terraform-aws-s3-bucket | GIT |
| Relational Database Server | AWS | https://github.com/terraform-aws-modules/terraform-aws-rds | GIT |
| Managed Container Orchestrator | AWS | https://github.com/terraform-aws-modules/terraform-aws-eks | GIT |
| Service Bus | AWS | https://github.com/terraform-aws-modules/terraform-aws-sns | GIT |

**Mapping IDs** (deterministic):
- Storage + AWS: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01`
- RDS + AWS: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02`
- EKS + AWS: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03`
- Service Bus + AWS: `d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04`

## Data Models

### AWS Storage (S3) Properties

| Property Name | Display Name | Data Type | Required | Default Value | Validation Rules | Display Order |
|---------------|--------------|-----------|----------|---------------|------------------|---------------|
| storageClass | Storage Class | LIST | Yes | STANDARD | allowedValues: STANDARD, STANDARD_IA, ONEZONE_IA, GLACIER, DEEP_ARCHIVE, INTELLIGENT_TIERING | 10 |
| versioning | Versioning Status | LIST | Yes | Enabled | allowedValues: Enabled, Suspended, Disabled | 20 |
| encryption | Server-Side Encryption | LIST | Yes | AES256 | allowedValues: AES256, aws:kms | 30 |
| publicAccessBlock | Block Public Access | BOOLEAN | No | true | - | 40 |
| lifecycleDays | Lifecycle Transition Days | NUMBER | No | - | min: 1, max: 3650 | 50 |
| objectLockEnabled | Object Lock Enabled | BOOLEAN | No | false | - | 60 |

**Descriptions**:
- **storageClass**: The storage class determines the cost and availability of objects. STANDARD is for frequently accessed data, STANDARD_IA for infrequent access, GLACIER for archival.
- **versioning**: Enable versioning to keep multiple versions of objects. Recommended for production data.
- **encryption**: Server-side encryption protects data at rest. AES256 uses S3-managed keys, aws:kms uses AWS KMS keys.
- **publicAccessBlock**: Block all public access to the bucket. Recommended to keep enabled for security.
- **lifecycleDays**: Number of days before transitioning objects to a different storage class (1-3650 days).
- **objectLockEnabled**: Enable object lock to prevent object deletion for compliance requirements.

### AWS Relational Database Server (RDS) Properties

| Property Name | Display Name | Data Type | Required | Default Value | Validation Rules | Display Order |
|---------------|--------------|-----------|----------|---------------|------------------|---------------|
| engine | Database Engine | LIST | Yes | postgres | allowedValues: mysql, postgres, mariadb, oracle-ee, oracle-se2, sqlserver-ex, sqlserver-web, sqlserver-se, sqlserver-ee | 10 |
| engineVersion | Engine Version | STRING | Yes | - | - | 20 |
| instanceClass | Instance Class | LIST | Yes | db.t3.small | allowedValues: db.t3.micro, db.t3.small, db.t3.medium, db.t3.large, db.m5.large, db.m5.xlarge, db.m5.2xlarge, db.r5.large, db.r5.xlarge | 30 |
| allocatedStorage | Allocated Storage (GB) | NUMBER | Yes | 20 | min: 20, max: 65536 | 40 |
| multiAZ | Multi-AZ Deployment | BOOLEAN | No | false | - | 50 |
| backupRetentionPeriod | Backup Retention (Days) | NUMBER | No | 7 | min: 0, max: 35 | 60 |
| storageEncrypted | Storage Encryption | BOOLEAN | No | true | - | 70 |
| publiclyAccessible | Publicly Accessible | BOOLEAN | No | false | - | 80 |

**Descriptions**:
- **engine**: The database engine to use (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server).
- **engineVersion**: The version of the database engine (e.g., 14.7 for PostgreSQL, 8.0.32 for MySQL).
- **instanceClass**: The compute and memory capacity. t3 instances are burstable, m5 are general purpose, r5 are memory-optimized.
- **allocatedStorage**: The amount of storage in gigabytes (20-65536 GB).
- **multiAZ**: Deploy a standby instance in a different availability zone for high availability.
- **backupRetentionPeriod**: Number of days to retain automated backups (0-35 days, 0 disables backups).
- **storageEncrypted**: Encrypt the database storage at rest. Recommended for production.
- **publiclyAccessible**: Allow connections from the internet. Keep false for security unless required.

### AWS Managed Container Orchestrator (EKS) Properties

| Property Name | Display Name | Data Type | Required | Default Value | Validation Rules | Display Order |
|---------------|--------------|-----------|----------|---------------|------------------|---------------|
| kubernetesVersion | Kubernetes Version | LIST | Yes | 1.30 | allowedValues: 1.28, 1.29, 1.30, 1.31 | 10 |
| nodeInstanceType | Node Instance Type | LIST | Yes | t3.medium | allowedValues: t3.small, t3.medium, t3.large, t3.xlarge, m5.large, m5.xlarge, m5.2xlarge, c5.large, c5.xlarge | 20 |
| desiredNodeCount | Desired Node Count | NUMBER | Yes | 2 | min: 1, max: 100 | 30 |
| minNodeCount | Minimum Node Count | NUMBER | No | 1 | min: 1, max: 100 | 40 |
| maxNodeCount | Maximum Node Count | NUMBER | No | 4 | min: 1, max: 100 | 50 |
| enableClusterAutoscaler | Enable Cluster Autoscaler | BOOLEAN | No | false | - | 60 |
| nodeVolumeSize | Node Volume Size (GB) | NUMBER | No | 20 | min: 20, max: 1000 | 70 |

**Descriptions**:
- **kubernetesVersion**: The Kubernetes version for the EKS cluster. Use the latest stable version when possible.
- **nodeInstanceType**: The EC2 instance type for worker nodes. t3 instances are burstable, m5 are general purpose, c5 are compute-optimized.
- **desiredNodeCount**: The desired number of worker nodes in the node group (1-100).
- **minNodeCount**: The minimum number of worker nodes when autoscaling is enabled (1-100).
- **maxNodeCount**: The maximum number of worker nodes when autoscaling is enabled (1-100).
- **enableClusterAutoscaler**: Automatically scale the number of nodes based on pod resource requests.
- **nodeVolumeSize**: The size of the EBS volume attached to each worker node in gigabytes (20-1000 GB).

### AWS Service Bus (SNS/SQS) Properties

| Property Name | Display Name | Data Type | Required | Default Value | Validation Rules | Display Order |
|---------------|--------------|-----------|----------|---------------|------------------|---------------|
| serviceType | Service Type | LIST | Yes | SQS | allowedValues: SNS, SQS, EventBridge | 10 |
| messageRetentionPeriod | Message Retention (Seconds) | NUMBER | No | 345600 | min: 60, max: 1209600 | 20 |
| visibilityTimeout | Visibility Timeout (Seconds) | NUMBER | No | 30 | min: 0, max: 43200 | 30 |
| fifoQueue | FIFO Queue | BOOLEAN | No | false | - | 40 |
| contentBasedDeduplication | Content-Based Deduplication | BOOLEAN | No | false | - | 50 |
| maxMessageSize | Max Message Size (Bytes) | NUMBER | No | 262144 | min: 1024, max: 262144 | 60 |

**Descriptions**:
- **serviceType**: The type of messaging service (SNS for pub/sub, SQS for queues, EventBridge for event routing).
- **messageRetentionPeriod**: How long messages are retained in seconds (60-1209600, default 4 days).
- **visibilityTimeout**: How long a message is invisible after being received in seconds (0-43200, default 30).
- **fifoQueue**: Create a FIFO (First-In-First-Out) queue for ordered message processing.
- **contentBasedDeduplication**: Enable automatic deduplication based on message content for FIFO queues.
- **maxMessageSize**: Maximum message size in bytes (1024-262144, default 256 KB).

## Error Handling

### Migration Execution Errors

**Scenario**: Migration fails due to missing foreign key references

**Handling**:
1. Migration script references existing resource types and cloud providers from earlier in V2
2. Uses the known UUIDs from the cloud_providers and resource_types INSERT statements
3. If resource type or cloud provider doesn't exist, migration fails with clear error message
4. V1 schema must be applied before V2 data migration

**Prevention**:
- Add comments in migration script indicating dependencies
- Use descriptive error messages in CHECK constraints
- Test migration on clean database before deployment

### Duplicate Data Errors

**Scenario**: Migration runs twice, attempting to insert duplicate records

**Handling**:
1. All INSERT statements use `ON CONFLICT DO NOTHING` clause
2. Unique constraints on `(resource_type_id, cloud_provider_id)` prevent duplicate mappings
3. Unique constraints on `(mapping_id, property_name)` prevent duplicate properties
4. Migration completes successfully even if data already exists

**Idempotency**:
- Migration can be run multiple times safely
- No data is modified or deleted, only inserted if missing
- Simple UUIDs ensure consistent IDs across runs

### Invalid Terraform Module Locations

**Scenario**: Terraform module URL is incorrect or inaccessible

**Handling**:
1. Migration inserts the URL as configured
2. Validation occurs at provisioning time, not migration time
3. URLs can be updated through admin UI after migration
4. Use well-known, stable Terraform module repositories

**Mitigation**:
- Use official terraform-aws-modules repositories
- Document module locations in migration comments
- Provide admin UI for updating module locations

## Testing Strategy

### Migration Testing

**Unit Tests**: Not applicable (SQL migration script)

**Integration Tests**:
1. Test migration on clean database (V1 schema, then V2 data)
2. Verify all mappings are created
3. Verify all property schemas are created
4. Verify foreign key relationships are correct
5. Verify no duplicate records are created

**Test Database Setup**:
```bash
# Reset test database
docker compose down -v
docker compose up -d postgres

# Run migrations
./mvnw flyway:migrate

# Verify data
psql -h localhost -U idp_user -d idp_db -c "SELECT COUNT(*) FROM resource_type_cloud_mappings WHERE cloud_provider_id = (SELECT id FROM cloud_providers WHERE name = 'AWS');"
psql -h localhost -U idp_user -d idp_db -c "SELECT COUNT(*) FROM property_schemas WHERE mapping_id IN (SELECT id FROM resource_type_cloud_mappings WHERE cloud_provider_id = (SELECT id FROM cloud_providers WHERE name = 'AWS'));"
```

### End-to-End Testing

**Test Scenario 1: Create Blueprint with AWS Storage**
1. Navigate to Infrastructure page
2. Create new Blueprint
3. Add Storage resource
4. Select AWS as cloud provider
5. Verify dynamic form displays S3 properties
6. Fill in required properties (storageClass, versioning, encryption)
7. Save resource
8. Verify resource is saved with cloud-specific properties

**Test Scenario 2: Create Stack with AWS RDS**
1. Navigate to Development page
2. Create new Stack
3. Add Relational Database resource
4. Select AWS as cloud provider
5. Verify dynamic form displays RDS properties
6. Fill in required properties (engine, engineVersion, instanceClass, allocatedStorage)
7. Save resource
8. Verify resource is saved with cloud-specific properties

**Test Scenario 3: Verify Property Validation**
1. Create Blueprint with AWS EKS resource
2. Enter invalid value for desiredNodeCount (e.g., 0 or 101)
3. Verify validation error is displayed
4. Enter valid value
5. Verify error clears and form can be submitted

### Manual Testing Checklist

- [ ] Run migration on clean database
- [ ] Verify all 4 resource type cloud mappings are created
- [ ] Verify property schemas are created for each mapping
- [ ] Test creating Blueprint with each AWS resource type
- [ ] Test creating Stack with each AWS resource type
- [ ] Verify required fields are marked with asterisk
- [ ] Verify default values are pre-populated
- [ ] Verify validation rules work correctly
- [ ] Verify help text is displayed for each property
- [ ] Test form submission with valid data
- [ ] Test form submission with invalid data
- [ ] Verify properties are saved correctly in database
- [ ] Test theme switching (light/dark) with AWS properties

## Implementation Approach

### Phase 1: Extend V2 Migration Script
1. Open V2__data.sql file
2. Add section comments for new AWS property data
3. Define UUID constants for mappings
4. Add organization comments for each resource type

### Phase 2: Implement Resource Type Cloud Mappings
1. Write INSERT statements for 4 AWS mappings
2. Use subqueries to fetch resource type and cloud provider IDs
3. Add ON CONFLICT DO NOTHING clauses
4. Specify Terraform module locations
5. Set enabled = true for all mappings

### Phase 3: Implement Storage (S3) Properties
1. Write INSERT statements for 6 S3 properties
2. Define validation rules in JSONB format
3. Set display_order values
4. Add descriptive help text
5. Mark required properties

### Phase 4: Implement RDS Properties
1. Write INSERT statements for 8 RDS properties
2. Define validation rules for engine, instanceClass, etc.
3. Set display_order values
4. Add descriptive help text
5. Mark required properties

### Phase 5: Implement EKS Properties
1. Write INSERT statements for 7 EKS properties
2. Define validation rules for kubernetesVersion, nodeInstanceType, etc.
3. Set display_order values
4. Add descriptive help text
5. Mark required properties

### Phase 6: Implement Service Bus Properties
1. Write INSERT statements for 6 SNS/SQS properties
2. Define validation rules for serviceType, retention, etc.
3. Set display_order values
4. Add descriptive help text
5. Mark required properties

### Phase 7: Testing and Validation
1. Test migration on clean database
2. Test idempotency (run twice)
3. Verify data integrity
4. Test with frontend dynamic forms
5. Perform end-to-end testing

## Data Handling

### Validation Rules Format

**JSONB Structure**:
```json
{
  "allowedValues": [
    {"value": "STANDARD", "label": "Standard"},
    {"value": "STANDARD_IA", "label": "Standard-IA"}
  ],
  "min": 20,
  "max": 65536,
  "pattern": "^[0-9]+\\.[0-9]+$"
}
```

**Examples**:

**LIST with allowed values**:
```json
{
  "allowedValues": [
    {"value": "mysql", "label": "MySQL"},
    {"value": "postgres", "label": "PostgreSQL"},
    {"value": "mariadb", "label": "MariaDB"}
  ]
}
```

**NUMBER with min/max**:
```json
{
  "min": 20,
  "max": 65536
}
```

**STRING with pattern**:
```json
{
  "pattern": "^[0-9]+\\.[0-9]+$"
}
```

### Default Values Format

**JSONB Structure**:
```json
"STANDARD"  // For STRING/LIST
true        // For BOOLEAN
20          // For NUMBER
```

**Examples**:
- Storage class: `"STANDARD"`
- Multi-AZ: `false`
- Allocated storage: `20`
- Kubernetes version: `"1.30"`

## Performance Considerations

### Migration Execution Time

**Expected Duration**: < 1 second
- 4 mapping inserts
- ~30 property schema inserts
- All inserts are simple, no complex queries

**Optimization**:
- Use single transaction for all inserts
- No indexes need to be created (already exist from V1)
- ON CONFLICT clauses are efficient with existing unique constraints

### Database Impact

**Storage**: Minimal (~10 KB for all records)
**Indexes**: No new indexes required
**Locks**: Brief table locks during INSERT, released immediately

## Security Considerations

### Terraform Module URLs

**Trust**: URLs point to official terraform-aws-modules repositories
**Validation**: URLs are not validated at migration time
**Updates**: URLs can be updated through admin UI if needed

### Property Validation

**Client-Side**: Frontend validates based on property schemas
**Server-Side**: Backend must also validate (not part of this feature)
**Injection**: No user input in migration script, all values are static

### Access Control

**Migration**: Requires database admin privileges
**Property Schemas**: Read by all authenticated users
**Modification**: Only admins can modify through admin UI

## Design Decisions and Rationales

### Simple UUIDs

**Decision**: Use simple, readable UUIDs for new records

**Rationale**:
- Easy to reference in migration script
- No need for complex UUID generation logic
- Simplifies testing and debugging
- Since we're modifying V2 directly, no backward compatibility concerns

### Terraform Module Locations

**Decision**: Use official terraform-aws-modules repositories

**Rationale**:
- Well-maintained and widely used
- Follow AWS best practices
- Comprehensive documentation
- Active community support

### Property Display Order

**Decision**: Use increments of 10 for display_order (10, 20, 30, etc.)

**Rationale**:
- Allows inserting new properties between existing ones
- Provides flexibility for future additions
- Common practice in ordered lists
- Easy to understand and maintain

### AWS-Only Focus

**Decision**: Only implement AWS properties in this migration

**Rationale**:
- Provides immediate value to AWS users
- Reduces complexity and testing scope
- Allows learning from AWS implementation before adding other clouds
- Clear separation of concerns (one migration per cloud provider)

### Required vs Optional Properties

**Decision**: Mark only essential properties as required

**Rationale**:
- Reduces friction for developers
- Allows quick resource creation with defaults
- Advanced properties can be configured later
- Follows principle of progressive disclosure

### Validation Rules in JSONB

**Decision**: Store validation rules as JSONB instead of separate columns

**Rationale**:
- Flexible schema for different validation types
- Easy to extend with new validation rules
- Matches existing database design
- Efficient storage and retrieval

## Future Enhancements

### Azure Properties (V4 Migration)

- Create mappings for Azure resource types
- Define properties for Azure Storage, SQL Database, AKS, Service Bus
- Follow same pattern as AWS implementation

### GCP Properties (V5 Migration)

- Create mappings for GCP resource types
- Define properties for Cloud Storage, Cloud SQL, GKE, Pub/Sub
- Follow same pattern as AWS implementation

### Property Schema Versioning

- Add version field to property_schemas table
- Support multiple versions of property schemas
- Allow gradual migration to new property definitions

### Dynamic Terraform Module Selection

- Allow multiple Terraform modules per resource type/cloud combination
- Add module selection UI in admin interface
- Support custom/private Terraform modules

### Property Dependencies

- Add support for conditional properties (e.g., FIFO-specific properties)
- Implement property dependency rules
- Show/hide properties based on other property values

### Property Validation Enhancement

- Add custom validation functions
- Support cross-property validation
- Implement async validation (e.g., check if engine version is valid)
