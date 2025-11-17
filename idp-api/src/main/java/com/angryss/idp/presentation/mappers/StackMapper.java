package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.BlueprintResourceDto;
import com.angryss.idp.application.dtos.StackResponseDto;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.Stack;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class StackMapper {

    @Inject
    ResourceTypeMapper resourceTypeMapper;

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
        
        // Map blueprint resource
        dto.setBlueprintResource(toBlueprintResourceDto(stack.getBlueprintResource()));

        return dto;
    }

    /**
     * Converts a BlueprintResource entity to a BlueprintResourceDto.
     * 
     * @param blueprintResource the BlueprintResource entity
     * @return the BlueprintResourceDto, or null if blueprintResource is null
     */
    private BlueprintResourceDto toBlueprintResourceDto(BlueprintResource blueprintResource) {
        if (blueprintResource == null) {
            return null;
        }

        BlueprintResourceDto dto = new BlueprintResourceDto();
        dto.setId(blueprintResource.id);
        dto.setName(blueprintResource.getName());
        dto.setResourceType(resourceTypeMapper.toDto(blueprintResource.getResourceType()));

        return dto;
    }
}
