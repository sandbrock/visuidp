package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.entities.Domain;
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

@Path("/v1/domains")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Domains", description = "Domain management operations")
@Authenticated
@RunOnVirtualThread
public class DomainsController {

    @GET
    @Operation(summary = "List domains", description = "Retrieves all domains")
    @APIResponse(responseCode = "200", description = "Domains retrieved successfully")
    public List<Domain> listDomains() {
        return Domain.listAll();
    }

    @POST
    @Transactional
    @Operation(summary = "Create domain", description = "Creates a new domain")
    @APIResponse(responseCode = "201", description = "Domain created successfully")
    public Response createDomain(Domain domain) {
        if (domain.getId() != null) {
            throw new BadRequestException("ID must not be provided for new domains");
        }
        if (Domain.find("name", domain.getName()).firstResultOptional().isPresent()) {
            throw new BadRequestException("Domain with this name already exists");
        }
        domain.persist();
        return Response.status(Response.Status.CREATED).entity(domain).build();
    }

    @GET
    @Path("/{id}/categories")
    @Operation(summary = "Get domain categories", description = "Retrieves categories for a domain")
    @APIResponse(responseCode = "200", description = "Categories retrieved successfully")
    public List<Category> getDomainCategories(@PathParam("id") UUID domainId) {
        return Category.find("domain.id", domainId).list();
    }
}
