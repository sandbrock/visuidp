package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.EnvironmentEntity;
import jakarta.transaction.Transactional;
import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Path("/v1/environments")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Environments", description = "Read-only access to available environments")
@Authenticated
public class EnvironmentsController {

    @GET
    @Operation(summary = "List environments", description = "Retrieves all environments")
    @APIResponse(responseCode = "200", description = "Environments retrieved successfully")
    public List<EnvironmentEntity> listEnvironments() {
        return EnvironmentEntity.listAll();
    }
}
