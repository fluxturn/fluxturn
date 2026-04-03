// npm Connector Definition
// Converted from n8n npm node

import { ConnectorDefinition } from '../../shared';

export const NPM_CONNECTOR: ConnectorDefinition = {
  name: 'npm',
  display_name: 'npm',
  category: 'development',
  description: 'Query npm registry for package information and manage distribution tags',
  auth_type: 'none',
  complexity: 'Simple',
  verified: true,

  auth_fields: [],

  endpoints: {
    base_url: 'https://registry.npmjs.org',
    package: '/{packageName}',
    dist_tags: '/-/package/{packageName}/dist-tags'
  },

  webhook_support: false,
  rate_limits: {
    requests_per_minute: 60
  },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'get_metadata',
      name: 'Get Package Metadata',
      description: 'Returns all the metadata for a package at a specific version',
      category: 'Package',
      icon: 'info',
      verified: false,
      api: {
        endpoint: '/{packageName}/{packageVersion}',
        method: 'GET',
        baseUrl: 'https://registry.npmjs.org',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        packageName: {
          type: 'string',
          required: true,
          label: 'Package Name',
          placeholder: 'express',
          description: 'Name of the npm package',
          inputType: 'text',
          aiControlled: false
        },
        packageVersion: {
          type: 'string',
          required: true,
          label: 'Package Version',
          placeholder: 'latest',
          description: 'Package version or tag',
          default: 'latest',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        name: {
          type: 'string',
          description: 'Package name'
        },
        version: {
          type: 'string',
          description: 'Package version'
        },
        description: {
          type: 'string',
          description: 'Package description'
        }
      }
    },
    {
      id: 'get_versions',
      name: 'Get Package Versions',
      description: 'Returns all the versions for a package',
      category: 'Package',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/{packageName}',
        method: 'GET',
        baseUrl: 'https://registry.npmjs.org',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        packageName: {
          type: 'string',
          required: true,
          label: 'Package Name',
          placeholder: 'express',
          description: 'Name of the npm package',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        versions: {
          type: 'array',
          description: 'List of all versions with published dates'
        }
      }
    },
    {
      id: 'search',
      name: 'Search Packages',
      description: 'Search for packages in the npm registry',
      category: 'Package',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/-/v1/search',
        method: 'GET',
        baseUrl: 'https://registry.npmjs.org',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Query',
          placeholder: 'react hooks',
          description: 'The query text used to search for packages',
          inputType: 'text',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          description: 'Max number of results to return',
          default: 10,
          min: 1,
          max: 100,
          aiControlled: false
        },
        offset: {
          type: 'number',
          required: false,
          label: 'Offset',
          description: 'Offset to return results from',
          default: 0,
          min: 0,
          aiControlled: false
        }
      },
      outputSchema: {
        packages: {
          type: 'array',
          description: 'Search results'
        }
      }
    },
    {
      id: 'dist_tag_get_all',
      name: 'Get Distribution Tags',
      description: 'Returns all the dist-tags for a package',
      category: 'Distribution Tag',
      icon: 'tag',
      verified: false,
      api: {
        endpoint: '/-/package/{packageName}/dist-tags',
        method: 'GET',
        baseUrl: 'https://registry.npmjs.org',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        packageName: {
          type: 'string',
          required: true,
          label: 'Package Name',
          placeholder: 'express',
          description: 'Name of the npm package',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        tags: {
          type: 'object',
          description: 'Distribution tags object'
        }
      }
    },
    {
      id: 'dist_tag_update',
      name: 'Update Distribution Tag',
      description: 'Update a dist-tag for a package',
      category: 'Distribution Tag',
      icon: 'edit',
      verified: false,
      api: {
        endpoint: '/-/package/{packageName}/dist-tags/{distTagName}',
        method: 'PUT',
        baseUrl: 'https://registry.npmjs.org',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        packageName: {
          type: 'string',
          required: true,
          label: 'Package Name',
          placeholder: 'express',
          description: 'Name of the npm package',
          inputType: 'text',
          aiControlled: false
        },
        distTagName: {
          type: 'string',
          required: true,
          label: 'Distribution Tag Name',
          placeholder: 'latest',
          description: 'Tag name to update',
          default: 'latest',
          inputType: 'text',
          aiControlled: false
        },
        packageVersion: {
          type: 'string',
          required: true,
          label: 'Package Version',
          placeholder: '1.0.0',
          description: 'Version to set for the tag',
          inputType: 'text',
          aiControlled: false
        }
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the operation succeeded'
        }
      }
    }
  ],

  supported_triggers: []
};
