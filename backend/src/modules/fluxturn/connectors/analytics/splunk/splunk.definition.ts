// Splunk Connector
// Complete implementation matching Splunk Enterprise API

import { ConnectorDefinition } from '../../shared';

export const SPLUNK_CONNECTOR: ConnectorDefinition = {
  name: 'splunk',
  display_name: 'Splunk',
  category: 'analytics',
  description: 'Search, monitor and analyze machine-generated big data via Splunk Enterprise',
  auth_type: 'bearer_token',
  auth_fields: [
    {
      key: 'authToken',
      label: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Splunk authentication token',
      description: 'Your Splunk API authentication token',
      helpUrl: 'https://docs.splunk.com/Documentation/Splunk/latest/Security/Setupauthenticationwithtokens',
      helpText: 'How to create an authentication token'
    },
    {
      key: 'baseUrl',
      label: 'Base URL',
      type: 'string',
      required: true,
      placeholder: 'https://localhost:8089',
      description: 'Protocol, domain and port of your Splunk instance',
      helpText: 'Include the protocol (https://) and port (typically 8089)'
    },
    {
      key: 'allowUnauthorizedCerts',
      label: 'Allow Self-Signed Certificates',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Whether to connect even if SSL certificate validation is not possible'
    }
  ],
  endpoints: {
    base_url: '{baseUrl}',
    alerts: {
      fired_alerts: '/services/alerts/fired_alerts',
      metric_alerts: '/services/alerts/metric_alerts'
    },
    search: {
      jobs: '/services/search/jobs',
      job_detail: '/services/search/jobs/{jobId}',
      results: '/services/search/jobs/{jobId}/results'
    },
    reports: {
      saved_searches: '/services/saved/searches',
      search_detail: '/services/saved/searches/{reportId}'
    },
    users: {
      authentication: '/services/authentication/users',
      user_detail: '/services/authentication/users/{userId}'
    }
  },
  webhook_support: false,
  rate_limits: {
    requests_per_minute: 60
  },
  sandbox_available: false,

  supported_actions: [
    // Alert Operations
    {
      id: 'get_fired_alerts',
      name: 'Get Fired Alerts',
      description: 'Retrieve a fired alerts report',
      category: 'Alerts',
      icon: 'alert-triangle',
      api: {
        endpoint: '/services/alerts/fired_alerts',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramMapping: {}
      },
      inputSchema: {},
      outputSchema: {
        alerts: { type: 'array', description: 'Array of fired alerts' }
      }
    },
    {
      id: 'get_alert_metrics',
      name: 'Get Alert Metrics',
      description: 'Retrieve alert metrics',
      category: 'Alerts',
      icon: 'bar-chart',
      api: {
        endpoint: '/services/alerts/metric_alerts',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {},
      outputSchema: {
        metrics: { type: 'object', description: 'Alert metrics data' }
      }
    },

    // Search Operations
    {
      id: 'create_search_job',
      name: 'Create Search Job',
      description: 'Create a new search job',
      category: 'Search',
      icon: 'search',
      api: {
        endpoint: '/services/search/jobs',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramMapping: {
          search: 'search',
          earliestTime: 'earliest_time',
          latestTime: 'latest_time',
          indexEarliest: 'index_earliest',
          indexLatest: 'index_latest'
        }
      },
      inputSchema: {
        search: {
          type: 'string',
          required: true,
          label: 'Query',
          description: 'Search language string to execute in Splunk Search Processing Language',
          placeholder: 'search index=_internal | stats count by source',
          inputType: 'textarea',
          aiControlled: false
        },
        earliestTime: {
          type: 'string',
          required: false,
          label: 'Earliest Time',
          description: 'The earliest cut-off for the search (inclusive)',
          placeholder: '2024-01-01T00:00:00',
          aiControlled: false
        },
        latestTime: {
          type: 'string',
          required: false,
          label: 'Latest Time',
          description: 'The latest cut-off for the search (inclusive)',
          placeholder: '2024-01-31T23:59:59',
          aiControlled: false
        },
        indexEarliest: {
          type: 'string',
          required: false,
          label: 'Earliest Index',
          description: 'The earliest index time for the search (inclusive)',
          placeholder: '2024-01-01T00:00:00',
          aiControlled: false
        },
        indexLatest: {
          type: 'string',
          required: false,
          label: 'Latest Index',
          description: 'The latest index time for the search (inclusive)',
          placeholder: '2024-01-31T23:59:59',
          aiControlled: false
        },
        adhocSearchLevel: {
          type: 'select',
          required: false,
          label: 'Ad Hoc Search Level',
          default: 'verbose',
          options: [
            { label: 'Fast', value: 'fast' },
            { label: 'Smart', value: 'smart' },
            { label: 'Verbose', value: 'verbose' }
          ],
          description: 'Performance vs completeness trade-off',
          aiControlled: false
        },
        execMode: {
          type: 'select',
          required: false,
          label: 'Execution Mode',
          default: 'blocking',
          options: [
            { label: 'Blocking', value: 'blocking' },
            { label: 'Normal', value: 'normal' },
            { label: 'One Shot', value: 'oneshot' }
          ],
          description: 'How the search should execute',
          aiControlled: false
        },
        maxTime: {
          type: 'number',
          required: false,
          label: 'Max Time',
          description: 'Number of seconds to run this search before finalizing (0 = never finalize)',
          default: 0,
          min: 0,
          aiControlled: false
        },
        timeout: {
          type: 'number',
          required: false,
          label: 'Timeout',
          description: 'Number of seconds to keep this search after processing has stopped',
          default: 86400,
          min: 0,
          aiControlled: false
        }
      },
      outputSchema: {
        job: { type: 'object', description: 'Search job details' },
        sid: { type: 'string', description: 'Search job ID' }
      }
    },
    {
      id: 'get_search_job',
      name: 'Get Search Job',
      description: 'Retrieve a search job',
      category: 'Search',
      icon: 'file-text',
      api: {
        endpoint: '/services/search/jobs/{searchJobId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        searchJobId: {
          type: 'string',
          required: true,
          label: 'Search Job ID',
          description: 'ID of the search job to retrieve',
          placeholder: '1234567890.12345',
          aiControlled: false
        }
      },
      outputSchema: {
        job: { type: 'object', description: 'Search job details' }
      }
    },
    {
      id: 'get_all_search_jobs',
      name: 'Get All Search Jobs',
      description: 'Retrieve many search jobs',
      category: 'Search',
      icon: 'list',
      api: {
        endpoint: '/services/search/jobs',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          description: 'Max number of results to return',
          min: 1,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        jobs: { type: 'array', description: 'Array of search jobs' }
      }
    },
    {
      id: 'get_search_results',
      name: 'Get Search Results',
      description: 'Get the result of a search job',
      category: 'Search',
      icon: 'database',
      api: {
        endpoint: '/services/search/jobs/{searchJobId}/results',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        searchJobId: {
          type: 'string',
          required: true,
          label: 'Search Job ID',
          description: 'ID of the search job',
          placeholder: '1234567890.12345',
          aiControlled: false
        },
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          description: 'Max number of results to return',
          min: 1,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        keyValueMatch: {
          type: 'object',
          required: false,
          label: 'Key-Value Match',
          description: 'Filter results by key-value pair',
          placeholder: '{ "key": "user", "value": "john" }',
          aiControlled: false
        }
      },
      outputSchema: {
        results: { type: 'array', description: 'Array of search results' }
      }
    },
    {
      id: 'delete_search_job',
      name: 'Delete Search Job',
      description: 'Delete a search job',
      category: 'Search',
      icon: 'trash-2',
      api: {
        endpoint: '/services/search/jobs/{searchJobId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        searchJobId: {
          type: 'string',
          required: true,
          label: 'Search Job ID',
          description: 'ID of the search job to delete',
          placeholder: '1234567890.12345',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // Report Operations
    {
      id: 'create_report',
      name: 'Create Report',
      description: 'Create a search report from a search job',
      category: 'Reports',
      icon: 'file-plus',
      api: {
        endpoint: '/services/saved/searches',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        searchJobId: {
          type: 'string',
          required: true,
          label: 'Search Job ID',
          description: 'ID of the search job to create a report from',
          placeholder: '1234567890.12345',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'The name of the report',
          placeholder: 'Daily Error Report',
          aiControlled: false
        }
      },
      outputSchema: {
        report: { type: 'object', description: 'Created report details' }
      }
    },
    {
      id: 'get_report',
      name: 'Get Report',
      description: 'Retrieve a search report',
      category: 'Reports',
      icon: 'file',
      api: {
        endpoint: '/services/saved/searches/{reportId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        reportId: {
          type: 'string',
          required: true,
          label: 'Report ID',
          description: 'ID or name of the report to retrieve',
          placeholder: 'my-saved-search',
          aiControlled: false
        }
      },
      outputSchema: {
        report: { type: 'object', description: 'Report details' }
      }
    },
    {
      id: 'get_all_reports',
      name: 'Get All Reports',
      description: 'Retrieve many search reports',
      category: 'Reports',
      icon: 'folder',
      api: {
        endpoint: '/services/saved/searches',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          description: 'Max number of results to return',
          min: 1,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        },
        addOrphanField: {
          type: 'boolean',
          required: false,
          label: 'Add Orphan Field',
          default: false,
          description: 'Include a boolean value for each saved search to show whether it has no valid owner',
          aiControlled: false
        },
        listDefaultActionArgs: {
          type: 'boolean',
          required: false,
          label: 'List Default Actions',
          default: false,
          description: 'Include default action arguments in response',
          aiControlled: false
        }
      },
      outputSchema: {
        reports: { type: 'array', description: 'Array of reports' }
      }
    },
    {
      id: 'delete_report',
      name: 'Delete Report',
      description: 'Delete a search report',
      category: 'Reports',
      icon: 'x-circle',
      api: {
        endpoint: '/services/saved/searches/{reportId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        reportId: {
          type: 'string',
          required: true,
          label: 'Report ID',
          description: 'ID or name of the report to delete',
          placeholder: 'my-saved-search',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    },

    // User Operations
    {
      id: 'create_user',
      name: 'Create User',
      description: 'Create a new user',
      category: 'Users',
      icon: 'user-plus',
      api: {
        endpoint: '/services/authentication/users',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        paramMapping: {
          name: 'name',
          password: 'password',
          roles: 'roles'
        }
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'Login name of the user',
          placeholder: 'john.doe',
          aiControlled: false
        },
        password: {
          type: 'string',
          required: true,
          label: 'Password',
          description: 'Password for the user',
          inputType: 'password',
          aiControlled: false
        },
        roles: {
          type: 'array',
          required: true,
          label: 'Roles',
          description: 'Comma-separated list of roles to assign to the user',
          placeholder: '["user", "admin"]',
          default: ['user'],
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          description: 'Email address of the user',
          placeholder: 'john.doe@example.com',
          aiControlled: false
        },
        realname: {
          type: 'string',
          required: false,
          label: 'Full Name',
          description: 'Full name of the user',
          placeholder: 'John Doe',
          aiControlled: false
        }
      },
      outputSchema: {
        user: { type: 'object', description: 'Created user details' }
      }
    },
    {
      id: 'get_user',
      name: 'Get User',
      description: 'Retrieve a user',
      category: 'Users',
      icon: 'user',
      api: {
        endpoint: '/services/authentication/users/{userId}',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'Login name of the user',
          placeholder: 'john.doe',
          aiControlled: false
        }
      },
      outputSchema: {
        user: { type: 'object', description: 'User details' }
      }
    },
    {
      id: 'get_all_users',
      name: 'Get All Users',
      description: 'Retrieve many users',
      category: 'Users',
      icon: 'users',
      api: {
        endpoint: '/services/authentication/users',
        method: 'GET',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        returnAll: {
          type: 'boolean',
          required: false,
          label: 'Return All',
          default: false,
          description: 'Whether to return all results or only up to a given limit',
          aiControlled: false
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          default: 50,
          description: 'Max number of results to return',
          min: 1,
          displayOptions: {
            show: {
              returnAll: [false]
            }
          },
          aiControlled: false
        }
      },
      outputSchema: {
        users: { type: 'array', description: 'Array of users' }
      }
    },
    {
      id: 'update_user',
      name: 'Update User',
      description: 'Update a user',
      category: 'Users',
      icon: 'edit',
      api: {
        endpoint: '/services/authentication/users/{userId}',
        method: 'POST',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'Login name of the user',
          placeholder: 'john.doe',
          aiControlled: false
        },
        email: {
          type: 'string',
          required: false,
          label: 'Email',
          description: 'Email address',
          placeholder: 'john.doe@example.com',
          aiControlled: false
        },
        realname: {
          type: 'string',
          required: false,
          label: 'Full Name',
          description: 'Full name of the user',
          placeholder: 'John Doe',
          aiControlled: false
        },
        roles: {
          type: 'array',
          required: false,
          label: 'Roles',
          description: 'Array of role names to assign',
          placeholder: '["user", "power"]',
          aiControlled: false
        }
      },
      outputSchema: {
        user: { type: 'object', description: 'Updated user details' }
      }
    },
    {
      id: 'delete_user',
      name: 'Delete User',
      description: 'Delete a user',
      category: 'Users',
      icon: 'user-minus',
      api: {
        endpoint: '/services/authentication/users/{userId}',
        method: 'DELETE',
        baseUrl: '{baseUrl}',
        headers: {
          'Authorization': 'Bearer {authToken}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      inputSchema: {
        userId: {
          type: 'string',
          required: true,
          label: 'User ID',
          description: 'Login name of the user to delete',
          placeholder: 'john.doe',
          aiControlled: false
        }
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Whether deletion was successful' }
      }
    }
  ],

  supported_triggers: []
};
