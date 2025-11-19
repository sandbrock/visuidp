package com.angryss.idp.infrastructure.security;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.interceptor.AroundInvoke;
import jakarta.interceptor.Interceptor;
import jakarta.interceptor.InvocationContext;

/**
 * Interceptor that handles write operations in demo mode.
 * 
 * When demo mode is enabled, this interceptor prevents write operations
 * from persisting to the database. Instead, it simulates the operation
 * and returns the input data as if it were successfully persisted.
 * 
 * This validates Requirement 14.3:
 * "Modify write operations to skip persistence in demo mode"
 * 
 * Usage:
 * - Annotate service methods with @DemoModeWriteOperation
 * - In demo mode, the method will not execute, and the first parameter
 *   (typically a DTO) will be returned as the result
 * - For delete operations, the method will return null
 */
@DemoModeWriteOperation
@Interceptor
@Priority(Interceptor.Priority.APPLICATION)
public class DemoModeWriteInterceptor {

    @Inject
    DemoModeService demoModeService;

    @AroundInvoke
    public Object handleDemoMode(InvocationContext context) throws Exception {
        // If not in demo mode, proceed normally
        if (!demoModeService.shouldSkipWriteOperations()) {
            return context.proceed();
        }

        // In demo mode, skip the actual operation
        String methodName = context.getMethod().getName();
        String className = context.getTarget().getClass().getSimpleName();
        
        demoModeService.logDemoModeAction(
            className + "." + methodName,
            "Write operation skipped in demo mode"
        );

        // For create/update operations, return the input DTO as if it were persisted
        // For delete operations, return null
        if (methodName.startsWith("delete") || methodName.startsWith("remove")) {
            return null;
        }

        // For create/update operations, return the first parameter (usually the DTO)
        Object[] parameters = context.getParameters();
        if (parameters != null && parameters.length > 0) {
            Object firstParam = parameters[0];
            
            // If it's a DTO, return it as if it were successfully persisted
            // The caller will treat this as a successful operation
            return firstParam;
        }

        // If no parameters, return null
        return null;
    }
}
