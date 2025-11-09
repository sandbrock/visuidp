package com.angryss.idp.infrastructure.persistence.dynamodb;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Test profile for running integration tests against DynamoDB Local.
 * 
 * <p>Usage in test classes:</p>
 * <pre>
 * {@code
 * @QuarkusTest
 * @TestProfile(DynamoDbTestProfile.class)
 * public class DynamoStackRepositoryTest {
 *     // Test implementation
 * }
 * }
 * </pre>
 * 
 * <p>Prerequisites:</p>
 * <ul>
 *   <li>DynamoDB Local must be running on localhost:8000</li>
 *   <li>Start with: {@code docker compose up -d dynamodb-local}</li>
 * </ul>
 */
public class DynamoDbTestProfile implements QuarkusTestProfile {
    
    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
            "idp.database.provider", "dynamodb",
            "idp.database.dynamodb.region", "us-east-1",
            "idp.database.dynamodb.endpoint", "http://localhost:8000",
            "idp.database.dynamodb.table-prefix", "test_idp",
            "quarkus.datasource.db-kind", "",
            "quarkus.hibernate-orm.enabled", "false",
            "quarkus.flyway.migrate-at-start", "false"
        );
    }
    
    @Override
    public String getConfigProfile() {
        return "test-dynamodb";
    }
}
