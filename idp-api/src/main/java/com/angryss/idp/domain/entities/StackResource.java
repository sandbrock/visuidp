package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.services.PropertyValidationService;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a non-shared infrastructure resource associated with a specific stack.
 * Each resource has a type, cloud provider, and configuration validated against property schemas.
 */
@Entity
@Table(name = "stack_resources")
public class StackResource extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotBlank
    @Size(min = 1, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @NotNull(message = "Resource type is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id", nullable = false)
    private ResourceType resourceType;

    @NotNull(message = "Cloud provider is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id", nullable = false)
    private CloudProvider cloudProvider;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> configuration;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stack_id", nullable = false)
    private Stack stack;

    public StackResource() {
    }

    public StackResource(String name, String description, ResourceType resourceType,
                         CloudProvider cloudProvider, Map<String, Object> configuration, Stack stack) {
        this.name = name;
        this.description = description;
        this.resourceType = resourceType;
        this.cloudProvider = cloudProvider;
        this.configuration = configuration;
        this.stack = stack;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Validates the configuration against property schemas for this resource type and cloud provider.
     * This method should be called by the application layer before persisting.
     *
     * @param validationService The property validation service
     * @param propertySchemas The list of property schemas to validate against
     * @return ValidationResult containing any validation errors
     */
    public PropertyValidationService.ValidationResult validateConfiguration(
            PropertyValidationService validationService,
            List<PropertySchema> propertySchemas) {
        return validationService.validate(this.configuration, propertySchemas);
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

    public Map<String, Object> getConfiguration() {
        return configuration;
    }

    public void setConfiguration(Map<String, Object> configuration) {
        this.configuration = configuration;
    }

    // removed accessors for dropped fields

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

    public Stack getStack() {
        return stack;
    }

    public void setStack(Stack stack) {
        this.stack = stack;
    }
}
