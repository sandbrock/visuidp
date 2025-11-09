package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.repositories.BlueprintRepository;
import com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB implementation of BlueprintRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@Named("dynamodb")
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoBlueprintRepository implements BlueprintRepository {

    private static final Logger LOG = Logger.getLogger(DynamoBlueprintRepository.class);
    private static final String TABLE_NAME = "idp_blueprints";
    
    // GSI names for query optimization
    private static final String GSI_NAME = "name-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";
    private static final String GSI_CLOUD_PROVIDER = "cloudProviderId-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

    @Override
    public Blueprint save(Blueprint blueprint) {
        if (blueprint.getId() == null) {
            blueprint.setId(UUID.randomUUID());
        }
        
        if (blueprint.getCreatedAt() == null) {
            blueprint.setCreatedAt(LocalDateTime.now());
        }
        
        blueprint.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.blueprintToItem(blueprint);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved blueprint with id: %s", blueprint.getId());
            return blueprint;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save blueprint with id: %s", blueprint.getId());
            throw new RuntimeException("Failed to save blueprint", e);
        }
    }

    @Override
    public Optional<Blueprint> findById(UUID id) {
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

            Blueprint blueprint = entityMapper.itemToBlueprint(response.item());
            return Optional.ofNullable(blueprint);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find blueprint by id: %s", id);
            throw new RuntimeException("Failed to find blueprint", e);
        }
    }

    @Override
    public List<Blueprint> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<Blueprint> blueprints = new ArrayList<>();
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

                List<Blueprint> pageBlueprints = response.items().stream()
                        .map(entityMapper::itemToBlueprint)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                blueprints.addAll(pageBlueprints);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d blueprints", blueprints.size());
            return blueprints;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all blueprints", e);
            throw new RuntimeException("Failed to find all blueprints", e);
        }
    }

    @Override
    public Optional<Blueprint> findByName(String name) {
        if (name == null) {
            return Optional.empty();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_NAME)
                .keyConditionExpression("#name = :name")
                .expressionAttributeNames(Map.of("#name", "name"))
                .expressionAttributeValues(Map.of(
                        ":name", AttributeValue.builder().s(name).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);

            if (response.count() == 0 || !response.hasItems()) {
                return Optional.empty();
            }

            Blueprint blueprint = entityMapper.itemToBlueprint(response.items().get(0));
            return Optional.ofNullable(blueprint);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find blueprint by name: %s", name);
            throw new RuntimeException("Failed to find blueprint by name", e);
        }
    }

    @Override
    public List<Blueprint> findByIsActive(Boolean isActive) {
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
    public List<Blueprint> findBySupportedCloudProviderId(UUID cloudProviderId) {
        if (cloudProviderId == null) {
            return Collections.emptyList();
        }

        // Since supportedCloudProviders is stored as a list of UUIDs in the item,
        // we need to scan and filter. For better performance, we could create a
        // separate junction table, but for now we'll use a filter expression.
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("contains(supportedCloudProviderIds, :cloudProviderId)")
                .expressionAttributeValues(Map.of(
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build()
                ))
                .build();

        try {
            List<Blueprint> blueprints = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = ScanRequest.builder()
                            .tableName(TABLE_NAME)
                            .filterExpression("contains(supportedCloudProviderIds, :cloudProviderId)")
                            .expressionAttributeValues(Map.of(
                                    ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build()
                            ))
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.scan(request);

                List<Blueprint> pageBlueprints = response.items().stream()
                        .map(entityMapper::itemToBlueprint)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                blueprints.addAll(pageBlueprints);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d blueprints for cloudProviderId: %s", blueprints.size(), cloudProviderId);
            return blueprints;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find blueprints by cloudProviderId: %s", cloudProviderId);
            throw new RuntimeException("Failed to find blueprints by cloudProviderId", e);
        }
    }

    @Override
    public void delete(Blueprint blueprint) {
        if (blueprint == null || blueprint.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(blueprint.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted blueprint with id: %s", blueprint.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete blueprint with id: %s", blueprint.getId());
            throw new RuntimeException("Failed to delete blueprint", e);
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
            LOG.error("Failed to count blueprints", e);
            throw new RuntimeException("Failed to count blueprints", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Saves multiple blueprints atomically using a transaction.
     * All blueprints are saved or none are saved.
     * 
     * @param blueprints List of blueprints to save
     * @return List of saved blueprints with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<Blueprint> saveAll(List<Blueprint> blueprints) {
        if (blueprints == null || blueprints.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d blueprints in transaction", blueprints.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Blueprint blueprint : blueprints) {
            if (blueprint.getId() == null) {
                blueprint.setId(UUID.randomUUID());
            }
            
            if (blueprint.getCreatedAt() == null) {
                blueprint.setCreatedAt(LocalDateTime.now());
            }
            
            blueprint.setUpdatedAt(LocalDateTime.now());
            
            Map<String, AttributeValue> item = entityMapper.blueprintToItem(blueprint);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save blueprint: %s (id: %s)", blueprint.getName(), blueprint.getId())
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d blueprints in transaction", blueprints.size());
        
        return blueprints;
    }
    
    /**
     * Deletes multiple blueprints atomically using a transaction.
     * All blueprints are deleted or none are deleted.
     * 
     * @param blueprints List of blueprints to delete
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public void deleteAll(List<Blueprint> blueprints) {
        if (blueprints == null || blueprints.isEmpty()) {
            return;
        }
        
        LOG.infof("Deleting %d blueprints in transaction", blueprints.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Blueprint blueprint : blueprints) {
            if (blueprint.getId() != null) {
                Map<String, AttributeValue> key = Map.of(
                    "id", AttributeValue.builder().s(blueprint.getId().toString()).build()
                );
                
                writes.add(DynamoTransactionManager.TransactionWrite.delete(
                    TABLE_NAME,
                    key,
                    String.format("Delete blueprint: %s (id: %s)", blueprint.getName(), blueprint.getId())
                ));
            }
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully deleted %d blueprints in transaction", blueprints.size());
    }
    
    /**
     * Updates a blueprint with optimistic locking using a conditional write.
     * The update only succeeds if the blueprint hasn't been modified since it was read.
     * 
     * @param blueprint Blueprint to update
     * @param expectedUpdatedAt Expected updatedAt timestamp for optimistic locking
     * @return Updated blueprint
     * @throws DynamoTransactionManager.TransactionFailedException if the condition fails
     */
    public Blueprint saveWithOptimisticLock(Blueprint blueprint, LocalDateTime expectedUpdatedAt) {
        if (blueprint.getId() == null) {
            throw new IllegalArgumentException("Blueprint ID must not be null for optimistic locking");
        }
        
        LOG.debugf("Saving blueprint %s with optimistic lock (expected updatedAt: %s)", 
            blueprint.getId(), expectedUpdatedAt);
        
        blueprint.setUpdatedAt(LocalDateTime.now());
        Map<String, AttributeValue> item = entityMapper.blueprintToItem(blueprint);
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        // Add conditional write that checks the updatedAt timestamp
        writes.add(DynamoTransactionManager.TransactionWrite.putWithCondition(
            TABLE_NAME,
            item,
            "updatedAt = :expectedUpdatedAt OR attribute_not_exists(updatedAt)",
            null,
            Map.of(":expectedUpdatedAt", 
                AttributeValue.builder().s(expectedUpdatedAt.toString()).build()),
            String.format("Update blueprint %s with optimistic lock", blueprint.getId())
        ));
        
        transactionManager.executeTransaction(writes);
        LOG.debugf("Successfully saved blueprint %s with optimistic lock", blueprint.getId());
        
        return blueprint;
    }

    /**
     * Helper method to execute a query and handle pagination.
     *
     * @param request the QueryRequest to execute
     * @param queryDescription description for logging
     * @return list of blueprints matching the query
     */
    private List<Blueprint> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<Blueprint> blueprints = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<Blueprint> pageBlueprints = response.items().stream()
                        .map(entityMapper::itemToBlueprint)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                blueprints.addAll(pageBlueprints);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d blueprints for query: %s", blueprints.size(), queryDescription);
            return blueprints;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
