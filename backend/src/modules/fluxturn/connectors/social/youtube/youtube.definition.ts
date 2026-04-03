// Youtube Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const YOUTUBE_CONNECTOR: ConnectorDefinition = {
    name: 'youtube',
    display_name: 'YouTube',
    category: 'social',
    description: 'YouTube Data API v3 for managing videos, playlists, channels, and more',
    auth_type: 'multiple',
    auth_fields: [
      {
        key: 'authMode',
        label: 'Authentication Mode',
        type: 'select',
        required: true,
        default: 'oneclick',
        options: [
          { label: 'One-Click OAuth (Use Platform Credentials)', value: 'oneclick' },
          { label: 'Manual OAuth (Use Your Own OAuth App)', value: 'manual' }
        ],
        description: 'Choose between platform-managed OAuth or your own Google OAuth app',
        helpText: 'One-Click OAuth is easier and recommended for most users. Use Manual OAuth if you need custom scopes or branding.'
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'string',
        required: false,
        placeholder: 'Enter your Google OAuth2 Client ID',
        description: 'OAuth2 Client ID from Google Cloud Console',
        helpUrl: 'https://console.cloud.google.com/apis/credentials',
        helpText: 'Create OAuth2 credentials in Google Cloud Console',
        displayOptions: { authMode: ['manual'] }
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        required: false,
        placeholder: 'Enter your Google OAuth2 Client Secret',
        description: 'OAuth2 Client Secret from Google Cloud Console',
        helpUrl: 'https://console.cloud.google.com/apis/credentials',
        helpText: 'Find Client Secret in Google Cloud Console',
        displayOptions: { authMode: ['manual'] }
      },
      {
        key: 'redirectUrl',
        label: 'OAuth Redirect URL',
        type: 'string',
        required: false,
        placeholder: 'https://your-domain.com/oauth/callback',
        description: 'The redirect URL configured in your Google OAuth2 app',
        helpUrl: 'https://console.cloud.google.com/apis/credentials',
        helpText: 'Must match the redirect URL in Google Cloud Console',
        displayOptions: { authMode: ['manual'] }
      }
    ],
    oauth_config: {
      authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ]
    },
    endpoints: {
      base_url: 'https://www.googleapis.com/youtube/v3',
      playlists: '/youtube/v3/playlists',
      playlistItems: '/youtube/v3/playlistItems',
      videos: '/youtube/v3/videos',
      channels: '/youtube/v3/channels',
      search: '/youtube/v3/search',
      subscriptions: '/youtube/v3/subscriptions'
    },
    webhook_support: false,
    rate_limits: { quota_units_per_day: 10000 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      // Playlist Operations
      {
        id: 'playlist_get',
        name: 'Get a Playlist',
        description: 'Retrieve detailed information about a YouTube playlist',
        category: 'Playlist',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlists',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            playlistId: 'id',
            part: 'part',
            onBehalfOfContentOwner: 'onBehalfOfContentOwner',
            onBehalfOfContentOwnerChannel: 'onBehalfOfContentOwnerChannel'
          }
        },
        inputSchema: {
          playlistId: {
            type: 'string',
            required: true,
            label: 'Playlist ID',
            placeholder: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
            description: 'The ID of the playlist to retrieve. You can find this in the YouTube playlist URL after "list="',
            aiControlled: false
          },
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            description: 'Specifies a comma-separated list of one or more playlist resource properties that the API response will include',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Localizations', value: 'localizations' },
              { label: 'Player', value: 'player' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Status', value: 'status' }
            ],
            default: ['*'],
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value"
              },
              onBehalfOfContentOwnerChannel: {
                type: 'string',
                label: 'On Behalf Of Content Owner Channel',
                placeholder: 'UCxxxxxxxxxxxxxxxx',
                description: 'Specifies the YouTube channel ID of the channel to which a video is being added. This parameter is required when a request specifies a value for the onBehalfOfContentOwner parameter'
              }
            }
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#playlistListResponse)'
          },
          etag: {
            type: 'string',
            description: 'The Etag of the response'
          },
          items: {
            type: 'array',
            description: 'Array of playlist resources',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Playlist ID' },
                snippet: {
                  type: 'object',
                  description: 'Basic details about the playlist',
                  properties: {
                    title: { type: 'string', description: 'Playlist title' },
                    description: { type: 'string', description: 'Playlist description' },
                    channelId: { type: 'string', description: 'Channel ID that created the playlist' },
                    channelTitle: { type: 'string', description: 'Channel title' },
                    publishedAt: { type: 'string', description: 'Date and time playlist was created' },
                    thumbnails: { type: 'object', description: 'Playlist thumbnail images' }
                  }
                },
                contentDetails: {
                  type: 'object',
                  description: 'Content details',
                  properties: {
                    itemCount: { type: 'number', description: 'Number of videos in the playlist' }
                  }
                },
                status: {
                  type: 'object',
                  description: 'Status information',
                  properties: {
                    privacyStatus: { type: 'string', description: 'Playlist privacy status (public, private, unlisted)' }
                  }
                },
                player: {
                  type: 'object',
                  description: 'Player information',
                  properties: {
                    embedHtml: { type: 'string', description: 'Embed HTML for the playlist' }
                  }
                },
                localizations: {
                  type: 'object',
                  description: 'Localized playlist metadata'
                }
              }
            }
          }
        }
      },
      {
        id: 'playlist_create',
        name: 'Create Playlist',
        description: 'Create a new YouTube playlist',
        category: 'Playlist',
        icon: 'plus',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlists',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          paramMapping: {
            title: 'snippet.title',
            description: 'snippet.description',
            tags: 'snippet.tags',
            privacyStatus: 'status.privacyStatus',
            defaultLanguage: 'snippet.defaultLanguage',
            onBehalfOfContentOwner: 'onBehalfOfContentOwner',
            onBehalfOfContentOwnerChannel: 'onBehalfOfContentOwnerChannel'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'My Awesome Playlist',
            description: "The playlist's title",
            aiControlled: true,
            aiDescription: 'The title of the YouTube playlist'
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            aiControlled: false,
            properties: {
              description: {
                type: 'string',
                label: 'Description',
                inputType: 'textarea',
                placeholder: 'Playlist description',
                description: "The playlist's description",
                aiControlled: true,
                aiDescription: 'The description of the YouTube playlist'
              },
              privacyStatus: {
                type: 'select',
                label: 'Privacy Status',
                options: [
                  { label: 'Public', value: 'public' },
                  { label: 'Private', value: 'private' },
                  { label: 'Unlisted', value: 'unlisted' }
                ],
                default: 'public',
                description: "The playlist's privacy status",
                aiControlled: false
              },
              tags: {
                type: 'string',
                label: 'Tags',
                placeholder: 'tag1, tag2, tag3',
                description: 'Keyword tags associated with the playlist. Multiple tags can be defined separated by comma',
                aiControlled: false
              },
              defaultLanguage: {
                type: 'string',
                label: 'Default Language',
                placeholder: 'en',
                description: "The language of the text in the playlist resource's title and description properties (ISO 639-1 two-letter language code)",
                aiControlled: false
              },
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value",
                aiControlled: false
              },
              onBehalfOfContentOwnerChannel: {
                type: 'string',
                label: 'On Behalf Of Content Owner Channel',
                placeholder: 'UCxxxxxxxxxxxxxxxx',
                description: 'Specifies the YouTube channel ID of the channel to which a video is being added. This parameter is required when a request specifies a value for the onBehalfOfContentOwner parameter',
                aiControlled: false
              }
            }
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#playlist)'
          },
          etag: {
            type: 'string',
            description: 'The Etag of the response'
          },
          id: {
            type: 'string',
            description: 'The ID that YouTube uses to uniquely identify the playlist'
          },
          snippet: {
            type: 'object',
            description: 'Basic details about the playlist'
          }
        }
      },
      {
        id: 'playlist_getAll',
        name: 'Get Many Playlists',
        description: 'Retrieve multiple YouTube playlists with filters',
        category: 'Playlist',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlists',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            part: 'part',
            returnAll: 'returnAll',
            limit: 'maxResults',
            filters: 'filters',
            options: 'options'
          }
        },
        inputSchema: {
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            description: 'Specifies a comma-separated list of one or more playlist resource properties that the API response will include',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Localizations', value: 'localizations' },
              { label: 'Player', value: 'player' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Status', value: 'status' }
            ],
            default: ['*'],
            aiControlled: false
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            default: false,
            description: 'Whether to return all results or only up to a given limit',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 50,
            description: 'Max number of results to return',
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            aiControlled: false
          },
          filters: {
            type: 'collection',
            label: 'Filters',
            description: 'Filter criteria for playlist search',
            placeholder: 'Add filter',
            default: {},
            properties: {
              channelId: {
                type: 'string',
                label: 'Channel ID',
                placeholder: 'UCxxxxxxxxxxxxxxxx',
                description: "This value indicates that the API should only return the specified channel's playlists"
              },
              id: {
                type: 'string',
                label: 'Playlist IDs',
                placeholder: 'PLxxxxxx, PLyyyyyy',
                description: "Comma-separated list of YouTube playlist IDs for the resources that are being retrieved"
              }
            }
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value"
              },
              onBehalfOfContentOwnerChannel: {
                type: 'string',
                label: 'On Behalf Of Content Owner Channel',
                placeholder: 'UCxxxxxxxxxxxxxxxx',
                description: 'Specifies the YouTube channel ID of the channel to which a video is being added. This parameter is required when a request specifies a value for the onBehalfOfContentOwner parameter'
              }
            }
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#playlistListResponse)'
          },
          etag: {
            type: 'string',
            description: 'The Etag of the response'
          },
          pageInfo: {
            type: 'object',
            description: 'Pagination information'
          },
          items: {
            type: 'array',
            description: 'Array of playlist resources'
          }
        }
      },
      {
        id: 'playlist_delete',
        name: 'Delete Playlist',
        description: 'Permanently delete a YouTube playlist',
        category: 'Playlist',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlists',
          method: 'DELETE',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            playlistId: 'id',
            onBehalfOfContentOwner: 'onBehalfOfContentOwner'
          }
        },
        inputSchema: {
          playlistId: {
            type: 'string',
            required: true,
            label: 'Playlist ID',
            placeholder: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
            description: 'The ID of the playlist to delete',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value"
              }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Indicates whether the deletion was successful'
          }
        }
      },
      // Video Operations
      {
        id: 'video_get',
        name: 'Get a Video',
        description: 'Retrieve detailed information about a YouTube video',
        category: 'Video',
        icon: 'video',
        verified: false,
        api: {
          endpoint: '/youtube/v3/videos',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            videoId: 'id',
            part: 'part',
            onBehalfOfContentOwner: 'onBehalfOfContentOwner'
          }
        },
        inputSchema: {
          videoId: {
            type: 'string',
            required: true,
            label: 'Video ID',
            placeholder: 'dQw4w9WgXcQ',
            description: 'The ID of the video to retrieve. You can find this in the YouTube video URL after "v="',
            aiControlled: false
          },
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            description: 'Specifies a comma-separated list of one or more video resource properties that the API response will include',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Live Streaming Details', value: 'liveStreamingDetails' },
              { label: 'Localizations', value: 'localizations' },
              { label: 'Player', value: 'player' },
              { label: 'Recording Details', value: 'recordingDetails' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Statistics', value: 'statistics' },
              { label: 'Status', value: 'status' },
              { label: 'Topic Details', value: 'topicDetails' }
            ],
            default: ['*'],
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value"
              }
            }
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#videoListResponse)'
          },
          etag: {
            type: 'string',
            description: 'The Etag of the response'
          },
          items: {
            type: 'array',
            description: 'Array of video resources'
          }
        }
      },
      {
        id: 'video_delete',
        name: 'Delete a Video',
        description: 'Permanently delete a YouTube video',
        category: 'Video',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/youtube/v3/videos',
          method: 'DELETE',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            videoId: 'id',
            onBehalfOfContentOwner: 'onBehalfOfContentOwner'
          }
        },
        inputSchema: {
          videoId: {
            type: 'string',
            required: true,
            label: 'Video ID',
            placeholder: 'dQw4w9WgXcQ',
            description: 'The ID of the video to delete',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                placeholder: 'contentOwnerID',
                description: "Indicates that the request's authorization credentials identify a YouTube CMS user who is acting on behalf of the content owner specified in the parameter value"
              }
            }
          }
        },
        outputSchema: {
          success: {
            type: 'boolean',
            description: 'Indicates whether the deletion was successful'
          }
        }
      },
      {
        id: 'video_getAll',
        name: 'Get Many Videos',
        description: 'Search and retrieve multiple YouTube videos with filters',
        category: 'Video',
        icon: 'search',
        verified: false,
        api: {
          endpoint: '/youtube/v3/search',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            returnAll: 'returnAll',
            limit: 'maxResults',
            filters: 'filters',
            options: 'options'
          }
        },
        inputSchema: {
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            default: false,
            description: 'Whether to return all results or only up to a given limit',
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 50,
            description: 'Max number of results to return',
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            aiControlled: false
          },
          filters: {
            type: 'collection',
            label: 'Filters',
            description: 'Filter criteria for video search',
            placeholder: 'Add filter',
            default: {},
            aiControlled: false,
            properties: {
              channelId: {
                type: 'string',
                label: 'Channel ID',
                placeholder: 'UCxxxxxxxxxxxxxxxx',
                description: 'The channelId parameter indicates that the API response should only contain resources created by the channel',
                aiControlled: false
              },
              forDeveloper: {
                type: 'boolean',
                label: 'For Developer',
                default: false,
                description: "Whether to restrict the search to only retrieve videos uploaded via the developer's application or website"
              },
              publishedAfter: {
                type: 'string',
                label: 'Published After',
                inputType: 'datetime-local',
                placeholder: '2025-01-01T00:00:00',
                description: 'The publishedAfter parameter indicates that the API response should only contain resources created at or after the specified time (ISO 8601 format)'
              },
              publishedBefore: {
                type: 'string',
                label: 'Published Before',
                inputType: 'datetime-local',
                placeholder: '2025-12-31T23:59:59',
                description: 'The publishedBefore parameter indicates that the API response should only contain resources created before or at the specified time (ISO 8601 format)'
              },
              q: {
                type: 'string',
                label: 'Query',
                placeholder: 'search term',
                description: 'The q parameter specifies the query term to search for'
              },
              regionCode: {
                type: 'string',
                label: 'Region Code',
                placeholder: 'US',
                description: 'The regionCode parameter instructs the API to select a video chart available in the specified region (ISO 3166-1 alpha-2 country code)'
              },
              relatedToVideoId: {
                type: 'string',
                label: 'Related To Video ID',
                placeholder: 'dQw4w9WgXcQ',
                description: 'The relatedToVideoId parameter retrieves a list of videos that are related to the video that the parameter value identifies'
              },
              videoCategoryId: {
                type: 'string',
                label: 'Video Category ID',
                placeholder: '10',
                description: 'The videoCategoryId parameter identifies the video category for which the chart should be retrieved'
              },
              videoSyndicated: {
                type: 'boolean',
                label: 'Video Syndicated',
                default: false,
                description: 'Whether to restrict a search to only videos that can be played outside youtube.com'
              },
              videoType: {
                type: 'select',
                label: 'Video Type',
                options: [
                  { label: 'Any', value: 'any' },
                  { label: 'Episode', value: 'episode' },
                  { label: 'Movie', value: 'movie' }
                ],
                default: 'any',
                description: 'The videoType parameter lets you restrict a search to a particular type of videos'
              }
            }
          },
          options: {
            type: 'collection',
            label: 'Options',
            description: 'Additional optional parameters',
            placeholder: 'Add option',
            default: {},
            properties: {
              order: {
                type: 'select',
                label: 'Order',
                options: [
                  { label: 'Date', value: 'date' },
                  { label: 'Relevance', value: 'relevance' },
                  { label: 'Rating', value: 'rating' },
                  { label: 'Title', value: 'title' },
                  { label: 'Video Count', value: 'videoCount' },
                  { label: 'View Count', value: 'viewCount' }
                ],
                default: 'relevance',
                description: 'The order parameter specifies the method that will be used to order resources'
              },
              safeSearch: {
                type: 'select',
                label: 'Safe Search',
                options: [
                  { label: 'Moderate', value: 'moderate' },
                  { label: 'None', value: 'none' },
                  { label: 'Strict', value: 'strict' }
                ],
                default: 'moderate',
                description: 'The safeSearch parameter indicates whether the search results should include restricted content'
              }
            }
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#searchListResponse)'
          },
          etag: {
            type: 'string',
            description: 'The Etag of the response'
          },
          nextPageToken: {
            type: 'string',
            description: 'Token for the next page of results'
          },
          prevPageToken: {
            type: 'string',
            description: 'Token for the previous page of results'
          },
          pageInfo: {
            type: 'object',
            description: 'Pagination information'
          },
          items: {
            type: 'array',
            description: 'Array of search result resources'
          }
        }
      },
      // Channel Operations
      {
        id: 'channel_get',
        name: 'Get a Channel',
        description: 'Retrieve detailed information about a YouTube channel',
        category: 'Channel',
        icon: 'user',
        verified: false,
        api: {
          endpoint: '/youtube/v3/channels',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          },
          paramMapping: {
            channelId: 'id',
            part: 'part'
          }
        },
        inputSchema: {
          channelId: {
            type: 'string',
            required: true,
            label: 'Channel ID',
            placeholder: 'UCxxxxxxxxxxxxxxxx',
            description: 'ID of the channel',
            aiControlled: false
          },
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            description: 'Specifies a comma-separated list of one or more channel resource properties that the API response will include',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Branding Settings', value: 'brandingSettings' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'Content Owner Details', value: 'contentOwnerDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Localizations', value: 'localizations' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Statistics', value: 'statistics' },
              { label: 'Status', value: 'status' },
              { label: 'Topic Details', value: 'topicDetails' }
            ],
            default: ['*'],
            aiControlled: false
          }
        },
        outputSchema: {
          kind: {
            type: 'string',
            description: 'Identifies the API resource type (youtube#channelListResponse)'
          },
          items: {
            type: 'array',
            description: 'Array of channel resources'
          }
        }
      },
      {
        id: 'channel_getAll',
        name: 'Get Many Channels',
        description: 'Retrieve multiple YouTube channels with filters',
        category: 'Channel',
        icon: 'users',
        verified: false,
        api: {
          endpoint: '/youtube/v3/channels',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Branding Settings', value: 'brandingSettings' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'Content Owner Details', value: 'contentOwnerDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Localizations', value: 'localizations' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Statistics', value: 'statistics' },
              { label: 'Status', value: 'status' },
              { label: 'Topic Details', value: 'topicDetails' }
            ],
            default: ['*']
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            default: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 50,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            }
          },
          filters: {
            type: 'collection',
            label: 'Filters',
            default: {},
            properties: {
              categoryId: {
                type: 'string',
                label: 'Category ID',
                description: 'YouTube guide category, requesting channels associated with that category'
              },
              forUsername: {
                type: 'string',
                label: 'For Username',
                description: 'YouTube username, requesting the channel associated with that username'
              },
              id: {
                type: 'string',
                label: 'Channel IDs',
                description: 'Comma-separated list of YouTube channel IDs'
              },
              managedByMe: {
                type: 'boolean',
                label: 'Managed By Me',
                default: false,
                description: 'Only return channels managed by the content owner'
              }
            }
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            properties: {
              hl: {
                type: 'string',
                label: 'Language Code',
                placeholder: 'en',
                description: 'Language code for localized resource metadata (e.g., en, es, fr)'
              },
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner'
              }
            }
          }
        }
      },
      {
        id: 'playlist_update',
        name: 'Update Playlist',
        description: 'Update an existing YouTube playlist',
        category: 'Playlist',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlists',
          method: 'PUT',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          playlistId: {
            type: 'string',
            required: true,
            label: 'Playlist ID',
            placeholder: 'PLxxxxxx',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            aiControlled: true,
            aiDescription: 'The updated title for the YouTube playlist'
          },
          updateFields: {
            type: 'collection',
            label: 'Update Fields',
            default: {},
            aiControlled: false,
            properties: {
              description: {
                type: 'string',
                label: 'Description',
                inputType: 'textarea',
                aiControlled: true,
                aiDescription: 'The updated description for the YouTube playlist'
              },
              privacyStatus: {
                type: 'select',
                label: 'Privacy Status',
                options: [
                  { label: 'Public', value: 'public' },
                  { label: 'Private', value: 'private' },
                  { label: 'Unlisted', value: 'unlisted' }
                ],
                aiControlled: false
              },
              tags: {
                type: 'string',
                label: 'Tags',
                description: 'Comma-separated tags',
                aiControlled: false
              },
              defaultLanguage: {
                type: 'string',
                label: 'Default Language',
                placeholder: 'en',
                aiControlled: false
              },
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'playlistItem_add',
        name: 'Add Playlist Item',
        description: 'Add a video to a YouTube playlist',
        category: 'Playlist Item',
        icon: 'plus-circle',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlistItems',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          playlistId: {
            type: 'string',
            required: true,
            label: 'Playlist ID',
            placeholder: 'PLxxxxxx',
            aiControlled: false
          },
          videoId: {
            type: 'string',
            required: true,
            label: 'Video ID',
            placeholder: 'dQw4w9WgXcQ',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            aiControlled: false,
            properties: {
              position: {
                type: 'number',
                label: 'Position',
                min: 0,
                description: 'Order in the playlist (zero-based index)',
                aiControlled: false
              },
              note: {
                type: 'string',
                label: 'Note',
                maxLength: 280,
                description: 'User-generated note for this item',
                aiControlled: true,
                aiDescription: 'A note or comment for the playlist item'
              },
              startAt: {
                type: 'string',
                label: 'Start At',
                inputType: 'datetime-local',
                description: 'Time when video should start playing',
                aiControlled: false
              },
              endAt: {
                type: 'string',
                label: 'End At',
                inputType: 'datetime-local',
                description: 'Time when video should stop playing',
                aiControlled: false
              },
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'playlistItem_delete',
        name: 'Delete Playlist Item',
        description: 'Remove a video from a YouTube playlist',
        category: 'Playlist Item',
        icon: 'trash',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlistItems',
          method: 'DELETE',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          playlistItemId: {
            type: 'string',
            required: true,
            label: 'Playlist Item ID',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            aiControlled: false,
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'playlistItem_get',
        name: 'Get a Playlist Item',
        description: 'Retrieve information about a playlist item',
        category: 'Playlist Item',
        icon: 'info',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlistItems',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          playlistItemId: {
            type: 'string',
            required: true,
            label: 'Playlist Item ID',
            aiControlled: false
          },
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Status', value: 'status' }
            ],
            default: ['*'],
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            aiControlled: false,
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'playlistItem_getAll',
        name: 'Get Many Playlist Items',
        description: 'Retrieve items from a YouTube playlist',
        category: 'Playlist Item',
        icon: 'list',
        verified: false,
        api: {
          endpoint: '/youtube/v3/playlistItems',
          method: 'GET',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          playlistId: {
            type: 'string',
            required: true,
            label: 'Playlist ID',
            aiControlled: false
          },
          part: {
            type: 'multiselect',
            required: true,
            label: 'Fields',
            options: [
              { label: 'All Fields (*)', value: '*' },
              { label: 'Content Details', value: 'contentDetails' },
              { label: 'ID', value: 'id' },
              { label: 'Snippet', value: 'snippet' },
              { label: 'Status', value: 'status' }
            ],
            default: ['*'],
            aiControlled: false
          },
          returnAll: {
            type: 'boolean',
            label: 'Return All',
            default: false,
            aiControlled: false
          },
          limit: {
            type: 'number',
            label: 'Limit',
            default: 25,
            min: 1,
            max: 50,
            displayOptions: {
              show: {
                returnAll: [false]
              }
            },
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            aiControlled: false,
            properties: {
              onBehalfOfContentOwner: {
                type: 'string',
                label: 'On Behalf Of Content Owner',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'video_rate',
        name: 'Rate a Video',
        description: 'Like, dislike, or remove rating from a video',
        category: 'Video',
        icon: 'thumbs-up',
        verified: false,
        api: {
          endpoint: '/youtube/v3/videos/rate',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json'
          }
        },
        inputSchema: {
          videoId: {
            type: 'string',
            required: true,
            label: 'Video ID',
            placeholder: 'dQw4w9WgXcQ',
            aiControlled: false
          },
          rating: {
            type: 'select',
            required: true,
            label: 'Rating',
            options: [
              { label: 'Like', value: 'like' },
              { label: 'Dislike', value: 'dislike' },
              { label: 'None (Remove Rating)', value: 'none' }
            ],
            aiControlled: false
          }
        }
      },
      {
        id: 'video_update',
        name: 'Update a Video',
        description: 'Update video metadata',
        category: 'Video',
        icon: 'edit',
        verified: false,
        api: {
          endpoint: '/youtube/v3/videos',
          method: 'PUT',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          videoId: {
            type: 'string',
            required: true,
            label: 'Video ID',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            aiControlled: true,
            aiDescription: 'The updated title for the YouTube video'
          },
          categoryId: {
            type: 'string',
            required: true,
            label: 'Category ID',
            placeholder: '22',
            aiControlled: false
          },
          updateFields: {
            type: 'collection',
            label: 'Update Fields',
            default: {},
            aiControlled: false,
            properties: {
              description: {
                type: 'string',
                label: 'Description',
                inputType: 'textarea',
                aiControlled: true,
                aiDescription: 'The updated description for the YouTube video'
              },
              tags: {
                type: 'string',
                label: 'Tags',
                description: 'Comma-separated tags',
                aiControlled: false
              },
              privacyStatus: {
                type: 'select',
                label: 'Privacy Status',
                options: [
                  { label: 'Public', value: 'public' },
                  { label: 'Private', value: 'private' },
                  { label: 'Unlisted', value: 'unlisted' }
                ],
                aiControlled: false
              },
              embeddable: {
                type: 'boolean',
                label: 'Embeddable',
                default: false,
                aiControlled: false
              },
              publicStatsViewable: {
                type: 'boolean',
                label: 'Public Stats Viewable',
                default: true,
                aiControlled: false
              },
              publishAt: {
                type: 'string',
                label: 'Publish At',
                inputType: 'datetime-local',
                aiControlled: false
              },
              selfDeclaredMadeForKids: {
                type: 'boolean',
                label: 'Self Declared Made For Kids',
                default: false,
                aiControlled: false
              },
              recordingDate: {
                type: 'string',
                label: 'Recording Date',
                inputType: 'datetime-local',
                aiControlled: false
              },
              license: {
                type: 'select',
                label: 'License',
                options: [
                  { label: 'YouTube', value: 'youtube' },
                  { label: 'Creative Common', value: 'creativeCommon' }
                ],
                aiControlled: false
              },
              defaultLanguage: {
                type: 'string',
                label: 'Default Language',
                placeholder: 'en',
                aiControlled: false
              }
            }
          }
        }
      },
      {
        id: 'video_upload',
        name: 'Upload a Video',
        description: 'Upload a video file to YouTube',
        category: 'Video',
        icon: 'upload',
        verified: false,
        api: {
          endpoint: '/upload/youtube/v3/videos',
          method: 'POST',
          baseUrl: 'https://www.googleapis.com',
          headers: {
            'Authorization': 'Bearer {accessToken}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            aiControlled: true,
            aiDescription: 'The title of the YouTube video'
          },
          categoryId: {
            type: 'string',
            required: true,
            label: 'Category ID',
            placeholder: '22',
            aiControlled: false
          },
          binaryProperty: {
            type: 'string',
            required: true,
            label: 'Input Binary Field',
            default: 'data',
            description: 'Name of the input binary field containing the video file',
            aiControlled: false
          },
          options: {
            type: 'collection',
            label: 'Options',
            default: {},
            aiControlled: false,
            properties: {
              description: {
                type: 'string',
                label: 'Description',
                inputType: 'textarea',
                aiControlled: true,
                aiDescription: 'The description of the YouTube video'
              },
              tags: {
                type: 'string',
                label: 'Tags',
                description: 'Comma-separated tags',
                aiControlled: false
              },
              privacyStatus: {
                type: 'select',
                label: 'Privacy Status',
                options: [
                  { label: 'Public', value: 'public' },
                  { label: 'Private', value: 'private' },
                  { label: 'Unlisted', value: 'unlisted' }
                ],
                default: 'private',
                aiControlled: false
              },
              embeddable: {
                type: 'boolean',
                label: 'Embeddable',
                default: true,
                aiControlled: false
              },
              publicStatsViewable: {
                type: 'boolean',
                label: 'Public Stats Viewable',
                default: true,
                aiControlled: false
              },
              publishAt: {
                type: 'string',
                label: 'Publish At',
                inputType: 'datetime-local',
                aiControlled: false
              },
              selfDeclaredMadeForKids: {
                type: 'boolean',
                label: 'Self Declared Made For Kids',
                default: false,
                aiControlled: false
              },
              recordingDate: {
                type: 'string',
                label: 'Recording Date',
                inputType: 'datetime-local',
                aiControlled: false
              },
              license: {
                type: 'select',
                label: 'License',
                options: [
                  { label: 'YouTube', value: 'youtube' },
                  { label: 'Creative Common', value: 'creativeCommon' }
                ],
                default: 'youtube',
                aiControlled: false
              },
              defaultLanguage: {
                type: 'string',
                label: 'Default Language',
                placeholder: 'en',
                aiControlled: false
              },
              notifySubscribers: {
                type: 'boolean',
                label: 'Notify Subscribers',
                default: false,
                description: 'Whether YouTube should send notification to subscribers',
                aiControlled: false
              }
            }
          }
        }
      }
    ]
  };
