package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.TeamRepository;
import com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB implementation of TeamRepository.
 * Uses AWS SDK v2 for DynamoDB operations with Global Secondary Indexes for query optimization.
 */
@ApplicationScoped
@Named("dynamodb")
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb")
public class DynamoTeamRepository implements TeamRepository {

    private static final Logger LOG = Logger.getLogger(DynamoTeamRepository.class);
    private static final String TABLE_NAME = "idp_teams";
    
    // GSI names for query optimization
    private static final String GSI_NAME = "name-index";
    private static final String GSI_IS_ACTIVE = "isActive-createdAt-index";

    @Inject
    DynamoDbClient dynamoDbClient;

    @Inject
    DynamoEntityMapper entityMapper;
    
    @Inject
    DynamoTransactionManager transactionManager;

    @Override
    public Team save(Team team) {
        if (team.getId() == null) {
            team.setId(UUID.randomUUID());
        }
        
        if (team.getCreatedAt() == null) {
            team.setCreatedAt(LocalDateTime.now());
        }
        
        team.setUpdatedAt(LocalDateTime.now());

        Map<String, AttributeValue> item = entityMapper.teamToItem(team);

        PutItemRequest request = PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build();

        try {
            dynamoDbClient.putItem(request);
            LOG.debugf("Saved team with id: %s", team.getId());
            return team;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to save team with id: %s", team.getId());
            throw new RuntimeException("Failed to save team", e);
        }
    }

    @Override
    public Optional<Team> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }

        GetItemRequest request = GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(id.toString()).build()))
                .build();

        try {
            GetItemResponse response = dynamoDbClient.getItem(request);

            if (!response.hasItem() || response.item().isEmpty()) {
                return Optional.empty();
            }

            Team team = entityMapper.itemToTeam(response.item());
            return Optional.ofNullable(team);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find team by id: %s", id);
            throw new RuntimeException("Failed to find team", e);
        }
    }

    @Override
    public List<Team> findAll() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .build();

        try {
            List<Team> teams = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = ScanRequest.builder()
                            .tableName(TABLE_NAME)
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.scan(request);

                List<Team> pageTeams = response.items().stream()
                        .map(entityMapper::itemToTeam)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                teams.addAll(pageTeams);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d teams", teams.size());
            return teams;
        } catch (DynamoDbException e) {
            LOG.error("Failed to find all teams", e);
            throw new RuntimeException("Failed to find all teams", e);
        }
    }

    @Override
    public Optional<Team> findByName(String name) {
        if (name == null) {
            return Optional.empty();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_NAME)
                .keyConditionExpression("#name = :name")
                .expressionAttributeNames(Map.of("#name", "name"))
                .expressionAttributeValues(Map.of(
                        ":name", AttributeValue.builder().s(name).build()
                ))
                .limit(1)
                .build();

        try {
            QueryResponse response = dynamoDbClient.query(request);

            if (response.count() == 0 || !response.hasItems()) {
                return Optional.empty();
            }

            Team team = entityMapper.itemToTeam(response.items().get(0));
            return Optional.ofNullable(team);
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to find team by name: %s", name);
            throw new RuntimeException("Failed to find team by name", e);
        }
    }

    @Override
    public List<Team> findByIsActive(Boolean isActive) {
        if (isActive == null) {
            return Collections.emptyList();
        }

        QueryRequest request = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .indexName(GSI_IS_ACTIVE)
                .keyConditionExpression("isActive = :isActive")
                .expressionAttributeValues(Map.of(
                        ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();

        return executeQuery(request, "isActive: " + isActive);
    }

    @Override
    public void delete(Team team) {
        if (team == null || team.getId() == null) {
            return;
        }

        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("id", AttributeValue.builder().s(team.getId().toString()).build()))
                .build();

        try {
            dynamoDbClient.deleteItem(request);
            LOG.debugf("Deleted team with id: %s", team.getId());
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to delete team with id: %s", team.getId());
            throw new RuntimeException("Failed to delete team", e);
        }
    }

    @Override
    public long count() {
        ScanRequest request = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .select(Select.COUNT)
                .build();

        try {
            ScanResponse response = dynamoDbClient.scan(request);
            return response.count();
        } catch (DynamoDbException e) {
            LOG.error("Failed to count teams", e);
            throw new RuntimeException("Failed to count teams", e);
        }
    }

    @Override
    public boolean exists(UUID id) {
        return findById(id).isPresent();
    }

    /**
     * Saves multiple teams atomically using a transaction.
     * All teams are saved or none are saved.
     * 
     * @param teams List of teams to save
     * @return List of saved teams with generated IDs
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public List<Team> saveAll(List<Team> teams) {
        if (teams == null || teams.isEmpty()) {
            return Collections.emptyList();
        }
        
        LOG.infof("Saving %d teams in transaction", teams.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Team team : teams) {
            if (team.getId() == null) {
                team.setId(UUID.randomUUID());
            }
            
            if (team.getCreatedAt() == null) {
                team.setCreatedAt(LocalDateTime.now());
            }
            
            team.setUpdatedAt(LocalDateTime.now());
            
            Map<String, AttributeValue> item = entityMapper.teamToItem(team);
            
            writes.add(DynamoTransactionManager.TransactionWrite.put(
                TABLE_NAME,
                item,
                String.format("Save team: %s (id: %s)", team.getName(), team.getId())
            ));
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully saved %d teams in transaction", teams.size());
        
        return teams;
    }
    
    /**
     * Deletes multiple teams atomically using a transaction.
     * All teams are deleted or none are deleted.
     * 
     * @param teams List of teams to delete
     * @throws DynamoTransactionManager.TransactionFailedException if the transaction fails
     */
    public void deleteAll(List<Team> teams) {
        if (teams == null || teams.isEmpty()) {
            return;
        }
        
        LOG.infof("Deleting %d teams in transaction", teams.size());
        
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        for (Team team : teams) {
            if (team.getId() != null) {
                Map<String, AttributeValue> key = Map.of(
                    "id", AttributeValue.builder().s(team.getId().toString()).build()
                );
                
                writes.add(DynamoTransactionManager.TransactionWrite.delete(
                    TABLE_NAME,
                    key,
                    String.format("Delete team: %s (id: %s)", team.getName(), team.getId())
                ));
            }
        }
        
        transactionManager.executeTransaction(writes);
        LOG.infof("Successfully deleted %d teams in transaction", teams.size());
    }

    /**
     * Helper method to execute a query and handle pagination.
     *
     * @param request the QueryRequest to execute
     * @param queryDescription description for logging
     * @return list of teams matching the query
     */
    private List<Team> executeQuery(QueryRequest request, String queryDescription) {
        try {
            List<Team> teams = new ArrayList<>();
            QueryResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;

            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
                            .exclusiveStartKey(lastEvaluatedKey)
                            .build();
                }

                response = dynamoDbClient.query(request);

                List<Team> pageTeams = response.items().stream()
                        .map(entityMapper::itemToTeam)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                teams.addAll(pageTeams);
                lastEvaluatedKey = response.lastEvaluatedKey();

            } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty());

            LOG.debugf("Found %d teams for query: %s", teams.size(), queryDescription);
            return teams;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute query: %s", queryDescription);
            throw new RuntimeException("Failed to execute query", e);
        }
    }
}
