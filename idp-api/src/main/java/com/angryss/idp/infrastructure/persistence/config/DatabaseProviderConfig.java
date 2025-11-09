package com.angryss.idp.infrastructure.persistence.config;

import io.quarkus.arc.properties.IfBuildProperty;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Configuration class for database provider selection and validation.
 * Supports PostgreSQL and DynamoDB database backends.
 * 
 * This class provides CDI producer methods that select the appropriate
 * repository implementation based on the configured database provider.
 */
@ApplicationScoped
public class DatabaseProviderConfig {

    private static final Logger LOG = Logger.getLogger(DatabaseProviderConfig.class);
    
    private static final List<String> VALID_PROVIDERS = Arrays.asList("postgresql", "dynamodb");
    
    @ConfigProperty(name = "idp.database.provider", defaultValue = "postgresql")
    String databaseProvider;
    
    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    java.util.Optional<String> datasourceUrl;
    
    @ConfigProperty(name = "quarkus.datasource.username")
    java.util.Optional<String> datasourceUsername;
    
    @ConfigProperty(name = "quarkus.datasource.password")
    java.util.Optional<String> datasourcePassword;
    
    @ConfigProperty(name = "idp.database.dynamodb.region")
    java.util.Optional<String> dynamoDbRegion;
    
    @ConfigProperty(name = "idp.database.dynamodb.endpoint")
    java.util.Optional<String> dynamoDbEndpoint;
    
    /**
     * Produces a DynamoDB client bean when the database provider is set to DynamoDB.
     * This client is configured with the specified AWS region and optional endpoint override.
     * 
     * The endpoint override is useful for local development with DynamoDB Local.
     * 
     * @return Configured DynamoDB client
     * @throws IllegalStateException if required DynamoDB configuration is missing
     */
    @Produces
    @ApplicationScoped
    @IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
    public DynamoDbClient dynamoDbClient() {
        LOG.info("Creating DynamoDB client bean");
        
        // Get region, default to us-east-1 if not specified
        String region = dynamoDbRegion.orElse("us-east-1");
        LOG.infof("DynamoDB region: %s", region);
        
        // Build the DynamoDB client
        var builder = DynamoDbClient.builder()
            .region(Region.of(region))
            .credentialsProvider(DefaultCredentialsProvider.create());
        
        // Apply endpoint override if specified (for local testing with DynamoDB Local)
        if (dynamoDbEndpoint.isPresent()) {
            String endpoint = dynamoDbEndpoint.get();
            LOG.infof("Using custom DynamoDB endpoint: %s (local testing mode)", endpoint);
            builder.endpointOverride(URI.create(endpoint));
        }
        
        DynamoDbClient client = builder.build();
        LOG.info("DynamoDB client created successfully");
        
        return client;
    }
    
    /**
     * Validates database configuration on application startup.
     * Ensures the selected database provider is valid and required configuration is present.
     *
     * @param event The startup event
     * @throws IllegalStateException if configuration is invalid or incomplete
     */
    void onStart(@Observes StartupEvent event) {
        LOG.info("=".repeat(60));
        LOG.infof("Database Provider Configuration");
        LOG.info("=".repeat(60));
        LOG.infof("Selected provider: %s", databaseProvider);
        
        validateDatabaseProvider();
        validateProviderConfiguration();
        
        // Initialize DynamoDB tables if using DynamoDB provider
        if ("dynamodb".equals(getDatabaseProvider())) {
            initializeDynamoDbTables();
            validateDynamoDbTables();
        }
        
        LOG.infof("Database provider '%s' successfully configured and validated", databaseProvider);
        LOG.infof("Repository implementations will be injected based on provider selection");
        LOG.info("=".repeat(60));
    }
    
    /**
     * Validates that the configured database provider is supported.
     *
     * @throws IllegalStateException if the provider is not valid
     */
    private void validateDatabaseProvider() {
        if (databaseProvider == null || databaseProvider.trim().isEmpty()) {
            throw new IllegalStateException(
                "Database provider configuration is missing. " +
                "Please set 'idp.database.provider' to one of: " + String.join(", ", VALID_PROVIDERS)
            );
        }
        
        String normalizedProvider = databaseProvider.trim().toLowerCase();
        if (!VALID_PROVIDERS.contains(normalizedProvider)) {
            throw new IllegalStateException(
                String.format(
                    "Invalid database provider '%s'. Valid options are: %s",
                    databaseProvider,
                    String.join(", ", VALID_PROVIDERS)
                )
            );
        }
    }
    
