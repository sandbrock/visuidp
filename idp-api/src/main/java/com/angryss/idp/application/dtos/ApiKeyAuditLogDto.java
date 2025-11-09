package com.angryss.idp.application.dtos;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for API key audit log responses.
 * Contains information about API key lifecycle events and authentication attempts.
 */
@Schema(description = "Audit log entry for API key lifecycle events and authentication attempts")
public class ApiKeyAuditLogDto {

    @Schema(description = "Unique identifier for the audit log entry", example = "550e8400-e29b-41d4-a716-446655440000")
    private UUID id;
    
    @Schema(description = "Email of the user associated with the event", example = "developer@example.com")
    private String userEmail;
    
    @Schema(
        description = "Type of action that occurred",
        example = "API_KEY_CREATED",
        enumeration = {"API_KEY_CREATED", "API_KEY_ROTATED", "API_KEY_REVOKED", "API_KEY_AUTHENTICATED", "API_KEY_AUTH_FAILED"}
    )
    private String action;
    
    @Schema(description = "Timestamp when the event occurred", example = "2024-01-15T10:30:00")
    private LocalDateTime timestamp;
    
    @Schema(description = "Prefix of the API key involved in the event", example = "idp_user_abc")
    private String keyPrefix;
    
    @Schema(description = "Source IP address of the request (for authentication events)", example = "192.168.1.100")
    private String sourceIp;

    public ApiKeyAuditLogDto() {
    }

    public ApiKeyAuditLogDto(UUID id, String userEmail, String action, LocalDateTime timestamp, String keyPrefix, String sourceIp) {
        this.id = id;
        this.userEmail = userEmail;
        this.action = action;
        this.timestamp = timestamp;
        this.keyPrefix = keyPrefix;
        this.sourceIp = sourceIp;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getKeyPrefix() {
        return keyPrefix;
    }

    public void setKeyPrefix(String keyPrefix) {
        this.keyPrefix = keyPrefix;
    }

    public String getSourceIp() {
        return sourceIp;
    }

    public void setSourceIp(String sourceIp) {
        this.sourceIp = sourceIp;
    }
}
