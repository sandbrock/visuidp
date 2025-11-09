package com.angryss.idp.infrastructure.openapi;

import jakarta.ws.rs.core.Application;
import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeIn;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType;
import org.eclipse.microprofile.openapi.annotations.info.Contact;
import org.eclipse.microprofile.openapi.annotations.info.Info;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme;
import org.eclipse.microprofile.openapi.annotations.servers.Server;

/**
 * OpenAPI configuration for the Internal Developer Platform API.
 * Defines security schemes, API information, and global settings.
 */
@OpenAPIDefinition(
    info = @Info(
        title = "Internal Developer Platform API",
        version = "1.0.0",
        description = """
            RESTful API for provisioning and managing developer projects across multiple environments.
            
            ## Authentication
            
            This API supports two authentication methods:
            
            ### 1. OAuth2 Proxy (SSO)
            The primary authentication method for interactive users. Authentication is handled by an external OAuth2 Proxy
            that integrates with AWS Identity Center. User information is passed via HTTP headers:
            - `X-Forwarded-User`: Username
            - `X-Forwarded-Email`: User email address
            
            ### 2. API Key Authentication
            For programmatic access, you can use API keys. API keys are passed in the `Authorization` header using the Bearer scheme:
            
            ```
            Authorization: Bearer idp_user_abc123...
            ```
            
            #### API Key Format
            - **User keys**: `idp_user_<random_32_chars>` (41 characters total)
            - **System keys**: `idp_system_<random_32_chars>` (43 characters total)
            
            #### Creating API Keys
            1. Authenticate via OAuth2 Proxy
            2. Use the `/api/v1/api-keys/user` endpoint to create a personal API key
            3. Administrators can create system-level keys via `/api/v1/api-keys/system`
            4. The plaintext key is shown only once - store it securely
            
            #### Using API Keys
            Include the API key in the Authorization header of your requests:
            
            ```bash
            curl -H "Authorization: Bearer idp_user_abc123..." https://api.example.com/api/v1/stacks
            ```
            
            #### API Key Lifecycle
            - Keys expire after a configurable period (default: 90 days)
            - Keys can be rotated with a grace period (default: 24 hours)
            - Keys can be revoked immediately
            - All key lifecycle events are audited
            
            ## Authorization
            
            Both authentication methods result in the same authorization model:
            - **User role**: Standard users can manage their own resources
            - **Admin role**: Administrators have full access to all resources and can manage system-level API keys
            
            Admin access is granted based on Azure Entra ID group membership configured in the OAuth2 Proxy.
            """,
        contact = @Contact(
            name = "IDP Support",
            email = "support@angryss.com"
        )
    ),
    servers = {
        @Server(url = "https://localhost:8443", description = "Local development (via Traefik)"),
        @Server(url = "http://localhost:8082", description = "Local development (direct)")
    },
    security = {
        @SecurityRequirement(name = "BearerAuth"),
        @SecurityRequirement(name = "OAuth2Proxy")
    }
)
@SecurityScheme(
    securitySchemeName = "BearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "API Key",
    description = """
        API Key authentication using Bearer token scheme.
        
        **Format**: `Authorization: Bearer <api_key>`
        
        **Example**: `Authorization: Bearer idp_user_abc123def456ghi789jkl012mno345pqr678`
        
        **Key Types**:
        - User keys: `idp_user_*` - Tied to a specific user account
        - System keys: `idp_system_*` - Organization-level keys not tied to individual users
        
        **Obtaining an API Key**:
        1. Authenticate via OAuth2 Proxy
        2. Create a key via POST /api/v1/api-keys/user
        3. Store the returned key securely (shown only once)
        
        **Security Notes**:
        - Keys are hashed using BCrypt before storage
        - Keys expire after a configurable period (default: 90 days)
        - Failed authentication attempts are logged with source IP
        - Keys can be rotated or revoked at any time
        """,
    in = SecuritySchemeIn.HEADER
)
@SecurityScheme(
    securitySchemeName = "OAuth2Proxy",
    type = SecuritySchemeType.APIKEY,
    description = """
        OAuth2 Proxy authentication via HTTP headers.
        
        This authentication method is handled by an external OAuth2 Proxy that integrates with AWS Identity Center.
        User information is passed to the API via HTTP headers set by the proxy.
        
        **Required Headers**:
        - `X-Forwarded-User`: Username from identity provider
        - `X-Forwarded-Email`: User email address from identity provider
        
        **Note**: This authentication method is typically used for interactive browser-based access.
        For programmatic access, use API Key authentication instead.
        """,
    apiKeyName = "X-Forwarded-Email",
    in = SecuritySchemeIn.HEADER
)
public class OpenApiConfiguration extends Application {
}
