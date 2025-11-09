package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ResourceTypeCloudMappingCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingUpdateDto;
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

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class ResourceTypeCloudMappingServiceTest {

    @Inject
    ResourceTypeCloudMappingService mappingService;

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
    public void testCreateMapping() {
        // Given
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");

        ResourceTypeCloudMappingCreateDto createDto = new ResourceTypeCloudMappingCreateDto();
        createDto.setResourceTypeId(resourceType.id);
        createDto.setCloudProviderId(cloudProvider.id);
        createDto.setTerraformModuleLocation("git::https://github.com/example/terraform-aws-rds.git");
        createDto.setModuleLocationType(ModuleLocationType.GIT);
        createDto.setEnabled(false);

        // When
        ResourceTypeCloudMappingDto result = mappingService.create(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(resourceType.id, result.getResourceTypeId());
        assertEquals("RELATIONAL_DATABASE", result.getResourceTypeName());
        assertEquals(cloudProvider.id, result.getCloudProviderId());
        assertEquals("AWS", result.getCloudProviderName());
        assertEquals("git::https://github.com/example/terraform-aws-rds.git", result.getTerraformModuleLocation());
        assertEquals(ModuleLocationType.GIT, result.getModuleLocationType());
        assertFalse(result.getEnabled());
        assertFalse(result.getIsComplete()); // No properties yet
        assertNotNull(result.getCreatedAt());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    @Transactional
    public void testCreateMappingWithNonExistentResourceType() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        UUID nonExistentResourceTypeId = UUID.randomUUID();

        ResourceTypeCloudMappingCreateDto createDto = new ResourceTypeCloudMappingCreateDto();
        createDto.setResourceTypeId(nonExistentResourceTypeId);
        createDto.setCloudProviderId(cloudProvider.id);
        createDto.setTerraformModuleLocation("git::https://github.com/example/module.git");
        createDto.setModuleLocationType(ModuleLocationType.GIT);
        createDto.setEnabled(false);

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.create(createDto);
        });
    }

    @Test
    @Transactional
    public void testCreateMappingWithNonExistentCloudProvider() {
        // Given
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        UUID nonExistentCloudProviderId = UUID.randomUUID();

        ResourceTypeCloudMappingCreateDto createDto = new ResourceTypeCloudMappingCreateDto();
        createDto.setResourceTypeId(resourceType.id);
        createDto.setCloudProviderId(nonExistentCloudProviderId);
        createDto.setTerraformModuleLocation("git::https://github.com/example/module.git");
        createDto.setModuleLocationType(ModuleLocationType.GIT);
        createDto.setEnabled(false);

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.create(createDto);
        });
    }

    @Test
    @Transactional
    public void testCreateDuplicateMappingThrowsException() {
        // Given
        ResourceType resourceType = createTestResourceType("QUEUE", "Queue", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AZURE", "Microsoft Azure");

        ResourceTypeCloudMappingCreateDto createDto = new ResourceTypeCloudMappingCreateDto();
        createDto.setResourceTypeId(resourceType.id);
        createDto.setCloudProviderId(cloudProvider.id);
        createDto.setTerraformModuleLocation("git::https://github.com/example/module.git");
        createDto.setModuleLocationType(ModuleLocationType.GIT);
        createDto.setEnabled(false);

        mappingService.create(createDto);

        // When/Then - try to create duplicate
        ResourceTypeCloudMappingCreateDto duplicateDto = new ResourceTypeCloudMappingCreateDto();
        duplicateDto.setResourceTypeId(resourceType.id);
        duplicateDto.setCloudProviderId(cloudProvider.id);
        duplicateDto.setTerraformModuleLocation("git::https://github.com/example/different-module.git");
        duplicateDto.setModuleLocationType(ModuleLocationType.REGISTRY);
        duplicateDto.setEnabled(true);

        assertThrows(IllegalArgumentException.class, () -> {
            mappingService.create(duplicateDto);
        });
    }

    @Test
    @Transactional
    public void testListAll() {
        // Given
        ResourceType rt1 = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        ResourceType rt2 = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        CloudProvider cp1 = createTestCloudProvider("AWS", "Amazon Web Services");
        CloudProvider cp2 = createTestCloudProvider("AZURE", "Microsoft Azure");

        createTestMapping(rt1, cp1, "git::https://github.com/example/aws-rds.git", ModuleLocationType.GIT, true);
        createTestMapping(rt1, cp2, "git::https://github.com/example/azure-sql.git", ModuleLocationType.GIT, false);
        createTestMapping(rt2, cp1, "git::https://github.com/example/aws-s3.git", ModuleLocationType.GIT, true);

        // When
        List<ResourceTypeCloudMappingDto> result = mappingService.listAll();

        // Then
        assertEquals(3, result.size());
    }

    @Test
    @Transactional
    public void testGetById() {
        // Given
        ResourceType resourceType = createTestResourceType("CACHE", "Cache", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("GCP", "Google Cloud Platform");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "registry.terraform.io/modules/gcp-redis",
            ModuleLocationType.REGISTRY,
            true
        );

        // When
        ResourceTypeCloudMappingDto result = mappingService.getById(mapping.id);

        // Then
        assertNotNull(result);
        assertEquals(mapping.id, result.getId());
        assertEquals(resourceType.id, result.getResourceTypeId());
        assertEquals("CACHE", result.getResourceTypeName());
        assertEquals(cloudProvider.id, result.getCloudProviderId());
        assertEquals("GCP", result.getCloudProviderName());
        assertEquals("registry.terraform.io/modules/gcp-redis", result.getTerraformModuleLocation());
        assertEquals(ModuleLocationType.REGISTRY, result.getModuleLocationType());
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testGetByIdNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.getById(nonExistentId);
        });
    }

    @Test
    @Transactional
    public void testUpdate() {
        // Given
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/aws-s3.git",
            ModuleLocationType.GIT,
            false
        );

        ResourceTypeCloudMappingUpdateDto updateDto = new ResourceTypeCloudMappingUpdateDto();
        updateDto.setTerraformModuleLocation("git::https://github.com/example/aws-s3-v2.git");
        updateDto.setModuleLocationType(ModuleLocationType.REGISTRY);
        updateDto.setEnabled(true);

        // When
        ResourceTypeCloudMappingDto result = mappingService.update(mapping.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals(mapping.id, result.getId());
        assertEquals("git::https://github.com/example/aws-s3-v2.git", result.getTerraformModuleLocation());
        assertEquals(ModuleLocationType.REGISTRY, result.getModuleLocationType());
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testUpdatePartialFields() {
        // Given
        ResourceType resourceType = createTestResourceType("QUEUE", "Queue", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AZURE", "Microsoft Azure");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/azure-queue.git",
            ModuleLocationType.GIT,
            false
        );

        ResourceTypeCloudMappingUpdateDto updateDto = new ResourceTypeCloudMappingUpdateDto();
        updateDto.setEnabled(true);
        // terraformModuleLocation and moduleLocationType are not set

        // When
        ResourceTypeCloudMappingDto result = mappingService.update(mapping.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals("git::https://github.com/example/azure-queue.git", result.getTerraformModuleLocation()); // Should remain unchanged
        assertEquals(ModuleLocationType.GIT, result.getModuleLocationType()); // Should remain unchanged
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testUpdateNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();
        ResourceTypeCloudMappingUpdateDto updateDto = new ResourceTypeCloudMappingUpdateDto();
        updateDto.setEnabled(true);

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.update(nonExistentId, updateDto);
        });
    }

    @Test
    @Transactional
    public void testToggleEnabledWithCompleteMapping() {
        // Given
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/aws-rds.git",
            ModuleLocationType.GIT,
            false
        );
        // Add a property to make it complete
        createTestPropertySchema(mapping, "instanceType", "Instance Type", PropertyDataType.STRING, true);

        // When - enable
        mappingService.toggleEnabled(mapping.id, true);

        // Then
        ResourceTypeCloudMappingDto result = mappingService.getById(mapping.id);
        assertTrue(result.getEnabled());
        assertTrue(result.getIsComplete());

        // When - disable
        mappingService.toggleEnabled(mapping.id, false);

        // Then
        result = mappingService.getById(mapping.id);
        assertFalse(result.getEnabled());
    }

    @Test
    @Transactional
    public void testToggleEnabledWithIncompleteMapping() {
        // Given
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        CloudProvider cloudProvider = createTestCloudProvider("GCP", "Google Cloud Platform");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/gcp-storage.git",
            ModuleLocationType.GIT,
            false
        );
        // No properties - mapping is incomplete

        // When/Then - attempting to enable should fail
        assertThrows(IllegalStateException.class, () -> {
            mappingService.toggleEnabled(mapping.id, true);
        });

        // Verify it remains disabled
        ResourceTypeCloudMappingDto result = mappingService.getById(mapping.id);
        assertFalse(result.getEnabled());
        assertFalse(result.getIsComplete());
    }

    @Test
    @Transactional
    public void testToggleEnabledNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.toggleEnabled(nonExistentId, true);
        });
    }

    @Test
    @Transactional
    public void testListByResourceType() {
        // Given
        ResourceType rt1 = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        ResourceType rt2 = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        CloudProvider cp1 = createTestCloudProvider("AWS", "Amazon Web Services");
        CloudProvider cp2 = createTestCloudProvider("AZURE", "Microsoft Azure");
        CloudProvider cp3 = createTestCloudProvider("GCP", "Google Cloud Platform");

        createTestMapping(rt1, cp1, "git::https://github.com/example/aws-rds.git", ModuleLocationType.GIT, true);
        createTestMapping(rt1, cp2, "git::https://github.com/example/azure-sql.git", ModuleLocationType.GIT, false);
        createTestMapping(rt2, cp1, "git::https://github.com/example/aws-s3.git", ModuleLocationType.GIT, true);
        createTestMapping(rt2, cp3, "git::https://github.com/example/gcp-storage.git", ModuleLocationType.GIT, true);

        // When
        List<ResourceTypeCloudMappingDto> result = mappingService.listByResourceType(rt1.id);

        // Then
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(dto -> dto.getResourceTypeId().equals(rt1.id)));
        assertTrue(result.stream().allMatch(dto -> dto.getResourceTypeName().equals("RELATIONAL_DATABASE")));
        assertTrue(result.stream().anyMatch(dto -> dto.getCloudProviderName().equals("AWS")));
        assertTrue(result.stream().anyMatch(dto -> dto.getCloudProviderName().equals("AZURE")));
    }

    @Test
    @Transactional
    public void testListByCloudProvider() {
        // Given
        ResourceType rt1 = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        ResourceType rt2 = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        ResourceType rt3 = createTestResourceType("CACHE", "Cache", ResourceCategory.NON_SHARED);
        CloudProvider cp1 = createTestCloudProvider("AWS", "Amazon Web Services");
        CloudProvider cp2 = createTestCloudProvider("AZURE", "Microsoft Azure");

        createTestMapping(rt1, cp1, "git::https://github.com/example/aws-rds.git", ModuleLocationType.GIT, true);
        createTestMapping(rt2, cp1, "git::https://github.com/example/aws-s3.git", ModuleLocationType.GIT, true);
        createTestMapping(rt3, cp1, "git::https://github.com/example/aws-redis.git", ModuleLocationType.GIT, false);
        createTestMapping(rt1, cp2, "git::https://github.com/example/azure-sql.git", ModuleLocationType.GIT, false);

        // When
        List<ResourceTypeCloudMappingDto> result = mappingService.listByCloudProvider(cp1.id);

        // Then
        assertEquals(3, result.size());
        assertTrue(result.stream().allMatch(dto -> dto.getCloudProviderId().equals(cp1.id)));
        assertTrue(result.stream().allMatch(dto -> dto.getCloudProviderName().equals("AWS")));
        assertTrue(result.stream().anyMatch(dto -> dto.getResourceTypeName().equals("RELATIONAL_DATABASE")));
        assertTrue(result.stream().anyMatch(dto -> dto.getResourceTypeName().equals("STORAGE")));
        assertTrue(result.stream().anyMatch(dto -> dto.getResourceTypeName().equals("CACHE")));
    }

    @Test
    @Transactional
    public void testFindByResourceTypeAndCloud() {
        // Given
        ResourceType resourceType = createTestResourceType("QUEUE", "Queue", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/aws-sqs.git",
            ModuleLocationType.GIT,
            true
        );

        // When
        ResourceTypeCloudMappingDto result = mappingService.findByResourceTypeAndCloud(resourceType.id, cloudProvider.id);

        // Then
        assertNotNull(result);
        assertEquals(mapping.id, result.getId());
        assertEquals(resourceType.id, result.getResourceTypeId());
        assertEquals(cloudProvider.id, result.getCloudProviderId());
    }

    @Test
    @Transactional
    public void testFindByResourceTypeAndCloudNotFound() {
        // Given
        ResourceType resourceType = createTestResourceType("CACHE", "Cache", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("GCP", "Google Cloud Platform");
        // No mapping created

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            mappingService.findByResourceTypeAndCloud(resourceType.id, cloudProvider.id);
        });
    }

    @Test
    @Transactional
    public void testCompletenessValidation() {
        // Given
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH);
        CloudProvider cloudProvider = createTestCloudProvider("AZURE", "Microsoft Azure");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/azure-storage.git",
            ModuleLocationType.GIT,
            false
        );

        // When - initially incomplete (no properties)
        ResourceTypeCloudMappingDto result = mappingService.getById(mapping.id);

        // Then
        assertFalse(result.getIsComplete());

        // When - add a property
        createTestPropertySchema(mapping, "storageType", "Storage Type", PropertyDataType.STRING, true);
        result = mappingService.getById(mapping.id);

        // Then - now complete
        assertTrue(result.getIsComplete());
    }

    @Test
    @Transactional
    public void testDtoMapping() {
        // Given
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED);
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services");
        ResourceTypeCloudMapping mapping = createTestMapping(
            resourceType, cloudProvider,
            "git::https://github.com/example/aws-rds.git",
            ModuleLocationType.GIT,
            true
        );
        createTestPropertySchema(mapping, "instanceType", "Instance Type", PropertyDataType.STRING, true);

        // When
        ResourceTypeCloudMappingDto result = mappingService.getById(mapping.id);

        // Then - verify all fields are mapped correctly
        assertEquals(mapping.id, result.getId());
        assertEquals(mapping.resourceType.id, result.getResourceTypeId());
        assertEquals(mapping.resourceType.name, result.getResourceTypeName());
        assertEquals(mapping.cloudProvider.id, result.getCloudProviderId());
        assertEquals(mapping.cloudProvider.name, result.getCloudProviderName());
        assertEquals(mapping.terraformModuleLocation, result.getTerraformModuleLocation());
        assertEquals(mapping.moduleLocationType, result.getModuleLocationType());
        assertEquals(mapping.enabled, result.getEnabled());
        assertTrue(result.getIsComplete());
        assertEquals(mapping.createdAt, result.getCreatedAt());
        assertEquals(mapping.updatedAt, result.getUpdatedAt());
    }

    /**
     * Helper method to create a test resource type entity
     */
    private ResourceType createTestResourceType(String name, String displayName, ResourceCategory category) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.description = null;
        resourceType.category = category;
        resourceType.enabled = true;
        resourceType.persist();
        return resourceType;
    }

    /**
     * Helper method to create a test cloud provider entity
     */
    private CloudProvider createTestCloudProvider(String name, String displayName) {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = name;
        cloudProvider.displayName = displayName;
        cloudProvider.description = null;
        cloudProvider.enabled = true;
        cloudProvider.persist();
        return cloudProvider;
    }

    /**
     * Helper method to create a test resource type cloud mapping entity
     */
    private ResourceTypeCloudMapping createTestMapping(
        ResourceType resourceType,
        CloudProvider cloudProvider,
        String terraformModuleLocation,
        ModuleLocationType moduleLocationType,
        Boolean enabled
    ) {
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = terraformModuleLocation;
        mapping.moduleLocationType = moduleLocationType;
        mapping.enabled = enabled;
        mapping.persist();
        return mapping;
    }

    /**
     * Helper method to create a test property schema entity
     */
    private PropertySchema createTestPropertySchema(
        ResourceTypeCloudMapping mapping,
        String propertyName,
        String displayName,
        PropertyDataType dataType,
        Boolean required
    ) {
        PropertySchema propertySchema = new PropertySchema();
        propertySchema.mapping = mapping;
        propertySchema.propertyName = propertyName;
        propertySchema.displayName = displayName;
        propertySchema.description = null;
        propertySchema.dataType = dataType;
        propertySchema.required = required;
        propertySchema.defaultValue = null;
        propertySchema.validationRules = null;
        propertySchema.displayOrder = 1;
        propertySchema.persist();
        return propertySchema;
    }
}
