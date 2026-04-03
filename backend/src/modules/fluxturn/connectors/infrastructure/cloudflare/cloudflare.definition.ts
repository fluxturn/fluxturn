// Cloudflare Connector Definition
// Ported from n8n to fluxturn

import { ConnectorDefinition } from '../../shared';

export const CLOUDFLARE_CONNECTOR: ConnectorDefinition = {
  name: 'cloudflare',
  display_name: 'Cloudflare',
  category: 'infrastructure',
  description: 'Web performance and security platform. Manage DNS, SSL certificates, and CDN settings.',
  auth_type: 'api_key',
  verified: true,

  auth_fields: [
    {
      key: 'apiToken',
      label: 'API Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Cloudflare API token',
      description: 'Your Cloudflare API token',
      helpUrl: 'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/',
      helpText: 'How to create an API token'
    }
  ],

  endpoints: {
    base_url: 'https://api.cloudflare.com/client/v4'
  },

  webhook_support: false,
  rate_limits: { requests_per_minute: 1200 },

  supported_actions: [
    {
      id: 'delete_certificate',
      name: 'Delete Certificate',
      description: 'Delete a zone certificate',
      category: 'Certificate',
      icon: 'trash',
      verified: false,
      inputSchema: {
        zoneId: {
          type: 'string',
          required: true,
          label: 'Zone ID',
          description: 'ID of the zone',
          placeholder: '023e105f4ecef8ad9ca31a8372d0c353',
          aiControlled: false
        },
        certificateId: {
          type: 'string',
          required: true,
          label: 'Certificate ID',
          description: 'ID of the certificate',
          placeholder: '328578533',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_certificate',
      name: 'Get Certificate',
      description: 'Get certificate details',
      category: 'Certificate',
      icon: 'file',
      verified: false,
      inputSchema: {
        zoneId: {
          type: 'string',
          required: true,
          label: 'Zone ID',
          description: 'ID of the zone',
          placeholder: '023e105f4ecef8ad9ca31a8372d0c353',
          aiControlled: false
        },
        certificateId: {
          type: 'string',
          required: true,
          label: 'Certificate ID',
          description: 'ID of the certificate',
          placeholder: '328578533',
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'get_many_certificates',
      name: 'Get Many Certificates',
      description: 'Get multiple certificates',
      category: 'Certificate',
      icon: 'list',
      verified: false,
      inputSchema: {
        zoneId: {
          type: 'string',
          required: true,
          label: 'Zone ID',
          description: 'ID of the zone',
          placeholder: '023e105f4ecef8ad9ca31a8372d0c353',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          label: 'Return All',
          description: 'Return all certificates',
          default: false,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Number of certificates to return',
          default: 50,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {}
    },
    {
      id: 'upload_certificate',
      name: 'Upload Certificate',
      description: 'Upload a new certificate',
      category: 'Certificate',
      icon: 'upload',
      verified: false,
      inputSchema: {
        zoneId: {
          type: 'string',
          required: true,
          label: 'Zone ID',
          description: 'ID of the zone',
          placeholder: '023e105f4ecef8ad9ca31a8372d0c353',
          aiControlled: false
        },
        certificate: {
          type: 'string',
          inputType: 'textarea',
          required: true,
          label: 'Certificate',
          description: 'Certificate content in PEM format',
          placeholder: '-----BEGIN CERTIFICATE-----\n...',
          aiControlled: false
        },
        privateKey: {
          type: 'string',
          inputType: 'textarea',
          required: true,
          label: 'Private Key',
          description: 'Private key in PEM format',
          placeholder: '-----BEGIN PRIVATE KEY-----\n...',
          aiControlled: false
        }
      },
      outputSchema: {}
    }
  ],

  supported_triggers: []
};
