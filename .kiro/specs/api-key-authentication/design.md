# Design Document

## Overview

This design document outlines the implementation of API key authentication for the Internal Developer Platform (IDP). The solution extends the existing OAuth2 Proxy authentication mechanism to support programmatic access through API keys while maintaining the same security and authorization model. The design follows the existing clean architecture pattern with domain entities, application services, infrastructure security components, and presentation layer controllers.

## Architecture

### High-Level Architecture

The API key authentication system integrates with the existing Quarkus security framework alongside the OAuth2 Proxy mechanism. When a request arrives, the system checks for an API key in the Authorization header before falling back to OAuth2 Proxy headers. Both authentication methods result in the same SecurityIdentity structure, ensuring consistent authorization behavior.

```
Request Flow:
1. HTTP Request → API Key Authentication Mechanism
2. If API key present → Validate key → Create SecurityIdentity
3. If no API key → Fall back to TraefikAuthenticationMechanism
4. SecurityIdentity → Authorization checks → Controller
```

### Authentication Chain

The system uses Quarkus's authentication mechanism priority system:
- Priority 0: ApiKeyAuthenticationMechanism (checked first)
- Priority 1: TraefikAuthenticationMechanism (existing OAuth2 Proxy)

### Key Security Principles

1. **Hash Storage**: API keys are hashed using BCrypt before storage, never stored in plaintext
2. **Single Exposure**: The plaintext key is shown to the user only once during generation
3. **Prefix Identification**: Keys use a prefix (e.g., "idp_user_" or "idp_system_") for identification and logging
4. **Audit Trail**: All key lifecycle events are logged to admin_audit_logs
5. **Rate Limiting**: Failed authentication attempts are logged for monitoring

## Components and Interfaces

### Domain Layer

#### ApiKey Entity

```java
@Entity
@Table(name = "api_keys")
public class ApiKey extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "key_name", nullable = false, length = 100)
    private String keyName;
    
    @Column(name = "key_hash", nullable = false, unique = true)
    private String keyHash;
    
    @Column(name = "key_prefix", nullable = false, length = 20)
    private String keyPrefix;
    
    @Column(name = "key_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ApiKeyType keyType;
    
    @Column(name = "user_email")
    private String userEmail;
    
    @Column(name = "created_by_email", nullable = false)
    private String createdByEmail;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
    
    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
    
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    
    @Column(name = "revoked_by_email")
    private String revokedByEmail;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
    
    // Methods
    public boolean isValid();
    public boolean isExpired();
    public void markAsUsed();
    public void revoke(String revokedBy);
}
```

#### ApiKeyType Enum

```java
public enum ApiKeyType {
    USER,    // Personal API key tied to a user
    SYSTEM   // System-level API key not tied to a specific user
}
```

#### Domain Service: ApiKeyValidationService

```java
@ApplicationScoped
public class ApiKeyValidationService {
    public boolean validateKeyFormat(String apiKey);
    public boolean verifyKeyHash(String plainKey, String storedHash);
    public boolean isKeyExpiringSoon(LocalDateTime expiresAt);
}
```

### Application Layer

#### DTOs

```java
// Request DTOs
public class ApiKeyCreateDto {
    private String keyName;
    private Integer expirationDays; // null for default
    private ApiKeyType keyType;
}

public class ApiKeyRotateDto {
    private UUID keyId;
    private Integer expirationDays;
}

// Response DTOs
public class ApiKeyResponseDto {
    private UUID id;
    private String keyName;
    private String keyPrefix;
    private ApiKeyType keyType;
    private String userEmail;
    private String createdByEmail;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime lastUsedAt;
    private Boolean isActive;
    private Boolean isExpiringSoon;
    private String status; // ACTIVE, EXPIRED, REVOKED
}

public class ApiKeyCreatedDto extends ApiKeyResponseDto {
    private String apiKey; // Only included on creation/rotation
}

public class ApiKeyAuditLogDto {
    private UUID id;
    private String userEmail;
    private String action;
    private LocalDateTime timestamp;
    private String keyPrefix;
    private String sourceIp;
}
```

#### Use Case: ApiKeyService

