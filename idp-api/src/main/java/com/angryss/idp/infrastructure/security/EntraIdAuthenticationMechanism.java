package com.angryss.idp.infrastructure.security;

import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.identity.request.AuthenticationRequest;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.quarkus.vertx.http.runtime.security.HttpCredentialTransport;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Authentication mechanism for AWS Lambda with API Gateway JWT authorizer.
 * Extracts JWT claims from the API Gateway request context and creates a SecurityIdentity.
 * 
 * This mechanism is designed to work with API Gateway HTTP API JWT authorizer configured
 * for Microsoft Entra ID. The JWT is validated by API Gateway before reaching Lambda,
 * and the claims are passed in the request context.
 * 
 * Priority 2 ensures this runs after ApiKeyAuthenticationMechanism (0) and 
 * TraefikAuthenticationMechanism (1), allowing fallback to other mechanisms in
 * non-Lambda environments.
 */
@Priority(2)
@ApplicationScoped
public class EntraIdAuthenticationMechanism implements HttpAuthenticationMechanism {

    @ConfigProperty(name = "idp.security.admin-group")
    String adminGroup;

    @ConfigProperty(name = "idp.lambda.enabled", defaultValue = "false")
    boolean lambdaEnabled;

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        // Only activate in Lambda environment
        if (!lambdaEnabled) {
            return Uni.createFrom().nullItem();
        }

        // Extract JWT claims from API Gateway request context
        // API Gateway passes JWT claims in requestContext.authorizer.jwt.claims
        Map<String, Object> claims = extractJwtClaims(context);
        
        if (claims == null || claims.isEmpty()) {
            // No JWT claims present - not authenticated via API Gateway JWT authorizer
            System.out.println("EntraIdAuthenticationMechanism: No JWT claims found in request context");
            return Uni.createFrom().nullItem();
        }

        System.out.println("=== Entra ID JWT Authentication ===");
        System.out.println("JWT Claims: " + claims);

        // Extract user information from JWT claims
        String sub = getClaimAsString(claims, "sub");  // Subject (user ID)
        String email = getClaimAsString(claims, "email");
        String name = getClaimAsString(claims, "name");
        String oid = getClaimAsString(claims, "oid");  // Entra ID object ID
        String preferredUsername = getClaimAsString(claims, "preferred_username");

        // Use the most appropriate identifier as the principal name
        String principalName = preferredUsername != null ? preferredUsername :
                              email != null ? email :
                              sub != null ? sub : "unknown";

        System.out.println("Principal: " + principalName);
        System.out.println("Email: " + email);
        System.out.println("OID: " + oid);

        // Build security identity
        QuarkusSecurityIdentity.Builder builder = QuarkusSecurityIdentity.builder()
            .setPrincipal(new EntraIdPrincipal(principalName, email, oid, preferredUsername))
            .addCredential(new EntraIdCredential(extractJwtToken(context)));

        // Extract groups/roles from JWT claims
        Set<String> roles = extractRolesFromClaims(claims);
        System.out.println("Assigned roles: " + roles);
        for (String role : roles) {
            builder.addRole(role);
        }

        // Add all JWT claims as attributes for potential use in application
        for (Map.Entry<String, Object> entry : claims.entrySet()) {
            builder.addAttribute("jwt." + entry.getKey(), entry.getValue());
        }

        // Add specific attributes for easy access
        if (email != null) {
            builder.addAttribute("email", email);
        }
        if (oid != null) {
            builder.addAttribute("oid", oid);
        }
        if (preferredUsername != null) {
            builder.addAttribute("preferred_username", preferredUsername);
        }

        System.out.println("===================================");

        return Uni.createFrom().item(builder.build());
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        // API Gateway handles authentication challenges
        // Return 401 Unauthorized without additional challenge data
        return Uni.createFrom().nullItem();
    }

    @Override
    public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Collections.emptySet();
    }

    @Override
    public Uni<HttpCredentialTransport> getCredentialTransport(RoutingContext context) {
        return Uni.createFrom().item(new HttpCredentialTransport(
            HttpCredentialTransport.Type.AUTHORIZATION, 
            "Bearer"));
    }

    /**
     * Extract JWT claims from API Gateway request context.
     * 
     * In Lambda with API Gateway HTTP API JWT authorizer, claims are available at:
     * event.requestContext.authorizer.jwt.claims
     * 
     * Quarkus Lambda HTTP adapter makes this available in the routing context.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractJwtClaims(RoutingContext context) {
        try {
            // Try to get from request context data
            Object requestContext = context.data().get("requestContext");
            if (requestContext instanceof Map) {
                Map<String, Object> requestContextMap = (Map<String, Object>) requestContext;
                Object authorizer = requestContextMap.get("authorizer");
                if (authorizer instanceof Map) {
                    Map<String, Object> authorizerMap = (Map<String, Object>) authorizer;
                    Object jwt = authorizerMap.get("jwt");
                    if (jwt instanceof Map) {
                        Map<String, Object> jwtMap = (Map<String, Object>) jwt;
                        Object claims = jwtMap.get("claims");
                        if (claims instanceof Map) {
                            return (Map<String, Object>) claims;
                        }
                    }
                }
            }

            // Fallback: try to get from context attributes
            Object claims = context.get("jwt.claims");
            if (claims instanceof Map) {
                return (Map<String, Object>) claims;
            }

            return null;
        } catch (Exception e) {
            System.err.println("Error extracting JWT claims: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract the JWT token from the Authorization header.
     */
    private String extractJwtToken(RoutingContext context) {
        String authHeader = context.request().getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    /**
     * Extract roles from JWT claims.
     * Maps Entra ID groups to application roles.
     */
    @SuppressWarnings("unchecked")
    private Set<String> extractRolesFromClaims(Map<String, Object> claims) {
        Set<String> roles = new HashSet<>();

        // All authenticated users get the "user" role
        roles.add("user");

        // Check for groups claim (may be array or comma-separated string)
        Object groupsClaim = claims.get("groups");
        if (groupsClaim != null) {
            Set<String> groups = new HashSet<>();
            
            if (groupsClaim instanceof Iterable) {
                // Groups as array
                for (Object group : (Iterable<?>) groupsClaim) {
                    if (group != null) {
                        groups.add(group.toString());
                    }
                }
            } else {
                // Groups as comma-separated string
                String groupsStr = groupsClaim.toString();
                for (String group : groupsStr.split(",")) {
                    groups.add(group.trim());
                }
            }

            // Map admin group to admin role
            if (adminGroup != null && !adminGroup.isBlank() && groups.contains(adminGroup)) {
                roles.add("admin");
            }
        }

        // Check for roles claim (some Entra ID configurations use this)
        Object rolesClaim = claims.get("roles");
        if (rolesClaim != null) {
            if (rolesClaim instanceof Iterable) {
                for (Object role : (Iterable<?>) rolesClaim) {
                    if (role != null) {
                        String roleStr = role.toString().toLowerCase();
                        roles.add(roleStr);
                    }
                }
            } else {
                String rolesStr = rolesClaim.toString();
                for (String role : rolesStr.split(",")) {
                    roles.add(role.trim().toLowerCase());
                }
            }
        }

        return roles;
    }

    /**
     * Safely extract a claim as a string.
     */
    private String getClaimAsString(Map<String, Object> claims, String key) {
        Object value = claims.get(key);
        return value != null ? value.toString() : null;
    }
}
