-- ============================================================================
-- Seed cloud providers
-- ============================================================================
INSERT INTO cloud_providers (id, name, display_name, description, enabled, created_at, updated_at)
VALUES 
    ('8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01', 'AWS', 'Amazon Web Services', 'Amazon Web Services cloud platform', true, NOW(), NOW()),
    ('3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02', 'Azure', 'Microsoft Azure', 'Microsoft Azure cloud platform', true, NOW(), NOW()),
    ('9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03', 'GCP', 'Google Cloud Platform', 'Google Cloud Platform', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Seed resource types
-- ============================================================================

-- Seed SHARED resource types
INSERT INTO resource_types (id, name, display_name, description, category, enabled, created_at, updated_at)
VALUES 
    ('a1f4e5c6-7d8b-4a2f-9c01-1234567890a1', 'Managed Container Orchestrator', 'Managed Container Orchestrator', 'Managed Kubernetes or container orchestration service', 'SHARED', true, NOW(), NOW()),
    ('b2e5f6a7-8c9d-4b3e-8d02-1234567890a2', 'Relational Database Server', 'Relational Database Server', 'Managed relational database server', 'SHARED', true, NOW(), NOW()),
    ('c3f6a7b8-9d0e-4c4d-7e03-1234567890a3', 'Service Bus', 'Service Bus', 'Managed message bus or queue service', 'SHARED', true, NOW(), NOW()),
    ('aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa', 'Storage', 'Storage', 'Object or blob storage service', 'BOTH', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Seed NON_SHARED resource types
INSERT INTO resource_types (id, name, display_name, description, category, enabled, created_at, updated_at)
VALUES 
    ('9dac0bed-3804-418f-a22d-7946a5cf1885', 'NoSQL Database', 'NoSQL Database', 'NoSQL database instance', 'NON_SHARED', true, NOW(), NOW()),
    ('2121c807-7d81-4edd-99ea-36010c63bf27', 'Relational Database', 'Relational Database', 'Relational database instance', 'NON_SHARED', true, NOW(), NOW()),
    ('8ae6e952-f9cb-448f-be8e-8a439f2ae306', 'Queue', 'Queue', 'Message queue instance', 'NON_SHARED', true, NOW(), NOW()),
    ('d4f7b8c9-0e1f-5d6e-9f04-1234567890a4', 'Cache', 'Cache', 'In-memory cache instance', 'NON_SHARED', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Seed environments
-- ============================================================================
INSERT INTO environments (id, name, cloud_provider_id, description, is_active, created_at, updated_at)
VALUES 
    ('7428f743-124a-458d-bda2-f16f1a739638', 'Development', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01', 'Development environment', true, NOW(), NOW()),
    ('631e17d2-4f9e-4f10-b666-f6c78ee92b0f', 'Production', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01', 'Production environment', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- AWS Resource Type Cloud Mappings
-- ============================================================================
-- This section creates mappings between resource types and AWS cloud provider,
-- specifying the Terraform module locations for each resource type.
-- 
-- UUID Constants for AWS Mappings:
-- - Storage + AWS:                      'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01'
-- - Relational Database Server + AWS:   'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02'
-- - Managed Container Orchestrator + AWS: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
-- - Service Bus + AWS:                  'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04'
--
-- ON CONFLICT Handling:
-- All INSERT statements use ON CONFLICT DO NOTHING to ensure idempotency.
-- This allows the migration to be run multiple times without errors if data
-- already exists. The migration will only insert records that don't exist.
-- ============================================================================

-- Storage + AWS (S3)
INSERT INTO resource_type_cloud_mappings (id, resource_type_id, cloud_provider_id, terraform_module_location, module_location_type, enabled, created_at, updated_at)
VALUES (
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',
    'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa',  -- Storage resource type
    '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS cloud provider
    'https://github.com/terraform-aws-modules/terraform-aws-s3-bucket',
    'GIT',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (resource_type_id, cloud_provider_id) DO NOTHING;

-- Relational Database Server + AWS (RDS)
INSERT INTO resource_type_cloud_mappings (id, resource_type_id, cloud_provider_id, terraform_module_location, module_location_type, enabled, created_at, updated_at)
VALUES (
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',
    'b2e5f6a7-8c9d-4b3e-8d02-1234567890a2',  -- Relational Database Server resource type
    '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS cloud provider
    'https://github.com/terraform-aws-modules/terraform-aws-rds',
    'GIT',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (resource_type_id, cloud_provider_id) DO NOTHING;

-- Managed Container Orchestrator + AWS (ECS Cluster)
-- This mapping provisions ECS cluster infrastructure only.
-- Task definitions and services are configured at the stack level.
INSERT INTO resource_type_cloud_mappings (id, resource_type_id, cloud_provider_id, terraform_module_location, module_location_type, enabled, created_at, updated_at)
VALUES (
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',
    'a1f4e5c6-7d8b-4a2f-9c01-1234567890a1',  -- Managed Container Orchestrator resource type
    '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS cloud provider
    'https://github.com/terraform-aws-modules/terraform-aws-ecs',
    'GIT',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (resource_type_id, cloud_provider_id) DO NOTHING;

-- Service Bus + AWS (SNS/SQS)
INSERT INTO resource_type_cloud_mappings (id, resource_type_id, cloud_provider_id, terraform_module_location, module_location_type, enabled, created_at, updated_at)
VALUES (
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',
    'c3f6a7b8-9d0e-4c4d-7e03-1234567890a3',  -- Service Bus resource type
    '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS cloud provider
    'https://github.com/terraform-aws-modules/terraform-aws-sns',
    'GIT',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (resource_type_id, cloud_provider_id) DO NOTHING;

-- ============================================================================
-- AWS Storage (S3) Property Schemas
-- ============================================================================
-- This section defines property schemas for AWS S3 storage resources.
-- Properties include storage class, versioning, encryption, public access
-- blocking, lifecycle policies, and object lock configuration.
--
-- Mapping ID: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01' (Storage + AWS)
-- ============================================================================

-- storageClass property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000001',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'storageClass',
    'Storage Class',
    'The storage class determines the cost and availability of objects. STANDARD is for frequently accessed data, STANDARD_IA for infrequent access, ONEZONE_IA for infrequent access in a single AZ, GLACIER for archival, DEEP_ARCHIVE for long-term archival, and INTELLIGENT_TIERING for automatic cost optimization.',
    'LIST',
    true,
    '"STANDARD"',
    '{"allowedValues": [
        {"value": "STANDARD", "label": "Standard"},
        {"value": "STANDARD_IA", "label": "Standard-IA"},
        {"value": "ONEZONE_IA", "label": "One Zone-IA"},
        {"value": "GLACIER", "label": "Glacier"},
        {"value": "DEEP_ARCHIVE", "label": "Glacier Deep Archive"},
        {"value": "INTELLIGENT_TIERING", "label": "Intelligent-Tiering"}
    ]}',
    10,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- versioning property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000002',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'versioning',
    'Versioning Status',
    'Enable versioning to keep multiple versions of objects. Recommended for production data to protect against accidental deletion or overwrites. Enabled turns on versioning, Suspended pauses versioning without deleting existing versions, and Disabled means no versioning.',
    'LIST',
    true,
    '"Enabled"',
    '{"allowedValues": [
        {"value": "Enabled", "label": "Enabled"},
        {"value": "Suspended", "label": "Suspended"},
        {"value": "Disabled", "label": "Disabled"}
    ]}',
    20,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- encryption property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000003',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'encryption',
    'Server-Side Encryption',
    'Server-side encryption protects data at rest. AES256 uses S3-managed keys (SSE-S3) for automatic encryption, while aws:kms uses AWS Key Management Service (SSE-KMS) for more control over encryption keys and audit trails. Recommended to keep encryption enabled for security and compliance.',
    'LIST',
    true,
    '"AES256"',
    '{"allowedValues": [
        {"value": "AES256", "label": "AES256 (S3-Managed Keys)"},
        {"value": "aws:kms", "label": "AWS KMS (Customer-Managed Keys)"}
    ]}',
    30,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- publicAccessBlock property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000004',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'publicAccessBlock',
    'Block Public Access',
    'Block all public access to the bucket. When enabled, this setting prevents any public access to bucket objects through bucket policies, access control lists (ACLs), or any other means. Recommended to keep enabled for security unless you specifically need public access to your bucket contents.',
    'BOOLEAN',
    false,
    'true',
    '{}',
    40,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- lifecycleDays property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000005',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'lifecycleDays',
    'Lifecycle Transition Days',
    'Number of days before transitioning objects to a different storage class or deleting them. This allows automatic cost optimization by moving older objects to cheaper storage tiers. Valid range is 1-3650 days (approximately 10 years). Leave empty to disable lifecycle transitions.',
    'NUMBER',
    false,
    NULL,
    '{"min": 1, "max": 3650}',
    50,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- objectLockEnabled property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '01010000-0000-0000-0000-000000000006',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f01',  -- Storage + AWS mapping
    'objectLockEnabled',
    'Object Lock Enabled',
    'Enable object lock to prevent object deletion or modification for compliance requirements. Object Lock provides Write-Once-Read-Many (WORM) protection, ensuring that objects cannot be deleted or overwritten for a fixed amount of time or indefinitely. This is useful for regulatory compliance and data retention policies. Note that Object Lock can only be enabled when creating a new bucket.',
    'BOOLEAN',
    false,
    'false',
    '{}',
    60,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- ============================================================================
-- AWS Relational Database Server (RDS) Property Schemas
-- ============================================================================
-- This section defines property schemas for AWS RDS database instances.
-- Properties include database engine, version, instance class, storage,
-- multi-AZ deployment, backup retention, encryption, and accessibility.
--
-- Mapping ID: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02' (RDS + AWS)
-- ============================================================================

-- engine property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000001',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'engine',
    'Database Engine',
    'The database engine to use for the RDS instance. Choose from MySQL, PostgreSQL, MariaDB, Oracle Enterprise Edition, Oracle Standard Edition 2, SQL Server Express, SQL Server Web, SQL Server Standard, or SQL Server Enterprise. Each engine has different features, licensing, and pricing models.',
    'LIST',
    true,
    '"postgres"',
    '{"allowedValues": [
        {"value": "mysql", "label": "MySQL"},
        {"value": "postgres", "label": "PostgreSQL"},
        {"value": "mariadb", "label": "MariaDB"},
        {"value": "oracle-ee", "label": "Oracle Enterprise Edition"},
        {"value": "oracle-se2", "label": "Oracle Standard Edition 2"},
        {"value": "sqlserver-ex", "label": "SQL Server Express"},
        {"value": "sqlserver-web", "label": "SQL Server Web"},
        {"value": "sqlserver-se", "label": "SQL Server Standard"},
        {"value": "sqlserver-ee", "label": "SQL Server Enterprise"}
    ]}',
    10,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- engineVersion property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000002',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'engineVersion',
    'Engine Version',
    'The version of the database engine to use (e.g., 14.7 for PostgreSQL, 8.0.32 for MySQL, 15.3 for MariaDB). The available versions depend on the selected database engine. Specify the exact version number to ensure consistency across environments. Check AWS RDS documentation for the latest supported versions for your chosen engine.',
    'STRING',
    true,
    NULL,
    '{}',
    20,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- instanceClass property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000003',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'instanceClass',
    'Instance Class',
    'The compute and memory capacity for the RDS instance. T3 instances (db.t3.*) are burstable performance instances suitable for development and low-traffic workloads. M5 instances (db.m5.*) are general-purpose instances balanced for compute, memory, and networking. R5 instances (db.r5.*) are memory-optimized for memory-intensive database workloads. Choose based on your performance and cost requirements.',
    'LIST',
    true,
    '"db.t3.small"',
    '{"allowedValues": [
        {"value": "db.t3.micro", "label": "db.t3.micro (2 vCPU, 1 GB RAM)"},
        {"value": "db.t3.small", "label": "db.t3.small (2 vCPU, 2 GB RAM)"},
        {"value": "db.t3.medium", "label": "db.t3.medium (2 vCPU, 4 GB RAM)"},
        {"value": "db.t3.large", "label": "db.t3.large (2 vCPU, 8 GB RAM)"},
        {"value": "db.m5.large", "label": "db.m5.large (2 vCPU, 8 GB RAM)"},
        {"value": "db.m5.xlarge", "label": "db.m5.xlarge (4 vCPU, 16 GB RAM)"},
        {"value": "db.m5.2xlarge", "label": "db.m5.2xlarge (8 vCPU, 32 GB RAM)"},
        {"value": "db.r5.large", "label": "db.r5.large (2 vCPU, 16 GB RAM)"},
        {"value": "db.r5.xlarge", "label": "db.r5.xlarge (4 vCPU, 32 GB RAM)"}
    ]}',
    30,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- allocatedStorage property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000004',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'allocatedStorage',
    'Allocated Storage (GB)',
    'The amount of storage to allocate for the database in gigabytes. The minimum is 20 GB and the maximum is 65536 GB (64 TB). The actual minimum and maximum values may vary depending on the database engine and instance class. Storage can be increased later, but cannot be decreased. Consider your data growth requirements when setting this value.',
    'NUMBER',
    true,
    '20',
    '{"min": 20, "max": 65536}',
    40,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- multiAZ property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000005',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'multiAZ',
    'Multi-AZ Deployment',
    'Deploy a standby instance in a different availability zone for high availability and automatic failover. When enabled, AWS RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone. In the event of a planned or unplanned outage of your primary DB instance, RDS automatically fails over to the standby so that database operations can resume quickly without administrative intervention. Multi-AZ deployments provide enhanced durability and availability but cost approximately twice as much as single-AZ deployments.',
    'BOOLEAN',
    false,
    'false',
    '{}',
    50,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- backupRetentionPeriod property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000006',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'backupRetentionPeriod',
    'Backup Retention (Days)',
    'Number of days to retain automated backups. Valid range is 0-35 days. Setting this to 0 disables automated backups. AWS RDS automatically creates daily backups of your database during the backup window and retains them for the specified retention period. Backups are stored in Amazon S3 and are used for point-in-time recovery. A retention period of 7 days is recommended for production databases to balance recovery capabilities with storage costs.',
    'NUMBER',
    false,
    '7',
    '{"min": 0, "max": 35}',
    60,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- storageEncrypted property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000007',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'storageEncrypted',
    'Storage Encryption',
    'Encrypt the database storage at rest using AWS-managed encryption keys. When enabled, RDS encrypts the DB instance, automated backups, read replicas, and snapshots using AWS Key Management Service (KMS). Encryption cannot be removed once enabled. Recommended for production databases to meet security and compliance requirements. Note that encrypting an existing unencrypted DB instance requires creating a new encrypted instance and migrating the data.',
    'BOOLEAN',
    false,
    'true',
    '{}',
    70,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- publiclyAccessible property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '02010000-0000-0000-0000-000000000008',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f02',  -- Relational Database Server + AWS mapping
    'publiclyAccessible',
    'Publicly Accessible',
    'Allow connections to the database from the internet. When enabled, the database instance will be assigned a public IP address and can be accessed from outside the VPC. Keep this disabled (false) for security unless you specifically need to connect to the database from the internet. For production databases, it is strongly recommended to keep this disabled and access the database through a VPN, bastion host, or from within the VPC. Enabling public access increases the attack surface and security risks.',
    'BOOLEAN',
    false,
    'false',
    '{}',
    80,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- ============================================================================
