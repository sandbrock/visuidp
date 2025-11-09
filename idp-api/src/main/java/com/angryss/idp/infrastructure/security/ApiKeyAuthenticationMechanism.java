package com.angryss.idp.infrastructure.security;

import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.services.ApiKeyValidationService;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.logging.Log;
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
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Authentication mechanism for API key-based authentication.
 * This mechanism has priority 0, making it execute before the TraefikAuthenticationMechanism (priority 1).
 * If no API key is present, it falls through to allow OAuth2 Proxy authentication.
 */
@Alternative
@Priority(0)
@ApplicationScoped
public class ApiKeyAuthenticationMechanism implements HttpAuthenticationMechanism {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    @Inject
    ApiKeyValidationService validationService;

    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        String authHeader = context.request().getHeader(AUTHORIZATION_HEADER);

        // If no Authorization header or doesn't start with Bearer, fall through to next mechanism
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return Uni.createFrom().nullItem();
        }

        String apiKey = authHeader.substring(BEARER_PREFIX.length()).trim();

        // Validate key format first
        if (!validationService.validateKeyFormat(apiKey)) {
            Log.warnf("Invalid API key format from IP: %s", getSourceIp(context));
            logFailedAuthentication(apiKey, getSourceIp(context), "Invalid key format");
            return Uni.createFrom().failure(new SecurityException("Invalid API key format"));
        }

        // Extract prefix for database lookup
        String keyPrefix = validationService.extractKeyPrefix(apiKey);

        // Validate and authenticate
        return validateApiKey(apiKey, keyPrefix, context)
            .onItem().transform(this::buildSecurityIdentity)
            .onFailure().invoke(throwable -> {
                Log.warnf("API key authentication failed from IP %s: %s", 
                    getSourceIp(context), throwable.getMessage());
            });
    }

    /**
     * Validates the API key against the database.
     * Checks hash, expiration, and active status.
     * Updates last_used_at timestamp on successful validation.
     */
    @Transactional
    Uni<ApiKey> validateApiKey(String plainKey, String keyPrefix, RoutingContext context) {
        return Uni.createFrom().item(() -> {
            // Find API key by prefix
            List<ApiKey> keys = ApiKey.find("keyPrefix", keyPrefix).list();
            
            if (keys.isEmpty()) {
                logFailedAuthentication(keyPrefix, getSourceIp(context), "Key not found");
                throw new SecurityException("Invalid API key");
            }

            // There should only be one key with this prefix, but handle multiple just in case
            ApiKey matchedKey = null;
            for (ApiKey key : keys) {
                if (validationService.verifyKeyHash(plainKey, key.keyHash)) {
                    matchedKey = key;
                    break;
                }
            }

            if (matchedKey == null) {
                logFailedAuthentication(keyPrefix, getSourceIp(context), "Hash verification failed");
                throw new SecurityException("Invalid API key");
            }

            // Check if key is valid (active, not revoked, not expired)
            if (!matchedKey.isValid()) {
                String reason = determineInvalidReason(matchedKey);
                logFailedAuthentication(keyPrefix, getSourceIp(context), reason);
                throw new SecurityException(reason);
            }

            // Update last used timestamp
            matchedKey.markAsUsed();
            matchedKey.persist();

            // Log successful authentication
            logSuccessfulAuthentication(matchedKey, getSourceIp(context));

            return matchedKey;
        });
    }

    /**
     * Builds a SecurityIdentity from the validated API key.
     * For USER keys: uses userEmail as principal, adds "user" role
     * For SYSTEM keys: uses "system-{keyId}" as principal, adds "admin" role
     */
    private SecurityIdentity buildSecurityIdentity(ApiKey apiKey) {
        String principalName;
        String email;
        Set<String> roles = new HashSet<>();

        if (apiKey.keyType == ApiKeyType.USER) {
            principalName = apiKey.userEmail;
            email = apiKey.userEmail;
            roles.add("user");
        } else {
            // SYSTEM key
            principalName = "system-" + apiKey.id.toString();
            email = null;
            roles.add("admin");
        }

        QuarkusSecurityIdentity.Builder builder = QuarkusSecurityIdentity.builder()
            .setPrincipal(new ApiKeyPrincipal(principalName, email, apiKey.keyType, apiKey.id))
            .addCredential(new ApiKeyCredential(apiKey.keyPrefix));

        // Add roles
        for (String role : roles) {
            builder.addRole(role);
        }

        // Add attributes
        builder.addAttribute("api_key_id", apiKey.id);
        builder.addAttribute("api_key_type", apiKey.keyType);
        if (email != null) {
            builder.addAttribute("email", email);
        }

        return builder.build();
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, "WWW-Authenticate", "Bearer"));
    }

    @Override
    public Set<Class<? extends AuthenticationRequest>> getCredentialTypes() {
        return Collections.emptySet();
    }

    @Override
    public Uni<HttpCredentialTransport> getCredentialTransport(RoutingContext context) {
        return Uni.createFrom().item(new HttpCredentialTransport(
            HttpCredentialTransport.Type.AUTHORIZATION, 
            AUTHORIZATION_HEADER));
    }

    /**
     * Determines the reason why an API key is invalid.
     */
    private String determineInvalidReason(ApiKey key) {
        if (key.revokedAt != null) {
            return "API key has been revoked";
        }
        if (key.isExpired()) {
            return "API key has expired";
        }
        if (!key.isActive) {
            return "API key is inactive";
        }
        return "API key is invalid";
    }

    /**
     * Logs a successful authentication event to the audit log.
     */
    @Transactional
    void logSuccessfulAuthentication(ApiKey apiKey, String sourceIp) {
        Map<String, Object> details = new HashMap<>();
        details.put("key_id", apiKey.id.toString());
        details.put("key_prefix", apiKey.keyPrefix);
        details.put("key_type", apiKey.keyType.toString());
        details.put("source_ip", sourceIp);
        details.put("timestamp", LocalDateTime.now().toString());

        String userEmail = apiKey.keyType == ApiKeyType.USER ? apiKey.userEmail : "system";

        AdminAuditLog auditLog = new AdminAuditLog(
            userEmail,
            "API_KEY_AUTHENTICATION_SUCCESS",
            "ApiKey",
            apiKey.id,
            details
        );
        auditLog.persist();

        Log.infof("API key authentication successful - Key: %s, Type: %s, User: %s, IP: %s",
            apiKey.keyPrefix, apiKey.keyType, userEmail, sourceIp);
    }

    /**
     * Logs a failed authentication attempt to the audit log.
     */
    @Transactional
    void logFailedAuthentication(String keyPrefix, String sourceIp, String reason) {
        Map<String, Object> details = new HashMap<>();
        details.put("key_prefix", keyPrefix);
        details.put("source_ip", sourceIp);
        details.put("reason", reason);
        details.put("timestamp", LocalDateTime.now().toString());

        AdminAuditLog auditLog = new AdminAuditLog(
            "anonymous",
            "API_KEY_AUTHENTICATION_FAILED",
            "ApiKey",
            null,
            details
        );
        auditLog.persist();

        Log.warnf("API key authentication failed - Prefix: %s, IP: %s, Reason: %s",
            keyPrefix, sourceIp, reason);
    }

    /**
     * Extracts the source IP address from the routing context.
     * Checks X-Forwarded-For header first, then falls back to remote address.
     */
    private String getSourceIp(RoutingContext context) {
        String forwardedFor = context.request().getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return forwardedFor.split(",")[0].trim();
        }
        return context.request().remoteAddress().host();
    }
}
