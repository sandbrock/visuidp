package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.repositories.ResourceTypeCloudMappingRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresResourceTypeCloudMappingRepository implements ResourceTypeCloudMappingRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public ResourceTypeCloudMapping save(ResourceTypeCloudMapping mapping) {
        if (mapping.id != null && !entityManager.contains(mapping)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(mapping);
        } else {
            // New entity or already managed - use persist
            mapping.persist();
            return mapping;
        }
    }

    @Override
    public Optional<ResourceTypeCloudMapping> findById(UUID id) {
        return Optional.ofNullable(ResourceTypeCloudMapping.findById(id));
    }

    @Override
    public List<ResourceTypeCloudMapping> findAll() {
        return ResourceTypeCloudMapping.listAll();
    }

    @Override
    public Optional<ResourceTypeCloudMapping> findByResourceTypeIdAndCloudProviderId(UUID resourceTypeId, UUID cloudProviderId) {
        return ResourceTypeCloudMapping.find("resourceType.id = ?1 and cloudProvider.id = ?2", resourceTypeId, cloudProviderId).firstResultOptional();
    }

    @Override
    public List<ResourceTypeCloudMapping> findByResourceTypeId(UUID resourceTypeId) {
        return ResourceTypeCloudMapping.find("resourceType.id", resourceTypeId).list();
    }

    @Override
    public List<ResourceTypeCloudMapping> findByCloudProviderId(UUID cloudProviderId) {
        return ResourceTypeCloudMapping.find("cloudProvider.id", cloudProviderId).list();
    }

    @Override
    public List<ResourceTypeCloudMapping> findByEnabled(Boolean enabled) {
        return ResourceTypeCloudMapping.find("enabled", enabled).list();
    }

    @Override
    public List<ResourceTypeCloudMapping> findByResourceTypeIdAndEnabled(UUID resourceTypeId, Boolean enabled) {
        return ResourceTypeCloudMapping.find("resourceType.id = ?1 and enabled = ?2", resourceTypeId, enabled).list();
    }

    @Override
    public List<ResourceTypeCloudMapping> findByCloudProviderIdAndEnabled(UUID cloudProviderId, Boolean enabled) {
        return ResourceTypeCloudMapping.find("cloudProvider.id = ?1 and enabled = ?2", cloudProviderId, enabled).list();
    }

    @Override
    public boolean exists(UUID id) {
        return ResourceTypeCloudMapping.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(ResourceTypeCloudMapping mapping) {
        mapping.delete();
    }

    @Override
    public long count() {
        return ResourceTypeCloudMapping.count();
    }
}
