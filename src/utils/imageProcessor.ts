/**
 * Image Processor Utilities
 * Web-compatible image processing using HTML5 Canvas API
 */

/**
 * Calculates optimal grid dimensions for a given number of items.
 * Returns { cols, rows } that best fits the items in a 3:4 portrait canvas.
 * 
 * @param itemCount - Number of items to arrange
 * @returns Grid dimensions { cols, rows }
 */
function calculateGridLayout(itemCount: number): { cols: number; rows: number } {
  if (itemCount <= 0) {
    return { cols: 1, rows: 1 };
  }
  
  if (itemCount === 1) {
    return { cols: 1, rows: 1 };
  }
  
  if (itemCount === 2) {
    return { cols: 1, rows: 2 };
  }
  
  if (itemCount === 3) {
    return { cols: 2, rows: 2 };
  }
  
  if (itemCount === 4) {
    return { cols: 2, rows: 2 };
  }
  
  if (itemCount <= 6) {
    return { cols: 2, rows: 3 };
  }
  
  if (itemCount <= 9) {
    return { cols: 3, rows: 3 };
  }
  
  if (itemCount <= 12) {
    return { cols: 3, rows: 4 };
  }
  
  // For more items, calculate based on square root approximation
  const cols = Math.ceil(Math.sqrt(itemCount));
  const rows = Math.ceil(itemCount / cols);
  return { cols, rows };
}

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

        // If no content found, return original image using dataURL
        if (minX >= maxX || minY >= maxY) {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const base64Data = dataUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            resolve(blob);
          } catch (error) {
            reject(new Error(`Failed to create blob from canvas: ${error}`));
          }
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

        // Convert to blob using dataURL (more reliable in React Native Web)
        try {
          const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);
          const base64Data = dataUrl.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          resolve(blob);
        } catch (error) {
          reject(new Error(`Failed to create blob from cropped canvas: ${error}`));
        }
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
 * FIXED: Simplified to avoid nested blob conversions that corrupt images
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

  // Process each image: trim and create canvas at target size
  const processedCanvases: { canvas: HTMLCanvasElement; height: number }[] = [];

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
      const newHeight = Math.round(newWidth / aspectRatio);

      // Create a canvas at the target size
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context for resizing');
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      processedCanvases.push({ canvas, height: newHeight });
      
      // Clean up object URL
      URL.revokeObjectURL(img.src);
    } catch (error) {
      console.error(`Error processing image ${file.name}:`, error);
      throw error;
    }
  }

  // Calculate total height (all images + separators)
  const totalHeight = processedCanvases.reduce((sum, item) => sum + item.height, 0) +
    (files.length - 1) * SEPARATOR_HEIGHT;

  // Create the final stacked canvas
  const stackedCanvas = document.createElement('canvas');
  const stackedCtx = stackedCanvas.getContext('2d');

  if (!stackedCtx) {
    throw new Error('Could not get canvas context for stacking');
  }

  stackedCanvas.width = TARGET_WIDTH;
  stackedCanvas.height = totalHeight;

  // Fill with white background
  stackedCtx.fillStyle = '#FFFFFF';
  stackedCtx.fillRect(0, 0, TARGET_WIDTH, totalHeight);

  // Draw images and separators
  let currentY = 0;

  for (let i = 0; i < processedCanvases.length; i++) {
    const { canvas, height } = processedCanvases[i];

    // Draw the image (centered horizontally if narrower than target width)
    const xOffset = (TARGET_WIDTH - canvas.width) / 2;
    stackedCtx.drawImage(canvas, xOffset, currentY, canvas.width, height);

    currentY += height;

    // Draw separator line (except after the last image)
    if (i < processedCanvases.length - 1) {
      stackedCtx.fillStyle = SEPARATOR_COLOR;
      stackedCtx.fillRect(0, currentY, TARGET_WIDTH, SEPARATOR_HEIGHT);
      currentY += SEPARATOR_HEIGHT;
    }
  }

  // Convert to JPEG blob with high quality using dataURL (more reliable in React Native Web)
  return new Promise((resolve, reject) => {
    try {
      // Use toDataURL which is more reliable in React Native Web
      const dataUrl = stackedCanvas.toDataURL('image/jpeg', 0.95);
      
      // Convert data URL to blob
      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      console.log(`[imageProcessor] Created stacked blob: ${blob.size} bytes, type: ${blob.type}`);
      resolve(blob);
    } catch (error) {
      reject(new Error(`Failed to create blob from stacked canvas: ${error}`));
    }
  });
}

