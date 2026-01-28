/**
 * Canvas Utilities
 * Helper functions for canvas-based image manipulation
 */

/**
 * Creates a cropped image with white background padding
 * The canvas size is exactly the crop area size (ensuring 1:1 aspect ratio)
 * 
 * @param imageSrc - Source image URL or data URI
 * @param pixelCrop - Crop area in pixels { x, y, width, height }
 * @param backgroundColor - Background color (default: white)
 * @returns Promise resolving to a WebP Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  backgroundColor: string = '#FFFFFF'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      try {
        // Create canvas with exact crop area dimensions (1:1 aspect ratio)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to crop area size (ensures 1:1 square)
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        // Fill entire canvas with white background first
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // react-easy-crop provides pixelCrop in natural image coordinates
        // So we can use pixelCrop directly to extract from the natural image
        const sourceX = pixelCrop.x;
        const sourceY = pixelCrop.y;
        const sourceWidth = pixelCrop.width;
        const sourceHeight = pixelCrop.height;

        // Draw the cropped portion of the image onto the canvas
        // The image is drawn to fill the canvas, and if the user "zoomed out"
        // (image is smaller than crop area), the white background will show around edges
        ctx.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Convert canvas to WebP Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/webp',
          0.92 // High quality WebP
        );
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    image.src = imageSrc;
  });
}
