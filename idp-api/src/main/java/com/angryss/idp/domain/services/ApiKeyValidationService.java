package com.angryss.idp.domain.services;

import jakarta.enterprise.context.ApplicationScoped;
import org.mindrot.jbcrypt.BCrypt;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.regex.Pattern;

/**
 * Domain service for validating API keys.
 * Handles key format validation, hash verification, and expiration detection.
 */
@ApplicationScoped
public class ApiKeyValidationService {

    private static final Pattern USER_KEY_PATTERN = Pattern.compile("^idp_user_[A-Za-z0-9]{32}$");
    private static final Pattern SYSTEM_KEY_PATTERN = Pattern.compile("^idp_system_[A-Za-z0-9]{32}$");
    private static final int EXPIRATION_WARNING_DAYS = 7;

    /**
     * Validates the format of an API key.
     * Valid formats:
     * - User keys: idp_user_<32 alphanumeric characters>
     * - System keys: idp_system_<32 alphanumeric characters>
     *
     * @param apiKey The API key to validate
     * @return true if the key format is valid, false otherwise
     */
    public boolean validateKeyFormat(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return false;
        }

        return USER_KEY_PATTERN.matcher(apiKey).matches() 
            || SYSTEM_KEY_PATTERN.matcher(apiKey).matches();
    }

    /**
     * Verifies that a plain text API key matches a stored BCrypt hash.
     *
     * @param plainKey The plain text API key to verify
     * @param storedHash The BCrypt hash stored in the database
     * @return true if the key matches the hash, false otherwise
     */
    public boolean verifyKeyHash(String plainKey, String storedHash) {
        if (plainKey == null || plainKey.isBlank() || storedHash == null || storedHash.isBlank()) {
            return false;
        }

        try {
            return BCrypt.checkpw(plainKey, storedHash);
        } catch (IllegalArgumentException e) {
            // Invalid hash format
            return false;
        }
    }

    /**
     * Determines if an API key is expiring soon (within 7 days).
     *
     * @param expiresAt The expiration timestamp of the API key
     * @return true if the key expires within 7 days, false otherwise
     */
    public boolean isKeyExpiringSoon(LocalDateTime expiresAt) {
        if (expiresAt == null) {
            return false; // No expiration set
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime warningThreshold = now.plusDays(EXPIRATION_WARNING_DAYS);

        return expiresAt.isAfter(now) && expiresAt.isBefore(warningThreshold);
    }

    /**
     * Checks if an API key has expired.
     *
     * @param expiresAt The expiration timestamp of the API key
     * @return true if the key has expired, false otherwise
     */
    public boolean isKeyExpired(LocalDateTime expiresAt) {
        if (expiresAt == null) {
            return false; // No expiration set
        }

        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Extracts the key prefix from an API key for logging purposes.
     * Returns the first 12 characters of the key.
     *
     * @param apiKey The API key
     * @return The key prefix, or empty string if key is invalid
     */
    public String extractKeyPrefix(String apiKey) {
        if (apiKey == null || apiKey.length() < 12) {
            return "";
        }

        return apiKey.substring(0, 12);
    }

    /**
     * Gets the number of days until expiration.
     *
     * @param expiresAt The expiration timestamp
     * @return The number of days until expiration, or -1 if already expired or no expiration
     */
    public long getDaysUntilExpiration(LocalDateTime expiresAt) {
        if (expiresAt == null) {
            return -1;
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(expiresAt)) {
            return -1; // Already expired
        }

        return ChronoUnit.DAYS.between(now, expiresAt);
    }
}