/**
 * Creates a composite grid image of clothing items with a fixed 3:4 portrait aspect ratio.
 * Images are arranged in a grid layout on a white background, with each image resized
 * to "contain" within its grid cell (no cropping, centered).
 * 
 * @param imageUrls - Array of image URLs to load and composite
 * @returns Promise resolving to a Blob containing the final grid image
 */
export async function generateOutfitGridCanvas(imageUrls: string[]): Promise<Blob> {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for grid generation');
  }

  const CANVAS_WIDTH = 1536;
  const CANVAS_HEIGHT = 2048;
  const BACKGROUND_COLOR = '#FFFFFF';
  const PADDING = 20; // Padding between grid cells

  console.log(`[generateOutfitGridCanvas] Creating grid for ${imageUrls.length} items`);

  // Calculate grid layout
  const { cols, rows } = calculateGridLayout(imageUrls.length);
  console.log(`[generateOutfitGridCanvas] Grid layout: ${cols}x${rows}`);

  // Calculate cell dimensions (accounting for padding)
  const totalPaddingWidth = (cols - 1) * PADDING;
  const totalPaddingHeight = (rows - 1) * PADDING;
  const cellWidth = Math.floor((CANVAS_WIDTH - totalPaddingWidth) / cols);
  const cellHeight = Math.floor((CANVAS_HEIGHT - totalPaddingHeight) / rows);

  console.log(`[generateOutfitGridCanvas] Cell dimensions: ${cellWidth}x${cellHeight}`);

  // Load all images asynchronously
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous'; // Allow CORS if needed
      image.onload = () => {
        console.log(`[generateOutfitGridCanvas] Loaded image ${i + 1}/${imageUrls.length}: ${image.width}x${image.height}`);
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error(`Failed to load image ${i + 1}: ${imageUrls[i]}`));
      };
      image.src = imageUrls[i];
    });
    images.push(img);
  }

  // Create the canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context for grid generation');
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Fill with white background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw each image in its grid cell
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    
    // Calculate grid position
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const cellX = col * (cellWidth + PADDING);
    const cellY = row * (cellHeight + PADDING);
    
    // Calculate "contain" dimensions (maintain aspect ratio, fit within cell)
    const imgAspectRatio = img.width / img.height;
    const cellAspectRatio = cellWidth / cellHeight;
    
    let drawWidth: number;
    let drawHeight: number;
    
    if (imgAspectRatio > cellAspectRatio) {
      // Image is wider than cell - fit to width
      drawWidth = cellWidth;
      drawHeight = cellWidth / imgAspectRatio;
    } else {
      // Image is taller than cell - fit to height
      drawHeight = cellHeight;
      drawWidth = cellHeight * imgAspectRatio;
    }
    
    // Center the image within the cell
    const offsetX = cellX + (cellWidth - drawWidth) / 2;
    const offsetY = cellY + (cellHeight - drawHeight) / 2;
    
    console.log(`[generateOutfitGridCanvas] Drawing item ${i + 1} at (${col}, ${row}) -> (${offsetX}, ${offsetY}), size: ${drawWidth}x${drawHeight}`);
    
    // Draw the image
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  // Convert to JPEG blob with high quality
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Convert data URL to blob
      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      console.log(`[generateOutfitGridCanvas] Grid canvas created: ${blob.size} bytes, type: ${blob.type}`);
      resolve(blob);
    } catch (error) {
      reject(new Error(`Failed to create blob from grid canvas: ${error}`));
    }
  });
}
