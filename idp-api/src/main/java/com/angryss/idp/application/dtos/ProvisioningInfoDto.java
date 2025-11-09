package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.Environment;
import com.angryss.idp.domain.valueobjects.StackType;

public class ProvisioningInfoDto {

    private StackType stackType;
    private Environment environment;
    private String cloudType;
    private String computeProvisioner;
    private String computeType;
    private String infrastructureProvisioner;

    public ProvisioningInfoDto() {
    }

    public ProvisioningInfoDto(StackType stackType, Environment environment, String cloudType,
                               String computeProvisioner, String computeType, String infrastructureProvisioner) {
        this.stackType = stackType;
        this.environment = environment;
        this.cloudType = cloudType;
        this.computeProvisioner = computeProvisioner;
        this.computeType = computeType;
        this.infrastructureProvisioner = infrastructureProvisioner;
    }

    public StackType getStackType() {
        return stackType;
    }

    public void setStackType(StackType stackType) {
        this.stackType = stackType;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public String getCloudType() { return cloudType; }
    public void setCloudType(String cloudType) { this.cloudType = cloudType; }

    public String getComputeProvisioner() {
        return computeProvisioner;
    }

    public void setComputeProvisioner(String computeProvisioner) {
        this.computeProvisioner = computeProvisioner;
    }

    public String getComputeType() {
        return computeType;
    }

    public void setComputeType(String computeType) {
        this.computeType = computeType;
    }

    public String getInfrastructureProvisioner() {
        return infrastructureProvisioner;
    }

    public void setInfrastructureProvisioner(String infrastructureProvisioner) {
        this.infrastructureProvisioner = infrastructureProvisioner;
    }
}
