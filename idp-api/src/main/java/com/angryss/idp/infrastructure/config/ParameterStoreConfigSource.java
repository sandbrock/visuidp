package com.angryss.idp.infrastructure.config;

import io.smallrye.config.common.MapBackedConfigSource;
import org.eclipse.microprofile.config.spi.ConfigSource;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParametersByPathRequest;
import software.amazon.awssdk.services.ssm.model.GetParametersByPathResponse;
import software.amazon.awssdk.services.ssm.model.Parameter;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Custom ConfigSource that loads configuration from AWS Systems Manager Parameter Store.
 * This is used in Lambda deployments to centralize configuration management.
 * 
 * Parameters are loaded from a hierarchical path structure:
 * /{project}/{environment}/{category}/{parameter}
 * 
 * Example: /visuidp/dev/admin-group
 * 
 * The parameter path is converted to a property key by:
 * 1. Removing the prefix
 * 2. Replacing slashes with dots
 * 3. Converting to lowercase
 * 
 * Example: /visuidp/dev/api-key/default-expiration-days -> api-key.default-expiration-days
 */
public class ParameterStoreConfigSource extends MapBackedConfigSource {
    
    private static final Logger LOGGER = Logger.getLogger(ParameterStoreConfigSource.class.getName());
    private static final String NAME = "ParameterStoreConfigSource";
    private static final int ORDINAL = 275; // Higher than default sources (250) but lower than env vars (300)
    
    public ParameterStoreConfigSource() {
        super(NAME, loadParameters(), ORDINAL);
    }
    
    /**
     * Load parameters from Parameter Store.
     * Only loads if PARAMETER_STORE_PREFIX environment variable is set.
     */
    private static Map<String, String> loadParameters() {
        Map<String, String> properties = new HashMap<>();
        
        // Check if Parameter Store is enabled
        String prefix = System.getenv("PARAMETER_STORE_PREFIX");
        if (prefix == null || prefix.isEmpty()) {
            LOGGER.info("PARAMETER_STORE_PREFIX not set, skipping Parameter Store configuration");
            return properties;
        }
        
        String region = System.getenv("AWS_REGION");
        if (region == null || region.isEmpty()) {
            region = "us-east-1";
        }
        
        LOGGER.info("Loading configuration from Parameter Store: prefix=" + prefix + ", region=" + region);
        
        try {
            SsmClient ssmClient = SsmClient.builder()
                .region(Region.of(region))
                .build();
            
            // Load all parameters under the prefix
            String nextToken = null;
            int parameterCount = 0;
            
            do {
                GetParametersByPathRequest.Builder requestBuilder = GetParametersByPathRequest.builder()
                    .path(prefix)
                    .recursive(true)
                    .withDecryption(true); // Decrypt SecureString parameters
                
                if (nextToken != null) {
                    requestBuilder.nextToken(nextToken);
                }
                
                GetParametersByPathResponse response = ssmClient.getParametersByPath(requestBuilder.build());
                
                for (Parameter parameter : response.parameters()) {
                    String key = convertParameterNameToPropertyKey(parameter.name(), prefix);
                    String value = parameter.value();
                    properties.put(key, value);
                    parameterCount++;
                    LOGGER.fine("Loaded parameter: " + key + " = " + (isSensitive(key) ? "***" : value));
                }
                
                nextToken = response.nextToken();
            } while (nextToken != null);
            
            LOGGER.info("Loaded " + parameterCount + " parameters from Parameter Store");
            
        } catch (Exception e) {
            LOGGER.severe("Failed to load parameters from Parameter Store: " + e.getMessage());
            // Don't fail startup if Parameter Store is unavailable
            // Fall back to environment variables and other config sources
        }
        
        return properties;
    }
    
    /**
     * Convert Parameter Store parameter name to property key.
     * 
     * Example:
     * /visuidp/dev/admin-group -> admin-group
     * /visuidp/dev/api-key/default-expiration-days -> api-key.default-expiration-days
     */
    private static String convertParameterNameToPropertyKey(String parameterName, String prefix) {
        // Remove prefix
        String key = parameterName.substring(prefix.length());
        
        // Remove leading slash
        if (key.startsWith("/")) {
            key = key.substring(1);
        }
        
        // Replace slashes with dots
        key = key.replace("/", ".");
        
        // Convert to property naming convention
        // admin-group stays as admin-group
        // api-key/default-expiration-days becomes api-key.default-expiration-days
        
        return key;
    }
    
    /**
     * Check if a property key contains sensitive data.
     */
    private static boolean isSensitive(String key) {
        String lowerKey = key.toLowerCase();
        return lowerKey.contains("password") || 
               lowerKey.contains("secret") || 
               lowerKey.contains("key") ||
               lowerKey.contains("token");
    }
}
