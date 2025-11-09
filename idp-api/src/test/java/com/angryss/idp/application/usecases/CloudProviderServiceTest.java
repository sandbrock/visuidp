package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.CloudProviderCreateDto;
import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.CloudProviderUpdateDto;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.StackResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class CloudProviderServiceTest {

    @Inject
    CloudProviderService cloudProviderService;

    @BeforeEach
    @Transactional
    public void cleanupTestData() {
        // Clean up any existing test data - delete children first due to foreign key constraints
        EnvironmentConfig.deleteAll();
        EnvironmentEntity.deleteAll();
        CloudProvider.deleteAll();
    }

    @Test
    @Transactional
    public void testCreateCloudProvider() {
        // Given
        CloudProviderCreateDto createDto = new CloudProviderCreateDto();
        createDto.setName("AWS");
        createDto.setDisplayName("Amazon Web Services");
        createDto.setDescription("AWS cloud platform");
        createDto.setEnabled(true);

        // When
        CloudProviderDto result = cloudProviderService.create(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("AWS", result.getName());
        assertEquals("Amazon Web Services", result.getDisplayName());
        assertEquals("AWS cloud platform", result.getDescription());
        assertTrue(result.getEnabled());
        assertNotNull(result.getCreatedAt());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    @Transactional
    public void testCreateDuplicateCloudProviderThrowsException() {
        // Given
        CloudProviderCreateDto createDto = new CloudProviderCreateDto();
        createDto.setName("AWS");
        createDto.setDisplayName("Amazon Web Services");
        createDto.setDescription("AWS cloud platform");
        createDto.setEnabled(true);

        cloudProviderService.create(createDto);

        // When/Then
        CloudProviderCreateDto duplicateDto = new CloudProviderCreateDto();
        duplicateDto.setName("AWS");
        duplicateDto.setDisplayName("AWS Duplicate");
        duplicateDto.setDescription("Duplicate");
        duplicateDto.setEnabled(false);

        assertThrows(IllegalArgumentException.class, () -> {
            cloudProviderService.create(duplicateDto);
        });
    }

    @Test
    @Transactional
    public void testListAll() {
        // Given
        createTestCloudProvider("AWS", "Amazon Web Services", true);
        createTestCloudProvider("AZURE", "Microsoft Azure", false);
        createTestCloudProvider("GCP", "Google Cloud Platform", true);

        // When
        List<CloudProviderDto> result = cloudProviderService.listAll();

        // Then
        assertEquals(3, result.size());
    }

    @Test
    @Transactional
    public void testGetById() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services", true);

        // When
        CloudProviderDto result = cloudProviderService.getById(cloudProvider.id);

        // Then
        assertNotNull(result);
        assertEquals(cloudProvider.id, result.getId());
        assertEquals("AWS", result.getName());
        assertEquals("Amazon Web Services", result.getDisplayName());
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testGetByIdNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            cloudProviderService.getById(nonExistentId);
        });
    }

    @Test
    @Transactional
    public void testUpdate() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services", true);

        CloudProviderUpdateDto updateDto = new CloudProviderUpdateDto();
        updateDto.setDisplayName("AWS Updated");
        updateDto.setDescription("Updated description");
        updateDto.setEnabled(false);

        // When
        CloudProviderDto result = cloudProviderService.update(cloudProvider.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals(cloudProvider.id, result.getId());
        assertEquals("AWS", result.getName()); // Name should not change
        assertEquals("AWS Updated", result.getDisplayName());
        assertEquals("Updated description", result.getDescription());
        assertFalse(result.getEnabled());
    }

    @Test
    @Transactional
    public void testUpdatePartialFields() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services", true);

        CloudProviderUpdateDto updateDto = new CloudProviderUpdateDto();
        updateDto.setDisplayName("AWS Updated");
        // Description and enabled are not set

        // When
        CloudProviderDto result = cloudProviderService.update(cloudProvider.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals("AWS Updated", result.getDisplayName());
        assertNull(result.getDescription()); // Should remain unchanged
        assertTrue(result.getEnabled()); // Should remain unchanged
    }

    @Test
    @Transactional
    public void testUpdateNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();
        CloudProviderUpdateDto updateDto = new CloudProviderUpdateDto();
        updateDto.setDisplayName("Updated");

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            cloudProviderService.update(nonExistentId, updateDto);
        });
    }

    @Test
    @Transactional
    public void testToggleEnabled() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services", true);

        // When - disable
        cloudProviderService.toggleEnabled(cloudProvider.id, false);

        // Then
        CloudProviderDto result = cloudProviderService.getById(cloudProvider.id);
        assertFalse(result.getEnabled());

        // When - enable
        cloudProviderService.toggleEnabled(cloudProvider.id, true);

        // Then
        result = cloudProviderService.getById(cloudProvider.id);
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testToggleEnabledNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            cloudProviderService.toggleEnabled(nonExistentId, false);
        });
    }

    @Test
    @Transactional
    public void testListEnabled() {
        // Given
        createTestCloudProvider("AWS", "Amazon Web Services", true);
        createTestCloudProvider("AZURE", "Microsoft Azure", false);
        createTestCloudProvider("GCP", "Google Cloud Platform", true);

        // When
        List<CloudProviderDto> result = cloudProviderService.listEnabled();

        // Then
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(CloudProviderDto::getEnabled));
        assertTrue(result.stream().anyMatch(dto -> dto.getName().equals("AWS")));
        assertTrue(result.stream().anyMatch(dto -> dto.getName().equals("GCP")));
        assertFalse(result.stream().anyMatch(dto -> dto.getName().equals("AZURE")));
    }

    @Test
    @Transactional
    public void testDtoMapping() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("AWS", "Amazon Web Services", true);

        // When
        CloudProviderDto result = cloudProviderService.getById(cloudProvider.id);

        // Then - verify all fields are mapped correctly
        assertEquals(cloudProvider.id, result.getId());
        assertEquals(cloudProvider.name, result.getName());
        assertEquals(cloudProvider.displayName, result.getDisplayName());
        assertEquals(cloudProvider.description, result.getDescription());
        assertEquals(cloudProvider.enabled, result.getEnabled());
        assertEquals(cloudProvider.createdAt, result.getCreatedAt());
        assertEquals(cloudProvider.updatedAt, result.getUpdatedAt());
    }

    /**
     * Helper method to create a test cloud provider entity
     */
    private CloudProvider createTestCloudProvider(String name, String displayName, Boolean enabled) {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = name;
        cloudProvider.displayName = displayName;
        cloudProvider.description = null;
        cloudProvider.enabled = enabled;
        cloudProvider.persist();
        return cloudProvider;
    }
}
