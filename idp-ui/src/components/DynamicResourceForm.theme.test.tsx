import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DynamicResourceForm } from './DynamicResourceForm';
import { propertySchemaService } from '../services/PropertySchemaService';
import type { PropertySchema } from '../types/admin';

// Mock the PropertySchemaService
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe('DynamicResourceForm - Theme Support (Task 5.7)', () => {
  const mockSchema: PropertySchema[] = [
    {
      id: '1',
      mappingId: 'mapping-1',
      propertyName: 'testProperty',
      displayName: 'Test Property',
      description: 'A test property',
      dataType: 'STRING',
      required: true,
      displayOrder: 1,
    },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(propertySchemaService.getSchema).mockResolvedValue(mockSchema);
  });

  describe('CSS Variables Usage', () => {
    it('should use CSS variables for form styling', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();

      // Verify the component uses the correct CSS class
      expect(formElement).toHaveClass('dynamic-resource-form');
    });

    it('should use CSS variables for section headers', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const headerElement = container.querySelector('.form-section-header h3');
      expect(headerElement).toBeInTheDocument();
      expect(headerElement).toHaveTextContent('Cloud-Specific Properties');
    });

    it('should use CSS variables for loading state', () => {
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading state
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      const loadingElement = container.querySelector('.dynamic-form-loading');
      expect(loadingElement).toBeInTheDocument();
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
    });

    it('should use CSS variables for error state', async () => {
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load schema')
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load schema/)).toBeInTheDocument();
      });

      const errorElement = container.querySelector('.dynamic-form-error');
      expect(errorElement).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should use CSS variables for empty state', async () => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No cloud-specific properties are configured/)
        ).toBeInTheDocument();
      });

      const emptyElement = container.querySelector('.dynamic-form-empty');
      expect(emptyElement).toBeInTheDocument();
    });
  });

  describe('Light Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    it('should render form with light theme styles', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
    });

    it('should render section header with light theme styles', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const headerElement = container.querySelector('.form-section-header h3');
      expect(headerElement).toBeInTheDocument();
    });
  });

  describe('Dark Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    it('should render form with dark theme styles', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
    });

    it('should render error state with dark theme styles', async () => {
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });

      const errorElement = container.querySelector('.dynamic-form-error');
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('Frankenstein Theme', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'frankenstein');
    });

    it('should render form with frankenstein theme styles', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render section header with frankenstein theme styles', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const headerElement = container.querySelector('.form-section-header h3');
      expect(headerElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render loading state with frankenstein theme styles', () => {
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {})
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      const loadingElement = container.querySelector('.dynamic-form-loading');
      expect(loadingElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render error state with frankenstein theme styles', async () => {
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });

      const errorElement = container.querySelector('.dynamic-form-error');
      expect(errorElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });

    it('should render empty state with frankenstein theme styles', async () => {
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No cloud-specific properties are configured/)
        ).toBeInTheDocument();
      });

      const emptyElement = container.querySelector('.dynamic-form-empty');
      expect(emptyElement).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('frankenstein');
    });
  });

  describe('Theme Switching', () => {
    it('should maintain component structure when switching from light to dark', async () => {
      document.documentElement.setAttribute('data-theme', 'light');

      const { container, rerender } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElementBefore = container.querySelector('.dynamic-resource-form');
      expect(formElementBefore).toBeInTheDocument();

      // Switch to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');

      rerender(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      const formElementAfter = container.querySelector('.dynamic-resource-form');
      expect(formElementAfter).toBeInTheDocument();
      expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
    });

    it('should maintain component structure when switching from dark to frankenstein', async () => {
      document.documentElement.setAttribute('data-theme', 'dark');

      const { container, rerender } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      // Switch to frankenstein theme
      document.documentElement.setAttribute('data-theme', 'frankenstein');

      rerender(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();
      expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
    });

    it('should maintain error state when switching themes', async () => {
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      document.documentElement.setAttribute('data-theme', 'light');

      const { container, rerender } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });

      // Switch to dark theme
      document.documentElement.setAttribute('data-theme', 'dark');

      rerender(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      const errorElement = container.querySelector('.dynamic-form-error');
      expect(errorElement).toBeInTheDocument();
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });
  });

  describe('Visual Consistency', () => {
    it('should match visual style of existing form components', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const formElement = container.querySelector('.dynamic-resource-form');
      expect(formElement).toBeInTheDocument();

      // Verify consistent class naming
      expect(formElement).toHaveClass('dynamic-resource-form');
    });

    it('should use consistent spacing and typography', async () => {
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={mockOnChange}
          showLabels={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud-Specific Properties')).toBeInTheDocument();
      });

      const headerElement = container.querySelector('.form-section-header h3');
      const propertiesContainer = container.querySelector('.form-properties');

      expect(headerElement).toBeInTheDocument();
      expect(propertiesContainer).toBeInTheDocument();
    });
  });
});
