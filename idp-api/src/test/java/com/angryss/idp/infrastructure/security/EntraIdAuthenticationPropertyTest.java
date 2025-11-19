package com.angryss.idp.infrastructure.security;

import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.test.junit.QuarkusTest;
import io.vertx.ext.web.RoutingContext;
import jakarta.inject.Inject;
import net.jqwik.api.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Property-based tests for Entra ID JWT authentication in Lambda environment.
 * 
 * These tests verify the correctness properties defined in the design document:
 * - Property 4: Authentication enforcement
 * - Property 5: JWT validation  
 * - Property 10: Authentication feature parity
 */
@QuarkusTest
public class EntraIdAuthenticationPropertyTest {

    @Inject
    IdentityProviderManager identityProviderManager;

    /**
     * **Feature: aws-cost-effective-deployment, Property 4: Authentication enforcement**
     * 
     * Property: For any request without valid JWT claims, the authentication mechanism
     * should return null (no authentication), allowing the framework to enforce 401.
     * 
     * **Validates: Requirements 5.2**
     * 
     * This property verifies that the EntraIdAuthenticationMechanism correctly
     * returns null when no JWT claims are present, which causes Quarkus to return 401.
     */
    @Property(tries = 100)
    @Label("Property 4: Authentication enforcement - no JWT claims returns null identity")
    void noJwtClaimsReturnsNullIdentity() {
        // Given: EntraIdAuthenticationMechanism with Lambda enabled
        EntraIdAuthenticationMechanism mechanism = new EntraIdAuthenticationMechanism();
        mechanism.lambdaEnabled = true;
        mechanism.adminGroup = "admin";
        
        // And: A routing context without JWT claims
        RoutingContext context = createMockContextWithoutClaims();
        
        // When: Authenticating
        SecurityIdentity identity = mechanism.authenticate(context, identityProviderManager)
            .await().indefinitely();
        
        // Then: Should return null (no authentication)
        if (identity != null) {
            throw new AssertionError("Expected null identity but got: " + identity);
        }
    }

    /**
     * **Feature: aws-cost-effective-deployment, Property 5: JWT validation**
     * 
     * Property: For any valid JWT claims structure, the authentication mechanism
     * should successfully create a SecurityIdentity with the correct user information.
     * 
     * **Validates: Requirements 6.3**
     * 
     * Note: In the actual Lambda environment, API Gateway validates JWT tokens before
     * invoking Lambda. This test verifies that our mechanism correctly processes
     * the validated claims that API Gateway provides.
     */
    @Property(tries = 100)
    @Label("Property 5: JWT validation - valid claims create security identity")
    void validJwtClaimsCreateSecurityIdentity(
            @ForAll("validEmails") String email,
            @ForAll("validUserIds") String sub,
            @ForAll("validNames") String name) {
        
        // Given: EntraIdAuthenticationMechanism with Lambda enabled
        EntraIdAuthenticationMechanism mechanism = new EntraIdAuthenticationMechanism();
        mechanism.lambdaEnabled = true;
        mechanism.adminGroup = "admin";
        
        // And: A routing context with valid JWT claims
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", sub);
        claims.put("email", email);
        claims.put("name", name);
        claims.put("oid", "test-oid-" + sub);
        claims.put("preferred_username", email);
        
        RoutingContext context = createMockContextWithClaims(claims);
        
        // When: Authenticating
        SecurityIdentity identity = mechanism.authenticate(context, identityProviderManager)
            .await().indefinitely();
        
        // Then: Should create a valid security identity
        if (identity == null) {
            throw new AssertionError("Expected non-null identity for valid claims");
        }
        
        // And: Should have user role
        if (!identity.hasRole("user")) {
            throw new AssertionError("Expected identity to have 'user' role");
        }
        
        // And: Should have email attribute
        Object emailAttr = identity.getAttribute("email");
        if (emailAttr == null || !emailAttr.equals(email)) {
            throw new AssertionError("Expected email attribute to be " + email + " but was " + emailAttr);
        }
    }

