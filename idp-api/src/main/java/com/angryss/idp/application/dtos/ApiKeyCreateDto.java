package com.angryss.idp.application.dtos;

import com.angryss.idp.domain.valueobjects.ApiKeyType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * DTO for creating a new API key.
 * Used for both user and system API key creation requests.
 */
@Schema(description = "Request body for creating a new API key")
public class ApiKeyCreateDto {

    @NotBlank(message = "Key name is required")
    @Size(min = 1, max = 100, message = "Key name must be between 1 and 100 characters")
    @Schema(
        description = "Descriptive name for the API key to help identify its purpose",
        example = "CI/CD Pipeline Key",
        required = true,
        minLength = 1,
        maxLength = 100
    )
    private String keyName;

    @Min(value = 1, message = "Expiration period must be at least 1 day")
    @Max(value = 365, message = "Expiration period cannot exceed 365 days")
    @Schema(
        description = "Number of days until the API key expires. If not specified, defaults to 90 days. Valid range: 1-365 days.",
        example = "90",
        minimum = "1",
        maximum = "365"
    )
    private Integer expirationDays;

    @Schema(
        description = "Type of API key. USER keys are tied to a specific user account. SYSTEM keys are organization-level and not tied to individual users. Only administrators can create SYSTEM keys.",
        example = "USER",
        enumeration = {"USER", "SYSTEM"}
    )
    private ApiKeyType keyType;

    public ApiKeyCreateDto() {
    }

    public ApiKeyCreateDto(String keyName, Integer expirationDays, ApiKeyType keyType) {
        this.keyName = keyName;
        this.expirationDays = expirationDays;
        this.keyType = keyType;
    }

    public String getKeyName() {
        return keyName;
    }

    public void setKeyName(String keyName) {
        this.keyName = keyName;
    }

    public Integer getExpirationDays() {
        return expirationDays;
    }

    public void setExpirationDays(Integer expirationDays) {
        this.expirationDays = expirationDays;
    }

    public ApiKeyType getKeyType() {
        return keyType;
    }

    public void setKeyType(ApiKeyType keyType) {
        this.keyType = keyType;
    }
}
