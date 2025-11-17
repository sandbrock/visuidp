-- Flyway migration: Complete initial schema with cloud support
-- PostgreSQL DDL generated based on JPA entities with cloud-agnostic blueprint design

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS stack_collections (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- ============================================================================
-- Admin Resource Configuration Tables (must be created before blueprints/environments)
-- ============================================================================

-- Cloud Providers table (enhanced cloud provider management)
CREATE TABLE IF NOT EXISTS cloud_providers (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Unified Resource Types table (replaces stack_resource_types and blueprint_resource_types)
CREATE TABLE IF NOT EXISTS resource_types (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('SHARED', 'NON_SHARED', 'BOTH')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Blueprints: catalog of reusable infrastructure blueprint configurations
CREATE TABLE IF NOT EXISTS blueprints (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Blueprint Resources: instances of shared resources with flexible configuration and cloud-specific properties
CREATE TABLE IF NOT EXISTS blueprint_resources (
    id UUID PRIMARY KEY,
    blueprint_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    resource_type_id UUID NOT NULL,
    configuration JSONB NOT NULL,
    cloud_type VARCHAR(50),
    cloud_specific_properties JSONB DEFAULT '{}',
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_blueprint_resources_blueprint FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE,
    CONSTRAINT fk_blueprint_resources_resource_type FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    domain_id UUID NOT NULL,
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_categories_domain FOREIGN KEY (domain_id) REFERENCES domains(id)
);
-- enforce uniqueness of category name per domain
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_name_domain ON categories(name, domain_id);

CREATE TABLE IF NOT EXISTS stacks (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    cloud_name VARCHAR(60) NOT NULL UNIQUE,
    route_path VARCHAR(22) NOT NULL UNIQUE,
    repository_url VARCHAR(2048),
    stack_type VARCHAR NOT NULL,
    programming_language VARCHAR,
    is_public BOOLEAN,
    created_by VARCHAR(100) NOT NULL,
    team_id UUID,
    stack_collection_id UUID,
    blueprint_id UUID,
    blueprint_resource_id UUID,
    configuration JSONB,
    ephemeral_prefix VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT route_path_validation CHECK (LENGTH(route_path) >= 5 AND LENGTH(route_path) <= 22 AND route_path ~ '^/[a-zA-Z][a-zA-Z0-9_-]*/$' AND route_path NOT LIKE '%\_%\_%' ESCAPE '\' AND route_path NOT LIKE '%--%'),
    CONSTRAINT fk_stacks_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_stacks_collection FOREIGN KEY (stack_collection_id) REFERENCES stack_collections(id),
    CONSTRAINT fk_stacks_blueprint FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
    CONSTRAINT fk_stacks_blueprint_resource FOREIGN KEY (blueprint_resource_id) REFERENCES blueprint_resources(id)
);

CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    cloud_provider_id UUID NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    blueprint_id UUID,
    CONSTRAINT fk_environments_cloud_provider FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id),
    CONSTRAINT fk_environments_blueprint FOREIGN KEY (blueprint_id) REFERENCES blueprints(id)
);

CREATE TABLE IF NOT EXISTS stack_configs (
    id UUID PRIMARY KEY,
    environment_id UUID NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    configuration JSONB,
    is_active BOOLEAN,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_stack_configs_environment FOREIGN KEY (environment_id) REFERENCES environments(id)
);

CREATE TABLE IF NOT EXISTS stack_resources (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    configuration JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    stack_id UUID NOT NULL,
    CONSTRAINT fk_stack_resources_stack FOREIGN KEY (stack_id) REFERENCES stacks(id)
);

-- ============================================================================
-- Additional Admin Resource Configuration Tables
-- ============================================================================

-- Resource Type Cloud Mappings table (defines which resource types are available on which clouds)
CREATE TABLE IF NOT EXISTS resource_type_cloud_mappings (
    id UUID PRIMARY KEY,
    resource_type_id UUID NOT NULL,
    cloud_provider_id UUID NOT NULL,
    terraform_module_location VARCHAR(2048) NOT NULL,
    module_location_type VARCHAR(20) NOT NULL CHECK (module_location_type IN ('GIT', 'FILE_SYSTEM', 'REGISTRY')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_mappings_resource_type FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE CASCADE,
    CONSTRAINT fk_mappings_cloud_provider FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id) ON DELETE CASCADE,
    CONSTRAINT uq_resource_type_cloud_provider UNIQUE (resource_type_id, cloud_provider_id)
);

-- Property Schemas table (defines configurable properties for each resource type + cloud combination)
CREATE TABLE IF NOT EXISTS property_schemas (
    id UUID PRIMARY KEY,
    mapping_id UUID NOT NULL,
    property_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'LIST')),
    required BOOLEAN NOT NULL DEFAULT false,
    default_value JSONB,
    validation_rules JSONB,
    display_order INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_property_schemas_mapping FOREIGN KEY (mapping_id) REFERENCES resource_type_cloud_mappings(id) ON DELETE CASCADE,
    CONSTRAINT uq_property_name_per_mapping UNIQUE (mapping_id, property_name)
);

-- Admin Audit Logs table (tracks all administrative configuration changes)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB,
    timestamp TIMESTAMP NOT NULL
);

