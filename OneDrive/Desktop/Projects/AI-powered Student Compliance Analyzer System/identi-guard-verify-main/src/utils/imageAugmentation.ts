// Browser-based image augmentation for preprocessing
// Inspired by Albumentations pipeline for ID card detection

export interface AugmentationOptions {
  rotate?: boolean;
  brightness?: boolean;
  contrast?: boolean;
  blur?: boolean;
  perspective?: boolean;
}

export const applyAugmentation = async (
  imageFile: File,
  options: AugmentationOptions = {
    rotate: true,
    brightness: true,
    contrast: true,
    blur: false,
    perspective: false,
  }
): Promise<Blob> => {
  const img = await loadImageFromFile(imageFile);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Apply transformations
  ctx.save();
  
  // Center point for rotations
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  ctx.translate(centerX, centerY);
  
  // Rotation augmentation (±5 degrees for subtle correction)
  if (options.rotate) {
    const angle = (Math.random() - 0.5) * 10 * (Math.PI / 180); // ±5 degrees
    ctx.rotate(angle);
  }
  
  // Scale augmentation (slight zoom)
  const scale = options.perspective ? 0.95 + Math.random() * 0.1 : 1; // 0.95-1.05
  ctx.scale(scale, scale);
  
  ctx.translate(-centerX, -centerY);
  
  // Draw the image
  ctx.drawImage(img, 0, 0);
  ctx.restore();
  
  // Get image data for pixel-level operations
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Brightness and contrast augmentation
  if (options.brightness || options.contrast) {
    const brightness = options.brightness ? -20 + Math.random() * 40 : 0; // ±20
    const contrastFactor = options.contrast ? 0.8 + Math.random() * 0.4 : 1; // 0.8-1.2
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast
      data[i] = ((data[i] - 128) * contrastFactor + 128) + brightness;     // R
      data[i + 1] = ((data[i + 1] - 128) * contrastFactor + 128) + brightness; // G
      data[i + 2] = ((data[i + 2] - 128) * contrastFactor + 128) + brightness; // B
      
      // Clamp values
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
  }
  
  // Apply Gaussian blur for noise reduction
  if (options.blur) {
    applyGaussianBlur(imageData, 1);
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/jpeg', 0.95);
  });
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Simple Gaussian blur implementation
const applyGaussianBlur = (imageData: ImageData, radius: number) => {
  const { width, height, data } = imageData;
  const kernel = generateGaussianKernel(radius);
  const kernelSize = kernel.length;
  const half = Math.floor(kernelSize / 2);
  
  const copy = new Uint8ClampedArray(data);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, weight = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const idx = (py * width + px) * 4;
          const w = kernel[ky + half][kx + half];
          
          r += copy[idx] * w;
          g += copy[idx + 1] * w;
          b += copy[idx + 2] * w;
          weight += w;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = r / weight;
      data[idx + 1] = g / weight;
      data[idx + 2] = b / weight;
    }
  }
};

const generateGaussianKernel = (radius: number): number[][] => {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  const sigma = radius / 2;
  let sum = 0;
  
  for (let y = -radius; y <= radius; y++) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      row.push(value);
      sum += value;
    }
    kernel.push(row);
  }
  
  // Normalize
  return kernel.map(row => row.map(val => val / sum));
};

// Generate multiple augmented versions for testing
export const generateAugmentedSamples = async (
  imageFile: File,
  count: number = 3
): Promise<Blob[]> => {
  const samples: Blob[] = [];
  
  for (let i = 0; i < count; i++) {
    const augmented = await applyAugmentation(imageFile, {
      rotate: true,
      brightness: true,
      contrast: true,
      blur: i === 0, // Only apply blur to first sample
      perspective: i > 0,
    });
    samples.push(augmented);
  }
  
  return samples;
};