-- AWS Managed Container Orchestrator (ECS Cluster) Property Schemas
-- ============================================================================
-- This section defines property schemas for AWS ECS cluster configuration.
-- Properties include capacity provider, instance type, cluster sizing,
-- and monitoring configuration. These are cluster-level infrastructure
-- properties only. Task definitions and services are configured at the
-- stack level, not the blueprint level.
--
-- Mapping ID: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03' (ECS Cluster + AWS)
-- ============================================================================

-- capacityProvider property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '04010000-0000-0000-0000-000000000001',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',  -- Managed Container Orchestrator + AWS mapping
    'capacityProvider',
    'Capacity Provider',
    'The capacity provider determines how the ECS cluster provisions compute resources. FARGATE is serverless and AWS manages all infrastructure. FARGATE_SPOT uses spare AWS capacity at reduced cost but tasks may be interrupted. EC2 gives you control over instance types and cluster scaling but requires managing the infrastructure. FARGATE is recommended for most use cases.',
    'LIST',
    true,
    '"FARGATE"',
    '{"allowedValues": [
        {"value": "FARGATE", "label": "Fargate"},
        {"value": "FARGATE_SPOT", "label": "Fargate Spot"},
        {"value": "EC2", "label": "EC2"}
    ]}',
    10,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- instanceType property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '04010000-0000-0000-0000-000000000002',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',  -- Managed Container Orchestrator + AWS mapping
    'instanceType',
    'EC2 Instance Type',
    'The EC2 instance type for the ECS cluster nodes. Only applies when capacity provider is EC2. t3 instances are burstable and cost-effective for variable workloads, m5 are general purpose for consistent workloads, c5 are compute-optimized for CPU-intensive applications. Ignored when using FARGATE or FARGATE_SPOT.',
    'LIST',
    false,
    '"t3.medium"',
    '{"allowedValues": [
        {"value": "t3.small", "label": "t3.small"},
        {"value": "t3.medium", "label": "t3.medium"},
        {"value": "t3.large", "label": "t3.large"},
        {"value": "t3.xlarge", "label": "t3.xlarge"},
        {"value": "m5.large", "label": "m5.large"},
        {"value": "m5.xlarge", "label": "m5.xlarge"},
        {"value": "m5.2xlarge", "label": "m5.2xlarge"},
        {"value": "c5.large", "label": "c5.large"},
        {"value": "c5.xlarge", "label": "c5.xlarge"},
        {"value": "c5.2xlarge", "label": "c5.2xlarge"}
    ]}',
    20,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- minClusterSize property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '04010000-0000-0000-0000-000000000003',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',  -- Managed Container Orchestrator + AWS mapping
    'minClusterSize',
    'Minimum Cluster Size',
    'The minimum number of EC2 instances to maintain in the cluster. The cluster will not scale below this number even under low load. Setting this to 0 allows the cluster to scale down completely when idle, reducing costs. Only applies when capacity provider is EC2.',
    'NUMBER',
    false,
    '1',
    '{"min": 0, "max": 100}',
    30,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- maxClusterSize property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '04010000-0000-0000-0000-000000000004',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',  -- Managed Container Orchestrator + AWS mapping
    'maxClusterSize',
    'Maximum Cluster Size',
    'The maximum number of EC2 instances allowed in the cluster. The cluster will not scale above this number even under high load. This setting controls cost and resource limits. Must be greater than or equal to minimum cluster size. Only applies when capacity provider is EC2.',
    'NUMBER',
    false,
    '10',
    '{"min": 1, "max": 100}',
    40,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- enableContainerInsights property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '04010000-0000-0000-0000-000000000005',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03',  -- Managed Container Orchestrator + AWS mapping
    'enableContainerInsights',
    'Enable Container Insights',
    'Enable CloudWatch Container Insights to collect, aggregate, and summarize metrics and logs from your containerized applications. Provides cluster-level, task-level, and service-level metrics including CPU, memory, disk, and network utilization. Additional CloudWatch charges apply.',
    'BOOLEAN',
    false,
    'true',
    '{}',
    50,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- ============================================================================
