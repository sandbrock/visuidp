package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
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
 * DynamoDB implementation of CloudProviderRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoCloudProviderRepository implements CloudProviderRepository {

    private static final Logger LOG = Logger.getLogger(DynamoCloudProviderRepository.class);
    private static final String TABLE_NAME = "idp_cloud_providers";
    
    // GSI names for query optimization
    private static final String GSI_NAME = "name-index";
    private static final String GSI_ENABLED = "enabled-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public CloudProvider save(CloudProvider cloudProvider) {
        if (cloudProvider.id == null) {
            cloudProvider.id = UUID.randomUUID();
        }
        
        if (cloudProvider.createdAt == null) {
            cloudProvider.createdAt = LocalDateTime.now();
        }
        
        cloudProvider.updatedAt = LocalDateTime.now();

        Map<String, AttributeValue> item = entityMapper.cloudProviderToItem(cloudProvider);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved cloud provider with id: %s", cloudProvider.id);
            return cloudProvider;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save cloud provider with id: %s", cloudProvider.id);
            throw new RuntimeException("Failed to save cloud provider", e);
        }
    }

    @Override
    public Optional<CloudProvider> findById(UUID id) {
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

            CloudProvider cloudProvider = entityMapper.itemToCloudProvider(response.item());
            return Optional.ofNullable(cloudProvider);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find cloud provider by id: %s", id);
            throw new RuntimeException("Failed to find cloud provider", e);
        }
    }

    @Override
    public List<CloudProvider> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<CloudProvider> cloudProviders = new ArrayList<>();
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

                List<CloudProvider> pageCloudProviders = response.items().stream()
                        .map(entityMapper::itemToCloudProvider)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                cloudProviders.addAll(pageCloudProviders);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d cloud providers", cloudProviders.size());
            return cloudProviders;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all cloud providers", e);
            throw new RuntimeException("Failed to find all cloud providers", e);
        }
    }

    @Override
    public Optional<CloudProvider> findByName(String name) {
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

            CloudProvider cloudProvider = entityMapper.itemToCloudProvider(response.items().get(0));
            return Optional.ofNullable(cloudProvider);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find cloud provider by name: %s", name);
            throw new RuntimeException("Failed to find cloud provider by name", e);
        }
    }

    @Override
    public List<CloudProvider> findByEnabled(Boolean enabled) {
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
    public void delete(CloudProvider cloudProvider) {
        if (cloudProvider == null || cloudProvider.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(cloudProvider.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted cloud provider with id: %s", cloudProvider.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete cloud provider with id: %s", cloudProvider.id);
            throw new RuntimeException("Failed to delete cloud provider", e);
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
            LOG.error("Failed to count cloud providers", e);
            throw new RuntimeException("Failed to count cloud providers", e);
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
     * @return list of cloud providers matching the query
     */
    private List<CloudProvider> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<CloudProvider> cloudProviders = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<CloudProvider> pageCloudProviders = response.items().stream()
                        .map(entityMapper::itemToCloudProvider)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                cloudProviders.addAll(pageCloudProviders);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d cloud providers for query: %s", cloudProviders.size(), queryDescription);
            return cloudProviders;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
