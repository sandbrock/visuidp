package com.angryss.idp.infrastructure.exceptions;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;

/**
 * Exception mapper for IllegalArgumentException.
 * Converts IllegalArgumentException to HTTP 400 Bad Request with error message in response body.
 */
@Provider
public class IllegalArgumentExceptionMapper implements ExceptionMapper<IllegalArgumentException> {

    private static final Logger LOG = Logger.getLogger(IllegalArgumentExceptionMapper.class);

    @Override
    public Response toResponse(IllegalArgumentException exception) {
        LOG.warn("Validation error: " + exception.getMessage(), exception);
        
        return Response
            .status(Response.Status.BAD_REQUEST)
            .entity(Map.of(
                "error", "Bad Request",
                "message", exception.getMessage()
            ))
            .build();
    }
}
