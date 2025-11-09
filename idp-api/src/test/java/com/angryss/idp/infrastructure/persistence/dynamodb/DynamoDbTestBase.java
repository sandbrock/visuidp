package com.angryss.idp.infrastructure.persistence.dynamodb;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;

/**
 * Base class for DynamoDB integration tests.
 * 
 * <p>Provides common utilities for:</p>
 * <ul>
 *   <li>Cleaning up test data between tests</li>
 *   <li>Verifying DynamoDB Local connectivity</li>
 *   <li>Common test assertions</li>
 * </ul>
 * 
 * <p>Test classes should extend this class and will automatically use the
 * DynamoDB test profile.</p>
 */
@QuarkusTest
@TestProfile(DynamoDbTestProfile.class)
public abstract class DynamoDbTestBase {
    
    @Inject
    protected DynamoDbClient dynamoDbClient;
    
    /**
     * Clean up test data before each test.
     * Deletes all items from test tables to ensure test isolation.
     */
    @BeforeEach
    public void cleanupTestData() {
        if (dynamoDbClient == null) {
            return;
        }
        
        try {
            // List all tables with test prefix
            ListTablesResponse response = dynamoDbClient.listTables(
                ListTablesRequest.builder().build()
            );
            
            List<String> testTables = response.tableNames().stream()
                .filter(name -> name.startsWith("test_idp_"))
                .toList();
            
            // Delete all items from each test table
            for (String tableName : testTables) {
                deleteAllItemsFromTable(tableName);
            }
        } catch (Exception e) {
            // Ignore errors during cleanup - tables might not exist yet
        }
    }
    
    /**
     * Delete all items from a DynamoDB table.
     * 
     * @param tableName the name of the table to clean
     */
    protected void deleteAllItemsFromTable(String tableName) {
        try {
            // Describe table to get key schema
            DescribeTableResponse tableDescription = dynamoDbClient.describeTable(
                DescribeTableRequest.builder()
                    .tableName(tableName)
                    .build()
            );
            
            String keyName = tableDescription.table().keySchema().get(0).attributeName();
            
            // Scan all items
            ScanResponse scanResponse = dynamoDbClient.scan(
                ScanRequest.builder()
                    .tableName(tableName)
                    .build()
            );
            
            // Delete each item
            for (var item : scanResponse.items()) {
                dynamoDbClient.deleteItem(
                    DeleteItemRequest.builder()
                        .tableName(tableName)
                        .key(java.util.Map.of(keyName, item.get(keyName)))
                        .build()
                );
            }
        } catch (ResourceNotFoundException e) {
            // Table doesn't exist yet - ignore
        }
    }
    
    /**
     * Verify that DynamoDB Local is accessible.
     * 
     * @return true if DynamoDB Local is running and accessible
     */
    protected boolean isDynamoDbLocalAvailable() {
        try {
            dynamoDbClient.listTables();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
