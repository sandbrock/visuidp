package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
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
 * DynamoDB implementation of PropertySchemaRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoPropertySchemaRepository implements PropertySchemaRepository {

    private static final Logger LOG = Logger.getLogger(DynamoPropertySchemaRepository.class);
    private static final String TABLE_NAME = "idp_property_schemas";
    
    // GSI names for query optimization
    private static final String GSI_MAPPING_ID = "mappingId-displayOrder-index";
    private static final String GSI_MAPPING_ID_REQUIRED = "mappingId-required-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public PropertySchema save(PropertySchema propertySchema) {
        if (propertySchema.id == null) {
            propertySchema.id = UUID.randomUUID();
        }
        
        if (propertySchema.createdAt == null) {
            propertySchema.createdAt = LocalDateTime.now();
        }
        
        propertySchema.updatedAt = LocalDateTime.now();

        Map<String, AttributeValue> item = entityMapper.propertySchemaToItem(propertySchema);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved property schema with id: %s", propertySchema.id);
            return propertySchema;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save property schema with id: %s", propertySchema.id);
            throw new RuntimeException("Failed to save property schema", e);
        }
    }

    @Override
    public Optional<PropertySchema> findById(UUID id) {
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

            PropertySchema propertySchema = entityMapper.itemToPropertySchema(response.item());
            return Optional.ofNullable(propertySchema);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find property schema by id: %s", id);
            throw new RuntimeException("Failed to find property schema", e);
        }
    }

    @Override
    public List<PropertySchema> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<PropertySchema> propertySchemas = new ArrayList<>();
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

                List<PropertySchema> pagePropertySchemas = response.items().stream()
                        .map(entityMapper::itemToPropertySchema)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                propertySchemas.addAll(pagePropertySchemas);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d property schemas", propertySchemas.size());
            return propertySchemas;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all property schemas", e);
            throw new RuntimeException("Failed to find all property schemas", e);
        }
    }

    @Override
    public List<PropertySchema> findByMappingId(UUID mappingId) {
        if (mappingId == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_MAPPING_ID)
                .keyConditionExpression("mappingId = :mappingId")
                .expressionAttributeValues(Map.of(
                        ":mappingId", AttributeValue.builder().s(mappingId.toString()).build()
                ))
                .build();

        return executeQuery(request, "mappingId: " + mappingId);
    }

    @Override
    public List<PropertySchema> findByMappingIdOrderByDisplayOrder(UUID mappingId) {
        // DynamoDB GSI with sort key on displayOrder will return results sorted
        return findByMappingId(mappingId);
    }

    @Override
    public List<PropertySchema> findByMappingIdAndRequired(UUID mappingId, Boolean required) {
        if (mappingId == null || required == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_MAPPING_ID_REQUIRED)
                .keyConditionExpression("mappingId = :mappingId AND required = :required")
                .expressionAttributeValues(Map.of(
                        ":mappingId", AttributeValue.builder().s(mappingId.toString()).build(),
                        ":required", AttributeValue.builder().bool(required).build()
                ))
                .build();

        return executeQuery(request, "mappingId: " + mappingId + ", required: " + required);
    }

    @Override
    public void delete(PropertySchema propertySchema) {
        if (propertySchema == null || propertySchema.id == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(propertySchema.id.toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted property schema with id: %s", propertySchema.id);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete property schema with id: %s", propertySchema.id);
            throw new RuntimeException("Failed to delete property schema", e);
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
            LOG.error("Failed to count property schemas", e);
            throw new RuntimeException("Failed to count property schemas", e);
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
     * @return list of property schemas matching the query
     */
    private List<PropertySchema> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<PropertySchema> propertySchemas = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<PropertySchema> pagePropertySchemas = response.items().stream()
                        .map(entityMapper::itemToPropertySchema)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                propertySchemas.addAll(pagePropertySchemas);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d property schemas for query: %s", propertySchemas.size(), queryDescription);
            return propertySchemas;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
