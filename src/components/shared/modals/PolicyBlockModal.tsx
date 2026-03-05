import React from 'react';
import { AlertModal } from '@/components/shared/modals/AlertModal';

interface PolicyBlockModalProps {
  visible: boolean;
  message?: string;
  onClose: () => void;
}

export default function PolicyBlockModal({ visible, message, onClose }: PolicyBlockModalProps) {
  return (
    <AlertModal
      visible={visible}
      title="Generation Blocked"
      message={
        message ??
        'Gemini could not generate this image because it conflicts with safety policy. No credits were charged.'
      }
      primaryText="OK"
      onPrimary={onClose}
      onClose={onClose}
    />
  );
}
