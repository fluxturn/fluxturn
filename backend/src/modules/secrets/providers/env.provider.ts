import { Logger } from '@nestjs/common';
import { ISecretsProvider } from './secrets-provider.interface';

/**
 * Environment variable secrets provider.
 * Read-only: getSecret('STRIPE_KEY') returns process.env.STRIPE_KEY.
 */
export class EnvSecretsProvider implements ISecretsProvider {
  private readonly logger = new Logger(EnvSecretsProvider.name);

  async getSecret(name: string): Promise<string | null> {
    return process.env[name] || null;
  }

  async listSecrets(): Promise<string[]> {
    // Return all environment variable names
    return Object.keys(process.env).sort();
  }

  async setSecret(_name: string, _value: string): Promise<void> {
    throw new Error('EnvSecretsProvider is read-only. Cannot set secrets via environment variables at runtime.');
  }

  async deleteSecret(_name: string): Promise<void> {
    throw new Error('EnvSecretsProvider is read-only. Cannot delete secrets via environment variables at runtime.');
  }
}
