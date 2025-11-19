package com.angryss.idp.infrastructure.dynamodb;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

/**
 * Configuration class for DynamoDB access.
 * Provides table names and client access for repositories.
 */
@ApplicationScoped
public class DynamoDBConfig {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @ConfigProperty(name = "idp.database.dynamodb.table-prefix", defaultValue = "visuidp")
    String tablePrefix;
    
    @ConfigProperty(name = "idp.database.dynamodb.region", defaultValue = "us-east-1")
    String region;
    
    /**
     * Get the DynamoDB client instance.
     * No connection pooling needed - AWS SDK handles this internally.
     */
    public DynamoDbClient getClient() {
        return dynamoDbClient;
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
