package com.angryss.idp.application.dtos;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for property schema endpoints.
 * Contains metadata about the resource type and cloud provider,
 * along with the list of property schemas.
 */
public class PropertySchemaResponseDto {

    private UUID resourceTypeId;
    private String resourceTypeName;
    private UUID cloudProviderId;
    private String cloudProviderName;
    private List<PropertySchemaDto> properties;

    public PropertySchemaResponseDto() {
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

    public List<PropertySchemaDto> getProperties() {
        return properties;
    }

    public void setProperties(List<PropertySchemaDto> properties) {
        this.properties = properties;
    }
}
