package com.angryss.idp.application.dtos;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * DTO for API key creation responses.
 * Extends ApiKeyResponseDto to include the actual API key value.
 * The apiKey field is only populated during creation or rotation and should be shown to the user exactly once.
 */
@Schema(description = "API key creation response including the plaintext key value (shown only once)")
public class ApiKeyCreatedDto extends ApiKeyResponseDto {

    @Schema(
        description = "The actual API key value. This is shown only once during creation or rotation. Store it securely as it cannot be retrieved again.",
        example = "idp_user_abc123def456ghi789jkl012mno345pqr678"
    )
    private String apiKey;

    public ApiKeyCreatedDto() {
        super();
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }
}
