import { Jimp, intToRGBA, rgbaToInt, BlendMode } from 'jimp';
import { Injectable } from '@nestjs/common';

type JimpType = any; // Use any to avoid complex type issues with Jimp v1.6.0

/**
 * Sharp-compatible image processing service using Jimp
 * Provides a drop-in replacement for Sharp with chainable API
 */
@Injectable()
export class JimpHelperService {
  /**
   * Types for Sharp compatibility
   */
  static ResizeFit = {
    COVER: 'cover',
    CONTAIN: 'contain',
    FILL: 'fill',
    INSIDE: 'inside',
    OUTSIDE: 'outside',
  } as const;

  static Format = {
    JPEG: 'jpeg',
    PNG: 'png',
    BMP: 'bmp',
    GIF: 'gif',
    TIFF: 'tiff',
  } as const;

  /**
   * Create instance from buffer (Sharp-like static method)
   */
  static async from(input: Buffer | string): Promise<JimpInstance> {
    try {
      const image = await Jimp.read(input);
      return new JimpInstance(image);
    } catch (error) {
      throw new Error(`Failed to load image: ${error.message}`);
    }
  }
}

/**
 * Chainable Jimp instance wrapper with Sharp-compatible API
 */
export class JimpInstance {
  private image: JimpType;
  private operations: Array<() => Promise<void>> = [];

  constructor(image: JimpType) {
    this.image = image;
  }

