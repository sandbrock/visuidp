import { useState, useEffect } from 'react';
import type { Stack } from '../types/stack';
import type { User } from '../types/auth';
import { getStackTypeDisplayName } from '../types/stack';
import { apiService } from '../services/api';
import type { StackCollection } from '../services/api';
import { Loading } from './Loading';
import { Tabs } from './Tabs';
import { AngryButton } from './input';
import './StackList.css';

interface StackListProps {
  onStackSelect: (stack: Stack) => void;
  onCreateNew: () => void;
  user: User;
}

export const StackList = ({ onStackSelect, onCreateNew, user }: StackListProps) => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [collections, setCollections] = useState<StackCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionStacks, setCollectionStacks] = useState<Record<string, Stack[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'collection'>(
    (localStorage.getItem('stackListTab') as 'all' | 'collection') || 'all'
  );

  useEffect(() => {
    const fetchStacks = async () => {
      try {
        setLoading(true);
        if (activeTab === 'all') {
          const stacksData = await apiService.getStacks(user.email);
          setStacks(stacksData);
        } else if (activeTab === 'collection') {
          const cols = await apiService.getCollections(user.email);
          setCollections(cols);
        }
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
  }, [user.email, activeTab]);

  useEffect(() => {
    localStorage.setItem('stackListTab', activeTab);
  }, [activeTab]);

  const handleSelectCollection = async (id: string) => {
    setSelectedCollection(id);
    if (!collectionStacks[id]) {
      try {
        const stacks = await apiService.getCollectionStacks(id, user.email);
        setCollectionStacks(prev => ({ ...prev, [id]: stacks }));
      } catch (e) {
        console.error('Failed to load collection stacks', e);
      }
    }
  };

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
      <div className="stack-list">
        <div className="stack-list-header">
          <h2>Your Stacks</h2>
          <AngryButton
            cssClass="e-primary create-stack-btn"
            onClick={onCreateNew}
          >
            Create New Stack
          </AngryButton>
        </div>
        <div className="error-message">
          <h3>Unable to load stacks</h3>
          <p>{error}</p>
          <div className="error-actions">
            <AngryButton
              cssClass="e-outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </AngryButton>
            <AngryButton
              cssClass="e-primary create-stack-btn"
              onClick={onCreateNew}
            >
              Create New Stack
            </AngryButton>
          </div>
        </div>
      </div>
    );
  }

  const renderAllStacksTab = () => {
    if (stacks.length === 0) {
      return (
        <div className="empty-state">
          <h3>No stacks yet</h3>
          <p>Create your first stack to get started with the IDP Portal.</p>
          <AngryButton
            cssClass="e-primary create-stack-btn"
            onClick={onCreateNew}
            isPrimary={true}
          >
            Create Your First Stack
          </AngryButton>
        </div>
      );
    }
    
    return (
      <div className="stack-grid">
        {stacks.map((stack) => (
          <div
            key={stack.id}
            className="stack-card"
            onClick={() => onStackSelect(stack)}
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
    );
  };



  const renderCollectionTab = () => {
    if (collections.length === 0) {
      return (
        <div className="empty-state">
          <h3>No collections available</h3>
          <p>Create a collection to organize your stacks by groups.</p>
          <AngryButton
            cssClass="e-primary create-stack-btn"
            onClick={onCreateNew}
            isPrimary={true}
          >
            Create New Stack
          </AngryButton>
        </div>
      );
    }
    
    return (
      <div className="collections">
        <div className="collection-list">
          {collections.map(col => (
            <AngryButton
              key={col.id}
              cssClass={selectedCollection === col.id ? 'e-primary collection-btn' : 'e-outline collection-btn'}
              onClick={() => handleSelectCollection(col.id)}
            >
              {col.name}
            </AngryButton>
          ))}
        </div>
        {selectedCollection ? (
          (collectionStacks[selectedCollection] || []).length === 0 ? (
            <div className="empty-state">
              <h3>No stacks in this collection</h3>
              <p>Add stacks to this collection to see them here.</p>
              <AngryButton
                cssClass="e-primary create-stack-btn"
                onClick={onCreateNew}
                isPrimary={true}
              >
                Create New Stack
              </AngryButton>
            </div>
          ) : (
            <div className="stack-grid">
              {(collectionStacks[selectedCollection] || []).map((stack) => (
                <div
                  key={stack.id}
                  className="stack-card"
                  onClick={() => onStackSelect(stack)}
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
          )
        ) : (
          <div className="empty-state">
            <h3>Select a collection</h3>
            <p>Choose a collection from the list above to view its stacks.</p>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { label: 'All', content: renderAllStacksTab() },
    { label: 'By Collection', content: renderCollectionTab() }
  ];

  return (
    <div className="stack-list">
      <div className="stack-list-header">
        <div className="stack-list-title-row">
          <h2>Stacks</h2>
        </div>
        <AngryButton
          cssClass="e-primary create-stack-btn"
          onClick={onCreateNew}
        >
          Create New Stack
        </AngryButton>
      </div>

      <Tabs
        tabs={tabs}
        defaultTab={activeTab === 'all' ? 0 : 1}
        onTabChange={(index) => {
          const tabNames = ['all', 'collection'] as const;
          setActiveTab(tabNames[index]);
        }}
      />

    </div>
  );
};
