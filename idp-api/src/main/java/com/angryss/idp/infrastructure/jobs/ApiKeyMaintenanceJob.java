package com.angryss.idp.infrastructure.jobs;

import com.angryss.idp.application.usecases.ApiKeyService;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Scheduled job for API key maintenance tasks.
 * Handles automatic expiration of API keys and cleanup of expired keys.
 */
@ApplicationScoped
public class ApiKeyMaintenanceJob {

    @Inject
    ApiKeyService apiKeyService;

    /**
     * Processes expired API keys daily at 2:00 AM.
     * Marks expired keys as inactive and logs expiration events.
     * 
     * This job runs daily to ensure expired keys are promptly invalidated
     * and cannot be used for authentication.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void processExpiredKeys() {
        Log.info("Starting scheduled API key expiration processing");
        
        try {
            int processedCount = apiKeyService.processExpiredApiKeys();
            
            if (processedCount > 0) {
                Log.infof("Successfully processed %d expired API keys", processedCount);
            } else {
                Log.debug("No expired API keys found to process");
            }
        } catch (Exception e) {
            Log.errorf(e, "Error processing expired API keys: %s", e.getMessage());
        }
    }

    /**
     * Processes API keys past their rotation grace period hourly.
     * Revokes old keys after the grace period has elapsed following rotation.
     * 
     * This job runs hourly to ensure old keys are promptly revoked after
     * the grace period, maintaining security while allowing seamless transitions.
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void processRotationGracePeriod() {
        Log.info("Starting scheduled API key rotation grace period processing");
        
        try {
            int processedCount = apiKeyService.processRotationGracePeriod();
            
            if (processedCount > 0) {
                Log.infof("Successfully processed %d API keys past rotation grace period", processedCount);
            } else {
                Log.debug("No API keys past rotation grace period found to process");
            }
        } catch (Exception e) {
            Log.errorf(e, "Error processing rotation grace period: %s", e.getMessage());
        }
    }
}
