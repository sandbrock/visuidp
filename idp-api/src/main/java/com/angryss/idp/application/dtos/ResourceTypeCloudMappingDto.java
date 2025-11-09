package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ModuleLocationType;

import java.time.LocalDateTime;
import java.util.UUID;

public class ResourceTypeCloudMappingDto {

    private UUID id;
    private UUID resourceTypeId;
    private String resourceTypeName;
    private UUID cloudProviderId;
    private String cloudProviderName;
    private String terraformModuleLocation;
    private ModuleLocationType moduleLocationType;
    private Boolean enabled;
    private Boolean isComplete;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ResourceTypeCloudMappingDto() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getResourceTypeId() {
        return resourceTypeId;
    }

    public void setResourceTypeId(UUID resourceTypeId) {
        this.resourceTypeId = resourceTypeId;
    }

    public String getResourceTypeName() {
        return resourceTypeName;
    }

    public void setResourceTypeName(String resourceTypeName) {
        this.resourceTypeName = resourceTypeName;
    }

    public UUID getCloudProviderId() {
        return cloudProviderId;
    }

    public void setCloudProviderId(UUID cloudProviderId) {
        this.cloudProviderId = cloudProviderId;
    }

    public String getCloudProviderName() {
        return cloudProviderName;
    }

    public void setCloudProviderName(String cloudProviderName) {
        this.cloudProviderName = cloudProviderName;
    }

    public String getTerraformModuleLocation() {
        return terraformModuleLocation;
    }

    public void setTerraformModuleLocation(String terraformModuleLocation) {
        this.terraformModuleLocation = terraformModuleLocation;
    }

    public ModuleLocationType getModuleLocationType() {
        return moduleLocationType;
    }

    public void setModuleLocationType(ModuleLocationType moduleLocationType) {
        this.moduleLocationType = moduleLocationType;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getIsComplete() {
        return isComplete;
    }

    public void setIsComplete(Boolean isComplete) {
        this.isComplete = isComplete;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