    /**
     * Validates that required configuration properties are present for the selected provider.
     *
     * @throws IllegalStateException if required configuration is missing
     */
    private void validateProviderConfiguration() {
        String normalizedProvider = databaseProvider.trim().toLowerCase();
        
        if ("postgresql".equals(normalizedProvider)) {
            validatePostgreSQLConfiguration();
        } else if ("dynamodb".equals(normalizedProvider)) {
            validateDynamoDBConfiguration();
        }
    }
    
    /**
     * Validates PostgreSQL-specific configuration.
     * Ensures that database URL, username, and password are present.
     *
     * @throws IllegalStateException if required PostgreSQL configuration is missing
     */
    private void validatePostgreSQLConfiguration() {
        StringBuilder missingConfig = new StringBuilder();
        
        if (datasourceUrl.isEmpty()) {
            missingConfig.append("  - quarkus.datasource.jdbc.url (or DB_URL environment variable)\n");
        }
        if (datasourceUsername.isEmpty()) {
            missingConfig.append("  - quarkus.datasource.username (or DB_USERNAME environment variable)\n");
        }
        if (datasourcePassword.isEmpty()) {
            missingConfig.append("  - quarkus.datasource.password (or DB_PASSWORD environment variable)\n");
        }
        
        if (missingConfig.length() > 0) {
            String errorMessage = "\n" +
                "=".repeat(60) + "\n" +
                "PostgreSQL Configuration Error\n" +
                "=".repeat(60) + "\n" +
                "The PostgreSQL database provider requires the following configuration:\n\n" +
                missingConfig.toString() + "\n" +
                "Please set these properties in application.properties or as environment variables.\n" +
                "=".repeat(60);
            
            LOG.error(errorMessage);
            throw new IllegalStateException(
                "PostgreSQL database provider is missing required configuration. " +
                "See log output above for details."
            );
        }
        
        // Validate URL format
        String url = datasourceUrl.get();
        if (!url.startsWith("jdbc:postgresql://")) {
            String errorMessage = String.format(
                "Invalid PostgreSQL JDBC URL format: '%s'. " +
                "Expected format: jdbc:postgresql://host:port/database",
                url
            );
            LOG.error(errorMessage);
            throw new IllegalStateException(errorMessage);
        }
        
        LOG.infof("PostgreSQL configuration validated: URL=%s, Username=%s", 
            maskUrl(url), datasourceUsername.get());
    }
    
    /**
     * Masks sensitive parts of the database URL for logging.
     *
     * @param url The database URL
     * @return Masked URL safe for logging
     */
    private String maskUrl(String url) {
        // Extract just the host and database name, hide credentials if present
        if (url.contains("@")) {
            int atIndex = url.indexOf("@");
            int protocolEnd = url.indexOf("://") + 3;
            return url.substring(0, protocolEnd) + "***:***@" + url.substring(atIndex + 1);
        }
        return url;
    }
    
    /**
     * Validates DynamoDB-specific configuration.
     * Ensures that AWS region is present when provider is DynamoDB.
     *
     * @throws IllegalStateException if required DynamoDB configuration is missing
     */
    private void validateDynamoDBConfiguration() {
        StringBuilder missingConfig = new StringBuilder();
        
        if (dynamoDbRegion.isEmpty()) {
            missingConfig.append("  - idp.database.dynamodb.region (or DYNAMODB_REGION environment variable)\n");
        }
        
        if (missingConfig.length() > 0) {
            String errorMessage = "\n" +
                "=".repeat(60) + "\n" +
                "DynamoDB Configuration Error\n" +
                "=".repeat(60) + "\n" +
                "The DynamoDB database provider requires the following configuration:\n\n" +
                missingConfig.toString() + "\n" +
                "Optional configuration:\n" +
                "  - idp.database.dynamodb.endpoint (for local testing with DynamoDB Local)\n\n" +
                "AWS credentials will be loaded from the default credential provider chain:\n" +
                "  1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)\n" +
                "  2. System properties\n" +
                "  3. AWS credentials file (~/.aws/credentials)\n" +
                "  4. IAM role (when running on AWS infrastructure)\n\n" +
                "Please set the required properties in application.properties or as environment variables.\n" +
                "=".repeat(60);
            
            LOG.error(errorMessage);
            throw new IllegalStateException(
                "DynamoDB database provider is missing required configuration. " +
                "See log output above for details."
            );
        }
        
        // Validate region format
        String region = dynamoDbRegion.get();
        try {
            Region.of(region);
            LOG.infof("DynamoDB configuration validated: Region=%s", region);
            
            if (dynamoDbEndpoint.isPresent()) {
                LOG.infof("DynamoDB endpoint override: %s", dynamoDbEndpoint.get());
            }
        } catch (Exception e) {
            String errorMessage = String.format(
                "Invalid AWS region: '%s'. Please provide a valid AWS region code (e.g., us-east-1, eu-west-1)",
                region
            );
            LOG.error(errorMessage);
            throw new IllegalStateException(errorMessage, e);
        }
    }
    
