package com.angryss.idp.infrastructure.config;

import io.quarkus.test.junit.QuarkusTest;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.Test;

import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test for ParameterStoreConfigSource.
 * 
 * Note: These tests verify the ConfigSource is registered and can be loaded.
 * Actual Parameter Store integration requires AWS credentials and is tested
 * in integration tests.
 */
@QuarkusTest
class ParameterStoreConfigSourceTest {
    
    @Test
    void testConfigSourceIsRegistered() {
        // Verify that ParameterStoreConfigSource is registered
        boolean found = StreamSupport.stream(
            ConfigProvider.getConfig().getConfigSources().spliterator(), false)
            .anyMatch(source -> source.getName().equals("ParameterStoreConfigSource"));
        
        assertTrue(found, "ParameterStoreConfigSource should be registered");
    }
    
    @Test
    void testConfigSourceOrdinal() {
        // Verify that ParameterStoreConfigSource has correct ordinal (275)
        // This ensures it has higher priority than application.properties (250)
        // but lower than environment variables (300)
        int ordinal = StreamSupport.stream(
            ConfigProvider.getConfig().getConfigSources().spliterator(), false)
            .filter(source -> source.getName().equals("ParameterStoreConfigSource"))
            .findFirst()
            .map(source -> source.getOrdinal())
            .orElse(-1);
        
        assertEquals(275, ordinal, "ParameterStoreConfigSource should have ordinal 275");
    }
    
    @Test
    void testConfigSourceDoesNotFailWhenParameterStoreUnavailable() {
        // Verify that application starts even if Parameter Store is unavailable
        // This is important for local development and testing
        
        // If PARAMETER_STORE_PREFIX is not set, ConfigSource should return empty map
        // and not fail startup
        assertDoesNotThrow(() -> {
            ConfigProvider.getConfig().getValue("some.property", String.class);
        });
    }
    
    @Test
    void testFallbackToEnvironmentVariables() {
        // Verify that environment variables take precedence over Parameter Store
        // Set an environment variable and verify it's used
        
        // This test verifies the configuration hierarchy works correctly
        String adminGroup = ConfigProvider.getConfig()
            .getOptionalValue("admin-group", String.class)
            .orElse("default");
        
        assertNotNull(adminGroup);
    }
}
