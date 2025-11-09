package com.angryss.idp.application.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class BlueprintCreateDto {

    @NotBlank
    @Size(min = 1, max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    private Boolean isActive;

    private Set<UUID> stackIds;

    @NotNull
    private Set<UUID> supportedCloudProviderIds = new HashSet<>();

    @Valid
    private List<BlueprintResourceCreateDto> resources;

    public BlueprintCreateDto() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Set<UUID> getStackIds() {
        return stackIds;
    }

    public void setStackIds(Set<UUID> stackIds) {
        this.stackIds = stackIds;
    }

    public Set<UUID> getSupportedCloudProviderIds() {
        return supportedCloudProviderIds;
    }

    public void setSupportedCloudProviderIds(Set<UUID> supportedCloudProviderIds) {
        this.supportedCloudProviderIds = supportedCloudProviderIds;
    }

    public List<BlueprintResourceCreateDto> getResources() {
        return resources;
    }

    public void setResources(List<BlueprintResourceCreateDto> resources) {
        this.resources = resources;
    }
}
