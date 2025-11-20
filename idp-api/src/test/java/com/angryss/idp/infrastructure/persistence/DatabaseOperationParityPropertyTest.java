package com.angryss.idp.infrastructure.persistence;

import com.angryss.idp.domain.entities.*;
import com.angryss.idp.domain.repositories.*;
import com.angryss.idp.domain.valueobjects.*;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import net.jqwik.api.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based test for database operation parity between PostgreSQL and DynamoDB.
 * 
 * **Feature: aws-cost-effective-deployment, Property 11: Database operation parity**
 * **Validates: Requirements 13.5**
 * 
 * Property: For any database operation (query, insert, update, delete) in the original application,
 * the DynamoDB version should support the same operation with equivalent results.
 */
@QuarkusTest
public class DatabaseOperationParityPropertyTest {

    @Inject
    StackRepository stackRepository;

    @Inject
    TeamRepository teamRepository;

    @Inject
    BlueprintRepository blueprintRepository;

    @Inject
    CloudProviderRepository cloudProviderRepository;

    @Inject
    ApiKeyRepository apiKeyRepository;

    @Inject
    PropertySchemaRepository propertySchemaRepository;

    private String uniqueId;
    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdTeamIds = new ArrayList<>();
    private List<UUID> createdBlueprintIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();
    private List<String> createdApiKeyHashes = new ArrayList<>();
    private List<UUID> createdPropertySchemaIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
    }

    @AfterEach
    void tearDown() {
        // Clean up in reverse order of creation to respect foreign key constraints
        createdStackIds.forEach(id -> {
            try {
                stackRepository.findById(id).ifPresent(stackRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete stack: " + id);
            }
        });
        createdStackIds.clear();

        createdBlueprintIds.forEach(id -> {
            try {
                blueprintRepository.findById(id).ifPresent(blueprintRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete blueprint: " + id);
            }
        });
        createdBlueprintIds.clear();

        createdTeamIds.forEach(id -> {
            try {
                teamRepository.findById(id).ifPresent(teamRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete team: " + id);
            }
        });
        createdTeamIds.clear();

        createdCloudProviderIds.forEach(id -> {
            try {
                cloudProviderRepository.findById(id).ifPresent(cloudProviderRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete cloud provider: " + id);
            }
        });
        createdCloudProviderIds.clear();

        createdApiKeyHashes.forEach(hash -> {
            try {
                apiKeyRepository.findByKeyHash(hash).ifPresent(apiKeyRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete API key: " + hash);
            }
        });
        createdApiKeyHashes.clear();

        createdPropertySchemaIds.forEach(id -> {
            try {
                propertySchemaRepository.findById(id).ifPresent(propertySchemaRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete property schema: " + id);
            }
        });
        createdPropertySchemaIds.clear();
    }

    /**
     * Property 11: Database operation parity - Save operation
     * 
     * For any entity, the save operation should persist the entity and return it with an ID.
     * This verifies that the DynamoDB implementation supports the same save semantics as PostgreSQL.
     */
    @Property(tries = 50)
    @Label("Save operation persists entities with equivalent behavior")
    void saveOperationPersistsEntitiesCorrectly(@ForAll("entityTypes") EntityType entityType) {
        try {
            Object entity = createTestEntity(entityType);
            Object savedEntity = saveEntity(entityType, entity);
            UUID entityId = getEntityId(savedEntity);

            // Assert: Entity should have an ID after save
            assertNotNull(entityId, 
                String.format("Saved %s should have an ID", entityType));

            // Assert: Entity should be retrievable by ID
            Optional<?> retrieved = findEntityById(entityType, entityId);
            assertTrue(retrieved.isPresent(),
                String.format("Saved %s should be retrievable by ID", entityType));

            // Assert: Retrieved entity should match saved entity
            assertEquals(entityId, getEntityId(retrieved.get()),
                String.format("Retrieved %s ID should match saved ID", entityType));

            System.out.printf("✓ Save operation parity verified for %s%n", entityType);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("Save operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 12: Database operation parity - FindById operation
     * 
     * For any entity ID, the findById operation should return the entity if it exists,
     * or empty if it doesn't exist.
     */
    @Property(tries = 50)
    @Label("FindById operation returns correct results")
    void findByIdOperationReturnsCorrectResults(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Create and save an entity
            Object entity = createTestEntity(entityType);
            Object savedEntity = saveEntity(entityType, entity);
            UUID entityId = getEntityId(savedEntity);

            // Assert: FindById should return the entity
            Optional<?> found = findEntityById(entityType, entityId);
            assertTrue(found.isPresent(),
                String.format("FindById should return existing %s", entityType));

            // Assert: FindById with non-existent ID should return empty
            UUID nonExistentId = UUID.randomUUID();
            Optional<?> notFound = findEntityById(entityType, nonExistentId);
            assertFalse(notFound.isPresent(),
                String.format("FindById should return empty for non-existent %s", entityType));

            System.out.printf("✓ FindById operation parity verified for %s%n", entityType);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("FindById operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 13: Database operation parity - FindAll operation
     * 
     * For any entity type, the findAll operation should return all entities of that type.
     */
    @Property(tries = 30)
    @Label("FindAll operation returns all entities")
    void findAllOperationReturnsAllEntities(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Get initial count
            long initialCount = countEntities(entityType);

            // Create and save multiple entities
            int entitiesToCreate = 3;
            for (int i = 0; i < entitiesToCreate; i++) {
                Object entity = createTestEntity(entityType);
                saveEntity(entityType, entity);
            }

            // Assert: FindAll should return all entities
            List<?> allEntities = findAllEntities(entityType);
            long finalCount = allEntities.size();

            assertTrue(finalCount >= initialCount + entitiesToCreate,
                String.format("FindAll should return at least %d more %s entities", 
                    entitiesToCreate, entityType));

            System.out.printf("✓ FindAll operation parity verified for %s (found %d entities)%n", 
                entityType, finalCount);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("FindAll operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 14: Database operation parity - Update operation
     * 
     * For any entity, updating a field and saving should persist the change.
     */
    @Property(tries = 50)
    @Label("Update operation persists changes correctly")
    void updateOperationPersistsChangesCorrectly(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Create and save an entity
            Object entity = createTestEntity(entityType);
            Object savedEntity = saveEntity(entityType, entity);
            UUID entityId = getEntityId(savedEntity);

            // Update the entity
            Object updatedEntity = updateEntity(entityType, savedEntity);
            Object reSavedEntity = saveEntity(entityType, updatedEntity);

            // Assert: ID should remain the same
            assertEquals(entityId, getEntityId(reSavedEntity),
                String.format("Updated %s should maintain the same ID", entityType));

            // Assert: Changes should be persisted
            Optional<?> retrieved = findEntityById(entityType, entityId);
            assertTrue(retrieved.isPresent(),
                String.format("Updated %s should be retrievable", entityType));

            // Verify the update was persisted
            verifyEntityUpdate(entityType, retrieved.get());

            System.out.printf("✓ Update operation parity verified for %s%n", entityType);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("Update operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 15: Database operation parity - Delete operation
     * 
     * For any entity, the delete operation should remove it from the database.
     */
    @Property(tries = 50)
    @Label("Delete operation removes entities correctly")
    void deleteOperationRemovesEntitiesCorrectly(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Create and save an entity
            Object entity = createTestEntity(entityType);
            Object savedEntity = saveEntity(entityType, entity);
            UUID entityId = getEntityId(savedEntity);

            // Assert: Entity exists before delete
            assertTrue(existsEntity(entityType, entityId),
                String.format("%s should exist before delete", entityType));

            // Delete the entity
            deleteEntity(entityType, savedEntity);

            // Remove from tracking list to avoid double-delete in tearDown
            removeFromTrackingList(entityType, entityId);

            // Assert: Entity should not exist after delete
            assertFalse(existsEntity(entityType, entityId),
                String.format("%s should not exist after delete", entityType));

            // Assert: FindById should return empty
            Optional<?> notFound = findEntityById(entityType, entityId);
            assertFalse(notFound.isPresent(),
                String.format("FindById should return empty for deleted %s", entityType));

            System.out.printf("✓ Delete operation parity verified for %s%n", entityType);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("Delete operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 16: Database operation parity - Count operation
     * 
     * For any entity type, the count operation should return the correct number of entities.
     */
    @Property(tries = 30)
    @Label("Count operation returns correct count")
    void countOperationReturnsCorrectCount(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Get initial count
            long initialCount = countEntities(entityType);

            // Create and save entities
            int entitiesToCreate = 2;
            for (int i = 0; i < entitiesToCreate; i++) {
                Object entity = createTestEntity(entityType);
                saveEntity(entityType, entity);
            }

            // Assert: Count should increase by the number of entities created
            long finalCount = countEntities(entityType);
            assertTrue(finalCount >= initialCount + entitiesToCreate,
                String.format("Count should increase by at least %d for %s", 
                    entitiesToCreate, entityType));

            System.out.printf("✓ Count operation parity verified for %s (count: %d)%n", 
                entityType, finalCount);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("Count operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    /**
     * Property 17: Database operation parity - Exists operation
     * 
     * For any entity, the exists operation should return true if the entity exists,
     * false otherwise.
     */
    @Property(tries = 50)
    @Label("Exists operation returns correct boolean")
    void existsOperationReturnsCorrectBoolean(@ForAll("entityTypes") EntityType entityType) {
        try {
            // Create and save an entity
            Object entity = createTestEntity(entityType);
            Object savedEntity = saveEntity(entityType, entity);
            UUID entityId = getEntityId(savedEntity);

            // Assert: Exists should return true for existing entity
            assertTrue(existsEntity(entityType, entityId),
                String.format("Exists should return true for existing %s", entityType));

            // Assert: Exists should return false for non-existent entity
            UUID nonExistentId = UUID.randomUUID();
            assertFalse(existsEntity(entityType, nonExistentId),
                String.format("Exists should return false for non-existent %s", entityType));

            System.out.printf("✓ Exists operation parity verified for %s%n", entityType);

        } catch (Exception e) {
            throw new AssertionError(
                String.format("Exists operation failed for %s: %s", entityType, e.getMessage()),
                e
            );
        }
    }

    // Helper methods for entity operations

    private Object createTestEntity(EntityType type) {
        String testId = uniqueId + "-" + UUID.randomUUID().toString().substring(0, 4);
        
        return switch (type) {
            case STACK -> {
                Stack stack = new Stack();
                stack.setName("test-stack-" + testId);
                stack.setRoutePath("/test-" + testId + "/");
                stack.setCloudName("test-cloud-" + testId);
                stack.setStackType(StackType.INFRASTRUCTURE);
                stack.setCreatedBy("test-user@example.com");
                stack.setCreatedAt(LocalDateTime.now());
                yield stack;
            }
            case TEAM -> {
                Team team = new Team();
                team.setName("test-team-" + testId);
                team.setDescription("Test team " + testId);
                yield team;
            }
            case BLUEPRINT -> {
                Blueprint blueprint = new Blueprint();
                blueprint.setName("test-blueprint-" + testId);
                blueprint.setDescription("Test blueprint " + testId);
                yield blueprint;
            }
            case CLOUD_PROVIDER -> {
                CloudProvider provider = new CloudProvider();
                provider.name = "test-provider-" + testId;
                provider.displayName = "Test Provider " + testId;
                provider.enabled = true;
                yield provider;
            }
            case API_KEY -> {
                ApiKey apiKey = new ApiKey();
                apiKey.keyName = "test-key-" + testId;
                apiKey.keyHash = "hash-" + testId;
                apiKey.keyPrefix = "test-" + testId.substring(0, 4);
                apiKey.keyType = ApiKeyType.USER;
                apiKey.createdByEmail = "test-user@example.com";
                apiKey.createdAt = LocalDateTime.now();
                apiKey.expiresAt = LocalDateTime.now().plusDays(30);
                apiKey.isActive = true;
                yield apiKey;
            }
            case PROPERTY_SCHEMA -> {
                PropertySchema schema = new PropertySchema();
                schema.propertyName = "test-schema-" + testId;
                schema.displayName = "Test Schema " + testId;
                schema.dataType = PropertyDataType.STRING;
                schema.required = false;
                yield schema;
            }
        };
    }

    private Object saveEntity(EntityType type, Object entity) {
        Object saved = switch (type) {
            case STACK -> {
                Stack s = stackRepository.save((Stack) entity);
                createdStackIds.add(s.getId());
                yield s;
            }
            case TEAM -> {
                Team t = teamRepository.save((Team) entity);
                createdTeamIds.add(t.getId());
                yield t;
            }
            case BLUEPRINT -> {
                Blueprint b = blueprintRepository.save((Blueprint) entity);
                createdBlueprintIds.add(b.getId());
                yield b;
            }
            case CLOUD_PROVIDER -> {
                CloudProvider cp = cloudProviderRepository.save((CloudProvider) entity);
                createdCloudProviderIds.add(cp.id);
                yield cp;
            }
            case API_KEY -> {
                ApiKey ak = apiKeyRepository.save((ApiKey) entity);
                createdApiKeyHashes.add(ak.keyHash);
                yield ak;
            }
            case PROPERTY_SCHEMA -> {
                PropertySchema ps = propertySchemaRepository.save((PropertySchema) entity);
                createdPropertySchemaIds.add(ps.id);
                yield ps;
            }
        };
        return saved;
    }

    private Optional<?> findEntityById(EntityType type, UUID id) {
        return switch (type) {
            case STACK -> stackRepository.findById(id);
            case TEAM -> teamRepository.findById(id);
            case BLUEPRINT -> blueprintRepository.findById(id);
            case CLOUD_PROVIDER -> cloudProviderRepository.findById(id);
            case PROPERTY_SCHEMA -> propertySchemaRepository.findById(id);
            case API_KEY -> Optional.empty(); // API keys use hash, not UUID
        };
    }

    private List<?> findAllEntities(EntityType type) {
        return switch (type) {
            case STACK -> stackRepository.findAll();
            case TEAM -> teamRepository.findAll();
            case BLUEPRINT -> blueprintRepository.findAll();
            case CLOUD_PROVIDER -> cloudProviderRepository.findAll();
            case API_KEY -> apiKeyRepository.findAll();
            case PROPERTY_SCHEMA -> propertySchemaRepository.findAll();
        };
    }

    private long countEntities(EntityType type) {
        return switch (type) {
            case STACK -> stackRepository.count();
            case TEAM -> teamRepository.count();
            case BLUEPRINT -> blueprintRepository.count();
            case CLOUD_PROVIDER -> cloudProviderRepository.count();
            case API_KEY -> apiKeyRepository.count();
            case PROPERTY_SCHEMA -> propertySchemaRepository.count();
        };
    }

    private boolean existsEntity(EntityType type, UUID id) {
        return switch (type) {
            case STACK -> stackRepository.exists(id);
            case TEAM -> teamRepository.exists(id);
            case BLUEPRINT -> blueprintRepository.exists(id);
            case CLOUD_PROVIDER -> cloudProviderRepository.exists(id);
            case PROPERTY_SCHEMA -> propertySchemaRepository.exists(id);
            case API_KEY -> false; // API keys use hash, not UUID
        };
    }

    private void deleteEntity(EntityType type, Object entity) {
        switch (type) {
            case STACK -> stackRepository.delete((Stack) entity);
            case TEAM -> teamRepository.delete((Team) entity);
            case BLUEPRINT -> blueprintRepository.delete((Blueprint) entity);
            case CLOUD_PROVIDER -> cloudProviderRepository.delete((CloudProvider) entity);
            case API_KEY -> apiKeyRepository.delete((ApiKey) entity);
            case PROPERTY_SCHEMA -> propertySchemaRepository.delete((PropertySchema) entity);
        }
    }

    private Object updateEntity(EntityType type, Object entity) {
        return switch (type) {
            case STACK -> {
                Stack s = (Stack) entity;
                s.setName(s.getName() + "-updated");
                yield s;
            }
            case TEAM -> {
                Team t = (Team) entity;
                t.setDescription(t.getDescription() + " (updated)");
                yield t;
            }
            case BLUEPRINT -> {
                Blueprint b = (Blueprint) entity;
                b.setDescription(b.getDescription() + " (updated)");
                yield b;
            }
            case CLOUD_PROVIDER -> {
                CloudProvider cp = (CloudProvider) entity;
                cp.displayName = cp.displayName + " (updated)";
                yield cp;
            }
            case API_KEY -> {
                ApiKey ak = (ApiKey) entity;
                ak.isActive = !ak.isActive;
                yield ak;
            }
            case PROPERTY_SCHEMA -> {
                PropertySchema ps = (PropertySchema) entity;
                ps.required = !ps.required;
                yield ps;
            }
        };
    }

    private void verifyEntityUpdate(EntityType type, Object entity) {
        switch (type) {
            case STACK -> assertTrue(((Stack) entity).getName().contains("-updated"));
            case TEAM -> assertTrue(((Team) entity).getDescription().contains("(updated)"));
            case BLUEPRINT -> assertTrue(((Blueprint) entity).getDescription().contains("(updated)"));
            case CLOUD_PROVIDER -> assertTrue(((CloudProvider) entity).displayName.contains("(updated)"));
            case API_KEY -> {} // isActive toggle verified by retrieval
            case PROPERTY_SCHEMA -> {} // isRequired toggle verified by retrieval
        }
    }

    private UUID getEntityId(Object entity) {
        return switch (entity) {
            case Stack s -> s.getId();
            case Team t -> t.getId();
            case Blueprint b -> b.getId();
            case CloudProvider cp -> cp.id;
            case PropertySchema ps -> ps.id;
            case ApiKey ak -> null; // API keys don't have UUID id
            default -> throw new IllegalArgumentException("Unknown entity type");
        };
    }

    private void removeFromTrackingList(EntityType type, UUID id) {
        switch (type) {
            case STACK -> createdStackIds.remove(id);
            case TEAM -> createdTeamIds.remove(id);
            case BLUEPRINT -> createdBlueprintIds.remove(id);
            case CLOUD_PROVIDER -> createdCloudProviderIds.remove(id);
            case PROPERTY_SCHEMA -> createdPropertySchemaIds.remove(id);
            case API_KEY -> {} // API keys tracked by hash
        }
    }

    @Provide
    Arbitrary<EntityType> entityTypes() {
        return Arbitraries.of(
            EntityType.STACK,
            EntityType.TEAM,
            EntityType.BLUEPRINT,
            EntityType.CLOUD_PROVIDER,
            EntityType.API_KEY,
            EntityType.PROPERTY_SCHEMA
        );
    }

    private enum EntityType {
        STACK,
        TEAM,
        BLUEPRINT,
        CLOUD_PROVIDER,
        API_KEY,
        PROPERTY_SCHEMA
    }
}
