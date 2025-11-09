package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresResourceTypeRepository implements ResourceTypeRepository {

    @Override
    @Transactional
    public ResourceType save(ResourceType resourceType) {
        resourceType.persist();
        return resourceType;
    }

    @Override
    public Optional<ResourceType> findById(UUID id) {
        return Optional.ofNullable(ResourceType.findById(id));
    }

    @Override
    public List<ResourceType> findAll() {
        return ResourceType.listAll();
    }

    @Override
    public Optional<ResourceType> findByName(String name) {
        return ResourceType.find("name", name).firstResultOptional();
    }

    @Override
    public List<ResourceType> findByCategory(ResourceCategory category) {
        return ResourceType.find("category", category).list();
    }

    @Override
    public List<ResourceType> findByEnabled(Boolean enabled) {
        return ResourceType.find("enabled", enabled).list();
    }

    @Override
    public List<ResourceType> findByCategoryAndEnabled(ResourceCategory category, Boolean enabled) {
        return ResourceType.find("category = ?1 and enabled = ?2", category, enabled).list();
    }

    @Override
    public boolean exists(UUID id) {
        return ResourceType.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(ResourceType resourceType) {
        resourceType.delete();
    }

    @Override
    public long count() {
        return ResourceType.count();
    }
}
