package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.repositories.StackResourceRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresStackResourceRepository implements StackResourceRepository {

    @Override
    @Transactional
    public StackResource save(StackResource stackResource) {
        stackResource.persist();
        return stackResource;
    }

    @Override
    public Optional<StackResource> findById(UUID id) {
        return Optional.ofNullable(StackResource.findById(id));
    }

    @Override
    public List<StackResource> findAll() {
        return StackResource.listAll();
    }

    @Override
    public List<StackResource> findByStackId(UUID stackId) {
        return StackResource.find("stack.id", stackId).list();
    }

    @Override
    public List<StackResource> findByResourceTypeId(UUID resourceTypeId) {
        return StackResource.find("resourceType.id", resourceTypeId).list();
    }

    @Override
    public List<StackResource> findByCloudProviderId(UUID cloudProviderId) {
        return StackResource.find("cloudProvider.id", cloudProviderId).list();
    }

    @Override
    public List<StackResource> findByStackIdAndResourceTypeId(UUID stackId, UUID resourceTypeId) {
        return StackResource.find("stack.id = ?1 and resourceType.id = ?2", stackId, resourceTypeId).list();
    }

    @Override
    public boolean exists(UUID id) {
        return StackResource.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(StackResource stackResource) {
        stackResource.delete();
    }

    @Override
    public long count() {
        return StackResource.count();
    }
}
