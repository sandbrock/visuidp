package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Mapper for converting between domain entities and DynamoDB items in single-table design.
 * Handles the mapping of entity attributes to DynamoDB AttributeValues with proper PK/SK/GSI keys.
 */
@ApplicationScoped
public class SingleTableEntityMapper {
    
    private static final Logger LOG = Logger.getLogger(SingleTableEntityMapper.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String ENTITY_TYPE_ATTR = "entityType";
    
    @Inject
    ObjectMapper objectMapper;
    
    // ========== Stack Mapping ==========
    
    public Map<String, AttributeValue> stackToItem(Stack stack) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Primary key
        item.put("PK", stringAttr(SingleTableKeyBuilder.stackPK(stack.getId())));
        item.put("SK", stringAttr(SingleTableKeyBuilder.stackSK()));
        
        // Entity type for filtering
        item.put(ENTITY_TYPE_ATTR, stringAttr("Stack"));
        
        // GSI1: Query stacks by team
        if (stack.getTeam() != null && stack.getTeam().getId() != null) {
            item.put("GSI1PK", stringAttr(SingleTableKeyBuilder.stackGSI1PK(stack.getTeam().getId())));
            item.put("GSI1SK", stringAttr(SingleTableKeyBuilder.stackGSI1SK(stack.getId())));
        }
        
        // GSI2: Query stacks by cloud provider (if applicable)
        // Note: Stack doesn't have direct cloudProvider, but we can add it if needed
        
        // Attributes
        item.put("id", stringAttr(stack.getId().toString()));
        item.put("name", stringAttr(stack.getName()));
        item.put("description", stringAttr(stack.getDescription()));
        item.put("cloudName", stringAttr(stack.getCloudName()));
        item.put("routePath", stringAttr(stack.getRoutePath()));
        item.put("repositoryURL", stringAttr(stack.getRepositoryURL()));
        item.put("stackType", stringAttr(stack.getStackType() != null ? stack.getStackType().name() : null));
        item.put("programmingLanguage", stringAttr(stack.getProgrammingLanguage() != null ? stack.getProgrammingLanguage().name() : null));
        item.put("isPublic", boolAttr(stack.getIsPublic()));
        item.put("createdBy", stringAttr(stack.getCreatedBy()));
        item.put("ephemeralPrefix", stringAttr(stack.getEphemeralPrefix()));
        item.put("createdAt", dateTimeAttr(stack.getCreatedAt()));
        item.put("updatedAt", dateTimeAttr(stack.getUpdatedAt()));
        
        // Foreign keys
        if (stack.getTeam() != null && stack.getTeam().getId() != null) {
            item.put("teamId", stringAttr(stack.getTeam().getId().toString()));
        }
        if (stack.getBlueprint() != null && stack.getBlueprint().getId() != null) {
            item.put("blueprintId", stringAttr(stack.getBlueprint().getId().toString()));
        }
        if (stack.getStackCollection() != null && stack.getStackCollection().getId() != null) {
            item.put("stackCollectionId", stringAttr(stack.getStackCollection().getId().toString()));
        }
        if (stack.getBlueprintResource() != null && stack.getBlueprintResource().getId() != null) {
            item.put("blueprintResourceId", stringAttr(stack.getBlueprintResource().getId().toString()));
        }
        
        // Configuration as JSON
        if (stack.getConfiguration() != null && !stack.getConfiguration().isEmpty()) {
            item.put("configuration", mapAttr(stack.getConfiguration()));
        }
        
        return item;
    }
    
