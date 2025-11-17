package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.BlueprintCreateDto;
import com.angryss.idp.application.dtos.BlueprintResourceCreateDto;
import com.angryss.idp.application.dtos.BlueprintResponseDto;
import com.angryss.idp.application.dtos.StackCreateDto;
import com.angryss.idp.application.dtos.StackResponseDto;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration;
import com.angryss.idp.domain.valueobjects.sharedinfra.StorageConfiguration;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class StackServiceTest {

    @Inject
    StackService stackService;

    @Inject
    BlueprintService blueprintService;

    private String uniqueId;
    private UUID cloudProviderId;
    private UUID containerOrchestratorTypeId;
    private UUID storageTypeId;

    // Track created entities for cleanup
    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdBlueprintIds = new ArrayList<>();
    private List<UUID> createdResourceTypeIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @BeforeEach
    @Transactional
    public void setUp() {
        // Generate unique ID for this test execution
        uniqueId = UUID.randomUUID().toString().substring(0, 8);

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

        // Create Container Orchestrator resource type
        ResourceType containerOrchestratorType = new ResourceType();
        containerOrchestratorType.name = "Managed Container Orchestrator";
        containerOrchestratorType.displayName = "Managed Container Orchestrator";
        containerOrchestratorType.category = ResourceCategory.SHARED;
        containerOrchestratorType.enabled = true;
        containerOrchestratorType.persist();
        containerOrchestratorTypeId = containerOrchestratorType.id;
        createdResourceTypeIds.add(containerOrchestratorTypeId);

        // Create Storage resource type
        ResourceType storageType = new ResourceType();
        storageType.name = "Storage";
        storageType.displayName = "Storage";
        storageType.category = ResourceCategory.SHARED;
        storageType.enabled = true;
        storageType.persist();
        storageTypeId = storageType.id;
        createdResourceTypeIds.add(storageTypeId);
    }

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in correct order (children first to respect foreign key constraints)
        
        // 1. Delete Stacks
        for (UUID id : createdStackIds) {
            Stack stack = Stack.findById(id);
            if (stack != null) {
                // Clear stack resources if any
                if (stack.getStackResources() != null) {
                    stack.getStackResources().clear();
                }
                stack.delete();
            }
        }
        
        // 2. Delete Blueprints (BlueprintResources will be cascade deleted due to orphanRemoval)
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
        
        // 4. Delete CloudProviders
        for (UUID id : createdCloudProviderIds) {
            CloudProvider cloudProvider = CloudProvider.findById(id);
            if (cloudProvider != null) {
                cloudProvider.delete();
            }
        }
        
        // Clear all tracking lists
        createdStackIds.clear();
        createdBlueprintIds.clear();
        createdResourceTypeIds.clear();
        createdCloudProviderIds.clear();
    }

    // ========== Validation Tests ==========

    @Test
    @Transactional
    public void testCreateRestfulApiStackWithValidBlueprint_Success() {
        // Given - Blueprint with Container Orchestrator
        BlueprintResponseDto blueprint = createBlueprintWithContainerOrchestrator();
        createdBlueprintIds.add(blueprint.getId());

        // When - Create RESTful API stack with valid blueprint
        StackCreateDto createDto = createStackDto(StackType.RESTFUL_API, blueprint.getId());
        StackResponseDto result = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(result.getId());

        // Then - Stack should be created successfully
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(StackType.RESTFUL_API, result.getStackType());
        assertEquals(blueprint.getId(), result.getBlueprintId());
    }

    @Test
    @Transactional
    public void testCreateRestfulApiStackWithInvalidBlueprint_Fails() {
        // Given - Blueprint WITHOUT Container Orchestrator (only Storage)
        BlueprintResponseDto blueprint = createBlueprintWithStorage();
        createdBlueprintIds.add(blueprint.getId());

        // When/Then - Creating RESTful API stack should fail
        StackCreateDto createDto = createStackDto(StackType.RESTFUL_API, blueprint.getId());
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            stackService.createStack(createDto, "test-user@example.com");
        });

        assertTrue(exception.getMessage().contains("RESTful API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    @Transactional
    public void testCreateEventDrivenApiStackWithValidBlueprint_Success() {
        // Given - Blueprint with Container Orchestrator
        BlueprintResponseDto blueprint = createBlueprintWithContainerOrchestrator();
        createdBlueprintIds.add(blueprint.getId());

        // When - Create Event-driven API stack with valid blueprint
        StackCreateDto createDto = createStackDto(StackType.EVENT_DRIVEN_API, blueprint.getId());
        StackResponseDto result = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(result.getId());

        // Then - Stack should be created successfully
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(StackType.EVENT_DRIVEN_API, result.getStackType());
        assertEquals(blueprint.getId(), result.getBlueprintId());
    }

    @Test
    @Transactional
    public void testCreateEventDrivenApiStackWithInvalidBlueprint_Fails() {
        // Given - Blueprint WITHOUT Container Orchestrator (only Storage)
        BlueprintResponseDto blueprint = createBlueprintWithStorage();
        createdBlueprintIds.add(blueprint.getId());

        // When/Then - Creating Event-driven API stack should fail
        StackCreateDto createDto = createStackDto(StackType.EVENT_DRIVEN_API, blueprint.getId());
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            stackService.createStack(createDto, "test-user@example.com");
        });

        assertTrue(exception.getMessage().contains("Event-driven API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    @Transactional
    public void testCreateJavaScriptWebAppWithValidBlueprint_Success() {
        // Given - Blueprint with Storage
        BlueprintResponseDto blueprint = createBlueprintWithStorage();
        createdBlueprintIds.add(blueprint.getId());

        // When - Create JavaScript Web Application stack with valid blueprint
        StackCreateDto createDto = createStackDto(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint.getId());
        StackResponseDto result = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(result.getId());

        // Then - Stack should be created successfully
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(StackType.JAVASCRIPT_WEB_APPLICATION, result.getStackType());
        assertEquals(blueprint.getId(), result.getBlueprintId());
    }

    @Test
    @Transactional
    public void testCreateJavaScriptWebAppWithInvalidBlueprint_Fails() {
        // Given - Blueprint WITHOUT Storage (only Container Orchestrator)
        BlueprintResponseDto blueprint = createBlueprintWithContainerOrchestrator();
        createdBlueprintIds.add(blueprint.getId());

        // When/Then - Creating JavaScript Web Application stack should fail
        StackCreateDto createDto = createStackDto(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint.getId());
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            stackService.createStack(createDto, "test-user@example.com");
        });

        assertTrue(exception.getMessage().contains("JavaScript Web Application"));
        assertTrue(exception.getMessage().contains("Storage"));
    }

    @Test
    @Transactional
    public void testUpdateStackToInvalidBlueprint_Fails() {
        // Given - Create RESTful API stack with valid blueprint (has Container Orchestrator)
        BlueprintResponseDto validBlueprint = createBlueprintWithContainerOrchestrator();
        createdBlueprintIds.add(validBlueprint.getId());

        StackCreateDto createDto = createStackDto(StackType.RESTFUL_API, validBlueprint.getId());
        StackResponseDto createdStack = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(createdStack.getId());

        // Create invalid blueprint (only Storage, no Container Orchestrator)
        BlueprintResponseDto invalidBlueprint = createBlueprintWithStorage();
        createdBlueprintIds.add(invalidBlueprint.getId());

        // When/Then - Updating to invalid blueprint should fail
        StackCreateDto updateDto = createStackDto(StackType.RESTFUL_API, invalidBlueprint.getId());
        
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            stackService.updateStack(createdStack.getId(), updateDto, "test-user@example.com");
        });

        assertTrue(exception.getMessage().contains("RESTful API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    @Transactional
    public void testCreateInfrastructureStackWithoutBlueprint_Success() {
        // Given - Infrastructure stack without blueprint
        StackCreateDto createDto = createStackDto(StackType.INFRASTRUCTURE, null);

        // When - Create Infrastructure stack without blueprint
        StackResponseDto result = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(result.getId());

        // Then - Stack should be created successfully
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(StackType.INFRASTRUCTURE, result.getStackType());
        assertNull(result.getBlueprintId());
    }

    @Test
    @Transactional
    public void testCreateServerlessStackWithoutOrchestrator_Success() {
        // Given - Blueprint without Container Orchestrator (only Storage)
        BlueprintResponseDto blueprint = createBlueprintWithStorage();
        createdBlueprintIds.add(blueprint.getId());

        // When - Create Serverless stack (doesn't require Container Orchestrator)
        StackCreateDto createDto = createStackDto(StackType.RESTFUL_SERVERLESS, blueprint.getId());
        StackResponseDto result = stackService.createStack(createDto, "test-user@example.com");
        createdStackIds.add(result.getId());

        // Then - Stack should be created successfully
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals(StackType.RESTFUL_SERVERLESS, result.getStackType());
        assertEquals(blueprint.getId(), result.getBlueprintId());
    }

    // ========== Helper Methods ==========

    private StackCreateDto createStackDto(StackType stackType, UUID blueprintId) {
        StackCreateDto dto = new StackCreateDto();
        dto.setName("test-stack-" + uniqueId + "-" + UUID.randomUUID().toString().substring(0, 4));
        dto.setDescription("Test stack for validation");
        dto.setCloudName("test-cloud-" + uniqueId + "-" + UUID.randomUUID().toString().substring(0, 4));
        dto.setRoutePath("/test-" + uniqueId.substring(0, 4) + "-" + UUID.randomUUID().toString().substring(0, 4) + "/");
        dto.setStackType(stackType);
        dto.setProgrammingLanguage(ProgrammingLanguage.QUARKUS);
        dto.setBlueprintId(blueprintId);
        return dto;
    }

    private BlueprintResponseDto createBlueprintWithContainerOrchestrator() {
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint-Orchestrator-" + uniqueId + "-" + UUID.randomUUID().toString().substring(0, 4));
        createDto.setDescription("Blueprint with Container Orchestrator");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Container Orchestrator");
        resourceDto.setDescription("Managed Container Orchestrator");
        resourceDto.setBlueprintResourceTypeId(containerOrchestratorTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new ContainerOrchestratorConfiguration());
        resourceDto.setCloudSpecificProperties(new HashMap<>());

        createDto.setResources(List.of(resourceDto));

        return blueprintService.createBlueprint(createDto);
    }

    private BlueprintResponseDto createBlueprintWithStorage() {
        BlueprintCreateDto createDto = new BlueprintCreateDto();
        createDto.setName("Blueprint-Storage-" + uniqueId + "-" + UUID.randomUUID().toString().substring(0, 4));
        createDto.setDescription("Blueprint with Storage");
        createDto.setSupportedCloudProviderIds(Set.of(cloudProviderId));

        BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
        resourceDto.setName("Storage");
        resourceDto.setDescription("S3 Storage");
        resourceDto.setBlueprintResourceTypeId(storageTypeId);
        resourceDto.setCloudType("AWS");
        resourceDto.setConfiguration(new StorageConfiguration());
        resourceDto.setCloudSpecificProperties(new HashMap<>());

        createDto.setResources(List.of(resourceDto));

        return blueprintService.createBlueprint(createDto);
    }
}
