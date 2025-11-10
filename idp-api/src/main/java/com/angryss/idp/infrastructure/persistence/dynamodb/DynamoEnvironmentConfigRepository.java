package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.repositories.EnvironmentConfigRepository;
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
public class DynamoEnvironmentConfigRepository implements EnvironmentConfigRepository {

    private static final Logger LOG = Logger.getLogger(DynamoEnvironmentConfigRepository.class);
    private static final String TABLE_NAME = "idp_environment_configs";
    
    private static final String GSI_ENVIRONMENT_ID = "environmentId-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public EnvironmentConfig save(EnvironmentConfig environmentConfig) {
        if (environmentConfig.getId() == null) {
            environmentConfig.setId(UUID.randomUUID());
        }
        
        if (environmentConfig.getCreatedAt() == null) {
            environmentConfig.setCreatedAt(LocalDateTime.now());
        }
        
        environmentConfig.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.environmentConfigToItem(environmentConfig);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved environment config with id: %s", environmentConfig.getId());
            return environmentConfig;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save environment config with id: %s", environmentConfig.getId());
            throw new RuntimeException("Failed to save environment config", e);
        }
    }

    @Override
    public Optional<EnvironmentConfig> findById(UUID id) {
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

            EnvironmentConfig environmentConfig = entityMapper.itemToEnvironmentConfig(response.item());
            return Optional.ofNullable(environmentConfig);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find environment config by id: %s", id);
            throw new RuntimeException("Failed to find environment config", e);
        }
    }

    @Override
    public List<EnvironmentConfig> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<EnvironmentConfig> environmentConfigs = new ArrayList<>();
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

                List<EnvironmentConfig> pageEnvironmentConfigs = response.items().stream()
                        .map(entityMapper::itemToEnvironmentConfig)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                environmentConfigs.addAll(pageEnvironmentConfigs);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d environment configs", environmentConfigs.size());
            return environmentConfigs;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all environment configs", e);
            throw new RuntimeException("Failed to find all environment configs", e);
        }
    }

    @Override
    public Optional<EnvironmentConfig> findByEnvironmentId(UUID environmentId) {
        if (environmentId == null) {
            return Optional.empty();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_ENVIRONMENT_ID)
                .keyConditionExpression("environmentId = :environmentId")
                .expressionAttributeValues(Map.of(
                        ":environmentId", AttributeValue.builder().s(environmentId.toString()).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);

            if (response.count() == 0 || !response.hasItems()) {
                return Optional.empty();
            }

            EnvironmentConfig environmentConfig = entityMapper.itemToEnvironmentConfig(response.items().get(0));
            return Optional.ofNullable(environmentConfig);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find environment config by environmentId: %s", environmentId);
            throw new RuntimeException("Failed to find environment config by environmentId", e);
        }
    }

    @Override
    public List<EnvironmentConfig> findByIsActive(Boolean isActive) {
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
    public void delete(EnvironmentConfig environmentConfig) {
        if (environmentConfig == null || environmentConfig.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(environmentConfig.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted environment config with id: %s", environmentConfig.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete environment config with id: %s", environmentConfig.getId());
            throw new RuntimeException("Failed to delete environment config", e);
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
            LOG.error("Failed to count environment configs", e);
            throw new RuntimeException("Failed to count environment configs", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    private List<EnvironmentConfig> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<EnvironmentConfig> environmentConfigs = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<EnvironmentConfig> pageEnvironmentConfigs = response.items().stream()
                        .map(entityMapper::itemToEnvironmentConfig)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                environmentConfigs.addAll(pageEnvironmentConfigs);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d environment configs for query: %s", environmentConfigs.size(), queryDescription);
            return environmentConfigs;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
