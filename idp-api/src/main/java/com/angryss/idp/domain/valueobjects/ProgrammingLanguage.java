package com.angryss.idp.domain.valueobjects;

public enum ProgrammingLanguage {
    QUARKUS("Quarkus"),
    NODE_JS("Node.js"),
    REACT("React");

    private final String displayName;

    ProgrammingLanguage(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}