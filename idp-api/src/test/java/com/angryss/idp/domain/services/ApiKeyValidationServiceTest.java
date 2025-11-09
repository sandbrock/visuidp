package com.angryss.idp.domain.services;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class ApiKeyValidationServiceTest {

    @Inject
    ApiKeyValidationService validationService;

    @Test
    public void testValidateKeyFormat_ValidUserKey() {
        String validUserKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        assertTrue(validationService.validateKeyFormat(validUserKey));
    }

    @Test
    public void testValidateKeyFormat_ValidSystemKey() {
        String validSystemKey = "idp_system_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
        assertTrue(validationService.validateKeyFormat(validSystemKey));
    }

    @Test
    public void testValidateKeyFormat_InvalidPrefix() {
        String invalidKey = "invalid_prefix_abcdefghijklmnopqrstuvwxyz123456";
        assertFalse(validationService.validateKeyFormat(invalidKey));
    }

    @Test
    public void testValidateKeyFormat_TooShort() {
        String shortKey = "idp_user_short";
        assertFalse(validationService.validateKeyFormat(shortKey));
    }

    @Test
    public void testValidateKeyFormat_TooLong() {
        String longKey = "idp_user_abcdefghijklmnopqrstuvwxyz1234567890";
        assertFalse(validationService.validateKeyFormat(longKey));
    }

    @Test
    public void testValidateKeyFormat_InvalidCharacters() {
        String invalidKey = "idp_user_abcdefghijklmnopqrstuvwxyz!@#$";
        assertFalse(validationService.validateKeyFormat(invalidKey));
    }

    @Test
    public void testValidateKeyFormat_NullKey() {
        assertFalse(validationService.validateKeyFormat(null));
    }

    @Test
    public void testValidateKeyFormat_EmptyKey() {
        assertFalse(validationService.validateKeyFormat(""));
    }

    @Test
    public void testValidateKeyFormat_BlankKey() {
        assertFalse(validationService.validateKeyFormat("   "));
    }

    @Test
    public void testVerifyKeyHash_ValidMatch() {
        String plainKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        String hash = BCrypt.hashpw(plainKey, BCrypt.gensalt(12));
        
        assertTrue(validationService.verifyKeyHash(plainKey, hash));
    }

    @Test
    public void testVerifyKeyHash_InvalidMatch() {
        String plainKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        String wrongKey = "idp_user_wrongkeywrongkeywrongkeywrong12";
        String hash = BCrypt.hashpw(plainKey, BCrypt.gensalt(12));
        
        assertFalse(validationService.verifyKeyHash(wrongKey, hash));
    }

    @Test
    public void testVerifyKeyHash_NullPlainKey() {
        String hash = BCrypt.hashpw("test", BCrypt.gensalt(12));
        assertFalse(validationService.verifyKeyHash(null, hash));
    }

    @Test
    public void testVerifyKeyHash_NullHash() {
        String plainKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        assertFalse(validationService.verifyKeyHash(plainKey, null));
    }

    @Test
    public void testVerifyKeyHash_EmptyPlainKey() {
        String hash = BCrypt.hashpw("test", BCrypt.gensalt(12));
        assertFalse(validationService.verifyKeyHash("", hash));
    }

    @Test
    public void testVerifyKeyHash_InvalidHashFormat() {
        String plainKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        String invalidHash = "not-a-valid-bcrypt-hash";
        
        assertFalse(validationService.verifyKeyHash(plainKey, invalidHash));
    }

    @Test
    public void testIsKeyExpiringSoon_WithinSevenDays() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(5);
        assertTrue(validationService.isKeyExpiringSoon(expiresAt));
    }

    @Test
    public void testIsKeyExpiringSoon_ExactlySevenDays() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7).minusMinutes(1);
        assertTrue(validationService.isKeyExpiringSoon(expiresAt));
    }

    @Test
    public void testIsKeyExpiringSoon_MoreThanSevenDays() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(10);
        assertFalse(validationService.isKeyExpiringSoon(expiresAt));
    }

    @Test
    public void testIsKeyExpiringSoon_AlreadyExpired() {
        LocalDateTime expiresAt = LocalDateTime.now().minusDays(1);
        assertFalse(validationService.isKeyExpiringSoon(expiresAt));
    }

    @Test
    public void testIsKeyExpiringSoon_NoExpiration() {
        assertFalse(validationService.isKeyExpiringSoon(null));
    }

    @Test
    public void testIsKeyExpired_ExpiredKey() {
        LocalDateTime expiresAt = LocalDateTime.now().minusDays(1);
        assertTrue(validationService.isKeyExpired(expiresAt));
    }

    @Test
    public void testIsKeyExpired_NotExpiredKey() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(30);
        assertFalse(validationService.isKeyExpired(expiresAt));
    }

    @Test
    public void testIsKeyExpired_NoExpiration() {
        assertFalse(validationService.isKeyExpired(null));
    }

    @Test
    public void testExtractKeyPrefix_ValidKey() {
        String apiKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        String prefix = validationService.extractKeyPrefix(apiKey);
        
        assertEquals("idp_user_abc", prefix);
        assertEquals(12, prefix.length());
    }

    @Test
    public void testExtractKeyPrefix_ShortKey() {
        String shortKey = "short";
        String prefix = validationService.extractKeyPrefix(shortKey);
        
        assertEquals("", prefix);
    }

    @Test
    public void testExtractKeyPrefix_NullKey() {
        String prefix = validationService.extractKeyPrefix(null);
        assertEquals("", prefix);
    }

    @Test
    public void testGetDaysUntilExpiration_FutureDays() {
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(30);
        long days = validationService.getDaysUntilExpiration(expiresAt);
        
        assertTrue(days >= 29 && days <= 30); // Account for timing precision
    }

    @Test
    public void testGetDaysUntilExpiration_AlreadyExpired() {
        LocalDateTime expiresAt = LocalDateTime.now().minusDays(5);
        long days = validationService.getDaysUntilExpiration(expiresAt);
        
        assertEquals(-1, days);
    }

    @Test
    public void testGetDaysUntilExpiration_NoExpiration() {
        long days = validationService.getDaysUntilExpiration(null);
        assertEquals(-1, days);
    }

    @Test
    public void testGetDaysUntilExpiration_ExpiringToday() {
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(12);
        long days = validationService.getDaysUntilExpiration(expiresAt);
        
        assertEquals(0, days);
    }
}
