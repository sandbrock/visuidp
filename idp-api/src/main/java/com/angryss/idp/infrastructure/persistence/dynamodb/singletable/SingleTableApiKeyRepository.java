package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Single-table DynamoDB implementation of ApiKeyRepository.
 * Uses keyHash as the primary key for efficient lookups during authentication.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb-singletable")
public class SingleTableApiKeyRepository implements ApiKeyRepository {
    
    private static final Logger LOG = Logger.getLogger(SingleTableApiKeyRepository.class);
    
    @ConfigProperty(name = "dynamodb.table.name", defaultValue = "visuidp-data")
    String tableName;
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    SingleTableEntityMapper entityMapper;
    
    @Override
    public ApiKey save(ApiKey apiKey) {
        if (apiKey.id == null) {
            apiKey.id = UUID.randomUUID();
        }
        
        if (apiKey.createdAt == null) {
            apiKey.createdAt = LocalDateTime.now();
        }
        
        Map<String, AttributeValue> item = entityMapper.apiKeyToItem(apiKey);
        
        PutItemRequest request = PutItemRequest.builder()
                .tableName(tableName)
                .item(item)
                .build();
        
        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved API key with id: %s", apiKey.id);
            return apiKey;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save API key with id: %s", apiKey.id);
            throw new RuntimeException("Failed to save API key", e);
        }
    }
    
    @Override
    public Optional<ApiKey> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        
        // Need to scan since we're looking up by ID, not keyHash
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND id = :id")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":id", AttributeValue.builder().s(id.toString()).build()
                ))
                .limit(1)
                .build();
        
        try {
            ScanResponse response = dynamoDbClient.scan(request);
            
            if (response.items().isEmpty()) {
                return Optional.empty();
            }
            
            ApiKey apiKey = entityMapper.itemToApiKey(response.items().get(0));
            return Optional.ofNullable(apiKey);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find API key by id: %s", id);
            throw new RuntimeException("Failed to find API key", e);
        }
    }
    
    @Override
    public Optional<ApiKey> findByKeyHash(String keyHash) {
        if (keyHash == null) {
            return Optional.empty();
        }
        
        // Direct lookup using keyHash as PK
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.apiKeyPK(keyHash)).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.apiKeySK()).build()
                ))
                .build();
        
        try {
            GetItemResponse response = dynamoDbClient.getItem(request);
            
            if (!response.hasItem() || response.item().isEmpty()) {
                return Optional.empty();
            }
            
            ApiKey apiKey = entityMapper.itemToApiKey(response.item());
            return Optional.ofNullable(apiKey);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find API key by keyHash");
            throw new RuntimeException("Failed to find API key by keyHash", e);
        }
    }
    
    @Override
    public List<ApiKey> findByUserEmail(String userEmail) {
        if (userEmail == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND userEmail = :userEmail")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":userEmail", AttributeValue.builder().s(userEmail).build()
                ))
                .build();
        
        return executeScan(request, "findByUserEmail: " + userEmail);
    }
    
    @Override
    public List<ApiKey> findByCreatedByEmail(String createdByEmail) {
        if (createdByEmail == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND createdByEmail = :createdByEmail")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":createdByEmail", AttributeValue.builder().s(createdByEmail).build()
                ))
                .build();
        
        return executeScan(request, "findByCreatedByEmail: " + createdByEmail);
    }
    
    @Override
    public List<ApiKey> findByUserEmailAndIsActive(String userEmail, Boolean isActive) {
        if (userEmail == null || isActive == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND userEmail = :userEmail AND isActive = :isActive")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":userEmail", AttributeValue.builder().s(userEmail).build(),
                    ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();
        
        return executeScan(request, "findByUserEmailAndIsActive: " + userEmail + ", " + isActive);
    }
    
    @Override
    public List<ApiKey> findByKeyType(ApiKeyType keyType) {
        if (keyType == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND keyType = :keyType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":keyType", AttributeValue.builder().s(keyType.name()).build()
                ))
                .build();
        
        return executeScan(request, "findByKeyType: " + keyType);
    }
    
    @Override
    public List<ApiKey> findByIsActive(Boolean isActive) {
        if (isActive == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND isActive = :isActive")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();
        
        return executeScan(request, "findByIsActive: " + isActive);
    }
    
    public List<ApiKey> findExpiredKeys() {
        String now = LocalDateTime.now().toString();
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND expiresAt < :now AND isActive = :isActive")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build(),
                    ":now", AttributeValue.builder().s(now).build(),
                    ":isActive", AttributeValue.builder().bool(true).build()
                ))
                .build();
        
        return executeScan(request, "findExpiredKeys");
    }
    
    @Override
    public List<ApiKey> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build()
                ))
                .build();
        
        return executeScan(request, "findAll");
    }
    
    @Override
    public void delete(ApiKey apiKey) {
        if (apiKey == null || apiKey.keyHash == null) {
            return;
        }
        
        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.apiKeyPK(apiKey.keyHash)).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.apiKeySK()).build()
                ))
                .build();
        
        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted API key with id: %s", apiKey.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete API key with id: %s", apiKey.id);
            throw new RuntimeException("Failed to delete API key", e);
        }
    }
    
    @Override
    public long count() {
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("ApiKey").build()
                ))
                .select(Select.COUNT)
                .build();
        
        try {
            ScanResponse response = dynamoDbClient.scan(request);
            return response.count();
        } catch (DynamoDbException e) {
            LOG.error("Failed to count API keys", e);
            throw new RuntimeException("Failed to count API keys", e);
        }
    }
    
    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }
    
    // ========== Helper Methods ==========
    
    private List<ApiKey> executeScan(ScanRequest request, String scanDescription) {
        try {
            List<ApiKey> apiKeys = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;
            
            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }
                
                response = dynamoDbClient.scan(request);
                
                List<ApiKey> pageApiKeys = response.items().stream()
                        .map(entityMapper::itemToApiKey)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                
                apiKeys.addAll(pageApiKeys);
                lastEvaluatedKey = response.lastEvaluatedKey();
                
            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());
            
            LOG.debugf("Found %d API keys for scan: %s", apiKeys.size(), scanDescription);
            return apiKeys;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute scan: %s", scanDescription);
            throw new RuntimeException("Failed to execute scan", e);
        }
    }
}
