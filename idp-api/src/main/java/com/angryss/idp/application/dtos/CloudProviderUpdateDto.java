package com.angryss.idp.application.dtos;

import jakarta.validation.constraints.Size;

public class CloudProviderUpdateDto {

    @Size(min = 1, max = 200)
    private String displayName;

    @Size(max = 1000)
    private String description;

    private Boolean enabled;

    public CloudProviderUpdateDto() {
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
}
