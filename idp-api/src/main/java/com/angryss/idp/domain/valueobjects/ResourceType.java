package com.angryss.idp.domain.valueobjects;

public enum ResourceType {
    RELATIONAL_DATABASE("Relational Database"),
    CACHE("Cache"),
    QUEUE("Queue");

    private final String displayName;

    ResourceType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}