-- Blueprint Cloud Providers junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS blueprint_cloud_providers (
    blueprint_id UUID NOT NULL,
    cloud_provider_id UUID NOT NULL,
    PRIMARY KEY (blueprint_id, cloud_provider_id),
    CONSTRAINT fk_blueprint_cloud_providers_blueprint 
        FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE,
    CONSTRAINT fk_blueprint_cloud_providers_cloud_provider 
        FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id) ON DELETE CASCADE
);

-- Add resource_type_id and cloud_provider_id to stack_resources table
ALTER TABLE stack_resources ADD COLUMN IF NOT EXISTS resource_type_id UUID;
ALTER TABLE stack_resources ADD COLUMN IF NOT EXISTS cloud_provider_id UUID;
ALTER TABLE stack_resources ADD CONSTRAINT fk_stack_resources_resource_type 
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id);
ALTER TABLE stack_resources ADD CONSTRAINT fk_stack_resources_cloud_provider 
    FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id);

-- Add cloud_provider_id to blueprint_resources table
ALTER TABLE blueprint_resources ADD COLUMN IF NOT EXISTS cloud_provider_id UUID;
ALTER TABLE blueprint_resources ADD CONSTRAINT fk_blueprint_resources_cloud_provider 
    FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stack_resources_stack_id ON stack_resources(stack_id);
