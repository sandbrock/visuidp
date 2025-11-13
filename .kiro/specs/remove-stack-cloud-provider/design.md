# Design Document

## Overview

This design outlines the removal of cloud provider, domain, and category fields from the Stack entity to achieve true cloud-agnostic infrastructure management. The changes span the database schema, domain model, application services, API layer, and frontend components. The design ensures backward compatibility for other entities while simplifying the stack model and aligning it with VisuIDP's core architectural principles.

## Architecture

### Current State

The Stack entity currently has three problematic relationships:

1. **Cloud Provider**: Direct foreign key to `cloud_providers` table
2. **Domain**: Foreign key to `domains` table  
3. **Category**: Foreign key to `categories` table (which itself references domains)

These relationships violate the cloud-agnostic principle and add unnecessary complexity. The cloud provider should be determined at the environment level, while domains and categories provide no clear value.

### Target State

The Stack entity will be simplified to remove all three relationships:

- No direct cloud provider association (determined by environment instead)
- No domain association (organizational overhead removed)
- No category association (classification overhead removed)

The Environment entity will continue to have cloud provider associations, allowing the same stack to be deployed to multiple cloud providers through different environments.

## Components and Interfaces

### 1. Database Layer

#### Migration Script (V4__remove_stack_organizational_fields.sql)

```sql
-- Drop foreign key constraints first
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_cloud_provider;
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_domain;
ALTER TABLE stacks DROP CONSTRAINT IF EXISTS fk_stacks_category;

-- Drop indexes
DROP INDEX IF EXISTS idx_stacks_cloud_provider;
DROP INDEX IF EXISTS idx_stacks_domain_id;
DROP INDEX IF EXISTS idx_stacks_category_id;

-- Drop columns
ALTER TABLE stacks DROP COLUMN IF EXISTS cloud_provider_id;
ALTER TABLE stacks DROP COLUMN IF EXISTS domain_id;
ALTER TABLE stacks DROP COLUMN IF EXISTS category_id;

-- Update table comment
COMMENT ON TABLE stacks IS 'Stacks represent logical services or applications. Cloud provider is determined at environment level for true cloud-agnostic deployment.';
```

**Design Decisions:**
- Use `IF EXISTS` clauses for idempotency
- Drop constraints before columns to avoid dependency errors
- Drop indexes to improve performance after column removal
- Add explanatory comment to clarify architectural intent
- Preserve all other stack data and relationships

### 2. Domain Layer

#### Stack Entity (Stack.java)

**Removals:**
```java
// Remove fields
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "cloud_provider_id")
private CloudProvider cloudProvider;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "domain_id")
private Domain domain;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "category_id")
private Category category;

// Remove getters/setters
public CloudProvider getCloudProvider() { ... }
public void setCloudProvider(CloudProvider cloudProvider) { ... }
public Domain getDomain() { ... }
public void setDomain(Domain domain) { ... }
public Category getCategory() { ... }
public void setCategory(Category category) { ... }

// Remove validation method
private void validateCloudProvider() {
    if (cloudProvider != null && !cloudProvider.enabled) {
        throw new IllegalStateException("Cannot create or update stack with disabled cloud provider: " + cloudProvider.name);
    }
}

// Remove from lifecycle hooks
@PrePersist
public void prePersist() {
    this.createdAt = LocalDateTime.now();
    this.updatedAt = LocalDateTime.now();
    // validateCloudProvider(); // REMOVE THIS LINE
}

@PreUpdate
public void preUpdate() {
    this.updatedAt = LocalDateTime.now();
    // validateCloudProvider(); // REMOVE THIS LINE
}

// Remove static finder methods
public static List<Stack> findByCloudProviderId(UUID cloudProviderId) { ... }
public static List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy) { ... }
public static List<Stack> findByDomainId(UUID domainId) { ... }
public static List<Stack> findByCategoryId(UUID categoryId) { ... }
```

**Design Decisions:**
- Remove all three relationships completely
- Remove validation logic that depends on cloud provider
- Remove finder methods that query by these fields
- Keep all other stack functionality intact
- Maintain relationships with Team, StackCollection, and Blueprint

### 3. Application Layer

#### StackCreateDto

**Removals:**
```java
// Remove fields
private java.util.UUID domainId;
private java.util.UUID categoryId;
// Note: cloudProviderId doesn't exist in current DTO

// Remove getters/setters
public java.util.UUID getDomainId() { ... }
public void setDomainId(java.util.UUID domainId) { ... }
public java.util.UUID getCategoryId() { ... }
public void setCategoryId(java.util.UUID categoryId) { ... }
```

