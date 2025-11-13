import { useState } from 'react';
import type { Stack } from '../types/stack';
import type { User } from '../types/auth';
import { 
  getStackTypeDisplayName, 
  getProgrammingLanguageDisplayName 
} from '../types/stack';
import { apiService } from '../services/api';
import { AngryButton } from './input';
import { Modal } from './Modal';
import './StackDetails.css';

interface StackDetailsProps {
  stack: Stack;
  user: User;
  onEdit: (stack: Stack) => void;
  onDelete: (stackId: string) => void;
  onBack: () => void;
}

export const StackDetails = ({ stack, user, onEdit, onDelete, onBack }: StackDetailsProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiService.deleteStack(stack.id, user.email);
      onDelete(stack.id);
    } catch (error) {
      console.error('Failed to delete stack:', error);
      alert('Failed to delete stack. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="stack-details">
      <div className="stack-details-header">
        <AngryButton
          cssClass="e-outline back-button"
          onClick={onBack}
        >
          ← Back to Stacks
        </AngryButton>
        <div className="stack-actions">
          <AngryButton
            cssClass="e-primary edit-button"
            onClick={() => onEdit(stack)}
          >
            Edit Stack
          </AngryButton>
          <AngryButton
            cssClass="e-danger delete-button"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Stack
          </AngryButton>
        </div>
      </div>

      <div className="stack-details-content">
        <div className="stack-header">
          <h1>{stack.name}</h1>
        </div>

        {stack.description && (
          <div className="stack-section">
            <h3>Description</h3>
            <p>{stack.description}</p>
          </div>
        )}

        <div className="stack-info-grid">
          <div className="stack-info-item">
            <label>Stack Type</label>
            <span>{getStackTypeDisplayName(stack.stackType)}</span>
          </div>

          {/* Environment removed */}

          {stack.programmingLanguage && (
            <div className="stack-info-item">
              <label>Framework</label>
              <span>{getProgrammingLanguageDisplayName(stack.programmingLanguage)}</span>
            </div>
          )}

          {stack.frameworkVersion && (
            <div className="stack-info-item">
              <label>Framework Version</label>
              <span>{stack.frameworkVersion}</span>
            </div>
          )}

          <div className="stack-info-item">
            <label>Visibility</label>
            <span>{stack.isPublic ? 'Public' : 'Private'}</span>
          </div>

          {stack.repositoryURL && (
            <div className="stack-info-item">
              <label>Repository</label>
              <span>
                <a href={stack.repositoryURL} target="_blank" rel="noopener noreferrer">
                  {stack.repositoryURL}
                </a>
              </span>
            </div>
          )}

          <div className="stack-info-item">
            <label>Owner</label>
            <span>{stack.createdBy}</span>
          </div>

          <div className="stack-info-item">
            <label>Created</label>
            <span>{formatDate(stack.createdAt)}</span>
          </div>

          <div className="stack-info-item">
            <label>Last Updated</label>
            <span>{formatDate(stack.updatedAt)}</span>
          </div>
        </div>

        {stack.configuration && Object.keys(stack.configuration).length > 0 && (
          <div className="stack-section">
            <h3>Configuration</h3>
            <pre className="configuration-display">
              {JSON.stringify(stack.configuration, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <Modal
        width="400px"
        isOpen={showDeleteConfirm}
        title="Delete Stack"
        showCloseIcon={false}
        onClose={() => setShowDeleteConfirm(false)}
        buttons={[
          {
            label: 'Cancel',
            onClick: () => setShowDeleteConfirm(false),
            variant: 'secondary',
            disabled: deleting
          },
          {
            label: deleting ? 'Deleting...' : 'Delete Stack',
            onClick: handleDelete,
            variant: 'danger',
            disabled: deleting
          }
        ]}
      >
        <p>
          Are you sure you want to delete <strong>{stack.name}</strong>? 
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
