package com.angryss.idp.presentation.controllers;

import com.angryss.idp.infrastructure.security.TraefikPrincipal;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import io.quarkus.security.Authenticated;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Path("/v1/user")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "User", description = "User information operations")
public class UserController {

    @GET
    @Path("/me")
    @Authenticated
    @Operation(summary = "Get current user", description = "Retrieves information about the currently authenticated user")
    @APIResponse(responseCode = "200", description = "User information retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public Response getCurrentUser(@Context SecurityContext securityContext) {
        Principal principal = securityContext.getUserPrincipal();
        if (principal == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", principal.getName());
        userInfo.put("authenticated", true);
        
        if (principal instanceof TraefikPrincipal) {
            TraefikPrincipal traefikPrincipal = (TraefikPrincipal) principal;
            if (traefikPrincipal.getEmail() != null) {
                userInfo.put("email", traefikPrincipal.getEmail());
            }
            if (traefikPrincipal.getPreferredUsername() != null) {
                userInfo.put("preferredUsername", traefikPrincipal.getPreferredUsername());
            }
        }
        
        // Add roles information
        java.util.List<String> roles = new java.util.ArrayList<>();
        if (securityContext.isUserInRole("admin")) {
            roles.add("admin");
        }
        if (securityContext.isUserInRole("user")) {
            roles.add("user");
        }
        userInfo.put("roles", roles);

        return Response.ok(userInfo).build();
    }

    @GET
    @Path("/info")
    @Authenticated
    @Operation(summary = "Get user info", description = "Retrieves detailed information about the currently authenticated user")
    @APIResponse(responseCode = "200", description = "User information retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public Response getUserInfo(@Context SecurityContext securityContext,
                                @HeaderParam("X-Auth-Request-User") String authUser,
                                @HeaderParam("X-Auth-Request-Email") String authEmail,
                                @HeaderParam("X-Auth-Request-Groups") String groups,
                                @HeaderParam("X-Auth-Request-Preferred-Username") String preferredUsername) {
        Principal principal = securityContext.getUserPrincipal();
        if (principal == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("principal", principal.getName());
        userInfo.put("authenticated", true);
        
        // Add header information for debugging
        Map<String, String> headers = new HashMap<>();
        headers.put("X-Auth-Request-User", authUser != null ? authUser : "");
        headers.put("X-Auth-Request-Email", authEmail != null ? authEmail : "");
        headers.put("X-Auth-Request-Groups", groups != null ? groups : "");
        headers.put("X-Auth-Request-Preferred-Username", preferredUsername != null ? preferredUsername : "");
        userInfo.put("headers", headers);
        
        if (principal instanceof TraefikPrincipal) {
            TraefikPrincipal traefikPrincipal = (TraefikPrincipal) principal;
            Map<String, String> principalInfo = new HashMap<>();
            principalInfo.put("name", traefikPrincipal.getName());
            if (traefikPrincipal.getEmail() != null) {
                principalInfo.put("email", traefikPrincipal.getEmail());
            }
            if (traefikPrincipal.getPreferredUsername() != null) {
                principalInfo.put("preferredUsername", traefikPrincipal.getPreferredUsername());
            }
            userInfo.put("traefikPrincipal", principalInfo);
        }

        return Response.ok(userInfo).build();
    }
}
