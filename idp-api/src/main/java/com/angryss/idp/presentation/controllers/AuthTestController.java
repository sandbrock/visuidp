package com.angryss.idp.presentation.controllers;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.Map;

@Path("/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Authentication", description = "Authentication testing endpoints")
@Authenticated
public class AuthTestController {

    @GET
    @Path("/headers")
    @Operation(summary = "Test OAuth2 Proxy headers", description = "Returns OAuth2 Proxy headers for testing")
    @APIResponse(responseCode = "200", description = "Headers retrieved successfully")
    public Response getHeaders(@Context HttpHeaders httpHeaders,
                              @HeaderParam("X-Forwarded-User") String user,
                              @HeaderParam("X-Forwarded-Email") String email) {
        var allHeaders = new java.util.HashMap<String, String>();
        httpHeaders.getRequestHeaders().forEach((key, values) -> {
            if (key.toLowerCase().contains("user") || key.toLowerCase().contains("email") ||
                key.toLowerCase().contains("auth") || key.toLowerCase().contains("forward")) {
                allHeaders.put(key, String.join(", ", values));
            }
        });

        return Response.ok(Map.of(
            "user", user != null ? user : "not-provided",
            "email", email != null ? email : "not-provided",
            "authenticated", user != null && !user.trim().isEmpty(),
            "allRelevantHeaders", allHeaders
        )).build();
    }
}