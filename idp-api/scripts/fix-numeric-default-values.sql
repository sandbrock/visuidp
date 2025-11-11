-- Fix numeric default values that were incorrectly stored as JSON strings
-- This script updates the default_value column for NUMBER properties to use JSON numbers instead of JSON strings

-- Fix minClusterSize default value from '"1"' to '1'
UPDATE property_schemas
SET default_value = '1',
    updated_at = NOW()
WHERE property_name = 'minClusterSize'
  AND mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
  AND default_value = '"1"';

-- Fix maxClusterSize default value from '"10"' to '10'
UPDATE property_schemas
SET default_value = '10',
    updated_at = NOW()
WHERE property_name = 'maxClusterSize'
  AND mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03'
  AND default_value = '"10"';

-- Verify the changes
SELECT 
    property_name,
    display_name,
    data_type,
    default_value,
    updated_at
FROM property_schemas
WHERE property_name IN ('minClusterSize', 'maxClusterSize')
  AND mapping_id = 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f03';
