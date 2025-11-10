package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.BlueprintResourceCreateDto;
import com.angryss.idp.application.dtos.BlueprintResourceResponseDto;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration;
import com.angryss.idp.domain.valueobjects.sharedinfra.RelationalDatabaseServerConfiguration;
import com.angryss.idp.domain.valueobjects.sharedinfra.ServiceBusConfiguration;
import com.angryss.idp.domain.valueobjects.sharedinfra.SharedInfrastructureConfiguration;
import io.quarkus.security.Authenticated;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/v1/blueprint-resources")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Blueprint Resources", description = "Manage blueprint resource instances")
@Authenticated
public class BlueprintResourcesController {

    @GET
    @Operation(summary = "List blueprint resources", description = "Retrieves all blueprint resource instances")
    @APIResponse(responseCode = "200", description = "Blueprint resources retrieved successfully")
    public List<BlueprintResourceResponseDto> list() {
        List<BlueprintResource> list = BlueprintResource.listAll();
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @POST
    @Transactional
    @Operation(summary = "Create blueprint resource", description = "Creates a new blueprint resource instance")
    @APIResponse(responseCode = "201", description = "Blueprint resource created successfully")
    @APIResponse(responseCode = "400", description = "Invalid input")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden")
    public Response create(@Valid BlueprintResourceCreateDto dto) {
        ResourceType type = ResourceType.findById(dto.getBlueprintResourceTypeId());
        if (type == null) {
            throw new NotFoundException("Resource type not found: " + dto.getBlueprintResourceTypeId());
        }

        SharedInfrastructureConfiguration cfg = dto.getConfiguration();
        validateConfigurationMatchesType(type, cfg);

        BlueprintResource entity = new BlueprintResource(dto.getName(), dto.getDescription(), type, cfg);
        entity.setCloudType(dto.getCloudType());
        if (dto.getCloudSpecificProperties() != null) {
            entity.setCloudSpecificProperties(dto.getCloudSpecificProperties());
        }
        entity.persist();

        BlueprintResourceResponseDto resp = toResponse(entity);
        return Response.created(URI.create("/v1/blueprint-resources/" + entity.id)).entity(resp).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get blueprint resource by ID", description = "Retrieves a blueprint resource instance by ID")
    @APIResponse(responseCode = "200", description = "Blueprint resource retrieved successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    public BlueprintResourceResponseDto getById(@PathParam("id") UUID id) {
        BlueprintResource entity = BlueprintResource.findById(id);
        if (entity == null) {
            throw new NotFoundException("Blueprint resource not found: " + id);
        }
        return toResponse(entity);
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Update blueprint resource", description = "Updates an existing blueprint resource instance")
    @APIResponse(responseCode = "200", description = "Blueprint resource updated successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    public BlueprintResourceResponseDto update(@PathParam("id") UUID id, @Valid BlueprintResourceCreateDto dto) {
        BlueprintResource entity = BlueprintResource.findById(id);
        if (entity == null) {
            throw new NotFoundException("Blueprint resource not found: " + id);
        }

        ResourceType type = ResourceType.findById(dto.getBlueprintResourceTypeId());
        if (type == null) {
            throw new NotFoundException("Resource type not found: " + dto.getBlueprintResourceTypeId());
        }

        SharedInfrastructureConfiguration cfg = dto.getConfiguration();
        validateConfigurationMatchesType(type, cfg);

        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setResourceType(type);
        entity.setConfiguration(cfg);
        entity.setCloudType(dto.getCloudType());
        if (dto.getCloudSpecificProperties() != null) {
            entity.setCloudSpecificProperties(dto.getCloudSpecificProperties());
        }
        // updatedAt handled by @PreUpdate

        return toResponse(entity);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @Operation(summary = "Delete blueprint resource", description = "Deletes a blueprint resource instance by ID")
    @APIResponse(responseCode = "204", description = "Deleted successfully")
    @APIResponse(responseCode = "404", description = "Not found")
    public Response delete(@PathParam("id") UUID id) {
        BlueprintResource entity = BlueprintResource.findById(id);
        if (entity == null) {
            throw new NotFoundException("Blueprint resource not found: " + id);
        }
        entity.delete();
        return Response.noContent().build();
    }

    private void validateConfigurationMatchesType(ResourceType type, SharedInfrastructureConfiguration cfg) {
        String name = type.name;
        if ("Managed Container Orchestrator".equalsIgnoreCase(name) && !(cfg instanceof ContainerOrchestratorConfiguration)) {
            throw new BadRequestException("configuration.type must be 'container-orchestrator' for Managed Container Orchestrator");
        }
        if ("Relational Database Server".equalsIgnoreCase(name) && !(cfg instanceof RelationalDatabaseServerConfiguration)) {
            throw new BadRequestException("configuration.type must be 'relational-database-server' for Relational Database Server");
        }
        if ("Service Bus".equalsIgnoreCase(name) && !(cfg instanceof ServiceBusConfiguration)) {
            throw new BadRequestException("configuration.type must be 'service-bus' for Service Bus");
        }
    }

    private BlueprintResourceResponseDto toResponse(BlueprintResource s) {
        UUID typeId = s.getResourceType() != null ? s.getResourceType().id : null;
        String typeName = s.getResourceType() != null ? s.getResourceType().name : null;
        return new BlueprintResourceResponseDto(
                s.id,
                s.getName(),
                s.getDescription(),
                typeId,
                typeName,
                s.getConfiguration(),
                s.getCloudType(),
                s.getCloudSpecificProperties()
        );
    }
}
