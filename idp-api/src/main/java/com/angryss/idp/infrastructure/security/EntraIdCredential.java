package com.angryss.idp.infrastructure.security;

import io.quarkus.security.credential.Credential;

/**
 * Credential representing a JWT token from Microsoft Entra ID.
 */
public class EntraIdCredential implements Credential {
    private final String jwtToken;

    public EntraIdCredential(String jwtToken) {
        this.jwtToken = jwtToken;
    }

    public String getJwtToken() {
        return jwtToken;
    }
}
