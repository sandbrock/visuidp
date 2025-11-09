package com.angryss.idp.application.dtos;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class BlueprintResponseDto {
    private UUID id;
    private String name;
    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<UUID> stackIds;
    private Set<UUID> supportedCloudProviderIds = new HashSet<>();
    private List<BlueprintResourceResponseDto> resources;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean active) { isActive = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Set<UUID> getStackIds() { return stackIds; }
    public void setStackIds(Set<UUID> stackIds) { this.stackIds = stackIds; }

    public Set<UUID> getSupportedCloudProviderIds() { return supportedCloudProviderIds; }
    public void setSupportedCloudProviderIds(Set<UUID> supportedCloudProviderIds) { this.supportedCloudProviderIds = supportedCloudProviderIds; }

    public List<BlueprintResourceResponseDto> getResources() { return resources; }
    public void setResources(List<BlueprintResourceResponseDto> resources) { this.resources = resources; }
}

