package com.angryss.idp.infrastructure.persistence.dynamodb;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.ListTablesRequest;
import software.amazon.awssdk.services.dynamodb.model.ListTablesResponse;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test to verify DynamoDB Local connectivity and configuration.
 * 
 * <p>This test verifies that:</p>
 * <ul>
 *   <li>DynamoDB Local is running and accessible</li>
 *   <li>The DynamoDB client is properly configured</li>
 *   <li>The test profile is correctly applied</li>
 * </ul>
 * 
 * <p>Prerequisites:</p>
 * <ul>
 *   <li>DynamoDB Local must be running on localhost:8000</li>
 *   <li>Start with: {@code docker compose up -d dynamodb-local}</li>
 * </ul>
 */
@QuarkusTest
@TestProfile(DynamoDbTestProfile.class)
public class DynamoDbLocalConnectionTest {
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Test
    public void testDynamoDbClientIsInjected() {
        assertNotNull(dynamoDbClient, "DynamoDB client should be injected");
    }
    
    @Test
    public void testCanConnectToDynamoDbLocal() {
        assertDoesNotThrow(() -> {
            ListTablesResponse response = dynamoDbClient.listTables(
                ListTablesRequest.builder().build()
            );
            assertNotNull(response, "Should receive a response from DynamoDB Local");
        }, "Should be able to connect to DynamoDB Local");
    }
    
    @Test
    public void testCanListTables() {
        ListTablesResponse response = dynamoDbClient.listTables(
            ListTablesRequest.builder().build()
        );
        
        assertNotNull(response, "Response should not be null");
        assertNotNull(response.tableNames(), "Table names list should not be null");
        
        // Initially, there should be no tables or only test tables
        assertTrue(
            response.tableNames().isEmpty() || 
            response.tableNames().stream().allMatch(name -> name.startsWith("test_idp_")),
            "Should only have test tables or no tables"
        );
    }
}
