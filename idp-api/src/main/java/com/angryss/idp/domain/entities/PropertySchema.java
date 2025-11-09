package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.PropertyDataType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Represents a property definition for a specific ResourceType and CloudProvider combination.
 * Defines the schema for user-configurable properties including data type, validation rules, and default values.
 */
@Entity
@Table(
    name = "property_schemas",
    uniqueConstraints = @UniqueConstraint(columnNames = {"mapping_id", "property_name"})
)
public class PropertySchema extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @NotNull(message = "Mapping is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapping_id", nullable = false)
    public ResourceTypeCloudMapping mapping;

    @NotBlank(message = "Property name is required")
    @Column(name = "property_name", nullable = false, length = 100)
    public String propertyName;

    @NotBlank(message = "Display name is required")
    @Column(name = "display_name", nullable = false, length = 200)
    public String displayName;

    @Column(columnDefinition = "TEXT")
    public String description;

    @NotNull(message = "Data type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 20)
    public PropertyDataType dataType;

    @NotNull(message = "Required status is required")
    @Column(nullable = false)
    public Boolean required = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_value", columnDefinition = "jsonb")
    public Object defaultValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    public Map<String, Object> validationRules;

    @Column(name = "display_order")
    public Integer displayOrder;

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
