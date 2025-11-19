package com.angryss.idp.infrastructure.security;

import io.quarkus.security.credential.Credential;

/**
 * Credential for demo mode authentication.
 * Indicates that the user is authenticated via demo mode.
 */
public class DemoCredential implements Credential {
    
    private final String mode;
    
    public DemoCredential() {
        this.mode = "demo";
    }
    
    public String getMode() {
        return mode;
    }
    
    @Override
    public String toString() {
        return "DemoCredential{mode='" + mode + "'}";
    }
}
