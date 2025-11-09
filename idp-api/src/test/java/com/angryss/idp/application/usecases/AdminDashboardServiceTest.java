package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.AdminDashboardDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class AdminDashboardServiceTest {

    @Inject
    AdminDashboardService adminDashboardService;

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
    public void testGetDashboard() {
        // Given
        CloudProvider aws = createTestCloudProvider("AWS", "Amazon Web Services", true);
        CloudProvider azure = createTestCloudProvider("AZURE", "Microsoft Azure", false);
        
        ResourceType database = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, true);
        ResourceType orchestrator = createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);
        
        ResourceTypeCloudMapping mapping1 = createTestMapping(database, aws, "git::https://example.com/db.git", ModuleLocationType.GIT, true);
        ResourceTypeCloudMapping mapping2 = createTestMapping(orchestrator, azure, "git::https://example.com/ecs.git", ModuleLocationType.GIT, false);
        
        createTestPropertySchema(mapping1, "instanceType", "Instance Type", PropertyDataType.STRING, true);
        createTestPropertySchema(mapping1, "storage", "Storage Size", PropertyDataType.NUMBER, false);

        // When
        AdminDashboardDto dashboard = adminDashboardService.getDashboard();

        // Then
        assertNotNull(dashboard);
        assertNotNull(dashboard.getCloudProviders());
        assertNotNull(dashboard.getResourceTypes());
        assertNotNull(dashboard.getMappings());
        assertNotNull(dashboard.getStatistics());
        
        assertEquals(2, dashboard.getCloudProviders().size());
        assertEquals(2, dashboard.getResourceTypes().size());
        assertEquals(2, dashboard.getMappings().size());
        assertFalse(dashboard.getStatistics().isEmpty());
    }

    @Test
    @Transactional
    public void testGetIncompleteMappings() {
        // Given
        CloudProvider aws = createTestCloudProvider("AWS", "Amazon Web Services", true);
        CloudProvider azure = createTestCloudProvider("AZURE", "Microsoft Azure", true);
        
        ResourceType database = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, true);
        ResourceType storage = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, true);
        
        // Complete mapping (has properties)
        ResourceTypeCloudMapping completeMapping = createTestMapping(database, aws, "git::https://example.com/db.git", ModuleLocationType.GIT, true);
        createTestPropertySchema(completeMapping, "instanceType", "Instance Type", PropertyDataType.STRING, true);
        
        // Incomplete mapping (no properties)
        createTestMapping(storage, azure, "git::https://example.com/storage.git", ModuleLocationType.GIT, true);

        // When
        List<ResourceTypeCloudMappingDto> incompleteMappings = adminDashboardService.getIncompleteMappings();

        // Then
        assertNotNull(incompleteMappings);
        assertEquals(1, incompleteMappings.size());
        
        ResourceTypeCloudMappingDto incompleteMapping = incompleteMappings.get(0);
        assertFalse(incompleteMapping.getIsComplete());
        assertEquals("STORAGE", incompleteMapping.getResourceTypeName());
        assertEquals("AZURE", incompleteMapping.getCloudProviderName());
    }

    @Test
    @Transactional
    public void testGetStatistics() {
        // Given
        CloudProvider aws = createTestCloudProvider("AWS", "Amazon Web Services", true);
        CloudProvider azure = createTestCloudProvider("AZURE", "Microsoft Azure", false);
        CloudProvider gcp = createTestCloudProvider("GCP", "Google Cloud Platform", true);
        
        ResourceType database = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, true);
        ResourceType orchestrator = createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);
        ResourceType storage = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, false);
        
        ResourceTypeCloudMapping mapping1 = createTestMapping(database, aws, "git::https://example.com/db.git", ModuleLocationType.GIT, true);
        ResourceTypeCloudMapping mapping2 = createTestMapping(orchestrator, azure, "git::https://example.com/ecs.git", ModuleLocationType.GIT, false);
        ResourceTypeCloudMapping mapping3 = createTestMapping(storage, gcp, "git::https://example.com/storage.git", ModuleLocationType.GIT, true);
        
        createTestPropertySchema(mapping1, "instanceType", "Instance Type", PropertyDataType.STRING, true);
        createTestPropertySchema(mapping1, "storage", "Storage Size", PropertyDataType.NUMBER, false);
        createTestPropertySchema(mapping2, "clusterSize", "Cluster Size", PropertyDataType.NUMBER, true);

        // When
        Map<String, Integer> statistics = adminDashboardService.getStatistics();

        // Then
        assertNotNull(statistics);
        
        // Cloud provider statistics
        assertEquals(3, statistics.get("totalCloudProviders"));
        assertEquals(2, statistics.get("enabledCloudProviders"));
        assertEquals(1, statistics.get("disabledCloudProviders"));
        
        // Resource type statistics
        assertEquals(3, statistics.get("totalResourceTypes"));
        assertEquals(2, statistics.get("enabledResourceTypes"));
        assertEquals(1, statistics.get("disabledResourceTypes"));
        
        // Mapping statistics
        assertEquals(3, statistics.get("totalMappings"));
        assertEquals(2, statistics.get("enabledMappings"));
        assertEquals(1, statistics.get("disabledMappings"));
        
        // Completeness statistics
        assertEquals(2, statistics.get("completeMappings")); // mapping1 and mapping2 have properties
        assertEquals(1, statistics.get("incompleteMappings")); // mapping3 has no properties
        
        // Property schema statistics
        assertEquals(3, statistics.get("totalPropertySchemas"));
    }

    @Test
    @Transactional
    public void testGetStatisticsWithEmptyDatabase() {
        // Given - empty database (cleaned up in @BeforeEach)

        // When
        Map<String, Integer> statistics = adminDashboardService.getStatistics();

        // Then
        assertNotNull(statistics);
        assertEquals(0, statistics.get("totalCloudProviders"));
        assertEquals(0, statistics.get("enabledCloudProviders"));
        assertEquals(0, statistics.get("disabledCloudProviders"));
        assertEquals(0, statistics.get("totalResourceTypes"));
        assertEquals(0, statistics.get("enabledResourceTypes"));
        assertEquals(0, statistics.get("disabledResourceTypes"));
        assertEquals(0, statistics.get("totalMappings"));
        assertEquals(0, statistics.get("enabledMappings"));
        assertEquals(0, statistics.get("disabledMappings"));
        assertEquals(0, statistics.get("completeMappings"));
        assertEquals(0, statistics.get("incompleteMappings"));
        assertEquals(0, statistics.get("totalPropertySchemas"));
    }

    @Test
    @Transactional
    public void testGetIncompleteMappingsWithAllComplete() {
        // Given
        CloudProvider aws = createTestCloudProvider("AWS", "Amazon Web Services", true);
        ResourceType database = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, true);
        
        ResourceTypeCloudMapping mapping = createTestMapping(database, aws, "git::https://example.com/db.git", ModuleLocationType.GIT, true);
        createTestPropertySchema(mapping, "instanceType", "Instance Type", PropertyDataType.STRING, true);

        // When
        List<ResourceTypeCloudMappingDto> incompleteMappings = adminDashboardService.getIncompleteMappings();

        // Then
        assertNotNull(incompleteMappings);
        assertTrue(incompleteMappings.isEmpty());
    }

    @Test
    @Transactional
    public void testGetDashboardAggregatesAllData() {
        // Given
        CloudProvider aws = createTestCloudProvider("AWS", "Amazon Web Services", true);
        ResourceType database = createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, true);
        ResourceTypeCloudMapping mapping = createTestMapping(database, aws, "git::https://example.com/db.git", ModuleLocationType.GIT, true);
        createTestPropertySchema(mapping, "instanceType", "Instance Type", PropertyDataType.STRING, true);

        // When
        AdminDashboardDto dashboard = adminDashboardService.getDashboard();

        // Then
        assertNotNull(dashboard);
        
        // Verify cloud providers
        assertEquals(1, dashboard.getCloudProviders().size());
        assertEquals("AWS", dashboard.getCloudProviders().get(0).getName());
        
        // Verify resource types
        assertEquals(1, dashboard.getResourceTypes().size());
        assertEquals("RELATIONAL_DATABASE", dashboard.getResourceTypes().get(0).getName());
        
        // Verify mappings
        assertEquals(1, dashboard.getMappings().size());
        assertTrue(dashboard.getMappings().get(0).getIsComplete());
        
        // Verify statistics
        Map<String, Integer> stats = dashboard.getStatistics();
        assertEquals(1, stats.get("totalCloudProviders"));
        assertEquals(1, stats.get("totalResourceTypes"));
        assertEquals(1, stats.get("totalMappings"));
        assertEquals(1, stats.get("completeMappings"));
        assertEquals(1, stats.get("totalPropertySchemas"));
    }

    /**
     * Helper method to create a test cloud provider entity
     */
    private CloudProvider createTestCloudProvider(String name, String displayName, Boolean enabled) {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = name;
        cloudProvider.displayName = displayName;
        cloudProvider.description = null;
        cloudProvider.enabled = enabled;
        cloudProvider.persist();
        return cloudProvider;
    }

    /**
     * Helper method to create a test resource type entity
     */
    private ResourceType createTestResourceType(String name, String displayName, ResourceCategory category, Boolean enabled) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.description = null;
        resourceType.category = category;
        resourceType.enabled = enabled;
        resourceType.persist();
        return resourceType;
    }

    /**
     * Helper method to create a test resource type cloud mapping entity
     */
    private ResourceTypeCloudMapping createTestMapping(ResourceType resourceType, CloudProvider cloudProvider, 
                                                       String terraformLocation, ModuleLocationType locationType, Boolean enabled) {
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = terraformLocation;
        mapping.moduleLocationType = locationType;
        mapping.enabled = enabled;
        mapping.persist();
        return mapping;
    }

    /**
     * Helper method to create a test property schema entity
     */
    private PropertySchema createTestPropertySchema(ResourceTypeCloudMapping mapping, String propertyName, 
                                                    String displayName, PropertyDataType dataType, Boolean required) {
        PropertySchema propertySchema = new PropertySchema();
        propertySchema.mapping = mapping;
        propertySchema.propertyName = propertyName;
        propertySchema.displayName = displayName;
        propertySchema.description = null;
        propertySchema.dataType = dataType;
        propertySchema.required = required;
        propertySchema.defaultValue = null;
        propertySchema.validationRules = null;
        propertySchema.displayOrder = null;
        propertySchema.persist();
        return propertySchema;
    }
}
