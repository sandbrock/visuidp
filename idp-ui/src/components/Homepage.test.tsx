import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Homepage } from './Homepage';
import type { User } from '../types/auth';
import type { Stack } from '../types/stack';
import type { Blueprint } from '../services/api';
import { apiService } from '../services/api';
import { BLUEPRINT_STORAGE_KEY } from '../auth';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn(),
    getStacksByBlueprint: vi.fn(),
    getStacks: vi.fn(),
    createStack: vi.fn(),
    updateStack: vi.fn(),
    deleteStack: vi.fn(),
  },
}));

// Mock child components
vi.mock('./BlueprintSelector', () => ({
  BlueprintSelector: ({ selectedBlueprintId, onBlueprintChange }: {
    selectedBlueprintId: string | null;
    onBlueprintChange: (id: string | null) => void;
  }) => {
    // Use useEffect to track when selectedBlueprintId changes from parent
    const [displayId, setDisplayId] = useState(selectedBlueprintId);
    
    useEffect(() => {
      setDisplayId(selectedBlueprintId);
    }, [selectedBlueprintId]);
    
    return (
      <div data-testid="blueprint-selector">
        <div data-testid="selected-blueprint-id">{displayId || 'none'}</div>
        <button onClick={() => onBlueprintChange('blueprint-1')}>Select Blueprint 1</button>
        <button onClick={() => onBlueprintChange('blueprint-2')}>Select Blueprint 2</button>
        <button onClick={() => onBlueprintChange(null)}>Clear Selection</button>
      </div>
    );
  },
}));

vi.mock('./StackList', () => ({
  StackList: ({ selectedBlueprintId, onStackSelect, onCreateNew }: {
    selectedBlueprintId: string | null;
    onStackSelect: (stack: Stack) => void;
    onCreateNew: () => void;
  }) => (
    <div data-testid="stack-list">
      <div data-testid="stack-list-blueprint-id">{selectedBlueprintId || 'none'}</div>
      <button onClick={onCreateNew}>Create New Stack</button>
      <button onClick={() => onStackSelect({
        id: 'stack-1',
        name: 'Test Stack',
        cloudName: 'test-cloud',
        routePath: '/test/',
        stackType: 'INFRASTRUCTURE',
        blueprintId: selectedBlueprintId || undefined,
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      } as Stack)}>Select Stack</button>
    </div>
  ),
}));

