# Requirements Document

## Introduction

After removing SyncFusion from the codebase, several button styling issues have emerged. The Infrastructure component (Blueprints screen) uses plain HTML `<button>` elements with CSS classes that no longer exist (`.btn`, `.btn-primary`, `.btn-small`, etc.), resulting in black buttons with no proper styling. Additionally, the profile icon and theme toggle buttons in the header have black squares around them due to missing or incorrect styling. This feature ensures all buttons use the standardized AngryButton component and fixes the visual styling issues in the header.

## Glossary

- **AngryButton**: The custom button component that replaced SyncFusion buttons, providing consistent styling across the application
- **Infrastructure Component**: The Blueprints screen component located at `/ui/infrastructure`
- **Profile Icon**: The circular button in the top-right corner showing user initials
- **Theme Toggle**: The button next to the profile icon for switching between light, dark, and Frankenstein themes
- **Plain HTML Buttons**: Native `<button>` elements that lack the AngryButton component's styling

## Requirements

### Requirement 1: Replace Plain HTML Buttons with AngryButton Component

**User Story:** As a developer, I want all buttons in the Infrastructure component to use the AngryButton component, so that buttons have consistent styling throughout the application.

#### Acceptance Criteria

1. WHEN reviewing the Infrastructure component, THE System SHALL NOT contain plain HTML `<button>` elements with CSS classes like `btn`, `btn-primary`, `btn-small`
2. WHEN rendering the Blueprints screen, THE System SHALL use AngryButton components for all action buttons (New, Edit, Delete, Create New Resource, etc.)
3. WHEN applying button variants, THE System SHALL use AngryButton's semantic props (`isPrimary`, `variant`, `size`, `style`) instead of CSS classes
4. WHERE buttons require specific styling, THE System SHALL use AngryButton's built-in variant system (`primary`, `danger`, `secondary`, etc.)

### Requirement 2: Fix Profile Icon Border Styling

**User Story:** As a user, I want the profile icon to display without a black square around it, so that the header looks clean and professional.

#### Acceptance Criteria

1. WHEN viewing the profile icon, THE System SHALL display a circular button without any black square or box around it
2. WHEN hovering over the profile icon, THE System SHALL show appropriate hover effects without visual artifacts
3. WHEN the profile icon is active (dropdown open), THE System SHALL display the active state without black borders or squares
4. WHERE the profile icon uses borders, THE System SHALL use CSS variables that adapt to the current theme

### Requirement 3: Fix Theme Toggle Button Styling

**User Story:** As a user, I want the theme toggle button to display without a black square around it, so that the header icons are visually consistent.

#### Acceptance Criteria

1. WHEN viewing the theme toggle button, THE System SHALL display a circular button without any black square or box around it
2. WHEN hovering over the theme toggle, THE System SHALL show appropriate hover effects without visual artifacts
3. WHEN switching themes, THE System SHALL maintain consistent button styling across all themes (light, dark, Frankenstein)
4. WHERE the theme toggle uses borders, THE System SHALL use CSS variables that adapt to the current theme

### Requirement 4: Ensure Button Consistency Across Application

**User Story:** As a developer, I want a single source of truth for button styling, so that all buttons look and behave consistently.

#### Acceptance Criteria

1. WHEN adding new buttons to the application, THE System SHALL use the AngryButton component as the standard button implementation
2. WHEN reviewing button usage, THE System SHALL NOT have multiple button styling approaches (plain HTML buttons, custom CSS classes, etc.)
3. WHEN applying button styles, THE System SHALL use only AngryButton's props and CSS variables
4. WHERE special button styling is needed, THE System SHALL extend AngryButton or use its variant system rather than creating custom button implementations

### Requirement 5: Remove Global Button Styles Causing Visual Artifacts

**User Story:** As a developer, I want to remove conflicting global button styles, so that component-specific button styling works correctly without interference.

#### Acceptance Criteria

1. WHEN reviewing index.css, THE System SHALL NOT contain global button styles that override component-specific styling
2. WHEN rendering buttons, THE System SHALL use only component-specific CSS or AngryButton styling
3. WHERE global button styles exist, THE System SHALL remove or scope them to prevent conflicts with header icons
4. WHEN viewing profile and theme toggle icons, THE System SHALL display them without unwanted borders or backgrounds from global styles

### Requirement 6: Verify Visual Consistency Across Themes

**User Story:** As a user, I want buttons to look correct in all themes, so that the application is visually consistent regardless of my theme preference.

#### Acceptance Criteria

1. WHEN viewing buttons in light theme, THE System SHALL display buttons with appropriate colors and contrast
2. WHEN viewing buttons in dark theme, THE System SHALL display buttons with appropriate colors and contrast
3. WHEN viewing buttons in Frankenstein theme, THE System SHALL display buttons with theme-appropriate styling (stitching, bolts, etc.)
4. WHERE buttons have different states (hover, active, disabled), THE System SHALL display appropriate visual feedback in all themes
