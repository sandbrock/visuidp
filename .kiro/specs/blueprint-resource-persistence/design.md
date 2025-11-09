# Design Document: Blueprint Resource Persistence

## Overview

This design implements proper backend support for blueprint resources. Currently, the backend does not support blueprint resources at all - the Blueprint entity has no relationship with BlueprintResource entities, the DTOs don't include resources, and the service layer doesn't process them. This causes the frontend to send resource data that is completely ignored by the backend.

The solution establishes a proper one-to-many relationship between Blueprint and BlueprintResource, updates the DTOs to include resources, and implements the service layer logic to persist, update, and delete resources as part of blueprint operations.

## Architecture

### Current State (Broken)

```
Frontend sends blueprint with resources
    ↓
Backend receives BlueprintCreateDto (no resources field)
    ↓
Resources are ignored/dropped
    ↓
Blueprint saved without resources
    ↓
Frontend receives blueprint without resources
```

### Target State (Fixed)

```
Frontend sends blueprint with resources
    ↓
Backend receives BlueprintCreateDto (with resources field)
    ↓
BlueprintService processes resources
    ↓
Blueprint and BlueprintResource entities persisted with relationship
    ↓
Frontend receives blueprint with resources
```

## Components and Interfaces

### 1. Database Schema Changes

**Add foreign key to blueprint_resources table:**

```sql
ALTER TABLE blueprint_resources 
ADD COLUMN blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE;

CREATE INDEX idx_blueprint_resources_blueprint_id ON blueprint_resources(blueprint_id);
```

### 2. Entity Changes

**Blueprint.java - Add resources relationship:**

```java
@OneToMany(mappedBy = "blueprint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
private Set<BlueprintResource> resources = new HashSet<>();

public Set<BlueprintResource> getResources() { return resources; }
public void setResources(Set<BlueprintResource> resources) { 
    this.resources = resources;
    // Maintain bidirectional relationship
    if (resources != null) {
        for (BlueprintResource resource : resources) {
            resource.setBlueprint(this);
        }
    }
}
```

**BlueprintResource.java - Add blueprint relationship:**

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "blueprint_id")
private Blueprint blueprint;

public Blueprint getBlueprint() { return blueprint; }
public void setBlueprint(Blueprint blueprint) { this.blueprint = blueprint; }
```

### 3. DTO Changes

**BlueprintCreateDto.java - Add resources field:**

```java
@Valid
private List<BlueprintResourceCreateDto> resources;

public List<BlueprintResourceCreateDto> getResources() { return resources; }
public void setResources(List<BlueprintResourceCreateDto> resources) { 
    this.resources = resources; 
}
```

**BlueprintResponseDto.java - Add resources field:**

```java
private List<BlueprintResourceResponseDto> resources;

public List<BlueprintResourceResponseDto> getResources() { return resources; }
public void setResources(List<BlueprintResourceResponseDto> resources) { 
    this.resources = resources; 
}
```

### 4. Service Layer Changes

**BlueprintService.java - Update createBlueprint:**

```java
@Transactional
public BlueprintResponseDto createBlueprint(BlueprintCreateDto createDto) {
    validateBlueprintCreation(createDto);
    
    // ... existing validation and blueprint creation ...
    
    // Handle resources if provided
    if (createDto.getResources() != null && !createDto.getResources().isEmpty()) {
        Set<BlueprintResource> resourceEntities = createBlueprintResources(
            createDto.getResources(), 
            blueprint
        );
        blueprint.setResources(resourceEntities);
    }
    
    blueprint.persist();
    return toResponseDto(blueprint);
}
```

**BlueprintService.java - Update updateBlueprint:**

```java
@Transactional
public BlueprintResponseDto updateBlueprint(UUID id, BlueprintCreateDto updateDto) {
    Blueprint existingBlueprint = Blueprint.findById(id);
    if (existingBlueprint == null) {
        throw new NotFoundException("Blueprint not found with id: " + id);
    }
    
    // ... existing update logic ...
    
    // Handle resources update
    if (updateDto.getResources() != null) {
        // Clear existing resources (orphanRemoval will delete them)
        existingBlueprint.getResources().clear();
        
        // Add new resources
        if (!updateDto.getResources().isEmpty()) {
            Set<BlueprintResource> newResources = createBlueprintResources(
                updateDto.getResources(),
                existingBlueprint
            );
            existingBlueprint.setResources(newResources);
        }
    }
    
    existingBlueprint.persist();
    return toResponseDto(existingBlueprint);
}
```

**BlueprintService.java - Add helper method:**

```java
private Set<BlueprintResource> createBlueprintResources(
        List<BlueprintResourceCreateDto> resourceDtos,
        Blueprint blueprint) {
    
    Set<BlueprintResource> resources = new HashSet<>();
    
    for (BlueprintResourceCreateDto dto : resourceDtos) {
        // Validate resource type exists
        ResourceType resourceType = ResourceType.findById(dto.getBlueprintResourceTypeId());
        if (resourceType == null) {
            throw new IllegalArgumentException(
                "Resource type not found with id: " + dto.getBlueprintResourceTypeId()
            );
        }
        
        // Validate cloud provider exists and is enabled
        CloudProvider cloudProvider = CloudProvider.find("name", dto.getCloudType())
            .firstResultOptional()
            .orElseThrow(() -> new IllegalArgumentException(
                "Cloud provider not found: " + dto.getCloudType()
            ));
        
        if (!cloudProvider.enabled) {
            throw new IllegalArgumentException(
                "Cloud provider is not enabled: " + dto.getCloudType()
            );
        }
        
        // Create resource entity
        BlueprintResource resource = new BlueprintResource();
        resource.setName(dto.getName());
        resource.setDescription(dto.getDescription());
        resource.setResourceType(resourceType);
        resource.setCloudProvider(cloudProvider);
        resource.setCloudType(dto.getCloudType());
        resource.setConfiguration(dto.getConfiguration());
        resource.setCloudSpecificProperties(dto.getCloudSpecificProperties());
        resource.setBlueprint(blueprint);
        
        resources.add(resource);
    }
    
    return resources;
}
```

**BlueprintService.java - Update toResponseDto:**

```java
private BlueprintResponseDto toResponseDto(Blueprint blueprint) {
    BlueprintResponseDto dto = new BlueprintResponseDto();
    // ... existing mapping ...
    
    // Map resources
    if (blueprint.getResources() != null && !blueprint.getResources().isEmpty()) {
        List<BlueprintResourceResponseDto> resourceDtos = blueprint.getResources().stream()
            .map(this::toResourceResponseDto)
            .collect(Collectors.toList());
        dto.setResources(resourceDtos);
    }
    
    return dto;
}

