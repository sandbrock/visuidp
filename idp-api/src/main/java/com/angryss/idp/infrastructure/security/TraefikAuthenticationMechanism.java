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

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Priority(1)
@ApplicationScoped
public class TraefikAuthenticationMechanism implements HttpAuthenticationMechanism {

    @ConfigProperty(name = "idp.security.admin-group")
    String adminGroup;

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        // Try X-Auth-Request-* headers first (ForwardAuth mode), then X-Forwarded-* (Proxy mode)
        String user = context.request().getHeader("X-Auth-Request-User");
        if (user == null) user = context.request().getHeader("X-Forwarded-User");
        
        String email = context.request().getHeader("X-Auth-Request-Email");
        if (email == null) email = context.request().getHeader("X-Forwarded-Email");
        
        String groups = context.request().getHeader("X-Auth-Request-Groups");
        if (groups == null) groups = context.request().getHeader("X-Forwarded-Groups");
        
        String preferredUsername = context.request().getHeader("X-Auth-Request-Preferred-Username");
        if (preferredUsername == null) preferredUsername = context.request().getHeader("X-Forwarded-Preferred-Username");
        
        String accessToken = context.request().getHeader("X-Auth-Request-Access-Token");
        if (accessToken == null) accessToken = context.request().getHeader("X-Forwarded-Access-Token");
        
        String method = context.request().method().name();
        String path = context.request().path();

        // Debug logging
        System.out.println("=== Authentication Debug ===");
        System.out.println("Method: " + method + " Path: " + path);
        System.out.println("X-Auth-Request-User: " + user);
        System.out.println("X-Auth-Request-Email: " + email);
        System.out.println("X-Auth-Request-Groups: " + groups);
        System.out.println("X-Auth-Request-Preferred-Username: " + preferredUsername);
        System.out.println("Configured ADMIN_GROUP: " + adminGroup);
        System.out.println("===========================");

        if (user == null && email == null && preferredUsername == null) {
            // No authentication headers present
            System.out.println("NO AUTH HEADERS - returning null identity");
            return Uni.createFrom().nullItem();
        }
        
        System.out.println("AUTH HEADERS PRESENT - building identity");

        // Use the most appropriate identifier as the principal
        String principal = preferredUsername != null ? preferredUsername : 
                          email != null ? email : user;

        QuarkusSecurityIdentity.Builder builder = QuarkusSecurityIdentity.builder()
            .setPrincipal(new TraefikPrincipal(principal, email, preferredUsername))
            .addCredential(new TraefikCredential(accessToken));

        // Parse groups from X-Auth-Request-Groups header and map to roles
        Set<String> roles = parseGroupsAndMapToRoles(groups);
        System.out.println("Assigned roles: " + roles);
        for (String role : roles) {
            builder.addRole(role);
        }

        // Add attributes
        if (groups != null) {
            builder.addAttribute("groups", groups);
        }
        if (email != null) {
            builder.addAttribute("email", email);
        }
        if (preferredUsername != null) {
            builder.addAttribute("preferred_username", preferredUsername);
        }
        if (accessToken != null) {
            builder.addAttribute("access_token", accessToken);
        }

        return Uni.createFrom().item(builder.build());
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        // Since Traefik handles the authentication challenge, we don't need to send one
        // The user will be redirected by Traefik/OAuth2-Proxy if not authenticated
        return Uni.createFrom().nullItem();
    }

    @Override
    public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Collections.emptySet();
    }

    @Override
    public Uni<HttpCredentialTransport> getCredentialTransport(RoutingContext context) {
        return Uni.createFrom().item(new HttpCredentialTransport(
            HttpCredentialTransport.Type.OTHER_HEADER, 
            "X-Auth-Request-User"));
    }

    /**
     * Parse the X-Auth-Request-Groups header and map Azure Entra ID groups to Quarkus security roles.
     * The groups header typically contains a comma-separated list of group names or IDs.
     * 
     * @param groupsHeader The value of the X-Auth-Request-Groups header
     * @return Set of role names to assign to the user
     */
    private Set<String> parseGroupsAndMapToRoles(String groupsHeader) {
        if (groupsHeader == null || groupsHeader.isBlank()) {
            return Collections.emptySet();
        }

        Set<String> roles = new HashSet<>();
        
        // Parse comma-separated groups
        Set<String> groups = Arrays.stream(groupsHeader.split(","))
            .map(String::trim)
            .filter(g -> !g.isEmpty())
            .collect(Collectors.toSet());

        // Map admin group to admin role
        if (adminGroup != null && !adminGroup.isBlank() && groups.contains(adminGroup)) {
            roles.add("admin");
        }

        // All authenticated users get the "user" role
        roles.add("user");

        return roles;
    }
}