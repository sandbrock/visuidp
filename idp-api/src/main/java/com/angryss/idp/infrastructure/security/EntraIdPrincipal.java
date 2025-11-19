package com.angryss.idp.infrastructure.security;

import java.security.Principal;

/**
 * Principal representing a user authenticated via Microsoft Entra ID JWT token.
 * Contains user information extracted from JWT claims.
 */
public class EntraIdPrincipal implements Principal {
    private final String name;
    private final String email;
    private final String oid;  // Entra ID object ID
    private final String preferredUsername;

    public EntraIdPrincipal(String name, String email, String oid, String preferredUsername) {
        this.name = name;
        this.email = email;
        this.oid = oid;
        this.preferredUsername = preferredUsername;
    }

    @Override
    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getOid() {
        return oid;
    }

    public String getPreferredUsername() {
        return preferredUsername;
    }
}