```java
@ApplicationScoped
public class ApiKeyService {
    @Inject
    ApiKeyValidationService validationService;
    
    @Inject
    SecurityIdentity securityIdentity;
    
    @ConfigProperty(name = "idp.api-key.default-expiration-days")
    Integer defaultExpirationDays;
    
    @ConfigProperty(name = "idp.api-key.rotation-grace-period-hours")
    Integer rotationGracePeriodHours;
    
    @Transactional
    public ApiKeyCreatedDto createUserApiKey(ApiKeyCreateDto dto);
    
    @Transactional
    @RolesAllowed("admin")
    public ApiKeyCreatedDto createSystemApiKey(ApiKeyCreateDto dto);
    
    @Transactional
    public ApiKeyCreatedDto rotateApiKey(UUID keyId);
    
    @Transactional
    public void revokeApiKey(UUID keyId);
    
    public List<ApiKeyResponseDto> listUserApiKeys();
    
    @RolesAllowed("admin")
    public List<ApiKeyResponseDto> listAllApiKeys();
    
    @RolesAllowed("admin")
    public List<ApiKeyAuditLogDto> getApiKeyAuditLogs(String userEmail, LocalDateTime startDate, LocalDateTime endDate);
    
    public ApiKeyResponseDto getApiKeyById(UUID keyId);
    
    @Transactional
    public ApiKeyResponseDto updateApiKeyName(UUID keyId, String newName);
    
    // Internal methods
    private String generateApiKey(ApiKeyType type);
    private String hashApiKey(String plainKey);
    private void logApiKeyEvent(String action, UUID keyId, Map<String, Object> details);
    private void scheduleExpirationCheck();
}
```

### Infrastructure Layer

#### Security: ApiKeyAuthenticationMechanism

```java
@Alternative
@Priority(0) // Higher priority than TraefikAuthenticationMechanism
@ApplicationScoped
public class ApiKeyAuthenticationMechanism implements HttpAuthenticationMechanism {
    
    @Inject
    ApiKeyValidationService validationService;
    
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    
    @Override
    public Uni<SecurityIdentity> authenticate(RoutingContext context, IdentityProviderManager identityProviderManager) {
        String authHeader = context.request().getHeader(AUTHORIZATION_HEADER);
        
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return Uni.createFrom().nullItem(); // Fall through to next mechanism
        }
        
        String apiKey = authHeader.substring(BEARER_PREFIX.length());
        
        // Validate and authenticate
        return validateApiKey(apiKey, context)
            .onItem().transform(this::buildSecurityIdentity)
            .onFailure().recoverWithNull();
    }
    
    private Uni<ApiKey> validateApiKey(String plainKey, RoutingContext context) {
        // Extract prefix and lookup key
        // Verify hash
        // Check expiration and active status
        // Update last_used_at
        // Log authentication attempt
    }
    
    private SecurityIdentity buildSecurityIdentity(ApiKey apiKey) {
        // Build QuarkusSecurityIdentity with appropriate principal and roles
        // For user keys: use userEmail as principal, add "user" role
        // For system keys: use "system-" + keyId as principal, add "admin" role
    }
    
    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, "WWW-Authenticate", "Bearer"));
    }
}
```

#### Security: ApiKeyPrincipal

```java
public class ApiKeyPrincipal implements Principal {
    private final String name;
    private final String email;
    private final ApiKeyType keyType;
    private final UUID keyId;
    
    @Override
    public String getName() {
        return name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public ApiKeyType getKeyType() {
        return keyType;
    }
    
    public UUID getKeyId() {
        return keyId;
    }
}
```

### Presentation Layer

#### Controller: ApiKeysController

```java
@Path("/api/v1/api-keys")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ApiKeysController {
    
    @Inject
    ApiKeyService apiKeyService;
    
    @POST
    @Path("/user")
    public Response createUserApiKey(ApiKeyCreateDto dto) {
        // Create user API key
        // Return 201 with ApiKeyCreatedDto
    }
    
    @POST
    @Path("/system")
    @RolesAllowed("admin")
    public Response createSystemApiKey(ApiKeyCreateDto dto) {
        // Create system API key
        // Return 201 with ApiKeyCreatedDto
    }
    
    @GET
    @Path("/user")
    public Response listUserApiKeys() {
        // List current user's API keys
        // Return 200 with List<ApiKeyResponseDto>
    }
    
    @GET
    @Path("/all")
    @RolesAllowed("admin")
    public Response listAllApiKeys() {
        // List all API keys (admin only)
        // Return 200 with List<ApiKeyResponseDto>
    }
    
    @GET
    @Path("/{id}")
    public Response getApiKey(@PathParam("id") UUID id) {
        // Get specific API key details
        // Return 200 with ApiKeyResponseDto
    }
    
    @POST
    @Path("/{id}/rotate")
    public Response rotateApiKey(@PathParam("id") UUID id) {
        // Rotate API key
        // Return 200 with ApiKeyCreatedDto
    }
    
    @DELETE
    @Path("/{id}")
    public Response revokeApiKey(@PathParam("id") UUID id) {
        // Revoke API key
        // Return 204
    }
    
    @PUT
    @Path("/{id}/name")
    public Response updateApiKeyName(@PathParam("id") UUID id, Map<String, String> body) {
        // Update API key name
        // Return 200 with ApiKeyResponseDto
    }
    
    @GET
    @Path("/audit-logs")
    @RolesAllowed("admin")
    public Response getAuditLogs(
        @QueryParam("userEmail") String userEmail,
        @QueryParam("startDate") String startDate,
        @QueryParam("endDate") String endDate) {
        // Get audit logs
        // Return 200 with List<ApiKeyAuditLogDto>
    }
}
```

