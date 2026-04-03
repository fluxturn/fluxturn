// Jenkins Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const JENKINS_CONNECTOR: ConnectorDefinition = {
  name: 'jenkins',
  display_name: 'Jenkins',
  category: 'development',
  description: 'Open source automation server for CI/CD pipelines. Trigger builds, manage jobs, and monitor instances.',
  auth_type: 'basic_auth',
  verified: false,

  auth_fields: [
    {
      key: 'username',
      label: 'Jenkins Username',
      type: 'string',
      required: true,
      placeholder: 'your-username',
      description: 'Your Jenkins username'
    },
    {
      key: 'apiKey',
      label: 'Personal API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your API token',
      description: 'Personal API token from Jenkins',
      helpUrl: 'https://www.jenkins.io/doc/book/system-administration/authenticating-scripted-clients/',
      helpText: 'How to get your API token'
    },
    {
      key: 'baseUrl',
      label: 'Jenkins Instance URL',
      type: 'string',
      required: true,
      placeholder: 'https://jenkins.example.com',
      description: 'The URL of your Jenkins instance'
    }
  ],

  endpoints: {
    base_url: '{baseUrl}'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },

  supported_actions: [
    // Job Actions
    {
      id: 'trigger_job',
      name: 'Trigger Job',
      description: 'Trigger a Jenkins job',
      category: 'Job',
      icon: 'play',
      verified: false,
      inputSchema: {
        job: {
          type: 'string',
          required: true,
          label: 'Job Name',
          description: 'Name of the job to trigger',
          placeholder: 'my-job',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'trigger_job_params',
      name: 'Trigger Job with Parameters',
      description: 'Trigger a Jenkins job with parameters',
      category: 'Job',
      icon: 'play',
      verified: false,
      inputSchema: {
        job: {
          type: 'string',
          required: true,
          label: 'Job Name',
          description: 'Name of the job to trigger',
          placeholder: 'my-job',
          aiControlled: false
        },
        parameters: {
          type: 'string',
          inputType: 'textarea',
          required: false,
          label: 'Parameters (JSON)',
          description: 'Job parameters as JSON object',
          placeholder: '{"param1": "value1", "param2": "value2"}',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'copy_job',
      name: 'Copy Job',
      description: 'Copy a Jenkins job',
      category: 'Job',
      icon: 'copy',
      verified: false,
      inputSchema: {
        job: {
          type: 'string',
          required: true,
          label: 'Source Job Name',
          description: 'Name of the job to copy from',
          placeholder: 'existing-job',
          aiControlled: false
        },
        newJob: {
          type: 'string',
          required: true,
          label: 'New Job Name',
          description: 'Name for the new job',
          placeholder: 'new-job',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'create_job',
      name: 'Create Job',
      description: 'Create a new Jenkins job',
      category: 'Job',
      icon: 'plus',
      verified: false,
      inputSchema: {
        newJob: {
          type: 'string',
          required: true,
          label: 'Job Name',
          description: 'Name for the new job',
          placeholder: 'my-new-job',
          aiControlled: false
        },
        config: {
          type: 'string',
          inputType: 'textarea',
          required: true,
          label: 'Job Config XML',
          description: 'Jenkins job configuration in XML format',
          placeholder: '<?xml version="1.0" encoding="UTF-8"?>\n<project>...</project>',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    // Build Actions
    {
      id: 'get_build',
      name: 'Get Build',
      description: 'Get information about a specific build',
      category: 'Build',
      icon: 'file',
      verified: false,
      inputSchema: {
        job: {
          type: 'string',
          required: true,
          label: 'Job Name',
          description: 'Name of the job',
          placeholder: 'my-job',
          aiControlled: false
        },
        buildNumber: {
          type: 'number',
          required: true,
          label: 'Build Number',
          description: 'The build number',
          placeholder: '123',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    // Instance Actions
    {
      id: 'cancel_quiet_down',
      name: 'Cancel Quiet Down',
      description: 'Cancel quiet down state',
      category: 'Instance',
      icon: 'x',
      verified: false,
      inputSchema: {},
      outputSchema: {}
    },
    {
      id: 'quiet_down',
      name: 'Quiet Down',
      description: 'Put Jenkins in quiet down mode',
      category: 'Instance',
      icon: 'pause',
      verified: false,
      inputSchema: {},
      outputSchema: {}
    },
    {
      id: 'restart',
      name: 'Restart',
      description: 'Restart Jenkins instance',
      category: 'Instance',
      icon: 'refresh-cw',
      verified: false,
      inputSchema: {
        safe: {
          type: 'boolean',
          label: 'Safe Restart',
          description: 'Wait for all running jobs to finish',
          default: true,
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
