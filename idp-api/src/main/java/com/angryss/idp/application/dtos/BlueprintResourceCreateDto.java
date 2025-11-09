package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.sharedinfra.SharedInfrastructureConfiguration;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class BlueprintResourceCreateDto {
    @NotBlank
    @Size(min = 1, max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    @NotNull
    private UUID blueprintResourceTypeId;

    @NotNull
    @Valid
    private SharedInfrastructureConfiguration configuration;

    @NotBlank
    private String cloudType;

    private Map<String, Object> cloudSpecificProperties = new HashMap<>();

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public UUID getBlueprintResourceTypeId() { return blueprintResourceTypeId; }
    public void setBlueprintResourceTypeId(UUID blueprintResourceTypeId) { this.blueprintResourceTypeId = blueprintResourceTypeId; }

    public SharedInfrastructureConfiguration getConfiguration() { return configuration; }
    public void setConfiguration(SharedInfrastructureConfiguration configuration) { this.configuration = configuration; }

    public String getCloudType() { return cloudType; }
    public void setCloudType(String cloudType) { this.cloudType = cloudType; }

    public Map<String, Object> getCloudSpecificProperties() { return cloudSpecificProperties; }
    public void setCloudSpecificProperties(Map<String, Object> cloudSpecificProperties) { this.cloudSpecificProperties = cloudSpecificProperties; }
}
