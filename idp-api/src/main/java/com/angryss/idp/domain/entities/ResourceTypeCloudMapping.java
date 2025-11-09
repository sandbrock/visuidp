package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents the mapping between a ResourceType and a CloudProvider, including the Terraform module location
 * for provisioning that resource type on that specific cloud provider.
 */
@Entity
@Table(
    name = "resource_type_cloud_mappings",
    uniqueConstraints = @UniqueConstraint(columnNames = {"resource_type_id", "cloud_provider_id"})
)
public class ResourceTypeCloudMapping extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotNull(message = "Resource type is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id", nullable = false)
    public ResourceType resourceType;

    @NotNull(message = "Cloud provider is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id", nullable = false)
    public CloudProvider cloudProvider;

    @NotBlank(message = "Terraform module location is required")
    @Column(name = "terraform_module_location", nullable = false, length = 2048)
    public String terraformModuleLocation;

    @NotNull(message = "Module location type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "module_location_type", nullable = false, length = 20)
    public ModuleLocationType moduleLocationType;

    @NotNull(message = "Enabled status is required")
    @Column(nullable = false)
    public Boolean enabled = true;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @NotNull
    @Column(name = "updated_at", nullable = false)
    public LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
