package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresPropertySchemaRepository.
 * Tests CRUD operations, query methods, and relationship loading using H2 in-memory database.
 */
@QuarkusTest
class PostgresPropertySchemaRepositoryIntegrationTest {

    @Inject
    PropertySchemaRepository propertySchemaRepository;

    private List<UUID> createdPropertySchemaIds = new ArrayList<>();
    private List<UUID> createdMappingIds = new ArrayList<>();
    private List<UUID> createdResourceTypeIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in reverse order to respect foreign key constraints
        for (UUID id : createdPropertySchemaIds) {
            propertySchemaRepository.findById(id).ifPresent(ps -> propertySchemaRepository.delete(ps));
        }
        for (UUID id : createdMappingIds) {
            ResourceTypeCloudMapping.<ResourceTypeCloudMapping>findByIdOptional(id).ifPresent(m -> m.delete());
        }
        for (UUID id : createdResourceTypeIds) {
            ResourceType.<ResourceType>findByIdOptional(id).ifPresent(rt -> rt.delete());
        }
        for (UUID id : createdCloudProviderIds) {
            CloudProvider.<CloudProvider>findByIdOptional(id).ifPresent(cp -> cp.delete());
        }
        createdPropertySchemaIds.clear();
        createdMappingIds.clear();
        createdResourceTypeIds.clear();
        createdCloudProviderIds.clear();
    }

    @Test
    @Transactional
    void testSavePropertySchema_CreatesNewPropertySchema() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-save", "Test Property Save");

        // When
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);

        // Then
        assertNotNull(savedPropertySchema.id);
        createdPropertySchemaIds.add(savedPropertySchema.id);
        assertEquals("test-property-save", savedPropertySchema.propertyName);
        assertEquals("Test Property Save", savedPropertySchema.displayName);
        assertEquals(PropertyDataType.STRING, savedPropertySchema.dataType);
        assertNotNull(savedPropertySchema.createdAt);
        assertNotNull(savedPropertySchema.updatedAt);
    }

    @Test
    @Transactional
    void testSavePropertySchema_UpdatesExistingPropertySchema() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-update", "Test Property Update");
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        createdPropertySchemaIds.add(savedPropertySchema.id);

        // When
        savedPropertySchema.description = "Updated description";
        savedPropertySchema.required = true;
        PropertySchema updatedPropertySchema = propertySchemaRepository.save(savedPropertySchema);

        // Then
        assertEquals(savedPropertySchema.id, updatedPropertySchema.id);
        assertEquals("Updated description", updatedPropertySchema.description);
        assertTrue(updatedPropertySchema.required);
    }

    @Test
    @Transactional
    void testFindById_ReturnsPropertySchemaWhenExists() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-findbyid", "Test Property FindById");
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        createdPropertySchemaIds.add(savedPropertySchema.id);

        // When
        Optional<PropertySchema> foundPropertySchema = propertySchemaRepository.findById(savedPropertySchema.id);

        // Then
        assertTrue(foundPropertySchema.isPresent());
        assertEquals(savedPropertySchema.id, foundPropertySchema.get().id);
        assertEquals("test-property-findbyid", foundPropertySchema.get().propertyName);
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<PropertySchema> foundPropertySchema = propertySchemaRepository.findById(nonExistentId);

        // Then
        assertFalse(foundPropertySchema.isPresent());
    }

    @Test
    @Transactional
    void testFindAll_ReturnsAllPropertySchemas() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema1 = createTestPropertySchema(mapping, "test-property-all-1", "Test Property All 1");
        PropertySchema propertySchema2 = createTestPropertySchema(mapping, "test-property-all-2", "Test Property All 2");
        PropertySchema savedPropertySchema1 = propertySchemaRepository.save(propertySchema1);
        PropertySchema savedPropertySchema2 = propertySchemaRepository.save(propertySchema2);
        createdPropertySchemaIds.add(savedPropertySchema1.id);
        createdPropertySchemaIds.add(savedPropertySchema2.id);

        // When
        List<PropertySchema> allPropertySchemas = propertySchemaRepository.findAll();

        // Then
        assertTrue(allPropertySchemas.size() >= 2);
        assertTrue(allPropertySchemas.stream().anyMatch(ps -> ps.id.equals(savedPropertySchema1.id)));
        assertTrue(allPropertySchemas.stream().anyMatch(ps -> ps.id.equals(savedPropertySchema2.id)));
    }

    @Test
    @Transactional
    void testFindByMappingId_ReturnsPropertySchemasForMapping() {
        // Given
        ResourceTypeCloudMapping mapping1 = createTestMapping();
        ResourceTypeCloudMapping mapping2 = createTestMapping();
        
        PropertySchema propertySchema1 = createTestPropertySchema(mapping1, "test-property-mapping1-1", "Test Property Mapping1 1");
        PropertySchema propertySchema2 = createTestPropertySchema(mapping1, "test-property-mapping1-2", "Test Property Mapping1 2");
        PropertySchema propertySchema3 = createTestPropertySchema(mapping2, "test-property-mapping2", "Test Property Mapping2");
        
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema1).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema2).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema3).id);

        // When
        List<PropertySchema> mapping1PropertySchemas = propertySchemaRepository.findByMappingId(mapping1.id);

        // Then
        assertEquals(2, mapping1PropertySchemas.size());
        assertTrue(mapping1PropertySchemas.stream().allMatch(ps -> ps.mapping.id.equals(mapping1.id)));
    }

    @Test
    @Transactional
    void testFindByMappingIdOrderByDisplayOrder_ReturnsOrderedPropertySchemas() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        PropertySchema propertySchema1 = createTestPropertySchema(mapping, "test-property-order-3", "Test Property Order 3");
        propertySchema1.displayOrder = 3;
        PropertySchema propertySchema2 = createTestPropertySchema(mapping, "test-property-order-1", "Test Property Order 1");
        propertySchema2.displayOrder = 1;
        PropertySchema propertySchema3 = createTestPropertySchema(mapping, "test-property-order-2", "Test Property Order 2");
        propertySchema3.displayOrder = 2;
        
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema1).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema2).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema3).id);

        // When
        List<PropertySchema> orderedPropertySchemas = propertySchemaRepository.findByMappingIdOrderByDisplayOrder(mapping.id);

        // Then
        assertEquals(3, orderedPropertySchemas.size());
        assertEquals(1, orderedPropertySchemas.get(0).displayOrder);
        assertEquals(2, orderedPropertySchemas.get(1).displayOrder);
        assertEquals(3, orderedPropertySchemas.get(2).displayOrder);
    }

    @Test
    @Transactional
    void testFindByMappingIdAndRequired_ReturnsRequiredPropertySchemas() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        
        PropertySchema requiredPropertySchema1 = createTestPropertySchema(mapping, "test-property-required-1", "Test Property Required 1");
        requiredPropertySchema1.required = true;
        PropertySchema requiredPropertySchema2 = createTestPropertySchema(mapping, "test-property-required-2", "Test Property Required 2");
        requiredPropertySchema2.required = true;
        PropertySchema optionalPropertySchema = createTestPropertySchema(mapping, "test-property-optional", "Test Property Optional");
        optionalPropertySchema.required = false;
        
        createdPropertySchemaIds.add(propertySchemaRepository.save(requiredPropertySchema1).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(requiredPropertySchema2).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(optionalPropertySchema).id);

        // When
        List<PropertySchema> requiredPropertySchemas = propertySchemaRepository.findByMappingIdAndRequired(mapping.id, true);

        // Then
        assertEquals(2, requiredPropertySchemas.size());
        assertTrue(requiredPropertySchemas.stream().allMatch(ps -> ps.required));
    }

    @Test
    @Transactional
    void testSaveWithValidationRules_PersistsJsonbField() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-validation", "Test Property Validation");
        Map<String, Object> validationRules = new HashMap<>();
        validationRules.put("minLength", 5);
        validationRules.put("maxLength", 100);
        validationRules.put("pattern", "^[a-zA-Z0-9-]+$");
        propertySchema.validationRules = validationRules;

        // When
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        createdPropertySchemaIds.add(savedPropertySchema.id);

        // Then
        PropertySchema foundPropertySchema = propertySchemaRepository.findById(savedPropertySchema.id).orElseThrow();
        assertNotNull(foundPropertySchema.validationRules);
        assertEquals(5, foundPropertySchema.validationRules.get("minLength"));
        assertEquals(100, foundPropertySchema.validationRules.get("maxLength"));
    }

    @Test
    @Transactional
    void testSaveWithDefaultValue_PersistsJsonbField() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-default", "Test Property Default");
        propertySchema.defaultValue = "default-value";

        // When
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        createdPropertySchemaIds.add(savedPropertySchema.id);

        // Then
        PropertySchema foundPropertySchema = propertySchemaRepository.findById(savedPropertySchema.id).orElseThrow();
        assertNotNull(foundPropertySchema.defaultValue);
        assertEquals("default-value", foundPropertySchema.defaultValue);
    }

    @Test
    @Transactional
    void testExists_ReturnsTrueWhenPropertySchemaExists() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-exists", "Test Property Exists");
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        createdPropertySchemaIds.add(savedPropertySchema.id);

        // When
        boolean exists = propertySchemaRepository.exists(savedPropertySchema.id);

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenPropertySchemaNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = propertySchemaRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    @Transactional
    void testDelete_RemovesPropertySchema() {
        // Given
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema = createTestPropertySchema(mapping, "test-property-delete", "Test Property Delete");
        PropertySchema savedPropertySchema = propertySchemaRepository.save(propertySchema);
        UUID propertySchemaId = savedPropertySchema.id;

        // When
        propertySchemaRepository.delete(savedPropertySchema);

        // Then
        assertFalse(propertySchemaRepository.exists(propertySchemaId));
        assertFalse(propertySchemaRepository.findById(propertySchemaId).isPresent());
    }

    @Test
    @Transactional
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = propertySchemaRepository.count();
        ResourceTypeCloudMapping mapping = createTestMapping();
        PropertySchema propertySchema1 = createTestPropertySchema(mapping, "test-property-count-1", "Test Property Count 1");
        PropertySchema propertySchema2 = createTestPropertySchema(mapping, "test-property-count-2", "Test Property Count 2");
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema1).id);
        createdPropertySchemaIds.add(propertySchemaRepository.save(propertySchema2).id);

        // When
        long newCount = propertySchemaRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    // Helper methods

    ResourceTypeCloudMapping createTestMapping() {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = "test-cp-" + UUID.randomUUID();
        cloudProvider.displayName = "Test Cloud Provider";
        cloudProvider.enabled = true;
        cloudProvider.createdAt = LocalDateTime.now();
        cloudProvider.updatedAt = LocalDateTime.now();
        cloudProvider.persist();
        createdCloudProviderIds.add(cloudProvider.id);

        ResourceType resourceType = new ResourceType();
        resourceType.name = "test-rt-" + UUID.randomUUID();
        resourceType.displayName = "Test Resource Type";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.createdAt = LocalDateTime.now();
        resourceType.updatedAt = LocalDateTime.now();
        resourceType.persist();
        createdResourceTypeIds.add(resourceType.id);

        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = "git::https://example.com/terraform-modules.git//compute";
        mapping.moduleLocationType = ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.createdAt = LocalDateTime.now();
        mapping.updatedAt = LocalDateTime.now();
        mapping.persist();
        createdMappingIds.add(mapping.id);

        return mapping;
    }

    private PropertySchema createTestPropertySchema(ResourceTypeCloudMapping mapping, String propertyName, String displayName) {
        PropertySchema propertySchema = new PropertySchema();
        propertySchema.mapping = mapping;
        propertySchema.propertyName = propertyName;
        propertySchema.displayName = displayName;
        propertySchema.description = "Test property schema: " + propertyName;
        propertySchema.dataType = PropertyDataType.STRING;
        propertySchema.required = false;
        propertySchema.createdAt = LocalDateTime.now();
        propertySchema.updatedAt = LocalDateTime.now();
        return propertySchema;
    }
}
