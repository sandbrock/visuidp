package com.angryss.idp.infrastructure.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.*;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for Parameter Store configuration.
 * 
 * This test requires:
 * - AWS credentials configured (via environment variables or IAM role)
 * - PARAMETER_STORE_PREFIX environment variable set
 * - AWS_REGION environment variable set
 * 
 * Run with:
 * export AWS_REGION=us-east-1
 * export PARAMETER_STORE_PREFIX=/visuidp/test
 * mvn test -Dtest=ParameterStoreIntegrationTest
 */
@EnabledIfEnvironmentVariable(named = "PARAMETER_STORE_PREFIX", matches = ".+")
class ParameterStoreIntegrationTest {
    
    @Test
    void testCreateAndRetrieveParameter() {
        String prefix = System.getenv("PARAMETER_STORE_PREFIX");
        String region = System.getenv("AWS_REGION");
        
        assertNotNull(prefix, "PARAMETER_STORE_PREFIX must be set");
        assertNotNull(region, "AWS_REGION must be set");
        
        SsmClient ssmClient = SsmClient.builder()
            .region(Region.of(region))
            .build();
        
        // Create a test parameter
        String parameterName = prefix + "/test-parameter";
        String parameterValue = "test-value-" + System.currentTimeMillis();
        
        try {
            // Put parameter
            PutParameterRequest putRequest = PutParameterRequest.builder()
                .name(parameterName)
                .value(parameterValue)
                .type(ParameterType.STRING)
                .overwrite(true)
                .description("Test parameter for integration test")
                .build();
            
            ssmClient.putParameter(putRequest);
            
            // Get parameter
            GetParameterRequest getRequest = GetParameterRequest.builder()
                .name(parameterName)
                .build();
            
            GetParameterResponse response = ssmClient.getParameter(getRequest);
            
            assertEquals(parameterValue, response.parameter().value());
            assertEquals(ParameterType.STRING, response.parameter().type());
            
        } finally {
            // Clean up
            try {
                DeleteParameterRequest deleteRequest = DeleteParameterRequest.builder()
                    .name(parameterName)
                    .build();
                ssmClient.deleteParameter(deleteRequest);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
    }
    
    @Test
    void testGetParametersByPath() {
        String prefix = System.getenv("PARAMETER_STORE_PREFIX");
        String region = System.getenv("AWS_REGION");
        
        assertNotNull(prefix, "PARAMETER_STORE_PREFIX must be set");
        assertNotNull(region, "AWS_REGION must be set");
        
        SsmClient ssmClient = SsmClient.builder()
            .region(Region.of(region))
            .build();
        
        // Create multiple test parameters
        Map<String, String> testParameters = new HashMap<>();
        testParameters.put(prefix + "/test/param1", "value1");
        testParameters.put(prefix + "/test/param2", "value2");
        testParameters.put(prefix + "/test/nested/param3", "value3");
        
        try {
            // Put parameters
            for (Map.Entry<String, String> entry : testParameters.entrySet()) {
                PutParameterRequest putRequest = PutParameterRequest.builder()
                    .name(entry.getKey())
                    .value(entry.getValue())
                    .type(ParameterType.STRING)
                    .overwrite(true)
                    .build();
                ssmClient.putParameter(putRequest);
            }
            
            // Get parameters by path
            GetParametersByPathRequest getRequest = GetParametersByPathRequest.builder()
                .path(prefix + "/test")
                .recursive(true)
                .build();
            
            GetParametersByPathResponse response = ssmClient.getParametersByPath(getRequest);
            
            assertTrue(response.parameters().size() >= 3, 
                "Should retrieve at least 3 parameters");
            
            // Verify parameter values
            Map<String, String> retrievedParams = new HashMap<>();
            for (Parameter param : response.parameters()) {
                retrievedParams.put(param.name(), param.value());
            }
            
            for (Map.Entry<String, String> entry : testParameters.entrySet()) {
                assertEquals(entry.getValue(), retrievedParams.get(entry.getKey()),
                    "Parameter value should match: " + entry.getKey());
            }
            
        } finally {
            // Clean up
            for (String paramName : testParameters.keySet()) {
                try {
                    DeleteParameterRequest deleteRequest = DeleteParameterRequest.builder()
                        .name(paramName)
                        .build();
                    ssmClient.deleteParameter(deleteRequest);
                } catch (Exception e) {
                    // Ignore cleanup errors
                }
            }
        }
    }
    
    @Test
    void testSecureStringParameter() {
        String prefix = System.getenv("PARAMETER_STORE_PREFIX");
        String region = System.getenv("AWS_REGION");
        
        assertNotNull(prefix, "PARAMETER_STORE_PREFIX must be set");
        assertNotNull(region, "AWS_REGION must be set");
        
        SsmClient ssmClient = SsmClient.builder()
            .region(Region.of(region))
            .build();
        
        String parameterName = prefix + "/test-secure-parameter";
        String parameterValue = "secure-value-" + System.currentTimeMillis();
        
        try {
            // Put secure parameter
            PutParameterRequest putRequest = PutParameterRequest.builder()
                .name(parameterName)
                .value(parameterValue)
                .type(ParameterType.SECURE_STRING)
                .overwrite(true)
                .description("Test secure parameter")
                .build();
            
            ssmClient.putParameter(putRequest);
            
            // Get parameter with decryption
            GetParameterRequest getRequest = GetParameterRequest.builder()
                .name(parameterName)
                .withDecryption(true)
                .build();
            
            GetParameterResponse response = ssmClient.getParameter(getRequest);
            
            assertEquals(parameterValue, response.parameter().value());
            assertEquals(ParameterType.SECURE_STRING, response.parameter().type());
            
        } finally {
            // Clean up
            try {
                DeleteParameterRequest deleteRequest = DeleteParameterRequest.builder()
                    .name(parameterName)
                    .build();
                ssmClient.deleteParameter(deleteRequest);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
    }
    
    @Test
    void testParameterVersioning() {
        String prefix = System.getenv("PARAMETER_STORE_PREFIX");
        String region = System.getenv("AWS_REGION");
        
        assertNotNull(prefix, "PARAMETER_STORE_PREFIX must be set");
        assertNotNull(region, "AWS_REGION must be set");
        
        SsmClient ssmClient = SsmClient.builder()
            .region(Region.of(region))
            .build();
        
        String parameterName = prefix + "/test-versioned-parameter";
        
        try {
            // Create initial version
            PutParameterRequest putRequest1 = PutParameterRequest.builder()
                .name(parameterName)
                .value("version1")
                .type(ParameterType.STRING)
                .overwrite(false)
                .build();
            
            PutParameterResponse response1 = ssmClient.putParameter(putRequest1);
            long version1 = response1.version();
            
            // Update to version 2
            PutParameterRequest putRequest2 = PutParameterRequest.builder()
                .name(parameterName)
                .value("version2")
                .type(ParameterType.STRING)
                .overwrite(true)
                .build();
            
            PutParameterResponse response2 = ssmClient.putParameter(putRequest2);
            long version2 = response2.version();
            
            assertTrue(version2 > version1, "Version should increment");
            
            // Get latest version
            GetParameterRequest getRequest = GetParameterRequest.builder()
                .name(parameterName)
                .build();
            
            GetParameterResponse getResponse = ssmClient.getParameter(getRequest);
            assertEquals("version2", getResponse.parameter().value());
            assertEquals(version2, getResponse.parameter().version());
            
        } finally {
            // Clean up
            try {
                DeleteParameterRequest deleteRequest = DeleteParameterRequest.builder()
                    .name(parameterName)
                    .build();
                ssmClient.deleteParameter(deleteRequest);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
    }
}
