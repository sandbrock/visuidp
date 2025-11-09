package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;

@QuarkusTest
public class StackTypesControllerTest {

    @Test
    public void testGetAllStackTypes() {
        given()
            .when().get("/v1/stack-types")
            .then()
                .statusCode(200)
                .body("size()", is(6))
                .body("find { it.name == 'EVENT_DRIVEN_API' }.displayName", is("Event-driven API"))
                .body("find { it.name == 'EVENT_DRIVEN_API' }.supportsPublicAccess", is(true))
                .body("find { it.name == 'EVENT_DRIVEN_API' }.requiresProgrammingLanguage", is(true))
                .body("find { it.name == 'EVENT_DRIVEN_API' }.requiresEventConfiguration", is(true))
                .body("find { it.name == 'EVENT_DRIVEN_API' }.requiresApiConfiguration", is(true));
    }

    @Test
    public void testGetStackTypeDetails() {
        given()
            .when().get("/v1/stack-types/EVENT_DRIVEN_API")
            .then()
                .statusCode(200)
                .body("name", is("EVENT_DRIVEN_API"))
                .body("displayName", is("Event-driven API"))
                .body("supportsPublicAccess", is(true))
                .body("requiresProgrammingLanguage", is(true))
                .body("requiresEventConfiguration", is(true))
                .body("requiresApiConfiguration", is(true))
                .body("supportedLanguages.size()", is(2))
                .body("defaultLanguage", is("QUARKUS"));
    }

    @Test
    public void testJavaScriptWebAppLanguageConstraint() {
        given()
            .when().get("/v1/stack-types/JAVASCRIPT_WEB_APPLICATION")
            .then()
                .statusCode(200)
                .body("name", is("JAVASCRIPT_WEB_APPLICATION"))
                .body("requiresProgrammingLanguage", is(true))
                .body("supportedLanguages.size()", is(1))
                .body("supportedLanguages[0]", is("NODE_JS"))
                .body("defaultLanguage", is("NODE_JS"));
    }

    // Note: These endpoints require authentication, so they're disabled in basic tests
    // They can be tested with proper auth setup in integration tests
}
