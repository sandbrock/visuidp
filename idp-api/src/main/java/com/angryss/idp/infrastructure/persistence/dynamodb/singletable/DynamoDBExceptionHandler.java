package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.Duration;
import java.util.function.Supplier;

/**
 * Handles DynamoDB exceptions with retry logic and exponential backoff.
 * Implements best practices for handling transient failures and throttling.
 */
@ApplicationScoped
public class DynamoDBExceptionHandler {
    
    private static final Logger LOG = Logger.getLogger(DynamoDBExceptionHandler.class);
    
    // Retry configuration
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 100;
    private static final double BACKOFF_MULTIPLIER = 2.0;
    private static final long MAX_BACKOFF_MS = 5000;
    
    /**
     * Executes a DynamoDB operation with retry logic and exponential backoff.
     * Retries on throttling and transient errors.
     *
     * @param operation the operation to execute
     * @param operationName name of the operation for logging
     * @param <T> the return type
     * @return the result of the operation
     * @throws DynamoDBPersistenceException if all retries are exhausted
     */
    public <T> T executeWithRetry(Supplier<T> operation, String operationName) {
        int attempt = 0;
        long backoffMs = INITIAL_BACKOFF_MS;
        
        while (true) {
            try {
                return operation.get();
            } catch (ProvisionedThroughputExceededException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    LOG.errorf("Throttling exception after %d retries for operation: %s", MAX_RETRIES, operationName);
                    throw new DynamoDBPersistenceException("DynamoDB throttling - max retries exceeded", e);
                }
                
                LOG.warnf("Throttling exception on attempt %d for operation: %s. Retrying after %d ms", 
                    attempt, operationName, backoffMs);
                sleep(backoffMs);
                backoffMs = Math.min((long) (backoffMs * BACKOFF_MULTIPLIER), MAX_BACKOFF_MS);
                
            } catch (ResourceNotFoundException e) {
                LOG.errorf(e, "Resource not found for operation: %s", operationName);
                throw new DynamoDBPersistenceException("DynamoDB resource not found", e);
                
            } catch (ConditionalCheckFailedException e) {
                LOG.warnf("Conditional check failed for operation: %s", operationName);
                throw new DynamoDBPersistenceException("Conditional check failed - item may have been modified", e);
                
            } catch (ItemCollectionSizeLimitExceededException e) {
                LOG.errorf(e, "Item collection size limit exceeded for operation: %s", operationName);
                throw new DynamoDBPersistenceException("Item collection size limit exceeded", e);
                
            } catch (RequestLimitExceededException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    LOG.errorf("Request limit exceeded after %d retries for operation: %s", MAX_RETRIES, operationName);
                    throw new DynamoDBPersistenceException("DynamoDB request limit exceeded - max retries exceeded", e);
                }
                
                LOG.warnf("Request limit exceeded on attempt %d for operation: %s. Retrying after %d ms", 
                    attempt, operationName, backoffMs);
                sleep(backoffMs);
                backoffMs = Math.min((long) (backoffMs * BACKOFF_MULTIPLIER), MAX_BACKOFF_MS);
                
            } catch (InternalServerErrorException e) {
                attempt++;
                if (attempt > MAX_RETRIES) {
                    LOG.errorf("Internal server error after %d retries for operation: %s", MAX_RETRIES, operationName);
                    throw new DynamoDBPersistenceException("DynamoDB internal server error - max retries exceeded", e);
                }
                
                LOG.warnf("Internal server error on attempt %d for operation: %s. Retrying after %d ms", 
                    attempt, operationName, backoffMs);
                sleep(backoffMs);
                backoffMs = Math.min((long) (backoffMs * BACKOFF_MULTIPLIER), MAX_BACKOFF_MS);
                
            } catch (DynamoDbException e) {
                LOG.errorf(e, "DynamoDB exception for operation: %s", operationName);
                throw new DynamoDBPersistenceException("DynamoDB operation failed", e);
                
            } catch (Exception e) {
                LOG.errorf(e, "Unexpected exception for operation: %s", operationName);
                throw new DynamoDBPersistenceException("Unexpected error during DynamoDB operation", e);
            }
        }
    }
    
    /**
     * Executes a void DynamoDB operation with retry logic.
     *
     * @param operation the operation to execute
     * @param operationName name of the operation for logging
     * @throws DynamoDBPersistenceException if all retries are exhausted
     */
    public void executeWithRetryVoid(Runnable operation, String operationName) {
        executeWithRetry(() -> {
            operation.run();
            return null;
        }, operationName);
    }
    
    /**
     * Checks if an exception is retryable.
     *
     * @param e the exception to check
     * @return true if the exception is retryable
     */
    public boolean isRetryable(Exception e) {
        return e instanceof ProvisionedThroughputExceededException
            || e instanceof RequestLimitExceededException
            || e instanceof InternalServerErrorException;
    }
    
    /**
     * Gets the appropriate error message for a DynamoDB exception.
     *
     * @param e the exception
     * @return user-friendly error message
     */
    public String getErrorMessage(DynamoDbException e) {
        if (e instanceof ProvisionedThroughputExceededException) {
            return "Database is currently experiencing high load. Please try again.";
        } else if (e instanceof ResourceNotFoundException) {
            return "The requested resource was not found.";
        } else if (e instanceof ConditionalCheckFailedException) {
            return "The item has been modified by another process. Please refresh and try again.";
        } else if (e instanceof ItemCollectionSizeLimitExceededException) {
            return "The item collection has exceeded its size limit.";
        } else if (e instanceof RequestLimitExceededException) {
            return "Too many requests. Please try again later.";
        } else if (e instanceof InternalServerErrorException) {
            return "An internal error occurred. Please try again.";
        } else {
            return "A database error occurred. Please try again.";
        }
    }
    
    /**
     * Sleeps for the specified duration, handling interruptions.
     *
     * @param milliseconds the duration to sleep
     */
    private void sleep(long milliseconds) {
        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DynamoDBPersistenceException("Operation interrupted during retry backoff", e);
        }
    }
    
    /**
     * Custom exception for DynamoDB persistence errors.
     */
    public static class DynamoDBPersistenceException extends RuntimeException {
        public DynamoDBPersistenceException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
