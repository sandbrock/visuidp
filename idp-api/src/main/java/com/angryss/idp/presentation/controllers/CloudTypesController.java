package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.CloudProvider;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/v1/cloud-types")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Cloud Types", description = "Read-only access to available cloud types")
@Authenticated
public class CloudTypesController {

    @GET
    @Operation(summary = "List cloud types", description = "Retrieves all cloud providers")
    @APIResponse(responseCode = "200", description = "Cloud providers retrieved successfully")
    public List<CloudProvider> listCloudTypes() {
        return CloudProvider.listAll();
    }
}
