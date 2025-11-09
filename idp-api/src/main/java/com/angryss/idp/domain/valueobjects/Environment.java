package com.angryss.idp.domain.valueobjects;

public enum Environment {
    DEV("Development"),
    PROD("Production");

    private final String displayName;

    Environment(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
