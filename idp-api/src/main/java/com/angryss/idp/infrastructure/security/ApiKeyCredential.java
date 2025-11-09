package com.angryss.idp.infrastructure.security;

import io.quarkus.security.credential.Credential;

/**
 * Credential implementation for API key authentication.
 * Stores the API key value used for authentication.
 */
public class ApiKeyCredential implements Credential {
    private final String apiKey;

    public ApiKeyCredential(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }
}
