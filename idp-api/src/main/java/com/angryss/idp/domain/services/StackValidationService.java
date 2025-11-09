package com.angryss.idp.domain.services;

import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Arrays;
import java.util.List;

@ApplicationScoped
public class StackValidationService {

    public boolean isPublicSupported(StackType stackType) {
        return switch (stackType) {
            case RESTFUL_SERVERLESS, RESTFUL_API, EVENT_DRIVEN_API -> true;
            case INFRASTRUCTURE, EVENT_DRIVEN_SERVERLESS, JAVASCRIPT_WEB_APPLICATION -> false;
        };
    }

    public boolean isProgrammingLanguageRequired(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> false;
            case RESTFUL_SERVERLESS, RESTFUL_API, JAVASCRIPT_WEB_APPLICATION, 
                 EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> true;
        };
    }

    public List<ProgrammingLanguage> getSupportedLanguages(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> List.of();
            case JAVASCRIPT_WEB_APPLICATION -> List.of(ProgrammingLanguage.NODE_JS);
            case RESTFUL_SERVERLESS, RESTFUL_API, EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> 
                Arrays.asList(ProgrammingLanguage.QUARKUS, ProgrammingLanguage.NODE_JS);
        };
    }

    public ProgrammingLanguage getDefaultLanguage(StackType stackType) {
        return switch (stackType) {
            case INFRASTRUCTURE -> null;
            case JAVASCRIPT_WEB_APPLICATION -> ProgrammingLanguage.NODE_JS;
            case RESTFUL_SERVERLESS, RESTFUL_API, EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> 
                ProgrammingLanguage.QUARKUS;
        };
    }

    public boolean requiresEventConfiguration(StackType stackType) {
        return switch (stackType) {
            case EVENT_DRIVEN_SERVERLESS, EVENT_DRIVEN_API -> true;
            case INFRASTRUCTURE, RESTFUL_SERVERLESS, RESTFUL_API, JAVASCRIPT_WEB_APPLICATION -> false;
        };
    }

    public boolean requiresApiConfiguration(StackType stackType) {
        return switch (stackType) {
            case RESTFUL_SERVERLESS, RESTFUL_API, EVENT_DRIVEN_API -> true;
            case INFRASTRUCTURE, EVENT_DRIVEN_SERVERLESS, JAVASCRIPT_WEB_APPLICATION -> false;
        };
    }

    @Deprecated
    public String getComputeTypeForStack(StackType stackType, String targetEnvironment) {
        // Legacy method - use ProvisionerSelectionService instead
        boolean isOnPremises = targetEnvironment != null && 
            targetEnvironment.toLowerCase().contains("onprem");

        if (isOnPremises) {
            return "kubernetes";
        }

        return switch (stackType) {
            case RESTFUL_SERVERLESS, EVENT_DRIVEN_SERVERLESS -> "lambda";
            case RESTFUL_API, EVENT_DRIVEN_API, JAVASCRIPT_WEB_APPLICATION -> "fargate";
            case INFRASTRUCTURE -> null; // No compute for infrastructure stacks
        };
    }
}
