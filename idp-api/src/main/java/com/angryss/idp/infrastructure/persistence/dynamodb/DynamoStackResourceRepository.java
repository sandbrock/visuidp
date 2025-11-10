package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.repositories.StackResourceRepository;
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
public class DynamoStackResourceRepository implements StackResourceRepository {

    private static final Logger LOG = Logger.getLogger(DynamoStackResourceRepository.class);
    private static final String TABLE_NAME = "idp_stack_resources";
    
    private static final String GSI_STACK_ID = "stackId-createdAt-index";
    private static final String GSI_RESOURCE_TYPE_ID = "resourceTypeId-createdAt-index";
    private static final String GSI_CLOUD_PROVIDER_ID = "cloudProviderId-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

    @Override
    public StackResource save(StackResource stackResource) {
        if (stackResource.id == null) {
            stackResource.id = UUID.randomUUID();
        }
        
        if (stackResource.getCreatedAt() == null) {
            stackResource.setCreatedAt(LocalDateTime.now());
        }
        
        stackResource.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.stackResourceToItem(stackResource);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved stack resource with id: %s", stackResource.id);
            return stackResource;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save stack resource with id: %s", stackResource.id);
            throw new RuntimeException("Failed to save stack resource", e);
        }
    }

    @Override
    public Optional<StackResource> findById(UUID id) {
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

            StackResource stackResource = entityMapper.itemToStackResource(response.item());
            return Optional.ofNullable(stackResource);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find stack resource by id: %s", id);
            throw new RuntimeException("Failed to find stack resource", e);
        }
    }

    @Override
    public List<StackResource> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<StackResource> stackResources = new ArrayList<>();
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

                List<StackResource> pageStackResources = response.items().stream()
                        .map(entityMapper::itemToStackResource)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stackResources.addAll(pageStackResources);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stack resources", stackResources.size());
            return stackResources;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all stack resources", e);
            throw new RuntimeException("Failed to find all stack resources", e);
        }
    }

    @Override
    public List<StackResource> findByStackId(UUID stackId) {
        if (stackId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_STACK_ID)
                .keyConditionExpression("stackId = :stackId")
                .expressionAttributeValues(Map.of(
                        ":stackId", AttributeValue.builder().s(stackId.toString()).build()
                ))
                .build();

        return executeQuery(request, "stackId: " + stackId);
    }

    @Override
    public List<StackResource> findByResourceTypeId(UUID resourceTypeId) {
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
    public List<StackResource> findByCloudProviderId(UUID cloudProviderId) {
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
    public List<StackResource> findByStackIdAndResourceTypeId(UUID stackId, UUID resourceTypeId) {
        if (stackId == null || resourceTypeId == null) {
            return Collections.emptyList();
        }

        // Query by stackId GSI and filter by resourceTypeId
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_STACK_ID)
                .keyConditionExpression("stackId = :stackId")
                .filterExpression("resourceTypeId = :resourceTypeId")
                .expressionAttributeValues(Map.of(
                        ":stackId", AttributeValue.builder().s(stackId.toString()).build(),
                        ":resourceTypeId", AttributeValue.builder().s(resourceTypeId.toString()).build()
                ))
                .build();

        return executeQuery(request, "stackId: " + stackId + ", resourceTypeId: " + resourceTypeId);
    }

    @Override
    public void delete(StackResource stackResource) {
        if (stackResource == null || stackResource.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(stackResource.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted stack resource with id: %s", stackResource.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete stack resource with id: %s", stackResource.id);
            throw new RuntimeException("Failed to delete stack resource", e);
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
            LOG.error("Failed to count stack resources", e);
            throw new RuntimeException("Failed to count stack resources", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Saves multiple stack resources atomically using a transaction.
     * All resources are saved or none are saved.
     * 
     * @param resources List of stack resources to save
     * @return List of saved resources with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<StackResource> saveAll(List<StackResource> resources) {
        if (resources == null || resources.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d stack resources in transaction", resources.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (StackResource resource : resources) {
            if (resource.id == null) {
                resource.id = UUID.randomUUID();
            }
            
            if (resource.getCreatedAt() == null) {
                resource.setCreatedAt(LocalDateTime.now());
            }
            
            resource.setUpdatedAt(LocalDateTime.now());
            
            Map<String, AttributeValue> item = entityMapper.stackResourceToItem(resource);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save stack resource: %s (id: %s)", resource.getName(), resource.id)
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d stack resources in transaction", resources.size());
        
        return resources;
    }
    
    /**
     * Deletes multiple stack resources atomically using a transaction.
     * All resources are deleted or none are deleted.
     * 
     * @param resources List of stack resources to delete
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public void deleteAll(List<StackResource> resources) {
        if (resources == null || resources.isEmpty()) {
            return;
        }
        
        LOG.infof("Deleting %d stack resources in transaction", resources.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (StackResource resource : resources) {
            if (resource.id != null) {
                Map<String, AttributeValue> key = Map.of(
                    "id", AttributeValue.builder().s(resource.id.toString()).build()
                );
                
                writes.add(DynamoTransactionManager.TransactionWrite.delete(
                    TABLE_NAME,
                    key,
                    String.format("Delete stack resource: %s (id: %s)", resource.getName(), resource.id)
                ));
            }
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully deleted %d stack resources in transaction", resources.size());
    }

    private List<StackResource> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<StackResource> stackResources = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<StackResource> pageStackResources = response.items().stream()
                        .map(entityMapper::itemToStackResource)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                stackResources.addAll(pageStackResources);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d stack resources for query: %s", stackResources.size(), queryDescription);
            return stackResources;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
