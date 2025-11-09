package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.AdminDashboardDto;
import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
import com.angryss.idp.domain.repositories.ResourceTypeCloudMappingRepository;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Application service for admin dashboard operations.
 * Provides aggregated configuration data, statistics, and incomplete mapping detection.
 */
@ApplicationScoped
public class AdminDashboardService {

    @Inject
    CloudProviderRepository cloudProviderRepository;

    @Inject
    ResourceTypeRepository resourceTypeRepository;

    @Inject
    ResourceTypeCloudMappingRepository resourceTypeCloudMappingRepository;

    @Inject
    PropertySchemaRepository propertySchemaRepository;

    @Inject
    CloudProviderService cloudProviderService;

    @Inject
    ResourceTypeService resourceTypeService;

    @Inject
    ResourceTypeCloudMappingService resourceTypeCloudMappingService;

    /**
     * Retrieves comprehensive dashboard data aggregating all configuration entities.
     * This provides a complete overview of cloud providers, resource types, mappings, and statistics.
     *
     * @return AdminDashboardDto containing all configuration data and statistics
     */
    public AdminDashboardDto getDashboard() {
        AdminDashboardDto dashboard = new AdminDashboardDto();
        
        // Aggregate all configuration data
        dashboard.setCloudProviders(cloudProviderService.listAll());
        dashboard.setResourceTypes(resourceTypeService.listAll());
        dashboard.setMappings(resourceTypeCloudMappingService.listAll());
        dashboard.setStatistics(getStatistics());
        
        return dashboard;
    }

    /**
     * Retrieves all incomplete resource type cloud mappings.
     * A mapping is considered incomplete if it lacks a Terraform module location
     * or has no property schemas defined.
     *
     * @return List of incomplete mapping DTOs
     */
    public List<ResourceTypeCloudMappingDto> getIncompleteMappings() {
        return resourceTypeCloudMappingService.listAll().stream()
            .filter(mapping -> !mapping.getIsComplete())
            .collect(Collectors.toList());
    }

    /**
     * Calculates statistics for all configuration entities.
     * Provides counts for cloud providers, resource types, mappings, properties,
     * and breakdowns by enabled status and completeness.
     *
     * @return Map of statistic names to counts
     */
    public Map<String, Integer> getStatistics() {
        Map<String, Integer> statistics = new HashMap<>();
        
        // Cloud provider statistics
        long totalProviders = cloudProviderRepository.count();
        long enabledProviders = cloudProviderRepository.findByEnabled(true).size();
        statistics.put("totalCloudProviders", (int) totalProviders);
        statistics.put("enabledCloudProviders", (int) enabledProviders);
        statistics.put("disabledCloudProviders", (int) (totalProviders - enabledProviders));
        
        // Resource type statistics
        long totalResourceTypes = resourceTypeRepository.count();
        long enabledResourceTypes = resourceTypeRepository.findByEnabled(true).size();
        statistics.put("totalResourceTypes", (int) totalResourceTypes);
        statistics.put("enabledResourceTypes", (int) enabledResourceTypes);
        statistics.put("disabledResourceTypes", (int) (totalResourceTypes - enabledResourceTypes));
        
        // Mapping statistics
        long totalMappings = resourceTypeCloudMappingRepository.count();
        long enabledMappings = resourceTypeCloudMappingRepository.findByEnabled(true).size();
        statistics.put("totalMappings", (int) totalMappings);
        statistics.put("enabledMappings", (int) enabledMappings);
        statistics.put("disabledMappings", (int) (totalMappings - enabledMappings));
        
        // Completeness statistics
        List<ResourceTypeCloudMappingDto> allMappings = resourceTypeCloudMappingService.listAll();
        long completeMappings = allMappings.stream()
            .filter(ResourceTypeCloudMappingDto::getIsComplete)
            .count();
        long incompleteMappings = allMappings.size() - completeMappings;
        statistics.put("completeMappings", (int) completeMappings);
        statistics.put("incompleteMappings", (int) incompleteMappings);
        
        // Property schema statistics
        long totalProperties = propertySchemaRepository.count();
        statistics.put("totalPropertySchemas", (int) totalProperties);
        
        return statistics;
    }
}
