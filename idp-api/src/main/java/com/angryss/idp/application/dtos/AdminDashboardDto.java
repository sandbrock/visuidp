package com.angryss.idp.application.dtos;

import java.util.List;
import java.util.Map;

public class AdminDashboardDto {

    private List<CloudProviderDto> cloudProviders;
    private List<ResourceTypeDto> resourceTypes;
    private List<ResourceTypeCloudMappingDto> mappings;
    private Map<String, Integer> statistics;

    public AdminDashboardDto() {
    }

    public List<CloudProviderDto> getCloudProviders() {
        return cloudProviders;
    }

    public void setCloudProviders(List<CloudProviderDto> cloudProviders) {
        this.cloudProviders = cloudProviders;
    }

    public List<ResourceTypeDto> getResourceTypes() {
        return resourceTypes;
    }

    public void setResourceTypes(List<ResourceTypeDto> resourceTypes) {
        this.resourceTypes = resourceTypes;
    }

    public List<ResourceTypeCloudMappingDto> getMappings() {
        return mappings;
    }

    public void setMappings(List<ResourceTypeCloudMappingDto> mappings) {
        this.mappings = mappings;
    }

    public Map<String, Integer> getStatistics() {
        return statistics;
    }

    public void setStatistics(Map<String, Integer> statistics) {
        this.statistics = statistics;
    }
}
