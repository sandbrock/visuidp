package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.repositories.BlueprintResourceRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresBlueprintResourceRepository implements BlueprintResourceRepository {

    @Override
    @Transactional
    public BlueprintResource save(BlueprintResource blueprintResource) {
        blueprintResource.persist();
        return blueprintResource;
    }

    @Override
    public Optional<BlueprintResource> findById(UUID id) {
        return Optional.ofNullable(BlueprintResource.findById(id));
    }

    @Override
    public List<BlueprintResource> findAll() {
        return BlueprintResource.listAll();
    }

    @Override
    public List<BlueprintResource> findByBlueprintId(UUID blueprintId) {
        return BlueprintResource.find("blueprint.id", blueprintId).list();
    }

    @Override
    public List<BlueprintResource> findByResourceTypeId(UUID resourceTypeId) {
        return BlueprintResource.find("resourceType.id", resourceTypeId).list();
    }

    @Override
    public List<BlueprintResource> findByCloudProviderId(UUID cloudProviderId) {
        return BlueprintResource.find("cloudProvider.id", cloudProviderId).list();
    }

    @Override
    public List<BlueprintResource> findByIsActive(Boolean isActive) {
        return BlueprintResource.find("isActive", isActive).list();
    }

    @Override
    public List<BlueprintResource> findByBlueprintIdAndIsActive(UUID blueprintId, Boolean isActive) {
        return BlueprintResource.find("blueprint.id = ?1 and isActive = ?2", blueprintId, isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return BlueprintResource.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(BlueprintResource blueprintResource) {
        blueprintResource.delete();
    }

    @Override
    public long count() {
        return BlueprintResource.count();
    }
}
