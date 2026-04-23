/**
 * Interface for secrets provider implementations.
 * Each provider (local, env, vault) must implement this contract.
 */
export interface ISecretsProvider {
  /** Fetch a secret value by name */
  getSecret(name: string): Promise<string | null>;

  /** List available secret names (not values) */
  listSecrets(): Promise<string[]>;

  /** Store a secret. Not all providers support this (e.g., env is read-only). */
  setSecret(name: string, value: string): Promise<void>;

  /** Delete a secret. Not all providers support this (e.g., env is read-only). */
  deleteSecret(name: string): Promise<void>;
}
