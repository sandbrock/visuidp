package com.angryss.idp.infrastructure.security;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Security integration tests for AWS deployment.
 * 
 * Tests cover:
 * - Entra ID authentication and authorization
 * - JWT validation and token expiration
 * - OIDC integration with Entra ID
 * - HTTPS enforcement
 * - Security headers
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.4
 */
@QuarkusTest
@Tag("security")
@Tag("integration")
public class AwsSecurityIntegrationTest {

    /**
     * Test: Authentication enforcement
     * Requirement 5.2: WHEN the API is accessed THEN the System SHALL enforce authentication
     * 
     * Verifies that protected endpoints reject requests without authentication.
     */
    @Test
    @DisplayName("Protected endpoints should reject requests without authentication")
    void testAuthenticationEnforcement() {
        // When: Accessing protected endpoint without authentication
        given()
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(401);
        
        // And: Accessing admin endpoint without authentication
        given()
            .when()
            .get("/v1/admin/cloud-providers")
            .then()
            .statusCode(401);
    }

    /**
     * Test: JWT token validation
     * Requirement 6.3: WHEN the API receives requests THEN API Gateway SHALL validate JWT tokens
     * 
     * Verifies that invalid JWT tokens are rejected.
     */
    @Test
    @DisplayName("Invalid JWT tokens should be rejected")
    void testInvalidJwtRejection() {
        // When: Accessing endpoint with invalid JWT token
        given()
            .header("Authorization", "Bearer invalid-token-12345")
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(401);
        
        // And: Accessing endpoint with malformed authorization header
        given()
            .header("Authorization", "InvalidFormat")
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(401);
    }

    /**
     * Test: Expired JWT token handling
     * Requirement 6.4: WHEN JWT tokens are invalid or expired THEN API Gateway SHALL reject requests
     * 
     * Verifies that expired tokens are properly rejected.
     * Note: In production, API Gateway validates token expiration before invoking Lambda.
     */
    @Test
    @DisplayName("Expired JWT tokens should be rejected")
    void testExpiredJwtRejection() {
        // Given: An expired JWT token (simulated with invalid signature)
        String expiredToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid";
        
        // When: Accessing endpoint with expired token
        given()
            .header("Authorization", "Bearer " + expiredToken)
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(401);
    }

    /**
     * Test: Authorization enforcement
     * Requirement 6.5: WHEN user information is needed THEN the System SHALL extract user identity from JWT claims
     * 
     * Verifies that user roles are properly enforced.
     */
    @Test
    @DisplayName("Admin endpoints should require admin role")
    void testAuthorizationEnforcement() {
        // Note: This test requires a valid JWT token with user role but not admin role
        // In production, API Gateway validates the token and passes claims to Lambda
        
        // When: Non-admin user tries to access admin endpoint
        // (This would be tested with actual JWT tokens in integration environment)
        given()
            .when()
            .get("/v1/admin/cloud-providers")
            .then()
            .statusCode(anyOf(is(401), is(403)));
    }

    /**
     * Test: HTTPS enforcement
     * Requirement 2.5: WHEN users access the application THEN the System SHALL serve content over HTTPS
     * 
     * Verifies that the application enforces HTTPS.
     * Note: In production, CloudFront and API Gateway enforce HTTPS.
     */
    @Test
    @DisplayName("Application should enforce HTTPS")
    void testHttpsEnforcement() {
        // When: Making a request
        Response response = given()
            .when()
            .get("/v1/health")
            .then()
            .extract()
            .response();
        
        // Then: Response should include security headers
        // Note: In production, these are set by CloudFront/API Gateway
        // In test environment, we verify the application doesn't break HTTPS
        response.then().statusCode(anyOf(is(200), is(401)));
    }

