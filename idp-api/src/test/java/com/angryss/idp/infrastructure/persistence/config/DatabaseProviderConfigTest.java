package com.angryss.idp.infrastructure.persistence.config;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class DatabaseProviderConfigTest {

    @Inject
    DatabaseProviderConfig config;

    @Test
    void testDatabaseProviderIsConfigured() {
        assertNotNull(config);
        assertNotNull(config.getDatabaseProvider());
        
        // Should default to postgresql
        String provider = config.getDatabaseProvider();
        assertTrue(provider.equals("postgresql") || provider.equals("dynamodb"),
            "Database provider should be either 'postgresql' or 'dynamodb', but was: " + provider);
    }

    @Test
    void testDatabaseProviderIsNormalized() {
        // The provider should be normalized to lowercase
        String provider = config.getDatabaseProvider();
        assertEquals(provider.toLowerCase(), provider,
            "Database provider should be normalized to lowercase");
    }
}
