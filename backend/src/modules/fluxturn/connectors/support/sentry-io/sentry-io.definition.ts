// Sentry.io Connector Definition
// Complete implementation matching n8n SentryIo node

import { ConnectorDefinition } from '../../shared';

export const SENTRY_IO_CONNECTOR: ConnectorDefinition = {
  name: 'sentry_io',
  display_name: 'Sentry.io',
  category: 'support',
  description: 'Error tracking and performance monitoring platform - manage events, issues, projects, releases, organizations, and teams',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'token',
      label: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'Your Sentry Auth Token',
      description: 'Generate from Settings > Auth Tokens',
      helpUrl: 'https://docs.sentry.io/api/auth/'
    }
  ],
  endpoints: {
    base_url: 'https://sentry.io/api/0',
    events: '/projects/{organizationSlug}/{projectSlug}/events',
    issues: '/projects/{organizationSlug}/{projectSlug}/issues',
    organizations: '/organizations',
    projects: '/projects',
    releases: '/organizations/{organizationSlug}/releases',
    teams: '/organizations/{organizationSlug}/teams'
  },
  webhook_support: false,
  rate_limits: { requests_per_minute: 600 },
  sandbox_available: false,

  supported_actions: [
    // EVENT ACTIONS
    {
      id: 'get_event',
      name: 'Get Event',
      description: 'Get an event by ID',
      category: 'Events',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the event belongs to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project the event belongs to',
          aiControlled: false
        },
        eventId: {
          type: 'string',
          required: true,
          label: 'Event ID',
          description: 'The ID of the event to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_events',
      name: 'Get All Events',
      description: 'Get all events for a project',
      category: 'Events',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the events belong to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project the events belong to',
          aiControlled: false
        },
        full: {
          type: 'boolean',
          label: 'Full',
          description: 'Whether the event payload will include the full event body, including the stack trace',
          default: true,
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },

    // ISSUE ACTIONS
    {
      id: 'get_issue',
      name: 'Get Issue',
      description: 'Get an issue by ID',
      category: 'Issues',
      inputSchema: {
        issueId: {
          type: 'string',
          required: true,
          label: 'Issue ID',
          description: 'The ID of the issue to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_issues',
      name: 'Get All Issues',
      description: 'Get all issues for a project',
      category: 'Issues',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the issues belong to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project the issues belong to',
          aiControlled: false
        },
        statsPeriod: {
          type: 'select',
          label: 'Stats Period',
          description: 'Time period of stats',
          options: [
            { label: '24 Hours', value: '24h' },
            { label: '14 Days', value: '14d' }
          ],
          aiControlled: false
        },
        shortIdLookup: {
          type: 'boolean',
          label: 'Short ID Lookup',
          description: 'Whether short IDs are looked up by this function as well',
          default: true,
          aiControlled: false
        },
        query: {
          type: 'string',
          label: 'Query',
          description: 'An optional Sentry structured search query. If not provided, an implied "is:unresolved" is assumed',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },
    {
      id: 'update_issue',
      name: 'Update Issue',
      description: 'Update an issue',
      category: 'Issues',
      inputSchema: {
        issueId: {
          type: 'string',
          required: true,
          label: 'Issue ID',
          description: 'The ID of the issue to update',
          aiControlled: false
        },
        status: {
          type: 'select',
          label: 'Status',
          description: 'The new status for the issue',
          options: [
            { label: 'Resolved', value: 'resolved' },
            { label: 'Unresolved', value: 'unresolved' },
            { label: 'Ignored', value: 'ignored' },
            { label: 'Resolved Next Release', value: 'resolvedInNextRelease' }
          ],
          aiControlled: false
        },
        assignedTo: {
          type: 'string',
          label: 'Assigned To',
          description: 'The actor ID (or username) of the user or team that should be assigned to this issue',
          aiControlled: false
        },
        hasSeen: {
          type: 'boolean',
          label: 'Has Seen',
          description: 'Whether this API call is invoked with a user context this allows changing of the flag that indicates if the user has seen the event',
          aiControlled: false
        },
        isBookmarked: {
          type: 'boolean',
          label: 'Is Bookmarked',
          description: 'Whether this API call is invoked with a user context this allows changing of the bookmark flag',
          aiControlled: false
        },
        isSubscribed: {
          type: 'boolean',
          label: 'Is Subscribed',
          description: 'Whether the user is subscribed to the issue',
          aiControlled: false
        },
        isPublic: {
          type: 'boolean',
          label: 'Is Public',
          description: 'Whether to set the issue to public or private',
          aiControlled: false
        }
      }
    },
    {
      id: 'delete_issue',
      name: 'Delete Issue',
      description: 'Delete an issue',
      category: 'Issues',
      inputSchema: {
        issueId: {
          type: 'string',
          required: true,
          label: 'Issue ID',
          description: 'The ID of the issue to delete',
          aiControlled: false
        }
      }
    },

    // ORGANIZATION ACTIONS
    {
      id: 'get_organization',
      name: 'Get Organization',
      description: 'Get an organization by slug',
      category: 'Organizations',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_organizations',
      name: 'Get All Organizations',
      description: 'Get all organizations',
      category: 'Organizations',
      inputSchema: {
        member: {
          type: 'boolean',
          label: 'Member',
          description: 'Whether to restrict results to organizations which you have membership',
          aiControlled: false
        },
        owner: {
          type: 'boolean',
          label: 'Owner',
          description: 'Whether to restrict results to organizations which you are the owner',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },
    {
      id: 'create_organization',
      name: 'Create Organization',
      description: 'Create a new organization',
      category: 'Organizations',
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'The name of the organization',
          aiControlled: true,
          aiDescription: 'Generate an appropriate organization name'
        },
        agreeTerms: {
          type: 'boolean',
          required: true,
          label: 'Agree to Terms',
          description: 'Whether you agree to the applicable terms of service and privacy policy of Sentry.io',
          default: false,
          aiControlled: false
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'The unique URL slug for this organization. If not provided a slug is automatically generated based on the name',
          aiControlled: false
        }
      }
    },
    {
      id: 'update_organization',
      name: 'Update Organization',
      description: 'Update an organization',
      category: 'Organizations',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'The new name of the organization',
          aiControlled: true,
          aiDescription: 'Generate an appropriate organization name'
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'The new URL slug for this organization',
          aiControlled: false
        }
      }
    },

    // PROJECT ACTIONS
    {
      id: 'create_project',
      name: 'Create Project',
      description: 'Create a new project',
      category: 'Projects',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the project should be created for',
          aiControlled: false
        },
        teamSlug: {
          type: 'string',
          required: true,
          label: 'Team Slug',
          description: 'The slug of the team to create a new project for',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'The name for the new project',
          aiControlled: true,
          aiDescription: 'Generate an appropriate project name'
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'Optionally a slug for the new project. If not provided a slug is generated from the name',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_project',
      name: 'Get Project',
      description: 'Get a project by slug',
      category: 'Projects',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the project belongs to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project to retrieve',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_projects',
      name: 'Get All Projects',
      description: 'Get all projects',
      category: 'Projects',
      inputSchema: {
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },
    {
      id: 'update_project',
      name: 'Update Project',
      description: 'Update a project',
      category: 'Projects',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the project belongs to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'The new name for the project',
          aiControlled: true,
          aiDescription: 'Generate an appropriate project name'
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'The new slug for the project',
          aiControlled: false
        },
        platform: {
          type: 'string',
          label: 'Platform',
          description: 'The new platform for the project',
          aiControlled: false
        },
        isBookmarked: {
          type: 'boolean',
          label: 'Bookmarked',
          description: 'Whether the project is bookmarked',
          aiControlled: false
        }
      }
    },
    {
      id: 'delete_project',
      name: 'Delete Project',
      description: 'Delete a project',
      category: 'Projects',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the project belongs to',
          aiControlled: false
        },
        projectSlug: {
          type: 'string',
          required: true,
          label: 'Project Slug',
          description: 'The slug of the project to delete',
          aiControlled: false
        }
      }
    },

    // RELEASE ACTIONS
    {
      id: 'create_release',
      name: 'Create Release',
      description: 'Create a new release',
      category: 'Releases',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the release belongs to',
          aiControlled: false
        },
        version: {
          type: 'string',
          required: true,
          label: 'Version',
          description: 'A version identifier for this release. Can be a version number, a commit hash etc',
          aiControlled: false
        },
        url: {
          type: 'string',
          required: true,
          label: 'URL',
          description: 'A URL that points to the release. This can be the path to an online interface to the sourcecode for instance',
          aiControlled: false
        },
        projects: {
          type: 'array',
          required: true,
          label: 'Projects',
          description: 'A list of project slugs that are involved in this release',
          aiControlled: false
        },
        dateReleased: {
          type: 'string',
          label: 'Date Released',
          description: 'An optional date that indicates when the release went live. If not provided the current time is assumed',
          aiControlled: false
        },
        commits: {
          type: 'array',
          label: 'Commits',
          description: 'An optional list of commit data to be associated with the release',
          aiControlled: false
        },
        refs: {
          type: 'array',
          label: 'Refs',
          description: 'An optional way to indicate the start and end commits for each repository included in a release',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_release',
      name: 'Get Release',
      description: 'Get a release by version',
      category: 'Releases',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the release belongs to',
          aiControlled: false
        },
        version: {
          type: 'string',
          required: true,
          label: 'Version',
          description: 'The version identifier of the release',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_releases',
      name: 'Get All Releases',
      description: 'Get all releases for an organization',
      category: 'Releases',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the releases belong to',
          aiControlled: false
        },
        query: {
          type: 'string',
          label: 'Query',
          description: 'This parameter can be used to create a "starts with" filter for the version',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },
    {
      id: 'update_release',
      name: 'Update Release',
      description: 'Update a release',
      category: 'Releases',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the release belongs to',
          aiControlled: false
        },
        version: {
          type: 'string',
          required: true,
          label: 'Version',
          description: 'A version identifier for this release',
          aiControlled: false
        },
        url: {
          type: 'string',
          label: 'URL',
          description: 'A URL that points to the release',
          aiControlled: false
        },
        dateReleased: {
          type: 'string',
          label: 'Date Released',
          description: 'An optional date that indicates when the release went live',
          aiControlled: false
        },
        commits: {
          type: 'array',
          label: 'Commits',
          description: 'An optional list of commit data to be associated with the release',
          aiControlled: false
        },
        refs: {
          type: 'array',
          label: 'Refs',
          description: 'An optional way to indicate the start and end commits for each repository',
          aiControlled: false
        }
      }
    },
    {
      id: 'delete_release',
      name: 'Delete Release',
      description: 'Delete a release',
      category: 'Releases',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the release belongs to',
          aiControlled: false
        },
        version: {
          type: 'string',
          required: true,
          label: 'Version',
          description: 'The version identifier of the release to delete',
          aiControlled: false
        }
      }
    },

    // TEAM ACTIONS
    {
      id: 'create_team',
      name: 'Create Team',
      description: 'Create a new team',
      category: 'Teams',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the team belongs to',
          aiControlled: false
        },
        name: {
          type: 'string',
          required: true,
          label: 'Name',
          description: 'The name of the team',
          aiControlled: true,
          aiDescription: 'Generate an appropriate team name'
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'The optional slug for this team. If not provided it will be auto generated from the name',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_team',
      name: 'Get Team',
      description: 'Get a team by slug',
      category: 'Teams',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the team belongs to',
          aiControlled: false
        },
        teamSlug: {
          type: 'string',
          required: true,
          label: 'Team Slug',
          description: 'The slug of the team to get',
          aiControlled: false
        }
      }
    },
    {
      id: 'get_all_teams',
      name: 'Get All Teams',
      description: 'Get all teams for an organization',
      category: 'Teams',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization for which the teams should be listed',
          aiControlled: false
        },
        limit: {
          type: 'number',
          label: 'Limit',
          description: 'Max number of results to return',
          default: 100,
          aiControlled: false
        }
      }
    },
    {
      id: 'update_team',
      name: 'Update Team',
      description: 'Update a team',
      category: 'Teams',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the team belongs to',
          aiControlled: false
        },
        teamSlug: {
          type: 'string',
          required: true,
          label: 'Team Slug',
          description: 'The slug of the team to update',
          aiControlled: false
        },
        name: {
          type: 'string',
          label: 'Name',
          description: 'The new name of the team',
          aiControlled: true,
          aiDescription: 'Generate an appropriate team name'
        },
        slug: {
          type: 'string',
          label: 'Slug',
          description: 'The new slug of the team. Must be unique and available',
          aiControlled: false
        }
      }
    },
    {
      id: 'delete_team',
      name: 'Delete Team',
      description: 'Delete a team',
      category: 'Teams',
      inputSchema: {
        organizationSlug: {
          type: 'string',
          required: true,
          label: 'Organization Slug',
          description: 'The slug of the organization the team belongs to',
          aiControlled: false
        },
        teamSlug: {
          type: 'string',
          required: true,
          label: 'Team Slug',
          description: 'The slug of the team to delete',
          aiControlled: false
        }
      }
    }
  ],

  supported_triggers: []
};
