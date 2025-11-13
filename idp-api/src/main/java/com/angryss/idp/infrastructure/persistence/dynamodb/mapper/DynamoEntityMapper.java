package com.angryss.idp.infrastructure.persistence.dynamodb.mapper;

import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Domain;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.StackCollection;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.enterprise.context.ApplicationScoped;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Base mapper utilities for converting between Java objects and DynamoDB AttributeValues.
 * Provides common conversion methods for UUIDs, LocalDateTime, enums, and nested Maps.
 */
@ApplicationScoped
public class DynamoEntityMapper {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * Converts a Java Map to a DynamoDB Map AttributeValue.
     * Handles nested structures recursively.
     *
     * @param map the Java Map to convert
     * @return DynamoDB Map AttributeValue
     */
    public AttributeValue mapToAttributeValue(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return AttributeValue.builder().nul(true).build();
        }

        Map<String, AttributeValue> dynamoMap = new HashMap<>();
        
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            
            dynamoMap.put(key, objectToAttributeValue(value));
        }

        return AttributeValue.builder().m(dynamoMap).build();
    }

    /**
     * Converts a DynamoDB Map AttributeValue to a Java Map.
     * Handles nested structures recursively.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return Java Map
     */
    public Map<String, Object> attributeValueToMap(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }

        if (!attributeValue.hasM()) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> dynamoMap = attributeValue.m();
        Map<String, Object> javaMap = new HashMap<>();

        for (Map.Entry<String, AttributeValue> entry : dynamoMap.entrySet()) {
            javaMap.put(entry.getKey(), attributeValueToObject(entry.getValue()));
        }

        return javaMap;
    }

    /**
     * Converts a UUID to a DynamoDB String AttributeValue.
     *
     * @param uuid the UUID to convert
     * @return DynamoDB String AttributeValue, or null AttributeValue if uuid is null
     */
    public AttributeValue uuidToAttributeValue(UUID uuid) {
        if (uuid == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(uuid.toString()).build();
    }

    /**
     * Converts a DynamoDB String AttributeValue to a UUID.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return UUID, or null if attributeValue is null or represents null
     */
    public UUID attributeValueToUuid(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        return UUID.fromString(attributeValue.s());
    }

    /**
     * Converts a LocalDateTime to a DynamoDB String AttributeValue.
     * Uses ISO_LOCAL_DATE_TIME format.
     *
     * @param dateTime the LocalDateTime to convert
     * @return DynamoDB String AttributeValue, or null AttributeValue if dateTime is null
     */
    public AttributeValue localDateTimeToAttributeValue(LocalDateTime dateTime) {
        if (dateTime == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(dateTime.format(DATE_TIME_FORMATTER)).build();
    }

    /**
     * Converts a DynamoDB String AttributeValue to a LocalDateTime.
     * Expects ISO_LOCAL_DATE_TIME format.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return LocalDateTime, or null if attributeValue is null or represents null
     */
    public LocalDateTime attributeValueToLocalDateTime(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        return LocalDateTime.parse(attributeValue.s(), DATE_TIME_FORMATTER);
    }

    /**
     * Converts an Enum to a DynamoDB String AttributeValue.
     *
     * @param enumValue the Enum to convert
     * @return DynamoDB String AttributeValue, or null AttributeValue if enumValue is null
     */
    public AttributeValue enumToAttributeValue(Enum<?> enumValue) {
        if (enumValue == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(enumValue.name()).build();
    }

    /**
     * Converts a DynamoDB String AttributeValue to an Enum.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @param enumClass the Enum class to convert to
     * @param <E> the Enum type
     * @return Enum value, or null if attributeValue is null or represents null
     */
    public <E extends Enum<E>> E attributeValueToEnum(AttributeValue attributeValue, Class<E> enumClass) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        return Enum.valueOf(enumClass, attributeValue.s());
    }

    /**
     * Converts a String to a DynamoDB String AttributeValue.
     *
     * @param value the String to convert
     * @return DynamoDB String AttributeValue, or null AttributeValue if value is null
     */
    public AttributeValue stringToAttributeValue(String value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().s(value).build();
    }

    /**
     * Converts a DynamoDB String AttributeValue to a String.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return String, or null if attributeValue is null or represents null
     */
    public String attributeValueToString(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        return attributeValue.s();
    }

    /**
     * Converts a Boolean to a DynamoDB Boolean AttributeValue.
     *
     * @param value the Boolean to convert
     * @return DynamoDB Boolean AttributeValue, or null AttributeValue if value is null
     */
    public AttributeValue booleanToAttributeValue(Boolean value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }
        return AttributeValue.builder().bool(value).build();
    }

    /**
     * Converts a DynamoDB Boolean AttributeValue to a Boolean.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return Boolean, or null if attributeValue is null or represents null
     */
    public Boolean attributeValueToBoolean(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        return attributeValue.bool();
    }

    /**
     * Converts a List of Strings to a DynamoDB List AttributeValue.
     *
     * @param list the List to convert
     * @return DynamoDB List AttributeValue, or null AttributeValue if list is null
     */
    public AttributeValue stringListToAttributeValue(List<String> list) {
        if (list == null) {
            return AttributeValue.builder().nul(true).build();
        }
        if (list.isEmpty()) {
            return AttributeValue.builder().l(Collections.emptyList()).build();
        }
        
        List<AttributeValue> attributeValues = list.stream()
                .map(s -> AttributeValue.builder().s(s).build())
                .collect(Collectors.toList());
        
        return AttributeValue.builder().l(attributeValues).build();
    }

    /**
     * Converts a DynamoDB List AttributeValue to a List of Strings.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return List of Strings, or null if attributeValue is null or represents null
     */
    public List<String> attributeValueToStringList(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        if (!attributeValue.hasL()) {
            return new ArrayList<>();
        }
        
        return attributeValue.l().stream()
                .map(AttributeValue::s)
                .collect(Collectors.toList());
    }

    /**
     * Converts a generic Java Object to a DynamoDB AttributeValue.
     * Handles common types: String, Number, Boolean, Map, List, UUID, LocalDateTime, Enum.
     *
     * @param value the Object to convert
     * @return DynamoDB AttributeValue
     */
    private AttributeValue objectToAttributeValue(Object value) {
        if (value == null) {
            return AttributeValue.builder().nul(true).build();
        }

        if (value instanceof String) {
            return AttributeValue.builder().s((String) value).build();
        } else if (value instanceof Number) {
            return AttributeValue.builder().n(value.toString()).build();
        } else if (value instanceof Boolean) {
            return AttributeValue.builder().bool((Boolean) value).build();
        } else if (value instanceof UUID) {
            return uuidToAttributeValue((UUID) value);
        } else if (value instanceof LocalDateTime) {
            return localDateTimeToAttributeValue((LocalDateTime) value);
        } else if (value instanceof Enum) {
            return enumToAttributeValue((Enum<?>) value);
        } else if (value instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) value;
            return mapToAttributeValue(map);
        } else if (value instanceof List) {
            List<?> list = (List<?>) value;
            List<AttributeValue> attributeValues = list.stream()
                    .map(this::objectToAttributeValue)
                    .collect(Collectors.toList());
            return AttributeValue.builder().l(attributeValues).build();
        } else {
            // Fallback: convert to string
            return AttributeValue.builder().s(value.toString()).build();
        }
    }

    /**
     * Converts a DynamoDB AttributeValue to a generic Java Object.
     * Handles common types: String, Number, Boolean, Map, List, null.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return Java Object
     */
    private Object attributeValueToObject(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }

        if (attributeValue.s() != null) {
            return attributeValue.s();
        } else if (attributeValue.n() != null) {
            // Try to parse as appropriate number type
            String numberStr = attributeValue.n();
            if (numberStr.contains(".")) {
                return Double.parseDouble(numberStr);
            } else {
                try {
                    return Integer.parseInt(numberStr);
                } catch (NumberFormatException e) {
                    return Long.parseLong(numberStr);
                }
            }
        } else if (attributeValue.bool() != null) {
            return attributeValue.bool();
        } else if (attributeValue.hasM()) {
            return attributeValueToMap(attributeValue);
        } else if (attributeValue.hasL()) {
            return attributeValue.l().stream()
                    .map(this::attributeValueToObject)
                    .collect(Collectors.toList());
        }

        return null;
    }

    /**
     * Converts a List of UUIDs to a DynamoDB List AttributeValue.
     *
     * @param list the List of UUIDs to convert
     * @return DynamoDB List AttributeValue, or null AttributeValue if list is null
     */
    public AttributeValue uuidListToAttributeValue(List<UUID> list) {
        if (list == null) {
            return AttributeValue.builder().nul(true).build();
        }
        if (list.isEmpty()) {
            return AttributeValue.builder().l(Collections.emptyList()).build();
        }
        
        List<AttributeValue> attributeValues = list.stream()
                .map(uuid -> AttributeValue.builder().s(uuid.toString()).build())
                .collect(Collectors.toList());
        
        return AttributeValue.builder().l(attributeValues).build();
    }

    /**
     * Converts a DynamoDB List AttributeValue to a List of UUIDs.
     *
     * @param attributeValue the DynamoDB AttributeValue to convert
     * @return List of UUIDs, or null if attributeValue is null or represents null
     */
    public List<UUID> attributeValueToUuidList(AttributeValue attributeValue) {
        if (attributeValue == null || attributeValue.nul() != null && attributeValue.nul()) {
            return null;
        }
        if (!attributeValue.hasL()) {
            return new ArrayList<>();
        }
        
        return attributeValue.l().stream()
                .map(av -> UUID.fromString(av.s()))
                .collect(Collectors.toList());
    }

    /**
     * Converts a Stack entity to a DynamoDB item (Map of AttributeValues).
     * Handles all Stack fields including optional fields, relationships (as foreign keys), and configuration Map.
     *
     * @param stack the Stack entity to convert
     * @return Map of AttributeValues representing the DynamoDB item
     */
    public Map<String, AttributeValue> stackToItem(Stack stack) {
        if (stack == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        // Required fields
        item.put("id", uuidToAttributeValue(stack.getId()));
        item.put("name", stringToAttributeValue(stack.getName()));
        item.put("cloudName", stringToAttributeValue(stack.getCloudName()));
        item.put("routePath", stringToAttributeValue(stack.getRoutePath()));
        item.put("stackType", enumToAttributeValue(stack.getStackType()));
        item.put("createdBy", stringToAttributeValue(stack.getCreatedBy()));
        item.put("createdAt", localDateTimeToAttributeValue(stack.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(stack.getUpdatedAt()));

        // Optional fields
        if (stack.getDescription() != null) {
            item.put("description", stringToAttributeValue(stack.getDescription()));
        }

        if (stack.getRepositoryURL() != null) {
            item.put("repositoryURL", stringToAttributeValue(stack.getRepositoryURL()));
        }

        if (stack.getProgrammingLanguage() != null) {
            item.put("programmingLanguage", enumToAttributeValue(stack.getProgrammingLanguage()));
        }

        if (stack.getIsPublic() != null) {
            item.put("isPublic", booleanToAttributeValue(stack.getIsPublic()));
        }

        if (stack.getEphemeralPrefix() != null) {
            item.put("ephemeralPrefix", stringToAttributeValue(stack.getEphemeralPrefix()));
        }

        // Relationship foreign keys (store UUIDs)
        if (stack.getTeam() != null && stack.getTeam().getId() != null) {
            item.put("teamId", uuidToAttributeValue(stack.getTeam().getId()));
        }

        if (stack.getStackCollection() != null && stack.getStackCollection().getId() != null) {
            item.put("stackCollectionId", uuidToAttributeValue(stack.getStackCollection().getId()));
        }

        // domain, category, and cloudProvider fields removed from Stack entity

        if (stack.getBlueprint() != null && stack.getBlueprint().getId() != null) {
            item.put("blueprintId", uuidToAttributeValue(stack.getBlueprint().getId()));
        }

        // Configuration Map field (JSONB equivalent)
        if (stack.getConfiguration() != null && !stack.getConfiguration().isEmpty()) {
            item.put("configuration", mapToAttributeValue(stack.getConfiguration()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item (Map of AttributeValues) to a Stack entity.
     * Handles all Stack fields including optional fields and configuration Map.
     * Note: Relationships are stored as foreign key UUIDs and must be loaded separately.
     *
     * @param item the DynamoDB item to convert
     * @return Stack entity
     */
    public Stack itemToStack(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        Stack stack = new Stack();

        // Required fields
        stack.setId(attributeValueToUuid(item.get("id")));
        stack.setName(attributeValueToString(item.get("name")));
        stack.setCloudName(attributeValueToString(item.get("cloudName")));
        stack.setRoutePath(attributeValueToString(item.get("routePath")));
        stack.setStackType(attributeValueToEnum(item.get("stackType"), StackType.class));
        stack.setCreatedBy(attributeValueToString(item.get("createdBy")));
        stack.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        stack.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        // Optional fields
        if (item.containsKey("description")) {
            stack.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("repositoryURL")) {
            stack.setRepositoryURL(attributeValueToString(item.get("repositoryURL")));
        }

        if (item.containsKey("programmingLanguage")) {
            stack.setProgrammingLanguage(attributeValueToEnum(item.get("programmingLanguage"), ProgrammingLanguage.class));
        }

        if (item.containsKey("isPublic")) {
            stack.setIsPublic(attributeValueToBoolean(item.get("isPublic")));
        }

        if (item.containsKey("ephemeralPrefix")) {
            stack.setEphemeralPrefix(attributeValueToString(item.get("ephemeralPrefix")));
        }

        // Note: Relationship entities (Team, StackCollection, Blueprint)
        // are not loaded here. The repository layer is responsible for lazy-loading these relationships
        // when needed using the foreign key UUIDs stored in the item:
        // - teamId
        // - stackCollectionId
        // - blueprintId
        // (domain, category, and cloudProvider fields removed from Stack entity)

        // Configuration Map field
        if (item.containsKey("configuration")) {
            stack.setConfiguration(attributeValueToMap(item.get("configuration")));
        }

        return stack;
    }

    /**
     * Converts a Blueprint entity to a DynamoDB item (Map of AttributeValues).
     * Handles all Blueprint fields including optional fields and relationships.
     * Many-to-many relationships (supportedCloudProviders) are stored as a list of UUIDs.
     * One-to-many relationships (stacks, resources) are not stored in the Blueprint item.
     *
     * @param blueprint the Blueprint entity to convert
     * @return Map of AttributeValues representing the DynamoDB item
     */
    public Map<String, AttributeValue> blueprintToItem(com.angryss.idp.domain.entities.Blueprint blueprint) {
        if (blueprint == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        // Required fields
        item.put("id", uuidToAttributeValue(blueprint.getId()));
        item.put("name", stringToAttributeValue(blueprint.getName()));
        item.put("createdAt", localDateTimeToAttributeValue(blueprint.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(blueprint.getUpdatedAt()));

        // Optional fields
        if (blueprint.getDescription() != null) {
            item.put("description", stringToAttributeValue(blueprint.getDescription()));
        }

        if (blueprint.getIsActive() != null) {
            item.put("isActive", booleanToAttributeValue(blueprint.getIsActive()));
        }

        // Many-to-many relationship: supportedCloudProviders (store as list of UUIDs)
        if (blueprint.getSupportedCloudProviders() != null && !blueprint.getSupportedCloudProviders().isEmpty()) {
            List<UUID> cloudProviderIds = blueprint.getSupportedCloudProviders().stream()
                    .filter(cp -> cp != null && cp.id != null)
                    .map(cp -> cp.id)
                    .collect(Collectors.toList());
            
            if (!cloudProviderIds.isEmpty()) {
                item.put("supportedCloudProviderIds", uuidListToAttributeValue(cloudProviderIds));
            }
        }

        // Note: One-to-many relationships (stacks, resources) are not stored in the Blueprint item.
        // These are managed separately with foreign keys in the Stack and BlueprintResource items.

        return item;
    }

    /**
     * Converts a DynamoDB item (Map of AttributeValues) to a Blueprint entity.
     * Handles all Blueprint fields including optional fields.
     * Note: Relationships (supportedCloudProviders, stacks, resources) are stored as foreign key UUIDs
     * and must be loaded separately by the repository layer.
     *
     * @param item the DynamoDB item to convert
     * @return Blueprint entity
     */
    public com.angryss.idp.domain.entities.Blueprint itemToBlueprint(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        com.angryss.idp.domain.entities.Blueprint blueprint = new com.angryss.idp.domain.entities.Blueprint();

        // Required fields
        blueprint.setId(attributeValueToUuid(item.get("id")));
        blueprint.setName(attributeValueToString(item.get("name")));
        blueprint.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        blueprint.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        // Optional fields
        if (item.containsKey("description")) {
            blueprint.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("isActive")) {
            blueprint.setIsActive(attributeValueToBoolean(item.get("isActive")));
        }

        // Note: Relationship entities are not loaded here. The repository layer is responsible for
        // lazy-loading these relationships when needed:
        // - supportedCloudProviders: stored as supportedCloudProviderIds (list of UUIDs)
        // - stacks: managed via foreign key (blueprintId) in Stack items
        // - resources: managed via foreign key (blueprintId) in BlueprintResource items

        return blueprint;
    }

    /**
     * Converts a Team entity to a DynamoDB item (Map of AttributeValues).
     * Handles all Team fields including optional fields.
     *
     * @param team the Team entity to convert
     * @return Map of AttributeValues representing the DynamoDB item
     */
    public Map<String, AttributeValue> teamToItem(com.angryss.idp.domain.entities.Team team) {
        if (team == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        // Required fields
        item.put("id", uuidToAttributeValue(team.getId()));
        item.put("name", stringToAttributeValue(team.getName()));
        item.put("createdAt", localDateTimeToAttributeValue(team.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(team.getUpdatedAt()));

        // Optional fields
        if (team.getDescription() != null) {
            item.put("description", stringToAttributeValue(team.getDescription()));
        }

        if (team.getIsActive() != null) {
            item.put("isActive", booleanToAttributeValue(team.getIsActive()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item (Map of AttributeValues) to a Team entity.
     * Handles all Team fields including optional fields.
     *
     * @param item the DynamoDB item to convert
     * @return Team entity
     */
    public com.angryss.idp.domain.entities.Team itemToTeam(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        com.angryss.idp.domain.entities.Team team = new com.angryss.idp.domain.entities.Team();

        // Required fields
        team.setId(attributeValueToUuid(item.get("id")));
        team.setName(attributeValueToString(item.get("name")));
        team.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        team.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        // Optional fields
        if (item.containsKey("description")) {
            team.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("isActive")) {
            team.setIsActive(attributeValueToBoolean(item.get("isActive")));
        }

        return team;
    }

    // ==================== CloudProvider Mapping ====================

    /**
     * Converts a CloudProvider entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> cloudProviderToItem(CloudProvider cloudProvider) {
        if (cloudProvider == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(cloudProvider.id));
        item.put("name", stringToAttributeValue(cloudProvider.name));
        item.put("displayName", stringToAttributeValue(cloudProvider.displayName));
        item.put("enabled", booleanToAttributeValue(cloudProvider.enabled));
        item.put("createdAt", localDateTimeToAttributeValue(cloudProvider.createdAt));
        item.put("updatedAt", localDateTimeToAttributeValue(cloudProvider.updatedAt));

        if (cloudProvider.description != null) {
            item.put("description", stringToAttributeValue(cloudProvider.description));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a CloudProvider entity.
     */
    public CloudProvider itemToCloudProvider(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        CloudProvider cloudProvider = new CloudProvider();

        cloudProvider.id = attributeValueToUuid(item.get("id"));
        cloudProvider.name = attributeValueToString(item.get("name"));
        cloudProvider.displayName = attributeValueToString(item.get("displayName"));
        cloudProvider.enabled = attributeValueToBoolean(item.get("enabled"));
        cloudProvider.createdAt = attributeValueToLocalDateTime(item.get("createdAt"));
        cloudProvider.updatedAt = attributeValueToLocalDateTime(item.get("updatedAt"));

        if (item.containsKey("description")) {
            cloudProvider.description = attributeValueToString(item.get("description"));
        }

        return cloudProvider;
    }

    // ==================== ResourceType Mapping ====================

    /**
     * Converts a ResourceType entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> resourceTypeToItem(ResourceType resourceType) {
        if (resourceType == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(resourceType.id));
        item.put("name", stringToAttributeValue(resourceType.name));
        item.put("displayName", stringToAttributeValue(resourceType.displayName));
        item.put("category", enumToAttributeValue(resourceType.category));
        item.put("enabled", booleanToAttributeValue(resourceType.enabled));
        item.put("createdAt", localDateTimeToAttributeValue(resourceType.createdAt));
        item.put("updatedAt", localDateTimeToAttributeValue(resourceType.updatedAt));

        if (resourceType.description != null) {
            item.put("description", stringToAttributeValue(resourceType.description));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a ResourceType entity.
     */
    public ResourceType itemToResourceType(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        ResourceType resourceType = new ResourceType();

        resourceType.id = attributeValueToUuid(item.get("id"));
        resourceType.name = attributeValueToString(item.get("name"));
        resourceType.displayName = attributeValueToString(item.get("displayName"));
        resourceType.category = attributeValueToEnum(item.get("category"), com.angryss.idp.domain.valueobjects.ResourceCategory.class);
        resourceType.enabled = attributeValueToBoolean(item.get("enabled"));
        resourceType.createdAt = attributeValueToLocalDateTime(item.get("createdAt"));
        resourceType.updatedAt = attributeValueToLocalDateTime(item.get("updatedAt"));

        if (item.containsKey("description")) {
            resourceType.description = attributeValueToString(item.get("description"));
        }

        return resourceType;
    }

    // ==================== PropertySchema Mapping ====================

    /**
     * Converts a PropertySchema entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> propertySchemaToItem(PropertySchema propertySchema) {
        if (propertySchema == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(propertySchema.id));
        item.put("propertyName", stringToAttributeValue(propertySchema.propertyName));
        item.put("displayName", stringToAttributeValue(propertySchema.displayName));
        item.put("dataType", enumToAttributeValue(propertySchema.dataType));
        item.put("required", booleanToAttributeValue(propertySchema.required));
        item.put("createdAt", localDateTimeToAttributeValue(propertySchema.createdAt));
        item.put("updatedAt", localDateTimeToAttributeValue(propertySchema.updatedAt));

        if (propertySchema.description != null) {
            item.put("description", stringToAttributeValue(propertySchema.description));
        }

        if (propertySchema.mapping != null && propertySchema.mapping.id != null) {
            item.put("mappingId", uuidToAttributeValue(propertySchema.mapping.id));
        }

        if (propertySchema.defaultValue != null) {
            item.put("defaultValue", objectToAttributeValue(propertySchema.defaultValue));
        }

        if (propertySchema.validationRules != null && !propertySchema.validationRules.isEmpty()) {
            item.put("validationRules", mapToAttributeValue(propertySchema.validationRules));
        }

        if (propertySchema.displayOrder != null) {
            item.put("displayOrder", AttributeValue.builder().n(propertySchema.displayOrder.toString()).build());
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a PropertySchema entity.
     */
    public PropertySchema itemToPropertySchema(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        PropertySchema propertySchema = new PropertySchema();

        propertySchema.id = attributeValueToUuid(item.get("id"));
        propertySchema.propertyName = attributeValueToString(item.get("propertyName"));
        propertySchema.displayName = attributeValueToString(item.get("displayName"));
        propertySchema.dataType = attributeValueToEnum(item.get("dataType"), com.angryss.idp.domain.valueobjects.PropertyDataType.class);
        propertySchema.required = attributeValueToBoolean(item.get("required"));
        propertySchema.createdAt = attributeValueToLocalDateTime(item.get("createdAt"));
        propertySchema.updatedAt = attributeValueToLocalDateTime(item.get("updatedAt"));

        if (item.containsKey("description")) {
            propertySchema.description = attributeValueToString(item.get("description"));
        }

        if (item.containsKey("defaultValue")) {
            propertySchema.defaultValue = attributeValueToObject(item.get("defaultValue"));
        }

        if (item.containsKey("validationRules")) {
            propertySchema.validationRules = attributeValueToMap(item.get("validationRules"));
        }

        if (item.containsKey("displayOrder")) {
            propertySchema.displayOrder = Integer.parseInt(item.get("displayOrder").n());
        }

        // Note: mapping relationship stored as mappingId and must be loaded separately

        return propertySchema;
    }

    // ==================== ApiKey Mapping ====================

    /**
     * Converts an ApiKey entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> apiKeyToItem(ApiKey apiKey) {
        if (apiKey == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(apiKey.id));
        item.put("keyName", stringToAttributeValue(apiKey.keyName));
        item.put("keyHash", stringToAttributeValue(apiKey.keyHash));
        item.put("keyPrefix", stringToAttributeValue(apiKey.keyPrefix));
        item.put("keyType", enumToAttributeValue(apiKey.keyType));
        item.put("createdByEmail", stringToAttributeValue(apiKey.createdByEmail));
        item.put("createdAt", localDateTimeToAttributeValue(apiKey.createdAt));
        item.put("isActive", booleanToAttributeValue(apiKey.isActive));

        if (apiKey.userEmail != null) {
            item.put("userEmail", stringToAttributeValue(apiKey.userEmail));
        }

        if (apiKey.expiresAt != null) {
            item.put("expiresAt", localDateTimeToAttributeValue(apiKey.expiresAt));
        }

        if (apiKey.lastUsedAt != null) {
            item.put("lastUsedAt", localDateTimeToAttributeValue(apiKey.lastUsedAt));
        }

        if (apiKey.revokedAt != null) {
            item.put("revokedAt", localDateTimeToAttributeValue(apiKey.revokedAt));
        }

        if (apiKey.revokedByEmail != null) {
            item.put("revokedByEmail", stringToAttributeValue(apiKey.revokedByEmail));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to an ApiKey entity.
     */
    public ApiKey itemToApiKey(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        ApiKey apiKey = new ApiKey();

        apiKey.id = attributeValueToUuid(item.get("id"));
        apiKey.keyName = attributeValueToString(item.get("keyName"));
        apiKey.keyHash = attributeValueToString(item.get("keyHash"));
        apiKey.keyPrefix = attributeValueToString(item.get("keyPrefix"));
        apiKey.keyType = attributeValueToEnum(item.get("keyType"), com.angryss.idp.domain.valueobjects.ApiKeyType.class);
        apiKey.createdByEmail = attributeValueToString(item.get("createdByEmail"));
        apiKey.createdAt = attributeValueToLocalDateTime(item.get("createdAt"));
        apiKey.isActive = attributeValueToBoolean(item.get("isActive"));

        if (item.containsKey("userEmail")) {
            apiKey.userEmail = attributeValueToString(item.get("userEmail"));
        }

        if (item.containsKey("expiresAt")) {
            apiKey.expiresAt = attributeValueToLocalDateTime(item.get("expiresAt"));
        }

        if (item.containsKey("lastUsedAt")) {
            apiKey.lastUsedAt = attributeValueToLocalDateTime(item.get("lastUsedAt"));
        }

        if (item.containsKey("revokedAt")) {
            apiKey.revokedAt = attributeValueToLocalDateTime(item.get("revokedAt"));
        }

        if (item.containsKey("revokedByEmail")) {
            apiKey.revokedByEmail = attributeValueToString(item.get("revokedByEmail"));
        }

        return apiKey;
    }

    // ==================== AdminAuditLog Mapping ====================

    /**
     * Converts an AdminAuditLog entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> adminAuditLogToItem(AdminAuditLog adminAuditLog) {
        if (adminAuditLog == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(adminAuditLog.getId()));
        item.put("userEmail", stringToAttributeValue(adminAuditLog.getUserEmail()));
        item.put("action", stringToAttributeValue(adminAuditLog.getAction()));
        item.put("entityType", stringToAttributeValue(adminAuditLog.getEntityType()));
        item.put("timestamp", localDateTimeToAttributeValue(adminAuditLog.getTimestamp()));

        if (adminAuditLog.getEntityId() != null) {
            item.put("entityId", uuidToAttributeValue(adminAuditLog.getEntityId()));
        }

        if (adminAuditLog.getChanges() != null && !adminAuditLog.getChanges().isEmpty()) {
            item.put("changes", mapToAttributeValue(adminAuditLog.getChanges()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to an AdminAuditLog entity.
     */
    public AdminAuditLog itemToAdminAuditLog(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        AdminAuditLog adminAuditLog = new AdminAuditLog();

        adminAuditLog.setId(attributeValueToUuid(item.get("id")));
        adminAuditLog.setUserEmail(attributeValueToString(item.get("userEmail")));
        adminAuditLog.setAction(attributeValueToString(item.get("action")));
        adminAuditLog.setEntityType(attributeValueToString(item.get("entityType")));
        adminAuditLog.setTimestamp(attributeValueToLocalDateTime(item.get("timestamp")));

        if (item.containsKey("entityId")) {
            adminAuditLog.setEntityId(attributeValueToUuid(item.get("entityId")));
        }

        if (item.containsKey("changes")) {
            adminAuditLog.setChanges(attributeValueToMap(item.get("changes")));
        }

        return adminAuditLog;
    }

    // ==================== BlueprintResource Mapping ====================

    /**
     * Converts a BlueprintResource entity to a DynamoDB item.
     * Note: SharedInfrastructureConfiguration is stored as a JSON-serialized string.
     */
    public Map<String, AttributeValue> blueprintResourceToItem(BlueprintResource blueprintResource) {
        if (blueprintResource == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(blueprintResource.id));
        item.put("name", stringToAttributeValue(blueprintResource.getName()));
        item.put("isActive", booleanToAttributeValue(blueprintResource.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(blueprintResource.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(blueprintResource.getUpdatedAt()));

        if (blueprintResource.getDescription() != null) {
            item.put("description", stringToAttributeValue(blueprintResource.getDescription()));
        }

        if (blueprintResource.getResourceType() != null && blueprintResource.getResourceType().id != null) {
            item.put("resourceTypeId", uuidToAttributeValue(blueprintResource.getResourceType().id));
        }

        if (blueprintResource.getCloudProvider() != null && blueprintResource.getCloudProvider().id != null) {
            item.put("cloudProviderId", uuidToAttributeValue(blueprintResource.getCloudProvider().id));
        }

        if (blueprintResource.getBlueprint() != null && blueprintResource.getBlueprint().getId() != null) {
            item.put("blueprintId", uuidToAttributeValue(blueprintResource.getBlueprint().getId()));
        }

        if (blueprintResource.getCloudType() != null) {
            item.put("cloudType", stringToAttributeValue(blueprintResource.getCloudType()));
        }

        if (blueprintResource.getCloudSpecificProperties() != null && !blueprintResource.getCloudSpecificProperties().isEmpty()) {
            item.put("cloudSpecificProperties", mapToAttributeValue(blueprintResource.getCloudSpecificProperties()));
        }

        // Store configuration as JSON string (requires Jackson serialization)
        if (blueprintResource.getConfiguration() != null) {
            item.put("configuration", objectToAttributeValue(blueprintResource.getConfiguration()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a BlueprintResource entity.
     * Note: Relationships and configuration deserialization must be handled by repository layer.
     */
    public BlueprintResource itemToBlueprintResource(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        BlueprintResource blueprintResource = new BlueprintResource();

        blueprintResource.id = attributeValueToUuid(item.get("id"));
        blueprintResource.setName(attributeValueToString(item.get("name")));
        blueprintResource.setIsActive(attributeValueToBoolean(item.get("isActive")));
        blueprintResource.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        blueprintResource.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        if (item.containsKey("description")) {
            blueprintResource.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("cloudType")) {
            blueprintResource.setCloudType(attributeValueToString(item.get("cloudType")));
        }

        if (item.containsKey("cloudSpecificProperties")) {
            blueprintResource.setCloudSpecificProperties(attributeValueToMap(item.get("cloudSpecificProperties")));
        }

        // Note: Relationships (resourceType, cloudProvider, blueprint) stored as foreign keys
        // and must be loaded separately. Configuration deserialization requires Jackson.

        return blueprintResource;
    }

    // ==================== Category Mapping ====================

    /**
     * Converts a Category entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> categoryToItem(Category category) {
        if (category == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(category.getId()));
        item.put("name", stringToAttributeValue(category.getName()));
        item.put("isActive", booleanToAttributeValue(category.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(category.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(category.getUpdatedAt()));

        if (category.getDomain() != null && category.getDomain().getId() != null) {
            item.put("domainId", uuidToAttributeValue(category.getDomain().getId()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a Category entity.
     */
    public Category itemToCategory(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        Category category = new Category();

        category.setId(attributeValueToUuid(item.get("id")));
        category.setName(attributeValueToString(item.get("name")));
        category.setIsActive(attributeValueToBoolean(item.get("isActive")));
        category.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        category.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        // Note: domain relationship stored as domainId and must be loaded separately

        return category;
    }

    // ==================== Domain Mapping ====================

    /**
     * Converts a Domain entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> domainToItem(Domain domain) {
        if (domain == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(domain.getId()));
        item.put("name", stringToAttributeValue(domain.getName()));
        item.put("isActive", booleanToAttributeValue(domain.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(domain.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(domain.getUpdatedAt()));

        return item;
    }

    /**
     * Converts a DynamoDB item to a Domain entity.
     */
    public Domain itemToDomain(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        Domain domain = new Domain();

        domain.setId(attributeValueToUuid(item.get("id")));
        domain.setName(attributeValueToString(item.get("name")));
        domain.setIsActive(attributeValueToBoolean(item.get("isActive")));
        domain.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        domain.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        return domain;
    }

    // ==================== EnvironmentConfig Mapping ====================

    /**
     * Converts an EnvironmentConfig entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> environmentConfigToItem(EnvironmentConfig environmentConfig) {
        if (environmentConfig == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(environmentConfig.getId()));
        item.put("name", stringToAttributeValue(environmentConfig.getName()));
        item.put("isActive", booleanToAttributeValue(environmentConfig.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(environmentConfig.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(environmentConfig.getUpdatedAt()));

        if (environmentConfig.getDescription() != null) {
            item.put("description", stringToAttributeValue(environmentConfig.getDescription()));
        }

        if (environmentConfig.getEnvironment() != null && environmentConfig.getEnvironment().getId() != null) {
            item.put("environmentId", uuidToAttributeValue(environmentConfig.getEnvironment().getId()));
        }

        if (environmentConfig.getConfiguration() != null && !environmentConfig.getConfiguration().isEmpty()) {
            item.put("configuration", mapToAttributeValue(environmentConfig.getConfiguration()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to an EnvironmentConfig entity.
     */
    public EnvironmentConfig itemToEnvironmentConfig(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        EnvironmentConfig environmentConfig = new EnvironmentConfig();

        environmentConfig.setId(attributeValueToUuid(item.get("id")));
        environmentConfig.setName(attributeValueToString(item.get("name")));
        environmentConfig.setIsActive(attributeValueToBoolean(item.get("isActive")));
        environmentConfig.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        environmentConfig.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        if (item.containsKey("description")) {
            environmentConfig.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("configuration")) {
            environmentConfig.setConfiguration(attributeValueToMap(item.get("configuration")));
        }

        // Note: environment relationship stored as environmentId and must be loaded separately

        return environmentConfig;
    }

    // ==================== EnvironmentEntity Mapping ====================

    /**
     * Converts an EnvironmentEntity to a DynamoDB item.
     */
    public Map<String, AttributeValue> environmentEntityToItem(EnvironmentEntity environmentEntity) {
        if (environmentEntity == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(environmentEntity.getId()));
        item.put("name", stringToAttributeValue(environmentEntity.getName()));
        item.put("isActive", booleanToAttributeValue(environmentEntity.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(environmentEntity.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(environmentEntity.getUpdatedAt()));

        if (environmentEntity.getDescription() != null) {
            item.put("description", stringToAttributeValue(environmentEntity.getDescription()));
        }

        if (environmentEntity.getCloudProvider() != null && environmentEntity.getCloudProvider().id != null) {
            item.put("cloudProviderId", uuidToAttributeValue(environmentEntity.getCloudProvider().id));
        }

        if (environmentEntity.getBlueprint() != null && environmentEntity.getBlueprint().getId() != null) {
            item.put("blueprintId", uuidToAttributeValue(environmentEntity.getBlueprint().getId()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to an EnvironmentEntity.
     */
    public EnvironmentEntity itemToEnvironmentEntity(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        EnvironmentEntity environmentEntity = new EnvironmentEntity();

        environmentEntity.setId(attributeValueToUuid(item.get("id")));
        environmentEntity.setName(attributeValueToString(item.get("name")));
        environmentEntity.setIsActive(attributeValueToBoolean(item.get("isActive")));
        environmentEntity.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        environmentEntity.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        if (item.containsKey("description")) {
            environmentEntity.setDescription(attributeValueToString(item.get("description")));
        }

        // Note: cloudProvider and blueprint relationships stored as foreign keys
        // and must be loaded separately

        return environmentEntity;
    }

    // ==================== ResourceTypeCloudMapping Mapping ====================

    /**
     * Converts a ResourceTypeCloudMapping entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> resourceTypeCloudMappingToItem(ResourceTypeCloudMapping mapping) {
        if (mapping == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(mapping.id));
        item.put("terraformModuleLocation", stringToAttributeValue(mapping.terraformModuleLocation));
        item.put("moduleLocationType", enumToAttributeValue(mapping.moduleLocationType));
        item.put("enabled", booleanToAttributeValue(mapping.enabled));
        item.put("createdAt", localDateTimeToAttributeValue(mapping.createdAt));
        item.put("updatedAt", localDateTimeToAttributeValue(mapping.updatedAt));

        if (mapping.resourceType != null && mapping.resourceType.id != null) {
            item.put("resourceTypeId", uuidToAttributeValue(mapping.resourceType.id));
        }

        if (mapping.cloudProvider != null && mapping.cloudProvider.id != null) {
            item.put("cloudProviderId", uuidToAttributeValue(mapping.cloudProvider.id));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a ResourceTypeCloudMapping entity.
     */
    public ResourceTypeCloudMapping itemToResourceTypeCloudMapping(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();

        mapping.id = attributeValueToUuid(item.get("id"));
        mapping.terraformModuleLocation = attributeValueToString(item.get("terraformModuleLocation"));
        mapping.moduleLocationType = attributeValueToEnum(item.get("moduleLocationType"), com.angryss.idp.domain.valueobjects.ModuleLocationType.class);
        mapping.enabled = attributeValueToBoolean(item.get("enabled"));
        mapping.createdAt = attributeValueToLocalDateTime(item.get("createdAt"));
        mapping.updatedAt = attributeValueToLocalDateTime(item.get("updatedAt"));

        // Note: resourceType and cloudProvider relationships stored as foreign keys
        // and must be loaded separately

        return mapping;
    }

    // ==================== StackCollection Mapping ====================

    /**
     * Converts a StackCollection entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> stackCollectionToItem(StackCollection stackCollection) {
        if (stackCollection == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(stackCollection.getId()));
        item.put("name", stringToAttributeValue(stackCollection.getName()));
        item.put("isActive", booleanToAttributeValue(stackCollection.getIsActive()));
        item.put("createdAt", localDateTimeToAttributeValue(stackCollection.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(stackCollection.getUpdatedAt()));

        if (stackCollection.getDescription() != null) {
            item.put("description", stringToAttributeValue(stackCollection.getDescription()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a StackCollection entity.
     */
    public StackCollection itemToStackCollection(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        StackCollection stackCollection = new StackCollection();

        stackCollection.setId(attributeValueToUuid(item.get("id")));
        stackCollection.setName(attributeValueToString(item.get("name")));
        stackCollection.setIsActive(attributeValueToBoolean(item.get("isActive")));
        stackCollection.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        stackCollection.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        if (item.containsKey("description")) {
            stackCollection.setDescription(attributeValueToString(item.get("description")));
        }

        return stackCollection;
    }

    // ==================== StackResource Mapping ====================

    /**
     * Converts a StackResource entity to a DynamoDB item.
     */
    public Map<String, AttributeValue> stackResourceToItem(StackResource stackResource) {
        if (stackResource == null) {
            return new HashMap<>();
        }

        Map<String, AttributeValue> item = new HashMap<>();

        item.put("id", uuidToAttributeValue(stackResource.id));
        item.put("name", stringToAttributeValue(stackResource.getName()));
        item.put("createdAt", localDateTimeToAttributeValue(stackResource.getCreatedAt()));
        item.put("updatedAt", localDateTimeToAttributeValue(stackResource.getUpdatedAt()));

        if (stackResource.getDescription() != null) {
            item.put("description", stringToAttributeValue(stackResource.getDescription()));
        }

        if (stackResource.getResourceType() != null && stackResource.getResourceType().id != null) {
            item.put("resourceTypeId", uuidToAttributeValue(stackResource.getResourceType().id));
        }

        if (stackResource.getCloudProvider() != null && stackResource.getCloudProvider().id != null) {
            item.put("cloudProviderId", uuidToAttributeValue(stackResource.getCloudProvider().id));
        }

        if (stackResource.getStack() != null && stackResource.getStack().getId() != null) {
            item.put("stackId", uuidToAttributeValue(stackResource.getStack().getId()));
        }

        if (stackResource.getConfiguration() != null && !stackResource.getConfiguration().isEmpty()) {
            item.put("configuration", mapToAttributeValue(stackResource.getConfiguration()));
        }

        return item;
    }

    /**
     * Converts a DynamoDB item to a StackResource entity.
     */
    public StackResource itemToStackResource(Map<String, AttributeValue> item) {
        if (item == null || item.isEmpty()) {
            return null;
        }

        StackResource stackResource = new StackResource();

        stackResource.id = attributeValueToUuid(item.get("id"));
        stackResource.setName(attributeValueToString(item.get("name")));
        stackResource.setCreatedAt(attributeValueToLocalDateTime(item.get("createdAt")));
        stackResource.setUpdatedAt(attributeValueToLocalDateTime(item.get("updatedAt")));

        if (item.containsKey("description")) {
            stackResource.setDescription(attributeValueToString(item.get("description")));
        }

        if (item.containsKey("configuration")) {
            stackResource.setConfiguration(attributeValueToMap(item.get("configuration")));
        }

        // Note: resourceType, cloudProvider, and stack relationships stored as foreign keys
        // and must be loaded separately

        return stackResource;
    }
}