  /**
   * Resize image with Sharp-compatible options
   */
  resize(width?: number, height?: number, options?: {
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: string;
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    fastShrinkOnLoad?: boolean;
  }): JimpInstance {
    this.operations.push(async () => {
      const originalWidth = this.image.bitmap.width;
      const originalHeight = this.image.bitmap.height;
      
      // Handle undefined dimensions
      if (!width && !height) return;
      
      // Calculate dimensions if only one provided
      if (!width && height) {
        width = Math.round((originalWidth * height) / originalHeight);
      }
      if (!height && width) {
        height = Math.round((originalHeight * width) / originalWidth);
      }

      // Ensure both dimensions are defined at this point
      if (!width || !height) return;

      // Apply withoutEnlargement/withoutReduction constraints
      if (options?.withoutEnlargement && (width > originalWidth || height > originalHeight)) {
        const scale = Math.min(originalWidth / width, originalHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      if (options?.withoutReduction && (width < originalWidth || height < originalHeight)) {
        const scale = Math.max(originalWidth / width, originalHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const fit = options?.fit || 'cover';
      
      switch (fit) {
        case 'cover':
          this.image.cover({ w: width, h: height });
          break;
        case 'contain':
          this.image.contain({ w: width, h: height });
          break;
        case 'fill':
          this.image.resize({ w: width, h: height });
          break;
        case 'inside':
          this.image.scaleToFit(width, height);
          break;
        case 'outside':
          // Scale to cover the dimensions
          const scaleX = width / originalWidth;
          const scaleY = height / originalHeight;
          const scale = Math.max(scaleX, scaleY);
          this.image.resize({ w: Math.round(originalWidth * scale), h: Math.round(originalHeight * scale) });
          break;
        default:
          this.image.resize({ w: width, h: height });
      }
    });
    
    return this;
  }

  /**
   * Rotate image by angle in degrees
   */
  rotate(angle: number, options?: { background?: string }): JimpInstance {
    this.operations.push(async () => {
      const bgColor = options?.background || '#00000000';
      this.image.rotate(angle, bgColor);
    });
    return this;
  }

  /**
   * Flip image horizontally
   */
  flip(flip = true): JimpInstance {
    if (flip) {
      this.operations.push(async () => {
        this.image.flip(false, true);
      });
    }
    return this;
  }

  /**
   * Flop image vertically
   */
  flop(flop = true): JimpInstance {
    if (flop) {
      this.operations.push(async () => {
        this.image.flip(true, false);
      });
    }
    return this;
  }

  /**
   * Extract/crop region from image
   */
  extract(region: { left: number; top: number; width: number; height: number }): JimpInstance {
    this.operations.push(async () => {
      this.image.crop(region.left, region.top, region.width, region.height);
    });
    return this;
  }

  /**
   * Apply blur effect
   */
  blur(sigma = 1): JimpInstance {
    this.operations.push(async () => {
      // Jimp blur is different from Sharp's sigma, approximate conversion
      const radius = Math.max(1, Math.round(sigma * 2));
      this.image.blur(radius);
    });
    return this;
  }

  /**
   * Convert to grayscale
   */
  grayscale(grayscale = true): JimpInstance {
    if (grayscale) {
      this.operations.push(async () => {
        this.image.greyscale();
      });
    }
    return this;
  }

  /**
   * Modulate brightness, saturation, lightness
   */
  modulate(options: { brightness?: number; saturation?: number; lightness?: number; hue?: number }): JimpInstance {
    this.operations.push(async () => {
      if (options.brightness !== undefined) {
        const brightness = (options.brightness - 1) * 100;
        this.image.brightness(brightness);
      }
      if (options.saturation !== undefined) {
        const saturation = (options.saturation - 1) * 100;
        this.image.colour([
          { apply: 'saturate', params: [saturation] }
        ]);
      }
      // Lightness approximation using brightness
      if (options.lightness !== undefined) {
        const lightness = (options.lightness - 1) * 50;
        this.image.brightness(lightness);
      }
      
      // Hue shift
      if (options.hue !== undefined) {
        const hueShift = options.hue;
        this.image.colour([
          { apply: 'hue', params: [hueShift] }
        ]);
      }
    });
    return this;
  }

  /**
   * Apply tint color
   */
  tint(color: string | { r?: number; g?: number; b?: number }): JimpInstance {
    this.operations.push(async () => {
      if (typeof color === 'string') {
        // Convert hex color to RGB
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        this.image.colour([
          { apply: 'tint', params: [{ r, g, b }] }
        ]);
      } else {
        // Ensure all RGB values are defined
        const tintColor = {
          r: color.r || 0,
          g: color.g || 0,
          b: color.b || 0
        };
        this.image.colour([
          { apply: 'tint', params: [tintColor] }
        ]);
      }
    });
    return this;
  }

  /**
   * Sharpen image
   */
  sharpen(amount = 1): JimpInstance {
    this.operations.push(async () => {
      // Create a sharpening kernel based on amount
      const kernel = [
        [0, -amount, 0],
        [-amount, 1 + 4 * amount, -amount],
        [0, -amount, 0]
      ];
      this.image.convolute(kernel);
    });
    return this;
  }

  /**
   * Apply threshold
   */
  threshold(value = 128): JimpInstance {
    this.operations.push(async () => {
      // Convert 0-1 range to 0-255
      const threshold = typeof value === 'number' && value <= 1 ? value * 255 : value;
      
      this.image.scan(0, 0, this.image.bitmap.width, this.image.bitmap.height, (x, y, idx) => {
        const gray = (this.image.bitmap.data[idx] + this.image.bitmap.data[idx + 1] + this.image.bitmap.data[idx + 2]) / 3;
        const binary = gray > threshold ? 255 : 0;
        this.image.bitmap.data[idx] = binary;     // red
        this.image.bitmap.data[idx + 1] = binary; // green
        this.image.bitmap.data[idx + 2] = binary; // blue
      });
    });
    return this;
  }

  /**
   * Normalize image (auto contrast)
   */
  normalise(): JimpInstance {
    this.operations.push(async () => {
      this.image.normalize();
    });
    return this;
  }

  // Alias for British spelling
  normalize(): JimpInstance {
    return this.normalise();
  }

  /**
   * Composite overlays
   */
  composite(overlays: Array<{ input: Buffer | JimpInstance; left?: number; top?: number; blend?: string }>): JimpInstance {
    this.operations.push(async () => {
      for (const overlay of overlays) {
        let overlayImage: JimpType;
        
        if (overlay.input instanceof JimpInstance) {
          await overlay.input.executeOperations();
          overlayImage = overlay.input.image;
        } else {
          overlayImage = await Jimp.read(overlay.input);
        }
        
        const x = overlay.left || 0;
        const y = overlay.top || 0;
        
        // Map blend modes
        const blendMode = this.mapBlendMode(overlay.blend);
        if (blendMode) {
          this.image.composite(overlayImage, x, y, { mode: blendMode });
        } else {
          this.image.composite(overlayImage, x, y);
        }
      }
    });
    return this;
  }

  /**
   * Ensure alpha channel
   */
  ensureAlpha(opacity?: number): JimpInstance {
    this.operations.push(async () => {
      if (!this.image.hasAlpha()) {
        // Convert to RGBA if not already
        const width = this.image.bitmap.width;
        const height = this.image.bitmap.height;
        const newImage = new Jimp({ width, height, color: 0x00000000 });
        newImage.composite(this.image, 0, 0);
        this.image = newImage;
      }
      
      // Apply opacity if provided
      if (opacity !== undefined) {
        this.image.opacity(opacity);
      }
    });
    return this;
  }

  /**
   * Linear transformation for contrast
   */
  linear(a = 1, b = 0): JimpInstance {
    this.operations.push(async () => {
      this.image.scan(0, 0, this.image.bitmap.width, this.image.bitmap.height, (x, y, idx) => {
        this.image.bitmap.data[idx] = Math.min(255, Math.max(0, a * this.image.bitmap.data[idx] + b));
        this.image.bitmap.data[idx + 1] = Math.min(255, Math.max(0, a * this.image.bitmap.data[idx + 1] + b));
        this.image.bitmap.data[idx + 2] = Math.min(255, Math.max(0, a * this.image.bitmap.data[idx + 2] + b));
      });
    });
    return this;
  }

  /**
   * Gamma correction
   */
  gamma(value = 1): JimpInstance {
    this.operations.push(async () => {
      const gamma = 1 / value;
      this.image.scan(0, 0, this.image.bitmap.width, this.image.bitmap.height, (x, y, idx) => {
        this.image.bitmap.data[idx] = 255 * Math.pow(this.image.bitmap.data[idx] / 255, gamma);
        this.image.bitmap.data[idx + 1] = 255 * Math.pow(this.image.bitmap.data[idx + 1] / 255, gamma);
        this.image.bitmap.data[idx + 2] = 255 * Math.pow(this.image.bitmap.data[idx + 2] / 255, gamma);
      });
    });
    return this;
  }

  /**
   * Apply convolution kernel
   */
  convolve(kernel: number[][]): JimpInstance {
    this.operations.push(async () => {
      this.image.convolute(kernel);
    });
    return this;
  }

  /**
   * Apply median filter
   */
  median(size = 3): JimpInstance {
    this.operations.push(async () => {
      // Simple median filter implementation
      const width = this.image.bitmap.width;
      const height = this.image.bitmap.height;
      const radius = Math.floor(size / 2);
      const newImage = this.image.clone();
      
      for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
          const pixels: { r: number; g: number; b: number; a: number }[] = [];
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const pixel = intToRGBA(this.image.getPixelColor(x + dx, y + dy));
              pixels.push(pixel);
            }
          }
          
          // Get median for each channel
          const sortedR = pixels.map(p => p.r).sort((a, b) => a - b);
          const sortedG = pixels.map(p => p.g).sort((a, b) => a - b);
          const sortedB = pixels.map(p => p.b).sort((a, b) => a - b);
          const sortedA = pixels.map(p => p.a).sort((a, b) => a - b);
          
          const mid = Math.floor(pixels.length / 2);
          const medianColor = rgbaToInt(
            sortedR[mid],
            sortedG[mid],
            sortedB[mid],
            sortedA[mid]
          );
          
          newImage.setPixelColor(medianColor, x, y);
        }
      }
      
      this.image = newImage;
    });
    return this;
  }