## Data Models

### Database Schema

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    key_type VARCHAR(20) NOT NULL CHECK (key_type IN ('USER', 'SYSTEM')),
    user_email VARCHAR(255),
    created_by_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_by_email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    CONSTRAINT chk_user_key_has_email CHECK (
        (key_type = 'USER' AND user_email IS NOT NULL) OR
        (key_type = 'SYSTEM' AND user_email IS NULL)
    )
);

CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_user_email ON api_keys(user_email);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_keys_key_type ON api_keys(key_type);

COMMENT ON TABLE api_keys IS 'Stores API keys for programmatic authentication';
COMMENT ON COLUMN api_keys.key_hash IS 'BCrypt hash of the API key, never store plaintext';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the key for identification in logs';
COMMENT ON COLUMN api_keys.key_type IS 'USER keys are tied to a user, SYSTEM keys are organization-level';
```

### API Key Format

API keys follow this format:
- User keys: `idp_user_<random_32_chars>` (total 41 characters)
- System keys: `idp_system_<random_32_chars>` (total 43 characters)

The prefix allows for:
1. Quick identification of key type
2. Safe logging (only prefix is logged, not full key)
3. Future extensibility (e.g., `idp_readonly_`, `idp_service_`)

Random portion uses cryptographically secure random generation with Base62 encoding (alphanumeric).

## Error Handling

### Error Scenarios

1. **Invalid API Key Format**
   - HTTP 401 Unauthorized
   - Message: "Invalid API key format"

2. **API Key Not Found**
   - HTTP 401 Unauthorized
   - Message: "Invalid API key"

3. **Expired API Key**
   - HTTP 401 Unauthorized
   - Message: "API key has expired"

4. **Revoked API Key**
   - HTTP 401 Unauthorized
   - Message: "API key has been revoked"

5. **Unauthorized Key Access**
   - HTTP 403 Forbidden
   - Message: "You do not have permission to access this API key"

6. **Duplicate Key Name**
   - HTTP 400 Bad Request
   - Message: "An API key with this name already exists"

7. **Invalid Expiration Period**
   - HTTP 400 Bad Request
   - Message: "Expiration period must be between 1 and 365 days"

### Logging Strategy

- **Successful Authentication**: Log at INFO level with key prefix, user email, and timestamp
- **Failed Authentication**: Log at WARN level with key prefix (if parseable), source IP, and reason
- **Key Lifecycle Events**: Log to admin_audit_logs table with full context
- **Security Events**: Log at ERROR level for suspicious patterns (e.g., repeated failed attempts)

## Testing Strategy

### Unit Tests

1. **ApiKeyValidationService Tests**
   - Test key format validation
   - Test hash verification
   - Test expiration detection

2. **ApiKeyService Tests**
   - Test key generation with correct format
   - Test hash storage (never plaintext)
   - Test rotation with grace period
   - Test revocation logic
   - Test authorization checks (user can only access own keys)

3. **ApiKey Entity Tests**
   - Test isValid() method
   - Test isExpired() method
   - Test markAsUsed() updates timestamp

### Integration Tests

1. **ApiKeyAuthenticationMechanism Tests**
   - Test successful authentication with valid key
   - Test rejection of invalid key
   - Test rejection of expired key
   - Test rejection of revoked key
   - Test fallback to OAuth2 Proxy when no API key present

2. **ApiKeysController Tests**
   - Test user key creation
   - Test system key creation (admin only)
   - Test key listing (user sees only their keys)
   - Test key rotation
   - Test key revocation
   - Test audit log retrieval (admin only)

3. **End-to-End Tests**
   - Test full request flow with API key
   - Test authorization with API key (same as OAuth2)
   - Test key expiration workflow
   - Test key rotation workflow with grace period

### Security Tests

1. **Hash Security**
   - Verify keys are never stored in plaintext
   - Verify BCrypt is used with appropriate cost factor
   - Verify hash uniqueness constraint

2. **Authorization Tests**
   - Verify users cannot access other users' keys
   - Verify non-admins cannot create system keys
   - Verify non-admins cannot access audit logs

3. **Rate Limiting Tests**
   - Verify failed authentication attempts are logged
   - Verify suspicious patterns are detected

## Configuration

### Application Properties

```properties
# API Key Configuration
idp.api-key.default-expiration-days=90
idp.api-key.rotation-grace-period-hours=24
idp.api-key.max-keys-per-user=10
idp.api-key.bcrypt-cost-factor=12
idp.api-key.key-length=32

