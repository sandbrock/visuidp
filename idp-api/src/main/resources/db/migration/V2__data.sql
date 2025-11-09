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
