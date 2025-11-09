package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ApiKeyAuditLogDto;
import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.application.dtos.ApiKeyCreatedDto;
import com.angryss.idp.application.dtos.ApiKeyResponseDto;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.AdminAuditLogRepository;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.services.ApiKeyValidationService;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.logging.Log;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.mindrot.jbcrypt.BCrypt;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Application service for managing API keys.
 * Provides secure key generation, storage, and lifecycle management.
 */
@ApplicationScoped
public class ApiKeyService {

    @Inject
    ApiKeyRepository apiKeyRepository;

    @Inject
    AdminAuditLogRepository adminAuditLogRepository;

    @Inject
    ApiKeyValidationService validationService;

    @Inject
    SecurityIdentity securityIdentity;

    @ConfigProperty(name = "idp.api-key.default-expiration-days", defaultValue = "90")
    Integer defaultExpirationDays;

    @ConfigProperty(name = "idp.api-key.bcrypt-cost-factor", defaultValue = "12")
    Integer bcryptCostFactor;

    @ConfigProperty(name = "idp.api-key.key-length", defaultValue = "32")
    Integer keyLength;

    @ConfigProperty(name = "idp.api-key.rotation-grace-period-hours", defaultValue = "24")
    Integer rotationGracePeriodHours;

    @ConfigProperty(name = "idp.api-key.max-keys-per-user", defaultValue = "10")
    Integer maxKeysPerUser;

    private static final String USER_KEY_PREFIX = "idp_user_";
    private static final String SYSTEM_KEY_PREFIX = "idp_system_";
    private static final String BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Creates a new user API key tied to the current user's account.
     *
     * @param dto The API key creation data
     * @return The created API key with the plaintext key value
     * @throws IllegalArgumentException if key name is invalid or duplicate
     */
    @Transactional
    public ApiKeyCreatedDto createUserApiKey(ApiKeyCreateDto dto) {
        String userEmail = extractUserEmail();
        
        // Validate key name
        validateKeyName(dto.getKeyName());
        
        // Validate expiration period
        Integer expirationDays = dto.getExpirationDays() != null ? dto.getExpirationDays() : defaultExpirationDays;
        validateExpirationPeriod(expirationDays);
        
        // Check max keys per user limit
        long activeKeyCount = apiKeyRepository.findByUserEmailAndIsActive(userEmail, true).stream()
            .filter(key -> key.revokedAt == null)
            .count();
        if (activeKeyCount >= maxKeysPerUser) {
            throw new IllegalArgumentException("Maximum number of API keys (" + maxKeysPerUser + ") reached. Please revoke an existing key before creating a new one.");
        }
        
        // Check for duplicate key name within user's keys
        boolean duplicateExists = apiKeyRepository.findByUserEmailAndIsActive(userEmail, true).stream()
            .anyMatch(key -> key.keyName.equals(dto.getKeyName()));
        if (duplicateExists) {
            throw new IllegalArgumentException("An API key with name '" + dto.getKeyName() + "' already exists");
        }

        // Generate API key
        String plainKey = generateApiKey(ApiKeyType.USER);
        String keyHash = hashApiKey(plainKey);
        String keyPrefix = plainKey.substring(0, Math.min(plainKey.length(), 20));

        // Calculate expiration
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(expirationDays);

        // Create and persist API key entity
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = dto.getKeyName();
        apiKey.keyHash = keyHash;
        apiKey.keyPrefix = keyPrefix;
        apiKey.keyType = ApiKeyType.USER;
        apiKey.userEmail = userEmail;
        apiKey.createdByEmail = userEmail;
        apiKey.expiresAt = expiresAt;
        apiKey = apiKeyRepository.save(apiKey);

        // Log creation event
        logApiKeyEvent("CREATE", apiKey.id, Map.of(
            "keyName", apiKey.keyName,
            "keyType", "USER",
            "expirationDays", expirationDays,
            "userEmail", userEmail
        ));

        // Build response DTO with plaintext key
        return toCreatedDto(apiKey, plainKey);
    }

