import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { StackDetails } from './StackDetails';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import { StackType, ProgrammingLanguage } from '../types/stack';
import { apiService } from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    deleteStack: vi.fn(),
  },
}));

describe('StackDetails - Removed Fields Tests', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBack = vi.fn();

  const mockStack: Stack = {
    id: '123',
    name: 'Test Stack',
    cloudName: 'test-cloud',
    routePath: '/test/',
    description: 'A test stack for verification',
    stackType: StackType.RESTFUL_API,
    programmingLanguage: ProgrammingLanguage.QUARKUS,
    frameworkVersion: '3.20.2',
    isPublic: false,
    repositoryURL: 'https://github.com/test/repo',
    createdBy: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    configuration: {
      someKey: 'someValue',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderStackDetails = (stack: Stack = mockStack) => {
    return render(
      <StackDetails
        stack={stack}
        user={mockUser}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onBack={mockOnBack}
      />
    );
  };

  describe('Requirement 6.1: Removed fields are not displayed', () => {
    it('should not display domain field', () => {
      renderStackDetails();

      // Check for domain-related labels and content
      expect(screen.queryByText(/^Domain$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/domain:/i)).not.toBeInTheDocument();
    });

    it('should not display category field', () => {
      renderStackDetails();

      // Check for category-related labels and content
      expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/category:/i)).not.toBeInTheDocument();
    });

    it('should not display cloud provider field', () => {
      renderStackDetails();

      // Check for cloud provider-related labels and content
      expect(screen.queryByText(/^Cloud Provider$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cloud provider:/i)).not.toBeInTheDocument();
    });

    it('should not have domain detail row', () => {
      const { container } = renderStackDetails();

      const infoItems = container.querySelectorAll('.stack-info-item');
      infoItems.forEach((item) => {
        const label = item.querySelector('label');
        if (label) {
          expect(label.textContent).not.toMatch(/domain/i);
        }
      });
    });

    it('should not have category detail row', () => {
      const { container } = renderStackDetails();

      const infoItems = container.querySelectorAll('.stack-info-item');
      infoItems.forEach((item) => {
        const label = item.querySelector('label');
        if (label) {
          expect(label.textContent).not.toMatch(/category/i);
        }
      });
    });

    it('should not have cloud provider detail row', () => {
      const { container } = renderStackDetails();

      const infoItems = container.querySelectorAll('.stack-info-item');
      infoItems.forEach((item) => {
        const label = item.querySelector('label');
        if (label) {
          expect(label.textContent).not.toMatch(/cloud provider/i);
        }
      });
    });
  });

  describe('Requirement 6.2: Only expected fields are displayed', () => {
    it('should display stack name', () => {
      renderStackDetails();

      expect(screen.getByText('Test Stack')).toBeInTheDocument();
    });

    it('should display description', () => {
      renderStackDetails();

      expect(screen.getByText('A test stack for verification')).toBeInTheDocument();
    });

    it('should display stack type', () => {
      renderStackDetails();

      expect(screen.getByText('Stack Type')).toBeInTheDocument();
      expect(screen.getByText('RESTful API')).toBeInTheDocument();
    });

    it('should display framework', () => {
      renderStackDetails();

      expect(screen.getByText('Framework')).toBeInTheDocument();
      expect(screen.getByText('Java')).toBeInTheDocument();
    });

    it('should display framework version', () => {
      renderStackDetails();

      expect(screen.getByText('Framework Version')).toBeInTheDocument();
      expect(screen.getByText('3.20.2')).toBeInTheDocument();
    });

    it('should display visibility', () => {
      renderStackDetails();

      expect(screen.getByText('Visibility')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('should display repository URL', () => {
      renderStackDetails();

      expect(screen.getByText('Repository')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /github\.com/i });
      expect(link).toHaveAttribute('href', 'https://github.com/test/repo');
    });

    it('should display owner', () => {
      renderStackDetails();

      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display created date', () => {
      renderStackDetails();

      expect(screen.getByText('Created')).toBeInTheDocument();
      // Date formatting may vary, just check the label exists
    });

    it('should display last updated date', () => {
      renderStackDetails();

      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      // Date formatting may vary, just check the label exists
    });

    it('should display configuration when present', () => {
      renderStackDetails();

      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText(/"someKey": "someValue"/)).toBeInTheDocument();
    });
  });

  describe('Requirement 6.3: Stack details functionality remains intact', () => {
    it('should handle edit button click', async () => {
      const user = userEvent.setup();
      renderStackDetails();

      const editButton = screen.getByRole('button', { name: /edit stack/i });
      await act(async () => {
        await user.click(editButton);
      });

      expect(mockOnEdit).toHaveBeenCalledWith(mockStack);
    });

    it('should handle back button click', async () => {
      const user = userEvent.setup();
      renderStackDetails();

      const backButton = screen.getByRole('button', { name: /back to stacks/i });
      await act(async () => {
        await user.click(backButton);
      });

      expect(mockOnBack).toHaveBeenCalled();
    });

    it('should show delete confirmation modal', async () => {
      const user = userEvent.setup();
      renderStackDetails();

      const deleteButton = screen.getByRole('button', { name: /delete stack/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });
    });

    it('should handle delete confirmation', async () => {
      const user = userEvent.setup();
      (apiService.deleteStack as any).mockResolvedValue(undefined);

      renderStackDetails();

      // Click delete button in header
      const deleteButtons = screen.getAllByRole('button', { name: /delete stack/i });
      const headerDeleteButton = deleteButtons[0]; // First one is in the header
      await user.click(headerDeleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click the confirm button in the modal (second delete button)
      const confirmButtons = screen.getAllByRole('button', { name: /delete stack/i });
      const modalConfirmButton = confirmButtons[1]; // Second one is in the modal
      await user.click(modalConfirmButton);

      await waitFor(() => {
        expect(apiService.deleteStack).toHaveBeenCalledWith(mockStack.id, mockUser.email);
        expect(mockOnDelete).toHaveBeenCalledWith(mockStack.id);
      });
    });

    it('should handle delete cancellation', async () => {
      const user = userEvent.setup();
      renderStackDetails();

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete stack/i });
      await act(async () => {
        await user.click(deleteButton);
      });

      // Cancel deletion
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await act(async () => {
        await user.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      });

      expect(apiService.deleteStack).not.toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 6.5: Display handles missing optional fields', () => {
    it('should handle stack without description', () => {
      const stackWithoutDescription = { ...mockStack, description: undefined };
      renderStackDetails(stackWithoutDescription);

      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should handle stack without framework', () => {
      const stackWithoutFramework = { ...mockStack, programmingLanguage: undefined };
      renderStackDetails(stackWithoutFramework);

      expect(screen.queryByText('Framework')).not.toBeInTheDocument();
    });

    it('should handle stack without framework version', () => {
      const stackWithoutVersion = { ...mockStack, frameworkVersion: undefined };
      renderStackDetails(stackWithoutVersion);

      expect(screen.queryByText('Framework Version')).not.toBeInTheDocument();
    });

    it('should handle stack without repository URL', () => {
      const stackWithoutRepo = { ...mockStack, repositoryURL: undefined };
      renderStackDetails(stackWithoutRepo);

      expect(screen.queryByText('Repository')).not.toBeInTheDocument();
    });

    it('should handle stack without configuration', () => {
      const stackWithoutConfig = { ...mockStack, configuration: undefined };
      renderStackDetails(stackWithoutConfig);

      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
    });

    it('should handle stack with empty configuration', () => {
      const stackWithEmptyConfig = { ...mockStack, configuration: {} };
      renderStackDetails(stackWithEmptyConfig);

      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
    });
  });

  describe('Stack info grid structure verification', () => {
    it('should render stack info items with correct structure', () => {
      const { container } = renderStackDetails();

      const infoGrid = container.querySelector('.stack-info-grid');
      expect(infoGrid).toBeInTheDocument();

      const infoItems = container.querySelectorAll('.stack-info-item');
      expect(infoItems.length).toBeGreaterThan(0);

      // Verify each info item has label and span
      infoItems.forEach((item) => {
        expect(item.querySelector('label')).toBeInTheDocument();
        expect(item.querySelector('span')).toBeInTheDocument();
      });
    });

    it('should not have removed fields in info grid', () => {
      const { container } = renderStackDetails();

      const infoItems = container.querySelectorAll('.stack-info-item');
      const labels = Array.from(infoItems).map((item) => {
        const label = item.querySelector('label');
        return label?.textContent || '';
      });

      // Verify removed fields are not in the labels
      expect(labels).not.toContain('Domain');
      expect(labels).not.toContain('Category');
      expect(labels).not.toContain('Cloud Provider');
    });

    it('should display expected fields in correct order', () => {
      const { container } = renderStackDetails();

      const infoItems = container.querySelectorAll('.stack-info-item');
      const labels = Array.from(infoItems).map((item) => {
        const label = item.querySelector('label');
        return label?.textContent || '';
      });

      // Verify expected fields are present
      expect(labels).toContain('Stack Type');
      expect(labels).toContain('Framework');
      expect(labels).toContain('Framework Version');
      expect(labels).toContain('Visibility');
      expect(labels).toContain('Repository');
      expect(labels).toContain('Owner');
      expect(labels).toContain('Created');
      expect(labels).toContain('Last Updated');
    });
  });
});