-- AWS Service Bus (SNS/SQS/EventBridge) Property Schemas
-- ============================================================================
-- This section defines property schemas for AWS messaging services.
-- Properties include service type selection, message retention, visibility
-- timeout, FIFO queue configuration, deduplication, and message sizing.
--
-- Mapping ID: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04' (Service Bus + AWS)
-- ============================================================================

-- serviceType property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000001',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'serviceType',
    'Service Type',
    'The type of AWS messaging service to use. SNS (Simple Notification Service) is a pub/sub messaging service for distributing messages to multiple subscribers. SQS (Simple Queue Service) is a message queuing service for decoupling and scaling microservices, distributed systems, and serverless applications. EventBridge is a serverless event bus service for building event-driven applications at scale with events from AWS services, SaaS applications, and custom applications. Choose based on your messaging pattern requirements: SNS for fan-out messaging, SQS for reliable queuing, or EventBridge for complex event routing.',
    'LIST',
    true,
    '"SQS"',
    '{"allowedValues": [
        {"value": "SNS", "label": "SNS (Simple Notification Service)"},
        {"value": "SQS", "label": "SQS (Simple Queue Service)"},
        {"value": "EventBridge", "label": "EventBridge (Event Bus)"}
    ]}',
    10,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- messageRetentionPeriod property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000002',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'messageRetentionPeriod',
    'Message Retention (Seconds)',
    'How long messages are retained in the queue in seconds. For SQS, this determines how long a message remains in the queue before being automatically deleted if not consumed. The default is 345600 seconds (4 days). Valid range is 60 seconds (1 minute) to 1209600 seconds (14 days). Longer retention periods provide more time for consumers to process messages but may increase storage costs. Consider your message processing patterns and recovery time requirements when setting this value.',
    'NUMBER',
    false,
    '345600',
    '{"min": 60, "max": 1209600}',
    20,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- visibilityTimeout property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000003',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'visibilityTimeout',
    'Visibility Timeout (Seconds)',
    'How long a message is invisible to other consumers after being received by a consumer in seconds. For SQS, when a consumer retrieves a message, it becomes temporarily invisible to other consumers for the duration of the visibility timeout. If the consumer successfully processes and deletes the message before the timeout expires, the message is removed from the queue. If the timeout expires before the message is deleted, it becomes visible again and can be received by another consumer. The default is 30 seconds. Valid range is 0 seconds to 43200 seconds (12 hours). Set this value based on how long your consumers typically need to process messages. If set too low, messages may be processed multiple times; if set too high, failed processing attempts will delay retry attempts.',
    'NUMBER',
    false,
    '30',
    '{"min": 0, "max": 43200}',
    30,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- fifoQueue property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000004',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'fifoQueue',
    'FIFO Queue',
    'Create a FIFO (First-In-First-Out) queue for ordered message processing. FIFO queues guarantee that messages are processed exactly once and in the exact order they are sent. This is useful for applications where the order of operations and events is critical, such as financial transactions, inventory management, or sequential workflow processing. FIFO queues have a lower throughput limit (300 transactions per second with batching, 3000 with high throughput mode) compared to standard queues. FIFO queues also support message deduplication to prevent duplicate messages. Note that FIFO queue names must end with the .fifo suffix.',
    'BOOLEAN',
    false,
    'false',
    '{}',
    40,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- contentBasedDeduplication property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000005',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'contentBasedDeduplication',
    'Content-Based Deduplication',
    'Enable automatic deduplication based on message content for FIFO queues. When enabled, SQS uses a SHA-256 hash of the message body to generate the deduplication ID automatically. This eliminates the need to provide a deduplication ID with each message. Content-based deduplication is only available for FIFO queues and helps prevent duplicate messages from being processed when the same message content is sent multiple times within the 5-minute deduplication interval. This is useful when you cannot guarantee that your message producers will send unique deduplication IDs, or when the message content itself is sufficient to identify duplicates.',
    'BOOLEAN',
    false,
    'false',
    '{}',
    50,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;

-- maxMessageSize property
INSERT INTO property_schemas (id, mapping_id, property_name, display_name, description, data_type, required, default_value, validation_rules, display_order, created_at, updated_at)
VALUES (
    '05010000-0000-0000-0000-000000000006',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f04',  -- Service Bus + AWS mapping
    'maxMessageSize',
    'Max Message Size (Bytes)',
    'Maximum message size in bytes for SQS messages. This setting controls the largest message that can be sent to the queue. The default is 262144 bytes (256 KB), which is the maximum allowed by SQS. Valid range is 1024 bytes (1 KB) to 262144 bytes (256 KB). For messages larger than 256 KB, consider using the Amazon SQS Extended Client Library for Java, which stores large message payloads in Amazon S3 and sends a reference to the S3 object in the SQS message. Setting an appropriate maximum helps prevent oversized messages from being sent and ensures consistent message processing.',
    'NUMBER',
    false,
    '262144',
    '{"min": 1024, "max": 262144}',
    60,
    NOW(),
    NOW()
)
ON CONFLICT (mapping_id, property_name) DO NOTHING;
