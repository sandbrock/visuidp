package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.services.PropertyValidationService;
import com.angryss.idp.domain.valueobjects.sharedinfra.SharedInfrastructureConfiguration;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a shared infrastructure resource associated with a blueprint.
 * Each resource has a type, cloud provider, and configuration validated against property schemas.
 */
@Entity
@Table(name = "blueprint_resources")
public class BlueprintResource extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotBlank
    @Size(min = 1, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id", nullable = false)
    private ResourceType resourceType;

    @NotNull(message = "Cloud provider is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id", nullable = false)
    private CloudProvider cloudProvider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blueprint_id")
    private Blueprint blueprint;

    @NotNull
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb", nullable = false)
    private SharedInfrastructureConfiguration configuration;

    @Column(name = "cloud_type", length = 50)
    private String cloudType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "cloud_specific_properties", columnDefinition = "jsonb")
    private Map<String, Object> cloudSpecificProperties = new HashMap<>();

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public BlueprintResource() {}

    public BlueprintResource(String name, String description, ResourceType resourceType,
                                SharedInfrastructureConfiguration configuration) {
        this.name = name;
        this.description = description;
        this.resourceType = resourceType;
        this.configuration = configuration;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Validates the cloud-specific properties against property schemas for this resource type and cloud provider.
     * This method should be called by the application layer before persisting.
     *
     * @param validationService The property validation service
     * @param propertySchemas The list of property schemas to validate against
     * @return ValidationResult containing any validation errors
     */
    public PropertyValidationService.ValidationResult validateCloudSpecificProperties(
            PropertyValidationService validationService,
            List<PropertySchema> propertySchemas) {
        return validationService.validate(this.cloudSpecificProperties, propertySchemas);
    }



    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ResourceType getResourceType() {
        return resourceType;
    }

    public void setResourceType(ResourceType resourceType) {
        this.resourceType = resourceType;
    }

    public CloudProvider getCloudProvider() {
        return cloudProvider;
    }

    public void setCloudProvider(CloudProvider cloudProvider) {
        this.cloudProvider = cloudProvider;
    }

    public Blueprint getBlueprint() {
        return blueprint;
    }

    public void setBlueprint(Blueprint blueprint) {
        this.blueprint = blueprint;
    }

    public SharedInfrastructureConfiguration getConfiguration() {
        return configuration;
    }

    public void setConfiguration(SharedInfrastructureConfiguration configuration) {
        this.configuration = configuration;
    }

    public String getCloudType() {
        return cloudType;
    }

    public void setCloudType(String cloudType) {
        this.cloudType = cloudType;
    }

    public Map<String, Object> getCloudSpecificProperties() {
        return cloudSpecificProperties;
    }

    public void setCloudSpecificProperties(Map<String, Object> cloudSpecificProperties) {
        this.cloudSpecificProperties = cloudSpecificProperties;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
