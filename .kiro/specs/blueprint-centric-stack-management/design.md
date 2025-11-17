# Design Document

## Overview

This design transforms the stacks page from a stack-centric view to a blueprint-centric workflow. The architecture introduces a blueprint selector as the primary navigation control, filters stack lists by selected blueprint, simplifies the stack form by removing redundant blueprint selection, and adds stack migration capabilities between blueprints.

## Architecture

### Component Hierarchy

```
Homepage (Container)
├── BlueprintSelector (New Component)
│   ├── Blueprint Dropdown
│   └── Blueprint Actions (New, Edit, Delete)
├── StackList (Modified)
│   ├── Filtered by Selected Blueprint
│   ├── Empty States
│   └── Create Stack Button (Conditional)
├── StackForm (Modified)
│   ├── Removed: Blueprint Picker
│   ├── Added: Blueprint Migration Control (Edit Mode)
│   └── Blueprint Context from Parent
└── StackDetails (Minor Modifications)
    └── Display Blueprint Association
```

### Data Flow

1. **Blueprint Selection Flow**
   - User selects blueprint from BlueprintSelector
   - Selection stored in component state and localStorage
   - Blueprint ID passed to StackList as prop
   - StackList fetches stacks filtered by blueprint ID

2. **Stack Creation Flow**
   - User clicks "Create New Stack" (enabled only when blueprint selected)
   - Homepage passes selected blueprint ID to StackForm
   - StackForm uses blueprint context for resource validation
   - New stack created with blueprintId from context

3. **Stack Migration Flow**
   - User opens existing stack in edit mode
   - StackForm displays current blueprint and migration control
   - User selects new blueprint from dropdown
   - System validates compatibility before allowing migration
   - Stack updated with new blueprintId

## Components and Interfaces

### 1. BlueprintSelector Component (New)

**Purpose:** Provides blueprint selection and management controls at the top of the stacks page.

**Props:**
```typescript
interface BlueprintSelectorProps {
  selectedBlueprintId: string | null;
  onBlueprintChange: (blueprintId: string | null) => void;
  user: User;
}
```

**State:**
```typescript
{
  blueprints: Blueprint[];
  loading: boolean;
  error: string | null;
}
```

**Key Methods:**
- `fetchBlueprints()`: Load available blueprints from API
- `handleBlueprintSelect(id: string)`: Update selection and notify parent
- `handleCreateBlueprint()`: Navigate to Infrastructure page
- `handleEditBlueprint()`: Navigate to Infrastructure page with selected blueprint
- `handleDeleteBlueprint()`: Delete blueprint with confirmation

**UI Elements:**
- Blueprint dropdown (AngryComboBox)
- "New Blueprint" button (navigates to /infrastructure)
- "Edit Blueprint" button (enabled when blueprint selected)
- "Delete Blueprint" button (enabled when blueprint selected, shows confirmation)

### 2. Homepage Component (Modified)

**Current Behavior:** Manages view modes (list, create, edit, details) and stack selection.

**New Behavior:** Adds blueprint selection state and passes blueprint context to child components.

**Additional State:**
```typescript
{
  selectedBlueprintId: string | null;
  blueprints: Blueprint[];  // For validation and display
}
```

**Modified Methods:**
- `handleCreateNew()`: Check blueprint selection before allowing creation
- `handleSave()`: Refresh stack list for current blueprint only
- `useEffect()`: Load and restore blueprint selection from localStorage

**New Methods:**
- `handleBlueprintChange(id: string | null)`: Update blueprint selection and persist to localStorage
- `validateBlueprintSelection()`: Ensure blueprint exists before stack operations

### 3. StackList Component (Modified)

**Current Behavior:** Displays all stacks or stacks by collection with tabs.

**New Behavior:** Displays only stacks for the selected blueprint, removes collection tab.

**New Props:**
```typescript
interface StackListProps {
  selectedBlueprintId: string | null;  // New prop
  onStackSelect: (stack: Stack) => void;
  onCreateNew: () => void;
  user: User;
}
```

**Modified Methods:**
- `fetchStacks()`: Filter by blueprintId parameter
- `renderContent()`: Remove tabs, show single filtered list

**API Changes:**
- Call `apiService.getStacksByBlueprint(blueprintId, userEmail)` instead of `apiService.getStacks(userEmail)`

