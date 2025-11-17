import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth';
import type { Blueprint } from '../services/api';
import { apiService } from '../services/api';
import { AngryComboBox, type AngryComboItem } from './input/AngryComboBox';
import { AngryButton } from './input/AngryButton';
import './BlueprintSelector.css';

interface BlueprintSelectorProps {
  selectedBlueprintId: string | null;
  onBlueprintChange: (blueprintId: string | null) => void;
  user: User;
}

export const BlueprintSelector = ({
  selectedBlueprintId,
  onBlueprintChange,
  user,
}: BlueprintSelectorProps) => {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  const fetchBlueprints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getBlueprints(user.email);
      setBlueprints(data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching blueprints:', err);
      const errorMessage = retryCount > 0 
        ? `Failed to load blueprints after ${retryCount + 1} attempt(s). Please check your connection and try again.`
        : 'Failed to load blueprints. Please try again.';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  // Validate selected blueprint when blueprints list changes
  useEffect(() => {
    if (selectedBlueprintId && blueprints.length > 0) {
      const blueprintExists = blueprints.some(b => b.id === selectedBlueprintId);
      if (!blueprintExists) {
        // Handle invalid stored blueprint ID or blueprint deleted during session
        console.warn('Selected blueprint no longer exists:', selectedBlueprintId);
        onBlueprintChange(null);
        setError('The selected blueprint no longer exists. Please select another blueprint.');
      }
    }
  }, [blueprints, selectedBlueprintId, onBlueprintChange]);

  const handleBlueprintSelect = (value: string) => {
    onBlueprintChange(value || null);
  };

  const handleCreateBlueprint = () => {
    navigate('/infrastructure');
  };

  const handleEditBlueprint = () => {
    if (selectedBlueprintId) {
      navigate('/infrastructure');
    }
  };

  const handleDeleteBlueprint = async () => {
    if (!selectedBlueprintId) return;

    const selectedBlueprint = blueprints.find(b => b.id === selectedBlueprintId);
    if (!selectedBlueprint) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the blueprint "${selectedBlueprint.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await apiService.deleteBlueprint(selectedBlueprintId, user.email);
      onBlueprintChange(null);
      await fetchBlueprints();
    } catch (err) {
      console.error('Error deleting blueprint:', err);
      alert('Failed to delete blueprint. Please try again.');
    }
  };

  const blueprintItems: AngryComboItem[] = blueprints.map(blueprint => ({
    text: blueprint.name,
    value: blueprint.id,
  }));

  if (loading) {
    return (
      <div className="blueprint-selector" role="region" aria-label="Blueprint selector">
        <div className="blueprint-selector-loading" role="status" aria-live="polite">
          <span>Loading blueprints...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blueprint-selector" role="region" aria-label="Blueprint selector">
        <div className="blueprint-selector-error" role="alert" aria-live="assertive">
          <div className="blueprint-selector-error-content">
            <span className="blueprint-selector-error-message">{error}</span>
            <div className="blueprint-selector-error-actions">
              <AngryButton 
                onClick={fetchBlueprints} 
                size="small" 
                variant="primary"
                aria-label="Retry loading blueprints"
              >
                Retry
              </AngryButton>
              {retryCount > 2 && (
                <AngryButton 
                  onClick={handleCreateBlueprint} 
                  size="small" 
                  variant="secondary"
                  aria-label="Navigate to Infrastructure page to create a blueprint"
                >
                  Go to Infrastructure
                </AngryButton>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle no blueprints available scenario
  if (blueprints.length === 0) {
    return (
      <div className="blueprint-selector" role="region" aria-label="Blueprint selector">
        <div className="blueprint-selector-empty" role="status" aria-live="polite">
          <div className="blueprint-selector-empty-content">
            <h3>No blueprints available</h3>
            <p>Create a blueprint in the Infrastructure page first to start managing stacks.</p>
            <AngryButton
              onClick={handleCreateBlueprint}
              variant="primary"
              size="normal"
              data-testid="create-first-blueprint-btn"
              aria-label="Create your first blueprint in the Infrastructure page"
            >
              Create Your First Blueprint
            </AngryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blueprint-selector" role="region" aria-label="Blueprint selector">
      <div className="blueprint-selector-content">
        <div className="blueprint-selector-dropdown">
          <label htmlFor="blueprint-select" className="blueprint-selector-label">
            Select Blueprint:
          </label>
          <AngryComboBox
            id="blueprint-select"
            items={blueprintItems}
            value={selectedBlueprintId || ''}
            onChange={handleBlueprintSelect}
            placeholder="Choose a blueprint..."
            disabled={blueprints.length === 0}
            aria-label="Select a blueprint to view its stacks"
            aria-required="true"
          />
        </div>
        <div className="blueprint-selector-actions" role="group" aria-label="Blueprint actions">
          <AngryButton
            onClick={handleCreateBlueprint}
            variant="primary"
            size="small"
            data-testid="create-blueprint-btn"
            aria-label="Create a new blueprint"
          >
            New Blueprint
          </AngryButton>
          <AngryButton
            onClick={handleEditBlueprint}
            variant="secondary"
            size="small"
            disabled={!selectedBlueprintId}
            data-testid="edit-blueprint-btn"
            aria-label={selectedBlueprintId ? "Edit the selected blueprint" : "Select a blueprint to edit"}
            aria-disabled={!selectedBlueprintId}
          >
            Edit Blueprint
          </AngryButton>
          <AngryButton
            onClick={handleDeleteBlueprint}
            variant="danger"
            size="small"
            disabled={!selectedBlueprintId}
            data-testid="delete-blueprint-btn"
            aria-label={selectedBlueprintId ? "Delete the selected blueprint" : "Select a blueprint to delete"}
            aria-disabled={!selectedBlueprintId}
          >
            Delete Blueprint
          </AngryButton>
        </div>
      </div>
    </div>
  );
};
