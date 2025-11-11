package com.angryss.idp.infrastructure.filters;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;

@Provider
public class RequestLoggingFilter implements ContainerRequestFilter {

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        System.out.println("=== REQUEST FILTER ===");
        System.out.println("Method: " + requestContext.getMethod());
        System.out.println("Path: " + requestContext.getUriInfo().getPath());
        System.out.println("Security Context: " + requestContext.getSecurityContext());
        System.out.println("User Principal: " + (requestContext.getSecurityContext() != null && requestContext.getSecurityContext().getUserPrincipal() != null 
            ? requestContext.getSecurityContext().getUserPrincipal().getName() 
            : "null"));
        System.out.println("Headers: " + requestContext.getHeaders().keySet());
        System.out.println("======================");
    }
}