**Empty States:**
1. No blueprint selected: "Select a blueprint to view stacks"
2. Blueprint selected, no stacks: "No stacks in this blueprint. Create your first stack."
3. No blueprints exist: "No blueprints available. Create a blueprint first." with link to Infrastructure page

### 4. StackForm Component (Modified)

**Current Behavior:** Includes blueprint picker dropdown, allows optional blueprint selection.

**New Behavior:** Receives blueprint context from parent, removes blueprint picker, adds migration control in edit mode.

**New Props:**
```typescript
interface StackFormProps {
  stack?: Stack;
  blueprintId: string;  // New required prop (from parent context)
  onSave: (stack: Stack) => void;
  onCancel: () => void;
  user: User;
}
```

**Removed Elements:**
- Blueprint selection dropdown
- Blueprint requirement helper text
- Blueprint-based filtering logic (moved to parent)

**New Elements (Edit Mode Only):**
- "Move to Different Blueprint" section
- Target blueprint dropdown (excludes current blueprint)
- Migration validation warnings

**Modified State:**
```typescript
{
  // Removed: blueprintId (now from props)
  // Added:
  targetBlueprintId: string | null;  // For migration
  migrationWarnings: string[];       // Validation messages
}
```

**New Methods:**
- `handleBlueprintMigration(targetId: string)`: Validate and prepare migration
- `validateBlueprintCompatibility(targetBlueprint: Blueprint)`: Check if target blueprint supports stack's resources
- `getMigrationWarnings(targetBlueprint: Blueprint)`: Generate user-facing warnings

**Migration Validation Logic:**
```typescript
function validateBlueprintCompatibility(
  stack: Stack,
  targetBlueprint: Blueprint
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check if stack type requires specific resources
  if (stack.stackType === StackType.RESTFUL_API || 
      stack.stackType === StackType.EVENT_DRIVEN_API) {
    const hasOrchestrator = targetBlueprint.resources?.some(
      r => r.resourceTypeName === 'Managed Container Orchestrator'
    );
    if (!hasOrchestrator) {
      warnings.push('Target blueprint does not have a Container Orchestrator');
    }
  }
  
  if (stack.stackType === StackType.JAVASCRIPT_WEB_APPLICATION) {
    const hasStorage = targetBlueprint.resources?.some(
      r => r.resourceTypeName === 'Storage'
    );
    if (!hasStorage) {
      warnings.push('Target blueprint does not have a Storage resource');
    }
  }
  
  // Check if stack's selected blueprint resource exists in target
  if (stack.blueprintResourceId) {
    const resourceExists = targetBlueprint.resources?.some(
      r => r.id === stack.blueprintResourceId
    );
    if (!resourceExists) {
      warnings.push('Selected blueprint resource not available in target blueprint');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}
```

### 5. StackDetails Component (Minor Modifications)

**New Display Elements:**
- Blueprint name and link
- "Blueprint" metadata field showing which blueprint the stack belongs to

**Modified Props:**
```typescript
interface StackDetailsProps {
  stack: Stack;
  user: User;
  onEdit: (stack: Stack) => void;
  onDelete: () => void;
  onBack: () => void;
  blueprintName?: string;  // New optional prop for display
}
```

## Data Models

### Modified Stack Type

