package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ResourceCategory;
import jakarta.validation.constraints.Size;

public class ResourceTypeUpdateDto {

    @Size(min = 1, max = 200)
    private String displayName;

    @Size(max = 1000)
    private String description;

    private ResourceCategory category;

    private Boolean enabled;

    public ResourceTypeUpdateDto() {
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

    public ResourceCategory getCategory() {
        return category;
    }

    public void setCategory(ResourceCategory category) {
        this.category = category;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
}