private BlueprintResourceResponseDto toResourceResponseDto(BlueprintResource resource) {
    BlueprintResourceResponseDto dto = new BlueprintResourceResponseDto();
    dto.setId(resource.id);
    dto.setName(resource.getName());
    dto.setDescription(resource.getDescription());
    dto.setBlueprintResourceTypeId(resource.getResourceType().id);
    dto.setBlueprintResourceTypeName(resource.getResourceType().getName());
    dto.setCloudType(resource.getCloudType());
    dto.setConfiguration(resource.getConfiguration());
    dto.setCloudSpecificProperties(resource.getCloudSpecificProperties());
    return dto;
}
```

## Data Models

### Database Schema

**blueprints table** (existing):
- id (UUID, PK)
- name (VARCHAR)
- description (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**blueprint_resources table** (modified):
- id (UUID, PK)
- blueprint_id (UUID, FK) **← NEW**
- name (VARCHAR)
- description (VARCHAR)
- resource_type_id (UUID, FK)
- cloud_provider_id (UUID, FK)
- cloud_type (VARCHAR)
- configuration (JSONB)
- cloud_specific_properties (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Entity Relationships

```
Blueprint (1) ←→ (N) BlueprintResource
    ↓                      ↓
    ↓                 ResourceType (N) ←→ (1)
    ↓                      ↓
    ↓                 CloudProvider (N) ←→ (1)
    ↓
CloudProvider (N) ←→ (N)
```

## Error Handling

### Validation Errors

1. **Missing required fields**
   - HTTP 400: "Resource name is required"
   - HTTP 400: "Resource type is required"
   - HTTP 400: "Cloud provider is required"

2. **Invalid references**
   - HTTP 404: "Resource type not found with id: {id}"
   - HTTP 404: "Cloud provider not found: {name}"

3. **Business rule violations**
   - HTTP 400: "Cloud provider is not enabled: {name}"
   - HTTP 400: "Resource type not supported for cloud provider: {type}"

### Database Errors

1. **Constraint violations**
   - HTTP 409: "Resource name already exists in blueprint"
   - HTTP 409: "Duplicate resource configuration"

2. **Foreign key violations**
   - HTTP 400: "Invalid resource type reference"
   - HTTP 400: "Invalid cloud provider reference"

### Cascade Operations

- When a blueprint is deleted, all associated resources are automatically deleted (CASCADE)
- When resources are removed from a blueprint update, they are deleted (orphanRemoval = true)

## Testing Strategy

### Unit Tests

**BlueprintServiceTest.java:**

```java
@Test
void testCreateBlueprintWithResources() {
    // Given: A blueprint DTO with resources
    BlueprintCreateDto dto = new BlueprintCreateDto();
    dto.setName("Test Blueprint");
    dto.setSupportedCloudProviderIds(Set.of(cloudProviderId));
    
    BlueprintResourceCreateDto resourceDto = new BlueprintResourceCreateDto();
    resourceDto.setName("Test Resource");
    resourceDto.setBlueprintResourceTypeId(resourceTypeId);
    resourceDto.setCloudType("AWS");
    resourceDto.setConfiguration(validConfig);
    dto.setResources(List.of(resourceDto));
    
    // When: Creating the blueprint
    BlueprintResponseDto result = blueprintService.createBlueprint(dto);
    
    // Then: Resources are persisted
    assertNotNull(result.getResources());
    assertEquals(1, result.getResources().size());
    assertEquals("Test Resource", result.getResources().get(0).getName());
}

