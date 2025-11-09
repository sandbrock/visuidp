package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.valueobjects.Environment;
import com.angryss.idp.domain.valueobjects.ResourceType;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ProvisionerSelectionService {

    public String selectComputeProvisioner(StackType stackType, Environment environment) {
        EnvironmentConfig envConfig = EnvironmentConfig.findByEnvironment(environment);
        if (envConfig == null) {
            throw new IllegalArgumentException("Environment configuration not found for: " + environment);
        }

        String cloud = envConfig.getEnvironment() != null && envConfig.getEnvironment().getCloudProvider() != null
                ? envConfig.getEnvironment().getCloudProvider().name : null;
        if (cloud == null) return null;
        if (cloud.equalsIgnoreCase("on-premises")) return selectOnPremisesComputeProvisioner(stackType);
        if (cloud.equalsIgnoreCase("aws")) return selectAwsComputeProvisioner(stackType);
        return null;
    }

    public String selectInfrastructureProvisioner(ResourceType resourceType, Environment environment) {
        EnvironmentConfig envConfig = EnvironmentConfig.findByEnvironment(environment);
        if (envConfig == null) {
            throw new IllegalArgumentException("Environment configuration not found for: " + environment);
        }

        String cloud = envConfig.getEnvironment() != null && envConfig.getEnvironment().getCloudProvider() != null
                ? envConfig.getEnvironment().getCloudProvider().name : null;
        if (cloud == null) return null;
        if (cloud.equalsIgnoreCase("on-premises")) return selectOnPremisesInfrastructureProvisioner(resourceType);
        if (cloud.equalsIgnoreCase("aws")) return selectAwsInfrastructureProvisioner(resourceType);
        return null;
    }

    private String selectOnPremisesComputeProvisioner(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> null; // No compute for infrastructure stacks
            case RESTFUL_SERVERLESS, RESTFUL_API, JAVASCRIPT_WEB_APPLICATION, 
                 EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> "kubernetes-provisioner";
        };
    }

    private String selectAwsComputeProvisioner(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> null; // No compute for infrastructure stacks
            case RESTFUL_SERVERLESS, EVENT_DRIVEN_SERVERLESS -> "lambda-provisioner";
            case RESTFUL_API, EVENT_DRIVEN_API, JAVASCRIPT_WEB_APPLICATION -> "ecs-fargate-provisioner";
        };
    }

    private String selectOnPremisesInfrastructureProvisioner(ResourceType resourceType) {
        return switch (resourceType) {
            case RELATIONAL_DATABASE -> "postgresql-provisioner";
            case CACHE -> "redis-provisioner";
            case QUEUE -> "rabbitmq-provisioner";
        };
    }

    private String selectAwsInfrastructureProvisioner(ResourceType resourceType) {
        return switch (resourceType) {
            case RELATIONAL_DATABASE -> "aurora-postgresql-provisioner";
            case CACHE -> "elasticache-redis-provisioner";
            case QUEUE -> "sqs-provisioner";
        };
    }

    public String getComputeType(StackType stackType, Environment environment) {
        EnvironmentConfig envConfig = EnvironmentConfig.findByEnvironment(environment);
        if (envConfig == null) {
            return null;
        }

        String cloud = envConfig.getEnvironment() != null && envConfig.getEnvironment().getCloudProvider() != null
                ? envConfig.getEnvironment().getCloudProvider().name : null;
        if (cloud == null) return null;
        if (cloud.equalsIgnoreCase("on-premises")) return getOnPremisesComputeType(stackType);
        if (cloud.equalsIgnoreCase("aws")) return getAwsComputeType(stackType);
        return null;
    }

    private String getOnPremisesComputeType(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> null;
            case RESTFUL_SERVERLESS, RESTFUL_API, JAVASCRIPT_WEB_APPLICATION, 
                 EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> "kubernetes";
        };
    }

    private String getAwsComputeType(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> null;
            case RESTFUL_SERVERLESS, EVENT_DRIVEN_SERVERLESS -> "lambda";
            case RESTFUL_API, EVENT_DRIVEN_API, JAVASCRIPT_WEB_APPLICATION -> "fargate";
        };
    }

    public String getCloudType(Environment environment) {
        EnvironmentConfig envConfig = EnvironmentConfig.findByEnvironment(environment);
        return envConfig != null && envConfig.getEnvironment() != null && envConfig.getEnvironment().getCloudProvider() != null
                ? envConfig.getEnvironment().getCloudProvider().name : null;
    }
}
