package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Category;
import com.angryss.idp.domain.repositories.CategoryRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresCategoryRepository implements CategoryRepository {

    @Override
    @Transactional
    public Category save(Category category) {
        category.persist();
        return category;
    }

    @Override
    public Optional<Category> findById(UUID id) {
        return Optional.ofNullable(Category.findById(id));
    }

    @Override
    public List<Category> findAll() {
        return Category.listAll();
    }

    @Override
    public Optional<Category> findByName(String name) {
        return Category.find("name", name).firstResultOptional();
    }

    @Override
    public List<Category> findByDomainId(UUID domainId) {
        return Category.find("domain.id", domainId).list();
    }

    @Override
    public List<Category> findByIsActive(Boolean isActive) {
        return Category.find("isActive", isActive).list();
    }

    @Override
    public List<Category> findByDomainIdAndIsActive(UUID domainId, Boolean isActive) {
        return Category.find("domain.id = ?1 and isActive = ?2", domainId, isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return Category.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(Category category) {
        category.delete();
    }

    @Override
    public long count() {
        return Category.count();
    }
}
