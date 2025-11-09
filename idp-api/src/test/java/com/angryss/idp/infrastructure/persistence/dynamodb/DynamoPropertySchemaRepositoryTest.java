package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoPropertySchemaRepository.
 * Tests CRUD operations, GSI queries, and pagination.
 */
public class DynamoPropertySchemaRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoPropertySchemaRepository propertySchemaRepository;

    @Test
    public void testSaveAndFindById() {
        PropertySchema schema = createTestPropertySchema("memory");
        
        PropertySchema saved = propertySchemaRepository.save(schema);
        
        assertNotNull(saved.id);
        assertNotNull(saved.createdAt);
        assertNotNull(saved.updatedAt);
        
        Optional<PropertySchema> found = propertySchemaRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("memory", found.get().propertyName);
    }

    @Test
    public void testFindById_NotFound() {
        Optional<PropertySchema> found = propertySchemaRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        PropertySchema schema = createTestPropertySchema("cpu");
        PropertySchema saved = propertySchemaRepository.save(schema);
        
        saved.description = "Updated description";
        saved.required = true;
        PropertySchema updated = propertySchemaRepository.save(saved);
        
        assertEquals("Updated description", updated.description);
        assertTrue(updated.required);
        
        Optional<PropertySchema> fetched = propertySchemaRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("Updated description", fetched.get().description);
    }

    @Test
    public void testDelete() {
        PropertySchema schema = createTestPropertySchema("storage");
        PropertySchema saved = propertySchemaRepository.save(schema);
        UUID id = saved.id;
        
        assertTrue(propertySchemaRepository.findById(id).isPresent());
        
        propertySchemaRepository.delete(saved);
        
        assertFalse(propertySchemaRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        propertySchemaRepository.save(createTestPropertySchema("memory"));
        propertySchemaRepository.save(createTestPropertySchema("cpu"));
        propertySchemaRepository.save(createTestPropertySchema("storage"));
        
        List<PropertySchema> all = propertySchemaRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testSaveWithDisplayOrder() {
        PropertySchema schema1 = createTestPropertySchema("memory");
        schema1.displayOrder = 2;
        
        PropertySchema schema2 = createTestPropertySchema("cpu");
        schema2.displayOrder = 1;
        
        propertySchemaRepository.save(schema1);
        propertySchemaRepository.save(schema2);
        
        List<PropertySchema> all = propertySchemaRepository.findAll();
        assertEquals(2, all.size());
    }

    @Test
    public void testSaveWithRequiredFlag() {
        PropertySchema required = createTestPropertySchema("required-prop");
        required.required = true;
        
        PropertySchema optional = createTestPropertySchema("optional-prop");
        optional.required = false;
        
        propertySchemaRepository.save(required);
        propertySchemaRepository.save(optional);
        
        List<PropertySchema> all = propertySchemaRepository.findAll();
        assertEquals(2, all.size());
        
        Optional<PropertySchema> foundRequired = propertySchemaRepository.findById(required.id);
        assertTrue(foundRequired.isPresent());
        assertTrue(foundRequired.get().required);
    }

    @Test
    public void testCount() {
        assertEquals(0, propertySchemaRepository.count());
        
        propertySchemaRepository.save(createTestPropertySchema("memory"));
        assertEquals(1, propertySchemaRepository.count());
        
        propertySchemaRepository.save(createTestPropertySchema("cpu"));
        assertEquals(2, propertySchemaRepository.count());
    }

    @Test
    public void testExists() {
        PropertySchema schema = createTestPropertySchema("memory");
        PropertySchema saved = propertySchemaRepository.save(schema);
        
        assertTrue(propertySchemaRepository.exists(saved.id));
        assertFalse(propertySchemaRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 130; i++) {
            PropertySchema schema = createTestPropertySchema("property-" + i);
            propertySchemaRepository.save(schema);
        }
        
        List<PropertySchema> all = propertySchemaRepository.findAll();
        
        assertEquals(130, all.size());
    }

    @Test
    public void testSaveWithValidationRules() {
        PropertySchema schema = createTestPropertySchema("port");
        schema.dataType = PropertyDataType.NUMBER;
        Map<String, Object> validation = new HashMap<>();
        validation.put("min", 1);
        validation.put("max", 65535);
        schema.validationRules = validation;
        
        PropertySchema saved = propertySchemaRepository.save(schema);
        
        Optional<PropertySchema> found = propertySchemaRepository.findById(saved.id);
        assertTrue(found.isPresent());
        assertNotNull(found.get().validationRules);
        assertEquals(1, ((Number) found.get().validationRules.get("min")).intValue());
        assertEquals(65535, ((Number) found.get().validationRules.get("max")).intValue());
    }

    @Test
    public void testSaveWithDefaultValue() {
        PropertySchema schema = createTestPropertySchema("replicas");
        schema.dataType = PropertyDataType.NUMBER;
        schema.defaultValue = "3";
        
        PropertySchema saved = propertySchemaRepository.save(schema);
        
        Optional<PropertySchema> found = propertySchemaRepository.findById(saved.id);
        assertTrue(found.isPresent());
        assertEquals("3", found.get().defaultValue);
    }

    private PropertySchema createTestPropertySchema(String propertyName) {
        PropertySchema schema = new PropertySchema();
        schema.propertyName = propertyName;
        schema.description = "Test property: " + propertyName;
        schema.dataType = PropertyDataType.STRING;
        schema.required = false;
        schema.createdAt = LocalDateTime.now();
        schema.updatedAt = LocalDateTime.now();
        return schema;
    }
}
