package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents an API key for programmatic authentication to the IDP API.
 * API keys can be either USER keys (tied to a specific user) or SYSTEM keys (organization-level).
 * Keys are stored as BCrypt hashes for security and support expiration and revocation.
 */
@Entity
@Table(name = "api_keys")
public class ApiKey extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotBlank(message = "Key name is required")
    @Size(max = 100, message = "Key name must not exceed 100 characters")
    @Column(name = "key_name", nullable = false, length = 100)
    public String keyName;

    @NotBlank(message = "Key hash is required")
    @Column(name = "key_hash", nullable = false, unique = true, length = 255)
    public String keyHash;

    @NotBlank(message = "Key prefix is required")
    @Size(max = 20, message = "Key prefix must not exceed 20 characters")
    @Column(name = "key_prefix", nullable = false, length = 20)
    public String keyPrefix;

    @NotNull(message = "Key type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "key_type", nullable = false, length = 20)
    public ApiKeyType keyType;

    @Column(name = "user_email", length = 255)
    public String userEmail;

    @NotBlank(message = "Created by email is required")
    @Column(name = "created_by_email", nullable = false, length = 255)
    public String createdByEmail;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "expires_at")
    public LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    public LocalDateTime lastUsedAt;

    @Column(name = "revoked_at")
    public LocalDateTime revokedAt;

    @Column(name = "revoked_by_email", length = 255)
    public String revokedByEmail;

    @NotNull(message = "Active status is required")
    @Column(name = "is_active", nullable = false)
    public Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
    }

    /**
     * Checks if the API key is valid for authentication.
     * A key is valid if it is active, not revoked, and not expired.
     *
     * @return true if the key can be used for authentication, false otherwise
     */
    public boolean isValid() {
        if (!isActive) {
            return false;
        }
        if (revokedAt != null) {
            return false;
        }
        if (isExpired()) {
            return false;
        }
        return true;
    }

    /**
     * Checks if the API key has expired.
     * A key is expired if it has an expiration date and that date is in the past.
     *
     * @return true if the key has expired, false otherwise
     */
    public boolean isExpired() {
        if (expiresAt == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Updates the last used timestamp to the current time.
     * This should be called whenever the key is successfully used for authentication.
     */
    public void markAsUsed() {
        this.lastUsedAt = LocalDateTime.now();
    }

    /**
     * Revokes the API key, making it invalid for future authentication.
     * Sets the revoked timestamp, records who revoked it, and marks it as inactive.
     *
     * @param revokedBy the email of the user who is revoking the key
     */
    public void revoke(String revokedBy) {
        this.revokedAt = LocalDateTime.now();
        this.revokedByEmail = revokedBy;
        this.isActive = false;
    }

    /**
     * Checks if the key is expiring soon (within 7 days).
     * Used to warn users about upcoming expiration.
     *
     * @return true if the key expires within 7 days, false otherwise
     */
    public boolean isExpiringSoon() {
        if (expiresAt == null || isExpired()) {
            return false;
        }
        LocalDateTime sevenDaysFromNow = LocalDateTime.now().plusDays(7);
        return expiresAt.isBefore(sevenDaysFromNow);
    }

    /**
     * Gets the current status of the API key as a human-readable string.
     *
     * @return "REVOKED" if revoked, "EXPIRED" if expired, "ACTIVE" otherwise
     */
    public String getStatus() {
        if (revokedAt != null) {
            return "REVOKED";
        }
        if (isExpired()) {
            return "EXPIRED";
        }
        return "ACTIVE";
    }
}
