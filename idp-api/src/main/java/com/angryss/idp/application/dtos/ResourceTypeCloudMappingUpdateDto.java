package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import jakarta.validation.constraints.Size;

public class ResourceTypeCloudMappingUpdateDto {

    @Size(min = 1, max = 2048)
    private String terraformModuleLocation;

    private ModuleLocationType moduleLocationType;

    private Boolean enabled;

    public ResourceTypeCloudMappingUpdateDto() {
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
