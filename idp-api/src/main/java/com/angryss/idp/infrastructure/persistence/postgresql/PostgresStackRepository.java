package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.StackType;
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
public class PostgresStackRepository implements StackRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public Stack save(Stack stack) {
        if (stack.getId() != null && !entityManager.contains(stack)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(stack);
        } else {
            // New entity or already managed - use persist
            stack.persist();
            return stack;
        }
    }

    @Override
    public Optional<Stack> findById(UUID id) {
        return Optional.ofNullable(Stack.findById(id));
    }

    @Override
    public List<Stack> findAll() {
        return Stack.listAll();
    }

    @Override
    public List<Stack> findByCreatedBy(String createdBy) {
        return Stack.findByCreatedBy(createdBy);
    }

    @Override
    public List<Stack> findByStackType(StackType stackType) {
        return Stack.findByStackType(stackType);
    }

    @Override
    public List<Stack> findByTeamId(UUID teamId) {
        return Stack.findByTeamId(teamId);
    }

    @Override
    public List<Stack> findByCloudProviderId(UUID cloudProviderId) {
        return Stack.findByCloudProviderId(cloudProviderId);
    }

    @Override
    public List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy) {
        return Stack.findByCloudProviderAndCreatedBy(cloudProviderId, createdBy);
    }

    @Override
    public List<Stack> findByEphemeralPrefix(String ephemeralPrefix) {
        return Stack.findByEphemeralPrefix(ephemeralPrefix);
    }

    @Override
    public List<Stack> findByStackCollectionId(UUID collectionId) {
        return Stack.findByStackCollectionId(collectionId);
    }

    @Override
    public List<Stack> findByDomainId(UUID domainId) {
        return Stack.findByDomainId(domainId);
    }

    @Override
    public List<Stack> findByCategoryId(UUID categoryId) {
        return Stack.findByCategoryId(categoryId);
    }

    @Override
    public boolean existsByNameAndCreatedBy(String name, String createdBy) {
        return Stack.existsByNameAndCreatedBy(name, createdBy);
    }

    @Override
    public boolean exists(UUID id) {
        return Stack.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(Stack stack) {
        stack.delete();
    }

    @Override
    public long count() {
        return Stack.count();
    }
}
