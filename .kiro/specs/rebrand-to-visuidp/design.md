# Design Document

## Overview

This document outlines the design for rebranding the Internal Developer Platform (IDP) application to "VisuIDP". The rebranding is a cosmetic change that updates user-facing labels, titles, and documentation while preserving all technical implementation details. The design ensures consistency across the frontend UI, backend API documentation, and all user-facing documentation.

## Architecture

### Scope of Changes

The rebranding affects three primary areas:

1. **Frontend UI (idp-ui)**: User-facing components, page titles, and HTML metadata
2. **Backend API Documentation (idp-api)**: OpenAPI/Swagger documentation
3. **Documentation Files**: README files and user-facing guides

### Non-Scope

The following elements will **NOT** be changed:

- Project directory names (`idp-api`, `idp-ui`)
- Package names (`com.angryss.idp`)
- Java class names and code identifiers
- API endpoint paths (`/api/v1/*`)
- Environment variable names
- Database table and column names
- Configuration file names
- Docker service names
- Technical references in code comments

## Components and Interfaces

### 1. Frontend UI Components

#### 1.1 Header Component
**File**: `idp-ui/src/components/Header.tsx`

**Current State**:
```tsx
<h1 className="app-title">
  <Link to="/">IDP Portal</Link>
</h1>
```

**Design Change**:
- Update the title text from "IDP Portal" to "VisuIDP"
- Maintain all existing styling and functionality
- Preserve navigation links and user info display

#### 1.2 Login Component
**File**: `idp-ui/src/components/Login.tsx`

**Current State**:
```tsx
<h1>IDP Portal</h1>
```

**Design Change**:
- Update the heading from "IDP Portal" to "VisuIDP"
- Maintain authentication flow messaging
- Preserve all styling and layout

#### 1.3 HTML Document
**File**: `idp-ui/index.html`

**Current State**:
```html
<title>Vite + React + TS</title>
```

**Design Change**:
- Update title to "VisuIDP - Internal Developer Platform"
- Add meta description: "VisuIDP: Automate provisioning and management of developer projects across multiple environments"
- Preserve all other HTML structure and scripts

### 2. Backend API Documentation

#### 2.1 OpenAPI Configuration
**File**: `idp-api/src/main/java/com/angryss/idp/infrastructure/openapi/OpenApiConfiguration.java`

**Current State**:
```java
title = "Internal Developer Platform API"
```

**Design Change**:
- Update title to "VisuIDP API"
- Update description to reference "VisuIDP" where appropriate
- Update contact name from "IDP Support" to "VisuIDP Support"
- Maintain all technical details about authentication, endpoints, and security schemes
- Preserve all code structure and annotations

**Specific Text Updates**:
- Title: "Internal Developer Platform API" → "VisuIDP API"
- Description opening: Add "VisuIDP is a RESTful API..." at the beginning
- Contact name: "IDP Support" → "VisuIDP Support"
- Keep technical references to "IDP" in code examples and technical contexts

### 3. Documentation Files

#### 3.1 Root README
**File**: `idp-api/README.md`

**Design Changes**:
- Update main heading from "IDP REST API" to "VisuIDP REST API"
- Update first paragraph to reference "VisuIDP"
- Maintain all technical instructions and setup procedures
- Keep technical references to "idp" in commands, paths, and configuration

#### 3.2 Frontend README
**File**: `idp-ui/README.md`

**Design Changes**:
- Update main heading from "IDP UI" to "VisuIDP UI"
- Update description to reference "VisuIDP"
- Maintain all technical setup and configuration details
- Keep technical references to "idp" in paths and configuration

#### 3.3 Workspace Steering Rules
**Files**: `.kiro/steering/product.md`

**Design Changes**:
- Update product overview to reference "VisuIDP"
- Maintain all technical and architectural details
- Keep technical acronym "IDP" where appropriate for clarity

## Data Models

No data model changes are required. This is a purely cosmetic rebranding that does not affect:
- Database schemas
- Entity definitions
- DTO structures
- API request/response formats

## Error Handling

No error handling changes are required. All existing error handling mechanisms remain unchanged.

## Testing Strategy

### Manual Testing Checklist

#### Frontend UI Testing
1. **Header Component**
   - Verify "VisuIDP" appears in the header
   - Verify navigation links still work
   - Test on all three themes (Light, Dark, Frankenstein)

2. **Login Page**
   - Verify "VisuIDP" appears on login page
   - Verify authentication flow still works

3. **Browser Tab**
   - Verify page title shows "VisuIDP - Internal Developer Platform"
   - Verify title updates correctly on navigation

