-- Flyway migration: Add rotation tracking fields to api_keys table
-- Adds support for tracking API key rotation relationships and grace periods

-- Add rotation tracking columns
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rotated_from_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Add foreign key constraint for rotation tracking
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_rotated_from 
    FOREIGN KEY (rotated_from_id) REFERENCES api_keys(id) ON DELETE SET NULL;

-- Add index for rotation tracking queries
CREATE INDEX IF NOT EXISTS idx_api_keys_rotated_from ON api_keys(rotated_from_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_grace_period ON api_keys(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN api_keys.rotated_from_id IS 'ID of the old API key that this key was rotated from (NULL if not a rotation)';
COMMENT ON COLUMN api_keys.grace_period_ends_at IS 'Timestamp when the grace period ends for the old key after rotation (NULL if not applicable)';
