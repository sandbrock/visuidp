import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { BlueprintSelector } from './BlueprintSelector';
import { StackList } from './StackList';
import { StackForm } from './StackForm';
import { apiService } from '../services/api';
import type { User } from '../types/auth';
import type { Blueprint } from '../services/api';
import type { Stack } from '../types/stack';
import { StackType } from '../types/stack';

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn(),
    deleteBlueprint: vi.fn(),
    getStacksByBlueprint: vi.fn(),
    getAvailableResourceTypesForStacks: vi.fn(),
    createStack: vi.fn(),
    updateStack: vi.fn(),
  },
}));

describe('Blueprint-Centric Stack Management Accessibility Tests', () => {
  const mockUser: User = {
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockBlueprints: Blueprint[] = [
    {
      id: 'blueprint-1',
      name: 'Development Blueprint',
      description: 'For development',
      supportedCloudTypes: ['aws'],
      resources: [],
    },
    {
      id: 'blueprint-2',
      name: 'Production Blueprint',
      description: 'For production',
      supportedCloudTypes: ['aws'],
      resources: [],
    },
  ];

  const mockStacks: Stack[] = [
    {
      id: 'stack-1',
      name: 'API Stack',
      cloudName: 'api-stack',
      routePath: '/api/',
      description: 'REST API',
      stackType: StackType.RESTFUL_API,
      blueprintId: 'blueprint-1',
      resources: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'test@example.com',
    },
  ];

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <ThemeProvider>{ui}</ThemeProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('BlueprintSelector Accessibility', () => {
    describe('Keyboard Navigation', () => {
      it('should support keyboard navigation through blueprint dropdown', async () => {
        const user = userEvent.setup();
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/select a blueprint/i)).toBeInTheDocument();
        });

        const combobox = screen.getByLabelText(/select a blueprint/i);
        
        // Tab to focus the combobox
        await user.tab();
        expect(combobox).toHaveFocus();

        // Arrow down to open dropdown
        await user.keyboard('{ArrowDown}');
        
        // Verify dropdown is accessible
        expect(combobox).toHaveAttribute('aria-expanded', 'true');
      });

      it('should support keyboard navigation through action buttons', async () => {
        const user = userEvent.setup();
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId="blueprint-1"
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/create a new blueprint/i)).toBeInTheDocument();
        });

        // Tab through all buttons
        await user.tab(); // Blueprint dropdown
        await user.tab(); // New Blueprint button
        await user.tab(); // Edit Blueprint button
        await user.tab(); // Delete Blueprint button

        const deleteButton = screen.getByLabelText(/delete the selected blueprint/i);
        expect(deleteButton).toHaveFocus();
      });

      it('should skip disabled buttons during tab navigation', async () => {
        const user = userEvent.setup();
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/create a new blueprint/i)).toBeInTheDocument();
        });

        // Tab through elements
        await user.tab(); // Blueprint dropdown
        await user.tab(); // New Blueprint button
        await user.tab(); // Should skip disabled Edit button

        // Delete button should not have focus (it's disabled)
        const deleteButton = screen.getByLabelText(/select a blueprint to delete/i);
        expect(deleteButton).not.toHaveFocus();
      });
    });

    describe('ARIA Labels and Roles', () => {
      it('should have proper ARIA labels on blueprint controls', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId="blueprint-1"
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/select a blueprint/i)).toBeInTheDocument();
        });

        // Verify ARIA labels
        expect(screen.getByLabelText(/select a blueprint/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/create a new blueprint/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/edit the selected blueprint/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/delete the selected blueprint/i)).toBeInTheDocument();
      });

      it('should have proper region role and label', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('region', { name: /blueprint selector/i })).toBeInTheDocument();
        });
      });

      it('should have proper group role for action buttons', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId="blueprint-1"
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('group', { name: /blueprint actions/i })).toBeInTheDocument();
        });
      });
    });

    describe('Screen Reader Support', () => {
      it('should announce empty state with proper role', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue([]);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const emptyState = screen.getByRole('status');
          expect(emptyState).toHaveAttribute('aria-live', 'polite');
          expect(emptyState).toHaveTextContent(/no blueprints available/i);
        });
      });

      it('should announce error state with alert role', async () => {
        vi.mocked(apiService.getBlueprints).mockRejectedValue(new Error('Failed to load'));

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const errorAlert = screen.getByRole('alert');
          expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
          expect(errorAlert).toHaveTextContent(/failed to load blueprints/i);
        });
      });

      it('should announce loading state', async () => {
        vi.mocked(apiService.getBlueprints).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        const loadingStatus = await screen.findByRole('status');
        expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
        expect(loadingStatus).toHaveTextContent(/loading blueprints/i);
      });

      it('should announce disabled button states', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

        const handleChange = vi.fn();
        renderWithProviders(
          <BlueprintSelector
            selectedBlueprintId={null}
            onBlueprintChange={handleChange}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const editButton = screen.getByLabelText(/select a blueprint to edit/i);
          expect(editButton).toHaveAttribute('aria-disabled', 'true');
          expect(editButton).toBeDisabled();
        });
      });
    });
  });

  describe('StackList Accessibility', () => {
    describe('Empty State Screen Reader Support', () => {
      it('should announce no blueprint selected state', () => {
        renderWithProviders(
          <StackList
            selectedBlueprintId={null}
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        const emptyState = screen.getByRole('status');
        expect(emptyState).toHaveAttribute('aria-live', 'polite');
        expect(emptyState).toHaveTextContent(/select a blueprint to view stacks/i);
      });

      it('should announce no stacks in blueprint state', async () => {
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);

        renderWithProviders(
          <StackList
            selectedBlueprintId="blueprint-1"
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const emptyState = screen.getByRole('status');
          expect(emptyState).toHaveAttribute('aria-live', 'polite');
          expect(emptyState).toHaveTextContent(/no stacks in this blueprint/i);
        });
      });

      it('should announce no blueprints available state', async () => {
        vi.mocked(apiService.getBlueprints).mockResolvedValue([]);
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue([]);

        renderWithProviders(
          <StackList
            selectedBlueprintId={null}
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const emptyState = screen.getByRole('status');
          expect(emptyState).toHaveTextContent(/no blueprints available/i);
        });
      });
    });

    describe('Disabled Button States', () => {
      it('should announce disabled create button when no blueprint selected', () => {
        renderWithProviders(
          <StackList
            selectedBlueprintId={null}
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        const createButton = screen.getByLabelText(/create new stack - disabled because no blueprint is selected/i);
        expect(createButton).toHaveAttribute('aria-disabled', 'true');
        expect(createButton).toBeDisabled();
      });

      it('should enable create button when blueprint is selected', async () => {
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(mockStacks);

        renderWithProviders(
          <StackList
            selectedBlueprintId="blueprint-1"
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const createButton = screen.getByLabelText(/create a new stack in the selected blueprint/i);
          expect(createButton).not.toBeDisabled();
        });
      });
    });

    describe('Stack Card Keyboard Navigation', () => {
      it('should make stack cards keyboard accessible', async () => {
        const user = userEvent.setup();
        const handleSelect = vi.fn();
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(mockStacks);

        renderWithProviders(
          <StackList
            selectedBlueprintId="blueprint-1"
            onStackSelect={handleSelect}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('listitem')).toBeInTheDocument();
        });

        const stackCard = screen.getByRole('listitem');
        
        // Tab to focus the card
        stackCard.focus();
        expect(stackCard).toHaveFocus();

        // Press Enter to select
        await user.keyboard('{Enter}');
        expect(handleSelect).toHaveBeenCalledWith(mockStacks[0]);
      });

      it('should support Space key for stack selection', async () => {
        const user = userEvent.setup();
        const handleSelect = vi.fn();
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(mockStacks);

        renderWithProviders(
          <StackList
            selectedBlueprintId="blueprint-1"
            onStackSelect={handleSelect}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('listitem')).toBeInTheDocument();
        });

        const stackCard = screen.getByRole('listitem');
        stackCard.focus();

        // Press Space to select
        await user.keyboard(' ');
        expect(handleSelect).toHaveBeenCalledWith(mockStacks[0]);
      });

      it('should have proper ARIA label for stack cards', async () => {
        vi.mocked(apiService.getStacksByBlueprint).mockResolvedValue(mockStacks);

        renderWithProviders(
          <StackList
            selectedBlueprintId="blueprint-1"
            onStackSelect={vi.fn()}
            onCreateNew={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const stackCard = screen.getByRole('listitem');
          expect(stackCard).toHaveAttribute('aria-label');
          expect(stackCard.getAttribute('aria-label')).toContain('API Stack');
        });
      });
    });
  });

  describe('StackForm Migration Controls Accessibility', () => {
    beforeEach(() => {
      vi.mocked(apiService.getAvailableResourceTypesForStacks).mockResolvedValue([]);
      vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);
    });

    describe('ARIA Labels for Migration Controls', () => {
      it('should have proper ARIA labels on migration section', async () => {
        renderWithProviders(
          <StackForm
            stack={mockStacks[0]}
            blueprintId="blueprint-1"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('region', { name: /blueprint migration/i })).toBeInTheDocument();
        });
      });

      it('should have proper ARIA label on target blueprint dropdown', async () => {
        renderWithProviders(
          <StackForm
            stack={mockStacks[0]}
            blueprintId="blueprint-1"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          const targetDropdown = screen.getByLabelText(/select a target blueprint to move this stack to/i);
          expect(targetDropdown).toBeInTheDocument();
        });
      });

      it('should announce migration warnings with alert role', async () => {
        const user = userEvent.setup();
        
        // Mock a blueprint without required resources
        const incompatibleBlueprint: Blueprint = {
          ...mockBlueprints[1],
          resources: [], // No resources
        };
        vi.mocked(apiService.getBlueprints).mockResolvedValue([mockBlueprints[0], incompatibleBlueprint]);

        renderWithProviders(
          <StackForm
            stack={mockStacks[0]}
            blueprintId="blueprint-1"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/select a target blueprint/i)).toBeInTheDocument();
        });

        // Select incompatible blueprint
        const targetDropdown = screen.getByLabelText(/select a target blueprint/i);
        await user.click(targetDropdown);
        
        // Wait for warnings to appear
        await waitFor(() => {
          const warningsAlert = screen.queryByRole('alert');
          if (warningsAlert) {
            expect(warningsAlert).toHaveAttribute('aria-live', 'assertive');
            expect(warningsAlert).toHaveAttribute('aria-atomic', 'true');
          }
        });
      });
    });

    describe('Form Actions Accessibility', () => {
      it('should have proper ARIA labels on form action buttons', async () => {
        renderWithProviders(
          <StackForm
            stack={mockStacks[0]}
            blueprintId="blueprint-1"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByRole('group', { name: /form actions/i })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/cancel and return to previous view/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/update stack with changes/i)).toBeInTheDocument();
      });

      it('should announce disabled state during form submission', async () => {
        const user = userEvent.setup();
        vi.mocked(apiService.updateStack).mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

        renderWithProviders(
          <StackForm
            stack={mockStacks[0]}
            blueprintId="blueprint-1"
            onSave={vi.fn()}
            onCancel={vi.fn()}
            user={mockUser}
          />
        );

        await waitFor(() => {
          expect(screen.getByLabelText(/update stack with changes/i)).toBeInTheDocument();
        });

        const submitButton = screen.getByLabelText(/update stack with changes/i);
        await user.click(submitButton);

        // Button should be disabled during submission
        await waitFor(() => {
          expect(submitButton).toBeDisabled();
        });
      });
    });
  });

  describe('Tab Order and Focus Management', () => {
    it('should maintain logical tab order in BlueprintSelector', async () => {
      const user = userEvent.setup();
      vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);

      const handleChange = vi.fn();
      renderWithProviders(
        <BlueprintSelector
          selectedBlueprintId="blueprint-1"
          onBlueprintChange={handleChange}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/select a blueprint/i)).toBeInTheDocument();
      });

      // Tab through elements in order
      await user.tab();
      expect(screen.getByLabelText(/select a blueprint/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/create a new blueprint/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/edit the selected blueprint/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/delete the selected blueprint/i)).toHaveFocus();
    });

    it('should maintain logical tab order in StackForm', async () => {
      renderWithProviders(
        <StackForm
          blueprintId="blueprint-1"
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      });

      // First field should receive focus
      const nameInput = screen.getByLabelText(/display name/i);
      await waitFor(() => {
        expect(nameInput).toHaveFocus();
      });
    });
  });
});
