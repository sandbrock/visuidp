package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.Environment;
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

@Entity
@Table(name = "stack_configs")
public class EnvironmentConfig extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "environment_id", nullable = false, unique = true)
    private EnvironmentEntity environment;

    // cloud_type removed from stack_configs; derive via EnvironmentEntity if needed

    @NotBlank
    @Size(min = 1, max = 200)
    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb")
    private Map<String, Object> configuration;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EnvironmentConfig() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public EnvironmentConfig(EnvironmentEntity environment, String name, String description) {
        this();
        this.environment = environment;
        this.name = name;
        this.description = description;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Static finder methods
    public static EnvironmentConfig findByEnvironment(Environment environment) {
        // Match by the persisted EnvironmentEntity.name, which stores the display name
        return find("environment.name", environment.getDisplayName()).firstResult();
    }

    public static EnvironmentConfig findByEnvironment(EnvironmentEntity environment) {
        return find("environment", environment).firstResult();
    }

    // cloud type query removed; use environment.cloudType if necessary

    public static List<EnvironmentConfig> findActiveEnvironments() {
        return find("isActive", true).list();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public EnvironmentEntity getEnvironment() {
        return environment;
    }

    public void setEnvironment(EnvironmentEntity environment) {
        this.environment = environment;
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

    public Map<String, Object> getConfiguration() {
        return configuration;
    }

    public void setConfiguration(Map<String, Object> configuration) {
        this.configuration = configuration;
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
