package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class ResourceTypeCloudMappingCreateDto {

    @NotNull
    private UUID resourceTypeId;

    @NotNull
    private UUID cloudProviderId;

    @NotBlank
    @Size(min = 1, max = 2048)
    private String terraformModuleLocation;

    @NotNull
    private ModuleLocationType moduleLocationType;

    @NotNull
    private Boolean enabled;

    public ResourceTypeCloudMappingCreateDto() {
    }

    public UUID getResourceTypeId() {
        return resourceTypeId;
    }

    public void setResourceTypeId(UUID resourceTypeId) {
        this.resourceTypeId = resourceTypeId;
    }

    public UUID getCloudProviderId() {
        return cloudProviderId;
    }

    public void setCloudProviderId(UUID cloudProviderId) {
        this.cloudProviderId = cloudProviderId;
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
}
