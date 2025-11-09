package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.StackCollection;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.UUID;

@Path("/v1/stack-collections")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Stack Collections", description = "Stack collection management operations")
@Authenticated
@RunOnVirtualThread
public class StackCollectionsController {

    @GET
    @Operation(summary = "List collections", description = "Retrieves all stack collections")
    @APIResponse(responseCode = "200", description = "Collections retrieved successfully")
    public List<StackCollection> listCollections() {
        return StackCollection.listAll();
    }

    @POST
    @Transactional
    @Operation(summary = "Create collection", description = "Creates a new stack collection")
    @APIResponse(responseCode = "201", description = "Collection created successfully")
    public Response createCollection(StackCollection collection) {
        if (collection.getId() != null) {
            throw new BadRequestException("ID must not be provided for new collections");
        }
        if (StackCollection.find("name", collection.getName()).firstResultOptional().isPresent()) {
            throw new BadRequestException("Collection with this name already exists");
        }
        collection.persist();
        return Response.status(Response.Status.CREATED).entity(collection).build();
    }

    @GET
    @Path("/{id}/stacks")
    @Operation(summary = "Get collection stacks", description = "Retrieves stacks in a collection")
    @APIResponse(responseCode = "200", description = "Stacks retrieved successfully")
    public List<Stack> getCollectionStacks(@PathParam("id") UUID collectionId) {
        return Stack.findByStackCollectionId(collectionId);
    }
}
