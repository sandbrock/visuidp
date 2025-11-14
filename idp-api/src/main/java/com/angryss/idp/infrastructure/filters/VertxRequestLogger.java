package com.angryss.idp.infrastructure.filters;

import io.quarkus.vertx.http.runtime.filters.Filters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

@ApplicationScoped
public class VertxRequestLogger {

    public void registerFilter(@Observes Filters filters) {
        System.out.println("!!! VERT.X FILTER REGISTERED !!!");
        filters.register(rc -> {
            String method = rc.request().method().name();
            String path = rc.request().path();
            
            System.out.println("=== VERT.X HTTP REQUEST ===");
            System.out.println("Method: " + method);
            System.out.println("Path: " + path);
            
            // Log all headers for PATCH requests
            if ("PATCH".equals(method)) {
                System.out.println("ALL HEADERS:");
                rc.request().headers().forEach(header -> {
                    System.out.println("  " + header.getKey() + ": " + header.getValue());
                });
            } else {
                System.out.println("X-Auth-Request-Groups: " + rc.request().getHeader("X-Auth-Request-Groups"));
                System.out.println("X-Auth-Request-Email: " + rc.request().getHeader("X-Auth-Request-Email"));
            }
            System.out.println("===========================");
            rc.next();
        }, 10); // Priority 10 - run early
    }
}
