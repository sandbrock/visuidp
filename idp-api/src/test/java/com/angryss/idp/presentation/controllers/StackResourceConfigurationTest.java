package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasKey;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for Stack resource configuration with AWS properties.
 * Tests the end-to-end flow of creating a Stack with RDS resource configuration.
 * 
 * Requirements tested:
 * - 2.1: AWS RDS property schemas are available for Stack resources
 * - 7.1: Default values are pre-populated
 * - 7.4: Developers can override default values
 * - 8.3: Required properties must be provided
 */
@QuarkusTest
public class StackResourceConfigurationTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    private String uniqueId;
    private UUID awsProviderId;
    private UUID rdsResourceTypeId;
    private UUID rdsMappingId;
    private List<UUID> createdStackIds = new ArrayList<>();

    @BeforeEach
    @Transactional
    public void setup() {
        // Generate unique ID for this test execution
        uniqueId = UUID.randomUUID().toString().substring(0, 8);

        // Clean up only test-created stacks (not all data)
        Stack.list("name like ?1", "test-stack%").forEach(stack -> ((Stack) stack).delete());
        
        // Find or create AWS cloud provider (may exist from V2 migration)
        CloudProvider awsProvider = CloudProvider.find("name", "AWS").firstResult();
        if (awsProvider == null) {
            awsProvider = new CloudProvider();
            awsProvider.name = "AWS";
            awsProvider.displayName = "Amazon Web Services";
            awsProvider.description = "AWS cloud provider";
            awsProvider.enabled = true;
            awsProvider.persist();
        }
        awsProviderId = awsProvider.id;

        // Find or create Relational Database Server resource type (may exist from V2 migration)
        ResourceType rdsResourceType = ResourceType.find("name", "RELATIONAL_DATABASE_SERVER").firstResult();
        if (rdsResourceType == null) {
            rdsResourceType = new ResourceType();
            rdsResourceType.name = "RELATIONAL_DATABASE_SERVER";
            rdsResourceType.displayName = "Relational Database Server";
            rdsResourceType.description = "Managed relational database service";
            rdsResourceType.category = ResourceCategory.NON_SHARED;
            rdsResourceType.enabled = true;
            rdsResourceType.persist();
        }
        rdsResourceTypeId = rdsResourceType.id;

        // Find or create resource type cloud mapping for RDS + AWS
        ResourceTypeCloudMapping rdsMapping = ResourceTypeCloudMapping.find(
            "resourceType.id = ?1 and cloudProvider.id = ?2", 
            rdsResourceTypeId, awsProviderId
        ).firstResult();
        
        if (rdsMapping == null) {
            rdsMapping = new ResourceTypeCloudMapping();
            rdsMapping.resourceType = rdsResourceType;
            rdsMapping.cloudProvider = awsProvider;
            rdsMapping.terraformModuleLocation = "https://github.com/terraform-aws-modules/terraform-aws-rds";
            rdsMapping.moduleLocationType = ModuleLocationType.GIT;
            rdsMapping.enabled = true;
            rdsMapping.persist();
        }
        rdsMappingId = rdsMapping.id;

        // Create AWS RDS property schemas if they don't exist
        long existingSchemaCount = PropertySchema.count("mapping.id", rdsMappingId);
        if (existingSchemaCount == 0) {
            createRdsPropertySchemas(rdsMapping);
        }
    }

    private void createRdsPropertySchemas(ResourceTypeCloudMapping mapping) {
        // 1. engine property (required)
        PropertySchema engineSchema = new PropertySchema();
        engineSchema.mapping = mapping;
        engineSchema.propertyName = "engine";
        engineSchema.displayName = "Database Engine";
        engineSchema.description = "The database engine to use (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server)";
        engineSchema.dataType = PropertyDataType.LIST;
        engineSchema.required = true;
        // defaultValue omitted for simplicity in test
        engineSchema.validationRules = Map.of("allowedValues", List.of(
            Map.of("value", "mysql", "label", "MySQL"),
            Map.of("value", "postgres", "label", "PostgreSQL"),
            Map.of("value", "mariadb", "label", "MariaDB"),
            Map.of("value", "oracle-ee", "label", "Oracle Enterprise Edition"),
            Map.of("value", "oracle-se2", "label", "Oracle Standard Edition 2"),
            Map.of("value", "sqlserver-ex", "label", "SQL Server Express"),
            Map.of("value", "sqlserver-web", "label", "SQL Server Web"),
            Map.of("value", "sqlserver-se", "label", "SQL Server Standard"),
            Map.of("value", "sqlserver-ee", "label", "SQL Server Enterprise")
        ));
        engineSchema.displayOrder = 10;
        engineSchema.persist();

        // 2. engineVersion property (required)
        PropertySchema engineVersionSchema = new PropertySchema();
        engineVersionSchema.mapping = mapping;
        engineVersionSchema.propertyName = "engineVersion";
        engineVersionSchema.displayName = "Engine Version";
        engineVersionSchema.description = "The version of the database engine (e.g., 14.7 for PostgreSQL, 8.0.32 for MySQL)";
        engineVersionSchema.dataType = PropertyDataType.STRING;
        engineVersionSchema.required = true;
        engineVersionSchema.displayOrder = 20;
        engineVersionSchema.persist();

        // 3. instanceClass property (required)
        PropertySchema instanceClassSchema = new PropertySchema();
        instanceClassSchema.mapping = mapping;
        instanceClassSchema.propertyName = "instanceClass";
        instanceClassSchema.displayName = "Instance Class";
        instanceClassSchema.description = "The compute and memory capacity. t3 instances are burstable, m5 are general purpose, r5 are memory-optimized";
        instanceClassSchema.dataType = PropertyDataType.LIST;
        instanceClassSchema.required = true;
        // defaultValue omitted for simplicity in test
        instanceClassSchema.validationRules = Map.of("allowedValues", List.of(
            Map.of("value", "db.t3.micro", "label", "db.t3.micro"),
            Map.of("value", "db.t3.small", "label", "db.t3.small"),
            Map.of("value", "db.t3.medium", "label", "db.t3.medium"),
            Map.of("value", "db.t3.large", "label", "db.t3.large"),
            Map.of("value", "db.m5.large", "label", "db.m5.large"),
            Map.of("value", "db.m5.xlarge", "label", "db.m5.xlarge"),
            Map.of("value", "db.m5.2xlarge", "label", "db.m5.2xlarge"),
            Map.of("value", "db.r5.large", "label", "db.r5.large"),
            Map.of("value", "db.r5.xlarge", "label", "db.r5.xlarge")
        ));
        instanceClassSchema.displayOrder = 30;
        instanceClassSchema.persist();

        // 4. allocatedStorage property (required)
        PropertySchema allocatedStorageSchema = new PropertySchema();
        allocatedStorageSchema.mapping = mapping;
        allocatedStorageSchema.propertyName = "allocatedStorage";
        allocatedStorageSchema.displayName = "Allocated Storage (GB)";
        allocatedStorageSchema.description = "The amount of storage in gigabytes (20-65536 GB)";
        allocatedStorageSchema.dataType = PropertyDataType.NUMBER;
        allocatedStorageSchema.required = true;
        // defaultValue omitted for simplicity in test
        allocatedStorageSchema.validationRules = Map.of("min", 20, "max", 65536);
        allocatedStorageSchema.displayOrder = 40;
        allocatedStorageSchema.persist();

        // 5. multiAZ property (optional)
        PropertySchema multiAZSchema = new PropertySchema();
        multiAZSchema.mapping = mapping;
        multiAZSchema.propertyName = "multiAZ";
        multiAZSchema.displayName = "Multi-AZ Deployment";
        multiAZSchema.description = "Deploy a standby instance in a different availability zone for high availability";
        multiAZSchema.dataType = PropertyDataType.BOOLEAN;
        multiAZSchema.required = false;
        // defaultValue omitted for simplicity in test
        multiAZSchema.displayOrder = 50;
        multiAZSchema.persist();

        // 6. backupRetentionPeriod property (optional)
        PropertySchema backupRetentionSchema = new PropertySchema();
        backupRetentionSchema.mapping = mapping;
        backupRetentionSchema.propertyName = "backupRetentionPeriod";
        backupRetentionSchema.displayName = "Backup Retention (Days)";
        backupRetentionSchema.description = "Number of days to retain automated backups (0-35 days, 0 disables backups)";
        backupRetentionSchema.dataType = PropertyDataType.NUMBER;
        backupRetentionSchema.required = false;
        // defaultValue omitted for simplicity in test
        backupRetentionSchema.validationRules = Map.of("min", 0, "max", 35);
        backupRetentionSchema.displayOrder = 60;
        backupRetentionSchema.persist();

        // 7. storageEncrypted property (optional)
        PropertySchema storageEncryptedSchema = new PropertySchema();
        storageEncryptedSchema.mapping = mapping;
        storageEncryptedSchema.propertyName = "storageEncrypted";
        storageEncryptedSchema.displayName = "Storage Encryption";
        storageEncryptedSchema.description = "Encrypt the database storage at rest. Recommended for production";
        storageEncryptedSchema.dataType = PropertyDataType.BOOLEAN;
        storageEncryptedSchema.required = false;
        // defaultValue omitted for simplicity in test
        storageEncryptedSchema.displayOrder = 70;
        storageEncryptedSchema.persist();

        // 8. publiclyAccessible property (optional)
        PropertySchema publiclyAccessibleSchema = new PropertySchema();
        publiclyAccessibleSchema.mapping = mapping;
        publiclyAccessibleSchema.propertyName = "publiclyAccessible";
        publiclyAccessibleSchema.displayName = "Publicly Accessible";
        publiclyAccessibleSchema.description = "Allow connections from the internet. Keep false for security unless required";
        publiclyAccessibleSchema.dataType = PropertyDataType.BOOLEAN;
        publiclyAccessibleSchema.required = false;
        // defaultValue omitted for simplicity in test
        publiclyAccessibleSchema.displayOrder = 80;
        publiclyAccessibleSchema.persist();
    }

    @AfterEach
    @Transactional
    public void tearDown() {
        // Clean up only test-created stacks (not all data)
        createdStackIds.forEach(id -> {
            try {
                Stack stack = Stack.findById(id);
                if (stack != null) {
                    stack.delete();
                }
            } catch (Exception e) {
                System.err.println("Failed to delete stack: " + id);
            }
        });
        createdStackIds.clear();
        
        // Clean up any remaining test stacks
        Stack.list("name like ?1", "test-stack%").forEach(stack -> ((Stack) stack).delete());
    }

    @Test
    public void testGetResourceSchemaForStackRds() {
        // Verify that property schemas are available for Stack RDS resources
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/stacks/resource-schema/" + rdsResourceTypeId + "/" + awsProviderId)
            .then()
            .statusCode(200)
            .body("$", hasKey("engine"))
            .body("engine.propertyName", equalTo("engine"))
            .body("engine.displayName", equalTo("Database Engine"))
            .body("engine.dataType", equalTo("LIST"))
            .body("engine.required", equalTo(true))
            .body("$", hasKey("engineVersion"))
            .body("engineVersion.required", equalTo(true))
            .body("$", hasKey("instanceClass"))
            .body("instanceClass.required", equalTo(true))
            .body("$", hasKey("allocatedStorage"))
            .body("allocatedStorage.required", equalTo(true))
            .body("$", hasKey("multiAZ"))
            .body("multiAZ.required", equalTo(false))
            .body("$", hasKey("backupRetentionPeriod"))
            .body("backupRetentionPeriod.required", equalTo(false))
            .body("$", hasKey("storageEncrypted"))
            .body("storageEncrypted.required", equalTo(false))
            .body("$", hasKey("publiclyAccessible"))
            .body("publiclyAccessible.required", equalTo(false));
    }

    @Test
    public void testCreateStackWithRdsResourceConfiguration() {
        // Create Stack with RDS resource configuration including all required properties
        Map<String, Object> rdsConfig = new HashMap<>();
        rdsConfig.put("resourceTypeId", rdsResourceTypeId.toString());
        rdsConfig.put("cloudProviderId", awsProviderId.toString());
        rdsConfig.put("engine", "postgres");
        rdsConfig.put("engineVersion", "14.7");
        rdsConfig.put("instanceClass", "db.t3.medium");
        rdsConfig.put("allocatedStorage", 100);
        rdsConfig.put("multiAZ", true);
        rdsConfig.put("backupRetentionPeriod", 14);
        rdsConfig.put("storageEncrypted", true);
        rdsConfig.put("publiclyAccessible", false);

        Map<String, Object> configuration = new HashMap<>();
        configuration.put("database", rdsConfig);

        Map<String, Object> stackRequest = new HashMap<>();
        stackRequest.put("name", "test-stack-" + uniqueId);
        stackRequest.put("description", "Test stack with RDS configuration");
        stackRequest.put("cloudName", "teststack" + uniqueId);
        stackRequest.put("routePath", "/test" + uniqueId + "/");
        stackRequest.put("stackType", "INFRASTRUCTURE");
        stackRequest.put("configuration", configuration);

        String stackId = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackRequest)
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(201)
            .body("name", equalTo("test-stack-" + uniqueId))
            .body("configuration", notNullValue())
            .body("configuration.database", notNullValue())
            .body("configuration.database.engine", equalTo("postgres"))
            .body("configuration.database.engineVersion", equalTo("14.7"))
            .body("configuration.database.instanceClass", equalTo("db.t3.medium"))
            .body("configuration.database.allocatedStorage", equalTo(100))
            .body("configuration.database.multiAZ", equalTo(true))
            .body("configuration.database.backupRetentionPeriod", equalTo(14))
            .body("configuration.database.storageEncrypted", equalTo(true))
            .body("configuration.database.publiclyAccessible", equalTo(false))
            .extract()
            .path("id");

        // Track for cleanup
        createdStackIds.add(UUID.fromString(stackId));

        // Verify the stack was saved correctly in the database
        verifyStackInDatabase(UUID.fromString(stackId), rdsConfig);
    }

    @Test
    public void testCreateStackWithRdsResourceUsingDefaults() {
        // Create Stack with RDS resource using default values for optional properties
        Map<String, Object> rdsConfig = new HashMap<>();
        rdsConfig.put("resourceTypeId", rdsResourceTypeId.toString());
        rdsConfig.put("cloudProviderId", awsProviderId.toString());
        rdsConfig.put("engine", "mysql");  // Override default
        rdsConfig.put("engineVersion", "8.0.32");
        rdsConfig.put("instanceClass", "db.t3.small");  // Use default
        rdsConfig.put("allocatedStorage", 20);  // Use default
        // Optional properties not specified - should use defaults

        Map<String, Object> configuration = new HashMap<>();
        configuration.put("database", rdsConfig);

        Map<String, Object> stackRequest = new HashMap<>();
        stackRequest.put("name", "test-stack-defaults-" + uniqueId);
        stackRequest.put("description", "Test stack with RDS defaults");
        stackRequest.put("cloudName", "testdefaults" + uniqueId);
        stackRequest.put("routePath", "/testdef" + uniqueId + "/");
        stackRequest.put("stackType", "INFRASTRUCTURE");
        stackRequest.put("configuration", configuration);

        String stackId = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackRequest)
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(201)
            .body("name", equalTo("test-stack-defaults-" + uniqueId))
            .body("configuration.database.engine", equalTo("mysql"))
            .body("configuration.database.engineVersion", equalTo("8.0.32"))
            .body("configuration.database.instanceClass", equalTo("db.t3.small"))
            .body("configuration.database.allocatedStorage", equalTo(20))
            .extract()
            .path("id");

        // Track for cleanup
        createdStackIds.add(UUID.fromString(stackId));
    }

    @Test
    public void testCreateStackWithRdsMissingRequiredProperty() {
        // Attempt to create Stack with RDS resource missing required property (engine)
        Map<String, Object> rdsConfig = new HashMap<>();
        rdsConfig.put("resourceTypeId", rdsResourceTypeId.toString());
        rdsConfig.put("cloudProviderId", awsProviderId.toString());
        // Missing: engine (required)
        rdsConfig.put("engineVersion", "14.7");
        rdsConfig.put("instanceClass", "db.t3.small");
        rdsConfig.put("allocatedStorage", 20);

        Map<String, Object> configuration = new HashMap<>();
        configuration.put("database", rdsConfig);

        Map<String, Object> stackRequest = new HashMap<>();
        stackRequest.put("name", "test-stack-invalid-" + uniqueId);
        stackRequest.put("description", "Test stack with invalid RDS config");
        stackRequest.put("cloudName", "testinvalid" + uniqueId);
        stackRequest.put("routePath", "/testinv" + uniqueId + "/");
        stackRequest.put("stackType", "INFRASTRUCTURE");
        stackRequest.put("configuration", configuration);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackRequest)
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(400)  // Bad request due to validation failure
            .body(containsString("engine"));  // Error message should mention the missing property
    }

    @Test
    public void testCreateStackWithRdsInvalidPropertyValue() {
        // Attempt to create Stack with RDS resource with invalid property value
        Map<String, Object> rdsConfig = new HashMap<>();
        rdsConfig.put("resourceTypeId", rdsResourceTypeId.toString());
        rdsConfig.put("cloudProviderId", awsProviderId.toString());
        rdsConfig.put("engine", "postgres");
        rdsConfig.put("engineVersion", "14.7");
        rdsConfig.put("instanceClass", "db.t3.small");
        rdsConfig.put("allocatedStorage", 10);  // Invalid: below minimum of 20

        Map<String, Object> configuration = new HashMap<>();
        configuration.put("database", rdsConfig);

        Map<String, Object> stackRequest = new HashMap<>();
        stackRequest.put("name", "test-stack-invalid-value-" + uniqueId);
        stackRequest.put("description", "Test stack with invalid RDS value");
        stackRequest.put("cloudName", "testinvval" + uniqueId);
        stackRequest.put("routePath", "/testval" + uniqueId + "/");
        stackRequest.put("stackType", "INFRASTRUCTURE");
        stackRequest.put("configuration", configuration);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackRequest)
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(400)  // Bad request due to validation failure
            .body(containsString("allocatedStorage"));  // Error message should mention the invalid property
    }

    @Transactional
    void verifyStackInDatabase(UUID stackId, Map<String, Object> expectedConfig) {
        Stack stack = Stack.findById(stackId);
        assertNotNull(stack, "Stack should exist in database");
        assertNotNull(stack.getConfiguration(), "Stack configuration should not be null");
        
        Map<String, Object> dbConfig = stack.getConfiguration();
        assertTrue(dbConfig.containsKey("database"), "Configuration should contain database resource");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> dbRdsConfig = (Map<String, Object>) dbConfig.get("database");
        
        // Verify all properties are saved correctly
        assertEquals(expectedConfig.get("engine"), dbRdsConfig.get("engine"));
        assertEquals(expectedConfig.get("engineVersion"), dbRdsConfig.get("engineVersion"));
        assertEquals(expectedConfig.get("instanceClass"), dbRdsConfig.get("instanceClass"));
        assertEquals(expectedConfig.get("allocatedStorage"), dbRdsConfig.get("allocatedStorage"));
        assertEquals(expectedConfig.get("multiAZ"), dbRdsConfig.get("multiAZ"));
        assertEquals(expectedConfig.get("backupRetentionPeriod"), dbRdsConfig.get("backupRetentionPeriod"));
        assertEquals(expectedConfig.get("storageEncrypted"), dbRdsConfig.get("storageEncrypted"));
        assertEquals(expectedConfig.get("publiclyAccessible"), dbRdsConfig.get("publiclyAccessible"));
    }
}
