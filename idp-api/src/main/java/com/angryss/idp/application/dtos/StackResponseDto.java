package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class StackResponseDto {

    private UUID id;
    private String name;
    private String description;
    private String repositoryURL;
    private StackType stackType;
    // Environment removed
    private ProgrammingLanguage programmingLanguage;
    private Boolean isPublic;
    private String createdBy;
    private java.util.UUID teamId;
    private java.util.UUID stackCollectionId;
    private Map<String, Object> configuration;
    private String ephemeralPrefix;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private java.util.UUID blueprintId;
    private BlueprintResourceDto blueprintResource;

    public StackResponseDto() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public java.util.UUID getTeamId() { return teamId; }
    public void setTeamId(java.util.UUID teamId) { this.teamId = teamId; }
    public java.util.UUID getStackCollectionId() { return stackCollectionId; }
    public void setStackCollectionId(java.util.UUID stackCollectionId) { this.stackCollectionId = stackCollectionId; }

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

    public java.util.UUID getBlueprintId() { return blueprintId; }
    public void setBlueprintId(java.util.UUID blueprintId) { this.blueprintId = blueprintId; }

    public BlueprintResourceDto getBlueprintResource() { return blueprintResource; }
    public void setBlueprintResource(BlueprintResourceDto blueprintResource) { this.blueprintResource = blueprintResource; }
}
