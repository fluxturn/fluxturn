import { Injectable } from '@nestjs/common';

interface AIResult {
  text?: string;
}

@Injectable()
export class AIBaseService {
  async generateText(prompt: string, options?: any): Promise<AIResult> {
    // Stub implementation - AI features removed for Fluxturn
    // Return empty result instead of throwing error to avoid breaking database utilities
    return { text: '' };
  }
}
