package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.PropertySchemaCreateDto;
import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.application.dtos.PropertySchemaUpdateDto;
import com.angryss.idp.application.usecases.PropertySchemaService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for property schema administration.
 * Provides endpoints for managing property schemas associated with resource type cloud mappings.
 * All endpoints require admin role.
 */
@Path("/v1/admin/property-schemas")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Admin - Property Schemas", description = "Property schema administration operations")
@RolesAllowed("admin")
@RunOnVirtualThread
public class PropertySchemasController {

    @Inject
    PropertySchemaService propertySchemaService;

    /**
     * List all property schemas for a specific mapping.
     *
     * @param mappingId The resource type cloud mapping ID
     * @return List of property schemas for the mapping
     */
    @GET
    @Path("/mapping/{mappingId}")
    @Operation(summary = "List property schemas by mapping", description = "Retrieves all property schemas for a specific resource type cloud mapping")
    @APIResponse(responseCode = "200", description = "Property schemas retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<PropertySchemaDto> listByMapping(
            @Parameter(description = "Resource type cloud mapping ID") @PathParam("mappingId") UUID mappingId) {
        return propertySchemaService.listByMapping(mappingId);
    }

    /**
     * Get a property schema by ID.
     *
     * @param id The property schema ID
     * @return The property schema
     */
    @GET
    @Path("/{id}")
    @Operation(summary = "Get property schema by ID", description = "Retrieves a specific property schema by its ID")
    @APIResponse(responseCode = "200", description = "Property schema retrieved successfully")
    @APIResponse(responseCode = "404", description = "Property schema not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public PropertySchemaDto getById(@Parameter(description = "Property schema ID") @PathParam("id") UUID id) {
        return propertySchemaService.getById(id);
    }

    /**
     * Create a new property schema.
     *
     * @param createDto The property schema creation data
     * @return Response with created property schema
     */
    @POST
    @Operation(summary = "Create property schema", description = "Creates a new property schema for a resource type cloud mapping")
    @APIResponse(responseCode = "201", description = "Property schema created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input or property name already exists for mapping")
    @APIResponse(responseCode = "404", description = "Resource type cloud mapping not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response create(
            @RequestBody(description = "Property schema creation data", required = true) 
            @Valid PropertySchemaCreateDto createDto) {
        try {
            PropertySchemaDto created = propertySchemaService.create(createDto);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Update an existing property schema.
     *
     * @param id The property schema ID
     * @param updateDto The property schema update data
     * @return The updated property schema
     */
    @PUT
    @Path("/{id}")
    @Operation(summary = "Update property schema", description = "Updates an existing property schema")
    @APIResponse(responseCode = "200", description = "Property schema updated successfully")
    @APIResponse(responseCode = "404", description = "Property schema not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public PropertySchemaDto update(
            @Parameter(description = "Property schema ID") @PathParam("id") UUID id,
            @RequestBody(description = "Property schema update data", required = true)
            @Valid PropertySchemaUpdateDto updateDto) {
        return propertySchemaService.update(id, updateDto);
    }

    /**
     * Delete a property schema.
     *
     * @param id The property schema ID
     * @return Response with no content
     */
    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete property schema", description = "Deletes a property schema")
    @APIResponse(responseCode = "204", description = "Property schema deleted successfully")
    @APIResponse(responseCode = "404", description = "Property schema not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response delete(@Parameter(description = "Property schema ID") @PathParam("id") UUID id) {
        propertySchemaService.delete(id);
        return Response.noContent().build();
    }

    /**
     * Bulk create property schemas for a mapping.
     *
     * @param mappingId The resource type cloud mapping ID
     * @param createDtos List of property schema creation data
     * @return Response with created property schemas
     */
    @POST
    @Path("/bulk")
    @Operation(summary = "Bulk create property schemas", description = "Creates multiple property schemas for a mapping in a single transaction")
    @APIResponse(responseCode = "201", description = "Property schemas created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input, duplicate property names, or property names already exist for mapping")
    @APIResponse(responseCode = "404", description = "Resource type cloud mapping not found")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response bulkCreate(
            @Parameter(description = "Resource type cloud mapping ID", required = true) 
            @QueryParam("mappingId") UUID mappingId,
            @RequestBody(description = "List of property schema creation data", required = true)
            List<PropertySchemaCreateDto> createDtos) {
        if (mappingId == null) {
            throw new BadRequestException("mappingId query parameter is required");
        }
        if (createDtos == null || createDtos.isEmpty()) {
            throw new BadRequestException("Request body must contain at least one property schema");
        }
        
        // Set mappingId on each DTO before validation
        for (PropertySchemaCreateDto dto : createDtos) {
            dto.setMappingId(mappingId);
        }
        
        try {
            List<PropertySchemaDto> created = propertySchemaService.bulkCreate(mappingId, createDtos);
            return Response.status(Response.Status.CREATED).entity(created).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }
}
