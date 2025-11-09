package com.angryss.idp.infrastructure.security;

import io.quarkus.security.credential.Credential;

public class TraefikCredential implements Credential {
    private final String accessToken;

    public TraefikCredential(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getAccessToken() {
        return accessToken;
    }
}