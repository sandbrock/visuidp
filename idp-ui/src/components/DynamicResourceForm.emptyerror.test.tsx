import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DynamicResourceForm } from './DynamicResourceForm';

// Mock the PropertySchemaService
vi.mock('../services/PropertySchemaService', () => ({
  propertySchemaService: {
    getSchema: vi.fn(),
  },
}));

// Mock PropertyInput component
vi.mock('./PropertyInput', () => ({
  PropertyInput: () => <div>Property Input</div>,
}));

describe('DynamicResourceForm - Empty State and Error State UI (Task 5.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State (Requirement 12.1, 12.2, 12.3, 12.4)', () => {
    it('should display message when no properties are defined', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for empty state to appear
      await screen.findByText(/No cloud-specific properties are configured/i);

      // Verify empty state message (Requirement 12.1)
      expect(screen.getByText(/No cloud-specific properties are configured/i)).toBeInTheDocument();
      
      // Verify guidance for users (Requirement 12.3)
      expect(screen.getByText(/Contact your administrator/i)).toBeInTheDocument();
    });

    it('should distinguish between empty state and loading state (Requirement 12.4)', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      
      // First render with loading state
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading state
      );

      const onChange = vi.fn();
      const { rerender } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Verify loading state is shown
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
      expect(screen.queryByText(/No cloud-specific properties are configured/i)).not.toBeInTheDocument();

      // Now resolve with empty schema
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      rerender(
        <DynamicResourceForm
          resourceTypeId="resource-2"
          cloudProviderId="cloud-2"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for empty state to appear
      await screen.findByText(/No cloud-specific properties are configured/i);

      // Verify loading state is gone and empty state is shown
      expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
      expect(screen.getByText(/No cloud-specific properties are configured/i)).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for empty state', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const onChange = vi.fn();
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for empty state to appear
      await screen.findByText(/No cloud-specific properties are configured/i);

      // Verify ARIA role for accessibility
      const emptyState = container.querySelector('.dynamic-form-empty');
      expect(emptyState).toHaveAttribute('role', 'status');
    });
  });

  describe('Error State (Requirement 9.4, 10.3)', () => {
    it('should display error message on fetch failure', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load property configuration')
      );

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Failed to load property configuration/i);

      // Verify error message is displayed
      expect(screen.getByText(/Failed to load property configuration/i)).toBeInTheDocument();
    });

    it('should display retry button on fetch failure', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Network error')
      );

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Network error/i);

      // Verify retry button is displayed
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should retry fetching schema when retry button is clicked', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      
      // First call fails
      vi.mocked(propertySchemaService.getSchema)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([
          {
            id: '1',
            mappingId: 'mapping-1',
            propertyName: 'testProperty',
            displayName: 'Test Property',
            dataType: 'STRING',
            required: false,
            displayOrder: 1,
          },
        ]);

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Network error/i);

      // Click retry button
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      // Wait for schema to load successfully
      await screen.findByText('Property Input');

      // Verify error state is gone
      expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes for error state', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      const onChange = vi.fn();
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Failed to load/i);

      // Verify ARIA role for accessibility
      const errorState = container.querySelector('.dynamic-form-error');
      expect(errorState).toHaveAttribute('role', 'alert');
    });

    it('should disable retry button when form is disabled', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
          disabled={true}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Failed to load/i);

      // Verify retry button is disabled
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeDisabled();
    });

    it('should handle generic error messages', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue('Unknown error');

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state to appear
      await screen.findByText(/Failed to load property configuration/i);

      // Verify generic error message is displayed
      expect(screen.getByText(/Failed to load property configuration/i)).toBeInTheDocument();
    });
  });

  describe('Loading State (Requirement 10.2)', () => {
    it('should display loading indicator while fetching schemas', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      
      // Mock to never resolve to keep loading state
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {})
      );

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Verify loading state is shown
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for loading state', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      
      vi.mocked(propertySchemaService.getSchema).mockImplementation(
        () => new Promise(() => {})
      );

      const onChange = vi.fn();
      const { container } = render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Verify ARIA attributes for accessibility
      const loadingSpinner = container.querySelector('.loading-spinner');
      expect(loadingSpinner).toHaveAttribute('role', 'status');
      expect(loadingSpinner).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('State Transitions', () => {
    it('should transition from loading to empty state', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockResolvedValue([]);

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Initially should show loading
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();

      // Wait for empty state
      await screen.findByText(/No cloud-specific properties are configured/i);

      // Verify loading is gone
      expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    });

    it('should transition from loading to error state', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      vi.mocked(propertySchemaService.getSchema).mockRejectedValue(
        new Error('Failed to load')
      );

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Initially should show loading
      expect(screen.getByText('Loading properties...')).toBeInTheDocument();

      // Wait for error state
      await screen.findByText(/Failed to load/i);

      // Verify loading is gone
      expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    });

    it('should transition from error to loading to success on retry', async () => {
      const { propertySchemaService } = await import('../services/PropertySchemaService');
      
      // First call fails, second succeeds
      vi.mocked(propertySchemaService.getSchema)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([
          {
            id: '1',
            mappingId: 'mapping-1',
            propertyName: 'testProperty',
            displayName: 'Test Property',
            dataType: 'STRING',
            required: false,
            displayOrder: 1,
          },
        ]);

      const onChange = vi.fn();
      render(
        <DynamicResourceForm
          resourceTypeId="resource-1"
          cloudProviderId="cloud-1"
          values={{}}
          onChange={onChange}
        />
      );

      // Wait for error state
      await screen.findByText(/Network error/i);

      // Click retry
      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      // Should show loading briefly
      await waitFor(() => {
        expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument();
      });

      // Wait for success state
      await screen.findByText('Property Input');

      // Verify error and loading are gone
      expect(screen.queryByText(/Network error/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Loading properties...')).not.toBeInTheDocument();
    });
  });
});
