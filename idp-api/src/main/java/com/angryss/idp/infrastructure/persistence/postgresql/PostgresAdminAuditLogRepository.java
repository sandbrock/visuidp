package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.repositories.AdminAuditLogRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresAdminAuditLogRepository implements AdminAuditLogRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public AdminAuditLog save(AdminAuditLog adminAuditLog) {
        if (adminAuditLog.getId() != null && !entityManager.contains(adminAuditLog)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(adminAuditLog);
        } else {
            // New entity or already managed - use persist
            adminAuditLog.persist();
            return adminAuditLog;
        }
    }

    @Override
    public Optional<AdminAuditLog> findById(UUID id) {
        return Optional.ofNullable(AdminAuditLog.findById(id));
    }

    @Override
    public List<AdminAuditLog> findAll() {
        return AdminAuditLog.listAll();
    }

    @Override
    public List<AdminAuditLog> findByUserEmail(String userEmail) {
        return AdminAuditLog.find("userEmail", userEmail).list();
    }

    @Override
    public List<AdminAuditLog> findByEntityType(String entityType) {
        return AdminAuditLog.find("entityType", entityType).list();
    }

    @Override
    public List<AdminAuditLog> findByEntityTypeAndEntityId(String entityType, UUID entityId) {
        return AdminAuditLog.find("entityType = ?1 and entityId = ?2", entityType, entityId).list();
    }

    @Override
    public List<AdminAuditLog> findByAction(String action) {
        return AdminAuditLog.find("action", action).list();
    }

    @Override
    public List<AdminAuditLog> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime) {
        return AdminAuditLog.find("timestamp >= ?1 and timestamp <= ?2", startTime, endTime).list();
    }

    @Override
    public List<AdminAuditLog> findByUserEmailAndTimestampBetween(String userEmail, LocalDateTime startTime, LocalDateTime endTime) {
        return AdminAuditLog.find("userEmail = ?1 and timestamp >= ?2 and timestamp <= ?3", userEmail, startTime, endTime).list();
    }

    @Override
    public boolean exists(UUID id) {
        return AdminAuditLog.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(AdminAuditLog adminAuditLog) {
        adminAuditLog.delete();
    }

    @Override
    public long count() {
        return AdminAuditLog.count();
    }
}