    /**
     * Gets the configured database provider name.
     *
     * @return The database provider (postgresql or dynamodb)
     */
    public String getDatabaseProvider() {
        return databaseProvider.trim().toLowerCase();
    }
    
    /**
     * Defines the schema for a DynamoDB table including primary key and GSIs.
     */
    private static class TableSchema {
        final String tableName;
        final List<AttributeDefinition> attributeDefinitions;
        final List<KeySchemaElement> keySchema;
        final List<GlobalSecondaryIndex> globalSecondaryIndexes;
        
        TableSchema(String tableName, 
                   List<AttributeDefinition> attributeDefinitions,
                   List<KeySchemaElement> keySchema,
                   List<GlobalSecondaryIndex> globalSecondaryIndexes) {
            this.tableName = tableName;
            this.attributeDefinitions = attributeDefinitions;
            this.keySchema = keySchema;
            this.globalSecondaryIndexes = globalSecondaryIndexes;
        }
    }
    
    /**
     * Returns the list of all table schemas for DynamoDB initialization.
     * Each table has a primary key (id) and GSIs for common query patterns.
     *
     * @return List of table schemas
     */
    private List<TableSchema> getTableSchemas() {
        List<TableSchema> schemas = new ArrayList<>();
        
        // Stacks table with GSIs for common queries
        schemas.add(new TableSchema(
            "idp_stacks",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("createdBy").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("stackType").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("teamId").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("cloudProviderId").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("createdAt").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("createdBy-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("createdBy").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("stackType-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("stackType").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("teamId-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("teamId").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("cloudProviderId-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("cloudProviderId").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // Blueprints table with GSIs
        schemas.add(new TableSchema(
            "idp_blueprints",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("isActive").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("createdAt").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("isActive-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("isActive").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // Teams table with GSI
        schemas.add(new TableSchema(
            "idp_teams",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // CloudProviders table with GSI
        schemas.add(new TableSchema(
            "idp_cloud_providers",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // ResourceTypes table with GSI
        schemas.add(new TableSchema(
            "idp_resource_types",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // PropertySchemas table with GSI
        schemas.add(new TableSchema(
            "idp_property_schemas",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("resourceTypeId").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("resourceTypeId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("resourceTypeId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // ApiKeys table with GSIs
        schemas.add(new TableSchema(
            "idp_api_keys",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("keyHash").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("userEmail").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("createdByEmail").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("createdAt").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("keyHash-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("keyHash").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("userEmail-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("userEmail").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("createdByEmail-createdAt-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("createdByEmail").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("createdAt").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // AdminAuditLogs table with GSI
        schemas.add(new TableSchema(
            "idp_admin_audit_logs",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("userEmail").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("timestamp").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("userEmail-timestamp-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("userEmail").keyType(KeyType.HASH).build(),
                        KeySchemaElement.builder().attributeName("timestamp").keyType(KeyType.RANGE).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // BlueprintResources table with GSI
        schemas.add(new TableSchema(
            "idp_blueprint_resources",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("blueprintId").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("blueprintId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("blueprintId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // Categories table with GSI
        schemas.add(new TableSchema(
            "idp_categories",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // Domains table with GSI
        schemas.add(new TableSchema(
            "idp_domains",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // EnvironmentConfigs table with GSI
        schemas.add(new TableSchema(
            "idp_environment_configs",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("environmentId").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("environmentId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("environmentId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // EnvironmentEntities table with GSI
        schemas.add(new TableSchema(
            "idp_environment_entities",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // ResourceTypeCloudMappings table with GSI
        schemas.add(new TableSchema(
            "idp_resource_type_cloud_mappings",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("resourceTypeId").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("cloudProviderId").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("resourceTypeId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("resourceTypeId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build(),
                GlobalSecondaryIndex.builder()
                    .indexName("cloudProviderId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("cloudProviderId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // StackCollections table with GSI
        schemas.add(new TableSchema(
            "idp_stack_collections",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("name").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("name-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("name").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        // StackResources table with GSI
        schemas.add(new TableSchema(
            "idp_stack_resources",
            Arrays.asList(
                AttributeDefinition.builder().attributeName("id").attributeType(ScalarAttributeType.S).build(),
                AttributeDefinition.builder().attributeName("stackId").attributeType(ScalarAttributeType.S).build()
            ),
            Arrays.asList(
                KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build()
            ),
            Arrays.asList(
                GlobalSecondaryIndex.builder()
                    .indexName("stackId-index")
                    .keySchema(
                        KeySchemaElement.builder().attributeName("stackId").keyType(KeyType.HASH).build()
                    )
                    .projection(Projection.builder().projectionType(ProjectionType.ALL).build())
                    .provisionedThroughput(ProvisionedThroughput.builder().readCapacityUnits(5L).writeCapacityUnits(5L).build())
                    .build()
            )
        ));
        
        return schemas;
    }
    
    /**
     * Initializes DynamoDB tables at application startup.
     * Creates tables if they don't exist, skips if they already exist.
     * This method is called only when the database provider is DynamoDB.
     */
    private void initializeDynamoDbTables() {
        LOG.info("Initializing DynamoDB tables...");
        
        // Get the DynamoDB client - it should be available since we're in DynamoDB mode
        DynamoDbClient client = dynamoDbClient();
        if (client == null) {
            throw new IllegalStateException("DynamoDB client is not available for table initialization");
        }
        
        List<TableSchema> schemas = getTableSchemas();
        int createdCount = 0;
        int existingCount = 0;
        
        for (TableSchema schema : schemas) {
            try {
                if (tableExists(client, schema.tableName)) {
                    LOG.infof("Table '%s' already exists, skipping creation", schema.tableName);
                    existingCount++;
                } else {
                    createTable(client, schema);
                    LOG.infof("Successfully created table '%s'", schema.tableName);
                    createdCount++;
                }
            } catch (Exception e) {
                LOG.errorf(e, "Failed to create table '%s'", schema.tableName);
                throw new IllegalStateException(
                    String.format("Failed to initialize DynamoDB table '%s': %s", 
                        schema.tableName, e.getMessage()), 
                    e
                );
            }
        }
        
        LOG.infof("DynamoDB table initialization complete: %d created, %d already existed", 
            createdCount, existingCount);
    }
    
    /**
     * Checks if a DynamoDB table exists.
     *
     * @param client The DynamoDB client
     * @param tableName The table name to check
     * @return true if the table exists, false otherwise
     */
    private boolean tableExists(DynamoDbClient client, String tableName) {
        try {
            DescribeTableRequest request = DescribeTableRequest.builder()
                .tableName(tableName)
                .build();
            
            DescribeTableResponse response = client.describeTable(request);
            TableStatus status = response.table().tableStatus();
            
            // Table exists if it's in ACTIVE or CREATING state
            return status == TableStatus.ACTIVE || status == TableStatus.CREATING;
        } catch (ResourceNotFoundException e) {
            // Table doesn't exist
            return false;
        } catch (Exception e) {
            LOG.warnf(e, "Error checking if table '%s' exists", tableName);
            throw e;
        }
    }
    
    /**
     * Creates a DynamoDB table with the specified schema.
     *
     * @param client The DynamoDB client
     * @param schema The table schema definition
     */
    private void createTable(DynamoDbClient client, TableSchema schema) {
        LOG.infof("Creating DynamoDB table '%s'...", schema.tableName);
        
        CreateTableRequest.Builder requestBuilder = CreateTableRequest.builder()
            .tableName(schema.tableName)
            .keySchema(schema.keySchema)
            .attributeDefinitions(schema.attributeDefinitions)
            .provisionedThroughput(ProvisionedThroughput.builder()
                .readCapacityUnits(5L)
                .writeCapacityUnits(5L)
                .build());
        
        // Add GSIs if present
        if (schema.globalSecondaryIndexes != null && !schema.globalSecondaryIndexes.isEmpty()) {
            requestBuilder.globalSecondaryIndexes(schema.globalSecondaryIndexes);
            LOG.infof("Table '%s' will have %d GSI(s)", 
                schema.tableName, schema.globalSecondaryIndexes.size());
        }
        
        CreateTableRequest request = requestBuilder.build();
        
        try {
            CreateTableResponse response = client.createTable(request);
            LOG.infof("Table '%s' creation initiated, status: %s", 
                schema.tableName, response.tableDescription().tableStatus());
            
            // Wait for table to become active
            waitForTableActive(client, schema.tableName);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to create table '%s'", schema.tableName);
            throw e;
        }
    }
    
    /**
     * Waits for a DynamoDB table to become active.
     * Polls the table status until it's ACTIVE or times out.
     *
     * @param client The DynamoDB client
     * @param tableName The table name to wait for
     */
    private void waitForTableActive(DynamoDbClient client, String tableName) {
        LOG.infof("Waiting for table '%s' to become active...", tableName);
        
        int maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max wait
        int attempt = 0;
        
        while (attempt < maxAttempts) {
            try {
                DescribeTableRequest request = DescribeTableRequest.builder()
                    .tableName(tableName)
                    .build();
                
                DescribeTableResponse response = client.describeTable(request);
                TableStatus status = response.table().tableStatus();
                
                if (status == TableStatus.ACTIVE) {
                    LOG.infof("Table '%s' is now active", tableName);
                    return;
                }
                
                LOG.debugf("Table '%s' status: %s, waiting...", tableName, status);
                Thread.sleep(2000); // Wait 2 seconds before next check
                attempt++;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException(
                    String.format("Interrupted while waiting for table '%s' to become active", tableName), 
                    e
                );
            } catch (Exception e) {
                LOG.errorf(e, "Error checking table '%s' status", tableName);
                throw new IllegalStateException(
                    String.format("Failed to verify table '%s' status: %s", tableName, e.getMessage()), 
                    e
                );
            }
        }
        
        throw new IllegalStateException(
            String.format("Timeout waiting for table '%s' to become active after %d seconds", 
                tableName, maxAttempts * 2)
        );
    }
    
    /**
     * Validates that all required DynamoDB tables exist and are active.
     * This is called after table initialization to ensure the database is ready.
     *
     * @throws IllegalStateException if any required tables are missing or not active
     */
    private void validateDynamoDbTables() {
        LOG.info("Validating DynamoDB tables...");
        
        DynamoDbClient client = dynamoDbClient();
        if (client == null) {
            throw new IllegalStateException("DynamoDB client is not available for table validation");
        }
        
        List<TableSchema> schemas = getTableSchemas();
        List<String> missingTables = new ArrayList<>();
        List<String> inactiveTables = new ArrayList<>();
        
        for (TableSchema schema : schemas) {
            try {
                DescribeTableRequest request = DescribeTableRequest.builder()
                    .tableName(schema.tableName)
                    .build();
                
                DescribeTableResponse response = client.describeTable(request);
                TableStatus status = response.table().tableStatus();
                
                if (status != TableStatus.ACTIVE) {
                    inactiveTables.add(schema.tableName + " (status: " + status + ")");
                }
            } catch (ResourceNotFoundException e) {
                missingTables.add(schema.tableName);
            } catch (Exception e) {
                LOG.errorf(e, "Error validating table '%s'", schema.tableName);
                throw new IllegalStateException(
                    String.format("Failed to validate table '%s': %s", schema.tableName, e.getMessage()),
                    e
                );
            }
        }
        
        if (!missingTables.isEmpty()) {
            String errorMessage = String.format(
                "DynamoDB validation failed: Missing tables: %s",
                String.join(", ", missingTables)
            );
            LOG.error(errorMessage);
            throw new IllegalStateException(errorMessage);
        }
        
        if (!inactiveTables.isEmpty()) {
            String errorMessage = String.format(
                "DynamoDB validation failed: Inactive tables: %s",
                String.join(", ", inactiveTables)
            );
            LOG.error(errorMessage);
            throw new IllegalStateException(errorMessage);
        }
        
        LOG.infof("DynamoDB table validation successful: All %d tables are active", schemas.size());
    }
}
