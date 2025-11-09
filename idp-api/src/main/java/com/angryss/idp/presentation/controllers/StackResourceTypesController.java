package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/v1/stack-resource-types")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Stack Resource Types", description = "Read-only access to available stack resource types")
@Authenticated
public class StackResourceTypesController {

    @GET
    @Operation(summary = "List stack resource types", description = "Retrieves all non-shared resource types")
    @APIResponse(responseCode = "200", description = "Stack resource types retrieved successfully")
    public List<ResourceType> listStackResourceTypes() {
        return ResourceType.find("category", ResourceCategory.NON_SHARED).list();
    }
}