#### StackResponseDto

**Removals:**
```java
// Remove fields
private java.util.UUID domainId;
private java.util.UUID categoryId;
// Note: cloudProviderId doesn't exist in current DTO

// Remove getters/setters
public java.util.UUID getDomainId() { ... }
public void setDomainId(java.util.UUID domainId) { ... }
public java.util.UUID getCategoryId() { ... }
public void setCategoryId(java.util.UUID categoryId) { ... }
```

#### StackService

**Modifications:**

1. **Remove domain/category lookups in create method:**
```java
// REMOVE these lookups
if (dto.getDomainId() != null) {
    Domain domain = domainRepository.findById(dto.getDomainId())
        .orElseThrow(() -> new IllegalArgumentException("Domain not found"));
    stack.setDomain(domain);
}

if (dto.getCategoryId() != null) {
    Category category = categoryRepository.findById(dto.getCategoryId())
        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    stack.setCategory(category);
}
```

2. **Remove domain/category from DTO mapping:**
```java
// REMOVE from toResponseDto method
dto.setDomainId(stack.getDomain() != null ? stack.getDomain().getId() : null);
dto.setCategoryId(stack.getCategory() != null ? stack.getCategory().getId() : null);
```

3. **Remove injected repositories if no longer needed:**
```java
// REMOVE if not used elsewhere
@Inject
DomainRepository domainRepository;

@Inject
CategoryRepository categoryRepository;
```

**Design Decisions:**
- Remove all logic that sets or retrieves cloud provider, domain, or category
- Simplify service methods by removing unnecessary lookups
- Keep all other stack creation/update logic intact
- Maintain validation for other required fields

### 4. Presentation Layer

#### StacksController

**Modifications:**

The controller should automatically reflect the DTO changes. No explicit code changes needed unless there's custom validation or processing logic for these fields.

**Verification Points:**
- Ensure OpenAPI documentation doesn't show removed fields
- Verify request validation doesn't reference removed fields
- Confirm response serialization excludes removed fields

### 5. Frontend Layer

#### TypeScript Types (types/stack.ts)

**Removals:**
```typescript
// Remove from Stack interface
export interface Stack {
  id: string;
  name: string;
  description?: string;
  // ... other fields ...
  // domainId?: string;  // REMOVE
  // categoryId?: string;  // REMOVE
  // cloudProviderId?: string;  // REMOVE (if exists)
}

// Remove from StackCreateRequest interface
export interface StackCreateRequest {
  name: string;
  cloudName: string;
  routePath: string;
  // ... other fields ...
  // domainId?: string;  // REMOVE
  // categoryId?: string;  // REMOVE
  // cloudProviderId?: string;  // REMOVE (if exists)
}
```

#### StackForm Component

**Modifications:**

1. **Remove form fields:**
```typescript
// REMOVE domain selection field
<div className="form-group">
  <label>Domain</label>
  <select name="domainId" ...>
    {/* domain options */}
  </select>
</div>

// REMOVE category selection field
<div className="form-group">
  <label>Category</label>
  <select name="categoryId" ...>
    {/* category options */}
  </select>
</div>

// REMOVE cloud provider selection field (if exists)
<div className="form-group">
  <label>Cloud Provider</label>
  <select name="cloudProviderId" ...>
    {/* cloud provider options */}
  </select>
</div>
```

2. **Remove from form state:**
```typescript
const [formData, setFormData] = useState({
  name: '',
  cloudName: '',
  routePath: '',
  // ... other fields ...
  // domainId: '',  // REMOVE
  // categoryId: '',  // REMOVE
  // cloudProviderId: '',  // REMOVE
});
```

3. **Remove from submission payload:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const payload = {
    name: formData.name,
    cloudName: formData.cloudName,
    routePath: formData.routePath,
    // ... other fields ...
    // domainId: formData.domainId,  // REMOVE
    // categoryId: formData.categoryId,  // REMOVE
    // cloudProviderId: formData.cloudProviderId,  // REMOVE
  };
  
  await api.createStack(payload);
};
```

#### StackList Component

**Modifications:**

Remove any display of domain, category, or cloud provider information:

```typescript
// REMOVE these columns from table
<th>Domain</th>
<th>Category</th>
<th>Cloud Provider</th>