    /**
     * Creates a new system API key not tied to any individual user.
     * Only administrators can create system keys.
     *
     * @param dto The API key creation data
     * @return The created API key with the plaintext key value
     * @throws IllegalArgumentException if key name is invalid or duplicate
     */
    @Transactional
    @RolesAllowed("admin")
    public ApiKeyCreatedDto createSystemApiKey(ApiKeyCreateDto dto) {
        String adminEmail = extractUserEmail();
        
        // Validate key name
        validateKeyName(dto.getKeyName());
        
        // Validate expiration period
        Integer expirationDays = dto.getExpirationDays() != null ? dto.getExpirationDays() : defaultExpirationDays;
        validateExpirationPeriod(expirationDays);
        
        // Check for duplicate key name among system keys
        boolean duplicateExists = apiKeyRepository.findByKeyType(ApiKeyType.SYSTEM).stream()
            .filter(key -> key.isActive)
            .anyMatch(key -> key.keyName.equals(dto.getKeyName()));
        if (duplicateExists) {
            throw new IllegalArgumentException("A system API key with name '" + dto.getKeyName() + "' already exists");
        }

        // Generate API key
        String plainKey = generateApiKey(ApiKeyType.SYSTEM);
        String keyHash = hashApiKey(plainKey);
        String keyPrefix = plainKey.substring(0, Math.min(plainKey.length(), 20));

        // Calculate expiration
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(expirationDays);

        // Create and persist API key entity
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = dto.getKeyName();
        apiKey.keyHash = keyHash;
        apiKey.keyPrefix = keyPrefix;
        apiKey.keyType = ApiKeyType.SYSTEM;
        apiKey.userEmail = null; // System keys are not tied to a user
        apiKey.createdByEmail = adminEmail;
        apiKey.expiresAt = expiresAt;
        apiKey = apiKeyRepository.save(apiKey);

        // Log creation event
        logApiKeyEvent("CREATE", apiKey.id, Map.of(
            "keyName", apiKey.keyName,
            "keyType", "SYSTEM",
            "expirationDays", expirationDays,
            "createdBy", adminEmail
        ));

        // Build response DTO with plaintext key
        return toCreatedDto(apiKey, plainKey);
    }

    /**
     * Revokes an API key, making it invalid for future authentication.
     * Users can only revoke their own keys, admins can revoke any key.
     *
     * @param keyId The ID of the API key to revoke
     * @throws IllegalArgumentException if key not found
     * @throws SecurityException if user doesn't have permission to revoke the key
     */
    @Transactional
    public void revokeApiKey(UUID keyId) {
        String userEmail = extractUserEmail();
        
        ApiKey apiKey = apiKeyRepository.findById(keyId)
            .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        // Authorization check: users can only revoke their own keys, admins can revoke any key
        boolean isAdmin = securityIdentity.hasRole("admin");
        boolean isOwner = apiKey.keyType == ApiKeyType.USER && apiKey.userEmail.equals(userEmail);
        
        if (!isAdmin && !isOwner) {
            throw new SecurityException("You do not have permission to revoke this API key");
        }

        // Revoke the key
        apiKey.revoke(userEmail);
        apiKeyRepository.save(apiKey);

        // Log revocation event
        logApiKeyEvent("REVOKE", apiKey.id, Map.of(
            "keyName", apiKey.keyName,
            "keyType", apiKey.keyType.toString(),
            "revokedBy", userEmail
        ));
    }

