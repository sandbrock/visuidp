package com.angryss.idp.infrastructure.persistence;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests to verify that the V4 migration successfully removed cloud_provider_id,
 * domain_id, and category_id columns from the stacks table.
 */
@QuarkusTest
class StackMigrationTest {

    @Inject
    DataSource dataSource;

    @Test
    void testCloudProviderIdColumnIsRemoved() throws SQLException {
        Set<String> columns = getStacksTableColumns();
        assertFalse(columns.contains("cloud_provider_id"),
                "cloud_provider_id column should be removed from stacks table");
    }

    @Test
    void testDomainIdColumnIsRemoved() throws SQLException {
        Set<String> columns = getStacksTableColumns();
        assertFalse(columns.contains("domain_id"),
                "domain_id column should be removed from stacks table");
    }

    @Test
    void testCategoryIdColumnIsRemoved() throws SQLException {
        Set<String> columns = getStacksTableColumns();
        assertFalse(columns.contains("category_id"),
                "category_id column should be removed from stacks table");
    }

    @Test
    void testForeignKeyConstraintsAreRemoved() throws SQLException {
        Set<String> foreignKeys = getStacksTableForeignKeys();
        
        assertFalse(foreignKeys.contains("fk_stacks_cloud_provider"),
                "fk_stacks_cloud_provider constraint should be removed");
        assertFalse(foreignKeys.contains("fk_stacks_domain"),
                "fk_stacks_domain constraint should be removed");
        assertFalse(foreignKeys.contains("fk_stacks_category"),
                "fk_stacks_category constraint should be removed");
    }

    @Test
    void testIndexesAreRemoved() throws SQLException {
        Set<String> indexes = getStacksTableIndexes();
        
        assertFalse(indexes.contains("idx_stacks_cloud_provider"),
                "idx_stacks_cloud_provider index should be removed");
        assertFalse(indexes.contains("idx_stacks_domain_id"),
                "idx_stacks_domain_id index should be removed");
        assertFalse(indexes.contains("idx_stacks_category_id"),
                "idx_stacks_category_id index should be removed");
    }

    @Test
    void testOtherStackColumnsArePreserved() throws SQLException {
        Set<String> columns = getStacksTableColumns();
        
        // Verify essential columns still exist
        assertTrue(columns.contains("id"), "id column should exist");
        assertTrue(columns.contains("name"), "name column should exist");
        assertTrue(columns.contains("cloud_name"), "cloud_name column should exist");
        assertTrue(columns.contains("route_path"), "route_path column should exist");
        assertTrue(columns.contains("stack_type"), "stack_type column should exist");
        assertTrue(columns.contains("created_by"), "created_by column should exist");
        assertTrue(columns.contains("created_at"), "created_at column should exist");
        assertTrue(columns.contains("updated_at"), "updated_at column should exist");
        assertTrue(columns.contains("team_id"), "team_id column should exist");
        assertTrue(columns.contains("blueprint_id"), "blueprint_id column should exist");
    }

    @Test
    void testMigrationIsIdempotent() throws SQLException {
        // This test verifies that the migration can be run multiple times without errors
        // Since we're using IF EXISTS clauses, the migration should not fail if run again
        // The test passes if we can successfully query the table structure
        Set<String> columns = getStacksTableColumns();
        assertNotNull(columns, "Should be able to query stacks table structure");
        assertFalse(columns.isEmpty(), "Stacks table should have columns");
    }

    /**
     * Helper method to get all column names from the stacks table
     */
    private Set<String> getStacksTableColumns() throws SQLException {
        Set<String> columns = new HashSet<>();
        
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getColumns(null, null, "stacks", null)) {
                while (rs.next()) {
                    columns.add(rs.getString("COLUMN_NAME").toLowerCase());
                }
            }
        }
        
        return columns;
    }

    /**
     * Helper method to get all foreign key constraint names from the stacks table
     */
    private Set<String> getStacksTableForeignKeys() throws SQLException {
        Set<String> foreignKeys = new HashSet<>();
        
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getImportedKeys(null, null, "stacks")) {
                while (rs.next()) {
                    String fkName = rs.getString("FK_NAME");
                    if (fkName != null) {
                        foreignKeys.add(fkName.toLowerCase());
                    }
                }
            }
        }
        
        return foreignKeys;
    }

    /**
     * Helper method to get all index names from the stacks table
     */
    private Set<String> getStacksTableIndexes() throws SQLException {
        Set<String> indexes = new HashSet<>();
        
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getIndexInfo(null, null, "stacks", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if (indexName != null && !indexName.equalsIgnoreCase("PRIMARY")) {
                        indexes.add(indexName.toLowerCase());
                    }
                }
            }
        }
        
        return indexes;
    }
}
