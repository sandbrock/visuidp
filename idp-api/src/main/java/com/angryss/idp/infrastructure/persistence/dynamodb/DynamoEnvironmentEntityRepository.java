package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.repositories.EnvironmentEntityRepository;
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
public class DynamoEnvironmentEntityRepository implements EnvironmentEntityRepository {

    private static final Logger LOG = Logger.getLogger(DynamoEnvironmentEntityRepository.class);
    private static final String TABLE_NAME = "idp_environment_entities";
    
    private static final String GSI_NAME = "name-index";
    private static final String GSI_CLOUD_PROVIDER_ID = "cloudProviderId-createdAt-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";
    private static final String GSI_BLUEPRINT_ID = "blueprintId-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public EnvironmentEntity save(EnvironmentEntity environmentEntity) {
        if (environmentEntity.getId() == null) {
            environmentEntity.setId(UUID.randomUUID());
        }
        
        if (environmentEntity.getCreatedAt() == null) {
            environmentEntity.setCreatedAt(LocalDateTime.now());
        }
        
        environmentEntity.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.environmentEntityToItem(environmentEntity);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved environment entity with id: %s", environmentEntity.getId());
            return environmentEntity;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save environment entity with id: %s", environmentEntity.getId());
            throw new RuntimeException("Failed to save environment entity", e);
        }
    }

    @Override
    public Optional<EnvironmentEntity> findById(UUID id) {
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

            EnvironmentEntity environmentEntity = entityMapper.itemToEnvironmentEntity(response.item());
            return Optional.ofNullable(environmentEntity);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find environment entity by id: %s", id);
            throw new RuntimeException("Failed to find environment entity", e);
        }
    }

    @Override
    public List<EnvironmentEntity> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<EnvironmentEntity> environmentEntities = new ArrayList<>();
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

                List<EnvironmentEntity> pageEnvironmentEntities = response.items().stream()
                        .map(entityMapper::itemToEnvironmentEntity)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                environmentEntities.addAll(pageEnvironmentEntities);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d environment entities", environmentEntities.size());
            return environmentEntities;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all environment entities", e);
            throw new RuntimeException("Failed to find all environment entities", e);
        }
    }

    @Override
    public Optional<EnvironmentEntity> findByName(String name) {
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

            EnvironmentEntity environmentEntity = entityMapper.itemToEnvironmentEntity(response.items().get(0));
            return Optional.ofNullable(environmentEntity);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find environment entity by name: %s", name);
            throw new RuntimeException("Failed to find environment entity by name", e);
        }
    }

    @Override
    public List<EnvironmentEntity> findByCloudProviderId(UUID cloudProviderId) {
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
    public List<EnvironmentEntity> findByIsActive(Boolean isActive) {
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
    public List<EnvironmentEntity> findByBlueprintId(UUID blueprintId) {
        if (blueprintId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_BLUEPRINT_ID)
                .keyConditionExpression("blueprintId = :blueprintId")
                .expressionAttributeValues(Map.of(
                        ":blueprintId", AttributeValue.builder().s(blueprintId.toString()).build()
                ))
                .build();

        return executeQuery(request, "blueprintId: " + blueprintId);
    }

    @Override
    public List<EnvironmentEntity> findByCloudProviderIdAndIsActive(UUID cloudProviderId, Boolean isActive) {
        if (cloudProviderId == null || isActive == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CLOUD_PROVIDER_ID)
                .keyConditionExpression("cloudProviderId = :cloudProviderId")
                .filterExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build(),
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "cloudProviderId: " + cloudProviderId + ", isActive: " + isActive);
    }

    @Override
    public void delete(EnvironmentEntity environmentEntity) {
        if (environmentEntity == null || environmentEntity.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(environmentEntity.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted environment entity with id: %s", environmentEntity.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete environment entity with id: %s", environmentEntity.getId());
            throw new RuntimeException("Failed to delete environment entity", e);
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
            LOG.error("Failed to count environment entities", e);
            throw new RuntimeException("Failed to count environment entities", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    private List<EnvironmentEntity> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<EnvironmentEntity> environmentEntities = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<EnvironmentEntity> pageEnvironmentEntities = response.items().stream()
                        .map(entityMapper::itemToEnvironmentEntity)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                environmentEntities.addAll(pageEnvironmentEntities);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d environment entities for query: %s", environmentEntities.size(), queryDescription);
            return environmentEntities;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
