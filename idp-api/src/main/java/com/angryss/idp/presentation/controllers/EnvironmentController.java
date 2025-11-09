package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ProvisioningInfoDto;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.services.ProvisionerSelectionService;
import com.angryss.idp.domain.valueobjects.Environment;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
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

@Path("/v1/environment-configs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Environment Configs", description = "Environment configuration and provisioner management")
@Authenticated
public class EnvironmentController {

    @Inject
    ProvisionerSelectionService provisionerService;

    @GET
    @Operation(summary = "Get all environment configurations", description = "Retrieves all environment configurations")
    @APIResponse(responseCode = "200", description = "Environment configurations retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<EnvironmentConfig> getAllEnvironments() {
        return EnvironmentConfig.findActiveEnvironments();
    }

    @GET
    @Path("/{environment}")
    @Operation(summary = "Get environment configuration", description = "Retrieves configuration for a specific environment")
    @APIResponse(responseCode = "200", description = "Environment configuration retrieved successfully")
    @APIResponse(responseCode = "404", description = "Environment not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public EnvironmentConfig getEnvironment(@Parameter(description = "Environment") @PathParam("environment") Environment environment) {
        EnvironmentConfig config = EnvironmentConfig.findByEnvironment(environment);
        if (config == null) {
            throw new NotFoundException("Environment configuration not found: " + environment);
        }
        return config;
    }

    @POST
    @Transactional
    @Operation(summary = "Create environment configuration", description = "Creates a new environment configuration")
    @APIResponse(responseCode = "201", description = "Environment configuration created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden")
    public Response createEnvironment(@Valid EnvironmentConfig environmentConfig) {
        // Check if environment already exists
        if (EnvironmentConfig.findByEnvironment(environmentConfig.getEnvironment()) != null) {
            throw new BadRequestException("Environment configuration already exists: " + environmentConfig.getEnvironment());
        }

        environmentConfig.persist();
        return Response.status(Response.Status.CREATED).entity(environmentConfig).build();
    }

    @PUT
    @Path("/{environment}")
    @Transactional
    @Operation(summary = "Update environment configuration", description = "Updates an existing environment configuration")
    @APIResponse(responseCode = "200", description = "Environment configuration updated successfully")
    @APIResponse(responseCode = "404", description = "Environment not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden")
    public EnvironmentConfig updateEnvironment(@Parameter(description = "Environment") @PathParam("environment") Environment environment,
                                               @Valid EnvironmentConfig updateData) {
        EnvironmentConfig existing = EnvironmentConfig.findByEnvironment(environment);
        if (existing == null) {
            throw new NotFoundException("Environment configuration not found: " + environment);
        }

        existing.setName(updateData.getName());
        existing.setDescription(updateData.getDescription());
        // Cloud type is associated with EnvironmentEntity; not directly set here
        existing.setConfiguration(updateData.getConfiguration());
        existing.setIsActive(updateData.getIsActive());

        existing.persist();
        return existing;
    }

    @DELETE
    @Path("/{environment}")
    @Transactional
    @Operation(summary = "Delete environment configuration", description = "Deletes an environment configuration")
    @APIResponse(responseCode = "204", description = "Environment configuration deleted successfully")
    @APIResponse(responseCode = "404", description = "Environment not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden")
    public Response deleteEnvironment(@Parameter(description = "Environment") @PathParam("environment") Environment environment) {
        EnvironmentConfig config = EnvironmentConfig.findByEnvironment(environment);
        if (config == null) {
            throw new NotFoundException("Environment configuration not found: " + environment);
        }

        config.delete();
        return Response.noContent().build();
    }

    @GET
    @Path("/{environment}/provisioning-info")
    @Operation(summary = "Get provisioning information", description = "Retrieves provisioning information for a stack type in an environment")
    @APIResponse(responseCode = "200", description = "Provisioning information retrieved successfully")
    @APIResponse(responseCode = "404", description = "Environment not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public ProvisioningInfoDto getProvisioningInfo(
            @Parameter(description = "Environment") @PathParam("environment") Environment environment,
            @Parameter(description = "Stack type") @QueryParam("stackType") StackType stackType) {

        if (stackType == null) {
            throw new BadRequestException("stackType query parameter is required");
        }

        String cloudType = provisionerService.getCloudType(environment);
        if (cloudType == null) {
            throw new NotFoundException("Environment configuration not found: " + environment);
        }

        String computeProvisioner = provisionerService.selectComputeProvisioner(stackType, environment);
        String computeType = provisionerService.getComputeType(stackType, environment);

        return new ProvisioningInfoDto(
            stackType,
            environment,
            cloudType,
            computeProvisioner,
            computeType,
            null // Infrastructure provisioner would be determined per resource type
        );
    }

    // Cloud types are exposed via CloudTypesController at /v1/cloud-types
}
