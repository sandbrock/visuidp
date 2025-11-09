import { useState } from 'react';
import type { Stack } from '../types/stack';
import type { User } from '../types/auth';
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
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setSelectedStack(null);
    setViewMode('create');
  };

  const handleStackSelect = (stack: Stack) => {
    setSelectedStack(stack);
    setViewMode('details');
  };

  const handleEdit = (stack: Stack) => {
    setSelectedStack(stack);
    setViewMode('edit');
  };

  const handleSave = (stack: Stack) => {
    setSelectedStack(stack);
    setViewMode('details');
    // Trigger refresh of stack list
    setRefreshKey(prev => prev + 1);
  };

  const handleDelete = () => {
    setSelectedStack(null);
    setViewMode('list');
    // Trigger refresh of stack list
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
        <StackList
          key={refreshKey}
          onStackSelect={handleStackSelect}
          onCreateNew={handleCreateNew}
          user={user}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <StackForm
          stack={viewMode === 'edit' ? selectedStack || undefined : undefined}
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
        />
      )}
    </div>
  );
};
