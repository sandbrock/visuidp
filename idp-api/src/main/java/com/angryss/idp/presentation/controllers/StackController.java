package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.application.dtos.PropertySchemaResponseDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.application.dtos.StackCreateDto;
import com.angryss.idp.application.dtos.StackResponseDto;
import com.angryss.idp.application.usecases.CloudProviderService;
import com.angryss.idp.application.usecases.PropertySchemaService;
import com.angryss.idp.application.usecases.ResourceTypeService;
import com.angryss.idp.application.usecases.StackService;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Path("/v1/stacks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Stacks", description = "Stack management operations")
@Authenticated
public class StackController {

    @Inject
    StackService stackService;

    @Inject
    CloudProviderService cloudProviderService;

    @Inject
    ResourceTypeService resourceTypeService;

    @Inject
    PropertySchemaService propertySchemaService;

    @POST
    @Operation(summary = "Create a new stack", description = "Creates a new developer stack")
    @APIResponse(responseCode = "201", description = "Stack created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input or stack already exists")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public Response createStack(@Valid StackCreateDto createDto,
                               @Context SecurityContext securityContext) {
        String effectiveUser = securityContext != null && securityContext.getUserPrincipal() != null
            ? securityContext.getUserPrincipal().getName() : null;
        if (effectiveUser == null || effectiveUser.trim().isEmpty()) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
        StackResponseDto createdStack = stackService.createStack(createDto, effectiveUser);
        return Response.status(Response.Status.CREATED).entity(createdStack).build();
    }

    @GET
    @Operation(summary = "Get all stacks", description = "Retrieves all stacks accessible to the user")
    @APIResponse(responseCode = "200", description = "Stacks retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<StackResponseDto> getAllStacks(@Context SecurityContext securityContext) {
        String effectiveUser = securityContext != null && securityContext.getUserPrincipal() != null
            ? securityContext.getUserPrincipal().getName() : null;
        if (effectiveUser == null || effectiveUser.trim().isEmpty()) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
        // All authenticated users can access all stacks
        return stackService.getAllStacks();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get stack by ID", description = "Retrieves a specific stack by its ID")
    @APIResponse(responseCode = "200", description = "Stack retrieved successfully")
    @APIResponse(responseCode = "404", description = "Stack not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public StackResponseDto getStackById(@Parameter(description = "Stack ID") @PathParam("id") UUID id) {
        return stackService.getStackById(id);
    }

    @GET
    @Path("/type/{stackType}")
    @Operation(summary = "Get stacks by type", description = "Retrieves stacks filtered by stack type")
    @APIResponse(responseCode = "200", description = "Stacks retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<StackResponseDto> getStacksByType(@Parameter(description = "Stack type") @PathParam("stackType") StackType stackType) {
        return stackService.getStacksByType(stackType);
    }

    // Environment-based endpoint removed

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update stack", description = "Updates an existing stack")
    @APIResponse(responseCode = "200", description = "Stack updated successfully")
    @APIResponse(responseCode = "404", description = "Stack not found")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public StackResponseDto updateStack(@Parameter(description = "Stack ID") @PathParam("id") UUID id,
                                        @Valid StackCreateDto updateDto,
                                        @Context SecurityContext securityContext) {
        String effectiveUser = securityContext != null && securityContext.getUserPrincipal() != null
            ? securityContext.getUserPrincipal().getName() : null;
        if (effectiveUser == null || effectiveUser.trim().isEmpty()) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
        return stackService.updateStack(id, updateDto, effectiveUser);
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete stack", description = "Deletes an existing stack")
    @APIResponse(responseCode = "204", description = "Stack deleted successfully")
    @APIResponse(responseCode = "404", description = "Stack not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public Response deleteStack(@Parameter(description = "Stack ID") @PathParam("id") UUID id,
                                @Context SecurityContext securityContext) {
        String effectiveUser = securityContext != null && securityContext.getUserPrincipal() != null
            ? securityContext.getUserPrincipal().getName() : null;
        if (effectiveUser == null || effectiveUser.trim().isEmpty()) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
        stackService.deleteStack(id, effectiveUser);
        return Response.noContent().build();
    }

    // Promote endpoint removed

    @GET
    @Path("/available-cloud-providers")
    @Operation(summary = "Get available cloud providers", description = "Retrieves all enabled cloud providers for stack creation")
    @APIResponse(responseCode = "200", description = "Cloud providers retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<CloudProviderDto> getAvailableCloudProviders() {
        return cloudProviderService.listEnabled();
    }

    @GET
    @Path("/available-resource-types")
    @Operation(summary = "Get available resource types", description = "Retrieves enabled resource types for stacks (NON_SHARED and BOTH categories)")
    @APIResponse(responseCode = "200", description = "Resource types retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<ResourceTypeDto> getAvailableResourceTypes() {
        // Get enabled resource types with NON_SHARED or BOTH categories
        return resourceTypeService.listEnabledForUser().stream()
            .filter(rt -> rt.getCategory() == ResourceCategory.NON_SHARED || 
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