  /**
   * Apply color matrix (recombination)
   */
  recomb(matrix: number[][]): JimpInstance {
    this.operations.push(async () => {
      if (matrix.length !== 3 || matrix.some(row => row.length !== 3)) {
        throw new Error('Recomb matrix must be 3x3');
      }
      
      this.image.scan(0, 0, this.image.bitmap.width, this.image.bitmap.height, (x, y, idx) => {
        const r = this.image.bitmap.data[idx];
        const g = this.image.bitmap.data[idx + 1];
        const b = this.image.bitmap.data[idx + 2];
        
        this.image.bitmap.data[idx] = Math.min(255, Math.max(0,
          matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b
        ));
        this.image.bitmap.data[idx + 1] = Math.min(255, Math.max(0,
          matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b
        ));
        this.image.bitmap.data[idx + 2] = Math.min(255, Math.max(0,
          matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b
        ));
      });
    });
    return this;
  }

  /**
   * Get image metadata
   */
  async metadata(): Promise<{
    width: number;
    height: number;
    format?: string;
    channels: number;
    hasAlpha: boolean;
    density?: number;
  }> {
    await this.executeOperations();
    
    return {
      width: this.image.bitmap.width,
      height: this.image.bitmap.height,
      format: this.image._originalMime ? this.image._originalMime.split('/')[1] : 'png',
      channels: this.image.hasAlpha() ? 4 : 3,
      hasAlpha: this.image.hasAlpha(),
    };
  }

