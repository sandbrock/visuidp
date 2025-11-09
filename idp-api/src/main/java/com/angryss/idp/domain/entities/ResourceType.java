package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a category of infrastructure resource (e.g., Managed Container Orchestrator, Relational Database, Storage)
 * that abstracts cloud-specific implementations.
 * This is a unified entity that replaces the previous StackResourceType and BlueprintResourceType.
 */
@Entity
@Table(name = "resource_types")
public class ResourceType extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotBlank(message = "Resource type name is required")
    @Column(nullable = false, unique = true, length = 100)
    public String name;

    @NotBlank(message = "Display name is required")
    @Column(name = "display_name", nullable = false, length = 200)
    public String displayName;

    @Column(columnDefinition = "TEXT")
    public String description;

    @NotNull(message = "Category is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public ResourceCategory category;

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
