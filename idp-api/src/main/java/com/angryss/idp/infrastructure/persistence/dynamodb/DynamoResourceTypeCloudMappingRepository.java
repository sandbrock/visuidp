package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.repositories.ResourceTypeCloudMappingRepository;
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
public class DynamoResourceTypeCloudMappingRepository implements ResourceTypeCloudMappingRepository {

    private static final Logger LOG = Logger.getLogger(DynamoResourceTypeCloudMappingRepository.class);
    private static final String TABLE_NAME = "idp_resource_type_cloud_mappings";
    
    private static final String GSI_RESOURCE_TYPE_ID = "resourceTypeId-createdAt-index";
    private static final String GSI_CLOUD_PROVIDER_ID = "cloudProviderId-createdAt-index";
    private static final String GSI_ENABLED = "enabled-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public ResourceTypeCloudMapping save(ResourceTypeCloudMapping mapping) {
        if (mapping.id == null) {
            mapping.id = UUID.randomUUID();
        }
        
        if (mapping.createdAt == null) {
            mapping.createdAt = LocalDateTime.now();
        }
        
        mapping.updatedAt = LocalDateTime.now();

        Map<String, AttributeValue> item = entityMapper.resourceTypeCloudMappingToItem(mapping);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved resource type cloud mapping with id: %s", mapping.id);
            return mapping;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save resource type cloud mapping with id: %s", mapping.id);
            throw new RuntimeException("Failed to save resource type cloud mapping", e);
        }
    }

    @Override
    public Optional<ResourceTypeCloudMapping> findById(UUID id) {
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

            ResourceTypeCloudMapping mapping = entityMapper.itemToResourceTypeCloudMapping(response.item());
            return Optional.ofNullable(mapping);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find resource type cloud mapping by id: %s", id);
            throw new RuntimeException("Failed to find resource type cloud mapping", e);
        }
    }

    @Override
    public List<ResourceTypeCloudMapping> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<ResourceTypeCloudMapping> mappings = new ArrayList<>();
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

                List<ResourceTypeCloudMapping> pageMappings = response.items().stream()
                        .map(entityMapper::itemToResourceTypeCloudMapping)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                mappings.addAll(pageMappings);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d resource type cloud mappings", mappings.size());
            return mappings;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all resource type cloud mappings", e);
            throw new RuntimeException("Failed to find all resource type cloud mappings", e);
        }
    }

    @Override
    public Optional<ResourceTypeCloudMapping> findByResourceTypeIdAndCloudProviderId(UUID resourceTypeId, UUID cloudProviderId) {
        if (resourceTypeId == null || cloudProviderId == null) {
            return Optional.empty();
        }

        // Query by resourceTypeId GSI and filter by cloudProviderId
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_RESOURCE_TYPE_ID)
                .keyConditionExpression("resourceTypeId = :resourceTypeId")
                .filterExpression("cloudProviderId = :cloudProviderId")
                .expressionAttributeValues(Map.of(
                        ":resourceTypeId", AttributeValue.builder().s(resourceTypeId.toString()).build(),
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);

            if (response.count() == 0 || !response.hasItems()) {
                return Optional.empty();
            }

            ResourceTypeCloudMapping mapping = entityMapper.itemToResourceTypeCloudMapping(response.items().get(0));
            return Optional.ofNullable(mapping);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find resource type cloud mapping by resourceTypeId: %s and cloudProviderId: %s", resourceTypeId, cloudProviderId);
            throw new RuntimeException("Failed to find resource type cloud mapping", e);
        }
    }

    @Override
    public List<ResourceTypeCloudMapping> findByResourceTypeId(UUID resourceTypeId) {
        if (resourceTypeId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_RESOURCE_TYPE_ID)
                .keyConditionExpression("resourceTypeId = :resourceTypeId")
                .expressionAttributeValues(Map.of(
                        ":resourceTypeId", AttributeValue.builder().s(resourceTypeId.toString()).build()
                ))
                .build();

        return executeQuery(request, "resourceTypeId: " + resourceTypeId);
    }

    @Override
    public List<ResourceTypeCloudMapping> findByCloudProviderId(UUID cloudProviderId) {
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
    public List<ResourceTypeCloudMapping> findByEnabled(Boolean enabled) {
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
    public List<ResourceTypeCloudMapping> findByResourceTypeIdAndEnabled(UUID resourceTypeId, Boolean enabled) {
        if (resourceTypeId == null || enabled == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_RESOURCE_TYPE_ID)
                .keyConditionExpression("resourceTypeId = :resourceTypeId")
                .filterExpression("enabled = :enabled")
                .expressionAttributeValues(Map.of(
                        ":resourceTypeId", AttributeValue.builder().s(resourceTypeId.toString()).build(),
                        ":enabled", AttributeValue.builder().bool(enabled).build()
                ))
                .build();

        return executeQuery(request, "resourceTypeId: " + resourceTypeId + ", enabled: " + enabled);
    }

    @Override
    public List<ResourceTypeCloudMapping> findByCloudProviderIdAndEnabled(UUID cloudProviderId, Boolean enabled) {
        if (cloudProviderId == null || enabled == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_CLOUD_PROVIDER_ID)
                .keyConditionExpression("cloudProviderId = :cloudProviderId")
                .filterExpression("enabled = :enabled")
                .expressionAttributeValues(Map.of(
                        ":cloudProviderId", AttributeValue.builder().s(cloudProviderId.toString()).build(),
                        ":enabled", AttributeValue.builder().bool(enabled).build()
                ))
                .build();

        return executeQuery(request, "cloudProviderId: " + cloudProviderId + ", enabled: " + enabled);
    }

    @Override
    public void delete(ResourceTypeCloudMapping mapping) {
        if (mapping == null || mapping.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(mapping.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted resource type cloud mapping with id: %s", mapping.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete resource type cloud mapping with id: %s", mapping.id);
            throw new RuntimeException("Failed to delete resource type cloud mapping", e);
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
            LOG.error("Failed to count resource type cloud mappings", e);
            throw new RuntimeException("Failed to count resource type cloud mappings", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    private List<ResourceTypeCloudMapping> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<ResourceTypeCloudMapping> mappings = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<ResourceTypeCloudMapping> pageMappings = response.items().stream()
                        .map(entityMapper::itemToResourceTypeCloudMapping)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                mappings.addAll(pageMappings);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d resource type cloud mappings for query: %s", mappings.size(), queryDescription);
            return mappings;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
