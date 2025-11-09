package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ResourceTypeCloudMappingCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingUpdateDto;
import com.angryss.idp.application.usecases.ResourceTypeCloudMappingService;
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
 * REST controller for resource type cloud mapping administration.
 * Provides endpoints for managing mappings between resource types and cloud providers.
 * All endpoints require admin role.
 */
@Path("/v1/admin/resource-type-cloud-mappings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Admin - Resource Type Cloud Mappings", description = "Resource type cloud mapping administration operations")
@RolesAllowed("admin")
@RunOnVirtualThread
public class ResourceTypeCloudMappingsController {

    @Inject
    ResourceTypeCloudMappingService mappingService;

    /**
     * List all resource type cloud mappings.
     *
     * @return List of all mappings
     */
    @GET
    @Operation(summary = "List all resource type cloud mappings", description = "Retrieves all mappings between resource types and cloud providers")
    @APIResponse(responseCode = "200", description = "Mappings retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeCloudMappingDto> listAll() {
        return mappingService.listAll();
    }

    /**
     * Get a resource type cloud mapping by ID.
     *
     * @param id The mapping ID
     * @return The mapping
     */
    @GET
    @Path("/{id}")
    @Operation(summary = "Get mapping by ID", description = "Retrieves a specific resource type cloud mapping by its ID")
    @APIResponse(responseCode = "200", description = "Mapping retrieved successfully")
    @APIResponse(responseCode = "404", description = "Mapping not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public ResourceTypeCloudMappingDto getById(@Parameter(description = "Mapping ID") @PathParam("id") UUID id) {
        return mappingService.getById(id);
    }

    /**
     * Create a new resource type cloud mapping.
     *
     * @param createDto The mapping creation data
     * @return Response with created mapping
     */
    @POST
    @Operation(summary = "Create mapping", description = "Creates a new mapping between a resource type and cloud provider")
    @APIResponse(responseCode = "201", description = "Mapping created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input or mapping already exists")
    @APIResponse(responseCode = "404", description = "Resource type or cloud provider not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response create(@Valid ResourceTypeCloudMappingCreateDto createDto) {
        try {
            ResourceTypeCloudMappingDto created = mappingService.create(createDto);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Update an existing resource type cloud mapping.
     *
     * @param id The mapping ID
     * @param updateDto The mapping update data
     * @return The updated mapping
     */
    @PUT
    @Path("/{id}")
    @Operation(summary = "Update mapping", description = "Updates an existing resource type cloud mapping")
    @APIResponse(responseCode = "200", description = "Mapping updated successfully")
    @APIResponse(responseCode = "404", description = "Mapping not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public ResourceTypeCloudMappingDto update(
            @Parameter(description = "Mapping ID") @PathParam("id") UUID id,
            @Valid ResourceTypeCloudMappingUpdateDto updateDto) {
        return mappingService.update(id, updateDto);
    }

    /**
     * Toggle the enabled status of a resource type cloud mapping.
     *
     * @param id The mapping ID
     * @param enabled The new enabled status
     * @return Response with no content
     */
    @PATCH
    @Path("/{id}/toggle")
    @Operation(summary = "Toggle mapping enabled status", description = "Enables or disables a resource type cloud mapping")
    @APIResponse(responseCode = "204", description = "Mapping status toggled successfully")
    @APIResponse(responseCode = "404", description = "Mapping not found")
    @APIResponse(responseCode = "400", description = "Invalid enabled status or mapping is incomplete")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response toggleEnabled(
            @Parameter(description = "Mapping ID") @PathParam("id") UUID id,
            @Parameter(description = "Enabled status") @QueryParam("enabled") Boolean enabled) {
        if (enabled == null) {
            throw new BadRequestException("Enabled parameter is required");
        }
        try {
            mappingService.toggleEnabled(id, enabled);
            return Response.noContent().build();
        } catch (IllegalStateException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * List all mappings for a specific resource type.
     *
     * @param resourceTypeId The resource type ID
     * @return List of mappings for the resource type
     */
    @GET
    @Path("/resource-type/{resourceTypeId}")
    @Operation(summary = "List mappings by resource type", description = "Retrieves all mappings for a specific resource type")
    @APIResponse(responseCode = "200", description = "Mappings retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeCloudMappingDto> listByResourceType(
            @Parameter(description = "Resource type ID") @PathParam("resourceTypeId") UUID resourceTypeId) {
        return mappingService.listByResourceType(resourceTypeId);
    }

    /**
     * List all mappings for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider ID
     * @return List of mappings for the cloud provider
     */
    @GET
    @Path("/cloud-provider/{cloudProviderId}")
    @Operation(summary = "List mappings by cloud provider", description = "Retrieves all mappings for a specific cloud provider")
    @APIResponse(responseCode = "200", description = "Mappings retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeCloudMappingDto> listByCloudProvider(
            @Parameter(description = "Cloud provider ID") @PathParam("cloudProviderId") UUID cloudProviderId) {
        return mappingService.listByCloudProvider(cloudProviderId);
    }
}
