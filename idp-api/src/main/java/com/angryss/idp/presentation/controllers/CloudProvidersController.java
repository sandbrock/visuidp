package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.CloudProviderCreateDto;
import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.CloudProviderUpdateDto;
import com.angryss.idp.application.usecases.CloudProviderService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for cloud provider administration.
 * Provides endpoints for managing cloud providers in the system.
 * All endpoints require admin role.
 */
@Path("/v1/admin/cloud-providers")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Admin - Cloud Providers", description = "Cloud provider administration operations")
@RolesAllowed("admin")
@RunOnVirtualThread
public class CloudProvidersController {

    @Inject
    CloudProviderService cloudProviderService;

    /**
     * List all cloud providers.
     *
     * @return List of all cloud providers
     */
    @GET
    @Operation(summary = "List all cloud providers", description = "Retrieves all cloud providers in the system")
    @APIResponse(responseCode = "200", description = "Cloud providers retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<CloudProviderDto> listAll() {
        return cloudProviderService.listAll();
    }

    /**
     * Get a cloud provider by ID.
     *
     * @param id The cloud provider ID
     * @return The cloud provider
     */
    @GET
    @Path("/{id}")
    @Operation(summary = "Get cloud provider by ID", description = "Retrieves a specific cloud provider by its ID")
    @APIResponse(responseCode = "200", description = "Cloud provider retrieved successfully")
    @APIResponse(responseCode = "404", description = "Cloud provider not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public CloudProviderDto getById(@Parameter(description = "Cloud provider ID") @PathParam("id") UUID id) {
        return cloudProviderService.getById(id);
    }

    /**
     * Create a new cloud provider.
     *
     * @param createDto The cloud provider creation data
     * @return Response with created cloud provider
     */
    @POST
    @Operation(summary = "Create cloud provider", description = "Creates a new cloud provider")
    @APIResponse(responseCode = "201", description = "Cloud provider created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input or cloud provider already exists")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response create(@Valid CloudProviderCreateDto createDto) {
        try {
            CloudProviderDto created = cloudProviderService.create(createDto);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Update an existing cloud provider.
     *
     * @param id The cloud provider ID
     * @param updateDto The cloud provider update data
     * @return The updated cloud provider
     */
    @PUT
    @Path("/{id}")
    @Operation(summary = "Update cloud provider", description = "Updates an existing cloud provider")
    @APIResponse(responseCode = "200", description = "Cloud provider updated successfully")
    @APIResponse(responseCode = "404", description = "Cloud provider not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public CloudProviderDto update(
            @Parameter(description = "Cloud provider ID") @PathParam("id") UUID id,
            @Valid CloudProviderUpdateDto updateDto) {
        return cloudProviderService.update(id, updateDto);
    }

    /**
     * Toggle the enabled status of a cloud provider.
     *
     * @param id The cloud provider ID
     * @param enabled The new enabled status
     * @return Response with no content
     */
    @PUT
    @Path("/{id}/toggle")
    @Operation(summary = "Toggle cloud provider enabled status", description = "Enables or disables a cloud provider")
    @APIResponse(responseCode = "204", description = "Cloud provider status toggled successfully")
    @APIResponse(responseCode = "404", description = "Cloud provider not found")
    @APIResponse(responseCode = "400", description = "Invalid enabled status")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response toggleEnabled(
            @Parameter(description = "Cloud provider ID") @PathParam("id") UUID id,
            @Parameter(description = "Enabled status") @QueryParam("enabled") Boolean enabled,
            @jakarta.ws.rs.core.Context jakarta.ws.rs.core.SecurityContext securityContext,
            @HeaderParam("X-Auth-Request-Groups") String groups) {
        // Debug logging
        System.out.println("=== Toggle Cloud Provider Debug ===");
        System.out.println("Provider ID: " + id);
        System.out.println("Enabled: " + enabled);
        System.out.println("X-Auth-Request-Groups header: " + groups);
        System.out.println("User principal: " + (securityContext.getUserPrincipal() != null ? securityContext.getUserPrincipal().getName() : "null"));
        System.out.println("Is admin: " + securityContext.isUserInRole("admin"));
        System.out.println("Is user: " + securityContext.isUserInRole("user"));
        System.out.println("===================================");
        
        if (enabled == null) {
            throw new BadRequestException("Enabled parameter is required");
        }
        cloudProviderService.toggleEnabled(id, enabled);
        return Response.noContent().build();
    }

    /**
     * List all enabled cloud providers.
     *
     * @return List of enabled cloud providers
     */
    @GET
    @Path("/enabled")
    @Operation(summary = "List enabled cloud providers", description = "Retrieves all enabled cloud providers")
    @APIResponse(responseCode = "200", description = "Enabled cloud providers retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<CloudProviderDto> listEnabled() {
        return cloudProviderService.listEnabled();
    }
}
