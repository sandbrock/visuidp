package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.entities.Domain;
import com.angryss.idp.domain.entities.Stack;
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

@Path("/v1/categories")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Categories", description = "Category management operations")
@Authenticated
@RunOnVirtualThread
public class CategoriesController {

    @GET
    @Operation(summary = "List categories", description = "Retrieves all categories")
    @APIResponse(responseCode = "200", description = "Categories retrieved successfully")
    public List<Category> listCategories() {
        return Category.listAll();
    }

    @POST
    @Transactional
    @Operation(summary = "Create category", description = "Creates a new category under a domain")
    @APIResponse(responseCode = "201", description = "Category created successfully")
    public Response createCategory(Category category) {
        if (category.getId() != null) {
            throw new BadRequestException("ID must not be provided for new categories");
        }
        if (category.getDomain() == null || category.getDomain().getId() == null) {
            throw new BadRequestException("Category must reference a domain");
        }
        var domain = Domain.findById(category.getDomain().getId());
        if (domain == null) {
            throw new BadRequestException("Domain not found: " + category.getDomain().getId());
        }
        // Optional uniqueness check within domain
        if (Category.find("name = ?1 and domain.id = ?2", category.getName(), category.getDomain().getId()).firstResultOptional().isPresent()) {
            throw new BadRequestException("Category with this name already exists in the domain");
        }
        category.setDomain((Domain) domain);
        category.persist();
        return Response.status(Response.Status.CREATED).entity(category).build();
    }

    @GET
    @Path("/{id}/stacks")
    @Operation(summary = "Get category stacks", description = "Retrieves stacks associated with a category")
    @APIResponse(responseCode = "200", description = "Stacks retrieved successfully")
    public List<Stack> getCategoryStacks(@PathParam("id") UUID categoryId) {
        return Stack.findByCategoryId(categoryId);
    }
}
