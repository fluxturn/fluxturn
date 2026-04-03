/**
 * Git Connector Tests
 *
 * Tests for Git connector operations using mocked exec commands
 */
import { GitConnector } from '../git.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';
import { exec } from 'child_process';

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const mockExec = exec as unknown as jest.Mock;

describe('GitConnector', () => {
  let connector: GitConnector;

  beforeEach(async () => {
    jest.clearAllMocks();
    connector = await ConnectorTestHelper.createConnector(
      GitConnector,
      'git'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Tests', () => {
    it('should test connection successfully when git is available', async () => {
      // Mock git --version command
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git --version') {
          callback(null, { stdout: 'git version 2.39.0', stderr: '' });
        }
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should fail connection test when git is not installed', async () => {
      // Mock git command failure
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git --version') {
          callback(new Error('git: command not found'), { stdout: '', stderr: 'git: command not found' });
        }
      });

      const result = await connector.testConnection();

      // Connection test returns success: false when git is not available
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('add', () => {
    it('should add files to staging successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git add file1.txt file2.txt') {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await connector.executeAction('add', {
        repositoryPath: '/tmp/repo',
        pathsToAdd: 'file1.txt,file2.txt'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Files added successfully');
    });

    it('should handle add error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd.startsWith('git add')) {
          callback(new Error('pathspec did not match any files'), { stdout: '', stderr: 'pathspec did not match any files' });
        }
      });

      const result = await connector.executeAction('add', {
        repositoryPath: '/tmp/repo',
        pathsToAdd: 'nonexistent.txt'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('clone', () => {
    it('should clone repository successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git clone https://github.com/user/repo.git .') {
          callback(null, { stdout: 'Cloning into...', stderr: '' });
        }
      });

      const result = await connector.executeAction('clone', {
        repositoryPath: '/tmp/new-repo',
        sourceRepository: 'https://github.com/user/repo.git'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Repository cloned successfully');
    });

    it('should handle clone error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd.includes('git clone')) {
          callback(new Error('repository not found'), { stdout: '', stderr: 'repository not found' });
        }
      });

      const result = await connector.executeAction('clone', {
        repositoryPath: '/tmp/new-repo',
        sourceRepository: 'https://github.com/user/nonexistent.git'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('commit', () => {
    it('should commit changes successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git commit -m "Initial commit"') {
          callback(null, { stdout: '[main abc123] Initial commit', stderr: '' });
        }
      });

      const result = await connector.executeAction('commit', {
        repositoryPath: '/tmp/repo',
        message: 'Initial commit'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Committed successfully');
    });

    it('should commit with branch switch', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git checkout -B feature') {
          callback(null, { stdout: 'Switched to branch feature', stderr: '' });
        } else if (cmd === 'git commit -m "Feature commit"') {
          callback(null, { stdout: '[feature def456] Feature commit', stderr: '' });
        }
      });

      const result = await connector.executeAction('commit', {
        repositoryPath: '/tmp/repo',
        message: 'Feature commit',
        branch: 'feature'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
    });

    it('should handle commit error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd.includes('git commit')) {
          callback(new Error('nothing to commit'), { stdout: '', stderr: 'nothing to commit' });
        }
      });

      const result = await connector.executeAction('commit', {
        repositoryPath: '/tmp/repo',
        message: 'Empty commit'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('push', () => {
    it('should push changes successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git push') {
          callback(null, { stdout: 'Everything up-to-date', stderr: '' });
        }
      });

      const result = await connector.executeAction('push', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Pushed successfully');
    });

    it('should push to specific branch', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git push origin feature') {
          callback(null, { stdout: 'Branch feature pushed', stderr: '' });
        }
      });

      const result = await connector.executeAction('push', {
        repositoryPath: '/tmp/repo',
        branch: 'feature'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
    });

    it('should handle push error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd.includes('git push')) {
          callback(new Error('failed to push'), { stdout: '', stderr: 'failed to push' });
        }
      });

      const result = await connector.executeAction('push', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('pull', () => {
    it('should pull changes successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git pull') {
          callback(null, { stdout: 'Already up to date', stderr: '' });
        }
      });

      const result = await connector.executeAction('pull', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Pulled successfully');
    });

    it('should handle pull error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git pull') {
          callback(new Error('no remote configured'), { stdout: '', stderr: 'no remote configured' });
        }
      });

      const result = await connector.executeAction('pull', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('fetch', () => {
    it('should fetch changes successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git fetch') {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await connector.executeAction('fetch', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Fetched successfully');
    });

    it('should handle fetch error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git fetch') {
          callback(new Error('remote not found'), { stdout: '', stderr: 'remote not found' });
        }
      });

      const result = await connector.executeAction('fetch', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('log', () => {
    it('should get commit history successfully', async () => {
      const mockLogOutput = 'abc123|John Doe|john@example.com|Initial commit|Mon, 1 Jan 2024 12:00:00 +0000\ndef456|Jane Smith|jane@example.com|Second commit|Tue, 2 Jan 2024 12:00:00 +0000';

      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git log --max-count=100 --format=%H|%an|%ae|%s|%aD') {
          callback(null, { stdout: mockLogOutput, stderr: '' });
        }
      });

      const result = await connector.executeAction('log', {
        repositoryPath: '/tmp/repo',
        returnAll: false,
        limit: 100
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);

      const data = result.data?.data || result.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'Initial commit'
      });
    });

    it('should get all commits when returnAll is true', async () => {
      const mockLogOutput = 'abc123|John Doe|john@example.com|Commit 1|Mon, 1 Jan 2024 12:00:00 +0000';

      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git log  --format=%H|%an|%ae|%s|%aD') {
          callback(null, { stdout: mockLogOutput, stderr: '' });
        }
      });

      const result = await connector.executeAction('log', {
        repositoryPath: '/tmp/repo',
        returnAll: true
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
    });

    it('should handle log error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd.includes('git log')) {
          callback(new Error('not a git repository'), { stdout: '', stderr: 'not a git repository' });
        }
      });

      const result = await connector.executeAction('log', {
        repositoryPath: '/tmp/notarepo',
        returnAll: false,
        limit: 10
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('status', () => {
    it('should get repository status successfully', async () => {
      const mockStatusOutput = '## main...origin/main\n M file1.txt\n?? file2.txt';

      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git status --porcelain -b') {
          callback(null, { stdout: mockStatusOutput, stderr: '' });
        }
      });

      const result = await connector.executeAction('status', {
        repositoryPath: '/tmp/repo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);

      const data = result.data?.data || result.data;
      expect(data.status).toBe(mockStatusOutput);
    });

    it('should handle status error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git status --porcelain -b') {
          callback(new Error('not a git repository'), { stdout: '', stderr: 'not a git repository' });
        }
      });

      const result = await connector.executeAction('status', {
        repositoryPath: '/tmp/notarepo'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('tag', () => {
    it('should create tag successfully', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git tag v1.0.0') {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await connector.executeAction('tag', {
        repositoryPath: '/tmp/repo',
        name: 'v1.0.0'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);
      expect(result.data?.data?.message || result.data?.message).toBe('Tag v1.0.0 created successfully');
    });

    it('should handle tag error', async () => {
      mockExec.mockImplementation((cmd: string, ...args: any[]) => {
        const callback = args[args.length - 1];
        if (cmd === 'git tag v1.0.0') {
          callback(new Error('tag already exists'), { stdout: '', stderr: 'tag already exists' });
        }
      });

      const result = await connector.executeAction('tag', {
        repositoryPath: '/tmp/repo',
        name: 'v1.0.0'
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('Unknown Action', () => {
    it('should return error response for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('unknown_action');
    });
  });
});
