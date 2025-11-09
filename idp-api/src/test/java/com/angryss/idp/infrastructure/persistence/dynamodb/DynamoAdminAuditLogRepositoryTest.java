package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.AdminAuditLog;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoAdminAuditLogRepository.
 * Tests CRUD operations, GSI queries, and pagination for audit logs.
 */
public class DynamoAdminAuditLogRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoAdminAuditLogRepository adminAuditLogRepository;

    @Test
    public void testSaveAndFindById() {
        AdminAuditLog log = createTestAuditLog("CREATE", "Stack", "admin@example.com");
        
        AdminAuditLog saved = adminAuditLogRepository.save(log);
        
        assertNotNull(saved.getId());
        assertNotNull(saved.getTimestamp());
        
        Optional<AdminAuditLog> found = adminAuditLogRepository.findById(saved.getId());
        
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("CREATE", found.get().getAction());
        assertEquals("Stack", found.get().getEntityType());
    }

    @Test
    public void testFindById_NotFound() {
        Optional<AdminAuditLog> found = adminAuditLogRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testDelete() {
        AdminAuditLog log = createTestAuditLog("DELETE", "Blueprint", "admin@example.com");
        AdminAuditLog saved = adminAuditLogRepository.save(log);
        UUID id = saved.getId();
        
        assertTrue(adminAuditLogRepository.findById(id).isPresent());
        
        adminAuditLogRepository.delete(saved);
        
        assertFalse(adminAuditLogRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin1@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Blueprint", "admin2@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("DELETE", "Team", "admin3@example.com"));
        
        List<AdminAuditLog> all = adminAuditLogRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testFindByUserEmail() {
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin1@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Stack", "admin1@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("DELETE", "Stack", "admin2@example.com"));
        
        List<AdminAuditLog> admin1Logs = adminAuditLogRepository.findByUserEmail("admin1@example.com");
        
        assertEquals(2, admin1Logs.size());
        assertTrue(admin1Logs.stream().allMatch(log -> log.getUserEmail().equals("admin1@example.com")));
    }

    @Test
    public void testFindByAction() {
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin1@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Blueprint", "admin2@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Stack", "admin3@example.com"));
        
        List<AdminAuditLog> createLogs = adminAuditLogRepository.findByAction("CREATE");
        
        assertEquals(2, createLogs.size());
        assertTrue(createLogs.stream().allMatch(log -> log.getAction().equals("CREATE")));
    }

    @Test
    public void testFindByEntityType() {
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin1@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Stack", "admin2@example.com"));
        adminAuditLogRepository.save(createTestAuditLog("DELETE", "Blueprint", "admin3@example.com"));
        
        List<AdminAuditLog> stackLogs = adminAuditLogRepository.findByEntityType("Stack");
        
        assertEquals(2, stackLogs.size());
        assertTrue(stackLogs.stream().allMatch(log -> log.getEntityType().equals("Stack")));
    }

    @Test
    public void testFindByEntityTypeAndEntityId() {
        UUID entityId = UUID.randomUUID();
        
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin1@example.com", entityId));
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Stack", "admin2@example.com", entityId));
        adminAuditLogRepository.save(createTestAuditLog("DELETE", "Stack", "admin3@example.com", UUID.randomUUID()));
        
        List<AdminAuditLog> entityLogs = adminAuditLogRepository.findByEntityTypeAndEntityId("Stack", entityId);
        
        assertEquals(2, entityLogs.size());
        assertTrue(entityLogs.stream().allMatch(log -> log.getEntityId().equals(entityId)));
    }

    @Test
    public void testCount() {
        assertEquals(0, adminAuditLogRepository.count());
        
        adminAuditLogRepository.save(createTestAuditLog("CREATE", "Stack", "admin@example.com"));
        assertEquals(1, adminAuditLogRepository.count());
        
        adminAuditLogRepository.save(createTestAuditLog("UPDATE", "Stack", "admin@example.com"));
        assertEquals(2, adminAuditLogRepository.count());
    }

    @Test
    public void testExists() {
        AdminAuditLog log = createTestAuditLog("CREATE", "Stack", "admin@example.com");
        AdminAuditLog saved = adminAuditLogRepository.save(log);
        
        assertTrue(adminAuditLogRepository.exists(saved.getId()));
        assertFalse(adminAuditLogRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        String userEmail = "admin@example.com";
        
        // Create more than typical page size
        for (int i = 0; i < 200; i++) {
            AdminAuditLog log = createTestAuditLog("CREATE", "Stack-" + i, userEmail);
            adminAuditLogRepository.save(log);
        }
        
        List<AdminAuditLog> all = adminAuditLogRepository.findAll();
        assertEquals(200, all.size());
        
        // Verify pagination works for queries too
        List<AdminAuditLog> userLogs = adminAuditLogRepository.findByUserEmail(userEmail);
        assertEquals(200, userLogs.size());
    }

    @Test
    public void testSaveWithChanges() {
        AdminAuditLog log = createTestAuditLog("UPDATE", "Stack", "admin@example.com");
        Map<String, Object> changes = new HashMap<>();
        changes.put("oldValue", "original");
        changes.put("newValue", "updated");
        changes.put("field", "name");
        log.setChanges(changes);
        
        AdminAuditLog saved = adminAuditLogRepository.save(log);
        
        Optional<AdminAuditLog> found = adminAuditLogRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertNotNull(found.get().getChanges());
        assertEquals("original", found.get().getChanges().get("oldValue"));
        assertEquals("updated", found.get().getChanges().get("newValue"));
    }

    @Test
    public void testFindByTimestampBetween() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        LocalDateTime tomorrow = now.plusDays(1);
        
        AdminAuditLog oldLog = createTestAuditLog("CREATE", "Stack", "admin@example.com");
        oldLog.setTimestamp(yesterday);
        
        AdminAuditLog recentLog = createTestAuditLog("UPDATE", "Stack", "admin@example.com");
        recentLog.setTimestamp(now);
        
        adminAuditLogRepository.save(oldLog);
        adminAuditLogRepository.save(recentLog);
        
        List<AdminAuditLog> recentLogs = adminAuditLogRepository.findByTimestampBetween(
            yesterday.minusHours(1), 
            tomorrow
        );
        
        assertEquals(2, recentLogs.size());
    }

    private AdminAuditLog createTestAuditLog(String action, String entityType, String userEmail) {
        return createTestAuditLog(action, entityType, userEmail, UUID.randomUUID());
    }

    private AdminAuditLog createTestAuditLog(String action, String entityType, String userEmail, UUID entityId) {
        AdminAuditLog log = new AdminAuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setUserEmail(userEmail);
        log.setTimestamp(LocalDateTime.now());
        return log;
    }
}