    /**
     * **Feature: aws-cost-effective-deployment, Property 10: Authentication feature parity**
     * 
     * Property: For any user with admin group membership, the authentication mechanism
     * should assign the admin role, maintaining the same authorization rules as the original.
     * 
     * **Validates: Requirements 13.4**
     * 
     * This property verifies that the authentication mechanism maintains the same
     * security boundaries as the original TraefikAuthenticationMechanism.
     */
    @Property(tries = 100)
    @Label("Property 10: Authentication feature parity - admin role assignment")
    void authenticationMaintainsSecurityParity(
            @ForAll("validEmails") String email,
            @ForAll("adminGroupMemberships") List<String> groups) {
        
        // Given: EntraIdAuthenticationMechanism with Lambda enabled
        EntraIdAuthenticationMechanism mechanism = new EntraIdAuthenticationMechanism();
        mechanism.lambdaEnabled = true;
        mechanism.adminGroup = "admin";
        
        // And: A routing context with JWT claims including groups
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", "test-user-id");
        claims.put("email", email);
        claims.put("name", "Test User");
        claims.put("oid", "test-oid");
        claims.put("preferred_username", email);
        claims.put("groups", groups);
        
        RoutingContext context = createMockContextWithClaims(claims);
        
        // When: Authenticating
        SecurityIdentity identity = mechanism.authenticate(context, identityProviderManager)
            .await().indefinitely();
        
        // Then: Should create a valid security identity
        if (identity == null) {
            throw new AssertionError("Expected non-null identity for valid claims");
        }
        
        // And: Should have admin role if and only if user is in admin group
        boolean hasAdminRole = identity.hasRole("admin");
        boolean isInAdminGroup = groups.contains("admin");
        
        if (hasAdminRole != isInAdminGroup) {
            throw new AssertionError(
                "Admin role assignment mismatch. Has admin role: " + hasAdminRole + 
                ", Is in admin group: " + isInAdminGroup);
        }
        
        // And: Should always have user role
        if (!identity.hasRole("user")) {
            throw new AssertionError("Expected identity to have 'user' role");
        }
    }

    /**
     * Provides valid email addresses for testing.
     */
    @Provide
    Arbitrary<String> validEmails() {
        return Arbitraries.strings()
            .alpha()
            .ofMinLength(3)
            .ofMaxLength(20)
            .map(s -> s.toLowerCase() + "@example.com");
    }

    /**
     * Provides valid user IDs for testing.
     */
    @Provide
    Arbitrary<String> validUserIds() {
        return Arbitraries.strings()
            .withCharRange('a', 'z')
            .numeric()
            .withChars('-')
            .ofMinLength(10)
            .ofMaxLength(36);
    }

    /**
     * Provides valid user names for testing.
     */
    @Provide
    Arbitrary<String> validNames() {
        return Arbitraries.strings()
            .alpha()
            .ofMinLength(3)
            .ofMaxLength(30)
            .map(s -> s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase());
    }

    /**
     * Provides group memberships for testing admin role assignment.
     * Some lists include "admin", some don't.
     */
    @Provide
    Arbitrary<List<String>> adminGroupMemberships() {
        return Arbitraries.of(
            List.of("admin", "users"),
            List.of("users"),
            List.of("admin"),
            List.of("users", "developers"),
            List.of("admin", "users", "developers")
        );
    }

    /**
     * Creates a mock routing context without JWT claims.
     */
    private RoutingContext createMockContextWithoutClaims() {
        RoutingContext context = mock(RoutingContext.class);
        
        // Mock request
        io.vertx.core.http.HttpServerRequest request = mock(io.vertx.core.http.HttpServerRequest.class);
        when(context.request()).thenReturn(request);
        when(request.getHeader("Authorization")).thenReturn(null);
        
        // Mock data map (no request context)
        Map<String, Object> dataMap = new HashMap<>();
        when(context.data()).thenReturn(dataMap);
        
        return context;
    }

    /**
     * Creates a mock routing context with JWT claims.
     */
    @SuppressWarnings("unchecked")
    private RoutingContext createMockContextWithClaims(Map<String, Object> claims) {
        RoutingContext context = mock(RoutingContext.class);
        
        // Mock request
        io.vertx.core.http.HttpServerRequest request = mock(io.vertx.core.http.HttpServerRequest.class);
        when(context.request()).thenReturn(request);
        when(request.getHeader("Authorization")).thenReturn("Bearer test-token");
        
        // Mock data map with request context structure
        Map<String, Object> dataMap = new HashMap<>();
        Map<String, Object> requestContext = new HashMap<>();
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> jwt = new HashMap<>();
        
        jwt.put("claims", claims);
        authorizer.put("jwt", jwt);
        requestContext.put("authorizer", authorizer);
        dataMap.put("requestContext", requestContext);
        
        when(context.data()).thenReturn(dataMap);
        
        return context;
    }
}