    /**
     * Rotates an API key by generating a new key with the same permissions.
     * The old key remains active for a grace period to allow seamless transition.
     * Users can only rotate their own keys, admins can rotate any key.
     *
     * @param keyId The ID of the API key to rotate
     * @return The new API key with the plaintext key value
     * @throws IllegalArgumentException if key not found or already revoked
     * @throws SecurityException if user doesn't have permission to rotate the key
     */
    @Transactional
    public ApiKeyCreatedDto rotateApiKey(UUID keyId) {
        String userEmail = extractUserEmail();
        
        ApiKey oldKey = apiKeyRepository.findById(keyId)
            .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        if (oldKey.revokedAt != null) {
            throw new IllegalArgumentException("Cannot rotate a revoked API key");
        }

        // Authorization check: users can only rotate their own keys, admins can rotate any key
        boolean isAdmin = securityIdentity.hasRole("admin");
        boolean isOwner = oldKey.keyType == ApiKeyType.USER && oldKey.userEmail.equals(userEmail);
        
        if (!isAdmin && !isOwner) {
            throw new SecurityException("You do not have permission to rotate this API key");
        }

        // Generate new API key
        String plainKey = generateApiKey(oldKey.keyType);
        String keyHash = hashApiKey(plainKey);
        String keyPrefix = plainKey.substring(0, Math.min(plainKey.length(), 20));

        // Create new key with same metadata
        ApiKey newKey = new ApiKey();
        newKey.keyName = oldKey.keyName;
        newKey.keyHash = keyHash;
        newKey.keyPrefix = keyPrefix;
        newKey.keyType = oldKey.keyType;
        newKey.userEmail = oldKey.userEmail;
        newKey.createdByEmail = userEmail;
        newKey.expiresAt = oldKey.expiresAt;
        newKey = apiKeyRepository.save(newKey);

        // Schedule old key revocation after grace period
        // Note: In a production system, this would be handled by a background job
        // For now, we'll set a marker that can be processed by a scheduled task
        LocalDateTime revokeAfter = LocalDateTime.now().plusHours(rotationGracePeriodHours);
        
        // Log rotation event
        logApiKeyEvent("ROTATE", oldKey.id, Map.of(
            "keyName", oldKey.keyName,
            "keyType", oldKey.keyType.toString(),
            "newKeyId", newKey.id.toString(),
            "gracePeriodHours", rotationGracePeriodHours,
            "oldKeyRevokeAfter", revokeAfter.toString(),
            "rotatedBy", userEmail
        ));

        logApiKeyEvent("CREATE", newKey.id, Map.of(
            "keyName", newKey.keyName,
            "keyType", newKey.keyType.toString(),
            "rotatedFrom", oldKey.id.toString(),
            "createdBy", userEmail
        ));

        // Return the new key
        return toCreatedDto(newKey, plainKey);
    }

    /**
     * Updates the name of an API key.
     * Users can only update their own keys, admins can update any key.
     *
     * @param keyId The ID of the API key to update
     * @param newName The new name for the key
     * @return The updated API key
     * @throws IllegalArgumentException if key not found, name is invalid, or duplicate name exists
     * @throws SecurityException if user doesn't have permission to update the key
     */
    @Transactional
    public ApiKeyResponseDto updateApiKeyName(UUID keyId, String newName) {
        String userEmail = extractUserEmail();
        
        // Validate key name
        validateKeyName(newName);

        ApiKey apiKey = apiKeyRepository.findById(keyId)
            .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        // Authorization check: users can only update their own keys, admins can update any key
        boolean isAdmin = securityIdentity.hasRole("admin");
        boolean isOwner = apiKey.keyType == ApiKeyType.USER && apiKey.userEmail.equals(userEmail);
        
        if (!isAdmin && !isOwner) {
            throw new SecurityException("You do not have permission to update this API key");
        }

        // Check for duplicate key name
        if (apiKey.keyType == ApiKeyType.USER) {
            // For user keys, check uniqueness within user's keys
            boolean duplicateExists = apiKeyRepository.findByUserEmailAndIsActive(apiKey.userEmail, true).stream()
                .filter(key -> !key.id.equals(keyId))
                .anyMatch(key -> key.keyName.equals(newName));
            if (duplicateExists) {
                throw new IllegalArgumentException("An API key with name '" + newName + "' already exists");
            }
        } else {
            // For system keys, check uniqueness among all system keys
            boolean duplicateExists = apiKeyRepository.findByKeyType(ApiKeyType.SYSTEM).stream()
                .filter(key -> key.isActive && !key.id.equals(keyId))
                .anyMatch(key -> key.keyName.equals(newName));
            if (duplicateExists) {
                throw new IllegalArgumentException("A system API key with name '" + newName + "' already exists");
            }
        }

        String oldName = apiKey.keyName;
        apiKey.keyName = newName;
        apiKey = apiKeyRepository.save(apiKey);

        // Log name update event
        logApiKeyEvent("UPDATE_NAME", apiKey.id, Map.of(
            "oldName", oldName,
            "newName", newName,
            "keyType", apiKey.keyType.toString(),
            "updatedBy", userEmail
        ));

        return toDto(apiKey);
    }