// REMOVE these cells from table rows
<td>{stack.domain?.name}</td>
<td>{stack.category?.name}</td>
<td>{stack.cloudProvider?.displayName}</td>
```

#### StackDetails Component

**Modifications:**

Remove any display of domain, category, or cloud provider information:

```typescript
// REMOVE these detail rows
<div className="detail-row">
  <span className="label">Domain:</span>
  <span className="value">{stack.domain?.name}</span>
</div>

<div className="detail-row">
  <span className="label">Category:</span>
  <span className="value">{stack.category?.name}</span>
</div>

<div className="detail-row">
  <span className="label">Cloud Provider:</span>
  <span className="value">{stack.cloudProvider?.displayName}</span>
</div>
```

**Design Decisions:**
- Remove all UI elements related to the three fields
- Simplify form validation by removing field dependencies
- Improve user experience by reducing form complexity
- Maintain all other stack management functionality

## Data Models

### Stack Entity (Simplified)

```java
@Entity
@Table(name = "stacks")
public class Stack extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    private String name;
    private String description;
    private String cloudName;
    private String routePath;
    private String repositoryURL;
    
    @Enumerated(EnumType.STRING)
    private StackType stackType;
    
    @Enumerated(EnumType.STRING)
    private ProgrammingLanguage programmingLanguage;
    
    private Boolean isPublic;
    private String createdBy;
    
    // Relationships that remain
    @ManyToOne(fetch = FetchType.LAZY)
    private Team team;
    
    @ManyToOne(fetch = FetchType.LAZY)
    private StackCollection stackCollection;
    
    @ManyToOne(fetch = FetchType.LAZY)
    private Blueprint blueprint;
    
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> configuration;
    
    private String ephemeralPrefix;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "stack", cascade = CascadeType.ALL)
    private List<StackResource> stackResources;
    
    // Cloud provider, domain, and category REMOVED
}
```

### Database Schema (stacks table)

```sql
CREATE TABLE stacks (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    cloud_name VARCHAR(60) NOT NULL UNIQUE,
    route_path VARCHAR(22) NOT NULL UNIQUE,
    repository_url VARCHAR(2048),
    stack_type VARCHAR NOT NULL,
    programming_language VARCHAR,
    is_public BOOLEAN,
    created_by VARCHAR(100) NOT NULL,
    team_id UUID,
    stack_collection_id UUID,
    blueprint_id UUID,
    configuration JSONB,
    ephemeral_prefix VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    -- cloud_provider_id REMOVED
    -- domain_id REMOVED
    -- category_id REMOVED
    CONSTRAINT fk_stacks_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_stacks_collection FOREIGN KEY (stack_collection_id) REFERENCES stack_collections(id),
    CONSTRAINT fk_stacks_blueprint FOREIGN KEY (blueprint_id) REFERENCES blueprints(id)
);
```

## Error Handling

### Migration Errors

**Scenario**: Migration fails due to existing data dependencies

**Handling**:
- Use `IF EXISTS` clauses to make migration idempotent
- Drop constraints before columns to avoid dependency errors
- Log any errors but don't fail on missing constraints/columns
- Verify migration on test database before production

### Service Layer Errors

**Scenario**: Existing code tries to access removed fields

**Handling**:
- Comprehensive code search for all references
- Update or remove all code that accesses cloudProvider, domain, or category on Stack
- Run full test suite to catch any missed references
- Use IDE refactoring tools to find all usages

### API Compatibility

**Scenario**: Existing API clients send removed fields

**Handling**:
- Fields will be ignored by Jackson deserialization (no error)
- Document breaking change in API changelog
- Consider API versioning if needed for gradual migration
- Provide migration guide for API consumers

### Frontend Errors

**Scenario**: Components try to display removed fields

**Handling**:
- Remove all UI elements that reference removed fields
- Update TypeScript types to prevent compilation errors
- Test all stack-related pages and forms
- Verify no runtime errors when accessing undefined properties

## Testing Strategy

### 1. Database Migration Tests

```java
@QuarkusTest
class StackMigrationTest {
    
    @Test
    void testMigrationRemovesCloudProviderColumn() {
        // Verify column doesn't exist after migration
        // Query information_schema to confirm
    }
    
    @Test
    void testMigrationPreservesOtherStackData() {
        // Create stack before migration
        // Run migration
        // Verify all other fields intact
    }
    
