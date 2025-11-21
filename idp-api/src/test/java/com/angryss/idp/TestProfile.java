package com.angryss.idp;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

/**
 * Test profile that disables Lambda and uses regular HTTP for tests.
 */
public class TestProfile implements QuarkusTestProfile {
    
    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
            "quarkus.lambda.enable-polling-jvm-mode", "false",
            "quarkus.lambda.mock-event-server.enabled", "false",
            "quarkus.http.test-port", "0"
        );
    }
}
