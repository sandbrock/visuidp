package com.angryss.idp.infrastructure.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

/**
 * Application configuration loaded from Parameter Store and environment variables.
 * 
 * Configuration sources (in order of precedence):
 * 1. Environment variables (highest priority)
 * 2. Parameter Store (if PARAMETER_STORE_PREFIX is set)
 * 3. application.properties (lowest priority)
 * 
 * Parameter Store parameters are automatically mapped to configuration properties.
 * For example, parameter /visuidp/dev/admin-group maps to property "admin-group".
 */
@ConfigMapping(prefix = "")
public interface ApplicationConfig {
    
    /**
     * Admin group configuration.
     */
    @WithDefault("admin")
    String adminGroup();
    
    /**
     * API key configuration.
     */
    ApiKeyConfig apiKey();
    
    interface ApiKeyConfig {
        @WithDefault("90")
        int defaultExpirationDays();
        
        @WithDefault("24")
        int rotationGracePeriodHours();
        
        @WithDefault("10")
        int maxKeysPerUser();
        
        @WithDefault("12")
        int bcryptCostFactor();
        
        @WithDefault("32")
        int keyLength();
    }
    
    /**
     * DynamoDB configuration.
     */
    DynamoDbConfig dynamodb();
    
    interface DynamoDbConfig {
        String tableName();
        
        @WithDefault("us-east-1")
        String region();
    }
    
    /**
     * Entra ID configuration.
     */
    EntraIdConfig entraId();
    
    interface EntraIdConfig {
        String tenantId();
        String clientId();
        String issuerUrl();
    }
    
    /**
     * Demo mode configuration.
     */
    DemoModeConfig demoMode();
    
    interface DemoModeConfig {
        @WithDefault("false")
        boolean enabled();
    }
    
    /**
     * Logging configuration.
     */
    LoggingConfig logging();
    
    interface LoggingConfig {
        @WithDefault("ERROR")
        String level();
    }
}
