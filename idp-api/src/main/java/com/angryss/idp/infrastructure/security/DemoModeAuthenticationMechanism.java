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
import java.util.Set;

/**
 * Authentication mechanism for demo mode.
 * 
 * When demo mode is enabled, this mechanism bypasses all authentication
 * and creates a demo user identity for hackathon judges to explore the application.
 * 
 * Priority -1 ensures this runs before all other authentication mechanisms
 * (ApiKeyAuthenticationMechanism=0, TraefikAuthenticationMechanism=1, EntraIdAuthenticationMechanism=2).
 * 
 * This mechanism validates Requirement 14.1:
 * "WHEN demo mode is enabled THEN the System SHALL bypass Entra ID authentication 
 * and use a demo user identity"
 */
@Priority(-1)
@ApplicationScoped
public class DemoModeAuthenticationMechanism implements HttpAuthenticationMechanism {

    @ConfigProperty(name = "idp.demo.enabled", defaultValue = "false")
    boolean demoEnabled;

    @ConfigProperty(name = "idp.demo.user.name", defaultValue = "demo")
    String demoUserName;

    @ConfigProperty(name = "idp.demo.user.email", defaultValue = "demo@visuidp.example")
    String demoUserEmail;

    @ConfigProperty(name = "idp.demo.user.display-name", defaultValue = "Demo User")
    String demoUserDisplayName;

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        // Only activate when demo mode is enabled
        if (!demoEnabled) {
            return Uni.createFrom().nullItem();
        }

        System.out.println("=== Demo Mode Authentication ===");
        System.out.println("Demo mode is ENABLED - bypassing authentication");
        System.out.println("Demo user: " + demoUserName);
        System.out.println("Demo email: " + demoUserEmail);

        // Create demo user identity
        QuarkusSecurityIdentity.Builder builder = QuarkusSecurityIdentity.builder()
            .setPrincipal(new DemoPrincipal(demoUserName, demoUserEmail, demoUserDisplayName))
            .addCredential(new DemoCredential());

        // Grant both user and admin roles for full access
        builder.addRole("user");
        builder.addRole("admin");

        // Add demo user attributes
        builder.addAttribute("email", demoUserEmail);
        builder.addAttribute("display_name", demoUserDisplayName);
        builder.addAttribute("demo_mode", true);

        System.out.println("Assigned roles: [user, admin]");
        System.out.println("================================");

        return Uni.createFrom().item(builder.build());
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        // No challenge needed in demo mode
        return Uni.createFrom().nullItem();
    }

    @Override
    public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Collections.emptySet();
    }

    @Override
    public Uni<HttpCredentialTransport> getCredentialTransport(RoutingContext context) {
        // Demo mode doesn't use standard credential transport
        return Uni.createFrom().nullItem();
    }
}