# Security
idp.api-key.rate-limit-enabled=true
idp.api-key.rate-limit-max-attempts=5
idp.api-key.rate-limit-window-minutes=15
```

## Migration Strategy

### Database Migration

Create Flyway migration `V3__api_keys.sql`:
1. Create api_keys table
2. Create indexes
3. Add comments

### Deployment Steps

1. Deploy database migration
2. Deploy backend with new authentication mechanism
3. Update API documentation
4. Communicate feature availability to users

### Backward Compatibility

- OAuth2 Proxy authentication continues to work unchanged
- No breaking changes to existing APIs
- API keys are opt-in feature

## Security Considerations

### Key Generation
- Use `SecureRandom` for cryptographic randomness
- Generate 32-character random strings (Base62 encoding)
- Add type-specific prefix for identification

### Key Storage
- Hash keys using BCrypt with cost factor 12
- Store only hash, never plaintext
- Use unique constraint on key_hash to prevent duplicates

### Key Transmission
- Keys transmitted only over HTTPS
- Keys shown to user only once during creation/rotation
- Use Authorization header with Bearer scheme

### Audit Trail
- Log all key lifecycle events to admin_audit_logs
- Log authentication attempts (success and failure)
- Include source IP, timestamp, and key prefix in logs

### Rate Limiting
- Track failed authentication attempts per IP
- Implement exponential backoff for repeated failures
- Alert on suspicious patterns

### Key Rotation
- 24-hour grace period allows seamless transition
- Old key automatically revoked after grace period
- Both keys work during grace period

### Expiration
- Default 90-day expiration for all keys
- Warning when key expires within 7 days
- Automatic invalidation on expiration date
- Background job to clean up expired keys

## Frontend Integration

### UI Components

1. **API Keys Management Page** (`/admin/api-keys`)
   - List user's API keys
   - Create new API key button
   - Revoke key button
   - Rotate key button
   - Edit key name
   - Display key metadata (creation date, expiration, last used)
   - Warning indicator for expiring keys

2. **API Key Creation Modal**
   - Key name input
   - Expiration period dropdown (30, 60, 90, 180, 365 days)
   - Key type selection (admin only)
   - Display generated key with copy button
   - Warning: "Save this key now, you won't see it again"

3. **API Key Display Component**
   - Show key prefix only (e.g., "idp_user_abc...")
   - Status badge (Active, Expiring Soon, Expired, Revoked)
   - Metadata display
   - Action buttons (Rotate, Revoke, Edit Name)

4. **Admin Audit Log Viewer** (admin only)
   - Filterable table of API key events
   - Filter by user email, date range, event type
   - Export to CSV

### API Client Updates

Update `services/api.ts` to support API key authentication:

```typescript
// Add API key to request headers if available
const apiKey = localStorage.getItem('idp_api_key');
if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
}
```

## Performance Considerations

### Database Queries
- Index on key_prefix for fast lookup
- Index on user_email for user key listing
- Index on is_active for filtering active keys
- Index on expires_at for expiration checks

### Caching Strategy
- Cache valid API keys in memory for 5 minutes
- Invalidate cache on key revocation
- Use key prefix as cache key

### Background Jobs
- Scheduled job to mark expired keys as inactive (runs daily)
- Scheduled job to revoke old keys after rotation grace period (runs hourly)
- Scheduled job to clean up old audit logs (runs weekly)

## Monitoring and Observability

### Metrics
- Total API keys created (counter)
- Active API keys by type (gauge)
- API key authentication attempts (counter)
- API key authentication failures (counter)
- API key rotation events (counter)
- API key revocation events (counter)

### Alerts
- High rate of failed authentication attempts
- Unusual number of key creations
- System keys approaching expiration
- Keys not used for extended period

### Dashboards
- API key usage over time
- Authentication method breakdown (OAuth2 vs API key)
- Key lifecycle metrics
- Security events timeline
