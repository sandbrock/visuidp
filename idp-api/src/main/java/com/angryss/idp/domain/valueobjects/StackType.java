package com.angryss.idp.domain.valueobjects;

public enum StackType {
    INFRASTRUCTURE("Infrastructure"),
    RESTFUL_SERVERLESS("RESTful Serverless"),
    RESTFUL_API("RESTful API"),
    JAVASCRIPT_WEB_APPLICATION("JavaScript Web Application"),
    EVENT_DRIVEN_SERVERLESS("Event-driven Serverless"),
    EVENT_DRIVEN_API("Event-driven API");

    private final String displayName;

    StackType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}