package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.PropertyDataType;

import java.util.Map;
import java.util.UUID;

public class PropertySchemaDto {

    private UUID id;
    private UUID mappingId;
    private String propertyName;
    private String displayName;
    private String description;
    private PropertyDataType dataType;
    private Boolean required;
    private Object defaultValue;
    private Map<String, Object> validationRules;
    private Integer displayOrder;

    public PropertySchemaDto() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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
