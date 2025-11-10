package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.repositories.BlueprintResourceRepository;
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
 * DynamoDB implementation of BlueprintResourceRepository.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoBlueprintResourceRepository implements BlueprintResourceRepository {

    private static final Logger LOG = Logger.getLogger(DynamoBlueprintResourceRepository.class);
    private static final String TABLE_NAME = "idp_blueprint_resources";
    
    private static final String GSI_BLUEPRINT_ID = "blueprintId-createdAt-index";
    private static final String GSI_RESOURCE_TYPE_ID = "resourceTypeId-createdAt-index";
    private static final String GSI_CLOUD_PROVIDER_ID = "cloudProviderId-createdAt-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

    @Override
    public BlueprintResource save(BlueprintResource blueprintResource) {
        if (blueprintResource.id == null) {
            blueprintResource.id = UUID.randomUUID();
        }
        
        if (blueprintResource.getCreatedAt() == null) {
            blueprintResource.setCreatedAt(LocalDateTime.now());
        }
        
        blueprintResource.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.blueprintResourceToItem(blueprintResource);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved blueprint resource with id: %s", blueprintResource.id);
            return blueprintResource;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save blueprint resource with id: %s", blueprintResource.id);
            throw new RuntimeException("Failed to save blueprint resource", e);
        }
    }

    @Override
    public Optional<BlueprintResource> findById(UUID id) {
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

            BlueprintResource blueprintResource = entityMapper.itemToBlueprintResource(response.item());
            return Optional.ofNullable(blueprintResource);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find blueprint resource by id: %s", id);
            throw new RuntimeException("Failed to find blueprint resource", e);
        }
    }

    @Override
    public List<BlueprintResource> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<BlueprintResource> blueprintResources = new ArrayList<>();
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

                List<BlueprintResource> pageBlueprintResources = response.items().stream()
                        .map(entityMapper::itemToBlueprintResource)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                blueprintResources.addAll(pageBlueprintResources);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d blueprint resources", blueprintResources.size());
            return blueprintResources;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all blueprint resources", e);
            throw new RuntimeException("Failed to find all blueprint resources", e);
        }
    }

    @Override
    public List<BlueprintResource> findByBlueprintId(UUID blueprintId) {
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
    public List<BlueprintResource> findByResourceTypeId(UUID resourceTypeId) {
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
    public List<BlueprintResource> findByCloudProviderId(UUID cloudProviderId) {
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
    public List<BlueprintResource> findByIsActive(Boolean isActive) {
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
    public List<BlueprintResource> findByBlueprintIdAndIsActive(UUID blueprintId, Boolean isActive) {
        if (blueprintId == null || isActive == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_BLUEPRINT_ID)
                .keyConditionExpression("blueprintId = :blueprintId")
                .filterExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":blueprintId", AttributeValue.builder().s(blueprintId.toString()).build(),
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "blueprintId: " + blueprintId + ", isActive: " + isActive);
    }

    @Override
    public void delete(BlueprintResource blueprintResource) {
        if (blueprintResource == null || blueprintResource.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(blueprintResource.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted blueprint resource with id: %s", blueprintResource.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete blueprint resource with id: %s", blueprintResource.id);
            throw new RuntimeException("Failed to delete blueprint resource", e);
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
            LOG.error("Failed to count blueprint resources", e);
            throw new RuntimeException("Failed to count blueprint resources", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Saves multiple blueprint resources atomically using a transaction.
     * All resources are saved or none are saved.
     * 
     * @param resources List of blueprint resources to save
     * @return List of saved resources with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<BlueprintResource> saveAll(List<BlueprintResource> resources) {
        if (resources == null || resources.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d blueprint resources in transaction", resources.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (BlueprintResource resource : resources) {
            if (resource.id == null) {
                resource.id = UUID.randomUUID();
            }
            
            if (resource.getCreatedAt() == null) {
                resource.setCreatedAt(LocalDateTime.now());
            }
            
            resource.setUpdatedAt(LocalDateTime.now());
            
            Map<String, AttributeValue> item = entityMapper.blueprintResourceToItem(resource);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save blueprint resource: %s (id: %s)", resource.getName(), resource.id)
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d blueprint resources in transaction", resources.size());
        
        return resources;
    }
    
    /**
     * Deletes multiple blueprint resources atomically using a transaction.
     * All resources are deleted or none are deleted.
     * 
     * @param resources List of blueprint resources to delete
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public void deleteAll(List<BlueprintResource> resources) {
        if (resources == null || resources.isEmpty()) {
            return;
        }
        
        LOG.infof("Deleting %d blueprint resources in transaction", resources.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (BlueprintResource resource : resources) {
            if (resource.id != null) {
                Map<String, AttributeValue> key = Map.of(
                    "id", AttributeValue.builder().s(resource.id.toString()).build()
                );
                
                writes.add(DynamoTransactionManager.TransactionWrite.delete(
                    TABLE_NAME,
                    key,
                    String.format("Delete blueprint resource: %s (id: %s)", resource.getName(), resource.id)
                ));
            }
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully deleted %d blueprint resources in transaction", resources.size());
    }

    private List<BlueprintResource> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<BlueprintResource> blueprintResources = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<BlueprintResource> pageBlueprintResources = response.items().stream()
                        .map(entityMapper::itemToBlueprintResource)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                blueprintResources.addAll(pageBlueprintResources);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d blueprint resources for query: %s", blueprintResources.size(), queryDescription);
            return blueprintResources;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