```typescript
interface Stack {
  id: string;
  name: string;
  cloudName: string;
  routePath: string;
  description?: string;
  repositoryURL?: string;
  stackType: StackType;
  programmingLanguage?: ProgrammingLanguage;
  frameworkVersion?: string;
  isPublic?: boolean;
  resources: StackResource[];
  blueprintId: string;  // Now required (not nullable)
  blueprintResourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### API Service Changes

**New Method:**
```typescript
async getStacksByBlueprint(
  blueprintId: string,
  userEmail: string
): Promise<Stack[]> {
  const response = await fetch(
    `${API_BASE_URL}/stacks?blueprintId=${blueprintId}`,
    {
      headers: {
        'X-Forwarded-User': userEmail,
        'X-Forwarded-Email': userEmail,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch stacks by blueprint');
  }
  
  return response.json();
}
```

**Modified Method:**
```typescript
async createStack(
  stack: StackCreate,
  userEmail: string
): Promise<Stack> {
  // blueprintId is now required in StackCreate
  if (!stack.blueprintId) {
    throw new Error('Blueprint ID is required for stack creation');
  }
  
  // ... existing implementation
}
```

## Error Handling

### Blueprint Selection Errors

1. **No Blueprints Available**
   - Display: "No blueprints available. Create a blueprint in the Infrastructure page first."
   - Action: Provide link/button to navigate to /infrastructure
   - Disable: "Create New Stack" button

2. **Blueprint Load Failure**
   - Display: "Failed to load blueprints. Please try again."
   - Action: Provide "Retry" button
   - Fallback: Allow manual navigation to Infrastructure page

3. **Invalid Stored Blueprint**
   - Clear localStorage selection
   - Reset to no selection state
   - Display: "Please select a blueprint to continue"

### Stack Creation Errors

1. **No Blueprint Selected**
   - Prevent: Disable "Create New Stack" button
   - Message: Tooltip on disabled button explaining blueprint requirement

2. **Blueprint Deleted During Session**
   - Detect: API returns 404 for blueprint
   - Action: Clear selection, refresh blueprint list
   - Display: "Selected blueprint no longer exists. Please select another."

### Migration Errors

1. **Incompatible Blueprint**
   - Validate: Before allowing migration
   - Display: List of compatibility warnings
   - Prevent: Disable "Save" button if critical incompatibilities exist

2. **Migration Validation Failure**
   - Display: Specific error messages for each validation failure
   - Example: "Target blueprint does not have required Container Orchestrator resource"
   - Action: Allow user to cancel or select different blueprint

3. **Migration Save Failure**
   - Display: "Failed to move stack to new blueprint. Please try again."
   - Action: Revert to original blueprint selection
   - Preserve: User's other form changes

## Testing Strategy

### Unit Tests

1. **BlueprintSelector Component**
   - Renders blueprint dropdown with available blueprints
   - Calls onBlueprintChange when selection changes
   - Disables action buttons when no blueprint selected
   - Handles empty blueprint list gracefully

2. **Homepage Component**
   - Persists blueprint selection to localStorage
   - Restores blueprint selection on mount
   - Passes correct blueprint context to child components
   - Validates blueprint selection before stack operations

3. **StackList Component**
   - Fetches stacks filtered by blueprint ID
   - Displays correct empty state based on context
   - Disables create button when no blueprint selected
   - Updates list when blueprint selection changes

4. **StackForm Component**
   - Does not render blueprint picker
   - Uses blueprint context from props
   - Validates migration target compatibility
   - Displays migration warnings correctly
   - Prevents invalid migrations

### Integration Tests

1. **Blueprint Selection Flow**
   - Select blueprint → Stack list updates
   - Create stack → Stack appears in current blueprint's list
   - Switch blueprint → Stack list changes
   - Delete blueprint → Selection cleared, list empty

2. **Stack Creation Flow**
   - No blueprint selected → Create button disabled
   - Select blueprint → Create button enabled
   - Create stack → Stack associated with selected blueprint
   - Stack appears in correct blueprint's list

3. **Stack Migration Flow**
   - Open stack in edit mode → Migration control visible
   - Select compatible blueprint → No warnings
   - Select incompatible blueprint → Warnings displayed
   - Save migration → Stack moves to new blueprint
   - Original blueprint's list updates

4. **State Persistence**
   - Select blueprint → Refresh page → Selection restored
   - Create stack → Navigate away → Return → Stack visible
   - Logout → Login → Selection cleared

### Edge Cases

1. **Last Stack in Blueprint Deleted**
   - Blueprint remains selected
   - Empty state displayed
   - Create button still enabled

2. **Blueprint Deleted While Selected**
   - Selection cleared
   - User prompted to select new blueprint
   - No stacks displayed

3. **Concurrent Blueprint Modifications**
   - Another user deletes blueprint
   - Current user's operations fail gracefully
   - Clear error messages displayed

4. **Migration to Blueprint Then Back**
   - Stack can be moved back to original blueprint
   - No data loss occurs
   - Resource selections remain valid

## UI/UX Considerations

### Visual Hierarchy

1. **Blueprint Selector** (Top Priority)
   - Prominent position at top of page
   - Clear visual separation from stack list
   - Consistent with Infrastructure page styling

2. **Stack List** (Secondary)
   - Clearly indicates which blueprint's stacks are shown
   - Empty states are informative and actionable
   - Create button visibility tied to blueprint selection

3. **Stack Form** (Tertiary)
   - Cleaner interface without redundant blueprint picker
   - Migration control clearly separated in edit mode
   - Validation warnings prominently displayed

### User Guidance

1. **First-Time User Experience**
   - No blueprints: Clear message with action to create one
   - Blueprint selected, no stacks: Encouraging message to create first stack
   - Tooltips on disabled buttons explaining requirements

2. **Migration Experience**
   - Clear indication of current blueprint
   - Preview of target blueprint's capabilities
   - Warnings before committing to incompatible migration
   - Confirmation dialog for migrations with warnings

3. **Error Recovery**
   - All error states provide clear next steps
   - "Retry" actions where applicable
   - Navigation links to resolve issues (e.g., create blueprint)

### Accessibility

1. **Keyboard Navigation**
   - Blueprint selector accessible via keyboard
   - Tab order: Blueprint selector → Actions → Stack list → Create button
   - Migration controls keyboard accessible

2. **Screen Reader Support**
   - Blueprint selection announced
   - Empty states clearly communicated
   - Migration warnings read aloud
   - Button states (enabled/disabled) announced

3. **Visual Indicators**
   - Disabled states clearly visible
   - Selected blueprint highlighted
   - Migration warnings use appropriate color contrast
   - Loading states indicated

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Load blueprints on page mount
   - Load stacks only when blueprint selected
   - Cache blueprint list to avoid repeated fetches

2. **Debouncing**
   - Debounce blueprint selection changes
   - Prevent rapid API calls during selection changes

3. **Memoization**
   - Memoize filtered stack lists
   - Memoize blueprint compatibility calculations
   - Cache migration validation results

4. **Local Storage**
   - Store only blueprint ID, not full blueprint object
   - Clear stale selections on app version changes
   - Implement storage quota management

### API Efficiency

1. **Filtered Queries**
   - Backend filters stacks by blueprint ID
   - Reduces payload size
   - Improves response time

2. **Batch Operations**
   - Load blueprints and initial stacks in parallel
   - Prefetch blueprint details when selection likely

3. **Caching Strategy**
   - Cache blueprint list for session duration
   - Invalidate cache on blueprint CRUD operations
   - Use ETags for conditional requests

## Migration Path

### Phase 1: Add Blueprint Selector (Non-Breaking)
- Add BlueprintSelector component to Homepage
- Keep existing StackList behavior (show all stacks)
- Blueprint selection optional, for preview only

### Phase 2: Implement Filtering (Breaking Change)
- Modify StackList to filter by selected blueprint
- Add empty states
- Require blueprint selection for stack creation
- Update API calls to use filtered endpoint

### Phase 3: Simplify Stack Form (Breaking Change)
- Remove blueprint picker from StackForm
- Pass blueprint context from Homepage
- Update form validation logic

### Phase 4: Add Migration Feature (Enhancement)
- Add migration control to StackForm edit mode
- Implement validation logic
- Add migration warnings UI

### Rollback Strategy
- Feature flag for blueprint-centric mode
- Ability to toggle between old and new behavior
- Database schema remains compatible with both modes
- API supports both filtered and unfiltered queries

## Security Considerations

1. **Authorization**
   - Verify user has access to selected blueprint
   - Validate blueprint ownership before stack operations
   - Prevent unauthorized blueprint migrations

2. **Input Validation**
   - Validate blueprint ID format
   - Sanitize blueprint selection from localStorage
   - Verify blueprint exists before operations

3. **Data Integrity**
   - Ensure stack's blueprintId always references valid blueprint
   - Prevent orphaned stacks (stacks with invalid blueprintId)
   - Cascade delete or prevent blueprint deletion if stacks exist

## Future Enhancements

1. **Blueprint Templates**
   - Quick-create stacks from blueprint templates
   - Pre-configured stack types for common patterns

2. **Bulk Operations**
   - Move multiple stacks between blueprints
   - Duplicate stacks within or across blueprints

3. **Blueprint Comparison**
   - Compare resources between blueprints
   - Suggest optimal blueprint for stack type

4. **Stack Dependencies**
   - Visualize stack dependencies within blueprint
   - Prevent breaking changes during migration

5. **Blueprint Versioning**
   - Track blueprint changes over time
   - Migrate stacks to new blueprint versions
