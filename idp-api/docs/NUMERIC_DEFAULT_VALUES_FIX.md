# Numeric Default Values Fix

## Issue

NUMBER property default values for `minClusterSize` and `maxClusterSize` were incorrectly stored as JSON strings (`"1"` and `"10"`) instead of JSON numbers (`1` and `10`) in the database migration file. This caused the values to display with quotation marks in the UI form inputs.

## Root Cause

In the database migration file `V2__data.sql`, the default values were defined as:
- `minClusterSize`: `default_value = '"1"'` (JSON string)
- `maxClusterSize`: `default_value = '"10"'` (JSON string)

When PostgreSQL stores these values in a JSONB column, they are stored as strings, and when the frontend retrieves them, they display with quotation marks.

## Solution

Updated the migration file to store default values as JSON numbers:
- `minClusterSize`: `default_value = '1'` (JSON number)
- `maxClusterSize`: `default_value = '10'` (JSON number)

## Files Changed

1. **idp-api/src/main/resources/db/migration/V2__data.sql**
   - Line 498: Changed `'"1"'` to `'1'` for minClusterSize
   - Line 516: Changed `'"10"'` to `'10'` for maxClusterSize

2. **idp-api/scripts/fix-numeric-default-values.sql** (NEW)
   - SQL script to update existing databases with the fix

3. **idp-api/scripts/fix-numeric-default-values.sh** (NEW)
   - Bash script to apply the SQL fix to running databases

## Verification

To verify the fix is applied correctly, run:

```sql
SELECT 
    property_name, 
    default_value, 
    jsonb_typeof(default_value::jsonb) as value_type 
FROM property_schemas 
WHERE property_name IN ('minClusterSize', 'maxClusterSize') 
ORDER BY property_name;
```

Expected output:
```
 property_name  | default_value | value_type 
----------------+---------------+------------
 maxClusterSize | 10            | number
 minClusterSize | 1             | number
```

The `value_type` column should show `number`, not `string`.

## Impact

- **New Installations**: Will automatically get the correct values when migrations run
- **Existing Installations**: Need to apply the fix script or restart with `clean-at-start=true`
- **UI**: Numeric inputs will now display clean default values without quotation marks

## Related Spec

This fix implements Task 15 from the `dynamic-infrastructure-forms` spec:
- `.kiro/specs/dynamic-infrastructure-forms/requirements.md` - Requirement 15
- `.kiro/specs/dynamic-infrastructure-forms/design.md` - Default Value Type Handling section
- `.kiro/specs/dynamic-infrastructure-forms/tasks.md` - Task 15

## Testing

1. Create a new Blueprint with Container Orchestrator resource type and AWS cloud provider
2. Verify that "Minimum Cluster Size" shows `1` (not `"1"`)
3. Verify that "Maximum Cluster Size" shows `10` (not `"10"`)
4. Verify that the values can be edited and saved correctly

## Best Practices for Future Property Schemas

When adding new property schemas with default values:

- **STRING properties**: Store as JSON string: `'"value"'`
- **NUMBER properties**: Store as JSON number: `1` or `10.5` (NOT `'"1"'` or `'"10.5"'`)
- **BOOLEAN properties**: Store as JSON boolean: `true` or `false` (NOT `'"true"'` or `'"false"'`)
- **LIST properties**: Store as JSON string: `'"STANDARD"'` (the value from allowedValues)

Example:
```sql
-- CORRECT
default_value = '1'           -- NUMBER
default_value = '"my-bucket"' -- STRING
default_value = 'true'        -- BOOLEAN

-- INCORRECT
default_value = '"1"'         -- NUMBER stored as string
default_value = 'my-bucket'   -- STRING without quotes
default_value = '"true"'      -- BOOLEAN stored as string
```
