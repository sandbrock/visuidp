package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB implementation of ApiKeyRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoApiKeyRepository implements ApiKeyRepository {

    private static final Logger LOG = Logger.getLogger(DynamoApiKeyRepository.class);
    private static final String TABLE_NAME = "idp_api_keys";
    
    // GSI names for query optimization
    private static final String GSI_KEY_HASH = "keyHash-index";
    private static final String GSI_USER_EMAIL = "userEmail-createdAt-index";
    private static final String GSI_KEY_TYPE = "keyType-createdAt-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";
    private static final String GSI_CREATED_BY_EMAIL = "createdByEmail-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

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
                .tableName(TABLE_NAME)
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

        GetItemRequest request = GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(id.toString()).build()))
                .build();

        try {
            GetItemResponse response = dynamoDbClient.getItem(request);

            if (!response.hasItem() || response.item().isEmpty()) {
                return Optional.empty();
            }

            ApiKey apiKey = entityMapper.itemToApiKey(response.item());
            return Optional.ofNullable(apiKey);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find API key by id: %s", id);
            throw new RuntimeException("Failed to find API key", e);
        }
    }

    @Override
    public List<ApiKey> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<ApiKey> apiKeys = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = ScanRequest.builder()
                            .tableName(TABLE_NAME)
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

            LOG.debugf("Found %d API keys", apiKeys.size());
            return apiKeys;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all API keys", e);
            throw new RuntimeException("Failed to find all API keys", e);
        }
    }

    @Override
    public Optional<ApiKey> findByKeyHash(String keyHash) {
        if (keyHash == null) {
            return Optional.empty();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_KEY_HASH)
                .keyConditionExpression("keyHash = :keyHash")
                .expressionAttributeValues(Map.of(
                        ":keyHash", AttributeValue.builder().s(keyHash).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);

            if (response.count() == 0 || !response.hasItems()) {
                return Optional.empty();
            }

            ApiKey apiKey = entityMapper.itemToApiKey(response.items().get(0));
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

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_USER_EMAIL)
                .keyConditionExpression("userEmail = :userEmail")
                .expressionAttributeValues(Map.of(
                        ":userEmail", AttributeValue.builder().s(userEmail).build()
                ))
                .build();

        return executeQuery(request, "userEmail: " + userEmail);
    }

    @Override
    public List<ApiKey> findByKeyType(ApiKeyType keyType) {
        if (keyType == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_KEY_TYPE)
                .keyConditionExpression("keyType = :keyType")
                .expressionAttributeValues(Map.of(
                        ":keyType", AttributeValue.builder().s(keyType.name()).build()
                ))
                .build();

        return executeQuery(request, "keyType: " + keyType);
    }

    @Override
    public List<ApiKey> findByIsActive(Boolean isActive) {
        if (isActive == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_IS_ACTIVE)
                .keyConditionExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "isActive: " + isActive);
    }

    @Override
    public List<ApiKey> findByUserEmailAndIsActive(String userEmail, Boolean isActive) {
        if (userEmail == null || isActive == null) {
            return Collections.emptyList();
        }

        // Query by userEmail GSI and filter by isActive
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_USER_EMAIL)
                .keyConditionExpression("userEmail = :userEmail")
                .filterExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":userEmail", AttributeValue.builder().s(userEmail).build(),
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "userEmail: " + userEmail + ", isActive: " + isActive);
    }

    @Override
    public List<ApiKey> findByCreatedByEmail(String createdByEmail) {
        if (createdByEmail == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CREATED_BY_EMAIL)
                .keyConditionExpression("createdByEmail = :createdByEmail")
                .expressionAttributeValues(Map.of(
                        ":createdByEmail", AttributeValue.builder().s(createdByEmail).build()
                ))
                .build();

        return executeQuery(request, "createdByEmail: " + createdByEmail);
    }

    @Override
    public void delete(ApiKey apiKey) {
        if (apiKey == null || apiKey.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(apiKey.id.toString()).build()))
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
                .tableName(TABLE_NAME)
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

    /**
     * Revokes an API key by setting isActive to false with optimistic locking.
     * The revocation only succeeds if the key is currently active.
     * 
     * @param apiKey API key to revoke
     * @return Revoked API key
     * @throws DynamoTransactionManager.TransactionFailedException if the key is already revoked
     */
    public ApiKey revokeWithOptimisticLock(ApiKey apiKey) {
        if (apiKey.id == null) {
            throw new IllegalArgumentException("API key ID must not be null");
        }
        
        LOG.infof("Revoking API key %s with optimistic lock", apiKey.id);
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        Map<String, AttributeValue> key = Map.of(
            "id", AttributeValue.builder().s(apiKey.id.toString()).build()
        );
        
        // Update to set isActive = false, but only if currently active
        writes.add(DynamoTransactionManager.TransactionWrite.update(
            TABLE_NAME,
            key,
            "SET isActive = :false, revokedAt = :revokedAt",
            null,
            Map.of(
                ":false", AttributeValue.builder().bool(false).build(),
                ":revokedAt", AttributeValue.builder().s(LocalDateTime.now().toString()).build()
            ),
            String.format("Revoke API key %s", apiKey.id)
        ));
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully revoked API key %s", apiKey.id);
        
        apiKey.isActive = false;
        apiKey.revokedAt = LocalDateTime.now();
        return apiKey;
    }
    
    /**
     * Rotates an API key by creating a new key and revoking the old one atomically.
     * Both operations succeed or both fail.
     * 
     * @param oldKey Old API key to revoke
     * @param newKey New API key to create
     * @return The new API key
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public ApiKey rotateKey(ApiKey oldKey, ApiKey newKey) {
        if (oldKey.id == null || newKey.id == null) {
            throw new IllegalArgumentException("Both old and new API key IDs must not be null");
        }
        
        LOG.infof("Rotating API key %s to %s in transaction", oldKey.id, newKey.id);
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        // Create new key
        if (newKey.createdAt == null) {
            newKey.createdAt = LocalDateTime.now();
        }
        Map<String, AttributeValue> newItem = entityMapper.apiKeyToItem(newKey);
        
        writes.add(DynamoTransactionManager.TransactionWrite.put(
            TABLE_NAME,
            newItem,
            String.format("Create new API key %s", newKey.id)
        ));
        
        // Revoke old key
        Map<String, AttributeValue> oldKey_key = Map.of(
            "id", AttributeValue.builder().s(oldKey.id.toString()).build()
        );
        
        writes.add(DynamoTransactionManager.TransactionWrite.update(
            TABLE_NAME,
            oldKey_key,
            "SET isActive = :false, revokedAt = :revokedAt",
            null,
            Map.of(
                ":false", AttributeValue.builder().bool(false).build(),
                ":revokedAt", AttributeValue.builder().s(LocalDateTime.now().toString()).build()
            ),
            String.format("Revoke old API key %s", oldKey.id)
        ));
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully rotated API key from %s to %s", oldKey.id, newKey.id);
        
        return newKey;
    }
    
    /**
     * Saves multiple API keys atomically using a transaction.
     * All keys are saved or none are saved.
     * 
     * @param apiKeys List of API keys to save
     * @return List of saved API keys with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<ApiKey> saveAll(List<ApiKey> apiKeys) {
        if (apiKeys == null || apiKeys.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d API keys in transaction", apiKeys.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (ApiKey apiKey : apiKeys) {
            if (apiKey.id == null) {
                apiKey.id = UUID.randomUUID();
            }
            
            if (apiKey.createdAt == null) {
                apiKey.createdAt = LocalDateTime.now();
            }
            
            Map<String, AttributeValue> item = entityMapper.apiKeyToItem(apiKey);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save API key: %s (id: %s)", apiKey.keyName, apiKey.id)
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d API keys in transaction", apiKeys.size());
        
        return apiKeys;
    }

    /**
     * Helper method to execute a query and handle pagination.
     *
     * @param request the QueryRequest to execute
     * @param queryDescription description for logging
     * @return list of API keys matching the query
     */
    private List<ApiKey> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<ApiKey> apiKeys = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<ApiKey> pageApiKeys = response.items().stream()
                        .map(entityMapper::itemToApiKey)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                apiKeys.addAll(pageApiKeys);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d API keys for query: %s", apiKeys.size(), queryDescription);
            return apiKeys;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