4. **Responsive Design**
   - Test header display on mobile, tablet, and desktop viewports
   - Verify branding is visible and readable at all sizes

#### Backend API Testing
1. **Swagger UI**
   - Navigate to `/api/q/swagger-ui`
   - Verify API title shows "VisuIDP API"
   - Verify description references "VisuIDP"
   - Verify contact information shows "VisuIDP Support"

2. **OpenAPI Spec**
   - Access `/api/q/openapi`
   - Verify JSON/YAML contains updated branding
   - Verify all endpoints remain functional

#### Documentation Testing
1. **README Files**
   - Review all README files for consistent branding
   - Verify technical instructions remain accurate
   - Check that code examples still work

2. **Cross-References**
   - Verify all documentation links still work
   - Check that references between documents are consistent

### Automated Testing

No new automated tests are required. Existing tests will continue to validate:
- Component rendering (React component tests)
- API functionality (REST Assured tests)
- Authentication flows (integration tests)

The rebranding does not affect test logic, only display text.

## Implementation Approach

### Phase 1: Frontend UI Updates
1. Update Header component
2. Update Login component
3. Update HTML document metadata
4. Test UI changes across all themes

### Phase 2: Backend API Documentation
1. Update OpenAPI configuration
2. Rebuild and verify Swagger UI
3. Test API documentation accessibility

### Phase 3: Documentation Updates
1. Update README files
2. Update steering rules
3. Review all documentation for consistency

### Phase 4: Verification
1. Perform manual testing checklist
2. Verify no technical functionality is affected
3. Confirm all links and references work

## Design Decisions and Rationales

### Decision 1: Preserve Technical Names
**Rationale**: Changing project names, package names, or code identifiers would:
- Break existing deployments and integrations
- Require extensive refactoring across the codebase
- Risk introducing bugs in a purely cosmetic change
- Affect CI/CD pipelines and infrastructure configurations

### Decision 2: Update User-Facing Text Only
**Rationale**: Users interact with the application through:
- The UI (where they see headers, titles, and labels)
- API documentation (where they learn about the platform)
- README files (where they get started)

These are the only places where branding matters to users.

### Decision 3: Maintain "IDP" in Technical Contexts
**Rationale**: The acronym "IDP" (Internal Developer Platform) is:
- A standard industry term
- Used in technical documentation for clarity
- Part of the technical architecture description
- Appropriate in code comments and technical guides

Using both "VisuIDP" (brand name) and "IDP" (technical term) provides clarity.

### Decision 4: Minimal Scope Approach
**Rationale**: A focused, minimal scope:
- Reduces risk of introducing bugs
- Allows for quick implementation and verification
- Maintains backward compatibility
- Enables easy rollback if needed

## Visual Consistency

### Branding Guidelines

**Primary Brand Name**: VisuIDP
- Use in all user-facing contexts
- Use in page titles and headers
- Use in documentation introductions

**Technical Term**: IDP (Internal Developer Platform)
- Use in technical documentation
- Use in architecture descriptions
- Use in code comments and technical guides

**Format Examples**:
- ✅ "Welcome to VisuIDP"
- ✅ "VisuIDP API Documentation"
- ✅ "VisuIDP is an Internal Developer Platform (IDP) that..."
- ✅ "The IDP architecture follows Clean Architecture principles..."
- ❌ "Welcome to IDP Portal" (outdated)
- ❌ "Internal Developer Platform UI" (too generic)

## Accessibility Considerations

All text changes maintain existing accessibility features:
- Semantic HTML structure preserved
- ARIA labels unchanged (unless they reference "IDP Portal")
- Color contrast ratios maintained
- Keyboard navigation unaffected
- Screen reader compatibility preserved

## Performance Impact

The rebranding has zero performance impact:
- No new dependencies added
- No changes to component logic
- No changes to API endpoints
- No changes to database queries
- Text changes only affect initial render

## Rollback Plan

If rollback is needed:
1. Revert the specific commits containing branding changes
2. Rebuild frontend: `npm run build`
3. Restart backend: `./mvnw quarkus:dev`
4. No database migrations or data changes to revert

## Future Considerations

### Potential Future Enhancements
1. **Custom Logo**: Add a VisuIDP logo to the header and favicon
2. **Branded Loading Screen**: Create a custom loading animation
3. **Email Templates**: Update any email templates with new branding
4. **Error Pages**: Add branded 404 and error pages

These enhancements are out of scope for the initial rebranding but could be considered in future iterations.
