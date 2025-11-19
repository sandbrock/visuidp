package com.angryss.idp.infrastructure.security;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Test profile for demo mode integration tests.
 * 
 * This profile enables demo mode for testing by setting the
 * DEMO_MODE environment variable to true.
 */
public class DemoModeTestProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
            "idp.demo.enabled", "true",
            "idp.demo.user.name", "demo-test",
            "idp.demo.user.email", "demo-test@visuidp.example",
            "idp.demo.user.display-name", "Demo Test User"
        );
    }
}
