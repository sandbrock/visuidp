package com.angryss.idp.infrastructure.persistence.dynamodb;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Transaction manager for coordinating multi-item DynamoDB operations.
 * Provides transaction write capabilities using DynamoDB's TransactWriteItems API.
 * 
 * This manager supports atomic writes across multiple items and tables,
 * with automatic rollback on failure. DynamoDB transactions support up to
 * 100 items per transaction and have a 4MB size limit.
 * 
 * <h3>Usage Example:</h3>
 * <pre>{@code
 * @Inject
 * DynamoTransactionManager transactionManager;
 * 
 * // Create transaction writes
 * List<TransactionWrite> writes = new ArrayList<>();
 * 
 * // Add a put operation
 * writes.add(TransactionWrite.put(
 *     "idp_stacks",
 *     stackItem,
 *     "Create new stack"
 * ));
 * 
 * // Add an update operation
 * writes.add(TransactionWrite.update(
 *     "idp_teams",
 *     Map.of("id", AttributeValue.builder().s(teamId).build()),
 *     "SET stackCount = stackCount + :inc",
 *     null,
 *     Map.of(":inc", AttributeValue.builder().n("1").build()),
 *     "Increment team stack count"
 * ));
 * 
 * // Execute transaction
 * transactionManager.executeTransaction(writes);
 * }</pre>
 * 
 * <h3>Transaction Guarantees:</h3>
 * <ul>
 *   <li>All operations succeed or all fail (atomicity)</li>
 *   <li>Automatic rollback on any failure</li>
 *   <li>Detailed logging of transaction operations and failures</li>
 *   <li>Support for conditional writes and optimistic locking</li>
 * </ul>
 * 
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoTransactionManager {

    private static final Logger LOG = Logger.getLogger(DynamoTransactionManager.class);
    
    // DynamoDB transaction limits
    private static final int MAX_TRANSACTION_ITEMS = 100;
    private static final int MAX_TRANSACTION_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    /**
     * Represents a single transactional write operation.
     */
    public static class TransactionWrite {
        private final TransactWriteItem writeItem;
        private final String description;
        
        private TransactionWrite(TransactWriteItem writeItem, String description) {
            this.writeItem = writeItem;
            this.description = description;
        }
        
        public TransactWriteItem getWriteItem() {
            return writeItem;
        }
        
        public String getDescription() {
            return description;
        }
        
        /**
         * Creates a Put operation for the transaction.
         */
        public static TransactionWrite put(String tableName, Map<String, AttributeValue> item, String description) {
            Put put = Put.builder()
                .tableName(tableName)
                .item(item)
                .build();
            
            TransactWriteItem writeItem = TransactWriteItem.builder()
                .put(put)
                .build();
            
            return new TransactionWrite(writeItem, description);
        }
        
        /**
         * Creates a conditional Put operation for the transaction.
         */
        public static TransactionWrite putWithCondition(
                String tableName, 
                Map<String, AttributeValue> item,
                String conditionExpression,
                Map<String, String> expressionAttributeNames,
                Map<String, AttributeValue> expressionAttributeValues,
                String description) {
            
            Put.Builder putBuilder = Put.builder()
                .tableName(tableName)
                .item(item)
                .conditionExpression(conditionExpression);
            
            if (expressionAttributeNames != null && !expressionAttributeNames.isEmpty()) {
                putBuilder.expressionAttributeNames(expressionAttributeNames);
            }
            
            if (expressionAttributeValues != null && !expressionAttributeValues.isEmpty()) {
                putBuilder.expressionAttributeValues(expressionAttributeValues);
            }
            
            TransactWriteItem writeItem = TransactWriteItem.builder()
                .put(putBuilder.build())
                .build();
            
            return new TransactionWrite(writeItem, description);
        }
        
        /**
         * Creates an Update operation for the transaction.
         */
        public static TransactionWrite update(
                String tableName,
                Map<String, AttributeValue> key,
                String updateExpression,
                Map<String, String> expressionAttributeNames,
                Map<String, AttributeValue> expressionAttributeValues,
                String description) {
            
            Update.Builder updateBuilder = Update.builder()
                .tableName(tableName)
                .key(key)
                .updateExpression(updateExpression);
            
            if (expressionAttributeNames != null && !expressionAttributeNames.isEmpty()) {
                updateBuilder.expressionAttributeNames(expressionAttributeNames);
            }
            
            if (expressionAttributeValues != null && !expressionAttributeValues.isEmpty()) {
                updateBuilder.expressionAttributeValues(expressionAttributeValues);
            }
            
            TransactWriteItem writeItem = TransactWriteItem.builder()
                .update(updateBuilder.build())
                .build();
            
            return new TransactionWrite(writeItem, description);
        }
        
        /**
         * Creates a Delete operation for the transaction.
         */
        public static TransactionWrite delete(
                String tableName,
                Map<String, AttributeValue> key,
                String description) {
            
            Delete delete = Delete.builder()
                .tableName(tableName)
                .key(key)
                .build();
            
            TransactWriteItem writeItem = TransactWriteItem.builder()
                .delete(delete)
                .build();
            
            return new TransactionWrite(writeItem, description);
        }
        
        /**
         * Creates a conditional Delete operation for the transaction.
         */
        public static TransactionWrite deleteWithCondition(
                String tableName,
                Map<String, AttributeValue> key,
                String conditionExpression,
                Map<String, String> expressionAttributeNames,
                Map<String, AttributeValue> expressionAttributeValues,
                String description) {
            
            Delete.Builder deleteBuilder = Delete.builder()
                .tableName(tableName)
                .key(key)
                .conditionExpression(conditionExpression);
            
            if (expressionAttributeNames != null && !expressionAttributeNames.isEmpty()) {
                deleteBuilder.expressionAttributeNames(expressionAttributeNames);
            }
            
            if (expressionAttributeValues != null && !expressionAttributeValues.isEmpty()) {
                deleteBuilder.expressionAttributeValues(expressionAttributeValues);
            }
            
            TransactWriteItem writeItem = TransactWriteItem.builder()
                .delete(deleteBuilder.build())
                .build();
            
            return new TransactionWrite(writeItem, description);
        }
    }
    
    /**
     * Executes multiple write operations as a single atomic transaction.
     * All operations succeed or all fail together.
     * 
     * @param writes List of transaction write operations
     * @throws TransactionFailedException if the transaction fails
     * @throws IllegalArgumentException if the transaction exceeds DynamoDB limits
     */
    public void executeTransaction(List<TransactionWrite> writes) {
        if (writes == null || writes.isEmpty()) {
            LOG.debug("No writes to execute in transaction");
            return;
        }
        
        // Validate transaction size
        if (writes.size() > MAX_TRANSACTION_ITEMS) {
            throw new IllegalArgumentException(
                String.format("Transaction contains %d items, exceeding DynamoDB limit of %d items",
                    writes.size(), MAX_TRANSACTION_ITEMS)
            );
        }
        
        // Build transaction request
        List<TransactWriteItem> transactItems = new ArrayList<>();
        StringBuilder logMessage = new StringBuilder("Executing transaction with ")
            .append(writes.size())
            .append(" operations:");
        
        for (int i = 0; i < writes.size(); i++) {
            TransactionWrite write = writes.get(i);
            transactItems.add(write.getWriteItem());
            logMessage.append("\n  ").append(i + 1).append(". ").append(write.getDescription());
        }
        
        LOG.info(logMessage.toString());
        
        TransactWriteItemsRequest request = TransactWriteItemsRequest.builder()
            .transactItems(transactItems)
            .build();
        
        try {
            TransactWriteItemsResponse response = dynamoDbClient.transactWriteItems(request);
            LOG.infof("Transaction completed successfully with %d operations", writes.size());
            
        } catch (TransactionCanceledException e) {
            handleTransactionCancellation(e, writes);
        } catch (ProvisionedThroughputExceededException e) {
            LOG.error("Transaction failed: Provisioned throughput exceeded", e);
            throw new TransactionFailedException(
                "Transaction failed due to insufficient provisioned throughput. " +
                "Consider increasing table capacity or implementing retry logic.", e);
        } catch (ResourceNotFoundException e) {
            LOG.error("Transaction failed: Table not found", e);
            throw new TransactionFailedException(
                "Transaction failed because one or more tables do not exist", e);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Transaction failed with DynamoDB error: %s", e.getMessage());
            throw new TransactionFailedException(
                "Transaction failed: " + e.getMessage(), e);
        } catch (Exception e) {
            LOG.errorf(e, "Transaction failed with unexpected error: %s", e.getMessage());
            throw new TransactionFailedException(
                "Transaction failed with unexpected error: " + e.getMessage(), e);
        }
    }
    
    /**
     * Executes a transaction and returns a result from a supplier function.
     * The supplier is called after the transaction succeeds.
     * 
     * @param writes List of transaction write operations
     * @param resultSupplier Supplier function to call after successful transaction
     * @param <T> Type of result to return
     * @return Result from the supplier function
     * @throws TransactionFailedException if the transaction fails
     */
    public <T> T executeTransactionWithResult(List<TransactionWrite> writes, Supplier<T> resultSupplier) {
        executeTransaction(writes);
        return resultSupplier.get();
    }
    
    /**
     * Handles transaction cancellation by analyzing the cancellation reasons
     * and providing detailed error information.
     */
    private void handleTransactionCancellation(
            TransactionCanceledException e, 
            List<TransactionWrite> writes) {
        
        LOG.error("Transaction was cancelled by DynamoDB", e);
        
        List<CancellationReason> reasons = e.cancellationReasons();
        StringBuilder errorMessage = new StringBuilder("Transaction cancelled. Reasons:\n");
        
        boolean hasConflict = false;
        boolean hasConditionFailure = false;
        
        for (int i = 0; i < reasons.size(); i++) {
            CancellationReason reason = reasons.get(i);
            String code = reason.code();
            String message = reason.message();
            
            if (code != null && !code.equals("None")) {
                String writeDescription = i < writes.size() 
                    ? writes.get(i).getDescription() 
                    : "Unknown operation";
                
                errorMessage.append(String.format("  Operation %d (%s): %s - %s\n",
                    i + 1, writeDescription, code, message));
                
                if ("ConditionalCheckFailed".equals(code)) {
                    hasConditionFailure = true;
                } else if ("TransactionConflict".equals(code)) {
                    hasConflict = true;
                }
            }
        }
        
        // Provide specific guidance based on failure type
        if (hasConditionFailure) {
            errorMessage.append("\nOne or more conditional checks failed. ")
                .append("This typically means the data was modified by another process ")
                .append("or the expected state was not met.");
        }
        
        if (hasConflict) {
            errorMessage.append("\nTransaction conflict detected. ")
                .append("This typically means another transaction was modifying the same items. ")
                .append("Consider implementing retry logic with exponential backoff.");
        }
        
        LOG.error(errorMessage.toString());
        throw new TransactionFailedException(errorMessage.toString(), e);
    }
    
    /**
     * Exception thrown when a DynamoDB transaction fails.
     * This exception wraps the underlying DynamoDB exception and provides
     * additional context about the transaction failure.
     */
    public static class TransactionFailedException extends RuntimeException {
        public TransactionFailedException(String message) {
            super(message);
        }
        
        public TransactionFailedException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
