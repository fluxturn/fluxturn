import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISecretsProvider } from './secrets-provider.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Local secrets provider - stores AES-256-GCM encrypted secrets in PostgreSQL.
 * Table: secrets (id, name UNIQUE, encrypted_value, iv, tag, created_at, updated_at)
 */
export class LocalSecretsProvider implements ISecretsProvider {
  private readonly logger = new Logger(LocalSecretsProvider.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly platformService: any,
    encryptionKey: string,
  ) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error(
        'SECRETS_ENCRYPTION_KEY must be at least 32 characters for AES-256-GCM',
      );
    }
    // Derive a 32-byte key from the provided key
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest();
  }

  private encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  private decrypt(encrypted: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getSecret(name: string): Promise<string | null> {
    try {
      const result = await this.platformService.query(
        'SELECT encrypted_value, iv, tag FROM secrets WHERE name = $1',
        [name],
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.decrypt(row.encrypted_value, row.iv, row.tag);
    } catch (error) {
      this.logger.error(`Failed to get secret "${name}": ${error.message}`);
      return null;
    }
  }

  async listSecrets(): Promise<string[]> {
    const result = await this.platformService.query(
      'SELECT name FROM secrets ORDER BY name ASC',
    );
    return result.rows.map((row: any) => row.name);
  }

  async setSecret(name: string, value: string): Promise<void> {
    const { encrypted, iv, tag } = this.encrypt(value);
    const now = new Date();

    await this.platformService.query(
      `INSERT INTO secrets (id, name, encrypted_value, iv, tag, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE SET encrypted_value = $2, iv = $3, tag = $4, updated_at = $6`,
      [name, encrypted, iv, tag, now, now],
    );
  }

  async deleteSecret(name: string): Promise<void> {
    await this.platformService.query(
      'DELETE FROM secrets WHERE name = $1',
      [name],
    );
  }
}
