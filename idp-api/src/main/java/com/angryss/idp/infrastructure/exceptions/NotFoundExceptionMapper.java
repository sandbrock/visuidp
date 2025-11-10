package com.angryss.idp.infrastructure.exceptions;

import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;

/**
 * Exception mapper for NotFoundException.
 * Converts NotFoundException to HTTP 404 Not Found with error message in response body.
 */
@Provider
public class NotFoundExceptionMapper implements ExceptionMapper<NotFoundException> {

    private static final Logger LOG = Logger.getLogger(NotFoundExceptionMapper.class);

    @Override
    public Response toResponse(NotFoundException exception) {
        LOG.debug("Resource not found: " + exception.getMessage());
        
        String message = exception.getMessage();
        // Extract the message if it's wrapped
        if (message == null || message.isEmpty()) {
            message = "Resource not found";
        }
        
        return Response
            .status(Response.Status.NOT_FOUND)
            .entity(Map.of(
                "error", "Not Found",
                "message", message
            ))
            .build();
    }
}
