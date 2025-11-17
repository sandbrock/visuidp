package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.PropertySchemaCreateDto;
import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.application.dtos.PropertySchemaResponseDto;
import com.angryss.idp.application.dtos.PropertySchemaUpdateDto;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class PropertySchemaServiceTest {

    @Inject
    PropertySchemaService propertySchemaService;

    @BeforeEach
    @Transactional
    public void cleanupTestData() {
        // Clean up in correct order due to foreign key constraints (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        StackResource.deleteAll();
        BlueprintResource.deleteAll();
        EnvironmentConfig.deleteAll();

        EnvironmentEntity.deleteAll();
        ResourceType.deleteAll();
        CloudProvider.deleteAll();
    }

    @Test
    @Transactional
    public void testCreatePropertySchema() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        PropertySchemaCreateDto createDto = new PropertySchemaCreateDto();
        createDto.setMappingId(mapping.id);
        createDto.setPropertyName("maxConnections");
        createDto.setDisplayName("Maximum Connections");
        createDto.setDescription("Maximum number of database connections");
        createDto.setDataType(PropertyDataType.NUMBER);
        createDto.setRequired(true);
        createDto.setDefaultValue("100");
        
        Map<String, Object> validationRules = new HashMap<>();
        validationRules.put("min", "1");
        validationRules.put("max", "1000");
        createDto.setValidationRules(validationRules);
        createDto.setDisplayOrder(1);

        // When
        PropertySchemaDto result = propertySchemaService.create(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(mapping.id, result.getMappingId());
        assertEquals("maxConnections", result.getPropertyName());
        assertEquals("Maximum Connections", result.getDisplayName());
        assertEquals("Maximum number of database connections", result.getDescription());
        assertEquals(PropertyDataType.NUMBER, result.getDataType());
        assertTrue(result.getRequired());
        assertEquals("100", result.getDefaultValue());
        assertNotNull(result.getValidationRules());
        assertEquals("1", result.getValidationRules().get("min"));
        assertEquals("1000", result.getValidationRules().get("max"));
        assertEquals(1, result.getDisplayOrder());
    }

    @Test
    @Transactional
    public void testCreatePropertySchemaWithMappingNotFound() {
        // Given
        UUID nonExistentMappingId = UUID.randomUUID();
        
        PropertySchemaCreateDto createDto = new PropertySchemaCreateDto();
        createDto.setMappingId(nonExistentMappingId);
        createDto.setPropertyName("testProperty");
        createDto.setDisplayName("Test Property");
        createDto.setDataType(PropertyDataType.STRING);
        createDto.setRequired(false);

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.create(createDto);
        });
    }

    @Test
    @Transactional
    public void testCreateDuplicatePropertyNameThrowsException() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        PropertySchemaCreateDto createDto = new PropertySchemaCreateDto();
        createDto.setMappingId(mapping.id);
        createDto.setPropertyName("instanceType");
        createDto.setDisplayName("Instance Type");
        createDto.setDataType(PropertyDataType.STRING);
        createDto.setRequired(true);

        propertySchemaService.create(createDto);

        // When/Then - try to create another property with same name
        PropertySchemaCreateDto duplicateDto = new PropertySchemaCreateDto();
        duplicateDto.setMappingId(mapping.id);
        duplicateDto.setPropertyName("instanceType");
        duplicateDto.setDisplayName("Instance Type Duplicate");
        duplicateDto.setDataType(PropertyDataType.STRING);
        duplicateDto.setRequired(false);

        assertThrows(IllegalArgumentException.class, () -> {
            propertySchemaService.create(duplicateDto);
        });
    }

    @Test
    @Transactional
    public void testListByMapping() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        createTestPropertySchema(mapping, "property1", "Property 1", PropertyDataType.STRING, true, 1);
        createTestPropertySchema(mapping, "property2", "Property 2", PropertyDataType.NUMBER, false, 2);
        createTestPropertySchema(mapping, "property3", "Property 3", PropertyDataType.BOOLEAN, true, 3);

        // When
        List<PropertySchemaDto> result = propertySchemaService.listByMapping(mapping.id);

        // Then
        assertEquals(3, result.size());
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property1")));
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property2")));
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property3")));
    }

    @Test
    @Transactional
    public void testGetById() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "testProperty", "Test Property", PropertyDataType.STRING, true, 1);

        // When
        PropertySchemaDto result = propertySchemaService.getById(propertySchema.id);

        // Then
        assertNotNull(result);
        assertEquals(propertySchema.id, result.getId());
        assertEquals("testProperty", result.getPropertyName());
        assertEquals("Test Property", result.getDisplayName());
        assertEquals(PropertyDataType.STRING, result.getDataType());
        assertTrue(result.getRequired());
    }

    @Test
    @Transactional
    public void testGetByIdNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.getById(nonExistentId);
        });
    }

    @Test
    @Transactional
    public void testUpdate() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "testProperty", "Test Property", PropertyDataType.STRING, true, 1);

        PropertySchemaUpdateDto updateDto = new PropertySchemaUpdateDto();
        updateDto.setDisplayName("Updated Property");
        updateDto.setDescription("Updated description");
        updateDto.setDataType(PropertyDataType.NUMBER);
        updateDto.setRequired(false);
        updateDto.setDefaultValue("50");
        
        Map<String, Object> validationRules = new HashMap<>();
        validationRules.put("min", "10");
        validationRules.put("max", "100");
        updateDto.setValidationRules(validationRules);
        updateDto.setDisplayOrder(5);

        // When
        PropertySchemaDto result = propertySchemaService.update(propertySchema.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals(propertySchema.id, result.getId());
        assertEquals("testProperty", result.getPropertyName()); // Property name should not change
        assertEquals("Updated Property", result.getDisplayName());
        assertEquals("Updated description", result.getDescription());
        assertEquals(PropertyDataType.NUMBER, result.getDataType());
        assertFalse(result.getRequired());
        assertEquals("50", result.getDefaultValue());
        assertNotNull(result.getValidationRules());
        assertEquals("10", result.getValidationRules().get("min"));
        assertEquals("100", result.getValidationRules().get("max"));
        assertEquals(5, result.getDisplayOrder());
    }

    @Test
    @Transactional
    public void testUpdatePartialFields() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "testProperty", "Test Property", PropertyDataType.STRING, true, 1);

        PropertySchemaUpdateDto updateDto = new PropertySchemaUpdateDto();
        updateDto.setDisplayName("Updated Display Name");
        // Other fields are not set

        // When
        PropertySchemaDto result = propertySchemaService.update(propertySchema.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals("Updated Display Name", result.getDisplayName());
        assertNull(result.getDescription()); // Should remain unchanged
        assertEquals(PropertyDataType.STRING, result.getDataType()); // Should remain unchanged
        assertTrue(result.getRequired()); // Should remain unchanged
        assertEquals(1, result.getDisplayOrder()); // Should remain unchanged
    }

    @Test
    @Transactional
    public void testUpdateNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();
        PropertySchemaUpdateDto updateDto = new PropertySchemaUpdateDto();
        updateDto.setDisplayName("Updated");

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.update(nonExistentId, updateDto);
        });
    }

    @Test
    @Transactional
    public void testDelete() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "testProperty", "Test Property", PropertyDataType.STRING, true, 1);
        UUID propertySchemaId = propertySchema.id;

        // When
        propertySchemaService.delete(propertySchemaId);

        // Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.getById(propertySchemaId);
        });
    }

    @Test
    @Transactional
    public void testDeleteNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.delete(nonExistentId);
        });
    }

    @Test
    @Transactional
    public void testBulkCreate() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        List<PropertySchemaCreateDto> createDtos = new ArrayList<>();
        
        PropertySchemaCreateDto dto1 = new PropertySchemaCreateDto();
        dto1.setMappingId(mapping.id);
        dto1.setPropertyName("property1");
        dto1.setDisplayName("Property 1");
        dto1.setDataType(PropertyDataType.STRING);
        dto1.setRequired(true);
        dto1.setDisplayOrder(1);
        createDtos.add(dto1);
        
        PropertySchemaCreateDto dto2 = new PropertySchemaCreateDto();
        dto2.setMappingId(mapping.id);
        dto2.setPropertyName("property2");
        dto2.setDisplayName("Property 2");
        dto2.setDataType(PropertyDataType.NUMBER);
        dto2.setRequired(false);
        dto2.setDefaultValue("100");
        dto2.setDisplayOrder(2);
        createDtos.add(dto2);
        
        PropertySchemaCreateDto dto3 = new PropertySchemaCreateDto();
        dto3.setMappingId(mapping.id);
        dto3.setPropertyName("property3");
        dto3.setDisplayName("Property 3");
        dto3.setDataType(PropertyDataType.BOOLEAN);
        dto3.setRequired(true);
        dto3.setDisplayOrder(3);
        createDtos.add(dto3);

        // When
        List<PropertySchemaDto> result = propertySchemaService.bulkCreate(mapping.id, createDtos);

        // Then
        assertEquals(3, result.size());
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property1")));
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property2")));
        assertTrue(result.stream().anyMatch(dto -> dto.getPropertyName().equals("property3")));
        
        // Verify all properties were persisted
        List<PropertySchemaDto> allProperties = propertySchemaService.listByMapping(mapping.id);
        assertEquals(3, allProperties.size());
    }

    @Test
    @Transactional
    public void testBulkCreateWithMappingNotFound() {
        // Given
        UUID nonExistentMappingId = UUID.randomUUID();
        
        List<PropertySchemaCreateDto> createDtos = new ArrayList<>();
        PropertySchemaCreateDto dto = new PropertySchemaCreateDto();
        dto.setMappingId(nonExistentMappingId);
        dto.setPropertyName("property1");
        dto.setDisplayName("Property 1");
        dto.setDataType(PropertyDataType.STRING);
        dto.setRequired(false);
        createDtos.add(dto);

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.bulkCreate(nonExistentMappingId, createDtos);
        });
    }

    @Test
    @Transactional
    public void testBulkCreateWithDuplicateNamesInInput() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        List<PropertySchemaCreateDto> createDtos = new ArrayList<>();
        
        PropertySchemaCreateDto dto1 = new PropertySchemaCreateDto();
        dto1.setMappingId(mapping.id);
        dto1.setPropertyName("duplicateName");
        dto1.setDisplayName("Property 1");
        dto1.setDataType(PropertyDataType.STRING);
        dto1.setRequired(true);
        createDtos.add(dto1);
        
        PropertySchemaCreateDto dto2 = new PropertySchemaCreateDto();
        dto2.setMappingId(mapping.id);
        dto2.setPropertyName("duplicateName");
        dto2.setDisplayName("Property 2");
        dto2.setDataType(PropertyDataType.NUMBER);
        dto2.setRequired(false);
        createDtos.add(dto2);

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            propertySchemaService.bulkCreate(mapping.id, createDtos);
        });
    }

    @Test
    @Transactional
    public void testBulkCreateWithExistingPropertyName() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        // Create an existing property
        createTestPropertySchema(mapping, "existingProperty", "Existing Property", PropertyDataType.STRING, true, 1);
        
        // Try to bulk create with a property that has the same name
        List<PropertySchemaCreateDto> createDtos = new ArrayList<>();
        
        PropertySchemaCreateDto dto1 = new PropertySchemaCreateDto();
        dto1.setMappingId(mapping.id);
        dto1.setPropertyName("newProperty");
        dto1.setDisplayName("New Property");
        dto1.setDataType(PropertyDataType.STRING);
        dto1.setRequired(true);
        createDtos.add(dto1);
        
        PropertySchemaCreateDto dto2 = new PropertySchemaCreateDto();
        dto2.setMappingId(mapping.id);
        dto2.setPropertyName("existingProperty");
        dto2.setDisplayName("Duplicate Property");
        dto2.setDataType(PropertyDataType.NUMBER);
        dto2.setRequired(false);
        createDtos.add(dto2);

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            propertySchemaService.bulkCreate(mapping.id, createDtos);
        });
    }

    @Test
    @Transactional
    public void testGetSchemaMap() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED);
        ResourceTypeCloudMapping mapping = createTestMapping(resourceType, cloudProvider);
        
        createTestPropertySchema(mapping, "instanceType", "Instance Type", PropertyDataType.STRING, true, 1);
        createTestPropertySchema(mapping, "storageSize", "Storage Size (GB)", PropertyDataType.NUMBER, true, 2);
        createTestPropertySchema(mapping, "multiAZ", "Multi-AZ Deployment", PropertyDataType.BOOLEAN, false, 3);

        // When
        PropertySchemaResponseDto response = propertySchemaService.getSchemaResponse(resourceType.id, cloudProvider.id);
        Map<String, PropertySchemaDto> result = response.getProperties().stream()
            .collect(java.util.stream.Collectors.toMap(PropertySchemaDto::getPropertyName, p -> p));

        // Then
        assertEquals(3, result.size());
        assertTrue(result.containsKey("instanceType"));
        assertTrue(result.containsKey("storageSize"));
        assertTrue(result.containsKey("multiAZ"));
        
        assertEquals("Instance Type", result.get("instanceType").getDisplayName());
        assertEquals(PropertyDataType.STRING, result.get("instanceType").getDataType());
        assertTrue(result.get("instanceType").getRequired());
        
        assertEquals("Storage Size (GB)", result.get("storageSize").getDisplayName());
        assertEquals(PropertyDataType.NUMBER, result.get("storageSize").getDataType());
        
        assertEquals("Multi-AZ Deployment", result.get("multiAZ").getDisplayName());
        assertEquals(PropertyDataType.BOOLEAN, result.get("multiAZ").getDataType());
        assertFalse(result.get("multiAZ").getRequired());
    }

    @Test
    @Transactional
    public void testGetSchemaMapWithMappingNotFound() {
        // Given
        UUID nonExistentResourceTypeId = UUID.randomUUID();
        UUID nonExistentCloudProviderId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            propertySchemaService.getSchemaResponse(nonExistentResourceTypeId, nonExistentCloudProviderId);
        });
    }

    @Test
    @Transactional
    public void testGetSchemaMapEmptyProperties() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        ResourceTypeCloudMapping mapping = createTestMapping(resourceType, cloudProvider);
        // No properties created

        // When
        PropertySchemaResponseDto response = propertySchemaService.getSchemaResponse(resourceType.id, cloudProvider.id);
        Map<String, PropertySchemaDto> result = response.getProperties().stream()
            .collect(java.util.stream.Collectors.toMap(PropertySchemaDto::getPropertyName, p -> p));

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    /**
     * Helper method to create a test cloud provider entity
     */
    private CloudProvider createTestCloudProvider(String name, String displayName) {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = name;
        cloudProvider.displayName = displayName;
        cloudProvider.enabled = true;
        cloudProvider.persist();
        return cloudProvider;
    }

    /**
     * Helper method to create a test resource type entity
     */
    private ResourceType createTestResourceType(String name, String displayName, ResourceCategory category) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.category = category;
        resourceType.enabled = true;
        resourceType.persist();
        return resourceType;
    }

    /**
     * Helper method to create a test resource type cloud mapping entity
     */
    private ResourceTypeCloudMapping createTestMapping() {
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED);
        return createTestMapping(resourceType, cloudProvider);
    }

    /**
     * Helper method to create a test resource type cloud mapping entity with specific resource type and cloud provider
     */
    private ResourceTypeCloudMapping createTestMapping(ResourceType resourceType, CloudProvider cloudProvider) {
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = "git::https://github.com/example/terraform-modules.git//rds";
        mapping.moduleLocationType = ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.persist();
        return mapping;
    }

    /**
     * Helper method to create a test property schema entity
     */
    private PropertySchema createTestPropertySchema(ResourceTypeCloudMapping mapping, String propertyName, 
                                                     String displayName, PropertyDataType dataType, 
                                                     Boolean required, Integer displayOrder) {
        PropertySchema propertySchema = new PropertySchema();
        propertySchema.mapping = mapping;
        propertySchema.propertyName = propertyName;
        propertySchema.displayName = displayName;
        propertySchema.dataType = dataType;
        propertySchema.required = required;
        propertySchema.displayOrder = displayOrder;
        propertySchema.persist();
        return propertySchema;
    }
}
