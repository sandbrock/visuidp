package com.angryss.idp.infrastructure.persistence.config;

import com.angryss.idp.domain.repositories.StackRepository;
import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
import org.eclipse.microprofile.health.Readiness;
import org.jboss.logging.Logger;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Database health check implementation that verifies database connectivity
 * and readiness for the configured database provider (PostgreSQL or DynamoDB).
 * 
 * This health check is exposed as a readiness probe, indicating whether the
 * application is ready to accept traffic based on database availability.
 * 
 * Provides detailed metadata including:
 * - PostgreSQL: version, connection pool statistics, active connections
 * - DynamoDB: table status, item counts, provisioned throughput
 */
@Readiness
@ApplicationScoped
public class DatabaseHealthCheck implements HealthCheck {

    private static final Logger LOG = Logger.getLogger(DatabaseHealthCheck.class);
    
    @ConfigProperty(name = "idp.database.provider", defaultValue = "postgresql")
    String databaseProvider;
    
    @Inject
    Instance<StackRepository> stackRepository;
    
    @Inject
    Instance<AgroalDataSource> dataSource;
    
    @Inject
    Instance<DynamoDbClient> dynamoDbClient;
    
    /**
     * Performs the health check by attempting a simple database operation.
     * Uses the repository count operation to verify connectivity without
     * loading data. Includes detailed metadata specific to each database provider.
     *
     * @return HealthCheckResponse indicating database status with detailed metadata
     */
    @Override
    public HealthCheckResponse call() {
        String healthCheckName = "database-" + databaseProvider;
        HealthCheckResponseBuilder responseBuilder = HealthCheckResponse.named(healthCheckName);
        
        try {
            // Verify repository is available
            if (stackRepository.isUnsatisfied()) {
                LOG.error("No StackRepository implementation available for database provider: " + databaseProvider);
                return responseBuilder
                    .down()
                    .withData("error", "No repository implementation available")
                    .withData("provider", databaseProvider)
                    .build();
            }
            
            if (stackRepository.isAmbiguous()) {
                LOG.error("Multiple StackRepository implementations found for database provider: " + databaseProvider);
                return responseBuilder
                    .down()
                    .withData("error", "Ambiguous repository implementation")
                    .withData("provider", databaseProvider)
                    .build();
            }
            
            // Perform connectivity check using count operation
            // This is a lightweight operation that verifies database access
            long count = stackRepository.get().count();
            
            LOG.debugf("Database health check passed for provider '%s', stack count: %d", 
                databaseProvider, count);
            
            // Add basic data
            responseBuilder
                .up()
                .withData("provider", databaseProvider)
                .withData("stackCount", count);
            
            // Add provider-specific metadata
            if ("postgresql".equals(databaseProvider)) {
                addPostgreSQLMetadata(responseBuilder);
            } else if ("dynamodb".equals(databaseProvider)) {
                addDynamoDBMetadata(responseBuilder);
            }
            
            return responseBuilder.build();
                
        } catch (Exception e) {
            LOG.errorf(e, "Database health check failed for provider '%s'", databaseProvider);
            
            return responseBuilder
                .down()
                .withData("error", e.getMessage())
                .withData("errorType", e.getClass().getSimpleName())
                .withData("provider", databaseProvider)
                .build();
        }
    }
    
    /**
     * Adds PostgreSQL-specific metadata to the health check response.
     * Includes database version, connection pool statistics, and active connections.
     *
     * @param responseBuilder The health check response builder
     */
    private void addPostgreSQLMetadata(HealthCheckResponseBuilder responseBuilder) {
        try {
            if (dataSource.isUnsatisfied()) {
                LOG.debug("DataSource not available for PostgreSQL metadata collection");
                return;
            }
            
            AgroalDataSource ds = dataSource.get();
            
            // Get connection pool statistics
            var metrics = ds.getMetrics();
            responseBuilder
                .withData("connectionPool.active", metrics.activeCount())
                .withData("connectionPool.available", metrics.availableCount())
                .withData("connectionPool.max", metrics.maxUsedCount())
                .withData("connectionPool.awaiting", metrics.awaitingCount())
                .withData("connectionPool.created", metrics.creationCount())
                .withData("connectionPool.destroyed", metrics.destroyCount());
            
            // Get database version and metadata
            try (Connection conn = ds.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                responseBuilder
                    .withData("database.version", metaData.getDatabaseProductVersion())
                    .withData("database.product", metaData.getDatabaseProductName())
                    .withData("driver.version", metaData.getDriverVersion())
                    .withData("database.url", maskDatabaseUrl(metaData.getURL()));
                
                LOG.debugf("PostgreSQL metadata collected: version=%s, active connections=%d", 
                    metaData.getDatabaseProductVersion(), metrics.activeCount());
            }
            
        } catch (SQLException e) {
            LOG.warnf(e, "Failed to collect PostgreSQL metadata: %s", e.getMessage());
            responseBuilder.withData("metadata.error", "Failed to collect database metadata: " + e.getMessage());
        } catch (Exception e) {
            LOG.warnf(e, "Unexpected error collecting PostgreSQL metadata: %s", e.getMessage());
            responseBuilder.withData("metadata.error", "Unexpected error: " + e.getMessage());
        }
    }
    
