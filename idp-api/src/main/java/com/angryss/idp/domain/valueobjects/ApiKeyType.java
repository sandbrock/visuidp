package com.angryss.idp.domain.valueobjects;

/**
 * Represents the type of API key.
 * USER keys are tied to a specific user account and inherit that user's permissions.
 * SYSTEM keys are organization-level keys not tied to any individual user, typically with admin permissions.
 */
public enum ApiKeyType {
    /**
     * Personal API key tied to a specific user's credentials.
     * The key inherits the user's permissions and is managed by that user.
     */
    USER,
    
    /**
     * System-level API key not tied to any individual user account.
     * These keys persist beyond individual user tenure and are typically used for automated systems.
     * Can only be created by administrators.
     */
    SYSTEM
}
