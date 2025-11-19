package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import java.util.UUID;

/**
 * Utility class for building DynamoDB single-table design keys.
 * Implements the key construction patterns for PK, SK, and GSI keys.
 * 
 * Key Patterns:
 * - Stack: PK=STACK#<uuid>, SK=METADATA
 * - Team: PK=TEAM#<uuid>, SK=METADATA
 * - Blueprint: PK=BLUEPRINT#<uuid>, SK=METADATA
 * - CloudProvider: PK=CLOUDPROVIDER#<uuid>, SK=METADATA
 * - ApiKey: PK=APIKEY#<keyHash>, SK=METADATA
 * 
 * GSI1 Pattern (Query by secondary identifier):
 * - GSI1PK=TEAM#<teamId>, GSI1SK=STACK#<stackId> (for querying stacks by team)
 * 
 * GSI2 Pattern (Query by type and attribute):
 * - GSI2PK=CLOUDPROVIDER#<providerId>, GSI2SK=BLUEPRINT#<blueprintId> (for querying blueprints by provider)
 */
public class SingleTableKeyBuilder {
    
    // Entity type prefixes
    public static final String STACK_PREFIX = "STACK#";
    public static final String TEAM_PREFIX = "TEAM#";
    public static final String BLUEPRINT_PREFIX = "BLUEPRINT#";
    public static final String CLOUDPROVIDER_PREFIX = "CLOUDPROVIDER#";
    public static final String APIKEY_PREFIX = "APIKEY#";
    public static final String STACKRESOURCE_PREFIX = "STACKRESOURCE#";
    public static final String BLUEPRINTRESOURCE_PREFIX = "BLUEPRINTRESOURCE#";
    public static final String RESOURCETYPE_PREFIX = "RESOURCETYPE#";
    public static final String CATEGORY_PREFIX = "CATEGORY#";
    public static final String DOMAIN_PREFIX = "DOMAIN#";
    public static final String ENVIRONMENT_PREFIX = "ENVIRONMENT#";
    public static final String ENVIRONMENTCONFIG_PREFIX = "ENVIRONMENTCONFIG#";
    public static final String STACKCOLLECTION_PREFIX = "STACKCOLLECTION#";
    public static final String PROPERTYSCHEMA_PREFIX = "PROPERTYSCHEMA#";
    public static final String RESOURCETYPECLOUDMAPPING_PREFIX = "RESOURCETYPECLOUDMAPPING#";
    public static final String ADMINAUDITLOG_PREFIX = "ADMINAUDITLOG#";
    
    // Sort key for metadata
    public static final String METADATA_SK = "METADATA";
    
    // Private constructor to prevent instantiation
    private SingleTableKeyBuilder() {
        throw new UnsupportedOperationException("Utility class");
    }
    
    // ========== Stack Keys ==========
    
    public static String stackPK(UUID stackId) {
        return STACK_PREFIX + stackId.toString();
    }
    
    public static String stackSK() {
        return METADATA_SK;
    }
    
    public static String stackGSI1PK(UUID teamId) {
        return TEAM_PREFIX + teamId.toString();
    }
    
    public static String stackGSI1SK(UUID stackId) {
        return STACK_PREFIX + stackId.toString();
    }
    
    public static String stackGSI2PK(UUID cloudProviderId) {
        return CLOUDPROVIDER_PREFIX + cloudProviderId.toString();
    }
    
    public static String stackGSI2SK(UUID stackId) {
        return STACK_PREFIX + stackId.toString();
    }
    
    // ========== Team Keys ==========
    
    public static String teamPK(UUID teamId) {
        return TEAM_PREFIX + teamId.toString();
    }
    
    public static String teamSK() {
        return METADATA_SK;
    }
    
    // ========== Blueprint Keys ==========
    
    public static String blueprintPK(UUID blueprintId) {
        return BLUEPRINT_PREFIX + blueprintId.toString();
    }
    
    public static String blueprintSK() {
        return METADATA_SK;
    }
    
    public static String blueprintGSI2PK(UUID cloudProviderId) {
        return CLOUDPROVIDER_PREFIX + cloudProviderId.toString();
    }
    
    public static String blueprintGSI2SK(UUID blueprintId) {
        return BLUEPRINT_PREFIX + blueprintId.toString();
    }
    
    // ========== CloudProvider Keys ==========
    
    public static String cloudProviderPK(UUID cloudProviderId) {
        return CLOUDPROVIDER_PREFIX + cloudProviderId.toString();
    }
    
    public static String cloudProviderSK() {
        return METADATA_SK;
    }
    
    // ========== ApiKey Keys ==========
    
    public static String apiKeyPK(String keyHash) {
        return APIKEY_PREFIX + keyHash;
    }
    
    public static String apiKeySK() {
        return METADATA_SK;
    }
    
