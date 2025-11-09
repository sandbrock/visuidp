package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
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
 * DynamoDB implementation of ResourceTypeRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@Named("dynamodb")
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoResourceTypeRepository implements ResourceTypeRepository {

    private static final Logger LOG = Logger.getLogger(DynamoResourceTypeRepository.class);
    private static final String TABLE_NAME = "idp_resource_types";
    
    // GSI names for query optimization
    private static final String GSI_NAME = "name-index";
    private static final String GSI_CATEGORY = "category-createdAt-index";
    private static final String GSI_ENABLED = "enabled-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public ResourceType save(ResourceType resourceType) {
        if (resourceType.id == null) {
            resourceType.id = UUID.randomUUID();
        }
        
        if (resourceType.createdAt == null) {
            resourceType.createdAt = LocalDateTime.now();
        }
        
        resourceType.updatedAt = LocalDateTime.now();

        Map<String, AttributeValue> item = entityMapper.resourceTypeToItem(resourceType);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved resource type with id: %s", resourceType.id);
            return resourceType;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save resource type with id: %s", resourceType.id);
            throw new RuntimeException("Failed to save resource type", e);
        }
    }

    @Override
    public Optional<ResourceType> findById(UUID id) {
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

            ResourceType resourceType = entityMapper.itemToResourceType(response.item());
            return Optional.ofNullable(resourceType);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find resource type by id: %s", id);
            throw new RuntimeException("Failed to find resource type", e);
        }
    }

    @Override
    public List<ResourceType> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<ResourceType> resourceTypes = new ArrayList<>();
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

                List<ResourceType> pageResourceTypes = response.items().stream()
                        .map(entityMapper::itemToResourceType)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                resourceTypes.addAll(pageResourceTypes);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d resource types", resourceTypes.size());
            return resourceTypes;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all resource types", e);
            throw new RuntimeException("Failed to find all resource types", e);
        }
    }

    @Override
    public Optional<ResourceType> findByName(String name) {
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

            ResourceType resourceType = entityMapper.itemToResourceType(response.items().get(0));
            return Optional.ofNullable(resourceType);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find resource type by name: %s", name);
            throw new RuntimeException("Failed to find resource type by name", e);
        }
    }

    @Override
    public List<ResourceType> findByCategory(ResourceCategory category) {
        if (category == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CATEGORY)
                .keyConditionExpression("category = :category")
                .expressionAttributeValues(Map.of(
                        ":category", AttributeValue.builder().s(category.name()).build()
                ))
                .build();

        return executeQuery(request, "category: " + category);
    }

    @Override
    public List<ResourceType> findByEnabled(Boolean enabled) {
        if (enabled == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_ENABLED)
                .keyConditionExpression("enabled = :enabled")
                .expressionAttributeValues(Map.of(
                        ":enabled", AttributeValue.builder().bool(enabled).build()
                ))
                .build();

        return executeQuery(request, "enabled: " + enabled);
    }

    @Override
    public List<ResourceType> findByCategoryAndEnabled(ResourceCategory category, Boolean enabled) {
        if (category == null || enabled == null) {
            return Collections.emptyList();
        }

        // Query by category GSI and filter by enabled
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CATEGORY)
                .keyConditionExpression("category = :category")
                .filterExpression("enabled = :enabled")
                .expressionAttributeValues(Map.of(
                        ":category", AttributeValue.builder().s(category.name()).build(),
                        ":enabled", AttributeValue.builder().bool(enabled).build()
                ))
                .build();

        return executeQuery(request, "category: " + category + ", enabled: " + enabled);
    }

    @Override
    public void delete(ResourceType resourceType) {
        if (resourceType == null || resourceType.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(resourceType.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted resource type with id: %s", resourceType.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete resource type with id: %s", resourceType.id);
            throw new RuntimeException("Failed to delete resource type", e);
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
            LOG.error("Failed to count resource types", e);
            throw new RuntimeException("Failed to count resource types", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Helper method to execute a query and handle pagination.
     *
     * @param request the QueryRequest to execute
     * @param queryDescription description for logging
     * @return list of resource types matching the query
     */
    private List<ResourceType> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<ResourceType> resourceTypes = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<ResourceType> pageResourceTypes = response.items().stream()
                        .map(entityMapper::itemToResourceType)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                resourceTypes.addAll(pageResourceTypes);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d resource types for query: %s", resourceTypes.size(), queryDescription);
            return resourceTypes;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