    public Stack itemToStack(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        
        Stack stack = new Stack();
        stack.setId(uuidFromString(getStringAttr(item, "id")));
        stack.setName(getStringAttr(item, "name"));
        stack.setDescription(getStringAttr(item, "description"));
        stack.setCloudName(getStringAttr(item, "cloudName"));
        stack.setRoutePath(getStringAttr(item, "routePath"));
        stack.setRepositoryURL(getStringAttr(item, "repositoryURL"));
        stack.setStackType(enumFromString(getStringAttr(item, "stackType"), StackType.class));
        stack.setProgrammingLanguage(enumFromString(getStringAttr(item, "programmingLanguage"), ProgrammingLanguage.class));
        stack.setIsPublic(getBoolAttr(item, "isPublic"));
        stack.setCreatedBy(getStringAttr(item, "createdBy"));
        stack.setEphemeralPrefix(getStringAttr(item, "ephemeralPrefix"));
        stack.setCreatedAt(getDateTimeAttr(item, "createdAt"));
        stack.setUpdatedAt(getDateTimeAttr(item, "updatedAt"));
        
        // Configuration
        if (item.containsKey("configuration")) {
            stack.setConfiguration(getMapAttr(item, "configuration"));
        }
        
        // Note: Foreign key relationships are not fully hydrated here
        // They should be loaded separately if needed
        String teamId = getStringAttr(item, "teamId");
        if (teamId != null) {
            Team team = new Team();
            team.setId(UUID.fromString(teamId));
            stack.setTeam(team);
        }
        
        String blueprintId = getStringAttr(item, "blueprintId");
        if (blueprintId != null) {
            Blueprint blueprint = new Blueprint();
            blueprint.setId(UUID.fromString(blueprintId));
            stack.setBlueprint(blueprint);
        }
        
        return stack;
    }
    
    // ========== Team Mapping ==========
    
    public Map<String, AttributeValue> teamToItem(Team team) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Primary key
        item.put("PK", stringAttr(SingleTableKeyBuilder.teamPK(team.getId())));
        item.put("SK", stringAttr(SingleTableKeyBuilder.teamSK()));
        
        // Entity type
        item.put(ENTITY_TYPE_ATTR, stringAttr("Team"));
        
        // Attributes
        item.put("id", stringAttr(team.getId().toString()));
        item.put("name", stringAttr(team.getName()));
        item.put("description", stringAttr(team.getDescription()));
        item.put("isActive", boolAttr(team.getIsActive()));
        item.put("createdAt", dateTimeAttr(team.getCreatedAt()));
        item.put("updatedAt", dateTimeAttr(team.getUpdatedAt()));
        
