package com.angryss.idp.infrastructure.exceptions;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;

/**
 * Exception mapper for IllegalStateException.
 * Converts IllegalStateException to HTTP 400 Bad Request with error message in response body.
 * IllegalStateException is typically thrown for validation errors related to entity state.
 */
@Provider
public class IllegalStateExceptionMapper implements ExceptionMapper<IllegalStateException> {

    private static final Logger LOG = Logger.getLogger(IllegalStateExceptionMapper.class);

    @Override
    public Response toResponse(IllegalStateException exception) {
        LOG.warn("State validation error: " + exception.getMessage(), exception);
        
        return Response
            .status(Response.Status.BAD_REQUEST)
            .entity(Map.of(
                "error", "Bad Request",
                "message", exception.getMessage()
            ))
            .build();
    }
}
