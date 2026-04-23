import { Logger } from '@nestjs/common';
import axios from 'axios';
import { ISecretsProvider } from './secrets-provider.interface';

/**
 * HashiCorp Vault secrets provider.
 * Communicates with Vault via HTTP API using a static token.
 * Reads from the KV v2 secrets engine at /v1/secret/data/{name}.
 */
export class VaultSecretsProvider implements ISecretsProvider {
  private readonly logger = new Logger(VaultSecretsProvider.name);
  private readonly vaultAddr: string;
  private readonly vaultToken: string;

  constructor(vaultAddr: string, vaultToken: string) {
    if (!vaultAddr) {
      throw new Error('VAULT_ADDR is required for vault secrets provider');
    }
    if (!vaultToken) {
      throw new Error('VAULT_TOKEN is required for vault secrets provider');
    }
    // Remove trailing slash
    this.vaultAddr = vaultAddr.replace(/\/+$/, '');
    this.vaultToken = vaultToken;
  }

  private get headers() {
    return { 'X-Vault-Token': this.vaultToken };
  }

  async getSecret(name: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.vaultAddr}/v1/secret/data/${name}`,
        { headers: this.headers },
      );
      // KV v2 returns data nested under data.data
      const data = response.data?.data?.data;
      if (!data) return null;
      // Return the "value" key, or the first key's value
      return data.value ?? Object.values(data)[0] ?? null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get secret "${name}" from Vault: ${error.message}`);
      return null;
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const response = await axios.request({
        method: 'LIST',
        url: `${this.vaultAddr}/v1/secret/metadata/`,
        headers: this.headers,
      });
      return response.data?.data?.keys || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      this.logger.error(`Failed to list secrets from Vault: ${error.message}`);
      return [];
    }
  }

  async setSecret(name: string, value: string): Promise<void> {
    await axios.post(
      `${this.vaultAddr}/v1/secret/data/${name}`,
      { data: { value } },
      { headers: this.headers },
    );
  }

  async deleteSecret(name: string): Promise<void> {
    await axios.delete(
      `${this.vaultAddr}/v1/secret/metadata/${name}`,
      { headers: this.headers },
    );
  }
}