  /**
   * Get color statistics
   */
  async stats(): Promise<{
    channels: Array<{
      min: number;
      max: number;
      sum: number;
      mean: number;
      stdev: number;
    }>;
    isOpaque: boolean;
  }> {
    await this.executeOperations();
    
    const width = this.image.bitmap.width;
    const height = this.image.bitmap.height;
    const totalPixels = width * height;
    
    const channelStats = [
      { min: 255, max: 0, sum: 0, values: [] as number[] },
      { min: 255, max: 0, sum: 0, values: [] as number[] },
      { min: 255, max: 0, sum: 0, values: [] as number[] },
    ];
    
    let isOpaque = true;
    
    this.image.scan(0, 0, width, height, (x, y, idx) => {
      for (let c = 0; c < 3; c++) {
        const value = this.image.bitmap.data[idx + c];
        channelStats[c].min = Math.min(channelStats[c].min, value);
        channelStats[c].max = Math.max(channelStats[c].max, value);
        channelStats[c].sum += value;
        channelStats[c].values.push(value);
      }
      
      if (this.image.hasAlpha() && this.image.bitmap.data[idx + 3] < 255) {
        isOpaque = false;
      }
    });
    
    const channels = channelStats.map(stat => {
      const mean = stat.sum / totalPixels;
      const variance = stat.values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / totalPixels;
      const stdev = Math.sqrt(variance);
      
      return {
        min: stat.min,
        max: stat.max,
        sum: stat.sum,
        mean,
        stdev,
      };
    });
    
    return { channels, isOpaque };
  }

