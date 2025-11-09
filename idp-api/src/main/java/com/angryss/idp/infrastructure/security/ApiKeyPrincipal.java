package com.angryss.idp.infrastructure.security;

import com.angryss.idp.domain.valueobjects.ApiKeyType;

import java.security.Principal;
import java.util.UUID;

/**
 * Principal implementation for API key authentication.
 * Contains information about the authenticated API key including the associated user or system identifier.
 */
public class ApiKeyPrincipal implements Principal {
    private final String name;
    private final String email;
    private final ApiKeyType keyType;
    private final UUID keyId;

    public ApiKeyPrincipal(String name, String email, ApiKeyType keyType, UUID keyId) {
        this.name = name;
        this.email = email;
        this.keyType = keyType;
        this.keyId = keyId;
    }

    @Override
    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public ApiKeyType getKeyType() {
        return keyType;
    }

    public UUID getKeyId() {
        return keyId;
    }
}