    @Test
    void testMigrationIsIdempotent() {
        // Run migration twice
        // Verify no errors on second run
    }
}
```

### 2. Entity Tests

```java
@QuarkusTest
class StackEntityTest {
    
    @Test
    void testStackCreationWithoutCloudProvider() {
        Stack stack = new Stack();
        stack.name = "test-stack";
        stack.cloudName = "test-cloud";
        stack.routePath = "/test/";
        stack.stackType = StackType.INFRASTRUCTURE_ONLY;
        stack.createdBy = "test@example.com";
        
        stack.persist();
        
        assertNotNull(stack.id);
        // Verify no cloud provider, domain, or category
    }
    
    @Test
    void testStackFinderMethodsStillWork() {
        // Test remaining finder methods
        List<Stack> stacks = Stack.findByCreatedBy("test@example.com");
        assertNotNull(stacks);
    }
}
```

### 3. Service Layer Tests

```java
@QuarkusTest
class StackServiceTest {
    
    @Inject
    StackService stackService;
    
    @Test
    void testCreateStackWithoutOrganizationalFields() {
        StackCreateDto dto = new StackCreateDto();
        dto.setName("test-stack");
        dto.setCloudName("test-cloud");
        dto.setRoutePath("/test/");
        dto.setStackType(StackType.INFRASTRUCTURE_ONLY);
        // No domainId, categoryId, or cloudProviderId
        
        StackResponseDto response = stackService.create(dto, "test@example.com");
        
        assertNotNull(response.getId());
        assertNull(response.getDomainId());  // Should not exist
        assertNull(response.getCategoryId());  // Should not exist
    }
}
```

### 4. API Integration Tests

```java
@QuarkusTest
class StacksControllerTest {
    
