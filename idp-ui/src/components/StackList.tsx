import { useState, useEffect } from 'react';
import type { Stack } from '../types/stack';
import type { User } from '../types/auth';
import { getStackTypeDisplayName } from '../types/stack';
import { apiService } from '../services/api';
import { Loading } from './Loading';
import { AngryButton } from './input';
import './StackList.css';

interface StackListProps {
  selectedBlueprintId: string | null;
  onStackSelect: (stack: Stack) => void;
  onCreateNew: () => void;
  user: User;
}

export const StackList = ({ selectedBlueprintId, onStackSelect, onCreateNew, user }: StackListProps) => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blueprintsExist, setBlueprintsExist] = useState<boolean>(true);

  useEffect(() => {
    const fetchStacks = async () => {
      // Don't fetch if no blueprint is selected
      if (!selectedBlueprintId) {
        setStacks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const stacksData = await apiService.getStacksByBlueprint(selectedBlueprintId, user.email);
        setStacks(stacksData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stacks:', err);
        // In development mode, show a more helpful error message
        if (import.meta.env.MODE === 'development') {
          setError('Backend API not available. Make sure the Quarkus backend is running on port 8082.');
        } else {
          setError('Failed to load stacks. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStacks();
  }, [selectedBlueprintId, user.email]);

  // Check if blueprints exist
  useEffect(() => {
    const checkBlueprints = async () => {
      try {
        const blueprints = await apiService.getBlueprints(user.email);
        setBlueprintsExist(blueprints.length > 0);
      } catch (err) {
        console.error('Failed to check blueprints:', err);
        // Assume blueprints exist if we can't check
        setBlueprintsExist(true);
      }
    };

    checkBlueprints();
  }, [user.email]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <Loading message="Loading stacks..." />;
  }

  if (error) {
    return (
      <div className="stack-list" role="region" aria-label="Stack list">
        <div className="stack-list-header">
          <h2>Stacks</h2>
          <AngryButton
            isPrimary={true}
            className="create-stack-btn"
            onClick={onCreateNew}
            disabled={!selectedBlueprintId}
            aria-label={selectedBlueprintId ? "Create a new stack in the selected blueprint" : "Create new stack - disabled because no blueprint is selected"}
            aria-disabled={!selectedBlueprintId}
          >
            Create New Stack
          </AngryButton>
        </div>
        <div className="error-message" role="alert" aria-live="assertive">
          <h3>Unable to load stacks</h3>
          <p>{error}</p>
          <div className="error-actions">
            <AngryButton
              style="outline"
              onClick={() => window.location.reload()}
              aria-label="Retry loading stacks"
            >
              Retry
            </AngryButton>
          </div>
        </div>
      </div>
    );
  }

  // Empty State 1: No blueprints available
  if (!blueprintsExist) {
    return (
      <div className="stack-list" role="region" aria-label="Stack list">
        <div className="stack-list-header">
          <h2>Stacks</h2>
          <AngryButton
            isPrimary={true}
            className="create-stack-btn"
            onClick={onCreateNew}
            disabled={true}
            aria-label="Create new stack - disabled because no blueprints are available"
            aria-disabled="true"
          >
            Create New Stack
          </AngryButton>
        </div>
        <div className="empty-state" role="status" aria-live="polite">
          <h3>No blueprints available</h3>
          <p>Create a blueprint in the Infrastructure page first.</p>
          <AngryButton
            isPrimary={true}
            onClick={() => window.location.href = '/ui/infrastructure'}
            aria-label="Navigate to Infrastructure page to create a blueprint"
          >
            Go to Infrastructure
          </AngryButton>
        </div>
      </div>
    );
  }

  // Empty State 2: No blueprint selected
  if (!selectedBlueprintId) {
    return (
      <div className="stack-list" role="region" aria-label="Stack list">
        <div className="stack-list-header">
          <h2>Stacks</h2>
          <AngryButton
            isPrimary={true}
            className="create-stack-btn"
            onClick={onCreateNew}
            disabled={true}
            aria-label="Create new stack - disabled because no blueprint is selected"
            aria-disabled="true"
          >
            Create New Stack
          </AngryButton>
        </div>
        <div className="empty-state" role="status" aria-live="polite">
          <h3>Select a blueprint to view stacks</h3>
          <p>Choose a blueprint from the selector above to see its stacks.</p>
        </div>
      </div>
    );
  }

  // Empty State 3: Blueprint selected but no stacks
  if (stacks.length === 0) {
    return (
      <div className="stack-list" role="region" aria-label="Stack list">
        <div className="stack-list-header">
          <h2>Stacks</h2>
          <AngryButton
            isPrimary={true}
            className="create-stack-btn"
            onClick={onCreateNew}
            aria-label="Create a new stack in the selected blueprint"
          >
            Create New Stack
          </AngryButton>
        </div>
        <div className="empty-state" role="status" aria-live="polite">
          <h3>No stacks in this blueprint</h3>
          <p>Create your first stack to get started.</p>
          <AngryButton
            isPrimary={true}
            className="create-stack-btn"
            onClick={onCreateNew}
            aria-label="Create your first stack in this blueprint"
          >
            Create Your First Stack
          </AngryButton>
        </div>
      </div>
    );
  }

  // Normal state: Display stacks
  return (
    <div className="stack-list" role="region" aria-label="Stack list">
      <div className="stack-list-header">
        <h2>Stacks</h2>
        <AngryButton
          isPrimary={true}
          className="create-stack-btn"
          onClick={onCreateNew}
          aria-label="Create a new stack in the selected blueprint"
        >
          Create New Stack
        </AngryButton>
      </div>

      <div className="stack-grid" role="list" aria-label={`${stacks.length} stack${stacks.length !== 1 ? 's' : ''} in this blueprint`}>
        {stacks.map((stack) => (
          <div
            key={stack.id}
            className="stack-card"
            onClick={() => onStackSelect(stack)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onStackSelect(stack);
              }
            }}
            role="listitem"
            tabIndex={0}
            aria-label={`Stack: ${stack.name}. Type: ${getStackTypeDisplayName(stack.stackType)}. Updated: ${formatDate(stack.updatedAt)}`}
          >
            <div className="stack-card-header">
              <h3>{stack.name}</h3>
            </div>
            <p className="stack-description">
              {stack.description || 'No description provided'}
            </p>
            <div className="stack-meta">
              <div className="stack-type">
                <strong>Type:</strong> {getStackTypeDisplayName(stack.stackType)}
              </div>
              <div className="stack-updated">
                <strong>Updated:</strong> {formatDate(stack.updatedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
