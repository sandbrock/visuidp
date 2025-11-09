package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ResourceTypeCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.application.dtos.ResourceTypeUpdateDto;
import com.angryss.idp.application.usecases.ResourceTypeService;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
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
 * REST controller for resource type administration.
 * Provides endpoints for managing resource types in the system.
 * All endpoints require admin role.
 */
@Path("/v1/admin/resource-types")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Admin - Resource Types", description = "Resource type administration operations")
@RolesAllowed("admin")
@RunOnVirtualThread
public class ResourceTypesController {

    @Inject
    ResourceTypeService resourceTypeService;

    /**
     * List all resource types.
     *
     * @return List of all resource types
     */
    @GET
    @Operation(summary = "List all resource types", description = "Retrieves all resource types in the system")
    @APIResponse(responseCode = "200", description = "Resource types retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeDto> listAll() {
        return resourceTypeService.listAll();
    }

    /**
     * Get a resource type by ID.
     *
     * @param id The resource type ID
     * @return The resource type
     */
    @GET
    @Path("/{id}")
    @Operation(summary = "Get resource type by ID", description = "Retrieves a specific resource type by its ID")
    @APIResponse(responseCode = "200", description = "Resource type retrieved successfully")
    @APIResponse(responseCode = "404", description = "Resource type not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public ResourceTypeDto getById(@Parameter(description = "Resource type ID") @PathParam("id") UUID id) {
        return resourceTypeService.getById(id);
    }

    /**
     * Create a new resource type.
     *
     * @param createDto The resource type creation data
     * @return Response with created resource type
     */
    @POST
    @Operation(summary = "Create resource type", description = "Creates a new resource type")
    @APIResponse(responseCode = "201", description = "Resource type created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input or resource type already exists")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response create(@Valid ResourceTypeCreateDto createDto) {
        try {
            ResourceTypeDto created = resourceTypeService.create(createDto);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Update an existing resource type.
     *
     * @param id The resource type ID
     * @param updateDto The resource type update data
     * @return The updated resource type
     */
    @PUT
    @Path("/{id}")
    @Operation(summary = "Update resource type", description = "Updates an existing resource type")
    @APIResponse(responseCode = "200", description = "Resource type updated successfully")
    @APIResponse(responseCode = "404", description = "Resource type not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public ResourceTypeDto update(
            @Parameter(description = "Resource type ID") @PathParam("id") UUID id,
            @Valid ResourceTypeUpdateDto updateDto) {
        return resourceTypeService.update(id, updateDto);
    }

    /**
     * Toggle the enabled status of a resource type.
     *
     * @param id The resource type ID
     * @param enabled The new enabled status
     * @return Response with no content
     */
    @PATCH
    @Path("/{id}/toggle")
    @Operation(summary = "Toggle resource type enabled status", description = "Enables or disables a resource type")
    @APIResponse(responseCode = "204", description = "Resource type status toggled successfully")
    @APIResponse(responseCode = "404", description = "Resource type not found")
    @APIResponse(responseCode = "400", description = "Invalid enabled status")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response toggleEnabled(
            @Parameter(description = "Resource type ID") @PathParam("id") UUID id,
            @Parameter(description = "Enabled status") @QueryParam("enabled") Boolean enabled) {
        if (enabled == null) {
            throw new BadRequestException("Enabled parameter is required");
        }
        resourceTypeService.toggleEnabled(id, enabled);
        return Response.noContent().build();
    }

    /**
     * List resource types by category.
     *
     * @param category The resource category
     * @return List of resource types in the specified category
     */
    @GET
    @Path("/category/{category}")
    @Operation(summary = "List resource types by category", description = "Retrieves resource types filtered by category")
    @APIResponse(responseCode = "200", description = "Resource types retrieved successfully")
    @APIResponse(responseCode = "400", description = "Invalid category")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeDto> listByCategory(
            @Parameter(description = "Resource category (SHARED, NON_SHARED, BOTH)") @PathParam("category") ResourceCategory category) {
        return resourceTypeService.listByCategory(category);
    }
}
