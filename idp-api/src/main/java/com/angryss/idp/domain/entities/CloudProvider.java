package com.angryss.idp.domain.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a cloud computing platform (AWS, Azure, Google Cloud) that can host infrastructure resources.
 * Administrators can enable or disable cloud providers to control which platforms are available to users.
 */
@Entity
@Table(name = "cloud_providers")
public class CloudProvider extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotBlank(message = "Cloud provider name is required")
    @Column(nullable = false, unique = true, length = 100)
    public String name;

    @NotBlank(message = "Display name is required")
    @Column(name = "display_name", nullable = false, length = 200)
    public String displayName;

    @Column(columnDefinition = "TEXT")
    public String description;

    @NotNull(message = "Enabled status is required")
    @Column(nullable = false)
    public Boolean enabled = false;

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
