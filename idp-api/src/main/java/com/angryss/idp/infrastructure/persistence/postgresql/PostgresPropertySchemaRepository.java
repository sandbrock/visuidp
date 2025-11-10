package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
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
public class PostgresPropertySchemaRepository implements PropertySchemaRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public PropertySchema save(PropertySchema propertySchema) {
        if (propertySchema.id != null && !entityManager.contains(propertySchema)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(propertySchema);
        } else {
            // New entity or already managed - use persist
            propertySchema.persist();
            return propertySchema;
        }
    }

    @Override
    public Optional<PropertySchema> findById(UUID id) {
        return Optional.ofNullable(PropertySchema.findById(id));
    }

    @Override
    public List<PropertySchema> findAll() {
        return PropertySchema.listAll();
    }

    @Override
    public List<PropertySchema> findByMappingId(UUID mappingId) {
        return PropertySchema.find("mapping.id", mappingId).list();
    }

    @Override
    public List<PropertySchema> findByMappingIdOrderByDisplayOrder(UUID mappingId) {
        return PropertySchema.find("mapping.id = ?1 order by displayOrder", mappingId).list();
    }

    @Override
    public List<PropertySchema> findByMappingIdAndRequired(UUID mappingId, Boolean required) {
        return PropertySchema.find("mapping.id = ?1 and required = ?2", mappingId, required).list();
    }

    @Override
    public boolean exists(UUID id) {
        return PropertySchema.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(PropertySchema propertySchema) {
        propertySchema.delete();
    }

    @Override
    public long count() {
        return PropertySchema.count();
    }
}
