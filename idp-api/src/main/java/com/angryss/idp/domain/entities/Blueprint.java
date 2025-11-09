package com.angryss.idp.domain.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "blueprints")
public class Blueprint extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(min = 1, max = 100)
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "is_active")
    private Boolean isActive;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "blueprint_cloud_providers",
        joinColumns = @JoinColumn(name = "blueprint_id"),
        inverseJoinColumns = @JoinColumn(name = "cloud_provider_id")
    )
    private Set<CloudProvider> supportedCloudProviders = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "blueprint", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Stack> stacks = new HashSet<>();

    @OneToMany(mappedBy = "blueprint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<BlueprintResource> resources = new HashSet<>();

    public Blueprint() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.isActive = true;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean active) { isActive = active; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Set<Stack> getStacks() { return stacks; }
    public void setStacks(Set<Stack> stacks) { this.stacks = stacks; }
    
    public Set<CloudProvider> getSupportedCloudProviders() { return supportedCloudProviders; }
    public void setSupportedCloudProviders(Set<CloudProvider> supportedCloudProviders) { this.supportedCloudProviders = supportedCloudProviders; }
    
    public Set<BlueprintResource> getResources() { return resources; }
    public void setResources(Set<BlueprintResource> resources) {
        this.resources = resources;
        // Maintain bidirectional relationship
        if (resources != null) {
            for (BlueprintResource resource : resources) {
                resource.setBlueprint(this);
            }
        }
    }
    
    /**
     * Validates that all cloud providers in the set are enabled.
     * @throws IllegalStateException if any cloud provider is disabled
     */
    public void validateCloudProvidersEnabled() {
        if (supportedCloudProviders != null) {
            for (CloudProvider provider : supportedCloudProviders) {
                if (provider.enabled == null || !provider.enabled) {
                    throw new IllegalStateException(
                        "Cloud provider '" + provider.displayName + "' is not enabled and cannot be used in blueprints"
                    );
                }
            }
        }
    }
}
