package com.angryss.idp.domain.valueobjects.sharedinfra;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Configuration for a Storage resource (e.g., S3, Azure Blob Storage, GCS).
 */
public class StorageConfiguration extends SharedInfrastructureConfiguration {
    @NotBlank
    @Size(max = 100)
    private String cloudServiceName; // Name/identifier for the storage resource

    public String getCloudServiceName() {
        return cloudServiceName;
    }

    public void setCloudServiceName(String cloudServiceName) {
        this.cloudServiceName = cloudServiceName;
    }
}