  /**
   * Convert to specific format with options
   */
  toFormat(format: string, options?: {
    quality?: number;
    progressive?: boolean;
    compressionLevel?: number;
    palette?: boolean;
    colors?: number;
  }): JimpInstance {
    this.operations.push(async () => {
      const mime = `image/${format.toLowerCase()}`;
      
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          this.image.quality(options?.quality || 80);
          break;
        case 'png':
          // PNG options handled in getBuffer
          break;
        case 'bmp':
        case 'gif':
        case 'tiff':
          // Basic format support
          break;
      }
    });
    return this;
  }

  /**
   * Get buffer output
   */
  async toBuffer(options?: { format?: string; quality?: number }): Promise<Buffer> {
    await this.executeOperations();
    
    const format = options?.format || 'png';
    
    if (options?.quality && (format === 'jpeg' || format === 'jpg')) {
      this.image.quality(options.quality);
    }
    
    return new Promise((resolve, reject) => {
      this.image.getBuffer(this.getMimeType(format), (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });
  }

  /**
   * Execute all queued operations
   */
  private async executeOperations(): Promise<void> {
    for (const operation of this.operations) {
      await operation();
    }
    this.operations = [];
  }

  /**
   * Map Sharp blend modes to Jimp blend modes
   */
  private mapBlendMode(mode?: string): string | undefined {
    const blendModeMap = {
      'normal': BlendMode.SRC_OVER,
      'multiply': BlendMode.MULTIPLY,
      'screen': BlendMode.SCREEN,
      'overlay': BlendMode.OVERLAY,
      'darken': BlendMode.DARKEN,
      'lighten': BlendMode.LIGHTEN,
      'add': BlendMode.ADD,
      'difference': BlendMode.DIFFERENCE,
      'exclusion': BlendMode.DIFFERENCE, // Using difference as fallback
    };
    
    return mode ? blendModeMap[mode.toLowerCase()] : undefined;
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: string): string {
    const mimeMap: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'bmp': 'image/bmp',
      'gif': 'image/gif',
      'tiff': 'image/tiff',
    };
    
    return mimeMap[format.toLowerCase()] || 'image/png';
  }

  /**
   * Clone the instance for parallel processing
   */
  clone(): JimpInstance {
    const clonedImage = this.image.clone();
    const clonedInstance = new JimpInstance(clonedImage);
    clonedInstance.operations = [...this.operations];
    return clonedInstance;
  }

  /**
   * Get raw Jimp instance (for advanced usage)
   */
  getRawJimp(): JimpType {
    return this.image;
  }

  /**
   * Legacy compatibility methods for Jimp v0.x
   */
  getWidth(): number {
    return this.image.bitmap.width;
  }

  getHeight(): number {
    return this.image.bitmap.height;
  }

  getMIME(): string {
    return this.image._originalMime || 'image/png';
  }

  hasAlpha(): boolean {
    return this.image.hasAlpha();
  }

  /**
   * Quality setting for JPEG
   */
  quality(quality: number): JimpInstance {
    this.operations.push(async () => {
      this.image.quality(quality);
    });
    return this;
  }

  /**
   * Convert to PNG format
   */
  png(): JimpInstance {
    return this.toFormat('png');
  }

  /**
   * Convert to JPEG format
   */
  jpeg(options?: { quality?: number }): JimpInstance {
    this.toFormat('jpeg', options);
    return this;
  }

  /**
   * Apply brightness adjustment
   */
  brightness(value: number): JimpInstance {
    this.operations.push(async () => {
      this.image.brightness(value);
    });
    return this;
  }

  /**
   * Legacy getBuffer with callback (async version)
   */
  async getBufferAsync(mime?: string): Promise<Buffer> {
    return this.toBuffer({ format: mime?.split('/')[1] || 'png' });
  }

  /**
   * Negate/invert the image colors
   */
  negate(): JimpInstance {
    this.operations.push(async () => {
      this.image.invert();
    });
    return this;
  }

  /**
   * Apply contrast adjustment
   */
  contrast(contrast: number): JimpInstance {
    this.operations.push(async () => {
      const contrastValue = contrast * 100;
      this.image.contrast(contrastValue);
    });
    return this;
  }
}

// Export types for TypeScript
export type ResizeFit = keyof typeof JimpHelperService.ResizeFit;
export type ImageFormat = keyof typeof JimpHelperService.Format;

export interface ResizeOptions {
  fit?: ResizeFit;
  position?: string;
  background?: string;
  withoutEnlargement?: boolean;
  withoutReduction?: boolean;
  fastShrinkOnLoad?: boolean;
}

export interface ModulateOptions {
  brightness?: number;
  saturation?: number;
  lightness?: number;
  hue?: number;
}

export interface CompositeOverlay {
  input: Buffer | JimpInstance;
  left?: number;
  top?: number;
  blend?: string;
}

export interface ToFormatOptions {
  quality?: number;
  progressive?: boolean;
  compressionLevel?: number;
  palette?: boolean;
  colors?: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format?: string;
  channels: number;
  hasAlpha: boolean;
  density?: number;
}

export interface ChannelStats {
  min: number;
  max: number;
  sum: number;
  mean: number;
  stdev: number;
}

export interface ImageStats {
  channels: ChannelStats[];
  isOpaque: boolean;
}

// Helper function for easier usage (similar to sharp())
export function jimp(input?: Buffer | string): Promise<JimpInstance> {
  if (input) {
    return JimpHelperService.from(input);
  }
  throw new Error('Input buffer or path is required');
}

export default JimpHelperService;