CREATE INDEX IF NOT EXISTS idx_stacks_team_id ON stacks(team_id);
CREATE INDEX IF NOT EXISTS idx_stacks_collection_id ON stacks(stack_collection_id);
CREATE INDEX IF NOT EXISTS idx_stacks_blueprint_id ON stacks(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_stacks_blueprint_resource_id ON stacks(blueprint_resource_id);
CREATE INDEX IF NOT EXISTS idx_environments_cloud_provider_id ON environments(cloud_provider_id);
CREATE INDEX IF NOT EXISTS idx_environments_blueprint_id ON environments(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_stack_configs_environment_id ON stack_configs(environment_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_resources_blueprint_id ON blueprint_resources(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_resources_resource_type_id ON blueprint_resources(resource_type_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_resources_cloud_type ON blueprint_resources(cloud_type);

-- Indexes for resource_type_cloud_mappings
CREATE INDEX IF NOT EXISTS idx_mappings_resource_type ON resource_type_cloud_mappings(resource_type_id);
CREATE INDEX IF NOT EXISTS idx_mappings_cloud_provider ON resource_type_cloud_mappings(cloud_provider_id);
CREATE INDEX IF NOT EXISTS idx_mappings_enabled ON resource_type_cloud_mappings(enabled);

-- Indexes for property_schemas
CREATE INDEX IF NOT EXISTS idx_property_schemas_mapping ON property_schemas(mapping_id);
CREATE INDEX IF NOT EXISTS idx_property_schemas_display_order ON property_schemas(mapping_id, display_order);

-- Indexes for admin_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON admin_audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON admin_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);

-- Indexes for new foreign keys on existing tables
CREATE INDEX IF NOT EXISTS idx_stack_resources_resource_type ON stack_resources(resource_type_id);
CREATE INDEX IF NOT EXISTS idx_stack_resources_cloud_provider ON stack_resources(cloud_provider_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_resources_cloud_provider ON blueprint_resources(cloud_provider_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_cloud_providers_blueprint ON blueprint_cloud_providers(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_cloud_providers_cloud_provider ON blueprint_cloud_providers(cloud_provider_id);

-- ============================================================================
-- Table comments
-- ============================================================================

COMMENT ON TABLE stacks IS 'Stacks represent logical services or applications. Cloud provider is determined at environment level for true cloud-agnostic deployment. Each stack can be deployed to multiple cloud providers through different environments.';

-- Indexes for resource_types
CREATE INDEX IF NOT EXISTS idx_resource_types_category ON resource_types(category);
CREATE INDEX IF NOT EXISTS idx_resource_types_enabled ON resource_types(enabled);

-- Indexes for cloud_providers
CREATE INDEX IF NOT EXISTS idx_cloud_providers_enabled ON cloud_providers(enabled);

-- ============================================================================
-- API Keys Table
-- ============================================================================

-- API Keys table for programmatic authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    key_type VARCHAR(20) NOT NULL CHECK (key_type IN ('USER', 'SYSTEM')),
    user_email VARCHAR(255),
    created_by_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by_email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    rotated_from_id UUID,
    grace_period_ends_at TIMESTAMP,
    
    CONSTRAINT chk_user_key_has_email CHECK (
        (key_type = 'USER' AND user_email IS NOT NULL) OR
        (key_type = 'SYSTEM' AND user_email IS NULL)
    ),
    CONSTRAINT fk_api_keys_rotated_from FOREIGN KEY (rotated_from_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

-- Indexes for api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_email ON api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_rotated_from ON api_keys(rotated_from_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_grace_period ON api_keys(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- ============================================================================
-- Table and column comments for documentation
-- ============================================================================

COMMENT ON TABLE cloud_providers IS 'Catalog of cloud computing platforms (AWS, Azure, GCP, etc.) that can host infrastructure resources';
COMMENT ON TABLE resource_types IS 'Unified catalog of infrastructure resource types (databases, orchestrators, storage, etc.) with category classification';
COMMENT ON TABLE resource_type_cloud_mappings IS 'Defines which resource types are available on which cloud providers, including Terraform module locations';
COMMENT ON TABLE property_schemas IS 'Defines configurable properties for each resource type and cloud provider combination';
COMMENT ON TABLE admin_audit_logs IS 'Audit trail of all administrative configuration changes';
COMMENT ON TABLE blueprint_cloud_providers IS 'Many-to-many relationship between blueprints and supported cloud providers';

COMMENT ON COLUMN resource_types.category IS 'SHARED: only for blueprints, NON_SHARED: only for stacks, BOTH: can be used in either context';
COMMENT ON COLUMN property_schemas.data_type IS 'Data type for the property: STRING, NUMBER, BOOLEAN, or LIST';
COMMENT ON COLUMN property_schemas.validation_rules IS 'JSONB object containing validation rules like min, max, pattern, etc.';
COMMENT ON COLUMN resource_type_cloud_mappings.module_location_type IS 'Type of Terraform module location: GIT, FILE_SYSTEM, or REGISTRY';

COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic authentication';
COMMENT ON COLUMN api_keys.key_hash IS 'BCrypt hash of the API key, never store plaintext';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the key for identification in logs';
COMMENT ON COLUMN api_keys.key_type IS 'USER keys are tied to a user, SYSTEM keys are organization-level';
COMMENT ON COLUMN api_keys.user_email IS 'Email of the user who owns this key (NULL for SYSTEM keys)';
COMMENT ON COLUMN api_keys.created_by_email IS 'Email of the user who created this key';
COMMENT ON COLUMN api_keys.expires_at IS 'Timestamp when the key expires (NULL for no expiration)';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp of the last successful authentication with this key';
COMMENT ON COLUMN api_keys.revoked_at IS 'Timestamp when the key was revoked (NULL if not revoked)';
COMMENT ON COLUMN api_keys.revoked_by_email IS 'Email of the user who revoked this key';
COMMENT ON COLUMN api_keys.is_active IS 'Whether the key is currently active and can be used for authentication';
COMMENT ON COLUMN api_keys.rotated_from_id IS 'ID of the old API key that this key was rotated from (NULL if not a rotation)';
COMMENT ON COLUMN api_keys.grace_period_ends_at IS 'Timestamp when the grace period ends for the old key after rotation (NULL if not applicable)';
