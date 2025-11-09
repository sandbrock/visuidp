package com.angryss.idp.domain.entities;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.*;
import java.util.UUID;

@Entity
@Table(name = "stacks")
public class Stack extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(min = 1, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @NotNull
    @Size(min = 3, max = 60)
    @jakarta.validation.constraints.Pattern(regexp = "^(?!.*__)(?!.*--)[a-zA-Z][a-zA-Z0-9_-]{2,59}$", message = "Invalid cloud name format")
    @Column(name = "cloud_name", nullable = false, unique = true, length = 60)
    private String cloudName;

    @NotNull
    @Size(min = 5, max = 22)
    @Pattern(regexp = "^/[a-zA-Z](?!.*__)(?!.*--)[a-zA-Z0-9_-]{2,19}/$", message = "Route path must be 5-22 characters, start and end with a forward slash, start with a letter, contain only letters, numbers, underscores, and hyphens, with no consecutive underscores or hyphens.")
    @Column(name = "route_path", nullable = false, unique = true, length = 22)
    private String routePath;

    @Column(name = "repository_url", length = 2048)
    private String repositoryURL;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "stack_type")
    private StackType stackType;

    // Environment removed from Stack

    @Enumerated(EnumType.STRING)
    @Column(name = "programming_language")
    private ProgrammingLanguage programmingLanguage;

    @Column(name = "is_public")
    private Boolean isPublic;

    @NotBlank
    @Size(min = 1, max = 100)
    @Column(nullable = false, name = "created_by", length = 100)
    private String createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stack_collection_id")
    private StackCollection stackCollection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Domain domain;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cloud_provider_id")
    private CloudProvider cloudProvider;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", columnDefinition = "jsonb")
    private Map<String, Object> configuration;

    @Column(name = "ephemeral_prefix", length = 50)
    private String ephemeralPrefix;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "stack", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<StackResource> stackResources = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blueprint_id")
    private Blueprint blueprint;

    public Stack() {
    }

    public Stack(String name, String description, String repositoryURL, StackType stackType,
                 String createdBy, ProgrammingLanguage programmingLanguage, Boolean isPublic, String cloudName, String routePath) {
        this.name = name;
        this.description = description;
        this.cloudName = cloudName;
        this.routePath = routePath;
        this.repositoryURL = repositoryURL;
        this.stackType = stackType;
        this.createdBy = createdBy;
        this.programmingLanguage = programmingLanguage;
        this.isPublic = isPublic;
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        validateCloudProvider();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        validateCloudProvider();
    }

    private void validateCloudProvider() {
        if (cloudProvider != null && !cloudProvider.enabled) {
            throw new IllegalStateException("Cannot create or update stack with disabled cloud provider: " + cloudProvider.name);
        }
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

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Team getTeam() {
        return team;
    }

    public void setTeam(Team team) {
        this.team = team;
    }

    public StackCollection getStackCollection() {
        return stackCollection;
    }

    public void setStackCollection(StackCollection stackCollection) {
        this.stackCollection = stackCollection;
    }

    public Domain getDomain() { return domain; }
    public void setDomain(Domain domain) { this.domain = domain; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public CloudProvider getCloudProvider() {
        return cloudProvider;
    }

    public void setCloudProvider(CloudProvider cloudProvider) {
        this.cloudProvider = cloudProvider;
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

    public List<StackResource> getStackResources() {
        return stackResources;
    }

    public void setStackResources(List<StackResource> stackResources) {
        this.stackResources = stackResources;
    }

    // Static finder methods
    public static List<Stack> findByCreatedBy(String createdBy) {
        return find("createdBy", createdBy).list();
    }

    public static List<Stack> findByStackType(StackType stackType) {
        return find("stackType", stackType).list();
    }

    // Environment-based finders removed

    public static List<Stack> findByEphemeralPrefix(String ephemeralPrefix) {
        return find("ephemeralPrefix", ephemeralPrefix).list();
    }

    public static boolean existsByNameAndCreatedBy(String name, String createdBy) {
        return count("name = ?1 and createdBy = ?2", name, createdBy) > 0;
    }

    public static List<Stack> findByTeamId(UUID teamId) {
        return find("team.id", teamId).list();
    }

    public static List<Stack> findByStackCollectionId(UUID collectionId) {
        return find("stackCollection.id", collectionId).list();
    }

    public static List<Stack> findByDomainId(UUID domainId) {
        return find("domain.id", domainId).list();
    }

    public static List<Stack> findByCategoryId(UUID categoryId) {
        return find("category.id", categoryId).list();
    }

    public static List<Stack> findByCloudProviderId(UUID cloudProviderId) {
        return find("cloudProvider.id", cloudProviderId).list();
    }

    public static List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy) {
        return find("cloudProvider.id = ?1 and createdBy = ?2", cloudProviderId, createdBy).list();
    }

    public Blueprint getBlueprint() {
        return blueprint;
    }

    public void setBlueprint(Blueprint blueprint) {
        this.blueprint = blueprint;
    }
}
