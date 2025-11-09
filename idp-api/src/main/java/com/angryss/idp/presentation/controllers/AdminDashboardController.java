package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.AdminDashboardDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.application.usecases.AdminDashboardService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.Map;

/**
 * REST controller for admin dashboard operations.
 * Provides endpoints for viewing aggregated configuration data, statistics, and incomplete mappings.
 * All endpoints require admin role.
 */
@Path("/v1/admin/dashboard")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Admin - Dashboard", description = "Admin dashboard operations for configuration overview")
@RolesAllowed("admin")
@RunOnVirtualThread
public class AdminDashboardController {

    @Inject
    AdminDashboardService adminDashboardService;

    /**
     * Get comprehensive dashboard data.
     * Returns aggregated configuration data including cloud providers, resource types,
     * mappings, and statistics.
     *
     * @return AdminDashboardDto containing all configuration data and statistics
     */
    @GET
    @Operation(
        summary = "Get admin dashboard overview",
        description = "Retrieves comprehensive dashboard data including all cloud providers, resource types, mappings, and statistics"
    )
    @APIResponse(responseCode = "200", description = "Dashboard data retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public AdminDashboardDto getDashboard() {
        return adminDashboardService.getDashboard();
    }

    /**
     * Get all incomplete resource type cloud mappings.
     * A mapping is considered incomplete if it lacks a Terraform module location
     * or has no property schemas defined.
     *
     * @return List of incomplete mapping DTOs
     */
    @GET
    @Path("/incomplete-mappings")
    @Operation(
        summary = "Get incomplete mappings",
        description = "Retrieves all resource type cloud mappings that are incomplete (missing Terraform module location or property schemas)"
    )
    @APIResponse(responseCode = "200", description = "Incomplete mappings retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public List<ResourceTypeCloudMappingDto> getIncompleteMappings() {
        return adminDashboardService.getIncompleteMappings();
    }

    /**
     * Get configuration statistics.
     * Provides counts for cloud providers, resource types, mappings, properties,
     * and breakdowns by enabled status and completeness.
     *
     * @return Map of statistic names to counts
     */
    @GET
    @Path("/statistics")
    @Operation(
        summary = "Get configuration statistics",
        description = "Retrieves statistics for all configuration entities including counts by enabled status and completeness"
    )
    @APIResponse(responseCode = "200", description = "Statistics retrieved successfully")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Map<String, Integer> getStatistics() {
        return adminDashboardService.getStatistics();
    }
}
