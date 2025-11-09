package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.services.ProvisionerSelectionService;
import com.angryss.idp.domain.services.StackValidationService;
import com.angryss.idp.domain.valueobjects.Environment;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Path("/v1/stack-types")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Stack Types", description = "Stack type information and validation")
public class StackTypesController {

    @Inject
    StackValidationService validationService;

    @Inject
    ProvisionerSelectionService provisionerService;

    @GET
    @Operation(summary = "Get all stack types", description = "Retrieves all available stack types")
    @APIResponse(responseCode = "200", description = "Stack types retrieved successfully")
    public List<Map<String, Object>> getAllStackTypes() {
        return Arrays.stream(StackType.values())
            .map(this::mapStackTypeToResponse)
            .toList();
    }

    @GET
    @Path("/{stackType}")
    @Operation(summary = "Get stack type details", description = "Retrieves detailed information about a specific stack type")
    @APIResponse(responseCode = "200", description = "Stack type details retrieved successfully")
    @APIResponse(responseCode = "404", description = "Stack type not found")
    public Map<String, Object> getStackTypeDetails(@Parameter(description = "Stack type") @PathParam("stackType") StackType stackType) {
        return mapStackTypeToResponse(stackType);
    }

    @GET
    @Path("/{stackType}/supported-languages")
    @Authenticated
    @Operation(summary = "Get supported programming languages", description = "Retrieves supported programming languages for a stack type")
    @APIResponse(responseCode = "200", description = "Supported languages retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public List<ProgrammingLanguage> getSupportedLanguages(@Parameter(description = "Stack type") @PathParam("stackType") StackType stackType) {
        return validationService.getSupportedLanguages(stackType);
    }

    @GET
    @Path("/{stackType}/compute-platform")
    @Authenticated
    @Operation(summary = "Get compute platform", description = "Retrieves the compute platform for a stack type in a given environment")
    @APIResponse(responseCode = "200", description = "Compute platform retrieved successfully")
    @APIResponse(responseCode = "404", description = "Environment not found")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    public Map<String, String> getComputePlatform(
            @Parameter(description = "Stack type") @PathParam("stackType") StackType stackType,
            @Parameter(description = "Target environment") @QueryParam("environment") Environment environment) {
        
        if (environment == null) {
            throw new BadRequestException("environment query parameter is required");
        }

        try {
            String computeProvisioner = provisionerService.selectComputeProvisioner(stackType, environment);
            String computeType = provisionerService.getComputeType(stackType, environment);
            
            return Map.of(
                "stackType", stackType.name(),
                "environment", environment.name(),
                "computeType", computeType != null ? computeType : "none",
                "computeProvisioner", computeProvisioner != null ? computeProvisioner : "none"
            );
        } catch (IllegalArgumentException e) {
            throw new NotFoundException("Environment configuration not found: " + environment);
        }
    }

    private Map<String, Object> mapStackTypeToResponse(StackType stackType) {
        var defaultLanguage = validationService.getDefaultLanguage(stackType);
        return Map.of(
            "name", stackType.name(),
            "displayName", stackType.getDisplayName(),
            "supportsPublicAccess", validationService.isPublicSupported(stackType),
            "requiresProgrammingLanguage", validationService.isProgrammingLanguageRequired(stackType),
            "supportedLanguages", validationService.getSupportedLanguages(stackType),
            "defaultLanguage", defaultLanguage != null ? defaultLanguage.name() : "NONE",
            "requiresEventConfiguration", validationService.requiresEventConfiguration(stackType),
            "requiresApiConfiguration", validationService.requiresApiConfiguration(stackType)
        );
    }
}
