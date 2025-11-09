package com.angryss.idp.domain.valueobjects;

public enum ComputePlatform {
    KUBERNETES("Kubernetes"),
    LAMBDA("AWS Lambda"),
    ECS_FARGATE("AWS ECS Fargate");

    private final String displayName;

    ComputePlatform(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static ComputePlatform getComputePlatform(StackType stackType, String environment) {
        // On-premises always uses Kubernetes
        if (isOnPremises(environment)) {
            return KUBERNETES;
        }

        // AWS environment - determine platform based on stack type
        return switch (stackType) {
            case RESTFUL_SERVERLESS, EVENT_DRIVEN_SERVERLESS -> LAMBDA;
            case RESTFUL_API, EVENT_DRIVEN_API, JAVASCRIPT_WEB_APPLICATION -> ECS_FARGATE;
            case INFRASTRUCTURE -> null; // Infrastructure stacks don't have compute
        };
    }

    private static boolean isOnPremises(String environment) {
        // This would be determined by configuration or environment variables
        // For now, assume AWS unless specified otherwise
        return environment != null && environment.toLowerCase().contains("onprem");
    }
}