package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.repositories.AdminAuditLogRepository;
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
 * DynamoDB implementation of AdminAuditLogRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@Named("dynamodb")
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoAdminAuditLogRepository implements AdminAuditLogRepository {

    private static final Logger LOG = Logger.getLogger(DynamoAdminAuditLogRepository.class);
    private static final String TABLE_NAME = "idp_admin_audit_logs";
    
    // GSI names for query optimization
    private static final String GSI_USER_EMAIL = "userEmail-timestamp-index";
    private static final String GSI_ENTITY_TYPE = "entityType-timestamp-index";
    private static final String GSI_ACTION = "action-timestamp-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;

    @Override
    public AdminAuditLog save(AdminAuditLog adminAuditLog) {
        if (adminAuditLog.getId() == null) {
            adminAuditLog.setId(UUID.randomUUID());
        }
        
        if (adminAuditLog.getTimestamp() == null) {
            adminAuditLog.setTimestamp(LocalDateTime.now());
        }

        Map<String, AttributeValue> item = entityMapper.adminAuditLogToItem(adminAuditLog);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved admin audit log with id: %s", adminAuditLog.getId());
            return adminAuditLog;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save admin audit log with id: %s", adminAuditLog.getId());
            throw new RuntimeException("Failed to save admin audit log", e);
        }
    }

    @Override
    public Optional<AdminAuditLog> findById(UUID id) {
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

            AdminAuditLog adminAuditLog = entityMapper.itemToAdminAuditLog(response.item());
            return Optional.ofNullable(adminAuditLog);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find admin audit log by id: %s", id);
            throw new RuntimeException("Failed to find admin audit log", e);
        }
    }

    @Override
    public List<AdminAuditLog> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<AdminAuditLog> adminAuditLogs = new ArrayList<>();
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

                List<AdminAuditLog> pageAdminAuditLogs = response.items().stream()
                        .map(entityMapper::itemToAdminAuditLog)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                adminAuditLogs.addAll(pageAdminAuditLogs);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d admin audit logs", adminAuditLogs.size());
            return adminAuditLogs;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all admin audit logs", e);
            throw new RuntimeException("Failed to find all admin audit logs", e);
        }
    }

    @Override
    public List<AdminAuditLog> findByUserEmail(String userEmail) {
        if (userEmail == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_USER_EMAIL)
                .keyConditionExpression("userEmail = :userEmail")
                .expressionAttributeValues(Map.of(
                        ":userEmail", AttributeValue.builder().s(userEmail).build()
                ))
                .build();

        return executeQuery(request, "userEmail: " + userEmail);
    }

    @Override
    public List<AdminAuditLog> findByEntityType(String entityType) {
        if (entityType == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_ENTITY_TYPE)
                .keyConditionExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                        ":entityType", AttributeValue.builder().s(entityType).build()
                ))
                .build();

        return executeQuery(request, "entityType: " + entityType);
    }

    @Override
    public List<AdminAuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId) {
        if (entityType == null || entityId == null) {
            return Collections.emptyList();
        }

        // Query by entityType GSI and filter by entityId
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_ENTITY_TYPE)
                .keyConditionExpression("entityType = :entityType")
                .filterExpression("entityId = :entityId")
                .expressionAttributeValues(Map.of(
                        ":entityType", AttributeValue.builder().s(entityType).build(),
                        ":entityId", AttributeValue.builder().s(entityId.toString()).build()
                ))
                .build();

        return executeQuery(request, "entityType: " + entityType + ", entityId: " + entityId);
    }

    @Override
    public List<AdminAuditLog> findByAction(String action) {
        if (action == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_ACTION)
                .keyConditionExpression("action = :action")
                .expressionAttributeValues(Map.of(
                        ":action", AttributeValue.builder().s(action).build()
                ))
                .build();

        return executeQuery(request, "action: " + action);
    }

    @Override
    public List<AdminAuditLog> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            return Collections.emptyList();
        }

        // Use scan with filter expression for time range queries
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("#timestamp BETWEEN :startTime AND :endTime")
                .expressionAttributeNames(Map.of("#timestamp", "timestamp"))
                .expressionAttributeValues(Map.of(
                        ":startTime", AttributeValue.builder().s(startTime.toString()).build(),
                        ":endTime", AttributeValue.builder().s(endTime.toString()).build()
                ))
                .build();

        try {
            List<AdminAuditLog> adminAuditLogs = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = ScanRequest.builder()
                            .tableName(TABLE_NAME)
                            .filterExpression("#timestamp BETWEEN :startTime AND :endTime")
                            .expressionAttributeNames(Map.of("#timestamp", "timestamp"))
                            .expressionAttributeValues(Map.of(
                                    ":startTime", AttributeValue.builder().s(startTime.toString()).build(),
                                    ":endTime", AttributeValue.builder().s(endTime.toString()).build()
                            ))
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.scan(request);

                List<AdminAuditLog> pageAdminAuditLogs = response.items().stream()
                        .map(entityMapper::itemToAdminAuditLog)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                adminAuditLogs.addAll(pageAdminAuditLogs);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d admin audit logs between %s and %s", adminAuditLogs.size(), startTime, endTime);
            return adminAuditLogs;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find admin audit logs between %s and %s", startTime, endTime);
            throw new RuntimeException("Failed to find admin audit logs by timestamp range", e);
        }
    }

    @Override
    public List<AdminAuditLog> findByUserEmailAndTimestampBetween(String userEmail, LocalDateTime startTime, LocalDateTime endTime) {
        if (userEmail == null || startTime == null || endTime == null) {
            return Collections.emptyList();
        }

        // Query by userEmail GSI with timestamp range
        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_USER_EMAIL)
                .keyConditionExpression("userEmail = :userEmail AND #timestamp BETWEEN :startTime AND :endTime")
                .expressionAttributeNames(Map.of("#timestamp", "timestamp"))
                .expressionAttributeValues(Map.of(
                        ":userEmail", AttributeValue.builder().s(userEmail).build(),
                        ":startTime", AttributeValue.builder().s(startTime.toString()).build(),
                        ":endTime", AttributeValue.builder().s(endTime.toString()).build()
                ))
                .build();

        return executeQuery(request, "userEmail: " + userEmail + ", timestamp between: " + startTime + " and " + endTime);
    }

    @Override
    public void delete(AdminAuditLog adminAuditLog) {
        if (adminAuditLog == null || adminAuditLog.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(adminAuditLog.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted admin audit log with id: %s", adminAuditLog.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete admin audit log with id: %s", adminAuditLog.getId());
            throw new RuntimeException("Failed to delete admin audit log", e);
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
            LOG.error("Failed to count admin audit logs", e);
            throw new RuntimeException("Failed to count admin audit logs", e);
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
     * @return list of admin audit logs matching the query
     */
    private List<AdminAuditLog> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<AdminAuditLog> adminAuditLogs = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<AdminAuditLog> pageAdminAuditLogs = response.items().stream()
                        .map(entityMapper::itemToAdminAuditLog)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                adminAuditLogs.addAll(pageAdminAuditLogs);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d admin audit logs for query: %s", adminAuditLogs.size(), queryDescription);
            return adminAuditLogs;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
