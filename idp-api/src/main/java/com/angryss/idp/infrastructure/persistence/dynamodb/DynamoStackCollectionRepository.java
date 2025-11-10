package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.StackCollection;
import com.angryss.idp.domain.repositories.StackCollectionRepository;
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

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoStackCollectionRepository implements StackCollectionRepository {

    private static final Logger LOG = Logger.getLogger(DynamoStackCollectionRepository.class);
    private static final String TABLE_NAME = "idp_stack_collections";
    
    private static final String GSI_NAME = "name-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public StackCollection save(StackCollection stackCollection) {
        if (stackCollection.getId() == null) {
            stackCollection.setId(UUID.randomUUID());
        }
        
        if (stackCollection.getCreatedAt() == null) {
            stackCollection.setCreatedAt(LocalDateTime.now());
        }
        
        stackCollection.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.stackCollectionToItem(stackCollection);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved stack collection with id: %s", stackCollection.getId());
            return stackCollection;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save stack collection with id: %s", stackCollection.getId());
            throw new RuntimeException("Failed to save stack collection", e);
        }
    }

    @Override
    public Optional<StackCollection> findById(UUID id) {
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

            StackCollection stackCollection = entityMapper.itemToStackCollection(response.item());
            return Optional.ofNullable(stackCollection);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find stack collection by id: %s", id);
            throw new RuntimeException("Failed to find stack collection", e);
        }
    }

    @Override
    public List<StackCollection> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<StackCollection> stackCollections = new ArrayList<>();
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

                List<StackCollection> pageStackCollections = response.items().stream()
                        .map(entityMapper::itemToStackCollection)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stackCollections.addAll(pageStackCollections);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stack collections", stackCollections.size());
            return stackCollections;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all stack collections", e);
            throw new RuntimeException("Failed to find all stack collections", e);
        }
    }

    @Override
    public Optional<StackCollection> findByName(String name) {
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

            StackCollection stackCollection = entityMapper.itemToStackCollection(response.items().get(0));
            return Optional.ofNullable(stackCollection);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find stack collection by name: %s", name);
            throw new RuntimeException("Failed to find stack collection by name", e);
        }
    }

    @Override
    public List<StackCollection> findByIsActive(Boolean isActive) {
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
    public void delete(StackCollection stackCollection) {
        if (stackCollection == null || stackCollection.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(stackCollection.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted stack collection with id: %s", stackCollection.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete stack collection with id: %s", stackCollection.getId());
            throw new RuntimeException("Failed to delete stack collection", e);
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
            LOG.error("Failed to count stack collections", e);
            throw new RuntimeException("Failed to count stack collections", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    private List<StackCollection> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<StackCollection> stackCollections = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<StackCollection> pageStackCollections = response.items().stream()
                        .map(entityMapper::itemToStackCollection)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stackCollections.addAll(pageStackCollections);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stack collections for query: %s", stackCollections.size(), queryDescription);
            return stackCollections;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
