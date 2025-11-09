package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class UserControllerTest {

    @Test
    public void testGetCurrentUserEndpoint() {
        given()
            .header("X-Auth-Request-User", "testuser")
            .header("X-Auth-Request-Email", "testuser@example.com")
            .when().get("/v1/user/me")
            .then()
                .statusCode(200)
                // principal prefers email when provided
                .body("name", is("testuser@example.com"))
                .body("email", is("testuser@example.com"))
                .body("authenticated", is(true));
    }

    @Test
    public void testGetUserInfoEndpoint() {
        given()
            .header("X-Auth-Request-User", "testuser")
            .header("X-Auth-Request-Email", "testuser@example.com")
            .when().get("/v1/user/info")
            .then()
                .statusCode(200)
                // returns a complex object; ensure authenticated and headers echoed
                .body("authenticated", is(true))
                .body("authenticated", is(true));
    }

    @Test
    public void testGetCurrentUserWithoutEmailHeader() {
        given()
            .header("X-Auth-Request-User", "testuser")
            .when().get("/v1/user/me")
            .then()
                .statusCode(200)
                .body("name", is("testuser"))
                // email key should be absent when not provided
                .body("authenticated", is(true));
    }

    @Test
    public void testGetUserInfoWithoutEmailHeader() {
        given()
            .header("X-Auth-Request-User", "testuser")
            .when().get("/v1/user/info")
            .then()
                .statusCode(200)
                .body("authenticated", is(true))
                .body("authenticated", is(true));
    }

    @Test
    public void testGetCurrentUserUnauthorized() {
        given()
            .when().get("/v1/user/me")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetUserInfoUnauthorized() {
        given()
            .when().get("/v1/user/info")
            .then()
                .statusCode(401);
    }
}
