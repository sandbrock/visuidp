package com.angryss.idp.domain.valueobjects.sharedinfra;

import jakarta.validation.constraints.*;

/**
 * Configuration for a Relational Database Server (e.g., PostgreSQL, MySQL).
 */
public class RelationalDatabaseServerConfiguration extends SharedInfrastructureConfiguration {
    @NotBlank
    @Pattern(regexp = "^(postgres|mysql|mariadb|sqlserver)$", message = "engine must be one of: postgres, mysql, mariadb, sqlserver")
    private String engine;           // postgres, mysql, mariadb, sqlserver

    @NotBlank
    @Size(max = 20)
    private String version;          // e.g., 16

    @NotBlank
    @Size(max = 100)
    private String cloudServiceName; // Name/identifier for the database server

    public String getEngine() {
        return engine;
    }

    public void setEngine(String engine) {
        this.engine = engine;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getCloudServiceName() {
        return cloudServiceName;
    }

    public void setCloudServiceName(String cloudServiceName) {
        this.cloudServiceName = cloudServiceName;
    }
}
