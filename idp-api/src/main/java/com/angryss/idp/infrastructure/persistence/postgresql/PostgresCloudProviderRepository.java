package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresCloudProviderRepository implements CloudProviderRepository {

    @Override
    @Transactional
    public CloudProvider save(CloudProvider cloudProvider) {
        cloudProvider.persist();
        return cloudProvider;
    }

    @Override
    public Optional<CloudProvider> findById(UUID id) {
        return Optional.ofNullable(CloudProvider.findById(id));
    }

    @Override
    public List<CloudProvider> findAll() {
        return CloudProvider.listAll();
    }

    @Override
    public Optional<CloudProvider> findByName(String name) {
        return CloudProvider.find("name", name).firstResultOptional();
    }

    @Override
    public List<CloudProvider> findByEnabled(Boolean enabled) {
        return CloudProvider.find("enabled", enabled).list();
    }

    @Override
    public boolean exists(UUID id) {
        return CloudProvider.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(CloudProvider cloudProvider) {
        cloudProvider.delete();
    }

    @Override
    public long count() {
        return CloudProvider.count();
    }
}
