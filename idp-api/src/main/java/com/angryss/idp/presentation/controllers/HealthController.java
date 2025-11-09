package com.angryss.idp.presentation.controllers;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.LocalDateTime;
import java.util.Map;

@Path("/v1/health")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Health", description = "Application health check operations")
public class HealthController {

    @GET
    @Operation(summary = "Health check", description = "Returns the health status of the application")
    @APIResponse(responseCode = "200", description = "Application is healthy")
    public Response healthCheck() {
        Map<String, Object> response = Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now(),
            "service", "idp-rest-api",
            "version", "1.0.0-SNAPSHOT"
        );
        return Response.ok(response).build();
    }

}
