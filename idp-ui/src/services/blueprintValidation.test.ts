import { describe, it, expect } from 'vitest';
import { validateBlueprintCompatibility, getMigrationWarnings } from './blueprintValidation';
import { StackType } from '../types/stack';
import type { Blueprint } from './api';

describe('blueprintValidation', () => {
  describe('validateBlueprintCompatibility', () => {
    const createMockBlueprint = (resources: Array<{ id: string; resourceTypeName: string }>): Blueprint => ({
      id: 'blueprint-1',
      name: 'Test Blueprint',
      supportedCloudTypes: ['aws'],
      resources: resources.map(r => ({
        id: r.id,
        name: `Resource ${r.id}`,
        resourceTypeId: 'type-1',
        resourceTypeName: r.resourceTypeName,
        cloudProviderId: 'provider-1',
        configuration: {}
      }))
    });

    describe('Container Orchestrator validation', () => {
      it('should pass when RESTFUL_API stack has Container Orchestrator', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should fail when RESTFUL_API stack lacks Container Orchestrator', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Storage' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
      });

      it('should pass when EVENT_DRIVEN_API stack has Container Orchestrator', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.EVENT_DRIVEN_API,
          blueprint
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should fail when EVENT_DRIVEN_API stack lacks Container Orchestrator', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Storage' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.EVENT_DRIVEN_API,
          blueprint
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
      });

      it('should not require Container Orchestrator for INFRASTRUCTURE stack', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Storage' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.INFRASTRUCTURE,
          blueprint
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Storage validation', () => {
      it('should pass when JAVASCRIPT_WEB_APPLICATION has Storage', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Storage' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.JAVASCRIPT_WEB_APPLICATION,
          blueprint
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should fail when JAVASCRIPT_WEB_APPLICATION lacks Storage', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.JAVASCRIPT_WEB_APPLICATION,
          blueprint
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Target blueprint does not have a Storage resource');
      });

      it('should not require Storage for RESTFUL_API stack', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Blueprint resource validation', () => {
      it('should pass when blueprint resource exists in target', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Storage' },
          { id: 'res-2', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint,
          'res-2'
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it('should fail when blueprint resource does not exist in target', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint,
          'res-999'
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Selected blueprint resource is not available in target blueprint');
      });

      it('should pass when no blueprint resource is specified', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Managed Container Orchestrator' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint,
          null
        );

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Multiple validation failures', () => {
      it('should return all warnings when multiple requirements are not met', () => {
        const blueprint = createMockBlueprint([
          { id: 'res-1', resourceTypeName: 'Database' }
        ]);

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint,
          'res-999'
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toHaveLength(2);
        expect(result.warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
        expect(result.warnings).toContain('Selected blueprint resource is not available in target blueprint');
      });
    });

    describe('Empty blueprint', () => {
      it('should handle blueprint with no resources', () => {
        const blueprint: Blueprint = {
          id: 'blueprint-1',
          name: 'Empty Blueprint',
          supportedCloudTypes: ['aws'],
          resources: []
        };

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
      });

      it('should handle blueprint with undefined resources', () => {
        const blueprint: Blueprint = {
          id: 'blueprint-1',
          name: 'Empty Blueprint',
          supportedCloudTypes: ['aws']
        };

        const result = validateBlueprintCompatibility(
          StackType.RESTFUL_API,
          blueprint
        );

        expect(result.valid).toBe(false);
        expect(result.warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
      });
    });
  });

  describe('getMigrationWarnings', () => {
    it('should return warnings from validateBlueprintCompatibility', () => {
      const blueprint: Blueprint = {
        id: 'blueprint-1',
        name: 'Test Blueprint',
        supportedCloudTypes: ['aws'],
        resources: []
      };

      const warnings = getMigrationWarnings(
        StackType.RESTFUL_API,
        blueprint
      );

      expect(warnings).toHaveLength(1);
      expect(warnings).toContain('Target blueprint does not have a Container Orchestrator resource');
    });

    it('should return empty array when validation passes', () => {
      const blueprint: Blueprint = {
        id: 'blueprint-1',
        name: 'Test Blueprint',
        supportedCloudTypes: ['aws'],
        resources: [{
          id: 'res-1',
          name: 'Orchestrator',
          resourceTypeId: 'type-1',
          resourceTypeName: 'Managed Container Orchestrator',
          cloudProviderId: 'provider-1',
          configuration: {}
        }]
      };

      const warnings = getMigrationWarnings(
        StackType.RESTFUL_API,
        blueprint
      );

      expect(warnings).toHaveLength(0);
    });
  });
});
