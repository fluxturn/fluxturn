/**
 * ExecuteCommand Connector Tests
 */
import { ExecuteCommandConnector } from '../execute-command.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('ExecuteCommandConnector', () => {
  let connector: ExecuteCommandConnector;

  beforeEach(async () => {
    connector = await ConnectorTestHelper.createConnector(
      ExecuteCommandConnector,
      'execute_command',
      {} // No credentials needed for local command execution
    );
  });

  describe('testConnection', () => {
    it('should return success when able to execute commands', async () => {
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('execute action', () => {
    it('should execute a simple echo command', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "Hello World"',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.exitCode).toBe(0);
      expect(result.data.stdout).toBe('Hello World');
      expect(result.data.stderr).toBe('');
    });

    it('should capture stdout from commands', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "test output"',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toContain('test output');
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle commands that return non-zero exit codes', async () => {
      const result = await connector.executeAction('execute', {
        command: 'exit 1',
        executeOnce: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid commands', async () => {
      const result = await connector.executeAction('execute', {
        command: 'nonexistentcommand123456',
        executeOnce: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require command parameter', async () => {
      const result = await connector.executeAction('execute', {
        executeOnce: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('command');
    });

    it('should handle commands with pipes', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "line1\nline2\nline3" | grep "line2"',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toContain('line2');
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle commands that write to stderr', async () => {
      // This command writes to stderr but exits with 0
      const result = await connector.executeAction('execute', {
        command: 'echo "error message" >&2',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stderr).toContain('error message');
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle commands with environment variables', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo $HOME',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toBeTruthy(); // Should have some output
      expect(result.data.exitCode).toBe(0);
    });

    it('should execute command with executeOnce set to false', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "test"',
        executeOnce: false
      });

      expect(result.success).toBe(true);
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle multi-line commands', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "line1" && echo "line2"',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toContain('line1');
      expect(result.data.stdout).toContain('line2');
      expect(result.data.exitCode).toBe(0);
    });

    it('should handle commands with special characters', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "Test!@#$%^&*()"',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      expect(result.data.stdout).toBeTruthy();
      expect(result.data.exitCode).toBe(0);
    });

    it('should trim stdout and stderr output', async () => {
      const result = await connector.executeAction('execute', {
        command: 'echo "  test  "',
        executeOnce: true
      });

      expect(result.success).toBe(true);
      // The output itself contains spaces, but leading/trailing should be trimmed
      expect(result.data.stdout).not.toMatch(/^\s+|\s+$/);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('metadata', () => {
    it('should return correct metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('Execute Command');
      expect(metadata.description).toContain('terminal commands');
      expect(metadata.authType).toBe('none');
      expect(metadata.actions).toHaveLength(1);
      expect(metadata.actions[0].id).toBe('execute');
      expect(metadata.triggers).toHaveLength(0);
      expect(metadata.webhookSupport).toBe(false);
    });

    it('should have proper input schema for execute action', () => {
      const metadata = connector.getMetadata();
      const executeAction = metadata.actions.find(a => a.id === 'execute');

      expect(executeAction).toBeDefined();
      expect(executeAction.inputSchema.command).toBeDefined();
      expect(executeAction.inputSchema.command.required).toBe(true);
      expect(executeAction.inputSchema.command.type).toBe('string');
      expect(executeAction.inputSchema.executeOnce).toBeDefined();
      expect(executeAction.inputSchema.executeOnce.type).toBe('boolean');
    });

    it('should have proper output schema for execute action', () => {
      const metadata = connector.getMetadata();
      const executeAction = metadata.actions.find(a => a.id === 'execute');

      expect(executeAction).toBeDefined();
      expect(executeAction.outputSchema.exitCode).toBeDefined();
      expect(executeAction.outputSchema.stdout).toBeDefined();
      expect(executeAction.outputSchema.stderr).toBeDefined();
      expect(executeAction.outputSchema.exitCode.type).toBe('number');
      expect(executeAction.outputSchema.stdout.type).toBe('string');
      expect(executeAction.outputSchema.stderr.type).toBe('string');
    });
  });

  describe('initialization', () => {
    it('should initialize without credentials', async () => {
      const newConnector = new ExecuteCommandConnector();

      await expect(newConnector.initialize({
        id: 'test-execute-command',
        name: 'execute_command',
        type: 'execute_command' as any,
        category: 'utility' as any,
        credentials: {}
      } as any)).resolves.not.toThrow();
    });
  });

  describe('platform-specific commands', () => {
    const platform = process.platform;

    if (platform === 'darwin' || platform === 'linux') {
      it('should execute Unix-style commands on Unix systems', async () => {
        const result = await connector.executeAction('execute', {
          command: 'pwd',
          executeOnce: true
        });

        expect(result.success).toBe(true);
        expect(result.data.exitCode).toBe(0);
        expect(result.data.stdout).toBeTruthy();
      });

      it('should handle ls command', async () => {
        const result = await connector.executeAction('execute', {
          command: 'ls -la',
          executeOnce: true
        });

        expect(result.success).toBe(true);
        expect(result.data.exitCode).toBe(0);
        expect(result.data.stdout).toBeTruthy();
      });
    }

    if (platform === 'win32') {
      it('should execute Windows-style commands on Windows', async () => {
        const result = await connector.executeAction('execute', {
          command: 'dir',
          executeOnce: true
        });

        expect(result.success).toBe(true);
        expect(result.data.exitCode).toBe(0);
        expect(result.data.stdout).toBeTruthy();
      });

      it('should handle echo command on Windows', async () => {
        const result = await connector.executeAction('execute', {
          command: 'echo %CD%',
          executeOnce: true
        });

        expect(result.success).toBe(true);
        expect(result.data.exitCode).toBe(0);
        expect(result.data.stdout).toBeTruthy();
      });
    }
  });

  describe('error handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const result = await connector.executeAction('execute', {
        command: 'invalidcommandthatdoesnotexist',
        executeOnce: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await connector.executeAction('execute', {
        command: 'thisisnotavalidcommand123456789',
        executeOnce: true
      });

      expect(result.success).toBe(false);
      expect(result.error.message).toBeTruthy();
    });
  });

  describe('security considerations', () => {
    it('should execute commands in current working directory', async () => {
      const result = await connector.executeAction('execute', {
        command: 'pwd',
        executeOnce: true
      });

      // Command should execute and return the current directory
      expect(result.success).toBe(true);
      expect(result.data.stdout).toBeTruthy();
    });

    // Note: In production, this connector should have proper security measures
    // to prevent arbitrary command execution by unauthorized users
  });
});
