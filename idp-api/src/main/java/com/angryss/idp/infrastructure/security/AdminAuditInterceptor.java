package com.angryss.idp.infrastructure.security;

import com.angryss.idp.domain.entities.AdminAuditLog;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.interceptor.AroundInvoke;
import jakarta.interceptor.Interceptor;
import jakarta.interceptor.InvocationContext;
import jakarta.transaction.Transactional;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * CDI interceptor that automatically logs administrative actions.
 * Captures user identity, action type, entity information, and changes.
 */
@AuditLogged
@Interceptor
@Priority(Interceptor.Priority.APPLICATION)
public class AdminAuditInterceptor {

    @Inject
    SecurityIdentity securityIdentity;

    @AroundInvoke
    @Transactional
    public Object auditLog(InvocationContext context) throws Exception {
        // Get annotation metadata
        Method method = context.getMethod();
        AuditLogged annotation = method.getAnnotation(AuditLogged.class);
        
        if (annotation == null) {
            // Check if annotation is on the class
            annotation = context.getTarget().getClass().getAnnotation(AuditLogged.class);
        }

        // Determine action and entity type
        String action = determineAction(annotation, method);
        String entityType = determineEntityType(annotation, context.getTarget().getClass());

        // Capture before state for update operations
        Object beforeState = null;
        if (action.equals("UPDATE") && context.getParameters().length > 0) {
            beforeState = captureBeforeState(context.getParameters());
        }

        // Execute the actual method
        Object result = context.proceed();

        // Capture after state and entity ID
        UUID entityId = extractEntityId(result, context.getParameters());
        Map<String, Object> changes = buildChangesMap(action, beforeState, result, context.getParameters());

        // Get user email from security identity
        String userEmail = extractUserEmail();

        // Create and persist audit log entry
        AdminAuditLog auditLog = new AdminAuditLog(userEmail, action, entityType, entityId, changes);
        auditLog.persist();

        return result;
    }

    /**
     * Determine the action from annotation or method name
     */
    private String determineAction(AuditLogged annotation, Method method) {
        if (annotation != null && !annotation.action().isEmpty()) {
            return annotation.action();
        }

        // Derive from method name
        String methodName = method.getName().toLowerCase();
        if (methodName.startsWith("create")) {
            return "CREATE";
        } else if (methodName.startsWith("update")) {
            return "UPDATE";
        } else if (methodName.startsWith("delete")) {
            return "DELETE";
        } else if (methodName.contains("toggle")) {
            return "TOGGLE_ENABLED";
        } else {
            return "UNKNOWN";
        }
    }

    /**
     * Determine the entity type from annotation or class name
     */
    private String determineEntityType(AuditLogged annotation, Class<?> targetClass) {
        if (annotation != null && !annotation.entityType().isEmpty()) {
            return annotation.entityType();
        }

        // Derive from service class name (e.g., CloudProviderService -> CloudProvider)
        String className = targetClass.getSimpleName();
        if (className.endsWith("Service")) {
            return className.substring(0, className.length() - 7);
        }
        return className;
    }

    /**
     * Capture the before state for update operations
     */
    private Object captureBeforeState(Object[] parameters) {
        // For update operations, the first parameter is typically the ID
        // We would need to fetch the current state from the database
        // This is a simplified implementation
        return null;
    }

    /**
     * Extract entity ID from result or parameters
     */
    private UUID extractEntityId(Object result, Object[] parameters) {
        // Try to extract ID from result (for DTOs with getId method)
        if (result != null) {
            try {
                Method getIdMethod = result.getClass().getMethod("id");
                Object id = getIdMethod.invoke(result);
                if (id instanceof UUID) {
                    return (UUID) id;
                }
            } catch (Exception e) {
                // Ignore and try parameters
            }
        }

        // Try to extract from first parameter (common for update/delete operations)
        if (parameters.length > 0 && parameters[0] instanceof UUID) {
            return (UUID) parameters[0];
        }

        return null;
    }

    /**
     * Build a map of changes for the audit log
     */
    private Map<String, Object> buildChangesMap(String action, Object beforeState, Object result, Object[] parameters) {
        Map<String, Object> changes = new HashMap<>();
        changes.put("action", action);

        if (action.equals("CREATE") && result != null) {
            changes.put("created", serializeObject(result));
        } else if (action.equals("UPDATE")) {
            if (beforeState != null) {
                changes.put("before", serializeObject(beforeState));
            }
            if (result != null) {
                changes.put("after", serializeObject(result));
            }
        } else if (action.equals("DELETE") && parameters.length > 0) {
            changes.put("deletedId", parameters[0].toString());
        } else if (action.equals("TOGGLE_ENABLED") && parameters.length > 1) {
            changes.put("enabled", parameters[1]);
        }

        return changes;
    }

    /**
     * Serialize an object to a map for JSON storage
     */
    private Map<String, Object> serializeObject(Object obj) {
        Map<String, Object> map = new HashMap<>();
        if (obj == null) {
            return map;
        }

        // Simple serialization - in production, use a proper serialization library
        map.put("type", obj.getClass().getSimpleName());
        map.put("value", obj.toString());
        
        return map;
    }

    /**
     * Extract user email from security identity
     */
    private String extractUserEmail() {
        if (securityIdentity == null || securityIdentity.isAnonymous()) {
            return "anonymous";
        }

        // Try to get email from attributes
        Object email = securityIdentity.getAttribute("email");
        if (email != null) {
            return email.toString();
        }

        // Fall back to principal name
        return securityIdentity.getPrincipal().getName();
    }
}
