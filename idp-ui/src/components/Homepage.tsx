import { useState, useEffect } from 'react';
import type { Stack } from '../types/stack';
import type { User } from '../types/auth';
import type { Blueprint } from '../services/api';
import { apiService } from '../services/api';
import { BLUEPRINT_STORAGE_KEY } from '../auth';
import { BlueprintSelector } from './BlueprintSelector';
import { StackList } from './StackList';
import { StackForm } from './StackForm';
import { StackDetails } from './StackDetails';
import './Homepage.css';

type ViewMode = 'list' | 'create' | 'edit' | 'details';

interface HomepageProps {
  user: User;
}

export const Homepage = ({ user }: HomepageProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStack, setSelectedStack] = useState<Stack | null>(null);
  // refreshKey is used to force StackList to re-render and refetch data after operations
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [selectedBlueprintName, setSelectedBlueprintName] = useState<string | undefined>(undefined);

  // Load blueprints and restore selection from localStorage on mount
  useEffect(() => {
    const loadBlueprints = async () => {
      try {
        const data = await apiService.getBlueprints(user.email);
        setBlueprints(data);

        // Restore blueprint selection from localStorage
        const storedBlueprintId = localStorage.getItem(BLUEPRINT_STORAGE_KEY);
        if (storedBlueprintId) {
          // Validate that the stored blueprint still exists
          const blueprint = data.find(b => b.id === storedBlueprintId);
          if (blueprint) {
            setSelectedBlueprintId(storedBlueprintId);
            setSelectedBlueprintName(blueprint.name);
          } else {
            // Clear invalid stored blueprint
            localStorage.removeItem(BLUEPRINT_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading blueprints:', error);
      }
    };

    loadBlueprints();
  }, [user.email]);

  const handleBlueprintChange = (blueprintId: string | null) => {
    setSelectedBlueprintId(blueprintId);
    
    // Find and set the blueprint name
    if (blueprintId) {
      const blueprint = blueprints.find(b => b.id === blueprintId);
      setSelectedBlueprintName(blueprint?.name);
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, blueprintId);
    } else {
      setSelectedBlueprintName(undefined);
      localStorage.removeItem(BLUEPRINT_STORAGE_KEY);
    }
  };

  const handleCreateNew = () => {
    // Validate blueprint selection before allowing creation
    if (!selectedBlueprintId) {
      alert('Please select a blueprint before creating a stack.');
      return;
    }
    setSelectedStack(null);
    setViewMode('create');
  };

  const handleStackSelect = (stack: Stack) => {
    setSelectedStack(stack);
    
    // Find and set the blueprint name for the selected stack
    if (stack.blueprintId) {
      const blueprint = blueprints.find(b => b.id === stack.blueprintId);
      setSelectedBlueprintName(blueprint?.name);
    } else {
      setSelectedBlueprintName(undefined);
    }
    
    setViewMode('details');
  };

  const handleEdit = (stack: Stack) => {
    // Validate blueprint selection before allowing edit
    if (!selectedBlueprintId) {
      alert('Please select a blueprint before editing a stack.');
      return;
    }
    setSelectedStack(stack);
    setViewMode('edit');
  };

  const handleSave = (stack: Stack) => {
    setSelectedStack(stack);
    setViewMode('details');
    
    // Check if the stack was migrated to a different blueprint
    const wasMigrated = stack.blueprintId && stack.blueprintId !== selectedBlueprintId;
    
    if (wasMigrated && stack.blueprintId) {
      // Update the selected blueprint to the new one
      setSelectedBlueprintId(stack.blueprintId);
      
      // Find and set the new blueprint name
      const newBlueprint = blueprints.find(b => b.id === stack.blueprintId);
      setSelectedBlueprintName(newBlueprint?.name);
      
      // Persist the new blueprint selection
      localStorage.setItem(BLUEPRINT_STORAGE_KEY, stack.blueprintId);
    }
    
    // Always trigger refresh of stack list to reflect changes
    // This ensures the list updates whether it's an edit or migration
    setRefreshKey(prev => prev + 1);
  };

  const handleDelete = (stackId: string) => {
    console.log('Stack deleted:', stackId);
    setSelectedStack(null);
    setViewMode('list');
    // Trigger refresh of stack list to remove the deleted stack
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    if (selectedStack) {
      setViewMode('details');
    } else {
      setViewMode('list');
    }
  };

  const handleBack = () => {
    setSelectedStack(null);
    setViewMode('list');
  };

  return (
    <div className="homepage">
      {viewMode === 'list' && (
        <>
          <BlueprintSelector
            selectedBlueprintId={selectedBlueprintId}
            onBlueprintChange={handleBlueprintChange}
            user={user}
          />
          <StackList
            key={refreshKey}
            selectedBlueprintId={selectedBlueprintId}
            onStackSelect={handleStackSelect}
            onCreateNew={handleCreateNew}
            user={user}
          />
        </>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && selectedBlueprintId && (
        <StackForm
          stack={viewMode === 'edit' ? selectedStack || undefined : undefined}
          blueprintId={selectedBlueprintId}
          onSave={handleSave}
          onCancel={handleCancel}
          user={user}
        />
      )}

      {viewMode === 'details' && selectedStack && (
        <StackDetails
          stack={selectedStack}
          user={user}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBack={handleBack}
          blueprintName={selectedBlueprintName}
        />
      )}
    </div>
  );
};
