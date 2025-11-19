package com.angryss.idp.infrastructure.persistence.dynamodb.singletable;

import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.TeamRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Single-table DynamoDB implementation of TeamRepository.
 */
@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "dynamodb-singletable")
public class SingleTableTeamRepository implements TeamRepository {
    
    private static final Logger LOG = Logger.getLogger(SingleTableTeamRepository.class);
    
    @ConfigProperty(name = "dynamodb.table.name", defaultValue = "visuidp-data")
    String tableName;
    
    @Inject
    DynamoDbClient dynamoDbClient;
    
    @Inject
    SingleTableEntityMapper entityMapper;
    
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
                .tableName(tableName)
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
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.teamPK(id)).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.teamSK()).build()
                ))
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
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Team").build()
                ))
                .build();
        
        return executeScan(request, "findAll");
    }
    
    @Override
    public Optional<Team> findByName(String name) {
        if (name == null) {
            return Optional.empty();
        }
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND #name = :name")
                .expressionAttributeNames(Map.of("#name", "name"))
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Team").build(),
                    ":name", AttributeValue.builder().s(name).build()
                ))
                .limit(1)
                .build();
        
        try {
            ScanResponse response = dynamoDbClient.scan(request);
            
            if (response.items().isEmpty()) {
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
        
        ScanRequest request = ScanRequest.builder()
                .tableName(tableName)
                .filterExpression("entityType = :entityType AND isActive = :isActive")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Team").build(),
                    ":isActive", AttributeValue.builder().bool(isActive).build()
                ))
                .build();
        
        return executeScan(request, "findByIsActive: " + isActive);
    }
    
    @Override
    public void delete(Team team) {
        if (team == null || team.getId() == null) {
            return;
        }
        
        DeleteItemRequest request = DeleteItemRequest.builder()
                .tableName(tableName)
                .key(Map.of(
                    "PK", AttributeValue.builder().s(SingleTableKeyBuilder.teamPK(team.getId())).build(),
                    "SK", AttributeValue.builder().s(SingleTableKeyBuilder.teamSK()).build()
                ))
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
                .tableName(tableName)
                .filterExpression("entityType = :entityType")
                .expressionAttributeValues(Map.of(
                    ":entityType", AttributeValue.builder().s("Team").build()
                ))
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
    
    // ========== Helper Methods ==========
    
    private List<Team> executeScan(ScanRequest request, String scanDescription) {
        try {
            List<Team> teams = new ArrayList<>();
            ScanResponse response;
            Map<String, AttributeValue> lastEvaluatedKey = null;
            
            do {
                if (lastEvaluatedKey != null) {
                    request = request.toBuilder()
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
            
            LOG.debugf("Found %d teams for scan: %s", teams.size(), scanDescription);
            return teams;
        } catch (DynamoDbException e) {
            LOG.errorf(e, "Failed to execute scan: %s", scanDescription);
            throw new RuntimeException("Failed to execute scan", e);
        }
    }
}
