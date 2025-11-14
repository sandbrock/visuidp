import { useState } from 'react';
import { Modal } from './Modal';
import type { ApiKeyResponse } from '../types/apiKey';
import type { User } from '../types/auth';
import { apiService } from '../services/api';
import './ApiKeyRevokeModal.css';

interface ApiKeyRevokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiKey: ApiKeyResponse | null;
  user: User;
}

export const ApiKeyRevokeModal = ({ isOpen, onClose, onSuccess, apiKey, user }: ApiKeyRevokeModalProps) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    // Reset state
    setIsRevoking(false);
    setError(null);
    onClose();
  };

  const handleRevoke = async () => {
    if (!apiKey) return;

    setIsRevoking(true);
    setError(null);

    try {
      await apiService.revokeApiKey(apiKey.id, user.email);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to revoke API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
      setIsRevoking(false);
    }
  };

  const modalButtons = [
    {
      label: 'Cancel',
      onClick: handleClose,
      variant: 'secondary' as const,
    },
    {
      label: isRevoking ? 'Revoking...' : 'Revoke API Key',
      onClick: handleRevoke,
      variant: 'danger' as const,
      disabled: isRevoking,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Revoke API Key"
      buttons={modalButtons}
      width="500px"
      showCloseIcon={true}
      closeOnBackdropClick={true}
      closeOnEscape={true}
      className="api-key-revoke-modal"
    >
      <div className="api-key-revoke-confirmation">
        <div className="danger-icon">⚠</div>
        <div className="confirmation-content">
          <h3>Are you sure you want to revoke this API key?</h3>
          
          <div className="key-info">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{apiKey?.keyName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Key Prefix:</span>
              <span className="info-value">
                <code>{apiKey?.keyPrefix}...</code>
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Type:</span>
              <span className="info-value">{apiKey?.keyType}</span>
            </div>
          </div>

          <div className="warning-box">
            <div className="warning-icon">🛑</div>
            <div className="warning-text">
              <strong>This action cannot be undone!</strong>
              <ul>
                <li>The API key will be immediately invalidated</li>
                <li>Any applications using this key will lose access</li>
                <li>You will need to create a new key to restore access</li>
              </ul>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </Modal>
  );
};
