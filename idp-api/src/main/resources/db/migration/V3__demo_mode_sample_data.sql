-- ============================================================================
-- Demo Mode Sample Data Migration
-- ============================================================================
-- This migration creates sample data for demo mode to allow hackathon judges
-- to explore the application without authentication or actual deployments.
--
-- Contents:
-- 1. Sample teams
-- 2. Sample blueprints with cloud provider associations
-- 3. Sample blueprint resources
-- 4. Sample stacks across AWS, Azure, and GCP
-- 5. Sample stack resources
--
-- All data uses fixed UUIDs for consistency and idempotency.
-- ============================================================================

-- ============================================================================
-- 1. Sample Teams
-- ============================================================================

INSERT INTO teams (id, name, description, is_active, created_at, updated_at)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Platform Engineering', 'Core platform and infrastructure team', true, NOW(), NOW()),
    ('d0000000-0000-0000-0000-000000000002', 'Product Development', 'Product development and feature teams', true, NOW(), NOW()),
    ('d0000000-0000-0000-0000-000000000003', 'Data Analytics', 'Data engineering and analytics team', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Sample Blueprints
-- ============================================================================

INSERT INTO blueprints (id, name, description, is_active, created_at, updated_at)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Microservice with Database', 'Standard microservice pattern with containerized application and managed database', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000002', 'Serverless API', 'Serverless REST API with managed database and event processing', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000003', 'Static Website', 'Static website hosting with CDN and object storage', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000004', 'Event-Driven Service', 'Event-driven architecture with message queues and processing', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000005', 'Data Pipeline', 'Data processing pipeline with storage and analytics', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000006', 'Container Cluster', 'Managed Kubernetes cluster for containerized workloads', true, NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000007', 'Web Application', 'Full-stack web application with database and storage', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Blueprint Cloud Provider Associations
-- ============================================================================

-- Microservice with Database - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000001', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000001', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Serverless API - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000002', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000002', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000002', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Static Website - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000003', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000003', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000003', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Event-Driven Service - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000004', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000004', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000004', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Data Pipeline - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000005', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000005', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000005', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Container Cluster - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000006', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000006', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000006', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- Web Application - supports all clouds
INSERT INTO blueprint_cloud_providers (blueprint_id, cloud_provider_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000007', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01'),  -- AWS
    ('b0000000-0000-0000-0000-000000000007', '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02'),  -- Azure
    ('b0000000-0000-0000-0000-000000000007', '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03')   -- GCP
ON CONFLICT (blueprint_id, cloud_provider_id) DO NOTHING;

-- ============================================================================
-- 4. Blueprint Resources (Shared Infrastructure)
-- ============================================================================

-- Microservice with Database Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Primary Database', 'PostgreSQL database for microservices', 'b2e5f6a7-8c9d-4b3e-8d02-1234567890a2', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01', 
     '{"engine": "postgres", "engineVersion": "14.7", "instanceClass": "db.t3.small", "allocatedStorage": 20, "multiAZ": false, "backupRetentionPeriod": 7, "storageEncrypted": true, "publiclyAccessible": false}'::jsonb, 
     true, NOW(), NOW()),
    ('br000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Container Cluster', 'ECS cluster for microservices', 'a1f4e5c6-7d8b-4a2f-9c01-1234567890a1', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"capacityProvider": "FARGATE", "enableContainerInsights": true}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Serverless API Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'API Storage', 'S3 bucket for API assets', 'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"storageClass": "STANDARD", "versioning": "Enabled", "encryption": "AES256", "publicAccessBlock": true}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Static Website Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Website Storage', 'S3 bucket for static website', 'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"storageClass": "STANDARD", "versioning": "Enabled", "encryption": "AES256", "publicAccessBlock": false}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Event-Driven Service Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'Message Queue', 'SQS queue for event processing', 'c3f6a7b8-9d0e-4c4d-7e03-1234567890a3', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"serviceType": "SQS", "messageRetentionPeriod": 345600, "visibilityTimeout": 30, "fifoQueue": false}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Data Pipeline Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', 'Data Lake Storage', 'S3 bucket for data lake', 'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"storageClass": "INTELLIGENT_TIERING", "versioning": "Enabled", "encryption": "aws:kms", "publicAccessBlock": true, "lifecycleDays": 90}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Container Cluster Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 'Kubernetes Cluster', 'ECS cluster for containers', 'a1f4e5c6-7d8b-4a2f-9c01-1234567890a1', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"capacityProvider": "FARGATE", "enableContainerInsights": true}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Web Application Blueprint Resources
