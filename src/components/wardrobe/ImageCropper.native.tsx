/**
 * ImageCropper stub for native platforms
 * Cropping on native uses the OS image picker, not this component
 */

import React from 'react';

interface ImageCropperProps {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (blob: Blob, fileName: string) => void;
}

export default function ImageCropper(_props: ImageCropperProps) {
  return null;
}
