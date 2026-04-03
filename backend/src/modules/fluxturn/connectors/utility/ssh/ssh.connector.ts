import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorAction,
  ConnectorTrigger,
  ConnectorRequest
} from '../../types';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Helper function to create temporary files (replaces tmp-promise dependency)
async function createTempFile(prefix: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix));
  const tempPath = join(tempDir, 'file');
  return {
    path: tempPath,
    cleanup: async () => {
      try {
        await unlink(tempPath);
      } catch {}
    }
  };
}

// NOTE: This connector requires the node-ssh npm package
// Install with: npm install node-ssh

// Import ssh2 types
type Client = any; // Will be NodeSSH from 'node-ssh' package

/**
 * SSH Connector Implementation
 *
 * Ported from n8n SSH node to Fluxturn connector architecture.
 * This connector provides SSH functionality for executing commands and managing files
 * on remote servers.
 *
 * IMPORTANT: Requires ssh2 or node-ssh npm package to be installed:
 * - npm install node-ssh
 * - npm install tmp-promise @types/tmp
 *
 * The connector supports:
 * - Password authentication
 * - Private key authentication (with optional passphrase)
 * - Command execution with working directory support
 * - File download from remote server
 * - File upload to remote server
 */
@Injectable()
export class SshConnector extends BaseConnector {
  protected readonly logger = new Logger(SshConnector.name);
  private sshClient: any = null; // NodeSSH instance

