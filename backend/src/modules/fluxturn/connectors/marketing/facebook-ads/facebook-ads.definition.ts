// Facebook Ads Connector
// Comprehensive implementation based on n8n FacebookGraphApi and FacebookLeadAds

import { ConnectorDefinition } from '../../shared';

export const FACEBOOK_ADS_CONNECTOR: ConnectorDefinition = {
    name: 'facebook_ads',
    display_name: 'Facebook Ads',
    category: 'marketing',
    description: 'Comprehensive Facebook Marketing API integration for managing ads, campaigns, ad sets, leads, insights, and more',
    auth_type: 'bearer_token',
    auth_fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'Your Facebook Access Token',
        description: 'Long-lived access token for Facebook Marketing API'
      },
      {
        key: 'appId',
        label: 'App ID',
        type: 'string',
        required: true,
        placeholder: 'Your Facebook App ID',
        description: 'Facebook App ID from your developer dashboard'
      },
      {
        key: 'appSecret',
        label: 'App Secret',
        type: 'password',
        required: true,
        placeholder: 'Your Facebook App Secret',
        description: 'Facebook App Secret from your developer dashboard'
      },
      {
        key: 'adAccountId',
        label: 'Ad Account ID',
        type: 'string',
        required: true,
        placeholder: '123456789',
        description: 'Your Facebook Ad Account ID (without act_ prefix)'
      }
    ],
    oauth_config: {
      authorization_url: 'https://www.facebook.com/v23.0/dialog/oauth',
      token_url: 'https://graph.facebook.com/v23.0/oauth/access_token',
      scopes: [
        'ads_management',
        'ads_read',
        'business_management',
        'leads_retrieval',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_ads',
        'read_insights'
      ]
    },
    endpoints: {
      base_url: 'https://graph.facebook.com',
      video_base_url: 'https://graph-video.facebook.com',
      default_version: 'v23.0',
      ad_account: '/v23.0/act_{ad_account_id}',
      campaigns: '/v23.0/act_{ad_account_id}/campaigns',
      adsets: '/v23.0/act_{ad_account_id}/adsets',
      ads: '/v23.0/act_{ad_account_id}/ads',
      leads: '/v23.0/{leadgen_id}',
      leadgen_forms: '/v23.0/{page_id}/leadgen_forms',
      insights: '/v23.0/{object_id}/insights',
      custom_audiences: '/v23.0/act_{ad_account_id}/customaudiences'
    },
    webhook_support: true,
    rate_limits: {
      requests_per_hour: 200,
      requests_per_minute: 50
    },
    sandbox_available: true,
    verified: false,
    supported_actions: [
      // ========== HTTP Request Action ==========
      {
        id: 'http_request',
        name: 'HTTP Request',
        description: 'Make any custom HTTP request to Facebook Graph API',
        category: 'HTTP',
        icon: 'globe',
        verified: false,
        api: {
          endpoint: '/{version}/{resource}',
          method: '{method}',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            resource: 'resource',
            method: 'method',
            queryParameters: 'query',
            body: 'body',
            version: 'version'
          }
        },
        inputSchema: {
          hostUrl: {
            type: 'select',
            label: 'Host URL',
            options: [
              { label: 'Default', value: 'graph.facebook.com' },
              { label: 'Video Uploads', value: 'graph-video.facebook.com' }
            ],
            default: 'graph.facebook.com',
            description: 'The Host URL of the request. Almost all requests use graph.facebook.com. Video uploads use graph-video.facebook.com.',
            required: true,
            aiControlled: false
          },
          method: {
            type: 'select',
            required: true,
            label: 'HTTP Request Method',
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'DELETE', value: 'DELETE' }
            ],
            default: 'GET',
            description: 'The HTTP Method to be used for the request',
            aiControlled: false
          },
          version: {
            type: 'select',
            label: 'Graph API Version',
            options: [
              { label: 'Default (v23.0)', value: '' },
              { label: 'v23.0', value: 'v23.0' },
              { label: 'v22.0', value: 'v22.0' },
              { label: 'v21.0', value: 'v21.0' },
              { label: 'v20.0', value: 'v20.0' },
              { label: 'v19.0', value: 'v19.0' },
              { label: 'v18.0', value: 'v18.0' }
            ],
            default: '',
            description: 'The version of the Graph API to be used in the request',
            required: true,
            aiControlled: false
          },
          node: {
            type: 'string',
            required: true,
            label: 'Node',
            placeholder: 'act_123456789/campaigns',
            description: 'The node on which to operate. For example: act_{ad_account_id}/campaigns, {campaign_id}/insights',
            aiControlled: false
          },
          edge: {
            type: 'string',
            label: 'Edge',
            placeholder: 'insights',
            description: 'Edge of the node on which to operate. Edges represent collections attached to the node.',
            aiControlled: false
          },
          sendBinaryData: {
            type: 'boolean',
            label: 'Send Binary File',
            default: false,
            description: 'Whether binary data should be sent as body',
            displayOptions: {
              show: {
                method: ['POST', 'PUT']
              }
            },
            aiControlled: false
          },
          binaryPropertyName: {
            type: 'string',
            label: 'Input Binary Field',
            placeholder: 'file:data',
            description: 'The name of the input binary field containing the file to be uploaded',
            displayOptions: {
              show: {
                sendBinaryData: [true],
                method: ['POST', 'PUT']
              }
            },
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            placeholder: 'Add option',
            default: {},
            description: 'Additional options',
            aiControlled: false,
            properties: {
              fields: {
                type: 'fixedCollection',
                label: 'Fields',
                placeholder: 'Add Field',
                typeOptions: {
                  multipleValues: true
                },
                displayOptions: {
                  show: {
                    '/method': ['GET']
                  }
                },
                description: 'The list of fields to request in the GET request',
                aiControlled: false,
                items: {
                  field: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        label: 'Name',
                        default: '',
                        description: 'Name of the field',
                        aiControlled: false
                      }
                    }
                  }
                }
              },
              queryParameters: {
                type: 'fixedCollection',
                label: 'Query Parameters',
                placeholder: 'Add Parameter',
                typeOptions: {
                  multipleValues: true
                },
                description: 'The query parameters to send',
                aiControlled: false,
                items: {
                  parameter: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        label: 'Name',
                        default: '',
                        description: 'Name of the parameter',
                        aiControlled: false
                      },
                      value: {
                        type: 'string',
                        label: 'Value',
                        default: '',
                        description: 'Value of the parameter',
                        aiControlled: false
                      }
                    }
                  }
                }
              },
              queryParametersJson: {
                type: 'json',
                label: 'Query Parameters JSON',
                default: '{}',
                placeholder: '{"field_name": "field_value"}',
                description: 'The query parameters to send, defined as a JSON object',
                aiControlled: false
              }
            }
          }
        },
        outputSchema: {
          result: {
            type: 'object',
            description: 'The response from Facebook Graph API'
          }
        }
      },

      // ========== Campaign Actions ==========
      {
        id: 'get_campaigns',
        name: 'Get Campaigns',
        description: 'Retrieve all ad campaigns from an ad account',
        category: 'Campaigns',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/v23.0/act_{ad_account_id}/campaigns',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adAccountId: 'ad_account_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            placeholder: '123456789',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Campaign fields to retrieve',
            default: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            description: 'Maximum number of campaigns to retrieve',
            aiControlled: false
          }
        },
        outputSchema: {
          campaigns: {
            type: 'array',
            description: 'List of campaigns'
          }
        }
      },
      {
        id: 'get_campaign',
        name: 'Get Campaign',
        description: 'Retrieve details of a specific campaign',
        category: 'Campaigns',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/v23.0/{campaign_id}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            campaignId: 'campaign_id',
            fields: 'fields'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            placeholder: '23845xxxxxx',
            description: 'The Campaign ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Fields to retrieve',
            default: ['id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget', 'created_time', 'updated_time'],
            items: { type: 'string' },
            aiControlled: false
          }
        },
        outputSchema: {
          campaign: {
            type: 'object',
            description: 'Campaign details'
          }
        }
      },
      {
        id: 'create_campaign',
        name: 'Create Campaign',
        description: 'Create a new ad campaign',
        category: 'Campaigns',
        icon: 'plus',
        verified: false,
        api: {
          endpoint: '/v23.0/act_{ad_account_id}/campaigns',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            adAccountId: 'ad_account_id',
            name: 'name',
            objective: 'objective',
            status: 'status',
            special_ad_categories: 'special_ad_categories',
            daily_budget: 'daily_budget',
            lifetime_budget: 'lifetime_budget'
          }
        },
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            placeholder: '123456789',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Campaign Name',
            description: 'Name of the campaign',
            aiControlled: true,
            aiDescription: 'Generate a descriptive campaign name that reflects the campaign objective and target audience'
          },
          objective: {
            type: 'select',
            required: true,
            label: 'Campaign Objective',
            options: [
              { label: 'Brand Awareness', value: 'BRAND_AWARENESS' },
              { label: 'Reach', value: 'REACH' },
              { label: 'Traffic', value: 'LINK_CLICKS' },
              { label: 'Engagement', value: 'POST_ENGAGEMENT' },
              { label: 'App Installs', value: 'APP_INSTALLS' },
              { label: 'Video Views', value: 'VIDEO_VIEWS' },
              { label: 'Lead Generation', value: 'LEAD_GENERATION' },
              { label: 'Messages', value: 'MESSAGES' },
              { label: 'Conversions', value: 'CONVERSIONS' },
              { label: 'Catalog Sales', value: 'CATALOG_SALES' },
              { label: 'Store Visits', value: 'STORE_VISITS' }
            ],
            description: 'The objective of the campaign',
            aiControlled: false
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' }
            ],
            default: 'PAUSED',
            description: 'Campaign status',
            aiControlled: false
          },
          budgetType: {
            type: 'select',
            label: 'Budget Type',
            options: [
              { label: 'Daily Budget', value: 'daily' },
              { label: 'Lifetime Budget', value: 'lifetime' }
            ],
            default: 'daily',
            required: true,
            description: 'Type of budget',
            aiControlled: false
          },
          budget: {
            type: 'number',
            required: true,
            label: 'Budget Amount',
            description: 'Budget in cents (e.g., 1000 = $10.00)',
            min: 100,
            aiControlled: false
          },
          specialAdCategories: {
            type: 'array',
            label: 'Special Ad Categories',
            description: 'Special ad categories (required for certain industries)',
            items: {
              type: 'select',
              options: [
                { label: 'None', value: 'NONE' },
                { label: 'Credit', value: 'CREDIT' },
                { label: 'Employment', value: 'EMPLOYMENT' },
                { label: 'Housing', value: 'HOUSING' },
                { label: 'Social Issues, Elections or Politics', value: 'ISSUES_ELECTIONS_POLITICS' }
              ]
            },
            default: [],
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Campaign ID' },
          success: { type: 'boolean' }
        }
      },
      {
        id: 'update_campaign',
        name: 'Update Campaign',
        description: 'Update an existing campaign',
        category: 'Campaigns',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/v23.0/{campaign_id}',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            campaignId: 'campaign_id',
            name: 'name',
            status: 'status',
            daily_budget: 'daily_budget',
            lifetime_budget: 'lifetime_budget'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            description: 'The Campaign ID to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Campaign Name',
            description: 'New name for the campaign',
            aiControlled: true,
            aiDescription: 'Generate an updated campaign name that reflects the campaign objective and target audience'
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' }
            ],
            description: 'Campaign status',
            aiControlled: false
          },
          budgetType: {
            type: 'select',
            label: 'Budget Type',
            options: [
              { label: 'Daily Budget', value: 'daily' },
              { label: 'Lifetime Budget', value: 'lifetime' }
            ],
            description: 'Type of budget',
            aiControlled: false
          },
          budget: {
            type: 'number',
            label: 'Budget Amount',
            description: 'Budget in cents (e.g., 1000 = $10.00)',
            min: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },
      {
        id: 'delete_campaign',
        name: 'Delete Campaign',
        description: 'Delete a campaign',
        category: 'Campaigns',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/v23.0/{campaign_id}',
          method: 'DELETE',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            campaignId: 'campaign_id'
          }
        },
        inputSchema: {
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            description: 'The Campaign ID to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },

      // ========== Ad Set Actions ==========
      {
        id: 'get_adsets',
        name: 'Get Ad Sets',
        description: 'Retrieve all ad sets from an ad account or campaign',
        category: 'Ad Sets',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/v23.0/{parent_id}/adsets',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            parentId: 'parent_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          parentType: {
            type: 'select',
            required: true,
            label: 'Parent Type',
            options: [
              { label: 'Ad Account', value: 'account' },
              { label: 'Campaign', value: 'campaign' }
            ],
            default: 'account',
            description: 'Get ad sets from ad account or specific campaign',
            aiControlled: false
          },
          adAccountId: {
            type: 'string',
            label: 'Ad Account ID',
            placeholder: '123456789',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            displayOptions: {
              show: {
                parentType: ['account']
              }
            },
            aiControlled: false
          },
          campaignId: {
            type: 'string',
            label: 'Campaign ID',
            placeholder: '23845xxxxxx',
            description: 'The Campaign ID',
            displayOptions: {
              show: {
                parentType: ['campaign']
              }
            },
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Ad set fields to retrieve',
            default: ['id', 'name', 'status', 'daily_budget', 'lifetime_budget', 'targeting', 'optimization_goal'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          adsets: {
            type: 'array',
            description: 'List of ad sets'
          }
        }
      },
      {
        id: 'get_adset',
        name: 'Get Ad Set',
        description: 'Retrieve details of a specific ad set',
        category: 'Ad Sets',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/v23.0/{adset_id}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adsetId: 'adset_id',
            fields: 'fields'
          }
        },
        inputSchema: {
          adsetId: {
            type: 'string',
            required: true,
            label: 'Ad Set ID',
            description: 'The Ad Set ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            description: 'Fields to retrieve',
            default: ['id', 'name', 'status', 'campaign_id', 'daily_budget', 'lifetime_budget', 'targeting', 'optimization_goal', 'billing_event'],
            items: { type: 'string' },
            aiControlled: false
          }
        },
        outputSchema: {
          adset: {
            type: 'object',
            description: 'Ad set details'
          }
        }
      },
      {
        id: 'create_adset',
        name: 'Create Ad Set',
        description: 'Create a new ad set',
        category: 'Ad Sets',
        icon: 'plus',
        verified: false,
        api: {
          endpoint: '/v23.0/act_{ad_account_id}/adsets',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            adAccountId: 'ad_account_id',
            campaign_id: 'campaign_id',
            name: 'name',
            status: 'status',
            daily_budget: 'daily_budget',
            lifetime_budget: 'lifetime_budget',
            billing_event: 'billing_event',
            optimization_goal: 'optimization_goal',
            targeting: 'targeting'
          }
        },
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            placeholder: '123456789',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            aiControlled: false
          },
          campaignId: {
            type: 'string',
            required: true,
            label: 'Campaign ID',
            description: 'Parent campaign ID',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Ad Set Name',
            description: 'Name of the ad set',
            aiControlled: true,
            aiDescription: 'Generate a descriptive ad set name that reflects the targeting and optimization goal'
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' }
            ],
            default: 'PAUSED',
            aiControlled: false
          },
          budgetType: {
            type: 'select',
            label: 'Budget Type',
            options: [
              { label: 'Daily Budget', value: 'daily' },
              { label: 'Lifetime Budget', value: 'lifetime' }
            ],
            default: 'daily',
            required: true,
            aiControlled: false
          },
          budget: {
            type: 'number',
            required: true,
            label: 'Budget Amount',
            description: 'Budget in cents',
            min: 100,
            aiControlled: false
          },
          billingEvent: {
            type: 'select',
            label: 'Billing Event',
            options: [
              { label: 'Impressions', value: 'IMPRESSIONS' },
              { label: 'Link Clicks', value: 'LINK_CLICKS' },
              { label: 'Post Engagement', value: 'POST_ENGAGEMENT' }
            ],
            default: 'IMPRESSIONS',
            aiControlled: false
          },
          optimizationGoal: {
            type: 'select',
            label: 'Optimization Goal',
            options: [
              { label: 'Reach', value: 'REACH' },
              { label: 'Impressions', value: 'IMPRESSIONS' },
              { label: 'Link Clicks', value: 'LINK_CLICKS' },
              { label: 'Post Engagement', value: 'POST_ENGAGEMENT' },
              { label: 'Conversions', value: 'CONVERSIONS' },
              { label: 'Lead Generation', value: 'LEAD_GENERATION' }
            ],
            default: 'REACH',
            aiControlled: false
          },
          targeting: {
            type: 'json',
            label: 'Targeting',
            placeholder: '{"geo_locations": {"countries": ["US"]}}',
            description: 'Targeting specification as JSON',
            required: true,
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Ad Set ID' },
          success: { type: 'boolean' }
        }
      },
      {
        id: 'update_adset',
        name: 'Update Ad Set',
        description: 'Update an existing ad set',
        category: 'Ad Sets',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/v23.0/{adset_id}',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            adsetId: 'adset_id',
            name: 'name',
            status: 'status',
            daily_budget: 'daily_budget',
            lifetime_budget: 'lifetime_budget'
          }
        },
        inputSchema: {
          adsetId: {
            type: 'string',
            required: true,
            label: 'Ad Set ID',
            description: 'The Ad Set ID to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Ad Set Name',
            description: 'New name for the ad set',
            aiControlled: true,
            aiDescription: 'Generate an updated ad set name that reflects the targeting and optimization goal'
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' }
            ],
            aiControlled: false
          },
          budgetType: {
            type: 'select',
            label: 'Budget Type',
            options: [
              { label: 'Daily Budget', value: 'daily' },
              { label: 'Lifetime Budget', value: 'lifetime' }
            ],
            aiControlled: false
          },
          budget: {
            type: 'number',
            label: 'Budget Amount',
            description: 'Budget in cents',
            min: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },
      {
        id: 'delete_adset',
        name: 'Delete Ad Set',
        description: 'Delete an ad set',
        category: 'Ad Sets',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/v23.0/{adset_id}',
          method: 'DELETE',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adsetId: 'adset_id'
          }
        },
        inputSchema: {
          adsetId: {
            type: 'string',
            required: true,
            label: 'Ad Set ID',
            description: 'The Ad Set ID to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },

      // ========== Ad Actions ==========
      {
        id: 'get_ads',
        name: 'Get Ads',
        description: 'Retrieve all ads from an ad account, campaign, or ad set',
        category: 'Ads',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/v23.0/{parent_id}/ads',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            parentId: 'parent_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          parentType: {
            type: 'select',
            required: true,
            label: 'Parent Type',
            options: [
              { label: 'Ad Account', value: 'account' },
              { label: 'Campaign', value: 'campaign' },
              { label: 'Ad Set', value: 'adset' }
            ],
            default: 'account',
            aiControlled: false
          },
          adAccountId: {
            type: 'string',
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            displayOptions: {
              show: {
                parentType: ['account']
              }
            },
            aiControlled: false
          },
          campaignId: {
            type: 'string',
            label: 'Campaign ID',
            displayOptions: {
              show: {
                parentType: ['campaign']
              }
            },
            aiControlled: false
          },
          adsetId: {
            type: 'string',
            label: 'Ad Set ID',
            displayOptions: {
              show: {
                parentType: ['adset']
              }
            },
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'name', 'status', 'creative'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          ads: {
            type: 'array',
            description: 'List of ads'
          }
        }
      },
      {
        id: 'get_ad',
        name: 'Get Ad',
        description: 'Retrieve details of a specific ad',
        category: 'Ads',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/v23.0/{ad_id}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adId: 'ad_id',
            fields: 'fields'
          }
        },
        inputSchema: {
          adId: {
            type: 'string',
            required: true,
            label: 'Ad ID',
            description: 'The Ad ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'name', 'status', 'adset_id', 'campaign_id', 'creative'],
            items: { type: 'string' },
            aiControlled: false
          }
        },
        outputSchema: {
          ad: {
            type: 'object',
            description: 'Ad details'
          }
        }
      },
      {
        id: 'update_ad',
        name: 'Update Ad',
        description: 'Update an existing ad',
        category: 'Ads',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/v23.0/{ad_id}',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            adId: 'ad_id',
            name: 'name',
            status: 'status'
          }
        },
        inputSchema: {
          adId: {
            type: 'string',
            required: true,
            label: 'Ad ID',
            description: 'The Ad ID to update',
            aiControlled: false
          },
          name: {
            type: 'string',
            label: 'Ad Name',
            description: 'New name for the ad',
            aiControlled: true,
            aiDescription: 'Generate an updated ad name that reflects the ad creative and targeting'
          },
          status: {
            type: 'select',
            label: 'Status',
            options: [
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Paused', value: 'PAUSED' }
            ],
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },
      {
        id: 'delete_ad',
        name: 'Delete Ad',
        description: 'Delete an ad',
        category: 'Ads',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/v23.0/{ad_id}',
          method: 'DELETE',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adId: 'ad_id'
          }
        },
        inputSchema: {
          adId: {
            type: 'string',
            required: true,
            label: 'Ad ID',
            description: 'The Ad ID to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean' }
        }
      },

      // ========== Lead Actions ==========
      {
        id: 'get_lead',
        name: 'Get Lead',
        description: 'Retrieve details of a specific lead',
        category: 'Leads',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/v23.0/{leadgen_id}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            leadgenId: 'leadgen_id',
            fields: 'fields'
          }
        },
        inputSchema: {
          leadgenId: {
            type: 'string',
            required: true,
            label: 'Lead ID',
            description: 'The Lead ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'field_data', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'form_id'],
            items: { type: 'string' },
            aiControlled: false
          }
        },
        outputSchema: {
          lead: {
            type: 'object',
            description: 'Lead details including field data'
          }
        }
      },
      {
        id: 'get_leadgen_forms',
        name: 'Get Lead Forms',
        description: 'Retrieve all lead generation forms from a Facebook page',
        category: 'Leads',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/v23.0/{page_id}/leadgen_forms',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            pageId: 'page_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          pageId: {
            type: 'string',
            required: true,
            label: 'Page ID',
            description: 'The Facebook Page ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'name', 'status', 'locale', 'questions'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          forms: {
            type: 'array',
            description: 'List of lead generation forms'
          }
        }
      },
      {
        id: 'get_form_leads',
        name: 'Get Form Leads',
        description: 'Retrieve all leads from a specific lead generation form',
        category: 'Leads',
        icon: 'users',
        verified: false,
        api: {
          endpoint: '/v23.0/{form_id}/leads',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            formId: 'form_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          formId: {
            type: 'string',
            required: true,
            label: 'Form ID',
            description: 'The Lead Generation Form ID',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'field_data', 'created_time', 'ad_id', 'ad_name'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          leads: {
            type: 'array',
            description: 'List of leads'
          }
        }
      },

      // ========== Insights Actions ==========
      {
        id: 'get_insights',
        name: 'Get Insights',
        description: 'Retrieve performance insights for campaigns, ad sets, or ads',
        category: 'Insights',
        icon: 'bar-chart',
        verified: false,
        api: {
          endpoint: '/v23.0/{object_id}/insights',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            objectId: 'object_id',
            fields: 'fields',
            time_range: 'time_range',
            level: 'level',
            breakdowns: 'breakdowns'
          }
        },
        inputSchema: {
          objectType: {
            type: 'select',
            required: true,
            label: 'Object Type',
            options: [
              { label: 'Campaign', value: 'campaign' },
              { label: 'Ad Set', value: 'adset' },
              { label: 'Ad', value: 'ad' },
              { label: 'Ad Account', value: 'account' }
            ],
            default: 'campaign',
            aiControlled: false
          },
          objectId: {
            type: 'string',
            required: true,
            label: 'Object ID',
            description: 'The ID of the campaign, ad set, ad, or ad account (with act_ prefix for accounts)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Metrics',
            description: 'Metrics to retrieve',
            default: ['impressions', 'clicks', 'spend', 'cpm', 'cpc', 'ctr', 'reach'],
            items: { type: 'string' },
            aiControlled: false
          },
          datePreset: {
            type: 'select',
            label: 'Date Preset',
            options: [
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'Last 7 Days', value: 'last_7d' },
              { label: 'Last 14 Days', value: 'last_14d' },
              { label: 'Last 28 Days', value: 'last_28d' },
              { label: 'Last 30 Days', value: 'last_30d' },
              { label: 'Last 90 Days', value: 'last_90d' },
              { label: 'This Month', value: 'this_month' },
              { label: 'Last Month', value: 'last_month' },
              { label: 'Lifetime', value: 'lifetime' },
              { label: 'Custom Range', value: 'custom' }
            ],
            default: 'last_7d',
            aiControlled: false
          },
          since: {
            type: 'string',
            label: 'Start Date',
            placeholder: 'YYYY-MM-DD',
            description: 'Start date for custom range',
            displayOptions: {
              show: {
                datePreset: ['custom']
              }
            },
            aiControlled: false
          },
          until: {
            type: 'string',
            label: 'End Date',
            placeholder: 'YYYY-MM-DD',
            description: 'End date for custom range',
            displayOptions: {
              show: {
                datePreset: ['custom']
              }
            },
            aiControlled: false
          },
          timeIncrement: {
            type: 'select',
            label: 'Time Increment',
            options: [
              { label: 'All Days (Aggregated)', value: 'all_days' },
              { label: 'Daily', value: '1' },
              { label: 'Monthly', value: 'monthly' }
            ],
            default: 'all_days',
            description: 'Group results by time period',
            aiControlled: false
          },
          breakdowns: {
            type: 'array',
            label: 'Breakdowns',
            description: 'Breakdown dimensions (e.g., age, gender, country)',
            items: { type: 'string' },
            default: [],
            aiControlled: false
          }
        },
        outputSchema: {
          insights: {
            type: 'array',
            description: 'Performance insights data'
          }
        }
      },

      // ========== Custom Audience Actions ==========
      {
        id: 'get_custom_audiences',
        name: 'Get Custom Audiences',
        description: 'Retrieve all custom audiences from an ad account',
        category: 'Audiences',
        icon: 'target',
        verified: false,
        api: {
          endpoint: '/v23.0/act_{ad_account_id}/customaudiences',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            adAccountId: 'ad_account_id',
            fields: 'fields',
            limit: 'limit'
          }
        },
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            aiControlled: false
          },
          fields: {
            type: 'array',
            label: 'Fields',
            default: ['id', 'name', 'description', 'subtype', 'approximate_count', 'delivery_status'],
            items: { type: 'string' },
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 100,
            aiControlled: false
          }
        },
        outputSchema: {
          audiences: {
            type: 'array',
            description: 'List of custom audiences'
          }
        }
      },
      {
        id: 'create_custom_audience',
        name: 'Create Custom Audience',
        description: 'Create a new custom audience',
        category: 'Audiences',
        icon: 'plus',
        verified: false,
        api: {
          endpoint: '/v23.0/act_{ad_account_id}/customaudiences',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            adAccountId: 'ad_account_id',
            name: 'name',
            description: 'description',
            subtype: 'subtype'
          }
        },
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID (without act_ prefix)',
            aiControlled: false
          },
          name: {
            type: 'string',
            required: true,
            label: 'Audience Name',
            description: 'Name of the custom audience',
            aiControlled: true,
            aiDescription: 'Generate a descriptive audience name that reflects the audience characteristics and purpose'
          },
          description: {
            type: 'string',
            label: 'Description',
            description: 'Description of the custom audience',
            aiControlled: true,
            aiDescription: 'Generate a clear description explaining the audience composition, targeting criteria, and intended use'
          },
          subtype: {
            type: 'select',
            label: 'Audience Type',
            options: [
              { label: 'Custom', value: 'CUSTOM' },
              { label: 'Website', value: 'WEBSITE' },
              { label: 'App', value: 'APP' },
              { label: 'Offline Conversion', value: 'OFFLINE_CONVERSION' },
              { label: 'Lookalike', value: 'LOOKALIKE' }
            ],
            default: 'CUSTOM',
            required: true,
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Audience ID' },
          success: { type: 'boolean' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_lead',
        name: 'New Lead',
        description: 'Triggers when a new lead is submitted through a Facebook Lead Ad form',
        eventType: 'leadgen',
        verified: false,
        icon: 'user-plus',
        webhookRequired: true,
        inputSchema: {
          pageId: {
            type: 'string',
            required: true,
            label: 'Page ID',
            description: 'The Facebook Page ID linked to the lead form',
            aiControlled: false
          },
          formId: {
            type: 'string',
            required: true,
            label: 'Form ID',
            description: 'The Lead Generation Form ID to monitor',
            aiControlled: false
          },
          simplifyOutput: {
            type: 'boolean',
            label: 'Simplify Output',
            default: true,
            description: 'Whether to return a simplified version of the lead data',
            aiControlled: false
          }
        },
        outputSchema: {
          id: {
            type: 'string',
            description: 'Lead ID'
          },
          data: {
            type: 'object',
            description: 'Lead field data (simplified format)'
          },
          form: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              locale: { type: 'string' },
              status: { type: 'string' }
            },
            description: 'Form information'
          },
          ad: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            },
            description: 'Ad information'
          },
          adset: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            },
            description: 'Ad set information'
          },
          page: {
            type: 'object',
            description: 'Page information'
          },
          created_time: {
            type: 'string',
            description: 'Lead creation timestamp'
          }
        }
      },
      {
        id: 'campaign_delivery_issue',
        name: 'Campaign Delivery Issue',
        description: 'Triggers when a campaign has delivery issues',
        eventType: 'campaign.delivery_issue',
        verified: false,
        icon: 'alert-triangle',
        webhookRequired: true,
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID to monitor',
            aiControlled: false
          }
        },
        outputSchema: {
          campaignId: { type: 'string' },
          issue: { type: 'string' },
          timestamp: { type: 'string' }
        }
      },
      {
        id: 'budget_spent',
        name: 'Budget Spent',
        description: 'Triggers when campaign budget is fully spent',
        eventType: 'budget.spent',
        verified: false,
        icon: 'dollar-sign',
        webhookRequired: true,
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID to monitor',
            aiControlled: false
          },
          campaignId: {
            type: 'string',
            required: false,
            label: 'Campaign ID',
            description: 'Optional: Monitor specific campaign',
            aiControlled: false
          }
        },
        outputSchema: {
          campaignId: { type: 'string', description: 'Campaign ID' },
          budgetAmount: { type: 'number', description: 'Budget amount spent' },
          timestamp: { type: 'string', description: 'Event timestamp' }
        }
      },
      {
        id: 'ad_disapproved',
        name: 'Ad Disapproved',
        description: 'Triggers when an ad is disapproved',
        eventType: 'ad.disapproved',
        verified: false,
        icon: 'x-circle',
        webhookRequired: true,
        inputSchema: {
          adAccountId: {
            type: 'string',
            required: true,
            label: 'Ad Account ID',
            description: 'The Facebook Ad Account ID to monitor',
            aiControlled: false
          }
        },
        outputSchema: {
          adId: { type: 'string', description: 'Ad ID' },
          reason: { type: 'string', description: 'Disapproval reason' },
          timestamp: { type: 'string', description: 'Event timestamp' }
        }
      }
    ]
  };
