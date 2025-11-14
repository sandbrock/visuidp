import { useState } from 'react';
import { Modal, type ModalButton } from './Modal';
import { AngryButton } from './input';
import type { ApiKeyResponse, ApiKeyCreated } from '../types/apiKey';
import type { User } from '../types/auth';
import { apiService } from '../services/api';
import './ApiKeyRotateModal.css';

interface ApiKeyRotateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rotatedKey: ApiKeyCreated) => void;
  apiKey: ApiKeyResponse | null;
  user: User;
}

export const ApiKeyRotateModal = ({ isOpen, onClose, onSuccess, apiKey, user }: ApiKeyRotateModalProps) => {
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotatedKey, setRotatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    // Reset state
    setIsRotating(false);
    setError(null);
    setRotatedKey(null);
    setCopied(false);
    onClose();
  };

  const handleRotate = async () => {
    if (!apiKey) return;

    setIsRotating(true);
    setError(null);

    try {
      const result = await apiService.rotateApiKey(apiKey.id, user.email);
      setRotatedKey(result);
      onSuccess(result);
    } catch (err) {
      console.error('Failed to rotate API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopyKey = async () => {
    if (!rotatedKey?.apiKey) return;

    try {
      await navigator.clipboard.writeText(rotatedKey.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const renderConfirmation = () => (
    <div className="api-key-rotate-confirmation">
      <div className="info-icon">ℹ</div>
      <div className="confirmation-content">
        <p>
          You are about to rotate the API key <strong>"{apiKey?.keyName}"</strong>.
        </p>
        <div className="grace-period-info">
          <h4>Grace Period</h4>
          <p>
            After rotation, both the old and new keys will remain active for a <strong>24-hour grace period</strong>.
            This allows you to update your applications without service interruption.
          </p>
          <p>
            After 24 hours, the old key will be automatically revoked and only the new key will work.
          </p>
        </div>
        <div className="warning-box">
          <div className="warning-icon">⚠</div>
          <div className="warning-text">
            <strong>Important:</strong> The new API key will be shown only once. 
            Make sure to copy it to a secure location.
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );

  const renderRotatedKey = () => (
    <div className="api-key-rotated">
      <div className="success-icon">✓</div>
      <h3>API Key Rotated Successfully</h3>
      
      <div className="warning-box">
        <div className="warning-icon">⚠</div>
        <div className="warning-content">
          <strong>Important: Save this key now!</strong>
          <p>
            This is the only time you'll see the new API key. 
            Copy it to a secure location before closing this dialog.
          </p>
        </div>
      </div>

      <div className="key-display">
        <div className="key-label">Your New API Key:</div>
        <div className="key-value">
          <code>{rotatedKey?.apiKey}</code>
        </div>
        <AngryButton
          onClick={handleCopyKey}
          isPrimary={true}
          className="copy-button"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </AngryButton>
      </div>

      <div className="grace-period-reminder">
        <div className="reminder-icon">🕐</div>
        <div className="reminder-text">
          <strong>Grace Period Active</strong>
          <p>
            Both your old and new keys will work for the next 24 hours. 
            Update your applications with the new key before the grace period ends.
          </p>
        </div>
      </div>

      <div className="key-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Name:</span>
          <span className="metadata-value">{rotatedKey?.keyName}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Type:</span>
          <span className="metadata-value">{rotatedKey?.keyType}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Expires:</span>
          <span className="metadata-value">
            {rotatedKey?.expiresAt
              ? new Date(rotatedKey.expiresAt).toLocaleDateString('en-US', {
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

  const modalButtons: ModalButton[] = rotatedKey
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
          label: isRotating ? 'Rotating...' : 'Rotate API Key',
          onClick: handleRotate,
          variant: 'warning',
          disabled: isRotating,
        },
      ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={rotatedKey ? 'API Key Rotated' : 'Rotate API Key'}
      buttons={modalButtons}
      width="600px"
      showCloseIcon={true}
      closeOnBackdropClick={true}
      closeOnEscape={true}
      className="api-key-rotate-modal"
    >
      {rotatedKey ? renderRotatedKey() : renderConfirmation()}
    </Modal>
  );
};