  getMetadata(): ConnectorMetadata {
    return {
      name: 'ssh',
      description: 'Execute commands via SSH on remote servers. Upload and download files securely.',
      version: '1.0.0',
      category: ConnectorCategory.UTILITY,
      type: ConnectorType.SSH,
      authType: AuthType.CUSTOM,
      actions: this.getActions(),
      triggers: [],
      webhookSupport: false
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'execute_command',
        name: 'Execute Command',
        description: 'Execute a command on remote server',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute',
              required: true
            },
            cwd: {
              type: 'string',
              description: 'Working directory for command',
              default: '/'
            }
          },
          required: ['command']
        },
        outputSchema: {
          type: 'object',
          properties: {
            stdout: { type: 'string', description: 'Standard output' },
            stderr: { type: 'string', description: 'Standard error' },
            code: { type: 'number', description: 'Exit code' }
          }
        }
      },
      {
        id: 'download_file',
        name: 'Download File',
        description: 'Download a file from remote server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file on remote server',
              required: true
            },
            binaryPropertyName: {
              type: 'string',
              description: 'Name of the binary property to store file data',
              default: 'data'
            }
          },
          required: ['path']
        },
        outputSchema: {
          type: 'object',
          properties: {
            fileName: { type: 'string' },
            mimeType: { type: 'string' },
            fileSize: { type: 'number' },
            data: { type: 'string', description: 'Base64 encoded file data' }
          }
        }
      },
      {
        id: 'upload_file',
        name: 'Upload File',
        description: 'Upload a file to remote server',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Target directory path on remote server',
              required: true
            },
            binaryPropertyName: {
              type: 'string',
              description: 'Name of the binary property containing file data',
              default: 'data'
            },
            fileName: {
              type: 'string',
              description: 'Optional override for the uploaded file name'
            }
          },
          required: ['path']
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            uploadedPath: { type: 'string', description: 'Full path where file was uploaded' }
          }
        }
      }
    ];
  }

  /**
   * Initialize SSH connection based on authentication type
   */
  protected async initializeConnection(): Promise<void> {
    const credentials = this.config.credentials;

    if (!credentials?.host || !credentials?.username) {
      throw new Error('SSH credentials (host, username) are required');
    }

    // Validate authentication type and required fields
    const authType = credentials.authType || 'password';

    if (authType === 'password' && !credentials.password) {
      throw new Error('Password is required for password authentication');
    }

    if (authType === 'privateKey' && !credentials.privateKey) {
      throw new Error('Private key is required for key-based authentication');
    }

    this.logger.log(`SSH connector initialized for ${credentials.username}@${credentials.host}:${credentials.port || 22}`);
  }

  /**
   * Test SSH connection by attempting to connect
   */
  protected async performConnectionTest(): Promise<boolean> {
    try {
      const ssh = await this.createSshConnection();
      this.logger.log('SSH connection test successful');
      ssh.dispose();
      return true;
    } catch (error) {
      this.logger.error('SSH connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('SSH health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('SSH connector does not support generic requests. Use specific actions instead.');
  }

  /**
   * Route actions to appropriate handler methods
   */
  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'execute_command':
        return await this.executeCommand(input);
      case 'download_file':
        return await this.downloadFile(input);
      case 'upload_file':
        return await this.uploadFile(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    if (this.sshClient) {
      try {
        this.sshClient.dispose();
        this.sshClient = null;
      } catch (error) {
        this.logger.error('Error disposing SSH client:', error);
      }
    }
    this.logger.log('SSH connector cleanup completed');
  }

  /**
   * Execute a command on the remote server
   * Based on n8n implementation: Ssh.node.ts lines 365-380
   */
  private async executeCommand(input: any): Promise<ConnectorResponse> {
    let ssh: any = null;

    try {
      const { command, cwd = '/' } = input;

      if (!command) {
        throw new Error('Command is required');
      }

      ssh = await this.createSshConnection();

      // Resolve home directory if path starts with ~/
      const resolvedCwd = await this.resolveHomeDir(ssh, cwd);

      this.logger.log(`Executing SSH command: ${command} in ${resolvedCwd}`);

      // Execute command with working directory
      const result = await ssh.execCommand(command, { cwd: resolvedCwd });

      return {
        success: true,
        data: {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          code: result.code || 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to execute SSH command:', error);
      return this.handleError(error, 'Failed to execute command');
    } finally {
      if (ssh) {
        ssh.dispose();
      }
    }
  }

  /**
   * Download a file from the remote server
   * Based on n8n implementation: Ssh.node.ts lines 384-421
   */
  private async downloadFile(input: any): Promise<ConnectorResponse> {
    let ssh: any = null;
    let binaryFile: any = null;

    try {
      const { path, binaryPropertyName = 'data' } = input;

      if (!path) {
        throw new Error('File path is required');
      }

      ssh = await this.createSshConnection();

      // Resolve home directory if path starts with ~/
      const resolvedPath = await this.resolveHomeDir(ssh, path);

      this.logger.log(`Downloading file from: ${resolvedPath}`);

      // Create temporary file to store downloaded data
      binaryFile = await createTempFile('fluxturn-ssh-');

      // Download file from remote server
      await ssh.getFile(binaryFile.path, resolvedPath);

      // Read file data and convert to base64
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(binaryFile.path);
      const fileData = fileBuffer.toString('base64');
      const fileSize = fileBuffer.length;

      // Extract filename from path
      const fileName = resolvedPath.split('/').pop() || 'downloaded-file';

      return {
        success: true,
        data: {
          fileName,
          fileSize,
          data: fileData,
          binaryPropertyName,
          mimeType: this.getMimeType(fileName)
        }
      };
    } catch (error) {
      this.logger.error('Failed to download file:', error);
      return this.handleError(error, 'Failed to download file');
    } finally {
      if (binaryFile) {
        try {
          await binaryFile.cleanup();
        } catch (err) {
          this.logger.warn('Failed to cleanup temporary file:', err);
        }
      }
      if (ssh) {
        ssh.dispose();
      }
    }
  }

  /**
   * Upload a file to the remote server
   * Based on n8n implementation: Ssh.node.ts lines 424-464
   */
  private async uploadFile(input: any): Promise<ConnectorResponse> {
    let ssh: any = null;
    let binaryFile: any = null;

    try {
      const { path, binaryPropertyName = 'data', fileName, binaryData } = input;

      if (!path) {
        throw new Error('Target directory path is required');
      }

      if (!binaryData || !binaryData.data) {
        throw new Error(`Binary data not found in property: ${binaryPropertyName}`);
      }

      ssh = await this.createSshConnection();

      // Resolve home directory if path starts with ~/
      const resolvedPath = await this.resolveHomeDir(ssh, path);

      // Determine final file name
      const finalFileName = fileName || binaryData.fileName || 'uploaded-file';

      // Create full upload path
      const uploadPath = `${resolvedPath}${resolvedPath.endsWith('/') ? '' : '/'}${finalFileName}`;

      this.logger.log(`Uploading file to: ${uploadPath}`);

      // Create temporary file with binary data
      binaryFile = await createTempFile('fluxturn-ssh-');

      // Convert base64 to buffer and write to temp file
      const fileBuffer = Buffer.from(binaryData.data, 'base64');
      await writeFile(binaryFile.path, fileBuffer);

      // Upload file to remote server
      await ssh.putFile(binaryFile.path, uploadPath);

      return {
        success: true,
        data: {
          success: true,
          uploadedPath: uploadPath,
          fileName: finalFileName
        }
      };
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      return this.handleError(error, 'Failed to upload file');
    } finally {
      if (binaryFile) {
        try {
          await binaryFile.cleanup();
        } catch (err) {
          this.logger.warn('Failed to cleanup temporary file:', err);
        }
      }
      if (ssh) {
        ssh.dispose();
      }
    }
  }

  /**
   * Create and connect SSH client
   * Based on n8n implementation: Ssh.node.ts lines 338-361
   */
  private async createSshConnection(): Promise<any> {
    try {
      // Dynamically import node-ssh
      const { NodeSSH } = require('node-ssh');
      const ssh = new NodeSSH();

      const credentials = this.config.credentials;
      const authType = credentials.authType || 'password';

      const connectionConfig: any = {
        host: credentials.host,
        port: credentials.port || 22,
        username: credentials.username,
      };

      if (authType === 'password') {
        // Password authentication
        connectionConfig.password = credentials.password;
      } else if (authType === 'privateKey') {
        // Private key authentication
        connectionConfig.privateKey = this.formatPrivateKey(credentials.privateKey);

        // Add passphrase if provided
        if (credentials.passphrase) {
          connectionConfig.passphrase = credentials.passphrase;
        }
      }

      await ssh.connect(connectionConfig);

      return ssh;
    } catch (error) {
      throw new Error(`Failed to establish SSH connection: ${error.message}`);
    }
  }

  /**
   * Resolve home directory (~) in paths
   * Based on n8n implementation: Ssh.node.ts lines 20-47
   */
  private async resolveHomeDir(ssh: any, path: string): Promise<string> {
    if (!path.startsWith('~')) {
      return path;
    }

    if (path.startsWith('~/')) {
      let homeDir = (await ssh.execCommand('echo $HOME')).stdout;

      // Ensure homeDir ends with /
      if (homeDir.charAt(homeDir.length - 1) !== '/') {
        homeDir += '/';
      }

      return path.replace('~/', homeDir);
    }

    if (path.startsWith('~')) {
      throw new Error('Invalid path. Replace "~" with home directory or "~/"');
    }

    return path;
  }

  /**
   * Format private key to ensure proper newlines
   * Based on n8n utilities
   */
  private formatPrivateKey(privateKey: string): string {
    if (!privateKey) {
      return privateKey;
    }

    // Remove any existing formatting
    let formattedKey = privateKey.replace(/\\n/g, '\n');

    // Ensure proper line breaks for BEGIN and END markers
    formattedKey = formattedKey.replace(/-----BEGIN [^-]+-----\s*/g, (match) => match.trim() + '\n');
    formattedKey = formattedKey.replace(/\s*-----END [^-]+-----/g, (match) => '\n' + match.trim());

    return formattedKey;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'json': 'application/json',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}
