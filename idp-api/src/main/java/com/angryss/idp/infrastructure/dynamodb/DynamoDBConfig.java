package com.angryss.idp.infrastructure.dynamodb;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 * Configuration class for DynamoDB access.
 * Provides table names and client access for repositories.
 * Only active when idp.database.provider is set to "dynamodb".
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoDBConfig {
    
    @Inject
    Instance<DynamoDbClient> dynamoDbClient;
    
    @ConfigProperty(name = "idp.database.dynamodb.table-prefix", defaultValue = "visuidp")
    String tablePrefix;
    
    @ConfigProperty(name = "idp.database.dynamodb.region", defaultValue = "us-east-1")
    String region;
    
    /**
     * Get the DynamoDB client instance.
     * No connection pooling needed - AWS SDK handles this internally.
     * Returns null if DynamoDB is not configured (e.g., in PostgreSQL-only tests).
     */
    public DynamoDbClient getClient() {
        return dynamoDbClient.isResolvable() ? dynamoDbClient.get() : null;
    }
    
    /**
     * Get the single table name for all entities.
     * Using single-table design pattern for DynamoDB.
     */
    public String getTableName() {
        return tablePrefix + "-data";
    }
    
    /**
     * Get the table prefix used for naming.
     */
    public String getTablePrefix() {
        return tablePrefix;
    }
    
    /**
     * Get the AWS region.
     */
    public String getRegion() {
        return region;
    }
}
