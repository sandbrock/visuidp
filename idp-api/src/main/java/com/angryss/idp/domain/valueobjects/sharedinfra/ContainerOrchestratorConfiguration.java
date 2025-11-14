package com.angryss.idp.domain.valueobjects.sharedinfra;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Configuration for a Managed Container Orchestrator (e.g., Kubernetes, OpenShift).
 */
public class ContainerOrchestratorConfiguration extends SharedInfrastructureConfiguration {
    @NotBlank
    @Size(max = 100)
    private String cloudServiceName; // Name/identifier for the container orchestrator

    public String getCloudServiceName() {
        return cloudServiceName;
    }

    public void setCloudServiceName(String cloudServiceName) {
        this.cloudServiceName = cloudServiceName;
    }
}
