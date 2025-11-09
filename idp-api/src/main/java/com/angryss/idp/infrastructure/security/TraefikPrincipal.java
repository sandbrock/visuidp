package com.angryss.idp.infrastructure.security;

import java.security.Principal;

public class TraefikPrincipal implements Principal {
    private final String name;
    private final String email;
    private final String preferredUsername;

    public TraefikPrincipal(String name, String email, String preferredUsername) {
        this.name = name;
        this.email = email;
        this.preferredUsername = preferredUsername;
    }

    @Override
    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPreferredUsername() {
        return preferredUsername;
    }
}