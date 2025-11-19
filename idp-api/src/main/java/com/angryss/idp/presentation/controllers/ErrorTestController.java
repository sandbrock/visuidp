package com.angryss.idp.presentation.controllers;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Test controller for triggering various error conditions.
 * This controller is used by property-based tests to verify error logging behavior.
 * 
 * WARNING: This controller should only be enabled in test environments.
 */
@Path("/v1/test-errors")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ErrorTestController {

    /**
     * Trigger a 500 Internal Server Error
     */
    @GET
    @Path("/500")
    public Response trigger500() {
        throw new RuntimeException("Test 500 error - Internal Server Error");
    }

    /**
     * Trigger a 503 Service Unavailable Error
     */
    @GET
    @Path("/503")
    public Response trigger503() {
        throw new WebApplicationException("Test 503 error - Service Unavailable", 
                Response.Status.SERVICE_UNAVAILABLE);
    }

    /**
     * Trigger a 502 Bad Gateway Error
     */
    @GET
    @Path("/502")
    public Response trigger502() {
        throw new WebApplicationException("Test 502 error - Bad Gateway", 
                Response.Status.BAD_GATEWAY);
    }

    /**
     * Trigger a 400 Bad Request Error
     */
    @GET
    @Path("/400")
    public Response trigger400() {
        throw new IllegalArgumentException("Test 400 error - Bad Request");
    }

    /**
     * Trigger a 404 Not Found Error
     */
    @GET
    @Path("/404")
    public Response trigger404() {
        throw new NotFoundException("Test 404 error - Not Found");
    }

    /**
     * Trigger a 401 Unauthorized Error
     */
    @GET
    @Path("/401")
    public Response trigger401() {
        throw new WebApplicationException("Test 401 error - Unauthorized", 
                Response.Status.UNAUTHORIZED);
    }

    /**
     * Trigger an error with a specific status code
     */
    @GET
    @Path("/{statusCode}")
    public Response triggerCustomError(@PathParam("statusCode") int statusCode) {
        if (statusCode >= 500) {
            throw new WebApplicationException("Test " + statusCode + " error", statusCode);
        } else if (statusCode >= 400) {
            throw new WebApplicationException("Test " + statusCode + " error", statusCode);
        } else {
            return Response.status(statusCode).entity("Test response").build();
        }
    }

    /**
     * Trigger an exception with a deep stack trace
     */
    @GET
    @Path("/deep-stack")
    public Response triggerDeepStackTrace() {
        return level1();
    }

    private Response level1() {
        return level2();
    }

    private Response level2() {
        return level3();
    }

    private Response level3() {
        throw new RuntimeException("Deep stack trace error");
    }
}