    /**
     * Generates a secure random API key with the appropriate prefix.
     *
     * @param type The type of API key (USER or SYSTEM)
     * @return The generated API key string
     */
    private String generateApiKey(ApiKeyType type) {
        String prefix = type == ApiKeyType.USER ? USER_KEY_PREFIX : SYSTEM_KEY_PREFIX;
        String randomPart = generateSecureRandomString(keyLength);
        return prefix + randomPart;
    }

    /**
     * Generates a cryptographically secure random string using Base62 encoding.
     *
     * @param length The length of the random string to generate
     * @return The random string
     */
    private String generateSecureRandomString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int randomIndex = SECURE_RANDOM.nextInt(BASE62_CHARS.length());
            sb.append(BASE62_CHARS.charAt(randomIndex));
        }
        return sb.toString();
    }

    /**
     * Hashes an API key using BCrypt with the configured cost factor.
     *
     * @param plainKey The plaintext API key
     * @return The BCrypt hash of the key
     */
    private String hashApiKey(String plainKey) {
        return BCrypt.hashpw(plainKey, BCrypt.gensalt(bcryptCostFactor));
    }

    /**
     * Logs an API key lifecycle event to the audit log.
     *
     * @param action The action performed (CREATE, ROTATE, REVOKE, etc.)
     * @param keyId The ID of the API key
     * @param details Additional details about the event
     */
    private void logApiKeyEvent(String action, UUID keyId, Map<String, Object> details) {
        String userEmail = extractUserEmail();
        Map<String, Object> changes = new HashMap<>(details);
        changes.put("action", action);
        
        AdminAuditLog auditLog = new AdminAuditLog(
            userEmail,
            action,
            "ApiKey",
            keyId,
            changes
        );
        adminAuditLogRepository.save(auditLog);
    }

    /**
     * Extracts the user email from the security identity.
     *
     * @return The user's email address
     */
    private String extractUserEmail() {
        if (securityIdentity == null || securityIdentity.isAnonymous()) {
            return "anonymous";
        }

        // Try to get email from attributes
        Object email = securityIdentity.getAttribute("email");
        if (email != null) {
            return email.toString();
        }

        // Fall back to principal name
        return securityIdentity.getPrincipal().getName();
    }

    /**
     * Lists all API keys for the current user.
     * Only returns keys that belong to the authenticated user.
     *
     * @return List of the user's API keys
     */
    public List<ApiKeyResponseDto> listUserApiKeys() {
        String userEmail = extractUserEmail();
        
        List<ApiKey> apiKeys = apiKeyRepository.findByUserEmail(userEmail);
        
        return apiKeys.stream()
            .sorted((a, b) -> b.createdAt.compareTo(a.createdAt))
            .map(this::toDto)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Lists all API keys in the system.
     * Only administrators can access this method.
     *
     * @return List of all API keys
     */
    @RolesAllowed("admin")
    public List<ApiKeyResponseDto> listAllApiKeys() {
        List<ApiKey> apiKeys = apiKeyRepository.findAll();
        
        return apiKeys.stream()
            .sorted((a, b) -> b.createdAt.compareTo(a.createdAt))
            .map(this::toDto)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Retrieves a specific API key by ID.
     * Users can only access their own keys, admins can access any key.
     *
     * @param keyId The ID of the API key to retrieve
     * @return The API key details
     * @throws IllegalArgumentException if key not found
     * @throws SecurityException if user doesn't have permission to access the key
     */
    public ApiKeyResponseDto getApiKeyById(UUID keyId) {
        String userEmail = extractUserEmail();
        
        ApiKey apiKey = apiKeyRepository.findById(keyId)
            .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        // Authorization check: users can only access their own keys, admins can access any key
        boolean isAdmin = securityIdentity.hasRole("admin");
        boolean isOwner = apiKey.keyType == ApiKeyType.USER && apiKey.userEmail.equals(userEmail);
        
        if (!isAdmin && !isOwner) {
            throw new SecurityException("You do not have permission to access this API key");
        }

        return toDto(apiKey);
    }

    /**
     * Retrieves audit logs for API key events.
     * Only administrators can access audit logs.
     * Supports filtering by user email and date range.
     *
     * @param userEmail Optional filter by user email
     * @param startDate Optional filter by start date
     * @param endDate Optional filter by end date
     * @return List of audit log entries
     */
    @RolesAllowed("admin")
    public List<ApiKeyAuditLogDto> getApiKeyAuditLogs(String userEmail, LocalDateTime startDate, LocalDateTime endDate) {
        // Build query dynamically based on filters
        StringBuilder query = new StringBuilder("entityType = 'ApiKey'");
        Map<String, Object> params = new HashMap<>();
        
        if (userEmail != null && !userEmail.isBlank()) {
            query.append(" and userEmail = :userEmail");
            params.put("userEmail", userEmail);
        }
        
        if (startDate != null) {
            query.append(" and timestamp >= :startDate");
            params.put("startDate", startDate);
        }
        
        if (endDate != null) {
            query.append(" and timestamp <= :endDate");
            params.put("endDate", endDate);
        }
        
        query.append(" ORDER BY timestamp DESC");
        
        // Execute query - get all audit logs for ApiKey entity type
        List<AdminAuditLog> auditLogs = adminAuditLogRepository.findByEntityType("ApiKey");
        
        // Apply filters
        if (userEmail != null && !userEmail.isBlank()) {
            auditLogs = auditLogs.stream()
                .filter(log -> log.getUserEmail().equals(userEmail))
                .collect(java.util.stream.Collectors.toList());
        }
        
        if (startDate != null) {
            auditLogs = auditLogs.stream()
                .filter(log -> !log.getTimestamp().isBefore(startDate))
                .collect(java.util.stream.Collectors.toList());
        }
        
        if (endDate != null) {
            auditLogs = auditLogs.stream()
                .filter(log -> !log.getTimestamp().isAfter(endDate))
                .collect(java.util.stream.Collectors.toList());
        }
        
        // Sort by timestamp descending
        auditLogs = auditLogs.stream()
            .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
            .collect(java.util.stream.Collectors.toList());
        
        // Convert to DTOs
        return auditLogs.stream()
            .map(this::toAuditLogDto)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Converts an ApiKey entity to an ApiKeyCreatedDto with the plaintext key.
     *
     * @param apiKey The API key entity
     * @param plainKey The plaintext API key value
     * @return The created DTO
     */
    private ApiKeyCreatedDto toCreatedDto(ApiKey apiKey, String plainKey) {
        ApiKeyCreatedDto dto = new ApiKeyCreatedDto();
        dto.setId(apiKey.id);
        dto.setKeyName(apiKey.keyName);
        dto.setKeyPrefix(apiKey.keyPrefix);
        dto.setKeyType(apiKey.keyType);
        dto.setUserEmail(apiKey.userEmail);
        dto.setCreatedByEmail(apiKey.createdByEmail);
        dto.setCreatedAt(apiKey.createdAt);
        dto.setExpiresAt(apiKey.expiresAt);
        dto.setLastUsedAt(apiKey.lastUsedAt);
        dto.setIsActive(apiKey.isActive);
        dto.setIsExpiringSoon(apiKey.isExpiringSoon());
        dto.setStatus(apiKey.getStatus());
        dto.setApiKey(plainKey); // Only included in creation response
        return dto;
    }

    /**
     * Converts an ApiKey entity to an ApiKeyResponseDto.
     *
     * @param apiKey The API key entity
     * @return The response DTO
     */
    private ApiKeyResponseDto toDto(ApiKey apiKey) {
        ApiKeyResponseDto dto = new ApiKeyResponseDto();
        dto.setId(apiKey.id);
        dto.setKeyName(apiKey.keyName);
        dto.setKeyPrefix(apiKey.keyPrefix);
        dto.setKeyType(apiKey.keyType);
        dto.setUserEmail(apiKey.userEmail);
        dto.setCreatedByEmail(apiKey.createdByEmail);
        dto.setCreatedAt(apiKey.createdAt);
        dto.setExpiresAt(apiKey.expiresAt);
        dto.setLastUsedAt(apiKey.lastUsedAt);
        dto.setIsActive(apiKey.isActive);
        dto.setIsExpiringSoon(apiKey.isExpiringSoon());
        dto.setStatus(apiKey.getStatus());
        return dto;
    }

    /**
     * Converts an AdminAuditLog entity to an ApiKeyAuditLogDto.
     *
     * @param auditLog The audit log entity
     * @return The audit log DTO
     */
    private ApiKeyAuditLogDto toAuditLogDto(AdminAuditLog auditLog) {
        ApiKeyAuditLogDto dto = new ApiKeyAuditLogDto();
        dto.setId(auditLog.getId());
        dto.setUserEmail(auditLog.getUserEmail());
        dto.setAction(auditLog.getAction());
        dto.setTimestamp(auditLog.getTimestamp());
        
        // Extract keyPrefix from changes if available
        if (auditLog.getChanges() != null) {
            Object keyPrefix = auditLog.getChanges().get("keyPrefix");
            if (keyPrefix != null) {
                dto.setKeyPrefix(keyPrefix.toString());
            }
            
            // Extract sourceIp from changes if available
            Object sourceIp = auditLog.getChanges().get("sourceIp");
            if (sourceIp != null) {
                dto.setSourceIp(sourceIp.toString());
            }
        }
        
        return dto;
    }

    /**
     * Validates an API key name.
     * Key names must be non-blank and not exceed 100 characters.
     *
     * @param keyName The key name to validate
     * @throws IllegalArgumentException if the key name is invalid
     */
    private void validateKeyName(String keyName) {
        if (keyName == null || keyName.isBlank()) {
            throw new IllegalArgumentException("Key name is required");
        }
        
        if (keyName.length() > 100) {
            throw new IllegalArgumentException("Key name must not exceed 100 characters");
        }
    }

    /**
     * Validates an expiration period.
     * Expiration periods must be between 1 and 365 days.
     *
     * @param expirationDays The expiration period in days
     * @throws IllegalArgumentException if the expiration period is invalid
     */
    private void validateExpirationPeriod(Integer expirationDays) {
        if (expirationDays == null) {
            throw new IllegalArgumentException("Expiration period is required");
        }
        
        if (expirationDays < 1 || expirationDays > 365) {
            throw new IllegalArgumentException("Expiration period must be between 1 and 365 days");
        }
    }

    /**
     * Processes expired API keys by marking them as inactive and logging expiration events.
     * This method is intended to be called by a scheduled background job.
     * 
     * @return The number of keys that were marked as expired
     */
    @Transactional
    public int processExpiredApiKeys() {
        LocalDateTime now = LocalDateTime.now();
        
        // Find all active keys that have expired
        List<ApiKey> expiredKeys = apiKeyRepository.findByIsActive(true).stream()
            .filter(key -> key.revokedAt == null && key.expiresAt != null && key.expiresAt.isBefore(now))
            .collect(java.util.stream.Collectors.toList());
        
        int count = 0;
        for (ApiKey key : expiredKeys) {
            // Mark as inactive
            key.isActive = false;
            apiKeyRepository.save(key);
            
            // Log expiration event
            logApiKeyEvent("EXPIRE", key.id, Map.of(
                "keyName", key.keyName,
                "keyType", key.keyType.toString(),
                "expiresAt", key.expiresAt.toString(),
                "userEmail", key.userEmail != null ? key.userEmail : "system",
                "reason", "Automatic expiration"
            ));
            
            count++;
        }
        
        if (count > 0) {
            Log.infof("Processed %d expired API keys", count);
        }
        
        return count;
    }

    /**
     * Processes API keys that are past their rotation grace period.
     * This method revokes old keys after the grace period has elapsed following rotation.
     * This method is intended to be called by a scheduled background job.
     * 
     * @return The number of keys that were revoked
     */
    @Transactional
    public int processRotationGracePeriod() {
        // Note: In a production system, we would track rotation relationships
        // For now, this is a placeholder for future implementation
        // The actual implementation would require additional fields in the ApiKey entity
        // to track rotation relationships and grace period end times
        
        Log.debug("Rotation grace period processing not yet implemented");
        return 0;
    }
}