INSERT INTO blueprint_resources (id, blueprint_id, name, description, resource_type_id, cloud_provider_id, configuration, is_active, created_at, updated_at)
VALUES 
    ('br000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000007', 'Application Database', 'PostgreSQL for web app', 'b2e5f6a7-8c9d-4b3e-8d02-1234567890a2', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"engine": "postgres", "engineVersion": "14.7", "instanceClass": "db.t3.medium", "allocatedStorage": 50, "multiAZ": true, "backupRetentionPeriod": 14, "storageEncrypted": true, "publiclyAccessible": false}'::jsonb,
     true, NOW(), NOW()),
    ('br000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000007', 'Asset Storage', 'S3 bucket for web assets', 'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa', '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',
     '{"storageClass": "STANDARD", "versioning": "Enabled", "encryption": "AES256", "publicAccessBlock": false}'::jsonb,
     true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Sample Stacks
-- ============================================================================

-- AWS Stack 1: User Service (Microservice with Database)
INSERT INTO stacks (id, name, description, cloud_name, route_path, repository_url, stack_type, programming_language, is_public, created_by, team_id, blueprint_id, configuration, created_at, updated_at)
VALUES 
    ('s0000000-0000-0000-0000-000000000001', 
     'User Service', 
     'RESTful API for user management with PostgreSQL database on AWS ECS',
     'demo-user-service-aws',
     '/user-svc/',
     'https://github.com/demo/user-service',
     'RESTFUL_API',
     'JAVA',
     false,
     'demo@visuidp.example',
     'd0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001',
     '{"cpu": "512", "memory": "1024", "desiredCount": 2, "containerPort": 8080, "healthCheckPath": "/health"}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Azure Stack 2: Payment API (Serverless)
INSERT INTO stacks (id, name, description, cloud_name, route_path, repository_url, stack_type, programming_language, is_public, created_by, team_id, blueprint_id, configuration, created_at, updated_at)
VALUES 
    ('s0000000-0000-0000-0000-000000000002',
     'Payment API',
     'Serverless payment processing API on Azure Functions with Cosmos DB',
     'demo-payment-api-azure',
     '/payment/',
     'https://github.com/demo/payment-api',
     'RESTFUL_API',
     'TYPESCRIPT',
     false,
     'demo@visuidp.example',
     'd0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000002',
     '{"runtime": "node18", "timeout": 60, "memorySize": 512, "apiPath": "/api/payments"}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- GCP Stack 3: Marketing Website (Static Website)
INSERT INTO stacks (id, name, description, cloud_name, route_path, repository_url, stack_type, programming_language, is_public, created_by, team_id, blueprint_id, configuration, created_at, updated_at)
VALUES 
    ('s0000000-0000-0000-0000-000000000003',
     'Marketing Website',
     'Static marketing website hosted on GCP Cloud Storage with CDN',
     'demo-marketing-site-gcp',
     '/marketing/',
     'https://github.com/demo/marketing-site',
     'WEB_APPLICATION',
     'TYPESCRIPT',
     true,
     'demo@visuidp.example',
     'd0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000003',
     '{"framework": "react", "buildCommand": "npm run build", "outputDir": "dist", "cdnEnabled": true}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- AWS Stack 4: Order Processing (Event-Driven)
INSERT INTO stacks (id, name, description, cloud_name, route_path, repository_url, stack_type, programming_language, is_public, created_by, team_id, blueprint_id, configuration, created_at, updated_at)
VALUES 
    ('s0000000-0000-0000-0000-000000000004',
     'Order Processing',
     'Event-driven order processing service using AWS Lambda and SQS',
     'demo-order-proc-aws',
     '/orders/',
     'https://github.com/demo/order-processing',
     'EVENT_DRIVEN',
     'PYTHON',
     false,
     'demo@visuidp.example',
     'd0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000004',
     '{"runtime": "python3.11", "timeout": 300, "batchSize": 10, "maxConcurrency": 5}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Azure Stack 5: Analytics Pipeline (Data Pipeline)
INSERT INTO stacks (id, name, description, cloud_name, route_path, repository_url, stack_type, programming_language, is_public, created_by, team_id, blueprint_id, configuration, created_at, updated_at)
VALUES 
    ('s0000000-0000-0000-0000-000000000005',
     'Analytics Pipeline',
     'Data analytics pipeline on Azure with Data Lake and Databricks',
     'demo-analytics-azure',
     '/analytics/',
     'https://github.com/demo/analytics-pipeline',
     'INFRASTRUCTURE_ONLY',
     NULL,
     false,
     'demo@visuidp.example',
     'd0000000-0000-0000-0000-000000000003',
     'b0000000-0000-0000-0000-000000000005',
     '{"dataFormat": "parquet", "partitionBy": "date", "retentionDays": 365, "compressionType": "snappy"}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. Sample Stack Resources (Non-Shared Infrastructure)
-- ============================================================================

-- User Service Stack Resources (AWS)
INSERT INTO stack_resources (id, name, description, stack_id, resource_type_id, cloud_provider_id, configuration, created_at, updated_at)
VALUES 
    ('sr000000-0000-0000-0000-000000000001',
     'User Cache',
     'Redis cache for user session data',
     's0000000-0000-0000-0000-000000000001',
     'd4f7b8c9-0e1f-5d6e-9f04-1234567890a4',  -- Cache resource type
     '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS
     '{"engine": "redis", "nodeType": "cache.t3.micro", "numCacheNodes": 1, "engineVersion": "7.0"}'::jsonb,
     NOW(), NOW()),
    ('sr000000-0000-0000-0000-000000000002',
     'User Database',
     'PostgreSQL database for user data',
     's0000000-0000-0000-0000-000000000001',
     '2121c807-7d81-4edd-99ea-36010c63bf27',  -- Relational Database resource type
     '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS
     '{"engine": "postgres", "instanceClass": "db.t3.micro", "allocatedStorage": 20, "databaseName": "userdb"}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Payment API Stack Resources (Azure)
INSERT INTO stack_resources (id, name, description, stack_id, resource_type_id, cloud_provider_id, configuration, created_at, updated_at)
VALUES 
    ('sr000000-0000-0000-0000-000000000003',
     'Payment Database',
     'Cosmos DB for payment transactions',
     's0000000-0000-0000-0000-000000000002',
     '9dac0bed-3804-418f-a22d-7946a5cf1885',  -- NoSQL Database resource type
     '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02',  -- Azure
     '{"accountType": "Standard", "consistencyLevel": "Session", "throughput": 400}'::jsonb,
     NOW(), NOW()),
    ('sr000000-0000-0000-0000-000000000004',
     'Payment Queue',
     'Service Bus queue for payment events',
     's0000000-0000-0000-0000-000000000002',
     '8ae6e952-f9cb-448f-be8e-8a439f2ae306',  -- Queue resource type
     '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02',  -- Azure
     '{"maxDeliveryCount": 10, "lockDuration": "PT5M", "requiresDuplicateDetection": true}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Marketing Website Stack Resources (GCP)
INSERT INTO stack_resources (id, name, description, stack_id, resource_type_id, cloud_provider_id, configuration, created_at, updated_at)
VALUES 
    ('sr000000-0000-0000-0000-000000000005',
     'Website Assets',
     'Cloud Storage bucket for website files',
     's0000000-0000-0000-0000-000000000003',
     'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa',  -- Storage resource type (BOTH category)
     '9c8b7a6d-5e4f-3a2b-1c0d-9e8f7a6b5c03',  -- GCP
     '{"storageClass": "STANDARD", "location": "US", "publicAccess": true, "website": {"mainPageSuffix": "index.html"}}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Order Processing Stack Resources (AWS)
INSERT INTO stack_resources (id, name, description, stack_id, resource_type_id, cloud_provider_id, configuration, created_at, updated_at)
VALUES 
    ('sr000000-0000-0000-0000-000000000006',
     'Order Queue',
     'SQS queue for order events',
     's0000000-0000-0000-0000-000000000004',
     '8ae6e952-f9cb-448f-be8e-8a439f2ae306',  -- Queue resource type
     '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS
     '{"visibilityTimeout": 300, "messageRetentionPeriod": 1209600, "receiveMessageWaitTime": 20}'::jsonb,
     NOW(), NOW()),
    ('sr000000-0000-0000-0000-000000000007',
     'Order Database',
     'DynamoDB table for order state',
     's0000000-0000-0000-0000-000000000004',
     '9dac0bed-3804-418f-a22d-7946a5cf1885',  -- NoSQL Database resource type
     '8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01',  -- AWS
     '{"billingMode": "PAY_PER_REQUEST", "pointInTimeRecovery": true, "streamEnabled": true}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Analytics Pipeline Stack Resources (Azure)
INSERT INTO stack_resources (id, name, description, stack_id, resource_type_id, cloud_provider_id, configuration, created_at, updated_at)
VALUES 
    ('sr000000-0000-0000-0000-000000000008',
     'Raw Data Storage',
     'Blob storage for raw analytics data',
     's0000000-0000-0000-0000-000000000005',
     'aaa5ec27-6cc5-4329-953a-e7ec17f4d5aa',  -- Storage resource type (BOTH category)
     '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02',  -- Azure
     '{"accountTier": "Standard", "replicationType": "LRS", "accessTier": "Hot", "hierarchicalNamespace": true}'::jsonb,
     NOW(), NOW()),
    ('sr000000-0000-0000-0000-000000000009',
     'Analytics Database',
     'SQL Database for processed analytics',
     's0000000-0000-0000-0000-000000000005',
     '2121c807-7d81-4edd-99ea-36010c63bf27',  -- Relational Database resource type
     '3b2c1d4e-5f6a-7b8c-9d0e-1f2a3b4c5d02',  -- Azure
     '{"edition": "Standard", "serviceObjective": "S2", "maxSizeBytes": 268435456000}'::jsonb,
     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