    @Test
    void testCreateStackWithoutOrganizationalFields() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "name": "test-stack",
                    "cloudName": "test-cloud",
                    "routePath": "/test/",
                    "stackType": "INFRASTRUCTURE_ONLY"
                }
                """)
        .when()
            .post("/v1/stacks")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("domainId", nullValue())
            .body("categoryId", nullValue());
    }
    
    @Test
    void testCreateStackIgnoresRemovedFields() {
        // Send request with removed fields
        // Verify they are ignored without error
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                    "name": "test-stack",
                    "cloudName": "test-cloud",
                    "routePath": "/test/",
                    "stackType": "INFRASTRUCTURE_ONLY",
                    "domainId": "00000000-0000-0000-0000-000000000000",
                    "categoryId": "00000000-0000-0000-0000-000000000000"
                }
                """)
        .when()
            .post("/v1/stacks")
        .then()
            .statusCode(201);
    }
}
```

### 5. Frontend Component Tests

```typescript
describe('StackForm', () => {
  it('should not display domain field', () => {
    render(<StackForm />);
    expect(screen.queryByLabelText(/domain/i)).not.toBeInTheDocument();
  });
  
  it('should not display category field', () => {
    render(<StackForm />);
    expect(screen.queryByLabelText(/category/i)).not.toBeInTheDocument();
  });
  
  it('should not display cloud provider field', () => {
    render(<StackForm />);
    expect(screen.queryByLabelText(/cloud provider/i)).not.toBeInTheDocument();
  });
  
  it('should submit without organizational fields', async () => {
    const mockCreate = jest.fn();
    render(<StackForm onSubmit={mockCreate} />);
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Stack' } });
    fireEvent.change(screen.getByLabelText(/cloud name/i), { target: { value: 'test-cloud' } });
    fireEvent.change(screen.getByLabelText(/route path/i), { target: { value: '/test/' } });
    
    fireEvent.click(screen.getByText(/submit/i));
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({
          domainId: expect.anything(),
          categoryId: expect.anything(),
          cloudProviderId: expect.anything(),
        })
      );
    });
  });
});
```

### 6. End-to-End Tests

```typescript
describe('Stack Management E2E', () => {
  it('should create stack without organizational fields', async () => {
    // Navigate to stack creation form
    // Fill required fields only
    // Submit form
    // Verify stack created successfully
    // Verify stack details don't show removed fields
  });
  
  it('should list stacks without organizational columns', async () => {
    // Navigate to stack list
    // Verify domain column not present
    // Verify category column not present
    // Verify cloud provider column not present
  });
});
```

### Test Execution Order

1. **Unit Tests**: Entity, DTO, and service layer tests
2. **Integration Tests**: API controller tests with database
3. **Migration Tests**: Database schema migration verification
4. **Frontend Tests**: Component and integration tests
5. **E2E Tests**: Full user workflow tests

### Test Coverage Goals

- **Backend**: 90%+ coverage for modified classes
- **Frontend**: 80%+ coverage for modified components
- **Integration**: All API endpoints tested
- **Migration**: 100% coverage of migration script paths

## Design Decisions and Rationale

### 1. Why Remove All Three Fields?

**Decision**: Remove cloud provider, domain, and category together in one migration.

**Rationale**:
- All three violate cloud-agnostic principles or add unnecessary complexity
- Single migration reduces deployment complexity
- Consistent simplification of the stack model
- Easier to communicate and document as one change

### 2. Why Not Make Fields Optional?

**Decision**: Completely remove fields rather than making them optional.

**Rationale**:
- Optional fields still require maintenance and testing
- Partial removal creates confusion about when to use fields
- Complete removal enforces architectural principles
- Simpler codebase with fewer conditional branches

### 3. Why Keep Other Relationships?

**Decision**: Maintain Team, StackCollection, and Blueprint relationships.

**Rationale**:
- Team: Essential for access control and ownership
- StackCollection: Useful for grouping related stacks
- Blueprint: Core to infrastructure reuse patterns
- These relationships don't violate cloud-agnostic principles

### 4. Migration Strategy

**Decision**: Use single Flyway migration with IF EXISTS clauses.

**Rationale**:
- Idempotent migrations are safer for production
- Single migration is atomic and easier to rollback
- IF EXISTS prevents errors on repeated runs
- Clear audit trail of schema changes

### 5. API Compatibility

**Decision**: Accept breaking change, don't version API.

**Rationale**:
- Fields provide no value, so no reason to maintain compatibility
- Simpler to have one API version
- Removed fields will be silently ignored if sent
- Document breaking change clearly for consumers

### 6. Frontend Approach

**Decision**: Remove UI elements completely, don't hide them.

**Rationale**:
- Hidden elements still require maintenance
- Complete removal simplifies component logic
- Clearer user experience without unused fields
- Reduces bundle size by removing unused code

## Dependencies

### External Dependencies

- **Flyway**: Database migration execution
- **Hibernate/JPA**: Entity relationship management
- **Jackson**: JSON serialization/deserialization
- **React**: Frontend component framework
- **TypeScript**: Type safety in frontend

### Internal Dependencies

- **Environment Entity**: Must maintain cloud provider relationship
- **StackResource Entity**: May have cloud provider relationship
- **BlueprintResource Entity**: May have cloud provider relationship
- **Test Suite**: Must be updated to reflect changes

### Breaking Changes

1. **API Contract**: Stack endpoints no longer accept/return removed fields
2. **Database Schema**: Columns removed from stacks table
3. **Frontend**: UI no longer displays removed fields
4. **Existing Data**: Domain/category associations lost (acceptable)

## Rollback Strategy

### Database Rollback

If migration needs to be rolled back:

```sql
-- Add columns back
ALTER TABLE stacks ADD COLUMN cloud_provider_id UUID;
ALTER TABLE stacks ADD COLUMN domain_id UUID;
ALTER TABLE stacks ADD COLUMN category_id UUID;

-- Add constraints back
ALTER TABLE stacks ADD CONSTRAINT fk_stacks_cloud_provider 
    FOREIGN KEY (cloud_provider_id) REFERENCES cloud_providers(id);
ALTER TABLE stacks ADD CONSTRAINT fk_stacks_domain 
    FOREIGN KEY (domain_id) REFERENCES domains(id);
ALTER TABLE stacks ADD CONSTRAINT fk_stacks_category 
    FOREIGN KEY (category_id) REFERENCES categories(id);

-- Add indexes back
CREATE INDEX idx_stacks_cloud_provider ON stacks(cloud_provider_id);
CREATE INDEX idx_stacks_domain_id ON stacks(domain_id);
CREATE INDEX idx_stacks_category_id ON stacks(category_id);
```

**Note**: Data will be lost and cannot be recovered unless backed up before migration.

### Code Rollback

- Revert Git commits for backend, frontend, and tests
- Redeploy previous version
- Run rollback migration script

### Rollback Testing

- Test rollback script on staging environment
- Verify application works with restored schema
- Document rollback procedure in deployment guide
