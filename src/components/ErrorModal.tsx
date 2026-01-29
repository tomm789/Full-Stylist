import React from 'react';
import { AlertModal } from '@/components/shared/modals/AlertModal';

interface ErrorModalProps {
  visible: boolean;
  message?: string;
  onClose: () => void;
}

export default function ErrorModal({ visible, message, onClose }: ErrorModalProps) {
  return (
    <AlertModal
      visible={visible}
      title="Generation Failed"
      message={message ?? 'An error occurred during generation. Please try again.'}
      primaryText="OK"
      onPrimary={onClose}
      onClose={onClose}
    />
  );
}
