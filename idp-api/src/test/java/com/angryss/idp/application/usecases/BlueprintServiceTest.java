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
import org.junit.jupiter.api.AfterEach;
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
    
    // Track created entities for cleanup
    private List<UUID> createdBlueprintIds = new ArrayList<>();
    private List<UUID> createdResourceTypeIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @BeforeEach
    @Transactional
    public void setup() {
        // Find or create test cloud provider (reuse to avoid FK issues)
        CloudProvider cloudProvider = CloudProvider.<CloudProvider>find("name", "AWS")
            .firstResultOptional()
            .orElseGet(() -> {
                CloudProvider cp = new CloudProvider();
                cp.name = "AWS";
                cp.displayName = "Amazon Web Services";
                cp.enabled = true;
                cp.persist();
                createdCloudProviderIds.add(cp.id);
                return cp;
            });
        cloudProviderId = cloudProvider.id;

        // Create test resource type with unique name to avoid duplicate key violations
        ResourceType resourceType = new ResourceType();
        resourceType.name = "MANAGED_CONTAINER_ORCHESTRATOR_" + UUID.randomUUID();
        resourceType.displayName = "Managed Container Orchestrator";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        resourceTypeId = resourceType.id;
        createdResourceTypeIds.add(resourceTypeId);
    }
    
    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in correct order (children first to respect foreign key constraints)
        // 1. First delete any Stacks that reference the Blueprints
        for (UUID blueprintId : createdBlueprintIds) {
            Blueprint blueprint = Blueprint.findById(blueprintId);
            if (blueprint != null) {
                // Delete all stacks that reference this blueprint
                if (blueprint.getStacks() != null && !blueprint.getStacks().isEmpty()) {
                    // Create a copy to avoid ConcurrentModificationException
                    Set<Stack> stacksToDelete = new HashSet<>(blueprint.getStacks());
                    for (Stack stack : stacksToDelete) {
                        // Delete StackResources first (cascade should handle this, but being explicit)
                        if (stack.getStackResources() != null) {
                            stack.getStackResources().clear();
                        }
                        stack.delete();
                    }
                }
            }
        }
        
        // 2. Then delete the Blueprints (BlueprintResources will be cascade deleted due to orphanRemoval)
        for (UUID id : createdBlueprintIds) {
            Blueprint blueprint = Blueprint.findById(id);
            if (blueprint != null) {
                blueprint.delete();
            }
        }
        
        // 3. Delete ResourceTypes
        for (UUID id : createdResourceTypeIds) {
            ResourceType resourceType = ResourceType.findById(id);
            if (resourceType != null) {
                resourceType.delete();
            }
        }
        
        // 4. Finally delete CloudProviders
        for (UUID id : createdCloudProviderIds) {
            CloudProvider cloudProvider = CloudProvider.findById(id);
            if (cloudProvider != null) {
                cloudProvider.delete();
            }
        }
        
        // Clear all tracking lists
        createdBlueprintIds.clear();
        createdResourceTypeIds.clear();
        createdCloudProviderIds.clear();
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithResources() {
        // Given
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint " + UUID.randomUUID());
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
        createdBlueprintIds.add(result.getId());

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertTrue(result.getName().startsWith("Test Blueprint"));
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
        createDto.setName("Blueprint Without Resources " + UUID.randomUUID());
        createDto.setDescription("Test Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        createDto.setResources(new ArrayList<>());

        // When
        BlueprintResponseDto result = blueprintService.createBlueprint(createDto);
        createdBlueprintIds.add(result.getId());

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertTrue(result.getName().startsWith("Blueprint Without Resources"));
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
        String blueprintName = "Original Blueprint " + UUID.randomUUID();
        createDto.setName(blueprintName);
        createDto.setDescription("Original Description");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
        
        BlueprintResponseDto created = blueprintService.createBlueprint(createDto);
        createdBlueprintIds.add(created.getId());

        // When - Update with new resources
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName(blueprintName);
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
        String blueprintName = "Blueprint With Resource " + UUID.randomUUID();
        createDto.setName(blueprintName);
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
        createdBlueprintIds.add(created.getId());
        UUID oldResourceId = created.getResources().get(0).getId();

        // When - Update with different resources
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName(blueprintName);
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
        String blueprintName = "Blueprint With Resource " + UUID.randomUUID();
        createDto.setName(blueprintName);
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
        createdBlueprintIds.add(created.getId());
        UUID resourceId = created.getResources().get(0).getId();

        // When - Update with empty resources list
        BlueprintCreateDto updateDto = new BlueprintCreateDto();
        updateDto.setName(blueprintName);
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
        createDto.setName("Blueprint To Delete " + UUID.randomUUID());
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
        
        // Note: No need to track for cleanup since it's already deleted
    }

    @Test
    @Transactional
    public void testCreateBlueprintWithInvalidResourceTypeId() {
        // Given
        UUID invalidResourceTypeId = UUID.randomUUID();

        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint " + UUID.randomUUID());
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
        createDto.setName("Test Blueprint " + UUID.randomUUID());
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
        // Given - Create disabled cloud provider with unique name
        CloudProvider disabledProvider = new CloudProvider();
        String disabledCloudName = "DISABLED_CLOUD_" + UUID.randomUUID();
        disabledProvider.name = disabledCloudName;
        disabledProvider.displayName = "Disabled Cloud";
        disabledProvider.enabled = false;
        disabledProvider.persist();
        createdCloudProviderIds.add(disabledProvider.id);

        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Test Blueprint " + UUID.randomUUID());
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Test Resource");
        resourceDto.setBlueprintResourceTypeId(resourceTypeId);
        resourceDto.setCloudType(disabledCloudName);
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());

        createDto.setResources(List.of(resourceDto));

        // When/Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            blueprintService.createBlueprint(createDto);
        });

        assertTrue(exception.getMessage().contains("Cloud provider is not enabled"));
        assertTrue(exception.getMessage().contains(disabledCloudName));
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
