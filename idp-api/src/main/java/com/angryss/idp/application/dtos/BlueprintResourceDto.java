package com.angryss.idp.application.dtos;

import java.util.UUID;

/**
 * Simplified DTO for blueprint resource information used in stack responses.
 * Contains only the essential fields needed for resource selection and display.
 */
public class BlueprintResourceDto {
    private UUID id;
    private String name;
    private ResourceTypeDto resourceType;

    public BlueprintResourceDto() {}

    public BlueprintResourceDto(UUID id, String name, ResourceTypeDto resourceType) {
        this.id = id;
        this.name = name;
        this.resourceType = resourceType;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ResourceTypeDto getResourceType() {
        return resourceType;
    }

    public void setResourceType(ResourceTypeDto resourceType) {
        this.resourceType = resourceType;
    }
}