    /**
     * Masks sensitive information in database URL for safe logging.
     *
     * @param url The database URL
     * @return Masked URL safe for health check response
     */
    private String maskDatabaseUrl(String url) {
        if (url == null) {
            return "unknown";
        }
        // Remove password if present in URL
        if (url.contains("password=")) {
            return url.replaceAll("password=[^&;]*", "password=***");
        }
        // Remove credentials if present in URL (user:pass@host format)
        if (url.contains("@")) {
            int atIndex = url.indexOf("@");
            int protocolEnd = url.indexOf("://");
            if (protocolEnd > 0 && protocolEnd < atIndex) {
                return url.substring(0, protocolEnd + 3) + "***@" + url.substring(atIndex + 1);
            }
        }
        return url;
    }
    
    /**
     * Adds DynamoDB-specific metadata to the health check response.
     * Includes table status, item counts, and provisioned throughput information.
     *
     * @param responseBuilder The health check response builder
     */
    private void addDynamoDBMetadata(HealthCheckResponseBuilder responseBuilder) {
        try {
            if (dynamoDbClient.isUnsatisfied()) {
                LOG.debug("DynamoDbClient not available for DynamoDB metadata collection");
                return;
            }
            
            DynamoDbClient client = dynamoDbClient.get();
            
            // Get list of core tables to check
            List<String> coreTables = List.of(
                "idp_stacks",
                "idp_blueprints",
                "idp_teams",
                "idp_cloud_providers"
            );
            
            int activeTableCount = 0;
            long totalItemCount = 0;
            List<String> tableStatuses = new ArrayList<>();
            
            for (String tableName : coreTables) {
                try {
                    DescribeTableRequest request = DescribeTableRequest.builder()
                        .tableName(tableName)
                        .build();
                    
                    DescribeTableResponse response = client.describeTable(request);
                    TableDescription table = response.table();
                    
                    if (table.tableStatus() == TableStatus.ACTIVE) {
                        activeTableCount++;
                    }
                    
                    tableStatuses.add(tableName + ":" + table.tableStatus());
                    
                    // Add item count if available
                    if (table.itemCount() != null) {
                        totalItemCount += table.itemCount();
                    }
                    
                    // Add throughput info for the first table as a sample
                    if (tableName.equals("idp_stacks") && table.provisionedThroughput() != null) {
                        responseBuilder
                            .withData("throughput.readCapacity", table.provisionedThroughput().readCapacityUnits())
                            .withData("throughput.writeCapacity", table.provisionedThroughput().writeCapacityUnits());
                    }
                    
                } catch (ResourceNotFoundException e) {
                    tableStatuses.add(tableName + ":NOT_FOUND");
                    LOG.warnf("Table '%s' not found during health check", tableName);
                } catch (Exception e) {
                    tableStatuses.add(tableName + ":ERROR");
                    LOG.warnf(e, "Error checking table '%s': %s", tableName, e.getMessage());
                }
            }
            
            responseBuilder
                .withData("tables.checked", coreTables.size())
                .withData("tables.active", activeTableCount)
                .withData("tables.totalItems", totalItemCount)
                .withData("tables.status", String.join(", ", tableStatuses));
            
            LOG.debugf("DynamoDB metadata collected: %d/%d tables active, %d total items", 
                activeTableCount, coreTables.size(), totalItemCount);
            
        } catch (Exception e) {
            LOG.warnf(e, "Failed to collect DynamoDB metadata: %s", e.getMessage());
            responseBuilder.withData("metadata.error", "Failed to collect table metadata: " + e.getMessage());
        }
    }
}
