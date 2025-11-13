package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.StackResponseDto;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.Stack;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

@ApplicationScoped
public class StackMapper {

    public StackResponseDto toResponseDto(Stack stack) {
        if (stack == null) {
            return null;
        }

        StackResponseDto dto = new StackResponseDto();
        dto.setId(stack.getId());
        dto.setName(stack.getName());
        dto.setDescription(stack.getDescription());
        dto.setRepositoryURL(stack.getRepositoryURL());
        dto.setStackType(stack.getStackType());
        // Environment removed
        dto.setProgrammingLanguage(stack.getProgrammingLanguage());
        dto.setIsPublic(stack.getIsPublic());
        dto.setCreatedBy(stack.getCreatedBy());
        dto.setTeamId(stack.getTeam() != null ? stack.getTeam().getId() : null);
        dto.setStackCollectionId(stack.getStackCollection() != null ? stack.getStackCollection().getId() : null);
        dto.setConfiguration(stack.getConfiguration());
        dto.setEphemeralPrefix(stack.getEphemeralPrefix());
        dto.setCreatedAt(stack.getCreatedAt());
        dto.setUpdatedAt(stack.getUpdatedAt());
        
        // Map blueprint ID
        dto.setBlueprintId(stack.getBlueprint() != null ? stack.getBlueprint().getId() : null);

        return dto;
    }
}
