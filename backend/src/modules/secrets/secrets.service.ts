import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';
import {
  ISecretsProvider,
  LocalSecretsProvider,
  EnvSecretsProvider,
  VaultSecretsProvider,
} from './providers';

export type SecretsProviderType = 'local' | 'env' | 'vault';

/**
 * SecretsService provides a unified interface for managing secrets
 * across different backends (local encrypted DB, env vars, HashiCorp Vault).
 *
 * The provider is selected via the SECRETS_PROVIDER env var.
 */
@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private provider: ISecretsProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  async onModuleInit(): Promise<void> {
    const providerType = this.configService.get<string>(
      'SECRETS_PROVIDER',
      'local',
    ) as SecretsProviderType;

    this.logger.log(`Initializing secrets provider: ${providerType}`);

    switch (providerType) {
      case 'env':
        this.provider = new EnvSecretsProvider();
        break;

      case 'vault': {
        const vaultAddr = this.configService.get<string>('VAULT_ADDR', '');
        const vaultToken = this.configService.get<string>('VAULT_TOKEN', '');
        this.provider = new VaultSecretsProvider(vaultAddr, vaultToken);
        break;
      }

      case 'local':
      default: {
        const encryptionKey = this.configService.get<string>(
          'SECRETS_ENCRYPTION_KEY',
          '',
        );
        if (!encryptionKey) {
          this.logger.warn(
            'SECRETS_ENCRYPTION_KEY is not set. Local secrets provider will fail on use. ' +
            'Set SECRETS_ENCRYPTION_KEY (min 32 chars) or switch to a different SECRETS_PROVIDER.',
          );
          // Create a dummy provider that always throws
          this.provider = {
            getSecret: async () => { throw new Error('SECRETS_ENCRYPTION_KEY is not configured'); },
            listSecrets: async () => { throw new Error('SECRETS_ENCRYPTION_KEY is not configured'); },
            setSecret: async () => { throw new Error('SECRETS_ENCRYPTION_KEY is not configured'); },
            deleteSecret: async () => { throw new Error('SECRETS_ENCRYPTION_KEY is not configured'); },
          };
          return;
        }
        await this.ensureSecretsTable();
        this.provider = new LocalSecretsProvider(this.platformService, encryptionKey);
        break;
      }
    }

    this.logger.log(`Secrets provider "${providerType}" initialized`);
  }

  /**
   * Create the secrets table if it does not exist (local provider only).
   */
  private async ensureSecretsTable(): Promise<void> {
    await this.platformService.query(`
      CREATE TABLE IF NOT EXISTS secrets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) UNIQUE NOT NULL,
        encrypted_value TEXT NOT NULL,
        iv VARCHAR(64) NOT NULL,
        tag VARCHAR(64) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    this.logger.log('Secrets table ensured');
  }

  /** Fetch a secret by name from the configured provider */
  async getSecret(name: string): Promise<string | null> {
    return this.provider.getSecret(name);
  }

  /** List available secret names (not values) */
  async listSecrets(): Promise<string[]> {
    return this.provider.listSecrets();
  }

  /** Store a secret (for the local provider) */
  async setSecret(name: string, value: string): Promise<void> {
    return this.provider.setSecret(name, value);
  }

  /** Delete a secret */
  async deleteSecret(name: string): Promise<void> {
    return this.provider.deleteSecret(name);
  }

  /**
   * Resolve all {{secrets.NAME}} placeholders in a string.
   * Returns the string with secrets replaced by their values.
   */
  async resolveSecrets(input: string): Promise<string> {
    const regex = /\{\{secrets\.([^}]+)\}\}/g;
    const matches: Array<{ full: string; name: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      matches.push({ full: match[0], name: match[1] });
    }

    if (matches.length === 0) return input;

    let result = input;
    for (const m of matches) {
      const value = await this.getSecret(m.name);
      if (value !== null) {
        result = result.replace(m.full, value);
      }
    }
    return result;
  }

  /**
   * Recursively resolve {{secrets.NAME}} in any object/array/string structure.
   * Used by the execution engine to resolve secrets in node configs.
   */
  async resolveSecretsInObject(obj: any): Promise<any> {
    if (typeof obj === 'string') {
      return this.resolveSecrets(obj);
    }
    if (Array.isArray(obj)) {
      return Promise.all(obj.map((item) => this.resolveSecretsInObject(item)));
    }
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = await this.resolveSecretsInObject(value);
      }
      return resolved;
    }
    return obj;
  }
}
