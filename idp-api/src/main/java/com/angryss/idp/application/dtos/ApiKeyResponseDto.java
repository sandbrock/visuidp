package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ApiKeyType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for API key metadata responses.
 * Contains all metadata about an API key without exposing the actual key value.
 */
@Schema(description = "API key metadata without the actual key value")
public class ApiKeyResponseDto {

    @Schema(description = "Unique identifier for the API key", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;
    
    @Schema(description = "Descriptive name of the API key", example = "CI/CD Pipeline Key")
    private String keyName;
    
    @Schema(description = "First 12 characters of the API key for identification (safe to log)", example = "idp_user_abc")
    private String keyPrefix;
    
    @Schema(description = "Type of API key", example = "USER", enumeration = {"USER", "SYSTEM"})
    private ApiKeyType keyType;
    
    @Schema(description = "Email of the user who owns this key (null for system keys)", example = "developer@example.com")
    private String userEmail;
    
    @Schema(description = "Email of the user who created this key", example = "admin@example.com")
    private String createdByEmail;
    
    @Schema(description = "Timestamp when the key was created", example = "2024-01-15T10:30:00")
    private LocalDateTime createdAt;
    
    @Schema(description = "Timestamp when the key will expire (null for non-expiring keys)", example = "2024-04-15T10:30:00")
    private LocalDateTime expiresAt;
    
    @Schema(description = "Timestamp when the key was last used for authentication", example = "2024-02-20T14:45:00")
    private LocalDateTime lastUsedAt;
    
    @Schema(description = "Whether the key is currently active (not revoked)", example = "true")
    private Boolean isActive;
    
    @Schema(description = "Whether the key is expiring within 7 days", example = "false")
    private Boolean isExpiringSoon;
    
    @Schema(description = "Current status of the key", example = "ACTIVE", enumeration = {"ACTIVE", "EXPIRED", "REVOKED", "EXPIRING_SOON"})
    private String status;

    public ApiKeyResponseDto() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getKeyName() {
        return keyName;
    }

    public void setKeyName(String keyName) {
        this.keyName = keyName;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public ApiKeyType getKeyType() {
        return keyType;
    }

    public void setKeyType(ApiKeyType keyType) {
        this.keyType = keyType;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getCreatedByEmail() {
        return createdByEmail;
    }

    public void setCreatedByEmail(String createdByEmail) {
        this.createdByEmail = createdByEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(LocalDateTime lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Boolean getIsExpiringSoon() {
        return isExpiringSoon;
    }

    public void setIsExpiringSoon(Boolean isExpiringSoon) {
        this.isExpiringSoon = isExpiringSoon;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
