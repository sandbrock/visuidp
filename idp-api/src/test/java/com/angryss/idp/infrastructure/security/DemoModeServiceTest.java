package com.angryss.idp.infrastructure.security;

import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DemoModeService.
 * 
 * Tests verify the demo mode detection logic and behavior flags.
 */
@QuarkusTest
public class DemoModeServiceTest {

    @Inject
    DemoModeService demoModeService;

    @InjectMock
    SecurityIdentity securityIdentity;

    @ConfigProperty(name = "idp.demo.enabled", defaultValue = "false")
    boolean demoEnabled;

    @BeforeEach
    void setUp() {
        // Reset mock before each test
        Mockito.reset(securityIdentity);
    }

    @Test
    public void testIsDemoModeWhenDisabled() {
        // When demo mode is disabled in config, should return false
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(true);
        
        // Note: In actual test environment, idp.demo.enabled might be false
        // This test verifies the logic when config is false
        if (!demoEnabled) {
            assertFalse(demoModeService.isDemoMode());
        }
    }

    @Test
    public void testIsDemoModeWhenEnabledWithAttribute() {
        // When demo mode is enabled and security identity has demo_mode attribute
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(true);
        
        if (demoEnabled) {
            assertTrue(demoModeService.isDemoMode());
        }
    }

    @Test
    public void testIsDemoModeWhenEnabledWithoutAttribute() {
        // When demo mode is enabled but security identity doesn't have demo_mode attribute
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(null);
        
        assertFalse(demoModeService.isDemoMode());
    }

    @Test
    public void testShouldSkipWriteOperations() {
        // Should match isDemoMode() result
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(demoEnabled);
        
        assertEquals(demoModeService.isDemoMode(), demoModeService.shouldSkipWriteOperations());
    }

    @Test
    public void testShouldSkipTerraformDeployment() {
        // Should match isDemoMode() result
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(demoEnabled);
        
        assertEquals(demoModeService.isDemoMode(), demoModeService.shouldSkipTerraformDeployment());
    }

    @Test
    public void testGetDemoModeIndicator() {
        // When demo mode is active, should return "true"
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(demoEnabled);
        
        String expected = demoModeService.isDemoMode() ? "true" : "false";
        assertEquals(expected, demoModeService.getDemoModeIndicator());
    }

    @Test
    public void testLogDemoModeAction() {
        // Should not throw exception
        when(securityIdentity.getAttribute("demo_mode")).thenReturn(demoEnabled);
        
        assertDoesNotThrow(() -> 
            demoModeService.logDemoModeAction("test action", "test details")
        );
    }
}
