package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Domain service for validating property values against their schema definitions.
 * Validates data types, required fields, and custom validation rules.
 */
@ApplicationScoped
public class PropertyValidationService {

    /**
     * Validates a map of property values against their schemas.
     *
     * @param propertyValues Map of property names to values
     * @param schemas List of property schemas to validate against
     * @return ValidationResult containing any validation errors
     */
    public ValidationResult validate(Map<String, Object> propertyValues, List<PropertySchema> schemas) {
        ValidationResult result = new ValidationResult();
        
        if (propertyValues == null) {
            propertyValues = Collections.emptyMap();
        }
        
        // Create a map for quick schema lookup
        Map<String, PropertySchema> schemaMap = new HashMap<>();
        for (PropertySchema schema : schemas) {
            schemaMap.put(schema.propertyName, schema);
        }
        
        // Validate required fields
        for (PropertySchema schema : schemas) {
            if (Boolean.TRUE.equals(schema.required)) {
                Object value = propertyValues.get(schema.propertyName);
                if (value == null || (value instanceof String && ((String) value).isBlank())) {
                    result.addError(schema.propertyName, "Property is required");
                }
            }
        }
        
        // Validate provided values
        for (Map.Entry<String, Object> entry : propertyValues.entrySet()) {
            String propertyName = entry.getKey();
            Object value = entry.getValue();
            PropertySchema schema = schemaMap.get(propertyName);
            
            if (schema == null) {
                result.addError(propertyName, "Unknown property");
                continue;
            }
            
            // Skip validation if value is null and not required
            if (value == null) {
                continue;
            }
            
            // Validate data type and rules
            validatePropertyValue(propertyName, value, schema, result);
        }
        
        return result;
    }

    /**
     * Validates a single property value against its schema.
     */
    private void validatePropertyValue(String propertyName, Object value, PropertySchema schema, ValidationResult result) {
        switch (schema.dataType) {
            case STRING -> validateString(propertyName, value, schema, result);
            case NUMBER -> validateNumber(propertyName, value, schema, result);
            case BOOLEAN -> validateBoolean(propertyName, value, schema, result);
            case LIST -> validateList(propertyName, value, schema, result);
        }
    }

    /**
     * Validates a STRING property value.
     */
    private void validateString(String propertyName, Object value, PropertySchema schema, ValidationResult result) {
        if (!(value instanceof String)) {
            result.addError(propertyName, "Must be a string");
            return;
        }
        
        String stringValue = (String) value;
        Map<String, Object> rules = schema.validationRules;
        
        if (rules != null) {
            // Min length validation
            if (rules.containsKey("minLength")) {
                int minLength = getIntValue(rules.get("minLength"));
                if (stringValue.length() < minLength) {
                    result.addError(propertyName, "Must be at least " + minLength + " characters long");
                }
            }
            
            // Max length validation
            if (rules.containsKey("maxLength")) {
                int maxLength = getIntValue(rules.get("maxLength"));
                if (stringValue.length() > maxLength) {
                    result.addError(propertyName, "Must be at most " + maxLength + " characters long");
                }
            }
            
            // Pattern validation
            if (rules.containsKey("pattern")) {
                String patternStr = rules.get("pattern").toString();
                try {
                    Pattern pattern = Pattern.compile(patternStr);
                    if (!pattern.matcher(stringValue).matches()) {
                        String message = rules.containsKey("patternMessage") 
                            ? rules.get("patternMessage").toString()
                            : "Does not match required pattern";
                        result.addError(propertyName, message);
                    }
                } catch (PatternSyntaxException e) {
                    // Invalid pattern in schema - log but don't fail validation
                }
            }
        }
    }

    /**
     * Validates a NUMBER property value.
     */
    private void validateNumber(String propertyName, Object value, PropertySchema schema, ValidationResult result) {
        Number numberValue;
        
        if (value instanceof Number) {
            numberValue = (Number) value;
        } else if (value instanceof String) {
            try {
                numberValue = Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                result.addError(propertyName, "Must be a valid number");
                return;
            }
        } else {
            result.addError(propertyName, "Must be a number");
            return;
        }
        
        Map<String, Object> rules = schema.validationRules;
        
        if (rules != null) {
            // Min value validation
            if (rules.containsKey("min")) {
                double min = getDoubleValue(rules.get("min"));
                if (numberValue.doubleValue() < min) {
                    result.addError(propertyName, "Must be at least " + min);
                }
            }
            
            // Max value validation
            if (rules.containsKey("max")) {
                double max = getDoubleValue(rules.get("max"));
                if (numberValue.doubleValue() > max) {
                    result.addError(propertyName, "Must be at most " + max);
                }
            }
        }
    }

    /**
     * Validates a BOOLEAN property value.
     */
    private void validateBoolean(String propertyName, Object value, PropertySchema schema, ValidationResult result) {
        if (!(value instanceof Boolean)) {
            if (value instanceof String) {
                String strValue = ((String) value).toLowerCase();
                if (!strValue.equals("true") && !strValue.equals("false")) {
                    result.addError(propertyName, "Must be a boolean (true or false)");
                }
            } else {
                result.addError(propertyName, "Must be a boolean");
            }
        }
    }

    /**
     * Validates a LIST property value.
     */
    private void validateList(String propertyName, Object value, PropertySchema schema, ValidationResult result) {
        if (!(value instanceof List)) {
            result.addError(propertyName, "Must be a list");
            return;
        }
        
        List<?> listValue = (List<?>) value;
        Map<String, Object> rules = schema.validationRules;
        
        if (rules != null) {
            // Min items validation
            if (rules.containsKey("minItems")) {
                int minItems = getIntValue(rules.get("minItems"));
                if (listValue.size() < minItems) {
                    result.addError(propertyName, "Must contain at least " + minItems + " items");
                }
            }
            
            // Max items validation
            if (rules.containsKey("maxItems")) {
                int maxItems = getIntValue(rules.get("maxItems"));
                if (listValue.size() > maxItems) {
                    result.addError(propertyName, "Must contain at most " + maxItems + " items");
                }
            }
        }
    }

    /**
     * Helper method to safely extract integer values from validation rules.
     */
    private int getIntValue(Object value) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return Integer.parseInt(value.toString());
    }

    /**
     * Helper method to safely extract double values from validation rules.
     */
    private double getDoubleValue(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    /**
     * Represents the result of property validation.
     */
    public static class ValidationResult {
        private final Map<String, List<String>> errors = new HashMap<>();

        public void addError(String propertyName, String errorMessage) {
            errors.computeIfAbsent(propertyName, k -> new ArrayList<>()).add(errorMessage);
        }

        public boolean isValid() {
            return errors.isEmpty();
        }

        public Map<String, List<String>> getErrors() {
            return Collections.unmodifiableMap(errors);
        }

        public List<String> getErrorsForProperty(String propertyName) {
            return errors.getOrDefault(propertyName, Collections.emptyList());
        }
    }
}