    // ========== StackResource Keys ==========
    
    public static String stackResourcePK(UUID stackResourceId) {
        return STACKRESOURCE_PREFIX + stackResourceId.toString();
    }
    
    public static String stackResourceSK() {
        return METADATA_SK;
    }
    
    public static String stackResourceGSI1PK(UUID stackId) {
        return STACK_PREFIX + stackId.toString();
    }
    
    public static String stackResourceGSI1SK(UUID stackResourceId) {
        return STACKRESOURCE_PREFIX + stackResourceId.toString();
    }
    
    // ========== BlueprintResource Keys ==========
    
    public static String blueprintResourcePK(UUID blueprintResourceId) {
        return BLUEPRINTRESOURCE_PREFIX + blueprintResourceId.toString();
    }
    
    public static String blueprintResourceSK() {
        return METADATA_SK;
    }
    
    public static String blueprintResourceGSI1PK(UUID blueprintId) {
        return BLUEPRINT_PREFIX + blueprintId.toString();
    }
    
    public static String blueprintResourceGSI1SK(UUID blueprintResourceId) {
        return BLUEPRINTRESOURCE_PREFIX + blueprintResourceId.toString();
    }
    
    // ========== ResourceType Keys ==========
    
    public static String resourceTypePK(UUID resourceTypeId) {
        return RESOURCETYPE_PREFIX + resourceTypeId.toString();
    }
    
    public static String resourceTypeSK() {
        return METADATA_SK;
    }
    
    // ========== Category Keys ==========
    
    public static String categoryPK(UUID categoryId) {
        return CATEGORY_PREFIX + categoryId.toString();
    }
    
    public static String categorySK() {
        return METADATA_SK;
    }
    
    // ========== Domain Keys ==========
    
    public static String domainPK(UUID domainId) {
        return DOMAIN_PREFIX + domainId.toString();
    }
    
    public static String domainSK() {
        return METADATA_SK;
    }
    
    // ========== Environment Keys ==========
    
    public static String environmentPK(UUID environmentId) {
        return ENVIRONMENT_PREFIX + environmentId.toString();
    }
    
    public static String environmentSK() {
        return METADATA_SK;
    }
    
    // ========== EnvironmentConfig Keys ==========
    
    public static String environmentConfigPK(UUID environmentConfigId) {
        return ENVIRONMENTCONFIG_PREFIX + environmentConfigId.toString();
    }
    
    public static String environmentConfigSK() {
        return METADATA_SK;
    }
    
    // ========== StackCollection Keys ==========
    
    public static String stackCollectionPK(UUID stackCollectionId) {
        return STACKCOLLECTION_PREFIX + stackCollectionId.toString();
    }
    
    public static String stackCollectionSK() {
        return METADATA_SK;
    }
    
    // ========== PropertySchema Keys ==========
    
    public static String propertySchemaPK(UUID propertySchemaId) {
        return PROPERTYSCHEMA_PREFIX + propertySchemaId.toString();
    }
    
    public static String propertySchemaSK() {
        return METADATA_SK;
    }
    
    // ========== ResourceTypeCloudMapping Keys ==========
    
    public static String resourceTypeCloudMappingPK(UUID mappingId) {
        return RESOURCETYPECLOUDMAPPING_PREFIX + mappingId.toString();
    }
    
    public static String resourceTypeCloudMappingSK() {
        return METADATA_SK;
    }
    
    // ========== AdminAuditLog Keys ==========
    
    public static String adminAuditLogPK(UUID auditLogId) {
        return ADMINAUDITLOG_PREFIX + auditLogId.toString();
    }
    
    public static String adminAuditLogSK() {
        return METADATA_SK;
    }
    
    // ========== Utility Methods ==========
    
    /**
     * Extracts the UUID from a prefixed key.
     * Example: "STACK#123e4567-e89b-12d3-a456-426614174000" -> "123e4567-e89b-12d3-a456-426614174000"
     */
    public static UUID extractUUID(String prefixedKey) {
        if (prefixedKey == null || !prefixedKey.contains("#")) {
            throw new IllegalArgumentException("Invalid prefixed key: " + prefixedKey);
        }
        String uuidString = prefixedKey.substring(prefixedKey.indexOf("#") + 1);
        return UUID.fromString(uuidString);
    }
    
    /**
     * Extracts the entity type prefix from a key.
     * Example: "STACK#123e4567-e89b-12d3-a456-426614174000" -> "STACK#"
     */
    public static String extractPrefix(String prefixedKey) {
        if (prefixedKey == null || !prefixedKey.contains("#")) {
            throw new IllegalArgumentException("Invalid prefixed key: " + prefixedKey);
        }
        return prefixedKey.substring(0, prefixedKey.indexOf("#") + 1);
    }
}
