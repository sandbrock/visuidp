package com.angryss.idp.infrastructure.security;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

/**
 * Response filter that adds demo mode indicator to all API responses.
 * 
 * This filter validates Requirement 14.4:
 * "Add demo mode indicator to API responses (header or response field)"
 * 
 * The X-Demo-Mode header is added to all responses when demo mode is active,
 * allowing the UI to detect demo mode and display appropriate indicators.
 */
@Provider
public class DemoModeResponseFilter implements ContainerResponseFilter {

    @Inject
    DemoModeService demoModeService;

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        // Add X-Demo-Mode header to all responses
        responseContext.getHeaders().add("X-Demo-Mode", demoModeService.getDemoModeIndicator());
    }
}
