import { useState } from 'react';
import { Modal, type ModalButton } from './Modal';
import { AngryTextBox, AngryComboBox, AngryButton, type AngryComboItem } from './input';
import type { ApiKeyType, ApiKeyCreated } from '../types/apiKey';
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

const KEY_TYPE_OPTIONS: AngryComboItem[] = [
  { text: 'User', value: 'USER' },
  { text: 'System', value: 'SYSTEM' },
];

export const ApiKeyCreateModal = ({ isOpen, onClose, onSuccess, user, mode = 'personal' }: ApiKeyCreateModalProps) => {
  const [keyName, setKeyName] = useState('');
  const [expirationDays, setExpirationDays] = useState('90');
  const [keyType, setKeyType] = useState<ApiKeyType>('USER');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = user.roles?.includes('admin') || false;
  const isAdminMode = mode === 'admin';
  const showKeyTypeSelector = isAdminMode && isAdmin;

  const handleClose = () => {
    // Reset state
    setKeyName('');
    setExpirationDays('90');
    setKeyType('USER');
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
      // Force USER type in personal mode regardless of user selection
      const effectiveKeyType = isAdminMode ? keyType : 'USER';
      
      const payload = {
        keyName: keyName.trim(),
        expirationDays: parseInt(expirationDays, 10),
        keyType: effectiveKeyType,
      };

      let result: ApiKeyCreated;
      if (effectiveKeyType === 'SYSTEM') {
        result = await apiService.createSystemApiKey(payload, user.email);
      } else {
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
      <div className="form-field">
        <label htmlFor="keyName">Key Name *</label>
        <AngryTextBox
          id="keyName"
          value={keyName}
          onChange={setKeyName}
          placeholder="Enter a descriptive name for this API key"
          disabled={isCreating}
          autoFocus={true}
        />
        <div className="field-hint">
          Choose a name that helps you identify the purpose of this key
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="expirationDays">Expiration Period</label>
        <AngryComboBox
          id="expirationDays"
          items={EXPIRATION_OPTIONS}
          value={expirationDays}
          onChange={setExpirationDays}
          placeholder="Select expiration period"
          disabled={isCreating}
        />
        <div className="field-hint">
          The key will automatically expire after this period
        </div>
      </div>

      {showKeyTypeSelector && (
        <div className="form-field">
          <label htmlFor="keyType">Key Type</label>
          <AngryComboBox
            id="keyType"
            items={KEY_TYPE_OPTIONS}
            value={keyType}
            onChange={(value) => setKeyType(value as ApiKeyType)}
            placeholder="Select key type"
            disabled={isCreating}
          />
          <div className="field-hint">
            {keyType === 'USER'
              ? 'User keys are tied to your account'
              : 'System keys persist independently of any user account'}
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );

  const renderCreatedKey = () => (
    <div className="api-key-created">
      <div className="success-icon">✓</div>
      <h3>API Key Created Successfully</h3>
      
      <div className="warning-box">
        <div className="warning-icon">⚠</div>
        <div className="warning-content">
          <strong>Important: Save this key now!</strong>
          <p>
            This is the only time you'll see the full API key. 
            Copy it to a secure location before closing this dialog.
          </p>
        </div>
      </div>

      <div className="key-display">
        <div className="key-label">Your API Key:</div>
        <div className="key-value">
          <code>{createdKey?.apiKey}</code>
        </div>
        <AngryButton
          onClick={handleCopyKey}
          cssClass="e-primary copy-button"
          iconCss={copied ? 'e-icons e-check' : 'e-icons e-copy'}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </AngryButton>
      </div>

      <div className="key-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Name:</span>
          <span className="metadata-value">{createdKey?.keyName}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Type:</span>
          <span className="metadata-value">{createdKey?.keyType}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Expires:</span>
          <span className="metadata-value">
            {createdKey?.expiresAt
              ? new Date(createdKey.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Never'}
          </span>
        </div>
      </div>
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
