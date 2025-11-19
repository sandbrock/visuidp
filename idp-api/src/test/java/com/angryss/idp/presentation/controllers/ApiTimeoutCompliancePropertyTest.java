package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.BeforeEach;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * Property-based test for API timeout compliance.
 * 
 * **Feature: aws-cost-effective-deployment, Property 1: API timeout compliance**
 * **Validates: Requirements 1.2**
 * 
 * Property: For any API endpoint, when invoked via Lambda, the response time 
 * should be less than 30 seconds (API Gateway timeout limit).
 */
@QuarkusTest
public class ApiTimeoutCompliancePropertyTest {

    private static final int API_GATEWAY_TIMEOUT_MS = 30000; // 30 seconds
    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    /**
     * List of all API endpoints to test for timeout compliance.
     * These represent the core API endpoints that will be exposed through API Gateway.
     */
    private static final List<EndpointConfig> API_ENDPOINTS = List.of(
        // Health and status endpoints
        new EndpointConfig("GET", "/v1/health", false),
        
        // Stack endpoints
        new EndpointConfig("GET", "/v1/stacks", false),
        new EndpointConfig("GET", "/v1/stacks/{id}", true),
        
        // Blueprint endpoints
        new EndpointConfig("GET", "/v1/blueprints", false),
        new EndpointConfig("GET", "/v1/blueprints/{id}", true),
        
        // Cloud provider endpoints
        new EndpointConfig("GET", "/v1/cloud-providers", false),
        new EndpointConfig("GET", "/v1/cloud-providers/{id}", true),
        
        // Resource type endpoints
        new EndpointConfig("GET", "/v1/resource-types", false),
        new EndpointConfig("GET", "/v1/resource-types/{id}", true),
        
        // Admin endpoints
        new EndpointConfig("GET", "/v1/admin/dashboard", false),
        
        // API Keys endpoints
        new EndpointConfig("GET", "/v1/api-keys", false)
    );

    @BeforeEach
    public void setup() {
        // No setup needed - testing timeout compliance only
    }

    /**
     * Property 1: API timeout compliance
     * 
     * For any API endpoint, the response time should be less than 30 seconds.
     * This ensures Lambda functions can respond within API Gateway timeout limits.
     */
    @Property(tries = 100)
    @Label("API endpoints respond within API Gateway timeout (30 seconds)")
    void apiEndpointsRespondWithinTimeout(@ForAll("apiEndpoints") EndpointConfig endpoint) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Build the request
            var request = given()
                .header("X-Forwarded-User", TEST_USER)
                .header("X-Forwarded-Email", TEST_USER)
                .header("X-Forwarded-Groups", TEST_GROUPS);
            
            // Replace path parameters with test values if needed
            String path = endpoint.path;
            if (endpoint.hasPathParam) {
                // Use a valid UUID for path parameters
                path = path.replace("{id}", UUID.randomUUID().toString());
            }
            
            // Execute the request
            Response response = request
                .when()
                .request(endpoint.method, path);
            
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;
            
            // Assert: Response time must be less than API Gateway timeout
            if (responseTime >= API_GATEWAY_TIMEOUT_MS) {
                throw new AssertionError(
                    String.format(
                        "API endpoint %s %s exceeded timeout: %dms >= %dms",
                        endpoint.method, endpoint.path, responseTime, API_GATEWAY_TIMEOUT_MS
                    )
                );
            }
            
            // Log successful response time for monitoring
            System.out.printf("✓ %s %s responded in %dms (status: %d)%n", 
                endpoint.method, endpoint.path, responseTime, response.getStatusCode());
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;
            
            // If exception occurred after timeout, fail the test
            if (responseTime >= API_GATEWAY_TIMEOUT_MS) {
                throw new AssertionError(
                    String.format(
                        "API endpoint %s %s timed out: %dms >= %dms (exception: %s)",
                        endpoint.method, endpoint.path, responseTime, API_GATEWAY_TIMEOUT_MS, 
                        e.getMessage()
                    )
                );
            }
            
            // If exception occurred before timeout, it's a different issue (not timeout related)
            // We still want to know about it, but it's not a timeout violation
            System.err.printf("⚠ %s %s failed with exception (not timeout): %s%n", 
                endpoint.method, endpoint.path, e.getMessage());
        }
    }

    /**
     * Property 2: API endpoints with query parameters respond within timeout
     * 
     * Tests that endpoints with various query parameters still respond within timeout.
     */
    @Property(tries = 50)
    @Label("API endpoints with query parameters respond within timeout")
    void apiEndpointsWithQueryParamsRespondWithinTimeout(
        @ForAll("apiEndpoints") EndpointConfig endpoint,
        @ForAll @IntRange(min = 1, max = 100) int pageSize,
        @ForAll @IntRange(min = 0, max = 10) int pageNumber
    ) {
        // Only test endpoints that support pagination
        if (!endpoint.path.contains("stacks") && 
            !endpoint.path.contains("blueprints") && 
            !endpoint.path.contains("cloud-providers")) {
            return; // Skip non-paginated endpoints
        }
        
        long startTime = System.currentTimeMillis();
        
        try {
            // Build the request with query parameters
            var request = given()
                .header("X-Forwarded-User", TEST_USER)
                .header("X-Forwarded-Email", TEST_USER)
                .header("X-Forwarded-Groups", TEST_GROUPS)
                .queryParam("page", pageNumber)
                .queryParam("size", pageSize);
            
            String path = endpoint.path;
            if (endpoint.hasPathParam) {
                path = path.replace("{id}", UUID.randomUUID().toString());
            }
            
            // Execute the request
            Response response = request
                .when()
                .request(endpoint.method, path);
            
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;
            
            // Assert: Response time must be less than API Gateway timeout
            if (responseTime >= API_GATEWAY_TIMEOUT_MS) {
                throw new AssertionError(
                    String.format(
                        "API endpoint %s %s with params (page=%d, size=%d) exceeded timeout: %dms >= %dms",
                        endpoint.method, endpoint.path, pageNumber, pageSize, 
                        responseTime, API_GATEWAY_TIMEOUT_MS
                    )
                );
            }
            
        } catch (Exception e) {
            long endTime = System.currentTimeMillis();
            long responseTime = endTime - startTime;
            
            if (responseTime >= API_GATEWAY_TIMEOUT_MS) {
                throw new AssertionError(
                    String.format(
                        "API endpoint %s %s with params timed out: %dms >= %dms",
                        endpoint.method, endpoint.path, responseTime, API_GATEWAY_TIMEOUT_MS
                    )
                );
            }
        }
    }

    /**
     * Arbitrary provider for API endpoints.
     */
    @Provide
    Arbitrary<EndpointConfig> apiEndpoints() {
        return Arbitraries.of(API_ENDPOINTS);
    }

    /**
     * Configuration for an API endpoint to test.
     */
    private static class EndpointConfig {
        final String method;
        final String path;
        final boolean hasPathParam;

        EndpointConfig(String method, String path, boolean hasPathParam) {
            this.method = method;
            this.path = path;
            this.hasPathParam = hasPathParam;
        }

        @Override
        public String toString() {
            return method + " " + path;
        }
    }
}
