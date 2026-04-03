/**
 * SSH Connector Tests
 *
 * Tests for the SSH connector actions using mocked SSH connections.
 * SSH connector uses node-ssh for SSH operations.
 */
import { SshConnector } from '../ssh.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

// Mock node-ssh
jest.mock('node-ssh');

describe('SshConnector', () => {
  let connector: SshConnector;
  let mockSshClient: any;

  beforeEach(async () => {
    // Create mock SSH client
    mockSshClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn(),
      execCommand: jest.fn(),
      getFile: jest.fn(),
      putFile: jest.fn(),
    };

    // Mock NodeSSH constructor
    const { NodeSSH } = require('node-ssh');
    NodeSSH.mockImplementation(() => mockSshClient);

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(
      SshConnector,
      'ssh'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when SSH connection succeeds', async () => {
      mockSshClient.connect.mockResolvedValue(undefined);

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(mockSshClient.connect).toHaveBeenCalled();
      expect(mockSshClient.dispose).toHaveBeenCalled();
    });

    it('should return failure when SSH connection fails', async () => {
      mockSshClient.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should validate required credentials', async () => {
      // Create connector without proper credentials
      const invalidConnector = new SshConnector();

      await expect(
        invalidConnector.initialize({
          id: 'test-ssh',
          name: 'ssh',
          type: 'ssh' as any,
          category: 'utility' as any,
          credentials: {}, // Empty credentials
        } as any)
      ).rejects.toThrow('SSH credentials (host, username) are required');
    });

    it('should validate password authentication credentials', async () => {
      const invalidConnector = new SshConnector();

      await expect(
        invalidConnector.initialize({
          id: 'test-ssh',
          name: 'ssh',
          type: 'ssh' as any,
          category: 'utility' as any,
          credentials: {
            host: 'test.com',
            username: 'user',
            authType: 'password',
            // Missing password
          },
        } as any)
      ).rejects.toThrow('Password is required for password authentication');
    });

    it('should validate private key authentication credentials', async () => {
      const invalidConnector = new SshConnector();

      await expect(
        invalidConnector.initialize({
          id: 'test-ssh',
          name: 'ssh',
          type: 'ssh' as any,
          category: 'utility' as any,
          credentials: {
            host: 'test.com',
            username: 'user',
            authType: 'privateKey',
            // Missing privateKey
          },
        } as any)
      ).rejects.toThrow('Private key is required for key-based authentication');
    });
  });

  // ===========================================
  // Execute Command Action Tests
  // ===========================================
  describe('execute_command', () => {
    it('should execute command successfully', async () => {
      const mockCommandResult = {
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        code: 0,
      };

      mockSshClient.execCommand.mockResolvedValue(mockCommandResult);

      const result = await connector.executeAction('execute_command', {
        command: 'ls -la',
        cwd: '/home/user',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.stdout).toBe('file1.txt\nfile2.txt');
      expect(data.stderr).toBe('');
      expect(data.code).toBe(0);
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('ls -la', { cwd: '/home/user' });
    });

    it('should handle command with stderr output', async () => {
      const mockCommandResult = {
        stdout: '',
        stderr: 'Permission denied',
        code: 1,
      };

      mockSshClient.execCommand.mockResolvedValue(mockCommandResult);

      const result = await connector.executeAction('execute_command', {
        command: 'cat /etc/shadow',
        cwd: '/',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.stderr).toBe('Permission denied');
      expect(data.code).toBe(1);
    });

    it('should resolve home directory in cwd', async () => {
      mockSshClient.execCommand
        .mockResolvedValueOnce({ stdout: '/home/testuser', stderr: '', code: 0 }) // echo $HOME
        .mockResolvedValueOnce({ stdout: 'test.txt', stderr: '', code: 0 }); // ls

      const result = await connector.executeAction('execute_command', {
        command: 'ls',
        cwd: '~/documents',
      });

      expect(result.success).toBe(true);
      // Should have called echo $HOME first (without options object)
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('echo $HOME');
      // Then should have called ls with resolved path
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('ls', { cwd: '/home/testuser/documents' });
    });

    it('should use default cwd if not provided', async () => {
      mockSshClient.execCommand.mockResolvedValue({
        stdout: 'output',
        stderr: '',
        code: 0,
      });

      const result = await connector.executeAction('execute_command', {
        command: 'pwd',
      });

      expect(result.success).toBe(true);
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('pwd', { cwd: '/' });
    });

    it('should handle command execution errors', async () => {
      mockSshClient.execCommand.mockRejectedValue(new Error('Command failed'));

      const result = await connector.executeAction('execute_command', {
        command: 'invalid-command',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should require command parameter', async () => {
      const result = await connector.executeAction('execute_command', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Download File Action Tests
  // ===========================================
  describe('download_file', () => {
    it('should download file successfully', async () => {
      const mockFileContent = Buffer.from('Hello World!');

      // Mock fs.readFileSync
      jest.spyOn(require('fs'), 'readFileSync').mockReturnValue(mockFileContent);
      mockSshClient.getFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('download_file', {
        path: '/home/user/test.txt',
      });

      expect(result.success).toBe(true);
      // The connector wraps the response, so we need to access result.data directly
      expect(result.data.fileName).toBe('test.txt');
      expect(result.data.fileSize).toBe(mockFileContent.length);
      expect(result.data.data).toBe(mockFileContent.toString('base64'));
      expect(mockSshClient.getFile).toHaveBeenCalled();
    });

    it('should handle file download with custom binary property name', async () => {
      const mockFileContent = Buffer.from('Test content');

      jest.spyOn(require('fs'), 'readFileSync').mockReturnValue(mockFileContent);
      mockSshClient.getFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('download_file', {
        path: '/home/user/file.pdf',
        binaryPropertyName: 'document',
      });

      expect(result.success).toBe(true);
      expect(result.data.binaryPropertyName).toBe('document');
      expect(result.data.mimeType).toBe('application/pdf');
    });

    it('should resolve home directory in file path', async () => {
      const mockFileContent = Buffer.from('Content');

      jest.spyOn(require('fs'), 'readFileSync').mockReturnValue(mockFileContent);
      mockSshClient.execCommand.mockResolvedValue({ stdout: '/home/testuser', stderr: '', code: 0 });
      mockSshClient.getFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('download_file', {
        path: '~/file.txt',
      });

      expect(result.success).toBe(true);
      // Should have called echo $HOME (without options object)
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('echo $HOME');
      // Should have called getFile with resolved path
      const getFileCall = mockSshClient.getFile.mock.calls[0];
      expect(getFileCall[1]).toBe('/home/testuser/file.txt');
    });

    it('should handle file download errors', async () => {
      mockSshClient.getFile.mockRejectedValue(new Error('File not found'));

      const result = await connector.executeAction('download_file', {
        path: '/nonexistent/file.txt',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should require path parameter', async () => {
      const result = await connector.executeAction('download_file', {});

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should detect correct MIME type based on extension', async () => {
      const mockFileContent = Buffer.from('data');
      jest.spyOn(require('fs'), 'readFileSync').mockReturnValue(mockFileContent);
      mockSshClient.getFile.mockResolvedValue(undefined);

      const testCases = [
        { path: '/test.json', expectedMime: 'application/json' },
        { path: '/test.pdf', expectedMime: 'application/pdf' },
        { path: '/test.png', expectedMime: 'image/png' },
        { path: '/test.csv', expectedMime: 'text/csv' },
        { path: '/test.unknown', expectedMime: 'application/octet-stream' },
      ];

      for (const testCase of testCases) {
        const result = await connector.executeAction('download_file', {
          path: testCase.path,
        });

        expect(result.data.mimeType).toBe(testCase.expectedMime);
      }
    });
  });

  // ===========================================
  // Upload File Action Tests
  // ===========================================
  describe('upload_file', () => {
    it('should upload file successfully', async () => {
      const mockFileData = Buffer.from('File content').toString('base64');

      mockSshClient.putFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('upload_file', {
        path: '/home/user/uploads',
        binaryData: {
          data: mockFileData,
          fileName: 'upload.txt',
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.success).toBe(true);
      expect(data.uploadedPath).toBe('/home/user/uploads/upload.txt');
      expect(mockSshClient.putFile).toHaveBeenCalled();
    });

    it('should handle upload with custom file name', async () => {
      const mockFileData = Buffer.from('Content').toString('base64');

      mockSshClient.putFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('upload_file', {
        path: '/var/www',
        fileName: 'custom-name.txt',
        binaryData: {
          data: mockFileData,
          fileName: 'original.txt',
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.uploadedPath).toBe('/var/www/custom-name.txt');
      expect(data.fileName).toBe('custom-name.txt');
    });

    it('should handle path with trailing slash', async () => {
      const mockFileData = Buffer.from('Data').toString('base64');

      mockSshClient.putFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('upload_file', {
        path: '/home/user/',
        binaryData: {
          data: mockFileData,
          fileName: 'file.txt',
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.uploadedPath).toBe('/home/user/file.txt');
    });

    it('should resolve home directory in upload path', async () => {
      const mockFileData = Buffer.from('Content').toString('base64');

      mockSshClient.execCommand.mockResolvedValue({ stdout: '/home/testuser', stderr: '', code: 0 });
      mockSshClient.putFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('upload_file', {
        path: '~/uploads',
        binaryData: {
          data: mockFileData,
          fileName: 'file.txt',
        },
      });

      expect(result.success).toBe(true);
      // Should have called echo $HOME (without options object)
      expect(mockSshClient.execCommand).toHaveBeenCalledWith('echo $HOME');
      // Should have called putFile with resolved path
      const putFileCall = mockSshClient.putFile.mock.calls[0];
      expect(putFileCall[1]).toBe('/home/testuser/uploads/file.txt');
    });

    it('should handle upload errors', async () => {
      const mockFileData = Buffer.from('Content').toString('base64');

      mockSshClient.putFile.mockRejectedValue(new Error('Permission denied'));

      const result = await connector.executeAction('upload_file', {
        path: '/root',
        binaryData: {
          data: mockFileData,
          fileName: 'file.txt',
        },
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should require path parameter', async () => {
      const result = await connector.executeAction('upload_file', {
        binaryData: {
          data: 'base64data',
          fileName: 'file.txt',
        },
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should require binary data', async () => {
      const result = await connector.executeAction('upload_file', {
        path: '/home/user',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should use default file name if not provided', async () => {
      const mockFileData = Buffer.from('Content').toString('base64');

      mockSshClient.putFile.mockResolvedValue(undefined);

      const result = await connector.executeAction('upload_file', {
        path: '/tmp',
        binaryData: {
          data: mockFileData,
          // No fileName provided
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.fileName).toBe('uploaded-file');
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Connection Configuration Tests
  // ===========================================
  describe('SSH connection configuration', () => {
    it('should connect with password authentication', async () => {
      await connector.testConnection();

      expect(mockSshClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'mock-ssh-server.example.com',
          port: 22,
          username: 'testuser',
          password: 'mock-ssh-password',
        })
      );
    });

    it('should connect with private key authentication', async () => {
      const privateKeyConnector = await ConnectorTestHelper.createConnector(
        SshConnector,
        'ssh',
        {
          host: 'test.com',
          port: 22,
          username: 'keyuser',
          authType: 'privateKey',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMOCKKEY\n-----END RSA PRIVATE KEY-----',
        }
      );

      await privateKeyConnector.testConnection();

      expect(mockSshClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'test.com',
          port: 22,
          username: 'keyuser',
          privateKey: expect.stringContaining('BEGIN RSA PRIVATE KEY'),
        })
      );
    });

    it('should connect with private key and passphrase', async () => {
      const privateKeyConnector = await ConnectorTestHelper.createConnector(
        SshConnector,
        'ssh',
        {
          host: 'test.com',
          port: 22,
          username: 'keyuser',
          authType: 'privateKey',
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMOCKKEY\n-----END RSA PRIVATE KEY-----',
          passphrase: 'secret-passphrase',
        }
      );

      await privateKeyConnector.testConnection();

      expect(mockSshClient.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'test.com',
          port: 22,
          username: 'keyuser',
          privateKey: expect.stringContaining('BEGIN RSA PRIVATE KEY'),
          passphrase: 'secret-passphrase',
        })
      );
    });
  });
});