        return item;
    }
    
    public Team itemToTeam(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        
        Team team = new Team();
        team.setId(uuidFromString(getStringAttr(item, "id")));
        team.setName(getStringAttr(item, "name"));
        team.setDescription(getStringAttr(item, "description"));
        team.setIsActive(getBoolAttr(item, "isActive"));
        team.setCreatedAt(getDateTimeAttr(item, "createdAt"));
        team.setUpdatedAt(getDateTimeAttr(item, "updatedAt"));
        
        return team;
    }
    
    // ========== Blueprint Mapping ==========
    
    public Map<String, AttributeValue> blueprintToItem(Blueprint blueprint) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Primary key
        item.put("PK", stringAttr(SingleTableKeyBuilder.blueprintPK(blueprint.getId())));
        item.put("SK", stringAttr(SingleTableKeyBuilder.blueprintSK()));
        
        // Entity type
        item.put(ENTITY_TYPE_ATTR, stringAttr("Blueprint"));
        
        // Attributes
        item.put("id", stringAttr(blueprint.getId().toString()));
        item.put("name", stringAttr(blueprint.getName()));
        item.put("description", stringAttr(blueprint.getDescription()));
        item.put("isActive", boolAttr(blueprint.getIsActive()));
        item.put("createdAt", dateTimeAttr(blueprint.getCreatedAt()));
        item.put("updatedAt", dateTimeAttr(blueprint.getUpdatedAt()));
        
        // Supported cloud providers as a list
        if (blueprint.getSupportedCloudProviders() != null && !blueprint.getSupportedCloudProviders().isEmpty()) {
            List<AttributeValue> providerIds = new ArrayList<>();
            for (CloudProvider provider : blueprint.getSupportedCloudProviders()) {
                if (provider.getId() != null) {
                    providerIds.add(stringAttr(provider.getId().toString()));
                }
            }
            if (!providerIds.isEmpty()) {
                item.put("supportedCloudProviderIds", AttributeValue.builder().l(providerIds).build());
            }
        }
        
        return item;
    }
    
    public Blueprint itemToBlueprint(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        
        Blueprint blueprint = new Blueprint();
        blueprint.setId(uuidFromString(getStringAttr(item, "id")));
        blueprint.setName(getStringAttr(item, "name"));
        blueprint.setDescription(getStringAttr(item, "description"));
        blueprint.setIsActive(getBoolAttr(item, "isActive"));
        blueprint.setCreatedAt(getDateTimeAttr(item, "createdAt"));
        blueprint.setUpdatedAt(getDateTimeAttr(item, "updatedAt"));
        
        // Note: Supported cloud providers need to be loaded separately
        
        return blueprint;
    }
    
    // ========== CloudProvider Mapping ==========
    
    public Map<String, AttributeValue> cloudProviderToItem(CloudProvider cloudProvider) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Primary key
        item.put("PK", stringAttr(SingleTableKeyBuilder.cloudProviderPK(cloudProvider.id)));
        item.put("SK", stringAttr(SingleTableKeyBuilder.cloudProviderSK()));
        
        // Entity type
        item.put(ENTITY_TYPE_ATTR, stringAttr("CloudProvider"));
        
        // Attributes
        item.put("id", stringAttr(cloudProvider.id.toString()));
        item.put("name", stringAttr(cloudProvider.name));
        item.put("displayName", stringAttr(cloudProvider.displayName));
        item.put("type", stringAttr(cloudProvider.type));
        item.put("enabled", boolAttr(cloudProvider.enabled));
        item.put("createdAt", dateTimeAttr(cloudProvider.createdAt));
        item.put("updatedAt", dateTimeAttr(cloudProvider.updatedAt));
        
        return item;
    }
    
    public CloudProvider itemToCloudProvider(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.id = uuidFromString(getStringAttr(item, "id"));
        cloudProvider.name = getStringAttr(item, "name");
        cloudProvider.displayName = getStringAttr(item, "displayName");
        cloudProvider.type = getStringAttr(item, "type");
        cloudProvider.enabled = getBoolAttr(item, "enabled");
        cloudProvider.createdAt = getDateTimeAttr(item, "createdAt");
        cloudProvider.updatedAt = getDateTimeAttr(item, "updatedAt");
        
        return cloudProvider;
    }
    
    // ========== ApiKey Mapping ==========
    
    public Map<String, AttributeValue> apiKeyToItem(ApiKey apiKey) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Primary key (using keyHash instead of ID)
        item.put("PK", stringAttr(SingleTableKeyBuilder.apiKeyPK(apiKey.keyHash)));
        item.put("SK", stringAttr(SingleTableKeyBuilder.apiKeySK()));
        
        // Entity type
        item.put(ENTITY_TYPE_ATTR, stringAttr("ApiKey"));
        
        // Attributes
        item.put("id", stringAttr(apiKey.id.toString()));
        item.put("keyName", stringAttr(apiKey.keyName));
        item.put("keyHash", stringAttr(apiKey.keyHash));
        item.put("keyPrefix", stringAttr(apiKey.keyPrefix));
        item.put("keyType", stringAttr(apiKey.keyType != null ? apiKey.keyType.name() : null));
        item.put("userEmail", stringAttr(apiKey.userEmail));
        item.put("createdByEmail", stringAttr(apiKey.createdByEmail));
        item.put("createdAt", dateTimeAttr(apiKey.createdAt));
        item.put("expiresAt", dateTimeAttr(apiKey.expiresAt));
        item.put("lastUsedAt", dateTimeAttr(apiKey.lastUsedAt));
        item.put("revokedAt", dateTimeAttr(apiKey.revokedAt));
        item.put("revokedByEmail", stringAttr(apiKey.revokedByEmail));
        item.put("isActive", boolAttr(apiKey.isActive));
        
        if (apiKey.rotatedFromId != null) {
            item.put("rotatedFromId", stringAttr(apiKey.rotatedFromId.toString()));
        }
        item.put("gracePeriodEndsAt", dateTimeAttr(apiKey.gracePeriodEndsAt));
        
        return item;
    }
    
    public ApiKey itemToApiKey(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }
        
        ApiKey apiKey = new ApiKey();
        apiKey.id = uuidFromString(getStringAttr(item, "id"));
        apiKey.keyName = getStringAttr(item, "keyName");
        apiKey.keyHash = getStringAttr(item, "keyHash");
        apiKey.keyPrefix = getStringAttr(item, "keyPrefix");
        apiKey.keyType = enumFromString(getStringAttr(item, "keyType"), ApiKeyType.class);
        apiKey.userEmail = getStringAttr(item, "userEmail");
        apiKey.createdByEmail = getStringAttr(item, "createdByEmail");
        apiKey.createdAt = getDateTimeAttr(item, "createdAt");
        apiKey.expiresAt = getDateTimeAttr(item, "expiresAt");
        apiKey.lastUsedAt = getDateTimeAttr(item, "lastUsedAt");
        apiKey.revokedAt = getDateTimeAttr(item, "revokedAt");
        apiKey.revokedByEmail = getStringAttr(item, "revokedByEmail");
        apiKey.isActive = getBoolAttr(item, "isActive");
        
        String rotatedFromId = getStringAttr(item, "rotatedFromId");
        if (rotatedFromId != null) {
            apiKey.rotatedFromId = UUID.fromString(rotatedFromId);
        }
        apiKey.gracePeriodEndsAt = getDateTimeAttr(item, "gracePeriodEndsAt");
        
        return apiKey;
    }
    
    // ========== Helper Methods ==========
    
    private AttributeValue stringAttr(String value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(value).build();
    }
    
    private AttributeValue boolAttr(Boolean value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().bool(value).build();
    }
    
    private AttributeValue dateTimeAttr(LocalDateTime dateTime) {
        if (dateTime == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(dateTime.format(DATE_TIME_FORMATTER)).build();
    }
    
    private AttributeValue mapAttr(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return AttributeValue.builder().nul(true).build();
        }
        
        try {
            String json = objectMapper.writeValueAsString(map);
            return AttributeValue.builder().s(json).build();
        } catch (JsonProcessingException e) {
            LOG.error("Failed to serialize map to JSON", e);
            return AttributeValue.builder().nul(true).build();
        }
    }
    
    private String getStringAttr(Map<String, AttributeValue> item, String key) {
        AttributeValue attr = item.get(key);
        if (attr == null || attr.nul() != null && attr.nul()) {
            return null;
        }
        return attr.s();
    }
    
    private Boolean getBoolAttr(Map<String, AttributeValue> item, String key) {
        AttributeValue attr = item.get(key);
        if (attr == null || attr.nul() != null && attr.nul()) {
            return null;
        }
        return attr.bool();
    }
    
    private LocalDateTime getDateTimeAttr(Map<String, AttributeValue> item, String key) {
        String value = getStringAttr(item, key);
        if (value == null) {
            return null;
        }
        return LocalDateTime.parse(value, DATE_TIME_FORMATTER);
    }
    
    private Map<String, Object> getMapAttr(Map<String, AttributeValue> item, String key) {
        String json = getStringAttr(item, key);
        if (json == null) {
            return null;
        }
        
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to deserialize JSON to map", e);
            return null;
        }
    }
    
    private UUID uuidFromString(String value) {
        if (value == null) {
            return null;
        }
        return UUID.fromString(value);
    }
    
    private <E extends Enum<E>> E enumFromString(String value, Class<E> enumClass) {
        if (value == null) {
            return null;
        }
        return Enum.valueOf(enumClass, value);
    }
}
