package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.BlueprintCreateDto;
import com.angryss.idp.application.dtos.BlueprintResourceCreateDto;
import com.angryss.idp.application.dtos.BlueprintResponseDto;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class BlueprintServiceTest {

    @Inject
    BlueprintService blueprintService;

    private UUID cloudProviderId;
    private UUID resourceTypeId;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up test data in correct order (children first due to foreign key constraints)
        BlueprintResource.deleteAll();
        Blueprint.deleteAll();
        Stack.deleteAll();
        ResourceType.deleteAll();
        
        // Note: Not deleting CloudProvider to avoid foreign key constraint issues with environments table
        // Instead, we'll reuse existing cloud providers or create new ones if needed

        // Find or create test cloud provider
        CloudProvider cloudProvider = CloudProvider.<CloudProvider>find("name", "AWS")
            .firstResultOptional()
            .orElseGet(() -> {
                CloudProvider cp = new CloudProvider();
                cp.name = "AWS";
                cp.displayName = "Amazon Web Services";
                cp.enabled = true;
                cp.persist();
                return cp;
            });
        cloudProviderId = cloudProvider.id;

        // Create test resource type
        ResourceType resourceType = new ResourceType();
        resourceType.name = "MANAGED_CONTAINER_ORCHESTRATOR";
        resourceType.displayName = "Managed Container Orchestrator";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        resourceTypeId = resourceType.id;
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithResources() {
        // Given
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint");
        createDto.setDescription("Test Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Test Resource");
        resourceDto.setDescription("Test Resource Description");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        resourceDto.setCloudSpecificProperties(new HashMap<>());

        createDto.setResources(List.of(resourceDto));

        // When
        BlueprintResponseDto result = blueprintService.createBlueprint(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("Test Blueprint", result.getName());
        assertNotNull(result.getResources());
        assertEquals(1, result.getResources().size());
        assertEquals("Test Resource", result.getResources().get(0).getName());
        assertEquals(resourceTypeId, result.getResources().get(0).getBlueprintResourceTypeId());

        // Verify persistence
        Blueprint savedBlueprint = Blueprint.findById(result.getId());
        assertNotNull(savedBlueprint);
        assertEquals(1, savedBlueprint.getResources().size());
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithEmptyResourcesList() {
        // Given
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint Without Resources");
        createDto.setDescription("Test Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        createDto.setResources(new ArrayList<>());

        // When
        BlueprintResponseDto result = blueprintService.createBlueprint(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("Blueprint Without Resources", result.getName());
        assertTrue(result.getResources() == null || result.getResources().isEmpty());

        // Verify persistence
        Blueprint savedBlueprint = Blueprint.findById(result.getId());
        assertNotNull(savedBlueprint);
        assertTrue(savedBlueprint.getResources().isEmpty());
    }

    @Test
    @Transactional
    public void testUpdateBlueprintWithNewResources() {
        // Given - Create blueprint using service (without resources)
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Original Blueprint");
        createDto.setDescription("Original Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        
        BlueprintResponseDto created = blueprintService.createBlueprint(createDto);

        // When - Update with new resources
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName("Original Blueprint");
        updateDto.setDescription("Updated Description");
        updateDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto newResourceDto = new BlueprintResourceCreateDto();
        newResourceDto.setName("New Resource");
        newResourceDto.setDescription("New Resource Description");
        newResourceDto.setBlueprintResourceTypeId(resourceTypeId);
        newResourceDto.setCloudType("AWS");
        newResourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        newResourceDto.setCloudSpecificProperties(new HashMap<>());

        updateDto.setResources(List.of(newResourceDto));

        BlueprintResponseDto result = blueprintService.updateBlueprint(created.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals(created.getId(), result.getId());
        assertNotNull(result.getResources());
        assertEquals(1, result.getResources().size());
        assertEquals("New Resource", result.getResources().get(0).getName());

        // Verify persistence
        Blueprint updatedBlueprint = Blueprint.findById(created.getId());
        assertEquals(1, updatedBlueprint.getResources().size());
    }

    @Test
    @Transactional
    public void testUpdateBlueprintReplacesOldResources() {
        // Given - Create blueprint with existing resources using service
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint With Resource");
        createDto.setDescription("Original Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        
        BlueprintResourceCreateDto oldResourceDto = new BlueprintResourceCreateDto();
        oldResourceDto.setName("Old Resource");
        oldResourceDto.setDescription("Old Description");
        oldResourceDto.setBlueprintResourceTypeId(resourceTypeId);
        oldResourceDto.setCloudType("AWS");
        oldResourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        oldResourceDto.setCloudSpecificProperties(new HashMap<>());
        
        createDto.setResources(List.of(oldResourceDto));
        
        BlueprintResponseDto created = blueprintService.createBlueprint(createDto);
        UUID oldResourceId = created.getResources().get(0).getId();

        // When - Update with different resources
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName("Blueprint With Resource");
        updateDto.setDescription("Updated Description");
        updateDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto newResourceDto = new BlueprintResourceCreateDto();
        newResourceDto.setName("Replacement Resource");
        newResourceDto.setDescription("Replacement Description");
        newResourceDto.setBlueprintResourceTypeId(resourceTypeId);
        newResourceDto.setCloudType("AWS");
        newResourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        newResourceDto.setCloudSpecificProperties(new HashMap<>());

        updateDto.setResources(List.of(newResourceDto));

        BlueprintResponseDto result = blueprintService.updateBlueprint(created.getId(), updateDto);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getResources().size());
        assertEquals("Replacement Resource", result.getResources().get(0).getName());

        // Verify old resource was deleted (orphanRemoval)
        BlueprintResource oldResource = BlueprintResource.findById(oldResourceId);
        assertNull(oldResource, "Old resource should be deleted due to orphanRemoval");
    }

    @Test
    @Transactional
    public void testUpdateBlueprintWithEmptyResourcesListDeletesAll() {
        // Given - Create blueprint with resources using service
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint With Resource");
        createDto.setDescription("Original Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        
        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Resource To Delete");
        resourceDto.setDescription("Resource Description");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        resourceDto.setCloudSpecificProperties(new HashMap<>());
        
        createDto.setResources(List.of(resourceDto));
        
        BlueprintResponseDto created = blueprintService.createBlueprint(createDto);
        UUID resourceId = created.getResources().get(0).getId();

        // When - Update with empty resources list
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName("Blueprint With Resource");
        updateDto.setDescription("Updated Description");
        updateDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        updateDto.setResources(new ArrayList<>());

        BlueprintResponseDto result = blueprintService.updateBlueprint(created.getId(), updateDto);

        // Force flush to trigger orphan removal
        Blueprint.getEntityManager().flush();

        // Then
        assertNotNull(result);
        assertTrue(result.getResources() == null || result.getResources().isEmpty());

        // Verify resource was deleted
        BlueprintResource deletedResource = BlueprintResource.findById(resourceId);
        assertNull(deletedResource, "Resource should be deleted when empty list is provided");
    }

    @Test
    @Transactional
    public void testDeleteBlueprintCascadesToResources() {
        // Given - Create blueprint with resources using service
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint To Delete");
        createDto.setDescription("Blueprint Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        
        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Resource To Cascade Delete");
        resourceDto.setDescription("Resource Description");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        resourceDto.setCloudSpecificProperties(new HashMap<>());
        
        createDto.setResources(List.of(resourceDto));
        
        BlueprintResponseDto created = blueprintService.createBlueprint(createDto);
        UUID blueprintId = created.getId();
        UUID resourceId = created.getResources().get(0).getId();

        // When - Delete the blueprint
        blueprintService.deleteBlueprint(blueprintId);

        // Then - Verify both blueprint and resource are deleted
        Blueprint deletedBlueprint = Blueprint.findById(blueprintId);
        assertNull(deletedBlueprint, "Blueprint should be deleted");

        BlueprintResource deletedResource = BlueprintResource.findById(resourceId);
        assertNull(deletedResource, "Resource should be cascade deleted");
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithInvalidResourceTypeId() {
        // Given
        UUID invalidResourceTypeId = UUID.randomUUID();

        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Test Resource");
        resourceDto.setBlueprintResourceTypeId(invalidResourceTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());

        createDto.setResources(List.of(resourceDto));

        // When/Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            blueprintService.createBlueprint(createDto);
        });

        assertTrue(exception.getMessage().contains("Resource type not found"));
        assertTrue(exception.getMessage().contains(invalidResourceTypeId.toString()));
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithInvalidCloudProviderName() {
        // Given
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Test Resource");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType("INVALID_CLOUD");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());

        createDto.setResources(List.of(resourceDto));

        // When/Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            blueprintService.createBlueprint(createDto);
        });

        assertTrue(exception.getMessage().contains("Cloud provider not found"));
        assertTrue(exception.getMessage().contains("INVALID_CLOUD"));
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithDisabledCloudProvider() {
        // Given - Create disabled cloud provider
        CloudProvider disabledProvider = new CloudProvider();
        disabledProvider.name = "DISABLED_CLOUD";
        disabledProvider.displayName = "Disabled Cloud";
        disabledProvider.enabled = false;
        disabledProvider.persist();

        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Test Resource");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType("DISABLED_CLOUD");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());

        createDto.setResources(List.of(resourceDto));

        // When/Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            blueprintService.createBlueprint(createDto);
        });

        assertTrue(exception.getMessage().contains("Cloud provider is not enabled"));
        assertTrue(exception.getMessage().contains("DISABLED_CLOUD"));
    }

    /**
     * Helper method to create a test blueprint without resources
     */
    private Blueprint createTestBlueprint(String name) {
        Blueprint blueprint = new Blueprint();
        blueprint.setName(name);
        blueprint.setDescription("Test Description");
        blueprint.setIsActive(true);

        CloudProvider cloudProvider = CloudProvider.findById(cloudProviderId);
        blueprint.setSupportedCloudProviders(Set.of(cloudProvider));

        blueprint.persist();
        return blueprint;
    }

    /**
     * Helper method to create a test blueprint with a resource
     */
    private Blueprint createTestBlueprintWithResource(String blueprintName, String resourceName) {
        Blueprint blueprint = createTestBlueprint(blueprintName);

        ResourceType resourceType = ResourceType.findById(resourceTypeId);
        CloudProvider cloudProvider = CloudProvider.findById(cloudProviderId);

        BlueprintResource resource = new BlueprintResource();
        resource.setName(resourceName);
        resource.setDescription("Test Resource Description");
        resource.setResourceType(resourceType);
        resource.setCloudProvider(cloudProvider);
        resource.setCloudType("AWS");
        resource.setConfiguration(new ContainerOrchestratorConfiguration());
        resource.setCloudSpecificProperties(new HashMap<>());
        resource.setBlueprint(blueprint);
        resource.persist(); // Persist the resource to get an ID

        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(resource);
        blueprint.setResources(resources);

        blueprint.persist();
        
        // Flush to ensure the resource is persisted and has an ID
        blueprint.flush();
        
        return blueprint;
    }
}
