package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.Set;

public class StackCreateDto {

    @NotBlank
    @Size(min = 1, max = 100)
    private String name;

    @Size(max = 500)
    private String description;

    @NotNull
    @Size(min = 3, max = 60)
    @jakarta.validation.constraints.Pattern(regexp = "^(?!.*__)(?!.*--)[a-zA-Z][a-zA-Z0-9_-]{2,59}$", message = "Invalid cloud name format")
    private String cloudName;

    @NotNull
    @Size(min = 5, max = 22, message = "Route path must be between 5 and 22 characters long.")
    @jakarta.validation.constraints.Pattern(regexp = "^/[a-zA-Z](?!.*__)(?!.*--)[a-zA-Z0-9_-]{2,19}/$", message = "Route path must be 5-22 characters, start and end with a forward slash, start with a letter, contain only letters, numbers, underscores, and hyphens, with no consecutive underscores or hyphens.")
    private String routePath;

    @Size(max = 2048)
    private String repositoryURL;

    @NotNull
    private StackType stackType;

    // Environment removed

    private ProgrammingLanguage programmingLanguage;

    private Boolean isPublic;

    private Map<String, Object> configuration;

    private String ephemeralPrefix;

    // Optional associations
    private java.util.UUID teamId;
    private java.util.UUID stackCollectionId;
    private java.util.UUID blueprintId;

    public StackCreateDto() {
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

    public String getCloudName() {
        return cloudName;
    }

    public void setCloudName(String cloudName) {
        this.cloudName = cloudName;
    }

    public String getRoutePath() {
        return routePath;
    }

    public void setRoutePath(String routePath) {
        this.routePath = routePath;
    }

    public String getRepositoryURL() {
        return repositoryURL;
    }

    public void setRepositoryURL(String repositoryURL) {
        this.repositoryURL = repositoryURL;
    }

    public StackType getStackType() {
        return stackType;
    }

    public void setStackType(StackType stackType) {
        this.stackType = stackType;
    }

    // Environment accessors removed

    public ProgrammingLanguage getProgrammingLanguage() {
        return programmingLanguage;
    }

    public void setProgrammingLanguage(ProgrammingLanguage programmingLanguage) {
        this.programmingLanguage = programmingLanguage;
    }

    public Boolean getIsPublic() {
        return isPublic;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public Map<String, Object> getConfiguration() {
        return configuration;
    }

    public void setConfiguration(Map<String, Object> configuration) {
        this.configuration = configuration;
    }

    public String getEphemeralPrefix() {
        return ephemeralPrefix;
    }

    public void setEphemeralPrefix(String ephemeralPrefix) {
        this.ephemeralPrefix = ephemeralPrefix;
    }

    public java.util.UUID getTeamId() { return teamId; }
    public void setTeamId(java.util.UUID teamId) { this.teamId = teamId; }
    public java.util.UUID getStackCollectionId() { return stackCollectionId; }
    public void setStackCollectionId(java.util.UUID stackCollectionId) { this.stackCollectionId = stackCollectionId; }
    public java.util.UUID getBlueprintId() { return blueprintId; }
    public void setBlueprintId(java.util.UUID blueprintId) { this.blueprintId = blueprintId; }
}