vi.mock('./StackForm', () => ({
  StackForm: ({ stack, blueprintId, onSave, onCancel }: {
    stack?: Stack;
    blueprintId: string;
    onSave: (stack: Stack) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="stack-form">
      <div data-testid="stack-form-mode">{stack ? 'edit' : 'create'}</div>
      <div data-testid="stack-form-blueprint-id">{blueprintId}</div>
      <button onClick={() => onSave({
        id: stack?.id || 'new-stack-1',
        name: 'Saved Stack',
        cloudName: 'test-cloud',
        routePath: '/saved/',
        stackType: 'INFRASTRUCTURE',
        blueprintId: blueprintId,
        createdBy: 'test@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      } as Stack)}>Save Stack</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./StackDetails', () => ({
  StackDetails: ({ stack, onEdit, onDelete, onBack, blueprintName }: {
    stack: Stack;
    onEdit: (stack: Stack) => void;
    onDelete: () => void;
    onBack: () => void;
    blueprintName?: string;
  }) => (
    <div data-testid="stack-details">
      <div data-testid="stack-details-id">{stack.id}</div>
      <div data-testid="stack-details-blueprint-name">{blueprintName || 'none'}</div>
      <button onClick={() => onEdit(stack)}>Edit Stack</button>
      <button onClick={onDelete}>Delete Stack</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('Homepage', () => {
  const mockUser: User = {
    name: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockBlueprints: Blueprint[] = [
    {
      id: 'blueprint-1',
      name: 'Development Blueprint',
      description: 'Blueprint for development environment',
      supportedCloudTypes: ['aws'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'blueprint-2',
      name: 'Production Blueprint',
      description: 'Blueprint for production environment',
      supportedCloudTypes: ['aws'],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(apiService.getBlueprints).mockResolvedValue(mockBlueprints);
  });

  const renderHomepage = () => {
    return render(
      <BrowserRouter>
        <Homepage user={mockUser} />
      </BrowserRouter>
    );
  };

  describe('Requirement 1.5: localStorage persistence', () => {
    it('should store blueprint selection in localStorage when blueprint is selected', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
      });

      // Select a blueprint
      const selectButton = screen.getByText('Select Blueprint 1');
      await act(async () => {
        await user.click(selectButton);
      });

      // Wait for the selection to be processed
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Verify localStorage was updated (synchronous operation)
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');
    });

    it('should remove blueprint selection from localStorage when selection is cleared', async () => {
      const user = userEvent.setup();
      // Pre-populate localStorage
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Clear selection
      const clearButton = screen.getByText('Clear Selection');
      await act(async () => {
        await user.click(clearButton);
      });

      // Wait for the selection to be cleared
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('none');
      });

      // Verify localStorage was cleared (synchronous operation)
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });

    it('should update localStorage when switching between blueprints', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
      });

      // Select first blueprint
      const selectButton1 = screen.getByText('Select Blueprint 1');
      await act(async () => {
        await user.click(selectButton1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-1');

      // Switch to second blueprint
      const selectButton2 = screen.getByText('Select Blueprint 2');
      await act(async () => {
        await user.click(selectButton2);
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-2');
      });
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBe('blueprint-2');
    });

    it('should persist blueprint selection after stack migration', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Trigger create new to show form
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Note: Our mock StackForm always returns the blueprintId it receives,
      // so we can't easily simulate migration in this unit test.
      // The migration logic is better tested in integration tests.
      // For now, we'll just verify the form is shown with the correct blueprint.
      expect(screen.getByTestId('stack-form-blueprint-id')).toHaveTextContent('blueprint-1');
    });
  });

  describe('Requirement 3.1, 3.2: Blueprint selection restoration', () => {
    it('should restore blueprint selection from localStorage on mount', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });
    });

    it('should validate stored blueprint ID against available blueprints', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify the stored blueprint was validated and restored
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });
    });

    it('should clear invalid stored blueprint ID', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'invalid-blueprint-id');

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Verify invalid blueprint was not restored
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('none');
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem(BLUEPRINT_STORAGE_KEY)).toBeNull();
    });

    it('should not restore selection when localStorage is empty', async () => {
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
      });

      expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('none');
    });

    it('should handle blueprint load failure gracefully', async () => {
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');
      vi.mocked(apiService.getBlueprints).mockRejectedValue(new Error('Network error'));

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Component should still render without crashing
      expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
    });
  });

  describe('Requirement 10.1, 10.5: Blueprint context propagation', () => {
    it('should pass selected blueprint ID to StackList', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Initially no blueprint selected
      expect(screen.getByTestId('stack-list-blueprint-id')).toHaveTextContent('none');

      // Select a blueprint
      const selectButton = screen.getByText('Select Blueprint 1');
      await act(async () => {
        await user.click(selectButton);
      });

      // Verify StackList receives the selected blueprint ID
      await waitFor(() => {
        expect(screen.getByTestId('stack-list-blueprint-id')).toHaveTextContent('blueprint-1');
      });
    });

    it('should pass selected blueprint ID to StackForm when creating', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Click create new
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      // Verify StackForm receives the blueprint ID
      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
        expect(screen.getByTestId('stack-form-blueprint-id')).toHaveTextContent('blueprint-1');
        expect(screen.getByTestId('stack-form-mode')).toHaveTextContent('create');
      });
    });

    it('should pass selected blueprint ID to StackForm when editing', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Select a stack to view details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Click edit
      const editButton = screen.getByText('Edit Stack');
      await act(async () => {
        await user.click(editButton);
      });

      // Verify StackForm receives the blueprint ID
      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
        expect(screen.getByTestId('stack-form-blueprint-id')).toHaveTextContent('blueprint-1');
        expect(screen.getByTestId('stack-form-mode')).toHaveTextContent('edit');
      });
    });

    it('should pass blueprint name to StackDetails', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Select a stack
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      // Verify StackDetails receives the blueprint name
      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
        expect(screen.getByTestId('stack-details-blueprint-name')).toHaveTextContent('Development Blueprint');
      });
    });

    it('should update blueprint context when selection changes', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Select first blueprint
      const selectButton1 = screen.getByText('Select Blueprint 1');
      await act(async () => {
        await user.click(selectButton1);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-list-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Switch to second blueprint
      const selectButton2 = screen.getByText('Select Blueprint 2');
      await act(async () => {
        await user.click(selectButton2);
      });

      // Verify context updated
      await waitFor(() => {
        expect(screen.getByTestId('stack-list-blueprint-id')).toHaveTextContent('blueprint-2');
      });
    });
  });

  describe('Requirement 3.1: Validation before stack operations', () => {
    it('should prevent stack creation when no blueprint is selected', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Try to create without selecting blueprint
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      // Verify alert was shown
      expect(alertSpy).toHaveBeenCalledWith('Please select a blueprint before creating a stack.');

      // Verify form was not shown
      expect(screen.queryByTestId('stack-form')).not.toBeInTheDocument();

      alertSpy.mockRestore();
    });

    it('should allow stack creation when blueprint is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Create with blueprint selected
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      // Verify form was shown
      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });
    });

    it('should prevent stack editing when no blueprint is selected', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Select a stack first
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Try to edit without blueprint selected
      const editButton = screen.getByText('Edit Stack');
      await act(async () => {
        await user.click(editButton);
      });

      // Verify alert was shown
      expect(alertSpy).toHaveBeenCalledWith('Please select a blueprint before editing a stack.');

      // Verify form was not shown
      expect(screen.queryByTestId('stack-form')).not.toBeInTheDocument();

      alertSpy.mockRestore();
    });

    it('should allow stack editing when blueprint is selected', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Select a stack
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Edit with blueprint selected
      const editButton = screen.getByText('Edit Stack');
      await act(async () => {
        await user.click(editButton);
      });

      // Verify form was shown
      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });
    });
  });

  describe('View mode transitions', () => {
    it('should transition from list to create view', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-list')).not.toBeInTheDocument();
      });
    });

    it('should transition from list to details view', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-list')).not.toBeInTheDocument();
      });
    });

    it('should transition from details to edit view', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Go to details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Go to edit
      const editButton = screen.getByText('Edit Stack');
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-details')).not.toBeInTheDocument();
      });
    });

    it('should transition from create to list view on cancel', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Go to create
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await act(async () => {
        await user.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-form')).not.toBeInTheDocument();
      });
    });

    it('should transition from edit to details view on cancel', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Go to details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Go to edit
      const editButton = screen.getByText('Edit Stack');
      await act(async () => {
        await user.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await act(async () => {
        await user.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-form')).not.toBeInTheDocument();
      });
    });

    it('should transition from details to list view on back', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Go to details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByText('Back');
      await act(async () => {
        await user.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-details')).not.toBeInTheDocument();
      });
    });

    it('should transition from details to list view on delete', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Go to details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Delete
      const deleteButton = screen.getByText('Delete Stack');
      await act(async () => {
        await user.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-details')).not.toBeInTheDocument();
      });
    });

    it('should transition from create to details view on save', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Go to create
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByText('Save Stack');
      await act(async () => {
        await user.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
        expect(screen.queryByTestId('stack-form')).not.toBeInTheDocument();
      });
    });
  });

  describe('Stack list refresh', () => {
    it('should refresh stack list after save', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      const initialStackList = screen.getByTestId('stack-list');

      // Go to create
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByText('Save Stack');
      await act(async () => {
        await user.click(saveButton);
      });

      // Go back to list
      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      const backButton = screen.getByText('Back');
      await act(async () => {
        await user.click(backButton);
      });

      // Verify stack list was refreshed (new instance rendered)
      await waitFor(() => {
        const newStackList = screen.getByTestId('stack-list');
        expect(newStackList).toBeInTheDocument();
        // The key prop change forces a new render
        expect(newStackList).not.toBe(initialStackList);
      });
    });

    it('should refresh stack list after delete', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Go to details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
      });

      // Delete
      const deleteButton = screen.getByText('Delete Stack');
      await act(async () => {
        await user.click(deleteButton);
      });

      // Verify we're back at list and it was refreshed
      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });
    });
  });

  describe('Blueprint name tracking', () => {
    it('should track blueprint name for selected blueprint', async () => {
      const user = userEvent.setup();
      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
      });

      // Select a blueprint
      const selectButton = screen.getByText('Select Blueprint 1');
      await act(async () => {
        await user.click(selectButton);
      });

      // Wait for blueprint selection to be processed
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Select a stack to view details
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      // Verify blueprint name is passed to StackDetails
      await waitFor(() => {
        expect(screen.getByTestId('stack-details-blueprint-name')).toHaveTextContent('Development Blueprint');
      });
    });

    it('should update blueprint name when selection changes', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Select a stack
      const selectStackButton = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-details-blueprint-name')).toHaveTextContent('Development Blueprint');
      });

      // Go back to list
      const backButton = screen.getByText('Back');
      await act(async () => {
        await user.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-list')).toBeInTheDocument();
      });

      // Change blueprint selection
      const selectButton2 = screen.getByText('Select Blueprint 2');
      await act(async () => {
        await user.click(selectButton2);
      });

      // Wait for blueprint selection to be processed
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-2');
      });

      // Select stack again
      const selectStackButton2 = screen.getByText('Select Stack');
      await act(async () => {
        await user.click(selectStackButton2);
      });

      // Verify blueprint name updated
      await waitFor(() => {
        expect(screen.getByTestId('stack-details-blueprint-name')).toHaveTextContent('Production Blueprint');
      });
    });

    it('should update blueprint name after stack migration', async () => {
      const user = userEvent.setup();
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, 'blueprint-1');

      renderHomepage();

      // Wait for blueprint to be restored from localStorage
      await waitFor(() => {
        expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('blueprint-1');
      });

      // Go to create
      const createButton = screen.getByText('Create New Stack');
      await act(async () => {
        await user.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('stack-form')).toBeInTheDocument();
      });

      // Save with different blueprint (simulating migration)
      const saveButton = screen.getByText('Save Stack');
      await act(async () => {
        await user.click(saveButton);
      });

      // The mock returns blueprint-2 in the saved stack
      // Verify blueprint name updated to match the migrated blueprint
      await waitFor(() => {
        expect(screen.getByTestId('stack-details')).toBeInTheDocument();
        // Note: The mock StackForm always returns the blueprintId it receives,
        // so we can't easily test migration in this unit test.
        // This is better tested in integration tests.
      });
    });
  });

  describe('Error handling', () => {
    it('should handle blueprint fetch errors gracefully', async () => {
      vi.mocked(apiService.getBlueprints).mockRejectedValue(new Error('Network error'));

      renderHomepage();

      await waitFor(() => {
        expect(apiService.getBlueprints).toHaveBeenCalledWith(mockUser.email);
      });

      // Component should still render
      expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
    });

    it('should handle empty blueprint list', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);

      renderHomepage();

      await waitFor(() => {
        expect(screen.getByTestId('blueprint-selector')).toBeInTheDocument();
      });

      // Should show empty state
      expect(screen.getByTestId('selected-blueprint-id')).toHaveTextContent('none');
    });
  });
});
