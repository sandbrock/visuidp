package com.angryss.idp.infrastructure.logging;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Global exception handler that ensures all errors are logged with structured information.
 * This is critical for CloudWatch cost optimization - we only log ERROR level,
 * so we must ensure all errors are captured with full context.
 */
@Provider
public class GlobalExceptionHandler implements ExceptionMapper<Exception> {

    private static final Logger LOG = Logger.getLogger(GlobalExceptionHandler.class);

    @Override
    public Response toResponse(Exception exception) {
        // Generate correlation ID for tracking
        String correlationId = UUID.randomUUID().toString();

        // Determine status code and log level
        int statusCode;
        String errorType;

        if (exception instanceof WebApplicationException) {
            WebApplicationException webEx = (WebApplicationException) exception;
            statusCode = webEx.getResponse().getStatus();
            errorType = "WebApplicationException";

            // Only log 5xx errors (server errors) to CloudWatch
            // 4xx errors are client errors and don't need CloudWatch logging
            if (statusCode >= 500) {
                logError(correlationId, errorType, statusCode, exception);
            }
        } else {
            // Unexpected exception - always log
            statusCode = Response.Status.INTERNAL_SERVER_ERROR.getStatusCode();
            errorType = exception.getClass().getSimpleName();
            logError(correlationId, errorType, statusCode, exception);
        }

        // Build error response
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", errorType);
        errorResponse.put("message", exception.getMessage());
        errorResponse.put("correlationId", correlationId);
        errorResponse.put("status", statusCode);

        return Response.status(statusCode)
                .entity(errorResponse)
                .build();
    }

    /**
     * Log error with structured information including full stack trace.
     * This ensures CloudWatch captures all necessary debugging information.
     */
    private void logError(String correlationId, String errorType, int statusCode, Exception exception) {
        LOG.errorf(exception,
                "ERROR | correlationId=%s | type=%s | status=%d | message=%s",
                correlationId,
                errorType,
                statusCode,
                exception.getMessage()
        );
    }
}
