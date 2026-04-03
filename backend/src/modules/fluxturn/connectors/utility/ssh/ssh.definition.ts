// SSH Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const SSH_CONNECTOR: ConnectorDefinition = {
  name: 'ssh',
  display_name: 'SSH',
  category: 'utility',
  description: 'Execute commands via SSH on remote servers. Upload and download files securely.',
  auth_type: 'custom',
  verified: true,

  auth_fields: [
    {
      key: 'host',
      label: 'Host',
      type: 'string',
      required: true,
      placeholder: 'localhost',
      description: 'SSH server hostname or IP address'
    },
    {
      key: 'port',
      label: 'Port',
      type: 'number',
      required: true,
      default: 22,
      description: 'SSH port number'
    },
    {
      key: 'username',
      label: 'Username',
      type: 'string',
      required: true,
      placeholder: 'user',
      description: 'SSH username'
    },
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      default: 'password',
      options: [
        { label: 'Password', value: 'password' },
        { label: 'Private Key', value: 'privateKey' }
      ],
      description: 'Authentication method'
    },
    {
      key: 'password',
      label: 'Password',
      type: 'password',
      required: false,
      description: 'SSH password (if using password auth)',
      displayOptions: {
        show: {
          authType: ['password']
        }
      }
    },
    {
      key: 'privateKey',
      label: 'Private Key',
      type: 'password',
      inputType: 'textarea',
      required: false,
      description: 'SSH private key (if using key auth)',
      displayOptions: {
        show: {
          authType: ['privateKey']
        }
      }
    },
    {
      key: 'passphrase',
      label: 'Passphrase',
      type: 'password',
      required: false,
      description: 'Passphrase for private key (if encrypted)',
      displayOptions: {
        show: {
          authType: ['privateKey']
        }
      }
    }
  ],

  endpoints: {},

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    {
      id: 'execute_command',
      name: 'Execute Command',
      description: 'Execute a command on remote server',
      category: 'Command',
      icon: 'terminal',
      verified: false,
      inputSchema: {
        command: {
          type: 'string',
          required: true,
          label: 'Command',
          description: 'Command to execute',
          placeholder: 'ls -la',
          aiControlled: false
        },
        cwd: {
          type: 'string',
          label: 'Working Directory',
          description: 'Working directory for command',
          default: '/',
          placeholder: '/home/user',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'download_file',
      name: 'Download File',
      description: 'Download a file from remote server',
      category: 'File',
      icon: 'download',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'File Path',
          description: 'Path to the file on remote server',
          placeholder: '/home/user/file.txt',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'upload_file',
      name: 'Upload File',
      description: 'Upload a file to remote server',
      category: 'File',
      icon: 'upload',
      verified: false,
      inputSchema: {
        path: {
          type: 'string',
          required: true,
          label: 'Target Directory',
          description: 'Directory to upload file to',
          placeholder: '/home/user',
          aiControlled: false
        },
        binaryPropertyName: {
          type: 'string',
          label: 'Binary Property Name',
          description: 'Name of the binary property containing file data',
          default: 'data',
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
