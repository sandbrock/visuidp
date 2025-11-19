package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.StackType;
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
 * Single-table DynamoDB implementation of StackRepository.
 * Uses a single DynamoDB table with PK/SK pattern and GSIs for efficient querying.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb-singletable")
public class SingleTableStackRepository implements StackRepository {
    
    private static final Logger LOG = Logger.getLogger(SingleTableStackRepository.class);
    
    @ConfigProperty(name = "dynamodb.table.name", defaultValue = "visuidp-data")
    String tableName;
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    SingleTableEntityMapper entityMapper;
    
    @Inject
    DynamoDBExceptionHandler exceptionHandler;
    
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
                .tableName(tableName)
                .item(item)
                .build();
        
        return exceptionHandler.executeWithRetry(() -> {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved stack with id: %s", stack.getId());
            return stack;
        }, "save stack " + stack.getId());
    }
    
    @Override
    public Optional<Stack> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.stackPK(id)).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.stackSK()).build()
                ))
                .build();
        
        return exceptionHandler.executeWithRetry(() -> {
            GetItemResponse response = dynamoDbClient.getItem(request);
            
            if (!response.hasItem() || response.item().isEmpty()) {
                return Optional.empty();
            }
            
            Stack stack = entityMapper.itemToStack(response.item());
            return Optional.ofNullable(stack);
        }, "findById stack " + id);
    }
    
    @Override
    public List<Stack> findAll() {
        // Scan with filter for Stack entity type
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build()
                ))
                .build();
        
        return executeScan(request, "findAll");
    }
    
    @Override
    public List<Stack> findByCreatedBy(String createdBy) {
        if (createdBy == null) {
            return Collections.emptyList();
        }
        
        // Scan with filter (could be optimized with a GSI if this query is frequent)
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND createdBy = :createdBy")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":createdBy", AttributeValue.builder().s(createdBy).build()
                ))
                .build();
        
        return executeScan(request, "findByCreatedBy: " + createdBy);
    }
    
    @Override
    public List<Stack> findByStackType(StackType stackType) {
        if (stackType == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND stackType = :stackType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":stackType", AttributeValue.builder().s(stackType.name()).build()
                ))
                .build();
        
        return executeScan(request, "findByStackType: " + stackType);
    }
    
    @Override
    public List<Stack> findByEphemeralPrefix(String ephemeralPrefix) {
        if (ephemeralPrefix == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND ephemeralPrefix = :ephemeralPrefix")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":ephemeralPrefix", AttributeValue.builder().s(ephemeralPrefix).build()
                ))
                .build();
        
        return executeScan(request, "findByEphemeralPrefix: " + ephemeralPrefix);
    }
    
    @Override
    public boolean existsByNameAndCreatedBy(String name, String createdBy) {
        if (name == null || createdBy == null) {
            return false;
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND #name = :name AND createdBy = :createdBy")
                .expressionAttributeNames(Map.of("#name", "name"))
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":name", AttributeValue.builder().s(name).build(),
                    ":createdBy", AttributeValue.builder().s(createdBy).build()
                ))
                .limit(1)
                .build();
        
        return exceptionHandler.executeWithRetry(() -> {
            ScanResponse response = dynamoDbClient.scan(request);
            return response.count() > 0;
        }, "existsByNameAndCreatedBy");
    }
    
    @Override
    public List<Stack> findByTeamId(UUID teamId) {
        if (teamId == null) {
            return Collections.emptyList();
        }
        
        // Use GSI1 to query stacks by team
        QueryRequest request = QueryRequest.builder()
                .tableName(tableName)
                .indexName("GSI1")
                .keyConditionExpression("GSI1PK = :teamPK AND begins_with(GSI1SK, :stackPrefix)")
                .expressionAttributeValues(Map.of(
                    ":teamPK", AttributeValue.builder().s(SingleTableKeyBuilder.teamPK(teamId)).build(),
                    ":stackPrefix", AttributeValue.builder().s(SingleTableKeyBuilder.STACK_PREFIX).build()
                ))
                .build();
        
        return executeQuery(request, "findByTeamId: " + teamId);
    }
    
    @Override
    public List<Stack> findByStackCollectionId(UUID collectionId) {
        if (collectionId == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND stackCollectionId = :stackCollectionId")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":stackCollectionId", AttributeValue.builder().s(collectionId.toString()).build()
                ))
                .build();
        
        return executeScan(request, "findByStackCollectionId: " + collectionId);
    }
    
    @Override
    public List<Stack> findByDomainId(UUID domainId) {
        if (domainId == null) {
            return Collections.emptyList();
        }
        
        // Not implemented in current schema
        return Collections.emptyList();
    }
    
    @Override
    public List<Stack> findByCategoryId(UUID categoryId) {
        if (categoryId == null) {
            return Collections.emptyList();
        }
        
        // Not implemented in current schema
        return Collections.emptyList();
    }
    
    @Override
    public List<Stack> findByCloudProviderId(UUID cloudProviderId) {
        if (cloudProviderId == null) {
            return Collections.emptyList();
        }
        
        // This would require querying through StackResources
        // For now, use scan with filter
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build()
                ))
                .build();
        
        return executeScan(request, "findByCloudProviderId: " + cloudProviderId);
    }
    
    @Override
    public List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy) {
        if (cloudProviderId == null || createdBy == null) {
            return Collections.emptyList();
        }
        
        // This would require querying through StackResources
        // For now, use scan with filter
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND createdBy = :createdBy")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":createdBy", AttributeValue.builder().s(createdBy).build()
                ))
                .build();
        
        return executeScan(request, "findByCloudProviderAndCreatedBy");
    }
    
    @Override
    public List<Stack> findByBlueprintId(UUID blueprintId) {
        if (blueprintId == null) {
            return Collections.emptyList();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND blueprintId = :blueprintId")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build(),
                    ":blueprintId", AttributeValue.builder().s(blueprintId.toString()).build()
                ))
                .build();
        
        return executeScan(request, "findByBlueprintId: " + blueprintId);
    }
    
    @Override
    public void delete(Stack stack) {
        if (stack == null || stack.getId() == null) {
            return;
        }
        
        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.stackPK(stack.getId())).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.stackSK()).build()
                ))
                .build();
        
        exceptionHandler.executeWithRetryVoid(() -> {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted stack with id: %s", stack.getId());
        }, "delete stack " + stack.getId());
    }
    
    @Override
    public long count() {
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Stack").build()
                ))
                .select(Select.COUNT)
                .build();
        
        return exceptionHandler.executeWithRetry(() -> {
            ScanResponse response = dynamoDbClient.scan(request);
            return (long) response.count();
        }, "count stacks");
    }
    
    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }
    
    // ========== Helper Methods ==========
    
    private List<Stack> executeQuery(QueryRequest request, String queryDescription) {
        return exceptionHandler.executeWithRetry(() -> {
            List<Stack> stacks = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;
            QueryRequest currentRequest = request;
            
            do {
                if (lastEvaluatedKey != null) {
                    currentRequest = currentRequest.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }
                
                response = dynamoDbClient.query(currentRequest);
                
                List<Stack> pageStacks = response.items().stream()
                        .map(entityMapper::itemToStack)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                
                stacks.addAll(pageStacks);
                lastEvaluatedKey = response.lastEvaluatedKey();
                
            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());
            
            LOG.debugf("Found %d stacks for query: %s", stacks.size(), queryDescription);
            return stacks;
        }, "query: " + queryDescription);
    }
    
    private List<Stack> executeScan(ScanRequest request, String scanDescription) {
        return exceptionHandler.executeWithRetry(() -> {
            List<Stack> stacks = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;
            ScanRequest currentRequest = request;
            
            do {
                if (lastEvaluatedKey != null) {
                    currentRequest = currentRequest.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }
                
                response = dynamoDbClient.scan(currentRequest);
                
                List<Stack> pageStacks = response.items().stream()
                        .map(entityMapper::itemToStack)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                
                stacks.addAll(pageStacks);
                lastEvaluatedKey = response.lastEvaluatedKey();
                
            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());
            
            LOG.debugf("Found %d stacks for scan: %s", stacks.size(), scanDescription);
            return stacks;
        }, "scan: " + scanDescription);
    }
}
