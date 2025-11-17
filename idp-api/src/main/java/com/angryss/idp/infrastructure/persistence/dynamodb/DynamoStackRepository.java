package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.StackType;
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
 * DynamoDB implementation of StackRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoStackRepository implements StackRepository {

    private static final Logger LOG = Logger.getLogger(DynamoStackRepository.class);
    private static final String TABLE_NAME = "idp_stacks";
    
    // GSI names for query optimization
    private static final String GSI_CREATED_BY = "createdBy-createdAt-index";
    private static final String GSI_STACK_TYPE = "stackType-createdAt-index";
    private static final String GSI_TEAM_ID = "teamId-createdAt-index";
    private static final String GSI_CLOUD_PROVIDER_ID = "cloudProviderId-createdAt-index";
    private static final String GSI_EPHEMERAL_PREFIX = "ephemeralPrefix-createdAt-index";
    private static final String GSI_STACK_COLLECTION_ID = "stackCollectionId-createdAt-index";
    private static final String GSI_DOMAIN_ID = "domainId-createdAt-index";
    private static final String GSI_CATEGORY_ID = "categoryId-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

    @Override
    public Stack save(Stack stack) {
        if (stack.getId() == null) {
            stack.setId(UUID.randomUUID());
        }
        
        if (stack.getCreatedAt() == null) {
            stack.setCreatedAt(LocalDateTime.now());
        }
        
        stack.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.stackToItem(stack);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved stack with id: %s", stack.getId());
            return stack;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save stack with id: %s", stack.getId());
            throw new RuntimeException("Failed to save stack", e);
        }
    }

    @Override
    public Optional<Stack> findById(UUID id) {
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

            Stack stack = entityMapper.itemToStack(response.item());
            return Optional.ofNullable(stack);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find stack by id: %s", id);
            throw new RuntimeException("Failed to find stack", e);
        }
    }

    @Override
    public List<Stack> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<Stack> stacks = new ArrayList<>();
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

                List<Stack> pageStacks = response.items().stream()
                        .map(entityMapper::itemToStack)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stacks.addAll(pageStacks);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stacks", stacks.size());
            return stacks;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all stacks", e);
            throw new RuntimeException("Failed to find all stacks", e);
        }
    }

    @Override
    public List<Stack> findByCreatedBy(String createdBy) {
        if (createdBy == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CREATED_BY)
                .keyConditionExpression("createdBy = :createdBy")
                .expressionAttributeValues(Map.of(
                        ":createdBy", AttributeValue.builder().s(createdBy).build()
                ))
                .build();

        return executeQuery(request, "createdBy: " + createdBy);
    }

    @Override
    public List<Stack> findByStackType(StackType stackType) {
        if (stackType == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_STACK_TYPE)
                .keyConditionExpression("stackType = :stackType")
                .expressionAttributeValues(Map.of(
                        ":stackType", AttributeValue.builder().s(stackType.name()).build()
                ))
                .build();

        return executeQuery(request, "stackType: " + stackType);
    }

    @Override
    public List<Stack> findByEphemeralPrefix(String ephemeralPrefix) {
        if (ephemeralPrefix == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_EPHEMERAL_PREFIX)
                .keyConditionExpression("ephemeralPrefix = :ephemeralPrefix")
                .expressionAttributeValues(Map.of(
                        ":ephemeralPrefix", AttributeValue.builder().s(ephemeralPrefix).build()
                ))
                .build();

        return executeQuery(request, "ephemeralPrefix: " + ephemeralPrefix);
    }

    @Override
    public boolean existsByNameAndCreatedBy(String name, String createdBy) {
        if (name == null || createdBy == null) {
            return false;
        }

        // Query by createdBy GSI and filter by name
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CREATED_BY)
                .keyConditionExpression("createdBy = :createdBy")
                .filterExpression("#name = :name")
                .expressionAttributeNames(Map.of("#name", "name"))
                .expressionAttributeValues(Map.of(
                        ":createdBy", AttributeValue.builder().s(createdBy).build(),
                        ":name", AttributeValue.builder().s(name).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);
            return response.count() > 0;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to check existence for name: %s, createdBy: %s", name, createdBy);
            throw new RuntimeException("Failed to check stack existence", e);
        }
    }

    @Override
    public List<Stack> findByTeamId(UUID teamId) {
        if (teamId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_TEAM_ID)
                .keyConditionExpression("teamId = :teamId")
                .expressionAttributeValues(Map.of(
                        ":teamId", AttributeValue.builder().s(teamId.toString()).build()
                ))
                .build();

        return executeQuery(request, "teamId: " + teamId);
    }

    @Override
    public List<Stack> findByStackCollectionId(UUID collectionId) {
        if (collectionId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_STACK_COLLECTION_ID)
                .keyConditionExpression("stackCollectionId = :stackCollectionId")
                .expressionAttributeValues(Map.of(
                        ":stackCollectionId", AttributeValue.builder().s(collectionId.toString()).build()
                ))
                .build();

        return executeQuery(request, "stackCollectionId: " + collectionId);
    }

    @Override
    public List<Stack> findByDomainId(UUID domainId) {
        if (domainId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_DOMAIN_ID)
                .keyConditionExpression("domainId = :domainId")
                .expressionAttributeValues(Map.of(
                        ":domainId", AttributeValue.builder().s(domainId.toString()).build()
                ))
                .build();

        return executeQuery(request, "domainId: " + domainId);
    }

    @Override
    public List<Stack> findByCategoryId(UUID categoryId) {
        if (categoryId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CATEGORY_ID)
                .keyConditionExpression("categoryId = :categoryId")
                .expressionAttributeValues(Map.of(
                        ":categoryId", AttributeValue.builder().s(categoryId.toString()).build()
                ))
                .build();

        return executeQuery(request, "categoryId: " + categoryId);
    }

    @Override
    public List<Stack> findByCloudProviderId(UUID cloudProviderId) {
        if (cloudProviderId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CLOUD_PROVIDER_ID)
                .keyConditionExpression("cloudProviderId = :cloudProviderId")
                .expressionAttributeValues(Map.of(
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build()
                ))
                .build();

        return executeQuery(request, "cloudProviderId: " + cloudProviderId);
    }

    @Override
    public List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy) {
        if (cloudProviderId == null || createdBy == null) {
            return Collections.emptyList();
        }

        // Query by cloudProviderId GSI and filter by createdBy
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CLOUD_PROVIDER_ID)
                .keyConditionExpression("cloudProviderId = :cloudProviderId")
                .filterExpression("createdBy = :createdBy")
                .expressionAttributeValues(Map.of(
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build(),
                        ":createdBy", AttributeValue.builder().s(createdBy).build()
                ))
                .build();

        return executeQuery(request, "cloudProviderId: " + cloudProviderId + ", createdBy: " + createdBy);
    }

    @Override
    public List<Stack> findByBlueprintId(UUID blueprintId) {
        if (blueprintId == null) {
            return Collections.emptyList();
        }

        // Use scan with filter since we don't have a GSI for blueprintId yet
        // TODO: Consider adding a GSI for blueprintId if this query becomes frequent
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("blueprintId = :blueprintId")
                .expressionAttributeValues(Map.of(
                        ":blueprintId", AttributeValue.builder().s(blueprintId.toString()).build()
                ))
                .build();

        try {
            List<Stack> stacks = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = ScanRequest.builder()
                            .tableName(TABLE_NAME)
                            .filterExpression("blueprintId = :blueprintId")
                            .expressionAttributeValues(Map.of(
                                    ":blueprintId", AttributeValue.builder().s(blueprintId.toString()).build()
                            ))
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.scan(request);

                List<Stack> pageStacks = response.items().stream()
                        .map(entityMapper::itemToStack)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stacks.addAll(pageStacks);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stacks for blueprintId: %s", stacks.size(), blueprintId);
            return stacks;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find stacks by blueprintId: %s", blueprintId);
            throw new RuntimeException("Failed to find stacks by blueprintId", e);
        }
    }

    @Override
    public void delete(Stack stack) {
        if (stack == null || stack.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(stack.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted stack with id: %s", stack.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete stack with id: %s", stack.getId());
            throw new RuntimeException("Failed to delete stack", e);
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
            LOG.error("Failed to count stacks", e);
            throw new RuntimeException("Failed to count stacks", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Saves multiple stacks atomically using a transaction.
     * All stacks are saved or none are saved.
     * 
     * @param stacks List of stacks to save
     * @return List of saved stacks with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<Stack> saveAll(List<Stack> stacks) {
        if (stacks == null || stacks.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d stacks in transaction", stacks.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Stack stack : stacks) {
            if (stack.getId() == null) {
                stack.setId(UUID.randomUUID());
            }
            
            if (stack.getCreatedAt() == null) {
                stack.setCreatedAt(LocalDateTime.now());
            }
            
            stack.setUpdatedAt(LocalDateTime.now());
            
            Map<String, AttributeValue> item = entityMapper.stackToItem(stack);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save stack: %s (id: %s)", stack.getName(), stack.getId())
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d stacks in transaction", stacks.size());
        
        return stacks;
    }
    
    /**
     * Deletes multiple stacks atomically using a transaction.
     * All stacks are deleted or none are deleted.
     * 
     * @param stacks List of stacks to delete
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public void deleteAll(List<Stack> stacks) {
        if (stacks == null || stacks.isEmpty()) {
            return;
        }
        
        LOG.infof("Deleting %d stacks in transaction", stacks.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Stack stack : stacks) {
            if (stack.getId() != null) {
                Map<String, AttributeValue> key = Map.of(
                    "id", AttributeValue.builder().s(stack.getId().toString()).build()
                );
                
                writes.add(DynamoTransactionManager.TransactionWrite.delete(
                    TABLE_NAME,
                    key,
                    String.format("Delete stack: %s (id: %s)", stack.getName(), stack.getId())
                ));
            }
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully deleted %d stacks in transaction", stacks.size());
    }
    
    /**
     * Updates a stack with optimistic locking using a conditional write.
     * The update only succeeds if the stack hasn't been modified since it was read.
     * 
     * @param stack Stack to update
     * @param expectedUpdatedAt Expected updatedAt timestamp for optimistic locking
     * @return Updated stack
     * @throws DynamoTransactionManager.TransactionFailedException if the condition fails
     */
    public Stack saveWithOptimisticLock(Stack stack, LocalDateTime expectedUpdatedAt) {
        if (stack.getId() == null) {
            throw new IllegalArgumentException("Stack ID must not be null for optimistic locking");
        }
        
        LOG.debugf("Saving stack %s with optimistic lock (expected updatedAt: %s)", 
            stack.getId(), expectedUpdatedAt);
        
        stack.setUpdatedAt(LocalDateTime.now());
        Map<String, AttributeValue> item = entityMapper.stackToItem(stack);
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        // Add conditional write that checks the updatedAt timestamp
        writes.add(DynamoTransactionManager.TransactionWrite.putWithCondition(
            TABLE_NAME,
            item,
            "updatedAt = :expectedUpdatedAt OR attribute_not_exists(updatedAt)",
            null,
            Map.of(":expectedUpdatedAt", 
                AttributeValue.builder().s(expectedUpdatedAt.toString()).build()),
            String.format("Update stack %s with optimistic lock", stack.getId())
        ));
        
        transactionManager.executeTransaction(writes);
        LOG.debugf("Successfully saved stack %s with optimistic lock", stack.getId());
        
        return stack;
    }

    /**
     * Helper method to execute a query and handle pagination.
     *
     * @param request the QueryRequest to execute
     * @param queryDescription description for logging
     * @return list of stacks matching the query
     */
    private List<Stack> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<Stack> stacks = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<Stack> pageStacks = response.items().stream()
                        .map(entityMapper::itemToStack)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stacks.addAll(pageStacks);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stacks for query: %s", stacks.size(), queryDescription);
            return stacks;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
