import type { Blueprint } from './api';
import { StackType } from '../types/stack';

/**
 * Result of blueprint compatibility validation
 */
export interface BlueprintCompatibilityResult {
  /** Whether the target blueprint is compatible with the stack */
  valid: boolean;
  /** List of warning messages describing compatibility issues */
  warnings: string[];
}

/**
 * Validates whether a target blueprint is compatible with a stack's requirements.
 * 
 * This function checks:
 * 1. Container Orchestrator availability for API stack types
 * 2. Storage resource availability for web applications
 * 3. Blueprint resource availability if stack uses a specific blueprint resource
 * 
 * @param stackType - The type of stack being validated
 * @param targetBlueprint - The blueprint to validate against
 * @param currentBlueprintResourceId - Optional ID of the blueprint resource currently used by the stack
 * @returns Validation result with compatibility status and warning messages
 */
export function validateBlueprintCompatibility(
  stackType: StackType,
  targetBlueprint: Blueprint,
  currentBlueprintResourceId?: string | null
): BlueprintCompatibilityResult {
  const warnings: string[] = [];

  // Check if stack type requires a Container Orchestrator
  if (requiresContainerOrchestrator(stackType)) {
    const hasOrchestrator = targetBlueprint.resources?.some(
      r => r.resourceTypeName === 'Managed Container Orchestrator'
    );
    
    if (!hasOrchestrator) {
      warnings.push('Target blueprint does not have a Container Orchestrator resource');
    }
  }

  // Check if stack type requires Storage
  if (requiresStorage(stackType)) {
    const hasStorage = targetBlueprint.resources?.some(
      r => r.resourceTypeName === 'Storage'
    );
    
    if (!hasStorage) {
      warnings.push('Target blueprint does not have a Storage resource');
    }
  }

  // Check if stack's selected blueprint resource exists in target blueprint
  if (currentBlueprintResourceId) {
    const resourceExists = targetBlueprint.resources?.some(
      r => r.id === currentBlueprintResourceId
    );
    
    if (!resourceExists) {
      warnings.push('Selected blueprint resource is not available in target blueprint');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Determines if a stack type requires a Container Orchestrator resource.
 * 
 * Container orchestrators are required for:
 * - RESTful API (containerized)
 * - Event-driven API (containerized)
 * 
 * @param stackType - The stack type to check
 * @returns true if the stack type requires a container orchestrator
 */
function requiresContainerOrchestrator(stackType: StackType): boolean {
  return stackType === StackType.RESTFUL_API || 
         stackType === StackType.EVENT_DRIVEN_API;
}

/**
 * Determines if a stack type requires a Storage resource.
 * 
 * Storage is required for:
 * - JavaScript Web Application (for static file hosting)
 * 
 * @param stackType - The stack type to check
 * @returns true if the stack type requires storage
 */
function requiresStorage(stackType: StackType): boolean {
  return stackType === StackType.JAVASCRIPT_WEB_APPLICATION;
}

/**
 * Generates user-friendly warning messages for blueprint migration.
 * 
 * This is a convenience function that wraps validateBlueprintCompatibility
 * and returns just the warning messages.
 * 
 * @param stackType - The type of stack being validated
 * @param targetBlueprint - The blueprint to validate against
 * @param currentBlueprintResourceId - Optional ID of the blueprint resource currently used by the stack
 * @returns Array of user-friendly warning messages
 */
export function getMigrationWarnings(
  stackType: StackType,
  targetBlueprint: Blueprint,
  currentBlueprintResourceId?: string | null
): string[] {
  const result = validateBlueprintCompatibility(
    stackType,
    targetBlueprint,
    currentBlueprintResourceId
  );
  return result.warnings;
}
