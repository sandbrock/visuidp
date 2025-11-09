package com.angryss.idp.domain.valueobjects.sharedinfra;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Base type for JSONB-stored configurations of shared infrastructure resources.
 * Implementations are serialized to the shared_infrastructure.configuration column.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = ContainerOrchestratorConfiguration.class, name = "container-orchestrator"),
        @JsonSubTypes.Type(value = RelationalDatabaseServerConfiguration.class, name = "relational-database-server"),
        @JsonSubTypes.Type(value = ServiceBusConfiguration.class, name = "service-bus")
})
public abstract class SharedInfrastructureConfiguration {
}

