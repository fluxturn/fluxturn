// Execute Command Connector Definition
// Ported from n8n to fluxturn
// Source: /n8n/packages/nodes-base/nodes/ExecuteCommand

import { ConnectorDefinition } from '../../shared';

export const EXECUTE_COMMAND_CONNECTOR: ConnectorDefinition = {
  name: 'execute_command',
  display_name: 'Execute Command',
  category: 'utility',
  description: 'Execute terminal commands on the local system. Useful for running shell scripts or interacting with the system via CLI.',
  auth_type: 'none',
  verified: false,
  complexity: 'medium',

  auth_fields: [],

  endpoints: {},

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'execute',
      name: 'Execute Command',
      description: 'Execute a terminal command on the host system',
      category: 'Command',
      icon: 'terminal',
      verified: false,
      inputSchema: {
        executeOnce: {
          type: 'boolean',
          label: 'Execute Once',
          description: 'Whether to execute only once instead of once for each entry',
          default: true,
          required: false,
          aiControlled: false
        },
        command: {
          type: 'string',
          required: true,
          label: 'Command',
          inputType: 'textarea',
          description: 'The command to execute',
          placeholder: 'echo "test"',
          aiControlled: false
        }
      },
      outputSchema: {
        exitCode: {
          type: 'number',
          description: 'Exit code of the command'
        },
        stdout: {
          type: 'string',
          description: 'Standard output from the command'
        },
        stderr: {
          type: 'string',
          description: 'Standard error from the command'
        }
      }
    }
  ],

  supported_triggers: []
};
