import { Injectable, Logger } from '@nestjs/common';
import { jimp } from './jimp-helper.service';
import { ProcessingOptions } from './storage.service';

@Injectable()
export class StorageImageProcessingService {
  private readonly logger = new Logger(StorageImageProcessingService.name);

  async process(input: Buffer, options: ProcessingOptions): Promise<Buffer> {
    try {
      let image = await jimp(input);

      // Resize if specified
      if (options.resize) {
        image = image.resize(
          options.resize.width,
          options.resize.height
        );
      }

      // Apply quality if specified
      if (options.quality) {
        image = image.quality(options.quality);
      }

      // Optimize if requested
      if (options.optimize) {
        // Jimp optimization - normalize and adjust
        image = image.normalize();
      }

      // Apply watermark if specified
      if (options.watermark) {
        if (options.watermark.text) {
          // Text watermark - TODO: Implement with Jimp text rendering
          // Jimp doesn't have built-in text rendering like Sharp
          // This would require additional setup or a different approach
        }
      }

      return await image.getBufferAsync(image.getMIME());
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw error;
    }
  }

  async getMetadata(input: Buffer): Promise<any> {
    try {
      const image = await jimp(input);
      return {
        width: image.getWidth(),
        height: image.getHeight(),
        channels: image.hasAlpha() ? 4 : 3,
        format: image.getMIME().split('/')[1]
      };
    } catch (error) {
      this.logger.error('Failed to get image metadata:', error);
      throw error;
    }
  }

  async extractColors(input: Buffer, count: number = 5): Promise<string[]> {
    try {
      const image = await jimp(input);
      // Simple dominant color extraction
      // TODO: Implement proper color extraction with Jimp
      // This is a placeholder implementation
      return ['#000000'];
    } catch (error) {
      this.logger.error('Failed to extract colors:', error);
      throw error;
    }
  }

  async generateBlurHash(input: Buffer): Promise<string> {
    try {
      // Resize to small size for blurhash
      const image = await jimp(input);
      const small = image.resize(32, 32);

      // In production, use blurhash library
      // This is a placeholder
      return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
    } catch (error) {
      this.logger.error('Failed to generate blurhash:', error);
      throw error;
    }
  }

  async createVariants(
    input: Buffer,
    variants: Array<{
      name: string;
      width: number;
      height: number;
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
      quality?: number;
    }>,
  ): Promise<Record<string, Buffer>> {
    const results: Record<string, Buffer> = {};

    for (const variant of variants) {
      try {
        const processed = await this.process(input, {
          resize: { width: variant.width, height: variant.height },
          format: variant.format,
          quality: variant.quality,
          optimize: true,
        });

        results[variant.name] = processed;
      } catch (error) {
        this.logger.error(`Failed to create variant ${variant.name}:`, error);
      }
    }

    return results;
  }

  async autoRotate(input: Buffer): Promise<Buffer> {
    try {
      const image = await jimp(input);
      // Auto-rotate based on EXIF - Jimp may handle this automatically
      return await image.getBufferAsync(image.getMIME());
    } catch (error) {
      this.logger.error('Failed to auto-rotate image:', error);
      throw error;
    }
  }

  async removeBackground(input: Buffer): Promise<Buffer> {
    // This would require a more sophisticated ML-based solution
    // For now, just return the original
    this.logger.warn('Background removal not implemented yet');
    return input;
  }

  async enhance(input: Buffer): Promise<Buffer> {
    try {
      const image = await jimp(input);
      return await image
        .brightness(0.1)
        .contrast(0.2)
        .getBufferAsync(image.getMIME());
    } catch (error) {
      this.logger.error('Failed to enhance image:', error);
      throw error;
    }
  }
}