@Test
void testUpdateBlueprintResources() {
    // Given: An existing blueprint with resources
    Blueprint blueprint = createBlueprintWithResources();
    
    // When: Updating with different resources
    BlueprintCreateDto updateDto = new BlueprintCreateDto();
    updateDto.setName(blueprint.getName());
    updateDto.setSupportedCloudProviderIds(blueprint.getSupportedCloudProviderIds());
    updateDto.setResources(List.of(newResourceDto));
    
    BlueprintResponseDto result = blueprintService.updateBlueprint(blueprint.getId(), updateDto);
    
    // Then: Old resources are deleted, new resources are created
    assertEquals(1, result.getResources().size());
    assertEquals("New Resource", result.getResources().get(0).getName());
}

@Test
void testDeleteBlueprintCascadesResources() {
    // Given: A blueprint with resources
    Blueprint blueprint = createBlueprintWithResources();
    UUID resourceId = blueprint.getResources().iterator().next().id;
    
    // When: Deleting the blueprint
    blueprintService.deleteBlueprint(blueprint.getId());
    
    // Then: Resources are also deleted
    assertNull(BlueprintResource.findById(resourceId));
}
```

### Integration Tests

**BlueprintsControllerTest.java:**

```java
@Test
void testCreateBlueprintWithResourcesE2E() {
    given()
        .contentType(ContentType.JSON)
        .body(blueprintWithResourcesJson)
    .when()
        .post("/v1/blueprints")
    .then()
        .statusCode(201)
        .body("resources.size()", equalTo(1))
        .body("resources[0].name", equalTo("Test Resource"));
}

@Test
void testUpdateBlueprintResourcesE2E() {
    // Create blueprint with resources
    String blueprintId = createBlueprintWithResources();
    
    // Update with different resources
    given()
        .contentType(ContentType.JSON)
        .body(updatedBlueprintJson)
    .when()
        .put("/v1/blueprints/" + blueprintId)
    .then()
        .statusCode(200)
        .body("resources.size()", equalTo(2));
}
```

## Design Decisions and Rationales

### Decision 1: One-to-Many Relationship with Cascade

**Decision:** Use `@OneToMany` with `CascadeType.ALL` and `orphanRemoval = true`

**Rationale:**
- Blueprint owns the lifecycle of its resources
- Resources don't exist independently of blueprints
- Automatic cleanup when blueprint is deleted
- Simplifies resource management logic

### Decision 2: Clear and Recreate Resources on Update

**Decision:** Clear existing resources and create new ones rather than trying to match and update

**Rationale:**
- Simpler implementation - no complex matching logic needed
- Frontend doesn't send resource IDs, so matching is difficult
- Orphan removal handles cleanup automatically
- Avoids issues with stale resource references
- Performance impact is minimal for typical blueprint sizes

### Decision 3: Validate Cloud Provider is Enabled

**Decision:** Check that cloud provider is enabled before creating resources

**Rationale:**
- Prevents creating resources for disabled providers
- Maintains data integrity
- Consistent with blueprint-level cloud provider validation
- Provides clear error messages to users

### Decision 4: Store Cloud Type as String

**Decision:** Keep `cloudType` as a string field in addition to the CloudProvider relationship

**Rationale:**
- Matches existing schema design
- Provides denormalized access for queries
- Frontend expects this field in responses
- Maintains backward compatibility

## Migration Plan

### Phase 1: Database Migration
1. Create Flyway migration script to add `blueprint_id` column
2. Add foreign key constraint with CASCADE delete
3. Create index on `blueprint_id`
4. Test migration on development database

### Phase 2: Entity Updates
1. Add `resources` relationship to Blueprint entity
2. Add `blueprint` relationship to BlueprintResource entity
3. Test entity mappings with unit tests

### Phase 3: DTO Updates
1. Add `resources` field to BlueprintCreateDto
2. Add `resources` field to BlueprintResponseDto
3. Update validation annotations

### Phase 4: Service Layer Implementation
1. Implement `createBlueprintResources` helper method
2. Update `createBlueprint` to handle resources
3. Update `updateBlueprint` to handle resources
4. Update `toResponseDto` to include resources
5. Add validation logic

### Phase 5: Testing
1. Write unit tests for service layer
2. Write integration tests for API endpoints
3. Test cascade delete behavior
4. Test error scenarios

### Phase 6: Frontend Verification
1. Test create blueprint with resources
2. Test update blueprint resources
3. Test delete blueprint with resources
4. Verify resources persist across page refreshes

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate:** Revert to previous version
2. **Database:** Run rollback migration to remove `blueprint_id` column
3. **Cleanup:** Remove any orphaned blueprint resources
4. **Investigation:** Analyze logs and error reports
5. **Fix:** Address issues in development environment
6. **Redeploy:** After thorough testing
