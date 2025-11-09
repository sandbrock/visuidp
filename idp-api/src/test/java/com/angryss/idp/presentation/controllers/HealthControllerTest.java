package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;

@QuarkusTest
public class HealthControllerTest {

    @Test
    public void testHealthEndpoint() {
        given()
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"))
                .body("service", is("idp-rest-api"))
                .body("version", is("1.0.0-SNAPSHOT"))
                .body("timestamp", notNullValue());
    }
}
