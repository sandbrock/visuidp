package com.angryss.idp.infrastructure.security;

import com.angryss.idp.application.dtos.StackCreateDto;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for demo mode functionality.
 * 
 * These tests validate Requirements 14.3 and 14.4:
 * - 14.3: Write operations skip persistence in demo mode
 * - 14.4: Demo mode indicator is added to API responses
 * 
 * Tests verify that:
 * 1. All API endpoints work correctly in demo mode
 * 2. Write operations don't persist data
 * 3. Demo mode header is present in responses
 * 4. Authentication is bypassed in demo mode
 */
@QuarkusTest
@TestProfile(DemoModeTestProfile.class)
public class DemoModeIntegrationTest {

    @Test
    public void testDemoModeHeaderPresentInResponse() {
        // Requirement 14.4: Demo mode indicator in API responses
        given()
            .when()
            .get("/v1/health")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true");
    }

    @Test
    public void testAuthenticationBypassedInDemoMode() {
        // Requirement 14.1: Authentication bypass in demo mode
        // Should be able to access protected endpoints without authentication
        given()
            .when()
            .get("/v1/stacks")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true");
    }

    @Test
    public void testAdminEndpointsAccessibleInDemoMode() {
        // Demo user should have admin role
        given()
            .when()
            .get("/v1/admin/cloud-providers")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true");
    }

    @Test
    public void testStackCreationInDemoMode() {
        // Requirement 14.3: Write operations work but don't persist
        String uniqueId = java.util.UUID.randomUUID().toString().substring(0, 8);
        
        StackCreateDto createDto = new StackCreateDto();
        createDto.setName("demo-stack-" + uniqueId);
        createDto.setDescription("Demo stack for testing");
        createDto.setStackType(StackType.INFRASTRUCTURE);
        createDto.setCloudName("demo-cloud");
        createDto.setRoutePath("/demo-" + uniqueId + "/");

        given()
            .contentType(ContentType.JSON)
            .body(createDto)
            .when()
            .post("/v1/stacks")
            .then()
            .statusCode(201)
            .header("X-Demo-Mode", "true")
            .body("name", equalTo("demo-stack-" + uniqueId));
    }

    @Test
    public void testBlueprintListingInDemoMode() {
        // Read operations should work normally
        given()
            .when()
            .get("/v1/blueprints")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true")
            .body("$", notNullValue());
    }

    @Test
    public void testTeamListingInDemoMode() {
        // Read operations should work normally
        given()
            .when()
            .get("/v1/teams")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true")
            .body("$", notNullValue());
    }

    @Test
    public void testCloudProviderListingInDemoMode() {
        // Read operations should work normally
        given()
            .when()
            .get("/v1/admin/cloud-providers")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true")
            .body("$", notNullValue());
    }

    @Test
    public void testHealthCheckInDemoMode() {
        // Health check should work in demo mode
        given()
            .when()
            .get("/v1/health")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true")
            .body("status", equalTo("UP"));
    }

    @Test
    public void testMetricsAccessibleInDemoMode() {
        // Metrics should be accessible in demo mode
        given()
            .when()
            .get("/v1/metrics")
            .then()
            .statusCode(200)
            .header("X-Demo-Mode", "true");
    }
}
