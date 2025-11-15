package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.BlueprintCreateDto;
import com.angryss.idp.application.dtos.BlueprintResponseDto;
import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.application.dtos.PropertySchemaResponseDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.application.usecases.BlueprintService;
import com.angryss.idp.application.usecases.CloudProviderService;
import com.angryss.idp.application.usecases.PropertySchemaService;
import com.angryss.idp.application.usecases.ResourceTypeService;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/v1/blueprints")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Blueprints", description = "Blueprint management operations")
@Authenticated
@RunOnVirtualThread
public class BlueprintsController {

    @Inject
    BlueprintService blueprintService;

    @Inject
    CloudProviderService cloudProviderService;

    @Inject
    ResourceTypeService resourceTypeService;

    @Inject
    PropertySchemaService propertySchemaService;

    @GET
    @Operation(summary = "List blueprints", description = "Retrieves all blueprints")
    @APIResponse(responseCode = "200", description = "Blueprints retrieved successfully")
    public List<BlueprintResponseDto> listBlueprints() {
        return blueprintService.getAllBlueprints();
    }

    @POST
    @Operation(summary = "Create blueprint", description = "Creates a new blueprint")
    @APIResponse(responseCode = "201", description = "Blueprint created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input")
    public Response createBlueprint(BlueprintCreateDto blueprintDto) {
        try {
            BlueprintResponseDto createdBlueprint = blueprintService.createBlueprint(blueprintDto);
            return Response.status(Response.Status.CREATED).entity(createdBlueprint).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get blueprint by ID", description = "Retrieves a blueprint by ID")
    @APIResponse(responseCode = "200", description = "Blueprint retrieved successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    public BlueprintResponseDto getBlueprint(@PathParam("id") UUID id) {
        try {
            return blueprintService.getBlueprintById(id);
        } catch (NotFoundException e) {
            throw new NotFoundException(e.getMessage());
        }
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update blueprint", description = "Updates an existing blueprint")
    @APIResponse(responseCode = "200", description = "Blueprint updated successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    public BlueprintResponseDto updateBlueprint(@PathParam("id") UUID id, BlueprintCreateDto updateDto) {
        try {
            return blueprintService.updateBlueprint(id, updateDto);
        } catch (NotFoundException e) {
            throw new NotFoundException(e.getMessage());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete blueprint", description = "Deletes a blueprint by ID")
    @APIResponse(responseCode = "204", description = "Deleted successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    public Response deleteBlueprint(@PathParam("id") UUID id) {
        try {
            blueprintService.deleteBlueprint(id);
            return Response.noContent().build();
        } catch (NotFoundException e) {
            throw new NotFoundException(e.getMessage());
        }
    }

    @GET
    @Path("/available-cloud-providers")
    @Operation(summary = "Get available cloud providers", description = "Retrieves all enabled cloud providers for blueprint creation")
    @APIResponse(responseCode = "200", description = "Cloud providers retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<CloudProviderDto> getAvailableCloudProviders() {
        return cloudProviderService.listEnabled();
    }

    @GET
    @Path("/available-resource-types")
    @Operation(summary = "Get available resource types", description = "Retrieves enabled resource types for blueprints (SHARED and BOTH categories)")
    @APIResponse(responseCode = "200", description = "Resource types retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<ResourceTypeDto> getAvailableResourceTypes() {
        // Get enabled resource types with SHARED or BOTH categories
        return resourceTypeService.listEnabledForUser().stream()
            .filter(rt -> rt.getCategory() == ResourceCategory.SHARED || 
                         rt.getCategory() == ResourceCategory.BOTH)
            .collect(Collectors.toList());
    }

    @GET
    @Path("/resource-schema/{resourceTypeId}/{cloudProviderId}")
    @Operation(summary = "Get resource property schema", description = "Retrieves property schema for a specific resource type and cloud provider combination")
    @APIResponse(responseCode = "200", description = "Property schema retrieved successfully")
    @APIResponse(responseCode = "404", description = "Mapping not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public PropertySchemaResponseDto getResourceSchema(
            @Parameter(description = "Resource Type ID") @PathParam("resourceTypeId") UUID resourceTypeId,
            @Parameter(description = "Cloud Provider ID") @PathParam("cloudProviderId") UUID cloudProviderId) {
        return propertySchemaService.getSchemaResponse(resourceTypeId, cloudProviderId);
    }
}
