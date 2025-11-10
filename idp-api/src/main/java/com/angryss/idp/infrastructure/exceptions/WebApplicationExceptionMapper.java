package com.angryss.idp.infrastructure.exceptions;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;

/**
 * Exception mapper for WebApplicationException.
 * Preserves the status code and adds error message to response body if not already present.
 */
@Provider
public class WebApplicationExceptionMapper implements ExceptionMapper<WebApplicationException> {

    private static final Logger LOG = Logger.getLogger(WebApplicationExceptionMapper.class);

    @Override
    public Response toResponse(WebApplicationException exception) {
        Response response = exception.getResponse();
        int status = response.getStatus();
        
        // Log based on severity
        if (status >= 500) {
            LOG.error("Server error: " + exception.getMessage(), exception);
        } else if (status >= 400) {
            LOG.warn("Client error: " + exception.getMessage());
        }
        
        // If response already has an entity, return it as-is
        if (response.hasEntity()) {
            return response;
        }
        
        // Otherwise, add error message to response body
        String message = exception.getMessage();
        if (message == null || message.isEmpty()) {
            message = Response.Status.fromStatusCode(status).getReasonPhrase();
        }
        
        return Response
            .status(status)
            .entity(Map.of(
                "error", Response.Status.fromStatusCode(status).getReasonPhrase(),
                "message", message
            ))
            .build();
    }
}
