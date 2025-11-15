import { useState } from 'react';
import { Modal, type ModalButton } from './Modal';
import { AngryTextBox, AngryComboBox, AngryButton, type AngryComboItem } from './input';
import { FormField, ErrorMessage, WarningBox, SuccessMessage, MetadataDisplay } from './common';
import type { ApiKeyCreated } from '../types/apiKey';
import type { User } from '../types/auth';
import { apiService } from '../services/api';
import './ApiKeyCreateModal.css';

interface ApiKeyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdKey: ApiKeyCreated) => void;
  user: User;
  mode?: 'personal' | 'admin';
}

const EXPIRATION_OPTIONS: AngryComboItem[] = [
  { text: '30 days', value: '30' },
  { text: '60 days', value: '60' },
  { text: '90 days (Default)', value: '90' },
  { text: '180 days', value: '180' },
  { text: '365 days', value: '365' },
];

export const ApiKeyCreateModal = ({ isOpen, onClose, onSuccess, user, mode = 'personal' }: ApiKeyCreateModalProps) => {
  const [keyName, setKeyName] = useState('');
  const [expirationDays, setExpirationDays] = useState('90');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdminMode = mode === 'admin';

  const handleClose = () => {
    // Reset state
    setKeyName('');
    setExpirationDays('90');
    setIsCreating(false);
    setError(null);
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!keyName.trim()) {
      setError('Please enter a key name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        keyName: keyName.trim(),
        expirationDays: parseInt(expirationDays, 10),
      };

      let result: ApiKeyCreated;
      if (isAdminMode) {
        // Admin mode always creates SYSTEM keys
        result = await apiService.createSystemApiKey(payload, user.email);
      } else {
        // Personal mode always creates USER keys
        result = await apiService.createUserApiKey(payload, user.email);
      }

      setCreatedKey(result);
      onSuccess(result);
    } catch (err) {
      console.error('Failed to create API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (!createdKey?.apiKey) return;

    try {
      await navigator.clipboard.writeText(createdKey.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const renderCreationForm = () => (
    <div className="api-key-create-form">
      <FormField 
        label="Key Name" 
        htmlFor="keyName"
        required
        hint="Choose a name that helps you identify the purpose of this key"
        error={error && !keyName.trim() ? 'Please enter a key name' : undefined}
      >
        <AngryTextBox
          id="keyName"
          value={keyName}
          onChange={setKeyName}
          placeholder="Enter a descriptive name for this API key"
          disabled={isCreating}
          autoFocus={true}
        />
      </FormField>

      <FormField 
        label="Expiration Period" 
        htmlFor="expirationDays"
        hint="The key will automatically expire after this period"
      >
        <AngryComboBox
          id="expirationDays"
          items={EXPIRATION_OPTIONS}
          value={expirationDays}
          onChange={setExpirationDays}
          placeholder="Select expiration period"
          disabled={isCreating}
        />
      </FormField>

      {isAdminMode && (
        <WarningBox>
          <strong>Note:</strong> This will create a system-level API key that persists independently of any user account.
        </WarningBox>
      )}

      {error && keyName.trim() && <ErrorMessage message={error} />}
    </div>
  );

  const renderCreatedKey = () => (
    <div className="api-key-created">
      <SuccessMessage message="API Key Created Successfully" />
      
      <WarningBox title="Important: Save this key now!">
        This is the only time you'll see the full API key. 
        Copy it to a secure location before closing this dialog.
      </WarningBox>

      <div className="key-display">
        <div className="key-label">Your API Key:</div>
        <div className="key-value">
          <code>{createdKey?.apiKey}</code>
        </div>
        <AngryButton
          onClick={handleCopyKey}
          isPrimary={true}
          className="copy-button"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </AngryButton>
      </div>

      <MetadataDisplay 
        items={[
          { label: "Name", value: createdKey?.keyName },
          { label: "Type", value: createdKey?.keyType },
          { 
            label: "Expires", 
            value: createdKey?.expiresAt
              ? new Date(createdKey.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Never'
          }
        ]}
      />
    </div>
  );

  const modalButtons: ModalButton[] = createdKey
    ? [
        {
          label: 'Done',
          onClick: handleClose,
          variant: 'primary',
        },
      ]
    : [
        {
          label: 'Cancel',
          onClick: handleClose,
          variant: 'secondary',
        },
        {
          label: isCreating ? 'Creating...' : 'Create API Key',
          onClick: handleCreate,
          variant: 'primary',
          disabled: isCreating || !keyName.trim(),
        },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdKey ? 'API Key Created' : 'Create New API Key'}
      buttons={modalButtons}
      width="600px"
      showCloseIcon={true}
      closeOnBackdropClick={!createdKey}
      closeOnEscape={!createdKey}
      className="api-key-create-modal"
    >
      {createdKey ? renderCreatedKey() : renderCreationForm()}
    </Modal>
  );
};
