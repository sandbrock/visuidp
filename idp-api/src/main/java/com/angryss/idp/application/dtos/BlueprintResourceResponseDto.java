package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.sharedinfra.SharedInfrastructureConfiguration;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class BlueprintResourceResponseDto {
    private UUID id;
    private String name;
    private String description;
    private UUID blueprintResourceTypeId;
    private String blueprintResourceTypeName;
    private SharedInfrastructureConfiguration configuration;
    private String cloudType;
    private Map<String, Object> cloudSpecificProperties = new HashMap<>();

    public BlueprintResourceResponseDto() {}

    public BlueprintResourceResponseDto(UUID id, String name, String description,
                                           UUID blueprintResourceTypeId, String blueprintResourceTypeName,
                                           SharedInfrastructureConfiguration configuration, String cloudType,
                                           Map<String, Object> cloudSpecificProperties) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.blueprintResourceTypeId = blueprintResourceTypeId;
        this.blueprintResourceTypeName = blueprintResourceTypeName;
        this.configuration = configuration;
        this.cloudType = cloudType;
        this.cloudSpecificProperties = cloudSpecificProperties;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UUID getBlueprintResourceTypeId() { return blueprintResourceTypeId; }
    public void setBlueprintResourceTypeId(UUID blueprintResourceTypeId) { this.blueprintResourceTypeId = blueprintResourceTypeId; }
    public String getBlueprintResourceTypeName() { return blueprintResourceTypeName; }
    public void setBlueprintResourceTypeName(String blueprintResourceTypeName) { this.blueprintResourceTypeName = blueprintResourceTypeName; }
    public SharedInfrastructureConfiguration getConfiguration() { return configuration; }
    public void setConfiguration(SharedInfrastructureConfiguration configuration) { this.configuration = configuration; }

    public String getCloudType() { return cloudType; }
    public void setCloudType(String cloudType) { this.cloudType = cloudType; }

    public Map<String, Object> getCloudSpecificProperties() { return cloudSpecificProperties; }
    public void setCloudSpecificProperties(Map<String, Object> cloudSpecificProperties) { this.cloudSpecificProperties = cloudSpecificProperties; }
}