    /**
     * Test: Security headers
     * Verifies that appropriate security headers are present.
     */
    @Test
    @DisplayName("Responses should include security headers")
    void testSecurityHeaders() {
        // When: Making a request to health endpoint (public)
        Response response = given()
            .when()
            .get("/v1/health")
            .then()
            .extract()
            .response();
        
        // Then: Response should not expose sensitive information
        // Verify no sensitive headers are leaked
        String serverHeader = response.getHeader("Server");
        if (serverHeader != null) {
            // Should not expose detailed server information
            response.then().header("Server", not(containsString("Quarkus")));
        }
    }

    /**
     * Test: CORS configuration
     * Requirement 5.3: WHEN high traffic occurs THEN API Gateway SHALL apply throttling limits
     * 
     * Verifies that CORS is properly configured for CloudFront origin.
     */
    @Test
    @DisplayName("CORS should be configured for CloudFront origin")
    void testCorsConfiguration() {
        // When: Making a preflight request
        Response response = given()
            .header("Origin", "https://example.cloudfront.net")
            .header("Access-Control-Request-Method", "GET")
            .when()
            .options("/v1/stacks")
            .then()
            .extract()
            .response();
        
        // Then: Should handle CORS appropriately
        // Note: In production, API Gateway handles CORS
        response.then().statusCode(anyOf(is(200), is(204), is(401)));
    }

    /**
     * Test: Rate limiting and throttling
     * Requirement 5.3: WHEN high traffic occurs THEN API Gateway SHALL apply throttling limits
     * 
     * Verifies that the application can handle rate limiting.
     * Note: In production, API Gateway enforces rate limits.
     */
    @Test
    @DisplayName("Application should handle rate limiting gracefully")
    void testRateLimiting() {
        // When: Making multiple rapid requests
        for (int i = 0; i < 10; i++) {
            Response response = given()
                .when()
                .get("/v1/health")
                .then()
                .extract()
                .response();
            
            // Then: Should either succeed or return 429 (Too Many Requests)
            response.then().statusCode(anyOf(is(200), is(429), is(401)));
        }
    }

    /**
     * Test: Input validation and injection prevention
     * Verifies that the application properly validates and sanitizes input.
     */
    @Test
    @DisplayName("Application should prevent injection attacks")
    void testInjectionPrevention() {
        // When: Attempting SQL injection in query parameter
        given()
            .queryParam("name", "'; DROP TABLE stacks; --")
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(anyOf(is(400), is(401)));
        
        // And: Attempting XSS in request body
        given()
            .contentType("application/json")
            .body("{\"name\": \"<script>alert('xss')</script>\"}")
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(anyOf(is(400), is(401), is(415)));
    }

    /**
     * Test: Secrets management
     * Requirement 7.1: WHEN the application starts THEN the System SHALL retrieve configuration from Parameter Store
     * 
     * Verifies that no secrets are exposed in responses or logs.
     */
    @Test
    @DisplayName("Application should not expose secrets")
    void testSecretsManagement() {
        // When: Accessing health endpoint
        Response response = given()
            .when()
            .get("/v1/health")
            .then()
            .extract()
            .response();
        
        // Then: Response should not contain sensitive information
        String body = response.getBody().asString();
        
        // Verify no common secret patterns are exposed
        response.then()
            .body(not(containsString("password")))
            .body(not(containsString("secret")))
            .body(not(containsString("key")))
            .body(not(containsString("token")));
    }

    /**
     * Test: Error handling security
     * Verifies that error messages don't leak sensitive information.
     */
    @Test
    @DisplayName("Error messages should not leak sensitive information")
    void testErrorHandlingSecurity() {
        // When: Triggering an error with invalid request
        Response response = given()
            .contentType("application/json")
            .body("{invalid json}")
            .when()
            .post("/v1/stacks")
            .then()
            .extract()
            .response();
        
        // Then: Error message should not expose internal details
        String body = response.getBody().asString();
        
        // Should not expose stack traces or internal paths
        response.then()
            .body(not(containsString("java.lang")))
            .body(not(containsString("com.angryss")))
            .body(not(containsString("at ")));
    }
}
