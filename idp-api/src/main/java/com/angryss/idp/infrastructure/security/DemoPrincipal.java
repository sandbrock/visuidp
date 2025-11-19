package com.angryss.idp.infrastructure.security;

import java.security.Principal;

/**
 * Principal for demo mode authentication.
 * Represents a demo user with predefined attributes for hackathon judges.
 */
public class DemoPrincipal implements Principal {
    
    private final String name;
    private final String email;
    private final String displayName;
    
    public DemoPrincipal(String name, String email, String displayName) {
        this.name = name;
        this.email = email;
        this.displayName = displayName;
    }
    
    @Override
    public String getName() {
        return name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    @Override
    public String toString() {
        return "DemoPrincipal{" +
                "name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", displayName='" + displayName + '\'' +
                '}';
    }
}
