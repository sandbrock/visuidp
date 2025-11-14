package com.angryss.idp.domain.valueobjects.sharedinfra;

import jakarta.validation.constraints.*;

/**
 * Configuration for a Service Bus / Message Broker (e.g., Kafka, RabbitMQ).
 */
public class ServiceBusConfiguration extends SharedInfrastructureConfiguration {
    @NotBlank
    @Size(max = 100)
    private String cloudServiceName; // Name/identifier for the service bus

    public String getCloudServiceName() {
        return cloudServiceName;
    }

    public void setCloudServiceName(String cloudServiceName) {
        this.cloudServiceName = cloudServiceName;
    }
}
