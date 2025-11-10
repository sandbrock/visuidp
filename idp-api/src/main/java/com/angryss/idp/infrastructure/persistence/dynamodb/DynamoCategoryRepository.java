package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.repositories.CategoryRepository;
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
public class DynamoCategoryRepository implements CategoryRepository {

    private static final Logger LOG = Logger.getLogger(DynamoCategoryRepository.class);
    private static final String TABLE_NAME = "idp_categories";
    
    private static final String GSI_NAME = "name-index";
    private static final String GSI_DOMAIN_ID = "domainId-createdAt-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public Category save(Category category) {
        if (category.getId() == null) {
            category.setId(UUID.randomUUID());
        }
        
        if (category.getCreatedAt() == null) {
            category.setCreatedAt(LocalDateTime.now());
        }
        
        category.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.categoryToItem(category);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved category with id: %s", category.getId());
            return category;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save category with id: %s", category.getId());
            throw new RuntimeException("Failed to save category", e);
        }
    }

    @Override
    public Optional<Category> findById(UUID id) {
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

            Category category = entityMapper.itemToCategory(response.item());
            return Optional.ofNullable(category);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find category by id: %s", id);
            throw new RuntimeException("Failed to find category", e);
        }
    }

    @Override
    public List<Category> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<Category> categories = new ArrayList<>();
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

                List<Category> pageCategories = response.items().stream()
                        .map(entityMapper::itemToCategory)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                categories.addAll(pageCategories);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d categories", categories.size());
            return categories;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all categories", e);
            throw new RuntimeException("Failed to find all categories", e);
        }
    }

    @Override
    public Optional<Category> findByName(String name) {
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

            Category category = entityMapper.itemToCategory(response.items().get(0));
            return Optional.ofNullable(category);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find category by name: %s", name);
            throw new RuntimeException("Failed to find category by name", e);
        }
    }

    @Override
    public List<Category> findByDomainId(UUID domainId) {
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
    public List<Category> findByIsActive(Boolean isActive) {
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
    public List<Category> findByDomainIdAndIsActive(UUID domainId, Boolean isActive) {
        if (domainId == null || isActive == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_DOMAIN_ID)
                .keyConditionExpression("domainId = :domainId")
                .filterExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":domainId", AttributeValue.builder().s(domainId.toString()).build(),
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "domainId: " + domainId + ", isActive: " + isActive);
    }

    @Override
    public void delete(Category category) {
        if (category == null || category.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(category.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted category with id: %s", category.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete category with id: %s", category.getId());
            throw new RuntimeException("Failed to delete category", e);
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
            LOG.error("Failed to count categories", e);
            throw new RuntimeException("Failed to count categories", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    private List<Category> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<Category> categories = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<Category> pageCategories = response.items().stream()
                        .map(entityMapper::itemToCategory)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                categories.addAll(pageCategories);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d categories for query: %s", categories.size(), queryDescription);
            return categories;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
