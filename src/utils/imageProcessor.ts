/**
 * Image Processor Utilities
 * Web-compatible image processing using HTML5 Canvas API
 */

/**
 * Trims whitespace from an image by finding the content bounding box
 * and returning a cropped Blob.
 * 
 * @param file - The image file to process
 * @returns Promise resolving to a cropped Blob
 */
export async function trimImageWhitespace(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create a canvas to analyze the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Find the bounding box of non-background content
        // We'll detect the background color from the corners
        const corners = [
          [0, 0], // top-left
          [canvas.width - 1, 0], // top-right
          [0, canvas.height - 1], // bottom-left
          [canvas.width - 1, canvas.height - 1], // bottom-right
        ];

        // Sample corner colors and find the most common (background)
        const cornerColors = corners.map(([x, y]) => {
          const idx = (y * canvas.width + x) * 4;
          return {
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            a: data[idx + 3],
          };
        });

        // Use the top-left corner as the background color reference
        // (most images have consistent background in corners)
        const bgColor = cornerColors[0];
        const tolerance = 10; // Color tolerance for background detection

        // Find the bounding box
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Check if pixel is not background (considering alpha and color)
            const isBackground = 
              a < 128 || // Transparent or semi-transparent
              (Math.abs(r - bgColor.r) < tolerance &&
               Math.abs(g - bgColor.g) < tolerance &&
               Math.abs(b - bgColor.b) < tolerance);

            if (!isBackground) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // If no content found, return original image
        if (minX >= maxX || minY >= maxY) {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, file.type || 'image/jpeg', 0.95);
          return;
        }

        // Add a small padding (1% of dimensions)
        const paddingX = Math.max(1, Math.floor((maxX - minX) * 0.01));
        const paddingY = Math.max(1, Math.floor((maxY - minY) * 0.01));
        
        minX = Math.max(0, minX - paddingX);
        minY = Math.max(0, minY - paddingY);
        maxX = Math.min(canvas.width, maxX + paddingX);
        maxY = Math.min(canvas.height, maxY + paddingY);

        // Create cropped canvas
        const croppedWidth = maxX - minX;
        const croppedHeight = maxY - minY;
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');

        if (!croppedCtx) {
          reject(new Error('Could not get cropped canvas context'));
          return;
        }

        croppedCanvas.width = croppedWidth;
        croppedCanvas.height = croppedHeight;

        // Draw the cropped portion
        croppedCtx.drawImage(
          canvas,
          minX, minY, croppedWidth, croppedHeight,
          0, 0, croppedWidth, croppedHeight
        );

        // Convert to blob
        croppedCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from cropped canvas'));
          }
        }, file.type || 'image/jpeg', 0.95);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Processes multiple images: trims whitespace, resizes to 1024px width,
 * and stacks them vertically into a single 'filmstrip' JPEG with grey separator lines.
 * 
 * @param files - Array of image files to process
 * @returns Promise resolving to a stacked image Blob
 */
export async function processAndStackImages(files: File[]): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('No files provided');
  }

  const TARGET_WIDTH = 1024;
  const SEPARATOR_HEIGHT = 2;
  const SEPARATOR_COLOR = '#808080'; // Grey

  // Process each image: trim and resize
  const processedImages: HTMLImageElement[] = [];
  const processedHeights: number[] = [];

  for (const file of files) {
    try {
      // First trim the image
      const trimmedBlob = await trimImageWhitespace(file);
      
      // Load the trimmed image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load trimmed image: ${file.name}`));
        image.src = URL.createObjectURL(trimmedBlob);
      });

      // Calculate new dimensions (maintain aspect ratio, target width 1024px)
      const aspectRatio = img.width / img.height;
      const newWidth = Math.min(TARGET_WIDTH, img.width);
      const newHeight = newWidth / aspectRatio;

      // Resize the image
      const resizedCanvas = document.createElement('canvas');
      const resizedCtx = resizedCanvas.getContext('2d');

      if (!resizedCtx) {
        throw new Error('Could not get canvas context for resizing');
      }

      resizedCanvas.width = newWidth;
      resizedCanvas.height = newHeight;
      resizedCtx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert back to image element
      const resizedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load resized image'));
        resizedCanvas.toBlob((blob) => {
          if (blob) {
            image.src = URL.createObjectURL(blob);
          } else {
            reject(new Error('Failed to create blob from resized canvas'));
          }
        }, 'image/jpeg', 0.95);
      });

      processedImages.push(resizedImg);
      processedHeights.push(newHeight);
    } catch (error) {
      console.error(`Error processing image ${file.name}:`, error);
      throw error;
    }
  }

  // Calculate total height (all images + separators)
  const totalHeight = processedHeights.reduce((sum, height) => sum + height, 0) +
    (files.length - 1) * SEPARATOR_HEIGHT;

  // Find the maximum width (should be TARGET_WIDTH, but handle edge cases)
  const maxWidth = Math.max(...processedImages.map(img => img.width));

  // Create the final stacked canvas
  const stackedCanvas = document.createElement('canvas');
  const stackedCtx = stackedCanvas.getContext('2d');

  if (!stackedCtx) {
    throw new Error('Could not get canvas context for stacking');
  }

  stackedCanvas.width = maxWidth;
  stackedCanvas.height = totalHeight;

  // Fill with white background
  stackedCtx.fillStyle = '#FFFFFF';
  stackedCtx.fillRect(0, 0, maxWidth, totalHeight);

  // Draw images and separators
  let currentY = 0;

  for (let i = 0; i < processedImages.length; i++) {
    const img = processedImages[i];
    const height = processedHeights[i];

    // Draw the image (centered horizontally if narrower than max width)
    const xOffset = (maxWidth - img.width) / 2;
    stackedCtx.drawImage(img, xOffset, currentY, img.width, height);

    currentY += height;

    // Draw separator line (except after the last image)
    if (i < processedImages.length - 1) {
      stackedCtx.fillStyle = SEPARATOR_COLOR;
      stackedCtx.fillRect(0, currentY, maxWidth, SEPARATOR_HEIGHT);
      currentY += SEPARATOR_HEIGHT;
    }
  }

  // Convert to JPEG blob
  return new Promise((resolve, reject) => {
    stackedCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from stacked canvas'));
      }
    }, 'image/jpeg', 0.95);
  });
}
