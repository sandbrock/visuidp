import { useState, useEffect } from 'react';
import { Modal, type ModalButton } from './Modal';
import { AngryTextBox } from './input';
import { FormField, MetadataDisplay } from './common';
import type { ApiKeyResponse } from '../types/apiKey';
import type { User } from '../types/auth';
import { apiService } from '../services/api';
import './ApiKeyEditNameModal.css';

interface ApiKeyEditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedKey: ApiKeyResponse) => void;
  apiKey: ApiKeyResponse | null;
  user: User;
}

export const ApiKeyEditNameModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  apiKey, 
  user
}: ApiKeyEditNameModalProps) => {
  const [keyName, setKeyName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens or apiKey changes
  useEffect(() => {
    if (isOpen && apiKey) {
      setKeyName(apiKey.keyName);
      setError(null);
    }
  }, [isOpen, apiKey]);

  const handleClose = () => {
    setKeyName('');
    setError(null);
    setIsUpdating(false);
    onClose();
  };

  const handleUpdate = async () => {
    if (!apiKey) return;

    const trimmedName = keyName.trim();
    
    if (!trimmedName) {
      setError('Please enter a key name');
      return;
    }

    if (trimmedName === apiKey.keyName) {
      setError('Please enter a different name');
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const updatedKey = await apiService.updateApiKeyName(apiKey.id, trimmedName, user.email);
      onSuccess(updatedKey);
      handleClose();
    } catch (err) {
      console.error('Failed to update API key name:', err);
      setError(err instanceof Error ? err.message : 'Failed to update API key name');
    } finally {
      setIsUpdating(false);
    }
  };

  const modalButtons: ModalButton[] = [
    {
      label: 'Cancel',
      onClick: handleClose,
      variant: 'secondary',
      disabled: isUpdating,
    },
    {
      label: isUpdating ? 'Updating...' : 'Update Name',
      onClick: handleUpdate,
      variant: 'primary',
      disabled: isUpdating || !keyName.trim() || keyName.trim() === apiKey?.keyName,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit API Key Name"
      buttons={modalButtons}
      width="500px"
      showCloseIcon={true}
      closeOnBackdropClick={!isUpdating}
      closeOnEscape={!isUpdating}
      className="api-key-edit-name-modal"
    >
      <div className="api-key-edit-name-form">
        <MetadataDisplay 
          items={[
            { label: "Key Prefix", value: <code>{apiKey?.keyPrefix}...</code> },
            { label: "Type", value: <span className="type-badge">{apiKey?.keyType}</span> }
          ]}
        />

        <FormField 
          label="New Key Name" 
          htmlFor="keyName"
          required
          hint="Choose a name that helps you identify the purpose of this key"
          error={error || undefined}
        >
          <AngryTextBox
            id="keyName"
            value={keyName}
            onChange={setKeyName}
            placeholder="Enter a new descriptive name for this API key"
            disabled={isUpdating}
            autoFocus={true}
          />
        </FormField>
      </div>
    </Modal>
  );
};
