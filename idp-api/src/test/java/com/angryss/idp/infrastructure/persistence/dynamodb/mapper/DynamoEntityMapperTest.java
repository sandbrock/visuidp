package com.angryss.idp.infrastructure.persistence.dynamodb.mapper;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Domain;
import com.angryss.idp.domain.entities.StackCollection;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DynamoEntityMapper.
 * Tests conversion between domain entities and DynamoDB AttributeValues.
 */
class DynamoEntityMapperTest {

    private DynamoEntityMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new DynamoEntityMapper();
    }

    // ==================== UUID Conversion Tests ====================

    @Test
    void testUuidToAttributeValue_withValidUuid() {
        UUID uuid = UUID.randomUUID();
        AttributeValue result = mapper.uuidToAttributeValue(uuid);
        
        assertNotNull(result);
        assertEquals(uuid.toString(), result.s());
    }

    @Test
    void testUuidToAttributeValue_withNull() {
        AttributeValue result = mapper.uuidToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToUuid_withValidValue() {
        UUID uuid = UUID.randomUUID();
        AttributeValue av = AttributeValue.builder().s(uuid.toString()).build();
        
        UUID result = mapper.attributeValueToUuid(av);
        
        assertEquals(uuid, result);
    }

    @Test
    void testAttributeValueToUuid_withNull() {
        UUID result = mapper.attributeValueToUuid(null);
        assertNull(result);
    }

    @Test
    void testAttributeValueToUuid_withNullAttributeValue() {
        AttributeValue av = AttributeValue.builder().nul(true).build();
        UUID result = mapper.attributeValueToUuid(av);
        assertNull(result);
    }

    // ==================== LocalDateTime Conversion Tests ====================

    @Test
    void testLocalDateTimeToAttributeValue_withValidDateTime() {
        LocalDateTime dateTime = LocalDateTime.of(2024, 1, 15, 10, 30, 45);
        AttributeValue result = mapper.localDateTimeToAttributeValue(dateTime);
        
        assertNotNull(result);
        assertEquals("2024-01-15T10:30:45", result.s());
    }

    @Test
    void testLocalDateTimeToAttributeValue_withNull() {
        AttributeValue result = mapper.localDateTimeToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToLocalDateTime_withValidValue() {
        AttributeValue av = AttributeValue.builder().s("2024-01-15T10:30:45").build();
        
        LocalDateTime result = mapper.attributeValueToLocalDateTime(av);
        
        assertEquals(LocalDateTime.of(2024, 1, 15, 10, 30, 45), result);
    }

    @Test
    void testAttributeValueToLocalDateTime_withNull() {
        LocalDateTime result = mapper.attributeValueToLocalDateTime(null);
        assertNull(result);
    }

    // ==================== Enum Conversion Tests ====================

    @Test
    void testEnumToAttributeValue_withValidEnum() {
        AttributeValue result = mapper.enumToAttributeValue(StackType.RESTFUL_API);
        
        assertNotNull(result);
        assertEquals("RESTFUL_API", result.s());
    }

    @Test
    void testEnumToAttributeValue_withNull() {
        AttributeValue result = mapper.enumToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToEnum_withValidValue() {
        AttributeValue av = AttributeValue.builder().s("RESTFUL_API").build();
        
        StackType result = mapper.attributeValueToEnum(av, StackType.class);
        
        assertEquals(StackType.RESTFUL_API, result);
    }

    @Test
    void testAttributeValueToEnum_withNull() {
        StackType result = mapper.attributeValueToEnum(null, StackType.class);
        assertNull(result);
    }

    // ==================== String Conversion Tests ====================

    @Test
    void testStringToAttributeValue_withValidString() {
        AttributeValue result = mapper.stringToAttributeValue("test-value");
        
        assertNotNull(result);
        assertEquals("test-value", result.s());
    }

    @Test
    void testStringToAttributeValue_withNull() {
        AttributeValue result = mapper.stringToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToString_withValidValue() {
        AttributeValue av = AttributeValue.builder().s("test-value").build();
        
        String result = mapper.attributeValueToString(av);
        
        assertEquals("test-value", result);
    }

    @Test
    void testAttributeValueToString_withNull() {
        String result = mapper.attributeValueToString(null);
        assertNull(result);
    }

    // ==================== Boolean Conversion Tests ====================

    @Test
    void testBooleanToAttributeValue_withTrue() {
        AttributeValue result = mapper.booleanToAttributeValue(true);
        
        assertNotNull(result);
        assertTrue(result.bool());
    }

    @Test
    void testBooleanToAttributeValue_withFalse() {
        AttributeValue result = mapper.booleanToAttributeValue(false);
        
        assertNotNull(result);
        assertFalse(result.bool());
    }

    @Test
    void testBooleanToAttributeValue_withNull() {
        AttributeValue result = mapper.booleanToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToBoolean_withTrue() {
        AttributeValue av = AttributeValue.builder().bool(true).build();
        
        Boolean result = mapper.attributeValueToBoolean(av);
        
        assertTrue(result);
    }

    @Test
    void testAttributeValueToBoolean_withFalse() {
        AttributeValue av = AttributeValue.builder().bool(false).build();
        
        Boolean result = mapper.attributeValueToBoolean(av);
        
        assertFalse(result);
    }

    @Test
    void testAttributeValueToBoolean_withNull() {
        Boolean result = mapper.attributeValueToBoolean(null);
        assertNull(result);
    }

    // ==================== Map Conversion Tests ====================

    @Test
    void testMapToAttributeValue_withSimpleMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("key1", "value1");
        map.put("key2", 42);
        map.put("key3", true);
        
        AttributeValue result = mapper.mapToAttributeValue(map);
        
        assertNotNull(result);
        assertTrue(result.hasM());
        assertEquals("value1", result.m().get("key1").s());
        assertEquals("42", result.m().get("key2").n());
        assertTrue(result.m().get("key3").bool());
    }

    @Test
    void testMapToAttributeValue_withNestedMap() {
        Map<String, Object> innerMap = new HashMap<>();
        innerMap.put("nested1", "nestedValue");
        innerMap.put("nested2", 100);
        
        Map<String, Object> outerMap = new HashMap<>();
        outerMap.put("outer1", "outerValue");
        outerMap.put("outer2", innerMap);
        
        AttributeValue result = mapper.mapToAttributeValue(outerMap);
        
        assertNotNull(result);
        assertTrue(result.hasM());
        assertEquals("outerValue", result.m().get("outer1").s());
        assertTrue(result.m().get("outer2").hasM());
        assertEquals("nestedValue", result.m().get("outer2").m().get("nested1").s());
        assertEquals("100", result.m().get("outer2").m().get("nested2").n());
    }

    @Test
    void testMapToAttributeValue_withNull() {
        AttributeValue result = mapper.mapToAttributeValue(null);
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testMapToAttributeValue_withEmptyMap() {
        AttributeValue result = mapper.mapToAttributeValue(new HashMap<>());
        
        assertNotNull(result);
        assertTrue(result.nul());
    }

    @Test
    void testAttributeValueToMap_withSimpleMap() {
        Map<String, AttributeValue> dynamoMap = new HashMap<>();
        dynamoMap.put("key1", AttributeValue.builder().s("value1").build());
        dynamoMap.put("key2", AttributeValue.builder().n("42").build());
        dynamoMap.put("key3", AttributeValue.builder().bool(true).build());
        
        AttributeValue av = AttributeValue.builder().m(dynamoMap).build();
        
        Map<String, Object> result = mapper.attributeValueToMap(av);
        
        assertNotNull(result);
        assertEquals("value1", result.get("key1"));
        assertEquals(42, result.get("key2"));
        assertEquals(true, result.get("key3"));
    }

    @Test
    void testAttributeValueToMap_withNestedMap() {
        Map<String, AttributeValue> innerDynamoMap = new HashMap<>();
        innerDynamoMap.put("nested1", AttributeValue.builder().s("nestedValue").build());
        innerDynamoMap.put("nested2", AttributeValue.builder().n("100").build());
        
        Map<String, AttributeValue> outerDynamoMap = new HashMap<>();
        outerDynamoMap.put("outer1", AttributeValue.builder().s("outerValue").build());
        outerDynamoMap.put("outer2", AttributeValue.builder().m(innerDynamoMap).build());
        
        AttributeValue av = AttributeValue.builder().m(outerDynamoMap).build();
        
        Map<String, Object> result = mapper.attributeValueToMap(av);
        
        assertNotNull(result);
        assertEquals("outerValue", result.get("outer1"));
        assertTrue(result.get("outer2") instanceof Map);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> innerResult = (Map<String, Object>) result.get("outer2");
        assertEquals("nestedValue", innerResult.get("nested1"));
        assertEquals(100, innerResult.get("nested2"));
    }

    @Test
    void testAttributeValueToMap_withNull() {
        Map<String, Object> result = mapper.attributeValueToMap(null);
        assertNull(result);
    }

    @Test
    void testAttributeValueToMap_withNullAttributeValue() {
        AttributeValue av = AttributeValue.builder().nul(true).build();
        Map<String, Object> result = mapper.attributeValueToMap(av);
        assertNull(result);
    }

    // ==================== Stack Mapping Tests ====================

    @Test
    void testStackToItem_withAllRequiredFields() {
        com.angryss.idp.domain.entities.Stack stack = new com.angryss.idp.domain.entities.Stack();
        stack.setId(UUID.randomUUID());
        stack.setName("test-stack");
        stack.setCloudName("test-cloud-name");
        stack.setRoutePath("/test/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setCreatedBy("user@example.com");
        stack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        stack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));
        
        Map<String, AttributeValue> result = mapper.stackToItem(stack);
        
        assertNotNull(result);
        assertEquals(stack.getId().toString(), result.get("id").s());
        assertEquals("test-stack", result.get("name").s());
        assertEquals("test-cloud-name", result.get("cloudName").s());
        assertEquals("/test/", result.get("routePath").s());
        assertEquals("RESTFUL_API", result.get("stackType").s());
        assertEquals("user@example.com", result.get("createdBy").s());
        assertEquals("2024-01-15T10:30:00", result.get("createdAt").s());
        assertEquals("2024-01-15T11:30:00", result.get("updatedAt").s());
    }

    @Test
    void testStackToItem_withOptionalFields() {
        com.angryss.idp.domain.entities.Stack stack = new com.angryss.idp.domain.entities.Stack();
        stack.setId(UUID.randomUUID());
        stack.setName("test-stack");
        stack.setCloudName("test-cloud-name");
        stack.setRoutePath("/test/");
        stack.setStackType(StackType.JAVASCRIPT_WEB_APPLICATION);
        stack.setCreatedBy("user@example.com");
        stack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        stack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));
        
        // Optional fields
        stack.setDescription("Test description");
        stack.setRepositoryURL("https://github.com/test/repo");
        stack.setProgrammingLanguage(ProgrammingLanguage.QUARKUS);
        stack.setIsPublic(true);
        stack.setEphemeralPrefix("ephemeral-");
        
        Map<String, AttributeValue> result = mapper.stackToItem(stack);
        
        assertNotNull(result);
        assertEquals("Test description", result.get("description").s());
        assertEquals("https://github.com/test/repo", result.get("repositoryURL").s());
        assertEquals("QUARKUS", result.get("programmingLanguage").s());
        assertTrue(result.get("isPublic").bool());
        assertEquals("ephemeral-", result.get("ephemeralPrefix").s());
    }

    @Test
    void testStackToItem_withRelationships() {
        com.angryss.idp.domain.entities.Stack stack = new com.angryss.idp.domain.entities.Stack();
        stack.setId(UUID.randomUUID());
        stack.setName("test-stack");
        stack.setCloudName("test-cloud-name");
        stack.setRoutePath("/test/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setCreatedBy("user@example.com");
        stack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        stack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));
        
        // Relationships
        Team team = new Team();
        team.setId(UUID.randomUUID());
        stack.setTeam(team);
        
        StackCollection collection = new StackCollection();
        collection.setId(UUID.randomUUID());
        stack.setStackCollection(collection);
        
        Domain domain = new Domain();
        domain.setId(UUID.randomUUID());
        stack.setDomain(domain);
        
        Category category = new Category();
        category.setId(UUID.randomUUID());
        stack.setCategory(category);
        
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.id = UUID.randomUUID();
        stack.setCloudProvider(cloudProvider);
        
        Blueprint blueprint = new Blueprint();
        blueprint.setId(UUID.randomUUID());
        stack.setBlueprint(blueprint);
        
        Map<String, AttributeValue> result = mapper.stackToItem(stack);
        
        assertNotNull(result);
        assertEquals(team.getId().toString(), result.get("teamId").s());
        assertEquals(collection.getId().toString(), result.get("stackCollectionId").s());
        assertEquals(domain.getId().toString(), result.get("domainId").s());
        assertEquals(category.getId().toString(), result.get("categoryId").s());
        assertEquals(cloudProvider.id.toString(), result.get("cloudProviderId").s());
        assertEquals(blueprint.getId().toString(), result.get("blueprintId").s());
    }

    @Test
    void testStackToItem_withConfigurationMap() {
        com.angryss.idp.domain.entities.Stack stack = new com.angryss.idp.domain.entities.Stack();
        stack.setId(UUID.randomUUID());
        stack.setName("test-stack");
        stack.setCloudName("test-cloud-name");
        stack.setRoutePath("/test/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setCreatedBy("user@example.com");
        stack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        stack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));
        
        // Configuration map
        Map<String, Object> config = new HashMap<>();
        config.put("port", 8080);
        config.put("timeout", 30);
        config.put("enabled", true);
        
        Map<String, Object> nestedConfig = new HashMap<>();
        nestedConfig.put("host", "localhost");
        nestedConfig.put("ssl", false);
        config.put("database", nestedConfig);
        
        stack.setConfiguration(config);
        
        Map<String, AttributeValue> result = mapper.stackToItem(stack);
        
        assertNotNull(result);
        assertTrue(result.containsKey("configuration"));
        assertTrue(result.get("configuration").hasM());
        
        Map<String, AttributeValue> configMap = result.get("configuration").m();
        assertEquals("8080", configMap.get("port").n());
        assertEquals("30", configMap.get("timeout").n());
        assertTrue(configMap.get("enabled").bool());
        assertTrue(configMap.get("database").hasM());
        assertEquals("localhost", configMap.get("database").m().get("host").s());
        assertFalse(configMap.get("database").m().get("ssl").bool());
    }

    @Test
    void testStackToItem_withNullStack() {
        Map<String, AttributeValue> result = mapper.stackToItem(null);
        
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testItemToStack_withAllRequiredFields() {
        UUID stackId = UUID.randomUUID();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", AttributeValue.builder().s(stackId.toString()).build());
        item.put("name", AttributeValue.builder().s("test-stack").build());
        item.put("cloudName", AttributeValue.builder().s("test-cloud-name").build());
        item.put("routePath", AttributeValue.builder().s("/test/").build());
        item.put("stackType", AttributeValue.builder().s("RESTFUL_API").build());
        item.put("createdBy", AttributeValue.builder().s("user@example.com").build());
        item.put("createdAt", AttributeValue.builder().s("2024-01-15T10:30:00").build());
        item.put("updatedAt", AttributeValue.builder().s("2024-01-15T11:30:00").build());
        
        com.angryss.idp.domain.entities.Stack result = mapper.itemToStack(item);
        
        assertNotNull(result);
        assertEquals(stackId, result.getId());
        assertEquals("test-stack", result.getName());
        assertEquals("test-cloud-name", result.getCloudName());
        assertEquals("/test/", result.getRoutePath());
        assertEquals(StackType.RESTFUL_API, result.getStackType());
        assertEquals("user@example.com", result.getCreatedBy());
        assertEquals(LocalDateTime.of(2024, 1, 15, 10, 30), result.getCreatedAt());
        assertEquals(LocalDateTime.of(2024, 1, 15, 11, 30), result.getUpdatedAt());
    }

    @Test
    void testItemToStack_withOptionalFields() {
        UUID stackId = UUID.randomUUID();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", AttributeValue.builder().s(stackId.toString()).build());
        item.put("name", AttributeValue.builder().s("test-stack").build());
        item.put("cloudName", AttributeValue.builder().s("test-cloud-name").build());
        item.put("routePath", AttributeValue.builder().s("/test/").build());
        item.put("stackType", AttributeValue.builder().s("JAVASCRIPT_WEB_APPLICATION").build());
        item.put("createdBy", AttributeValue.builder().s("user@example.com").build());
        item.put("createdAt", AttributeValue.builder().s("2024-01-15T10:30:00").build());
        item.put("updatedAt", AttributeValue.builder().s("2024-01-15T11:30:00").build());
        
        // Optional fields
        item.put("description", AttributeValue.builder().s("Test description").build());
        item.put("repositoryURL", AttributeValue.builder().s("https://github.com/test/repo").build());
        item.put("programmingLanguage", AttributeValue.builder().s("QUARKUS").build());
        item.put("isPublic", AttributeValue.builder().bool(true).build());
        item.put("ephemeralPrefix", AttributeValue.builder().s("ephemeral-").build());
        
        com.angryss.idp.domain.entities.Stack result = mapper.itemToStack(item);
        
        assertNotNull(result);
        assertEquals("Test description", result.getDescription());
        assertEquals("https://github.com/test/repo", result.getRepositoryURL());
        assertEquals(ProgrammingLanguage.QUARKUS, result.getProgrammingLanguage());
        assertTrue(result.getIsPublic());
        assertEquals("ephemeral-", result.getEphemeralPrefix());
    }

    @Test
    void testItemToStack_withConfigurationMap() {
        UUID stackId = UUID.randomUUID();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", AttributeValue.builder().s(stackId.toString()).build());
        item.put("name", AttributeValue.builder().s("test-stack").build());
        item.put("cloudName", AttributeValue.builder().s("test-cloud-name").build());
        item.put("routePath", AttributeValue.builder().s("/test/").build());
        item.put("stackType", AttributeValue.builder().s("RESTFUL_API").build());
        item.put("createdBy", AttributeValue.builder().s("user@example.com").build());
        item.put("createdAt", AttributeValue.builder().s("2024-01-15T10:30:00").build());
        item.put("updatedAt", AttributeValue.builder().s("2024-01-15T11:30:00").build());
        
        // Configuration map
        Map<String, AttributeValue> nestedDbConfig = new HashMap<>();
        nestedDbConfig.put("host", AttributeValue.builder().s("localhost").build());
        nestedDbConfig.put("ssl", AttributeValue.builder().bool(false).build());
        
        Map<String, AttributeValue> configMap = new HashMap<>();
        configMap.put("port", AttributeValue.builder().n("8080").build());
        configMap.put("timeout", AttributeValue.builder().n("30").build());
        configMap.put("enabled", AttributeValue.builder().bool(true).build());
        configMap.put("database", AttributeValue.builder().m(nestedDbConfig).build());
        
        item.put("configuration", AttributeValue.builder().m(configMap).build());
        
        com.angryss.idp.domain.entities.Stack result = mapper.itemToStack(item);
        
        assertNotNull(result);
        assertNotNull(result.getConfiguration());
        assertEquals(8080, result.getConfiguration().get("port"));
        assertEquals(30, result.getConfiguration().get("timeout"));
        assertEquals(true, result.getConfiguration().get("enabled"));
        
        @SuppressWarnings("unchecked")
        Map<String, Object> dbConfig = (Map<String, Object>) result.getConfiguration().get("database");
        assertNotNull(dbConfig);
        assertEquals("localhost", dbConfig.get("host"));
        assertEquals(false, dbConfig.get("ssl"));
    }

    @Test
    void testItemToStack_withNullItem() {
        com.angryss.idp.domain.entities.Stack result = mapper.itemToStack(null);
        assertNull(result);
    }

    @Test
    void testItemToStack_withEmptyItem() {
        com.angryss.idp.domain.entities.Stack result = mapper.itemToStack(new HashMap<>());
        assertNull(result);
    }

    @Test
    void testStackToItem_withNullOptionalFields() {
        com.angryss.idp.domain.entities.Stack stack = new com.angryss.idp.domain.entities.Stack();
        stack.setId(UUID.randomUUID());
        stack.setName("test-stack");
        stack.setCloudName("test-cloud-name");
        stack.setRoutePath("/test/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setCreatedBy("user@example.com");
        stack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        stack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));
        
        // Explicitly set optional fields to null
        stack.setDescription(null);
        stack.setRepositoryURL(null);
        stack.setProgrammingLanguage(null);
        stack.setIsPublic(null);
        stack.setEphemeralPrefix(null);
        
        Map<String, AttributeValue> result = mapper.stackToItem(stack);
        
        assertNotNull(result);
        assertFalse(result.containsKey("description"));
        assertFalse(result.containsKey("repositoryURL"));
        assertFalse(result.containsKey("programmingLanguage"));
        assertFalse(result.containsKey("isPublic"));
        assertFalse(result.containsKey("ephemeralPrefix"));
    }

    // ==================== Bidirectional Conversion Tests ====================

    @Test
    void testStackBidirectionalConversion_withAllFields() {
        // Create a complete stack
        com.angryss.idp.domain.entities.Stack originalStack = new com.angryss.idp.domain.entities.Stack();
        originalStack.setId(UUID.randomUUID());
        originalStack.setName("test-stack");
        originalStack.setDescription("Test description");
        originalStack.setCloudName("test-cloud-name");
        originalStack.setRoutePath("/test/");
        originalStack.setRepositoryURL("https://github.com/test/repo");
        originalStack.setStackType(StackType.EVENT_DRIVEN_API);
        originalStack.setProgrammingLanguage(ProgrammingLanguage.NODE_JS);
        originalStack.setIsPublic(false);
        originalStack.setCreatedBy("user@example.com");
        originalStack.setEphemeralPrefix("eph-");
        originalStack.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30, 45));
        originalStack.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30, 45));
        
        Map<String, Object> config = new HashMap<>();
        config.put("key1", "value1");
        config.put("key2", 123);
        originalStack.setConfiguration(config);
        
        // Convert to item and back
        Map<String, AttributeValue> item = mapper.stackToItem(originalStack);
        com.angryss.idp.domain.entities.Stack convertedStack = mapper.itemToStack(item);
        
        // Verify all fields match
        assertNotNull(convertedStack);
        assertEquals(originalStack.getId(), convertedStack.getId());
        assertEquals(originalStack.getName(), convertedStack.getName());
        assertEquals(originalStack.getDescription(), convertedStack.getDescription());
        assertEquals(originalStack.getCloudName(), convertedStack.getCloudName());
        assertEquals(originalStack.getRoutePath(), convertedStack.getRoutePath());
        assertEquals(originalStack.getRepositoryURL(), convertedStack.getRepositoryURL());
        assertEquals(originalStack.getStackType(), convertedStack.getStackType());
        assertEquals(originalStack.getProgrammingLanguage(), convertedStack.getProgrammingLanguage());
        assertEquals(originalStack.getIsPublic(), convertedStack.getIsPublic());
        assertEquals(originalStack.getCreatedBy(), convertedStack.getCreatedBy());
        assertEquals(originalStack.getEphemeralPrefix(), convertedStack.getEphemeralPrefix());
        assertEquals(originalStack.getCreatedAt(), convertedStack.getCreatedAt());
        assertEquals(originalStack.getUpdatedAt(), convertedStack.getUpdatedAt());
        assertEquals(originalStack.getConfiguration(), convertedStack.getConfiguration());
    }

    // ==================== Blueprint Mapping Tests ====================

    @Test
    void testBlueprintToItem_withRequiredFields() {
        Blueprint blueprint = new Blueprint();
        blueprint.setId(UUID.randomUUID());
        blueprint.setName("test-blueprint");
        blueprint.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        blueprint.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> result = mapper.blueprintToItem(blueprint);

        assertNotNull(result);
        assertEquals(blueprint.getId().toString(), result.get("id").s());
        assertEquals("test-blueprint", result.get("name").s());
        assertEquals("2024-01-15T10:30:00", result.get("createdAt").s());
        assertEquals("2024-01-15T11:30:00", result.get("updatedAt").s());
    }

    @Test
    void testBlueprintBidirectionalConversion() {
        Blueprint original = new Blueprint();
        original.setId(UUID.randomUUID());
        original.setName("test-blueprint");
        original.setDescription("Test description");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.blueprintToItem(original);
        Blueprint converted = mapper.itemToBlueprint(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== Team Mapping Tests ====================

    @Test
    void testTeamBidirectionalConversion() {
        Team original = new Team();
        original.setId(UUID.randomUUID());
        original.setName("test-team");
        original.setDescription("Test description");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.teamToItem(original);
        Team converted = mapper.itemToTeam(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== CloudProvider Mapping Tests ====================

    @Test
    void testCloudProviderBidirectionalConversion() {
        CloudProvider original = new CloudProvider();
        original.id = UUID.randomUUID();
        original.name = "aws";
        original.displayName = "Amazon Web Services";
        original.description = "AWS cloud provider";
        original.enabled = true;
        original.createdAt = LocalDateTime.of(2024, 1, 15, 10, 30);
        original.updatedAt = LocalDateTime.of(2024, 1, 15, 11, 30);

        Map<String, AttributeValue> item = mapper.cloudProviderToItem(original);
        CloudProvider converted = mapper.itemToCloudProvider(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.name, converted.name);
        assertEquals(original.displayName, converted.displayName);
        assertEquals(original.description, converted.description);
        assertEquals(original.enabled, converted.enabled);
        assertEquals(original.createdAt, converted.createdAt);
        assertEquals(original.updatedAt, converted.updatedAt);
    }

    // ==================== ResourceType Mapping Tests ====================

    @Test
    void testResourceTypeBidirectionalConversion() {
        com.angryss.idp.domain.entities.ResourceType original = new com.angryss.idp.domain.entities.ResourceType();
        original.id = UUID.randomUUID();
        original.name = "database";
        original.displayName = "Database";
        original.description = "Database resource";
        original.category = com.angryss.idp.domain.valueobjects.ResourceCategory.NON_SHARED;
        original.enabled = true;
        original.createdAt = LocalDateTime.of(2024, 1, 15, 10, 30);
        original.updatedAt = LocalDateTime.of(2024, 1, 15, 11, 30);

        Map<String, AttributeValue> item = mapper.resourceTypeToItem(original);
        com.angryss.idp.domain.entities.ResourceType converted = mapper.itemToResourceType(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.name, converted.name);
        assertEquals(original.displayName, converted.displayName);
        assertEquals(original.description, converted.description);
        assertEquals(original.category, converted.category);
        assertEquals(original.enabled, converted.enabled);
        assertEquals(original.createdAt, converted.createdAt);
        assertEquals(original.updatedAt, converted.updatedAt);
    }

    // ==================== PropertySchema Mapping Tests ====================

    @Test
    void testPropertySchemaBidirectionalConversion() {
        com.angryss.idp.domain.entities.PropertySchema original = new com.angryss.idp.domain.entities.PropertySchema();
        original.id = UUID.randomUUID();
        original.propertyName = "port";
        original.displayName = "Port Number";
        original.description = "Service port";
        original.dataType = com.angryss.idp.domain.valueobjects.PropertyDataType.NUMBER;
        original.required = true;
        original.defaultValue = 8080;
        original.displayOrder = 1;
        original.createdAt = LocalDateTime.of(2024, 1, 15, 10, 30);
        original.updatedAt = LocalDateTime.of(2024, 1, 15, 11, 30);

        Map<String, Object> validationRules = new HashMap<>();
        validationRules.put("min", 1);
        validationRules.put("max", 65535);
        original.validationRules = validationRules;

        Map<String, AttributeValue> item = mapper.propertySchemaToItem(original);
        com.angryss.idp.domain.entities.PropertySchema converted = mapper.itemToPropertySchema(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.propertyName, converted.propertyName);
        assertEquals(original.displayName, converted.displayName);
        assertEquals(original.description, converted.description);
        assertEquals(original.dataType, converted.dataType);
        assertEquals(original.required, converted.required);
        assertEquals(original.defaultValue, converted.defaultValue);
        assertEquals(original.displayOrder, converted.displayOrder);
        assertEquals(original.validationRules, converted.validationRules);
        assertEquals(original.createdAt, converted.createdAt);
        assertEquals(original.updatedAt, converted.updatedAt);
    }

    // ==================== ApiKey Mapping Tests ====================

    @Test
    void testApiKeyBidirectionalConversion() {
        com.angryss.idp.domain.entities.ApiKey original = new com.angryss.idp.domain.entities.ApiKey();
        original.id = UUID.randomUUID();
        original.keyName = "test-key";
        original.keyHash = "hash123";
        original.keyPrefix = "idp_";
        original.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        original.createdByEmail = "creator@example.com";
        original.userEmail = "user@example.com";
        original.isActive = true;
        original.createdAt = LocalDateTime.of(2024, 1, 15, 10, 30);
        original.expiresAt = LocalDateTime.of(2025, 1, 15, 10, 30);
        original.lastUsedAt = LocalDateTime.of(2024, 2, 1, 14, 20);

        Map<String, AttributeValue> item = mapper.apiKeyToItem(original);
        com.angryss.idp.domain.entities.ApiKey converted = mapper.itemToApiKey(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.keyName, converted.keyName);
        assertEquals(original.keyHash, converted.keyHash);
        assertEquals(original.keyPrefix, converted.keyPrefix);
        assertEquals(original.keyType, converted.keyType);
        assertEquals(original.createdByEmail, converted.createdByEmail);
        assertEquals(original.userEmail, converted.userEmail);
        assertEquals(original.isActive, converted.isActive);
        assertEquals(original.createdAt, converted.createdAt);
        assertEquals(original.expiresAt, converted.expiresAt);
        assertEquals(original.lastUsedAt, converted.lastUsedAt);
    }

    // ==================== AdminAuditLog Mapping Tests ====================

    @Test
    void testAdminAuditLogBidirectionalConversion() {
        com.angryss.idp.domain.entities.AdminAuditLog original = new com.angryss.idp.domain.entities.AdminAuditLog();
        original.setId(UUID.randomUUID());
        original.setUserEmail("admin@example.com");
        original.setAction("CREATE");
        original.setEntityType("Stack");
        original.setEntityId(UUID.randomUUID());
        original.setTimestamp(LocalDateTime.of(2024, 1, 15, 10, 30));

        Map<String, Object> changes = new HashMap<>();
        changes.put("name", "new-stack");
        changes.put("type", "API");
        original.setChanges(changes);

        Map<String, AttributeValue> item = mapper.adminAuditLogToItem(original);
        com.angryss.idp.domain.entities.AdminAuditLog converted = mapper.itemToAdminAuditLog(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getUserEmail(), converted.getUserEmail());
        assertEquals(original.getAction(), converted.getAction());
        assertEquals(original.getEntityType(), converted.getEntityType());
        assertEquals(original.getEntityId(), converted.getEntityId());
        assertEquals(original.getTimestamp(), converted.getTimestamp());
        assertEquals(original.getChanges(), converted.getChanges());
    }

    // ==================== Category Mapping Tests ====================

    @Test
    void testCategoryBidirectionalConversion() {
        Category original = new Category();
        original.setId(UUID.randomUUID());
        original.setName("test-category");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.categoryToItem(original);
        Category converted = mapper.itemToCategory(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== Domain Mapping Tests ====================

    @Test
    void testDomainBidirectionalConversion() {
        Domain original = new Domain();
        original.setId(UUID.randomUUID());
        original.setName("test-domain");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.domainToItem(original);
        Domain converted = mapper.itemToDomain(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== EnvironmentConfig Mapping Tests ====================

    @Test
    void testEnvironmentConfigBidirectionalConversion() {
        com.angryss.idp.domain.entities.EnvironmentConfig original = new com.angryss.idp.domain.entities.EnvironmentConfig();
        original.setId(UUID.randomUUID());
        original.setName("test-config");
        original.setDescription("Test configuration");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, Object> config = new HashMap<>();
        config.put("key1", "value1");
        config.put("key2", 42);
        original.setConfiguration(config);

        Map<String, AttributeValue> item = mapper.environmentConfigToItem(original);
        com.angryss.idp.domain.entities.EnvironmentConfig converted = mapper.itemToEnvironmentConfig(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getConfiguration(), converted.getConfiguration());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== EnvironmentEntity Mapping Tests ====================

    @Test
    void testEnvironmentEntityBidirectionalConversion() {
        com.angryss.idp.domain.entities.EnvironmentEntity original = new com.angryss.idp.domain.entities.EnvironmentEntity();
        original.setId(UUID.randomUUID());
        original.setName("test-environment");
        original.setDescription("Test environment");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.environmentEntityToItem(original);
        com.angryss.idp.domain.entities.EnvironmentEntity converted = mapper.itemToEnvironmentEntity(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== ResourceTypeCloudMapping Mapping Tests ====================

    @Test
    void testResourceTypeCloudMappingBidirectionalConversion() {
        com.angryss.idp.domain.entities.ResourceTypeCloudMapping original = new com.angryss.idp.domain.entities.ResourceTypeCloudMapping();
        original.id = UUID.randomUUID();
        original.terraformModuleLocation = "git::https://github.com/example/module.git";
        original.moduleLocationType = com.angryss.idp.domain.valueobjects.ModuleLocationType.GIT;
        original.enabled = true;
        original.createdAt = LocalDateTime.of(2024, 1, 15, 10, 30);
        original.updatedAt = LocalDateTime.of(2024, 1, 15, 11, 30);

        Map<String, AttributeValue> item = mapper.resourceTypeCloudMappingToItem(original);
        com.angryss.idp.domain.entities.ResourceTypeCloudMapping converted = mapper.itemToResourceTypeCloudMapping(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.terraformModuleLocation, converted.terraformModuleLocation);
        assertEquals(original.moduleLocationType, converted.moduleLocationType);
        assertEquals(original.enabled, converted.enabled);
        assertEquals(original.createdAt, converted.createdAt);
        assertEquals(original.updatedAt, converted.updatedAt);
    }

    // ==================== StackCollection Mapping Tests ====================

    @Test
    void testStackCollectionBidirectionalConversion() {
        StackCollection original = new StackCollection();
        original.setId(UUID.randomUUID());
        original.setName("test-collection");
        original.setDescription("Test collection");
        original.setIsActive(true);
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, AttributeValue> item = mapper.stackCollectionToItem(original);
        StackCollection converted = mapper.itemToStackCollection(item);

        assertNotNull(converted);
        assertEquals(original.getId(), converted.getId());
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== StackResource Mapping Tests ====================

    @Test
    void testStackResourceBidirectionalConversion() {
        com.angryss.idp.domain.entities.StackResource original = new com.angryss.idp.domain.entities.StackResource();
        original.id = UUID.randomUUID();
        original.setName("test-resource");
        original.setDescription("Test resource");
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, Object> config = new HashMap<>();
        config.put("size", "large");
        config.put("replicas", 3);
        original.setConfiguration(config);

        Map<String, AttributeValue> item = mapper.stackResourceToItem(original);
        com.angryss.idp.domain.entities.StackResource converted = mapper.itemToStackResource(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getConfiguration(), converted.getConfiguration());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }

    // ==================== BlueprintResource Mapping Tests ====================

    @Test
    void testBlueprintResourceBidirectionalConversion() {
        com.angryss.idp.domain.entities.BlueprintResource original = new com.angryss.idp.domain.entities.BlueprintResource();
        original.id = UUID.randomUUID();
        original.setName("test-blueprint-resource");
        original.setDescription("Test blueprint resource");
        original.setIsActive(true);
        original.setCloudType("aws");
        original.setCreatedAt(LocalDateTime.of(2024, 1, 15, 10, 30));
        original.setUpdatedAt(LocalDateTime.of(2024, 1, 15, 11, 30));

        Map<String, Object> cloudProps = new HashMap<>();
        cloudProps.put("region", "us-east-1");
        cloudProps.put("instanceType", "t3.medium");
        original.setCloudSpecificProperties(cloudProps);

        Map<String, AttributeValue> item = mapper.blueprintResourceToItem(original);
        com.angryss.idp.domain.entities.BlueprintResource converted = mapper.itemToBlueprintResource(item);

        assertNotNull(converted);
        assertEquals(original.id, converted.id);
        assertEquals(original.getName(), converted.getName());
        assertEquals(original.getDescription(), converted.getDescription());
        assertEquals(original.getIsActive(), converted.getIsActive());
        assertEquals(original.getCloudType(), converted.getCloudType());
        assertEquals(original.getCloudSpecificProperties(), converted.getCloudSpecificProperties());
        assertEquals(original.getCreatedAt(), converted.getCreatedAt());
        assertEquals(original.getUpdatedAt(), converted.getUpdatedAt());
    }
}
