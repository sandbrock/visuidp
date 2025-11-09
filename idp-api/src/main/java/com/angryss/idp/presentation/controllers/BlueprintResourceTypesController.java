package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.ResourceType;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/v1/blueprint-resource-types")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Blueprint Resource Types", description = "Read-only access to available blueprint resource types")
@Authenticated
public class BlueprintResourceTypesController {

    @GET
    @Operation(summary = "List blueprint resource types", description = "Retrieves all blueprint resource types")
    @APIResponse(responseCode = "200", description = "Blueprint resource types retrieved successfully")
    public List<ResourceType> listBlueprintResourceTypes() {
        return ResourceType.listAll();
    }
}
