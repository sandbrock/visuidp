package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresApiKeyRepository implements ApiKeyRepository {

    @Override
    @Transactional
    public ApiKey save(ApiKey apiKey) {
        apiKey.persist();
        return apiKey;
    }

    @Override
    public Optional<ApiKey> findById(UUID id) {
        return Optional.ofNullable(ApiKey.findById(id));
    }

    @Override
    public List<ApiKey> findAll() {
        return ApiKey.listAll();
    }

    @Override
    public Optional<ApiKey> findByKeyHash(String keyHash) {
        return ApiKey.find("keyHash", keyHash).firstResultOptional();
    }

    @Override
    public List<ApiKey> findByUserEmail(String userEmail) {
        return ApiKey.find("userEmail", userEmail).list();
    }

    @Override
    public List<ApiKey> findByKeyType(ApiKeyType keyType) {
        return ApiKey.find("keyType", keyType).list();
    }

    @Override
    public List<ApiKey> findByIsActive(Boolean isActive) {
        return ApiKey.find("isActive", isActive).list();
    }

    @Override
    public List<ApiKey> findByUserEmailAndIsActive(String userEmail, Boolean isActive) {
        return ApiKey.find("userEmail = ?1 and isActive = ?2", userEmail, isActive).list();
    }

    @Override
    public List<ApiKey> findByCreatedByEmail(String createdByEmail) {
        return ApiKey.find("createdByEmail", createdByEmail).list();
    }

    @Override
    public boolean exists(UUID id) {
        return ApiKey.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(ApiKey apiKey) {
        apiKey.delete();
    }

    @Override
    public long count() {
        return ApiKey.count();
    }
}
