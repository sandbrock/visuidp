package com.angryss.idp.infrastructure.security;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Service for handling demo mode logic across the application.
 * 
 * This service provides centralized demo mode detection and behavior
 * to support Requirement 14.3 and 14.4:
 * - 14.3: Terraform generation works without actual deployment
 * - 14.4: Write operations skip persistence in demo mode
 * 
 * Demo mode allows hackathon judges to explore the application without
 * persisting changes or deploying actual infrastructure.
 */
@ApplicationScoped
public class DemoModeService {

    @ConfigProperty(name = "idp.demo.enabled", defaultValue = "false")
    boolean demoEnabled;

    @Inject
    SecurityIdentity securityIdentity;

    /**
     * Check if demo mode is currently active.
     * 
     * Demo mode is active when:
     * 1. The configuration property idp.demo.enabled is true, AND
     * 2. The current security identity has the demo_mode attribute set to true
     * 
     * @return true if demo mode is active, false otherwise
     */
    public boolean isDemoMode() {
        if (!demoEnabled) {
            return false;
        }

        // Check if the security identity has the demo_mode attribute
        Object demoModeAttr = securityIdentity.getAttribute("demo_mode");
        return demoModeAttr != null && (Boolean) demoModeAttr;
    }

    /**
     * Check if write operations should be skipped in demo mode.
     * 
     * In demo mode, write operations (create, update, delete) should not
     * persist to the database to maintain the demo data integrity.
     * 
     * @return true if write operations should be skipped, false otherwise
     */
    public boolean shouldSkipWriteOperations() {
        return isDemoMode();
    }

    /**
     * Check if Terraform deployment should be skipped in demo mode.
     * 
     * In demo mode, Terraform code generation should work, but actual
     * deployment to cloud providers should be skipped.
     * 
     * @return true if deployment should be skipped, false otherwise
     */
    public boolean shouldSkipTerraformDeployment() {
        return isDemoMode();
    }

    /**
     * Get the demo mode indicator for API responses.
     * 
     * This can be used to add a demo mode indicator to API responses
     * so the UI can display appropriate messaging.
     * 
     * @return "true" if demo mode is active, "false" otherwise
     */
    public String getDemoModeIndicator() {
        return isDemoMode() ? "true" : "false";
    }

    /**
     * Log a demo mode action.
     * 
     * This method logs actions that would normally modify data but are
     * skipped in demo mode, helping with debugging and monitoring.
     * 
     * @param action The action that was skipped (e.g., "create stack", "delete blueprint")
     * @param details Additional details about the action
     */
    public void logDemoModeAction(String action, String details) {
        if (isDemoMode()) {
            System.out.println("[DEMO MODE] Skipped action: " + action + " - " + details);
        }
    }
}
