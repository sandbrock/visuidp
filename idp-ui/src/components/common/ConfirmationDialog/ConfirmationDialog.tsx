import React from 'react';
import { Modal, type ModalButton } from '../../Modal';
import './ConfirmationDialog.css';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isProcessing?: boolean;
  width?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isProcessing = false,
  width = '400px',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const handleConfirm = () => {
    if (!isProcessing) {
      onConfirm();
    }
  };

  const variantMap: Record<string, 'primary' | 'secondary' | 'danger' | 'warning' | 'success'> = {
    danger: 'danger',
    warning: 'warning',
    primary: 'primary',
  };

  const buttons: ModalButton[] = [
    {
      label: cancelText,
      onClick: onClose,
      variant: 'secondary',
      disabled: isProcessing,
      'data-testid': 'modal-button-cancel',
    },
    {
      label: confirmText,
      onClick: handleConfirm,
      variant: variantMap[variant],
      disabled: isProcessing,
      'data-testid': 'modal-button-confirm',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      buttons={buttons}
      width={width}
      closeOnBackdropClick={closeOnBackdropClick}
      closeOnEscape={closeOnEscape}
      className={`confirmation-dialog confirmation-dialog--${variant} ${
        isProcessing ? 'confirmation-dialog--processing' : ''
      }`}
    >
      <div className="confirmation-dialog__content">{message}</div>
    </Modal>
  );
};
