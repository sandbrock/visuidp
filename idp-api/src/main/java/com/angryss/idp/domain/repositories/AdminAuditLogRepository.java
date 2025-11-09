package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.AdminAuditLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository interface for AdminAuditLog entity operations.
 * Extends the base repository with AdminAuditLog-specific query methods.
 */
public interface AdminAuditLogRepository extends Repository<AdminAuditLog, UUID> {
    
    /**
     * Finds all audit logs for a specific user.
     *
     * @param userEmail The user email
     * @return List of audit logs for the user
     */
    List<AdminAuditLog> findByUserEmail(String userEmail);
    
    /**
     * Finds all audit logs for a specific entity type.
     *
     * @param entityType The entity type
     * @return List of audit logs for the entity type
     */
    List<AdminAuditLog> findByEntityType(String entityType);
    
    /**
     * Finds all audit logs for a specific entity.
     *
     * @param entityType The entity type
     * @param entityId The entity identifier
     * @return List of audit logs for the entity
     */
    List<AdminAuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId);
    
    /**
     * Finds all audit logs for a specific action.
     *
     * @param action The action performed
     * @return List of audit logs for the action
     */
    List<AdminAuditLog> findByAction(String action);
    
    /**
     * Finds all audit logs within a time range.
     *
     * @param startTime The start of the time range
     * @param endTime The end of the time range
     * @return List of audit logs within the time range
     */
    List<AdminAuditLog> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * Finds all audit logs for a specific user within a time range.
     *
     * @param userEmail The user email
     * @param startTime The start of the time range
     * @param endTime The end of the time range
     * @return List of audit logs for the user within the time range
     */
    List<AdminAuditLog> findByUserEmailAndTimestampBetween(String userEmail, LocalDateTime startTime, LocalDateTime endTime);
}
