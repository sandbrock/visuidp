package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ApiKeyAuditLogDto;
import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.application.dtos.ApiKeyCreatedDto;
import com.angryss.idp.application.dtos.ApiKeyResponseDto;
import com.angryss.idp.application.usecases.ApiKeyService;
import io.quarkus.security.Authenticated;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for API key management operations.
 * Provides endpoints for creating, listing, rotating, revoking, and managing API keys.
 * Supports both user-level and system-level API keys.
 */
@Path("/v1/api-keys")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "API Keys", description = "API key management operations for programmatic authentication")
@Authenticated
@RunOnVirtualThread
public class ApiKeysController {

    @Inject
    ApiKeyService apiKeyService;

    /**
     * Creates a new user API key tied to the current user's account.
     * The generated key is returned only once and should be stored securely.
     *
     * @param dto The API key creation data including name and optional expiration
     * @return Response with HTTP 201 and the created API key including the plaintext key value
     */
    @POST
    @Path("/user")
    @Operation(
        summary = "Create user API key",
        description = """
            Creates a new API key tied to the current user's account. The plaintext key is returned only once.
            
            **Important**: Store the returned API key securely. It cannot be retrieved again after this response.
            
            **Example Request**:
            ```json
            {
              "keyName": "CI/CD Pipeline Key",
              "expirationDays": 90
            }
            ```
            
            **Example Response**:
            ```json
            {
              "id": "550e8400-e29b-41d4-a716-446655440000",
              "keyName": "CI/CD Pipeline Key",
              "keyPrefix": "idp_user_abc",
              "keyType": "USER",
              "userEmail": "developer@example.com",
              "createdByEmail": "developer@example.com",
              "createdAt": "2024-01-15T10:30:00",
              "expiresAt": "2024-04-15T10:30:00",
              "lastUsedAt": null,
              "isActive": true,
              "isExpiringSoon": false,
              "status": "ACTIVE",
              "apiKey": "idp_user_abc123def456ghi789jkl012mno345pqr678"
            }
            ```
            """
    )
    @APIResponse(
        responseCode = "201",
        description = "API key created successfully",
        content = @org.eclipse.microprofile.openapi.annotations.media.Content(
            mediaType = MediaType.APPLICATION_JSON,
            schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyCreatedDto.class)
        )
    )
    @APIResponse(responseCode = "400", description = "Invalid input - duplicate name or invalid expiration period")
    @APIResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    public Response createUserApiKey(
        @org.eclipse.microprofile.openapi.annotations.parameters.RequestBody(
            description = "API key creation details",
            required = true,
            content = @org.eclipse.microprofile.openapi.annotations.media.Content(
                mediaType = MediaType.APPLICATION_JSON,
                schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyCreateDto.class)
            )
        )
        ApiKeyCreateDto dto
    ) {
        try {
            ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(dto);
            return Response.status(Response.Status.CREATED).entity(createdKey).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Creates a new system API key not tied to any individual user.
     * Only administrators can create system keys.
     * The generated key is returned only once and should be stored securely.
     *
     * @param dto The API key creation data including name and optional expiration
     * @return Response with HTTP 201 and the created API key including the plaintext key value
     */
    @POST
    @Path("/system")
    @RolesAllowed("admin")
    @Operation(
        summary = "Create system API key",
        description = """
            Creates a new system-level API key not tied to any individual user. Admin role required. The plaintext key is returned only once.
            
            System keys are useful for automated systems and services that need to persist beyond individual user tenure.
            
            **Important**: Store the returned API key securely. It cannot be retrieved again after this response.
            
            **Example Request**:
            ```json
            {
              "keyName": "Production Deployment Service",
              "expirationDays": 180,
              "keyType": "SYSTEM"
            }
            ```
            
            **Example Response**:
            ```json
            {
              "id": "550e8400-e29b-41d4-a716-446655440000",
              "keyName": "Production Deployment Service",
              "keyPrefix": "idp_system_xyz",
              "keyType": "SYSTEM",
              "userEmail": null,
              "createdByEmail": "admin@example.com",
              "createdAt": "2024-01-15T10:30:00",
              "expiresAt": "2024-07-13T10:30:00",
              "lastUsedAt": null,
              "isActive": true,
              "isExpiringSoon": false,
              "status": "ACTIVE",
              "apiKey": "idp_system_xyz789abc456def123ghi890jkl567mno234"
            }
            ```
            """
    )
    @APIResponse(
        responseCode = "201",
        description = "System API key created successfully",
        content = @org.eclipse.microprofile.openapi.annotations.media.Content(
            mediaType = MediaType.APPLICATION_JSON,
            schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyCreatedDto.class)
        )
    )
    @APIResponse(responseCode = "400", description = "Invalid input - duplicate name or invalid expiration period")
    @APIResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response createSystemApiKey(
        @org.eclipse.microprofile.openapi.annotations.parameters.RequestBody(
            description = "System API key creation details",
            required = true,
            content = @org.eclipse.microprofile.openapi.annotations.media.Content(
                mediaType = MediaType.APPLICATION_JSON,
                schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyCreateDto.class)
            )
        )
        ApiKeyCreateDto dto
    ) {
        try {
            ApiKeyCreatedDto createdKey = apiKeyService.createSystemApiKey(dto);
            return Response.status(Response.Status.CREATED).entity(createdKey).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }
    }

    /**
     * Lists all API keys for the current user.
     * Returns key metadata including creation date, expiration, last used, and status.
     * The plaintext key values are never returned.
     *
     * @return Response with HTTP 200 and list of the user's API keys
     */
    @GET
    @Path("/user")
    @Operation(
        summary = "List user API keys",
        description = """
            Retrieves all API keys for the current user with metadata. Plaintext key values are not included.
            
            **Example Response**:
            ```json
            [
              {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "keyName": "CI/CD Pipeline Key",
                "keyPrefix": "idp_user_abc",
                "keyType": "USER",
                "userEmail": "developer@example.com",
                "createdByEmail": "developer@example.com",
                "createdAt": "2024-01-15T10:30:00",
                "expiresAt": "2024-04-15T10:30:00",
                "lastUsedAt": "2024-02-20T14:45:00",
                "isActive": true,
                "isExpiringSoon": false,
                "status": "ACTIVE"
              }
            ]
            ```
            """
    )
    @APIResponse(
        responseCode = "200",
        description = "API keys retrieved successfully",
        content = @org.eclipse.microprofile.openapi.annotations.media.Content(
            mediaType = MediaType.APPLICATION_JSON,
            schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyResponseDto.class, type = org.eclipse.microprofile.openapi.annotations.enums.SchemaType.ARRAY)
        )
    )
    @APIResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    public Response listUserApiKeys() {
        List<ApiKeyResponseDto> apiKeys = apiKeyService.listUserApiKeys();
        return Response.ok(apiKeys).build();
    }

    /**
     * Lists all system-level API keys.
     * Only administrators can access this endpoint.
     * Returns key metadata for system keys only (not user keys).
     *
     * @return Response with HTTP 200 and list of system API keys
     */
    @GET
    @Path("/system")
    @RolesAllowed("admin")
    @Operation(
        summary = "List system API keys",
        description = """
            Retrieves all system-level API keys. Admin role required.
            
            System keys are not tied to individual users and persist beyond user tenure.
            This endpoint only returns SYSTEM type keys, not user-level keys.
            
            **Example Response**:
            ```json
            [
              {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "keyName": "Production Deployment Service",
                "keyPrefix": "idp_system_xyz",
                "keyType": "SYSTEM",
                "userEmail": null,
                "createdByEmail": "admin@example.com",
                "createdAt": "2024-01-15T10:30:00",
                "expiresAt": "2024-07-13T10:30:00",
                "lastUsedAt": "2024-02-20T14:45:00",
                "isActive": true,
                "isExpiringSoon": false,
                "status": "ACTIVE"
              }
            ]
            """
    )
    @APIResponse(
        responseCode = "200",
        description = "System API keys retrieved successfully",
        content = @org.eclipse.microprofile.openapi.annotations.media.Content(
            mediaType = MediaType.APPLICATION_JSON,
            schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyResponseDto.class, type = org.eclipse.microprofile.openapi.annotations.enums.SchemaType.ARRAY)
        )
    )
    @APIResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response listSystemApiKeys() {
        List<ApiKeyResponseDto> apiKeys = apiKeyService.listSystemApiKeys();
        return Response.ok(apiKeys).build();
    }

    /**
     * Retrieves details for a specific API key by ID.
     * Users can only access their own keys, administrators can access any key.
     *
     * @param id The UUID of the API key to retrieve
     * @return Response with HTTP 200 and the API key details
     */
    @GET
    @Path("/{id}")
    @Operation(
        summary = "Get API key by ID",
        description = "Retrieves details for a specific API key. Users can only access their own keys, admins can access any key."
    )
    @APIResponse(responseCode = "200", description = "API key retrieved successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden - You do not have permission to access this API key")
    @APIResponse(responseCode = "404", description = "API key not found")
    public Response getApiKey(
        @Parameter(description = "API Key ID") @PathParam("id") UUID id
    ) {
        try {
            ApiKeyResponseDto apiKey = apiKeyService.getApiKeyById(id);
            return Response.ok(apiKey).build();
        } catch (IllegalArgumentException e) {
            throw new NotFoundException(e.getMessage());
        } catch (SecurityException e) {
            throw new ForbiddenException(e.getMessage());
        }
    }

    /**
     * Rotates an API key by generating a new key with the same permissions.
     * The old key remains active for a grace period (default 24 hours) to allow seamless transition.
     * Users can only rotate their own keys, administrators can rotate any key.
     * The new plaintext key is returned only once.
     *
     * @param id The UUID of the API key to rotate
     * @return Response with HTTP 200 and the new API key including the plaintext key value
     */
    @POST
    @Path("/{id}/rotate")
    @Consumes(MediaType.WILDCARD)  // Override class-level @Consumes since this endpoint doesn't require a body
    @Operation(
        summary = "Rotate API key",
        description = """
            Generates a new API key with the same permissions. The old key remains active for a grace period. The new plaintext key is returned only once.
            
            **Grace Period**: The old key remains valid for 24 hours (configurable) to allow seamless transition.
            Both the old and new keys will work during this period.
            
            **Important**: Store the returned API key securely. It cannot be retrieved again after this response.
            
            **Example Response**:
            ```json
            {
              "id": "660e8400-e29b-41d4-a716-446655440001",
              "keyName": "CI/CD Pipeline Key",
              "keyPrefix": "idp_user_xyz",
              "keyType": "USER",
              "userEmail": "developer@example.com",
              "createdByEmail": "developer@example.com",
              "createdAt": "2024-02-20T15:00:00",
              "expiresAt": "2024-05-20T15:00:00",
              "lastUsedAt": null,
              "isActive": true,
              "isExpiringSoon": false,
              "status": "ACTIVE",
              "apiKey": "idp_user_xyz789abc456def123ghi890jkl567mno234"
            }
            ```
            """
    )
    @APIResponse(
        responseCode = "200",
        description = "API key rotated successfully",
        content = @org.eclipse.microprofile.openapi.annotations.media.Content(
            mediaType = MediaType.APPLICATION_JSON,
            schema = @org.eclipse.microprofile.openapi.annotations.media.Schema(implementation = ApiKeyCreatedDto.class)
        )
    )
    @APIResponse(responseCode = "400", description = "Invalid request - key not found or already revoked")
    @APIResponse(responseCode = "401", description = "Unauthorized - Authentication required")
    @APIResponse(responseCode = "403", description = "Forbidden - You do not have permission to rotate this API key")
    @APIResponse(responseCode = "404", description = "API key not found")
    public Response rotateApiKey(
        @Parameter(description = "API Key ID", example = "550e8400-e29b-41d4-a716-446655440000") @PathParam("id") UUID id
    ) {
        try {
            ApiKeyCreatedDto rotatedKey = apiKeyService.rotateApiKey(id);
            return Response.ok(rotatedKey).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        } catch (SecurityException e) {
            throw new ForbiddenException(e.getMessage());
        }
    }

    /**
     * Revokes an API key, making it invalid for future authentication.
     * Users can only revoke their own keys, administrators can revoke any key.
     * Revocation is immediate and cannot be undone.
     *
     * @param id The UUID of the API key to revoke
     * @return Response with HTTP 204 (No Content)
     */
    @DELETE
    @Path("/{id}")
    @Operation(
        summary = "Revoke API key",
        description = "Immediately revokes an API key, making it invalid for authentication. Users can only revoke their own keys, admins can revoke any key."
    )
    @APIResponse(responseCode = "204", description = "API key revoked successfully")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden - You do not have permission to revoke this API key")
    @APIResponse(responseCode = "404", description = "API key not found")
    public Response revokeApiKey(
        @Parameter(description = "API Key ID") @PathParam("id") UUID id
    ) {
        try {
            apiKeyService.revokeApiKey(id);
            return Response.noContent().build();
        } catch (IllegalArgumentException e) {
            throw new NotFoundException(e.getMessage());
        } catch (SecurityException e) {
            throw new ForbiddenException(e.getMessage());
        }
    }

    /**
     * Updates the name of an API key.
     * Users can only update their own keys, administrators can update any key.
     * Key names must be unique within the user's keys (or among system keys).
     *
     * @param id The UUID of the API key to update
     * @param body Request body containing the new key name
     * @return Response with HTTP 200 and the updated API key details
     */
    @PUT
    @Path("/{id}/name")
    @Operation(
        summary = "Update API key name",
        description = "Updates the descriptive name of an API key. Users can only update their own keys, admins can update any key."
    )
    @APIResponse(responseCode = "200", description = "API key name updated successfully")
    @APIResponse(responseCode = "400", description = "Invalid input - name is required, too long, or duplicate")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden - You do not have permission to update this API key")
    @APIResponse(responseCode = "404", description = "API key not found")
    public Response updateApiKeyName(
        @Parameter(description = "API Key ID") @PathParam("id") UUID id,
        Map<String, String> body
    ) {
        try {
            String newName = body.get("keyName");
            if (newName == null) {
                throw new BadRequestException("keyName is required in request body");
            }
            
            ApiKeyResponseDto updatedKey = apiKeyService.updateApiKeyName(id, newName);
            return Response.ok(updatedKey).build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        } catch (SecurityException e) {
            throw new ForbiddenException(e.getMessage());
        }
    }

    /**
     * Retrieves audit logs for API key lifecycle events.
     * Only administrators can access audit logs.
     * Supports filtering by user email and date range.
     *
     * @param userEmail Optional filter by user email
     * @param startDate Optional filter by start date (ISO 8601 format)
     * @param endDate Optional filter by end date (ISO 8601 format)
     * @return Response with HTTP 200 and list of audit log entries
     */
    @GET
    @Path("/audit-logs")
    @RolesAllowed("admin")
    @Operation(
        summary = "Get API key audit logs",
        description = "Retrieves audit logs for API key lifecycle events. Supports filtering by user email and date range. Admin role required."
    )
    @APIResponse(responseCode = "200", description = "Audit logs retrieved successfully")
    @APIResponse(responseCode = "400", description = "Invalid date format")
    @APIResponse(responseCode = "401", description = "Unauthorized")
    @APIResponse(responseCode = "403", description = "Forbidden - Admin role required")
    public Response getAuditLogs(
        @Parameter(description = "Filter by user email") @QueryParam("userEmail") String userEmail,
        @Parameter(description = "Filter by start date (ISO 8601 format)") @QueryParam("startDate") String startDate,
        @Parameter(description = "Filter by end date (ISO 8601 format)") @QueryParam("endDate") String endDate
    ) {
        try {
            LocalDateTime startDateTime = null;
            LocalDateTime endDateTime = null;
            
            if (startDate != null && !startDate.isBlank()) {
                startDateTime = LocalDateTime.parse(startDate, DateTimeFormatter.ISO_DATE_TIME);
            }
            
            if (endDate != null && !endDate.isBlank()) {
                endDateTime = LocalDateTime.parse(endDate, DateTimeFormatter.ISO_DATE_TIME);
            }
            
            List<ApiKeyAuditLogDto> auditLogs = apiKeyService.getApiKeyAuditLogs(userEmail, startDateTime, endDateTime);
            return Response.ok(auditLogs).build();
        } catch (Exception e) {
            throw new BadRequestException("Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00)");
        }
    }
}
