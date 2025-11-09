package com.angryss.idp.domain.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Entity representing an audit log entry for administrative actions.
 * Tracks all configuration changes made by administrators for compliance and troubleshooting.
 */
@Entity
@Table(name = "admin_audit_logs")
public class AdminAuditLog extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Email address of the administrator who performed the action
     */
    @Column(name = "user_email", nullable = false)
    private String userEmail;

    /**
     * The action performed (CREATE, UPDATE, DELETE, TOGGLE_ENABLED, etc.)
     */
    @Column(nullable = false, length = 50)
    private String action;

    /**
     * The type of entity being modified (CloudProvider, ResourceType, etc.)
     */
    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    /**
     * The ID of the entity being modified
     */
    @Column(name = "entity_id")
    private UUID entityId;

    /**
     * JSON representation of the changes made (before/after state for updates)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> changes;

    /**
     * Timestamp when the action was performed
     */
    @Column(nullable = false)
    private LocalDateTime timestamp;

    /**
     * Default constructor required by JPA
     */
    public AdminAuditLog() {
        this.timestamp = LocalDateTime.now();
    }

    /**
     * Constructor for creating audit log entries
     */
    public AdminAuditLog(String userEmail, String action, String entityType, UUID entityId, Map<String, Object> changes) {
        this.userEmail = userEmail;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.changes = changes;
        this.timestamp = LocalDateTime.now();
    }

    // Lifecycle callbacks
    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    // Getters and setters
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

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public void setEntityId(UUID entityId) {
        this.entityId = entityId;
    }

    public Map<String, Object> getChanges() {
        return changes;
    }

    public void setChanges(Map<String, Object> changes) {
        this.changes = changes;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
