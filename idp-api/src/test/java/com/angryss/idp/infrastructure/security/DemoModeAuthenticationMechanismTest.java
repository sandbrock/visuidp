package com.angryss.idp.infrastructure.security;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for DemoModeAuthenticationMechanism.
 * Tests the demo mode authentication flow including:
 * - Authentication bypass when demo mode is enabled
 * - Demo user identity creation
 * - Role assignment (user and admin)
 * - Fallback to other mechanisms when demo mode is disabled
 * 
 * Validates Requirement 14.1:
 * "WHEN demo mode is enabled THEN the System SHALL bypass Entra ID authentication 
 * and use a demo user identity"
 */
@QuarkusTest
@TestProfile(DemoModeAuthenticationMechanismTest.DemoModeProfile.class)
public class DemoModeAuthenticationMechanismTest {

    /**
     * Test profile that enables demo mode
     */
    public static class DemoModeProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                "idp.demo.enabled", "true",
                "idp.demo.user.name", "demo",
                "idp.demo.user.email", "demo@visuidp.example",
                "idp.demo.user.display-name", "Demo User"
            );
        }
    }

    @Test
    public void testDemoMode_BypassesAuthentication() {
        // When - Make request without any authentication headers
        // Demo mode should automatically authenticate
        given()
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));
    }

    @Test
    public void testDemoMode_HasUserRole() {
        // When - Make request to user endpoint
        // Demo user should have user role
        given()
            .when().get("/v1/stacks")
            .then()
                .statusCode(200);
    }

    @Test
    public void testDemoMode_HasAdminRole() {
        // When - Make request to admin endpoint
        // Demo user should have admin role
        given()
            .when().get("/v1/admin/cloud-providers")
            .then()
                .statusCode(200);
    }

    @Test
    public void testDemoMode_WorksWithoutAuthorizationHeader() {
        // When - Make request without Authorization header
        given()
            .when().get("/v1/teams")
            .then()
                .statusCode(200);
    }

    @Test
    public void testDemoMode_WorksWithoutOAuth2Headers() {
        // When - Make request without OAuth2 headers
        given()
            .when().get("/v1/blueprints")
            .then()
                .statusCode(200);
    }
}

/**
 * Tests for demo mode disabled (default behavior)
 */
@QuarkusTest
class DemoModeDisabledTest {

    @Test
    public void testDemoModeDisabled_RequiresAuthentication() {
        // When - Make request without authentication and demo mode disabled
        // Should return 401 Unauthorized
        given()
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    public void testDemoModeDisabled_FallsBackToOAuth2() {
        // When - Make request with OAuth2 headers and demo mode disabled
        // Should authenticate via TraefikAuthenticationMechanism
        given()
            .header("X-Auth-Request-Email", "user@example.com")
            .header("X-Auth-Request-Groups", "Users")
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));
    }
}
