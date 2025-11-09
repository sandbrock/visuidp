package com.angryss.idp.infrastructure.security;

import jakarta.interceptor.InterceptorBinding;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that should be audit logged.
 * When applied to a method, the AdminAuditInterceptor will automatically
 * log the action with user identity, entity type, and changes.
 */
@InterceptorBinding
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditLogged {
    
    /**
     * The action being performed (CREATE, UPDATE, DELETE, etc.)
     * If not specified, will be derived from the method name.
     */
    String action() default "";
    
    /**
     * The entity type being modified (CloudProvider, ResourceType, etc.)
     * If not specified, will be derived from the service class name.
     */
    String entityType() default "";
}
