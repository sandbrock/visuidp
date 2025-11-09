package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.PropertyDataType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

public class PropertySchemaCreateDto {

    @NotNull
    private UUID mappingId;

    @NotBlank
    @Size(min = 1, max = 100)
    private String propertyName;

    @NotBlank
    @Size(min = 1, max = 200)
    private String displayName;

    @Size(max = 1000)
    private String description;

    @NotNull
    private PropertyDataType dataType;

    @NotNull
    private Boolean required;

    private Object defaultValue;

    private Map<String, Object> validationRules;

    private Integer displayOrder;

    public PropertySchemaCreateDto() {
    }

    public UUID getMappingId() {
        return mappingId;
    }

    public void setMappingId(UUID mappingId) {
        this.mappingId = mappingId;
    }

    public String getPropertyName() {
        return propertyName;
    }

    public void setPropertyName(String propertyName) {
        this.propertyName = propertyName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public PropertyDataType getDataType() {
        return dataType;
    }

    public void setDataType(PropertyDataType dataType) {
        this.dataType = dataType;
    }

    public Boolean getRequired() {
        return required;
    }

    public void setRequired(Boolean required) {
        this.required = required;
    }

    public Object getDefaultValue() {
        return defaultValue;
    }

    public void setDefaultValue(Object defaultValue) {
        this.defaultValue = defaultValue;
    }

    public Map<String, Object> getValidationRules() {
        return validationRules;
    }

    public void setValidationRules(Map<String, Object> validationRules) {
        this.validationRules = validationRules;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }
}
