package com.angryss.idp.infrastructure.security;

import jakarta.interceptor.InterceptorBinding;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that perform write operations.
 * 
 * When demo mode is enabled, methods annotated with @DemoModeWriteOperation
 * will skip actual persistence and return simulated responses.
 * 
 * This supports Requirement 14.3:
 * "Modify write operations to skip persistence in demo mode"
 */
@InterceptorBinding
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface DemoModeWriteOperation {
}
