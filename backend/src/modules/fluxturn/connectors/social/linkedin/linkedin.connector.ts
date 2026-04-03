import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { ISocialConnector } from '../../base/connector.interface';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  PaginatedRequest,
} from '../../types';
import * as FormData from 'form-data';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { LinkedInOAuthService } from '../../services/linkedin-oauth.service';

interface LinkedInImageUploadResponse {
  value: {
    uploadUrl: string;
    image: string;
  };
}

interface MediaFile {
  fileName: string;
  fileData: string; // base64 data URL
  mimeType: string;
  size?: number;
}

interface LinkedInPostRequest {
  text: string;
  shareMediaCategory?: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE';
  postAs?: 'person' | 'organization';
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  organizationUrn?: string;
  // Image fields
  imageUploadMethod?: 'url' | 'upload';
  imageUrl?: string;
  imageFile?: MediaFile[];
  imageTitle?: string;
  // Video fields
  videoUploadMethod?: 'url' | 'upload';
  videoUrl?: string;
  videoFile?: MediaFile[];
  videoTitle?: string;
  // Article fields
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  thumbnailUrl?: string;
  // Legacy fields (for backward compatibility)
  binaryData?: Buffer;
  binaryMimeType?: string;
}

@Injectable()
export class LinkedinConnector extends BaseConnector implements ISocialConnector {
  private httpClient: AxiosInstance;
  private accessToken: string;
  private personUrn: string;
  private companyId?: string;
  private readonly LINKEDIN_API_VERSION = '202411';

  constructor(
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly linkedInOAuthService: LinkedInOAuthService,
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'LinkedIn',
      description: 'LinkedIn social media connector for posting and managing professional content',
      version: '2.0.0',
      category: ConnectorCategory.SOCIAL,
      type: ConnectorType.LINKEDIN,
      authType: AuthType.OAUTH2,
      actions: [
        {
          id: 'create_post',
          name: 'Create Post',
          description: 'Create a LinkedIn post with text, images, or articles',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                maxLength: 3000,
                description: 'Post text content (special characters will be automatically escaped)'
              },
              shareMediaCategory: {
                type: 'string',
                enum: ['NONE', 'IMAGE', 'ARTICLE'],
                description: 'Type of media to include in the post'
              },
              postAs: {
                type: 'string',
                enum: ['person', 'organization'],
                description: 'Post as a person or organization'
              },
              visibility: {
                type: 'string',
                enum: ['PUBLIC', 'CONNECTIONS'],
                description: 'Post visibility setting'
              },
              organizationUrn: {
                type: 'string',
                description: 'Organization URN (required when postAs is "organization")'
              },
              imageUrl: {
                type: 'string',
                description: 'LinkedIn image asset URN (for IMAGE posts)'
              },
              imageTitle: {
                type: 'string',
                description: 'Title for the image (for IMAGE posts)'
              },
              articleUrl: {
                type: 'string',
                description: 'URL of the article to share (required for ARTICLE posts)'
              },
              articleTitle: {
                type: 'string',
                description: 'Title of the article (for ARTICLE posts)'
              },
              articleDescription: {
                type: 'string',
                description: 'Description of the article (for ARTICLE posts)'
              },
              thumbnailUrl: {
                type: 'string',
                description: 'LinkedIn image asset URN for article thumbnail'
              },
              binaryData: {
                type: 'string',
                description: 'Base64 encoded binary image data (for IMAGE posts with upload)'
              },
              binaryMimeType: {
                type: 'string',
                description: 'MIME type of the binary data (e.g., image/jpeg, image/png)'
              }
            },
            required: ['text']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  urn: { type: 'string', description: 'LinkedIn post URN' },
                  id: { type: 'string' }
                }
              }
            }
          }
        },
        {
          id: 'get_profile',
          name: 'Get Profile',
          description: 'Get LinkedIn profile information',
          inputSchema: {
            type: 'object',
            properties: {
              fields: { type: 'string', description: 'Comma-separated list of fields to retrieve' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  headline: { type: 'string' }
                }
              }
            }
          }
        },
        {
          id: 'get_company_updates',
          name: 'Get Company Updates',
          description: 'Get updates from a LinkedIn company page',
          inputSchema: {
            type: 'object',
            properties: {
              company_id: { type: 'string' },
              count: { type: 'number', maximum: 50 }
            },
            required: ['company_id']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array' },
                  pagination: { type: 'object' }
                }
              }
            }
          }
        },
        {
          id: 'get_person_urn',
          name: 'Get Person URN',
          description: 'Get the current user\'s person URN and basic information',
          inputSchema: {
            type: 'object',
            properties: {}
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Person ID' },
                  name: { type: 'string', description: 'Full name' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  urn: { type: 'string', description: 'Person URN' }
                }
              }
            }
          }
        },
        {
          id: 'get_organizations',
          name: 'Get Organizations',
          description: 'Get organizations where the user has admin access',
          inputSchema: {
            type: 'object',
            properties: {}
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  organizations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        vanityName: { type: 'string' },
                        urn: { type: 'string' }
                      }
                    }
                  },
                  count: { type: 'number' }
                }
              }
            }
          }
        },
        {
          id: 'get_post',
          name: 'Get Post',
          description: 'Get a LinkedIn post by its URN or share ID',
          inputSchema: {
            type: 'object',
            properties: {
              postId: {
                type: 'string',
                description: 'The post URN (e.g., urn:li:share:123456789 or urn:li:ugcPost:123456789) or just the ID'
              }
            },
            required: ['postId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Post ID/URN' },
                  author: { type: 'string', description: 'Author URN' },
                  commentary: { type: 'string', description: 'Post text' },
                  visibility: { type: 'string', description: 'Post visibility' },
                  lifecycleState: { type: 'string', description: 'Post state (PUBLISHED, DRAFT, etc.)' },
                  createdAt: { type: 'number', description: 'Creation timestamp' },
                  lastModifiedAt: { type: 'number', description: 'Last modified timestamp' }
                }
              }
            }
          }
        }
      ],
      triggers: [
        {
          id: 'new_connection',
          name: 'New Connection',
          description: 'Triggered when a new connection is made',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' }
            }
          }
        },
        {
          id: 'profile_view',
          name: 'Profile View',
          description: 'Triggered when someone views your profile',
          eventType: 'webhook',
          outputSchema: {
            type: 'object',
            properties: {
              viewer_id: { type: 'string' },
              timestamp: { type: 'string' }
            }
          }
        }
      ],
      requiredScopes: [
        'access_token'
      ]
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials) {
      throw new Error('LinkedIn credentials are required');
    }

    // Log credential configuration for debugging
    this.logger.log('LinkedIn credential configuration:', {
      hasOrgSupport: this.config.credentials.organization_support === true,
      isLegacy: this.config.credentials.legacy === true,
      scope: this.config.credentials.scope || 'unknown',
    });

    // Check if token is expired and needs refresh
    const expiresAt = this.config.credentials.expiresAt;
    if (expiresAt) {
      const expirationTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      // Debug logging
      this.logger.debug('LinkedIn token expiration check:', {
        expiresAt,
        expirationTime,
        currentTime,
        differenceMinutes: Math.floor((expirationTime - currentTime) / 60000),
        isExpired: currentTime >= expirationTime,
      });

      const minutesUntilExpiry = Math.floor((expirationTime - currentTime) / 60000);
      if (minutesUntilExpiry < 0) {
        this.logger.log(`LinkedIn token expired ${Math.abs(minutesUntilExpiry)} minutes ago`);
      } else {
        this.logger.log(`LinkedIn token expires in ${minutesUntilExpiry} minutes`);
      }

      // Refresh if expired or expiring within 5 minutes
      if (currentTime >= expirationTime - fiveMinutesInMs) {
        this.logger.log('LinkedIn OAuth token expired or expiring soon, refreshing...');
        try {
          await this.refreshToken();
        } catch (error) {
          this.logger.error('LinkedIn token refresh failed:', error.message);
          throw new Error(`Token refresh failed: ${error.message}. Please re-authorize the LinkedIn connection.`);
        }
      }
    }

    // Handle both camelCase (from OAuth) and snake_case (from manual entry)
    const access_token = this.config.credentials.access_token || this.config.credentials.accessToken;
    const company_id = this.config.credentials.company_id;
    const legacy = this.config.credentials.legacy;

    if (!access_token) {
      throw new Error('Missing required LinkedIn access token');
    }

    this.accessToken = access_token;
    this.companyId = company_id;

    this.httpClient = axios.create({
      baseURL: 'https://api.linkedin.com',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': this.LINKEDIN_API_VERSION
      },
      timeout: 15000, // 15 second timeout to fail faster if LinkedIn API is slow
      // Force IPv4 to avoid IPv6 timeout issues
      httpAgent: new (require('http').Agent)({ family: 4 }),
      httpsAgent: new (require('https').Agent)({ family: 4 })
    });

    // Get user profile to set personUrn - use different endpoint based on legacy mode
    // Make this optional to handle LinkedIn API timeout issues
    try {
      let profileEndpoint = '/v2/userinfo';
      if (legacy) {
        profileEndpoint = '/v2/me';
      }

      this.logger.log(`Fetching LinkedIn profile from: ${profileEndpoint}`);
      const profileResponse = await this.httpClient.get(profileEndpoint);

      this.logger.log(`Profile response status: ${profileResponse.status}`);
      this.logger.log(`Profile response data keys: ${Object.keys(profileResponse.data).join(', ')}`);

      // Handle different response formats
      if (legacy) {
        this.personUrn = profileResponse.data.id;
      } else {
        this.personUrn = profileResponse.data.sub;
      }

      if (!this.personUrn) {
        this.logger.error('No person URN found in response:', JSON.stringify(profileResponse.data));
        throw new Error('Person URN not found in LinkedIn profile response');
      }

      this.logger.log(`LinkedIn connector initialized successfully. Person URN: ${this.personUrn}`);
    } catch (error) {
      // Don't fail initialization if profile fetch fails - we can fetch it later when needed
      this.logger.warn('Could not fetch LinkedIn profile during initialization:', error.message);
      this.logger.warn('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      // Set personUrn to null - it will be fetched on first use
      this.personUrn = null;
      this.logger.log('LinkedIn connector initialized without person URN. Will fetch on first use.');
    }
  }

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
    await this.initializeConnection();
  }

  /**
   * Refresh LinkedIn OAuth token using refresh token
   */
  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = this.config.credentials.refreshToken || this.config.credentials.refresh_token;

      if (!refreshToken) {
        throw new Error('No refresh token available - user must re-authorize');
      }

      this.logger.log('Attempting to refresh LinkedIn access token...');

      // Use the LinkedInOAuthService to refresh the token
      const tokens = await this.linkedInOAuthService.refreshAccessToken(refreshToken);

      // Calculate new expiration time
      const newExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Update credentials in memory
      this.config.credentials.accessToken = tokens.access_token;
      this.config.credentials.access_token = tokens.access_token;
      if (tokens.refresh_token) {
        this.config.credentials.refreshToken = tokens.refresh_token;
        this.config.credentials.refresh_token = tokens.refresh_token;
      }
      this.config.credentials.expiresAt = newExpiresAt;

      this.logger.log('LinkedIn OAuth token refreshed successfully');

      // Persist the refreshed tokens to the database
      if (this.config.id && this.connectorConfigService) {
        try {
          await this.connectorConfigService.updateRefreshedTokens(this.config.id, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || refreshToken,
            expiresAt: newExpiresAt,
          });
          this.logger.log('LinkedIn refreshed tokens persisted to database');
        } catch (persistError) {
          this.logger.error('Failed to persist LinkedIn refreshed tokens to database:', persistError.message);
          // Don't throw - we can still proceed with the in-memory tokens
        }
      }
    } catch (error) {
      this.logger.error('Failed to refresh LinkedIn OAuth token:', error.message);
      throw new Error('Failed to refresh LinkedIn OAuth token - user may need to re-authorize');
    }
  }

  /**
   * Lazy load person URN if not already set
   */
  private async ensurePersonUrn(): Promise<void> {
    if (this.personUrn) {
      return; // Already have it
    }

    try {
      const legacy = this.config.credentials?.legacy;
      const endpoint = legacy ? '/v2/me' : '/v2/userinfo';

      this.logger.log(`Lazy loading person URN from: ${endpoint}`);
      const response = await this.httpClient.get(endpoint);

      // Handle different response formats
      if (legacy) {
        this.personUrn = response.data.id;
      } else {
        this.personUrn = response.data.sub;
      }

      this.logger.log(`Person URN loaded: ${this.personUrn}`);
    } catch (error) {
      this.logger.error('Failed to fetch person URN:', error.message);
      throw new Error(`Could not retrieve LinkedIn user profile: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.httpClient) {
      throw new Error('LinkedIn client not initialized');
    }

    try {
      // Use the same endpoint logic as initializeConnection
      const legacy = this.config.credentials?.legacy;
      const endpoint = legacy ? '/v2/me' : '/v2/userinfo';

      const response = await this.httpClient.get(endpoint);

      // Also update personUrn if we got it
      if (response.status === 200) {
        if (legacy) {
          this.personUrn = response.data.id;
        } else {
          this.personUrn = response.data.sub;
        }
      }

      return response.status === 200;
    } catch (error) {
      this.logger.error('Connection test failed:', error.message);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    await this.performConnectionTest();
  }

  protected async performRequest(request: any): Promise<any> {
    return await this.httpClient.request(request);
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    return await this.executeAction(actionId, input);
  }

  protected async cleanup(): Promise<void> {
    // No cleanup needed
  }

  async postContent(content: any): Promise<ConnectorResponse> {
    try {
      // DEBUG: Use console.log directly to ensure visibility
      console.log('\n' + '='.repeat(60));
      console.log('🔵 LINKEDIN CREATE POST - DEBUG');
      console.log('='.repeat(60));
      console.log('Raw content received:', JSON.stringify(content, null, 2));
      console.log('Content keys:', Object.keys(content || {}));
      console.log('imageUrl value:', content?.imageUrl);
      console.log('imageUrl type:', typeof content?.imageUrl);
      console.log('text value:', content?.text?.substring(0, 100) + '...');
      console.log('='.repeat(60) + '\n');

      // Also use logger
      this.logger.log('=== LinkedIn Create Post - RAW INPUT ===');
      this.logger.log('Raw content received:', JSON.stringify(content, null, 2));
      this.logger.log('Content keys:', Object.keys(content || {}));
      this.logger.log('imageUrl value:', content?.imageUrl);
      this.logger.log('imageUrl type:', typeof content?.imageUrl);
      this.logger.log('text value:', content?.text?.substring(0, 100) + '...');

      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      // Ensure we have person URN
      await this.ensurePersonUrn();

      const postRequest: LinkedInPostRequest = content;
      let text = postRequest.text;

      if (!text) {
        throw new Error('Post text is required');
      }

      if (text.length > 3000) {
        throw new Error('Post text exceeds 3000 character limit');
      }

      // Apply LinkedIn "little text" format - escape special characters
      text = this.formatLinkedInText(text);

      const postAs = postRequest.postAs || 'person';
      const visibility = postRequest.visibility || 'PUBLIC';

      // Auto-detect media type based on provided URLs (new simplified approach)
      // If shareMediaCategory is not set OR is set to 'NONE', auto-detect from URLs
      let shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE' = 'NONE';

      // Check for valid URLs (not null, not empty, not 'null' string, starts with http)
      const hasImageUrl = postRequest.imageUrl &&
                          postRequest.imageUrl.trim() !== '' &&
                          postRequest.imageUrl !== 'null' &&
                          postRequest.imageUrl.startsWith('http');
      const hasVideoUrl = postRequest.videoUrl &&
                          postRequest.videoUrl.trim() !== '' &&
                          postRequest.videoUrl !== 'null' &&
                          postRequest.videoUrl.startsWith('http');
      const hasArticleUrl = postRequest.articleUrl &&
                            postRequest.articleUrl.trim() !== '' &&
                            postRequest.articleUrl !== 'null' &&
                            postRequest.articleUrl.startsWith('http');

      // DEBUG: Log URL detection
      console.log('🔍 Media URL Detection:');
      console.log('  imageUrl raw:', postRequest.imageUrl);
      console.log('  hasImageUrl:', hasImageUrl);
      console.log('  videoUrl raw:', postRequest.videoUrl);
      console.log('  hasVideoUrl:', hasVideoUrl);
      console.log('  articleUrl raw:', postRequest.articleUrl);
      console.log('  hasArticleUrl:', hasArticleUrl);

      // Auto-detect media type from URLs (always, regardless of shareMediaCategory value)
      if (hasImageUrl) {
        shareMediaCategory = 'IMAGE';
      } else if (hasVideoUrl) {
        shareMediaCategory = 'VIDEO';
      } else if (hasArticleUrl) {
        shareMediaCategory = 'ARTICLE';
      }

      console.log('📊 Auto-detected shareMediaCategory:', shareMediaCategory);

      this.logger.log('LinkedIn Create Post - Input URLs:', {
        imageUrl: postRequest.imageUrl,
        videoUrl: postRequest.videoUrl,
        articleUrl: postRequest.articleUrl,
      });
      this.logger.log('Auto-detected media category:', shareMediaCategory);

      // Check if organization posting is supported for this credential
      const hasOrgSupport = this.config.credentials?.organization_support === true;

      console.log('🔐 Organization Support Check:');
      console.log('  hasOrgSupport:', hasOrgSupport);
      console.log('  postAs:', postAs);
      console.log('  organizationUrn:', postRequest.organizationUrn);

      // Debug: Log credentials to see what we're getting
      this.logger.log('DEBUG - Credentials object:', JSON.stringify({
        organization_support: this.config.credentials?.organization_support,
        hasOrgSupport,
        credentialsKeys: Object.keys(this.config.credentials || {}),
      }));

      // Determine author URN
      let authorUrn = '';
      if (postAs === 'organization' && postRequest.organizationUrn) {
        // Validate organization support is enabled
        if (!hasOrgSupport) {
          console.log('❌ Organization support NOT enabled - returning error');
          this.logger.warn('Attempting to post as organization without organization_support enabled');
          return {
            success: false,
            error: {
              code: 'ORGANIZATION_SUPPORT_NOT_ENABLED',
              message: 'To post as an organization, you need to reconnect your LinkedIn account with "Organization Support" enabled. Please delete this credential and create a new one, ensuring the organization support checkbox is checked before connecting.',
            },
          };
        }

        // Handle both full URN and just the ID
        const orgUrn = postRequest.organizationUrn;
        if (orgUrn.startsWith('urn:li:organization:')) {
          authorUrn = orgUrn;
        } else {
          authorUrn = `urn:li:organization:${orgUrn}`;
        }
        console.log('✅ Posting as organization:', authorUrn);
      } else {
        authorUrn = `urn:li:person:${this.personUrn}`;
        console.log('✅ Posting as person:', authorUrn);
      }

      // Build base request body using new LinkedIn API format
      let body: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        visibility: visibility,
        isReshareDisabledByAuthor: false,
      };

      console.log('📝 Base request body built');
      console.log('🖼️ Processing media category:', shareMediaCategory);

      // Handle different media categories
      if (shareMediaCategory === 'IMAGE') {
        console.log('📸 Calling addImageToPost...');
        await this.addImageToPost(body, text, postRequest);
        console.log('✅ addImageToPost completed');
      } else if (shareMediaCategory === 'VIDEO') {
        console.log('🎬 Calling addVideoToPost...');
        await this.addVideoToPost(body, text, postRequest);
        console.log('✅ addVideoToPost completed');
      } else if (shareMediaCategory === 'ARTICLE') {
        console.log('📰 Calling addArticleToPost...');
        await this.addArticleToPost(body, text, postRequest);
        console.log('✅ addArticleToPost completed');
      } else {
        // Text-only post
        console.log('📝 Text-only post');
        body.commentary = text;
      }

      // Make the post request to new /rest/posts endpoint
      console.log('🚀 Making POST request to LinkedIn /rest/posts...');
      console.log('Request body:', JSON.stringify(body, null, 2));
      this.logger.log('Creating LinkedIn post with body:', JSON.stringify(body, null, 2));
      const response = await this.httpClient.post('/rest/posts', body);
      console.log('✅ LinkedIn API response received');
      console.log('Response status:', response.status);
      console.log('Response headers x-restli-id:', response.headers['x-restli-id']);

      // Extract URN from response headers
      const postUrn = response.headers['x-restli-id'];

      return {
        success: true,
        data: {
          urn: postUrn,
          ...response.data,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create LinkedIn post:', error);
      this.logger.error('LinkedIn API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // Provide helpful error message for organization permission issue
      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage?.includes('Organization permissions') ||
          errorMessage?.includes('organization as author')) {
        // Log additional context for debugging
        this.logger.error('Organization permission error - credential has org_support:',
          this.config.credentials?.organization_support,
          'scope:', this.config.credentials?.scope
        );

        return {
          success: false,
          error: {
            code: 'ORGANIZATION_PERMISSION_REQUIRED',
            message: 'Organization posting requires the w_organization_social scope. This can happen if: (1) Your LinkedIn credential was created without "Organization Support" enabled - delete it and reconnect with this option checked, or (2) Your LinkedIn Developer App does not have Marketing Developer Platform access - apply for it at developer.linkedin.com, or (3) You are not an admin of the organization page you are trying to post to.',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'LINKEDIN_POST_FAILED',
          message: errorMessage,
        },
      };
    }
  }

  private formatLinkedInText(text: string): string {
    // LinkedIn "little text" format requires escaping special characters
    return text.replace(/[\(*\)\[\]\{\}<>@|~_]/gm, (char) => '\\' + char);
  }

  private async addImageToPost(body: any, text: string, request: LinkedInPostRequest): Promise<void> {
    console.log('📸 addImageToPost started');
    console.log('  imageUrl:', request.imageUrl);
    console.log('  imageUploadMethod:', request.imageUploadMethod);
    console.log('  author:', body.author);

    let imageId: string;
    const uploadMethod = request.imageUploadMethod || 'url';
    console.log('  uploadMethod:', uploadMethod);

    // Handle file upload from device
    if (uploadMethod === 'upload' && request.imageFile && request.imageFile.length > 0) {
      console.log('📤 Using file upload method');
      const imageFile = request.imageFile[0];
      if (!imageFile.fileData) {
        throw new Error('No file data provided for image upload');
      }
      const imageBuffer = this.extractBufferFromFileData(imageFile.fileData);
      const mimeType = imageFile.mimeType || 'image/jpeg';

      console.log(`  Uploading image from device: ${imageFile.fileName}, size: ${imageBuffer.length}, type: ${mimeType}`);
      this.logger.log(`Uploading image from device: ${imageFile.fileName}, size: ${imageBuffer.length}, type: ${mimeType}`);
      imageId = await this.uploadImageBinary(imageBuffer, mimeType, body.author);
    }
    // Handle legacy binaryData (for backward compatibility)
    else if (request.binaryData) {
      console.log('📤 Using legacy binaryData method');
      imageId = await this.uploadImageBinary(request.binaryData, request.binaryMimeType || 'image/jpeg', body.author);
    }
    // Handle URL-based upload (default and simplified approach)
    else if (request.imageUrl) {
      console.log('🌐 Using URL-based upload method');
      // Check if it's a LinkedIn URN or an external URL
      if (request.imageUrl.startsWith('urn:li:')) {
        // It's already a LinkedIn asset URN, use it directly
        console.log('  Image is already a LinkedIn URN');
        imageId = request.imageUrl;
      } else if (request.imageUrl.startsWith('http://') || request.imageUrl.startsWith('https://')) {
        // It's an external URL - download and upload to LinkedIn
        console.log(`⬇️ Downloading image from URL: ${request.imageUrl}`);
        this.logger.log(`Downloading image from URL: ${request.imageUrl}`);
        const imageBuffer = await this.downloadImageFromUrl(request.imageUrl);
        console.log(`✅ Image downloaded, size: ${imageBuffer.length} bytes`);

        // Determine MIME type from URL or use default
        const mimeType = this.getMimeTypeFromUrl(request.imageUrl) || request.binaryMimeType || 'image/jpeg';
        console.log(`  MIME type: ${mimeType}`);

        console.log(`⬆️ Uploading image to LinkedIn...`);
        this.logger.log(`Uploading downloaded image to LinkedIn (${mimeType})`);
        imageId = await this.uploadImageBinary(imageBuffer, mimeType, body.author);
        console.log(`✅ Image uploaded to LinkedIn, imageId: ${imageId}`);
      } else {
        throw new Error('Invalid image URL format. Must be a LinkedIn URN (urn:li:...) or a valid HTTP/HTTPS URL');
      }
    } else {
      throw new Error('Image URL or file upload is required for IMAGE posts');
    }

    // Add image to post body
    console.log('✅ Adding image to post body, imageId:', imageId);
    body.content = {
      media: {
        title: request.imageTitle || '',
        id: imageId,
      },
    };
    body.commentary = text;
    console.log('✅ addImageToPost completed');
  }

  /**
   * Add video to LinkedIn post
   */
  private async addVideoToPost(body: any, text: string, request: LinkedInPostRequest): Promise<void> {
    let videoId: string;
    const uploadMethod = request.videoUploadMethod || 'url';

    // Handle file upload from device
    if (uploadMethod === 'upload' && request.videoFile && request.videoFile.length > 0) {
      const videoFile = request.videoFile[0];
      if (!videoFile.fileData) {
        throw new Error('No file data provided for video upload');
      }
      const videoBuffer = this.extractBufferFromFileData(videoFile.fileData);
      const mimeType = videoFile.mimeType || 'video/mp4';

      this.logger.log(`Uploading video from device: ${videoFile.fileName}, size: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)}MB, type: ${mimeType}`);
      videoId = await this.uploadVideo(videoBuffer, mimeType, body.author);
    }
    // Handle URL-based upload (default and simplified approach)
    else if (request.videoUrl) {
      if (request.videoUrl.startsWith('urn:li:')) {
        // It's already a LinkedIn asset URN
        videoId = request.videoUrl;
      } else if (request.videoUrl.startsWith('http://') || request.videoUrl.startsWith('https://')) {
        // Download and upload to LinkedIn
        this.logger.log(`Downloading video from URL: ${request.videoUrl}`);
        const videoBuffer = await this.downloadVideoFromUrl(request.videoUrl);

        const mimeType = this.getVideoMimeTypeFromUrl(request.videoUrl) || 'video/mp4';
        this.logger.log(`Uploading downloaded video to LinkedIn (${mimeType})`);
        videoId = await this.uploadVideo(videoBuffer, mimeType, body.author);
      } else {
        throw new Error('Invalid video URL format. Must be a LinkedIn URN (urn:li:...) or a valid HTTP/HTTPS URL');
      }
    } else {
      throw new Error('Video URL or file upload is required for VIDEO posts');
    }

    // Add video to post body
    body.content = {
      media: {
        title: request.videoTitle || '',
        id: videoId,
      },
    };
    body.commentary = text;
  }

  /**
   * Extract buffer from base64 file data
   */
  private extractBufferFromFileData(fileData: string): Buffer {
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const base64Match = fileData.match(/^data:(.+?);base64,(.+)$/);
      if (base64Match) {
        return Buffer.from(base64Match[2], 'base64');
      }
      throw new Error('Invalid base64 data URL format');
    } else if (Buffer.isBuffer(fileData)) {
      return fileData;
    }
    throw new Error('Unsupported file data format');
  }

  private async addArticleToPost(body: any, text: string, request: LinkedInPostRequest): Promise<void> {
    if (!request.articleUrl) {
      throw new Error('Article URL is required for ARTICLE posts');
    }

    const articleContent: any = {
      article: {
        title: request.articleTitle || '',
        description: request.articleDescription || '',
        source: request.articleUrl,
      },
    };

    // Optionally add thumbnail
    if (request.thumbnailUrl) {
      if (request.binaryData) {
        // Upload thumbnail binary data
        const thumbnailId = await this.uploadImageBinary(
          request.binaryData,
          request.binaryMimeType || 'image/jpeg',
          body.author
        );
        articleContent.article.thumbnail = thumbnailId;
      } else {
        articleContent.article.thumbnail = request.thumbnailUrl;
      }
    }

    body.content = articleContent;
    body.commentary = text;
  }

  private async uploadImageBinary(imageData: Buffer, mimeType: string, authorUrn: string): Promise<string> {
    try {
      this.logger.log(`Uploading image: ${(imageData.length / 1024).toFixed(2)}KB, MIME: ${mimeType}, Author: ${authorUrn}`);

      // Step 1: Initialize upload
      const registerRequest = {
        initializeUploadRequest: {
          owner: authorUrn,
        },
      };

      this.logger.log('Step 1: Initializing LinkedIn image upload...');
      const registerResponse = await this.httpClient.post<LinkedInImageUploadResponse>(
        '/rest/images?action=initializeUpload',
        registerRequest
      );

      const { uploadUrl, image } = registerResponse.data.value;
      this.logger.log(`Step 1 Success: Received upload URL and image ID: ${image}`);

      // Step 2: Upload image data to LinkedIn's upload URL
      this.logger.log('Step 2: Uploading image binary to LinkedIn upload URL...');
      await axios.put(uploadUrl, imageData, {
        headers: {
          'Content-Type': mimeType,
        },
      });

      this.logger.log(`Step 2 Success: Image uploaded successfully. Image ID: ${image}`);
      return image;
    } catch (error) {
      this.logger.error('Failed to upload image to LinkedIn:', error);
      this.logger.error('LinkedIn Image Upload Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error('Failed to upload image: ' + error.message);
    }
  }

  /**
   * Download image from external URL
   */
  private async downloadImageFromUrl(url: string): Promise<Buffer> {
    this.logger.log(`Attempting to download image from URL: ${url}`);

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max (LinkedIn limit)
        validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx responses
      });

      this.logger.log(`Image download response status: ${response.status}`);
      this.logger.log(`Image download response headers:`, response.headers);

      const imageBuffer = Buffer.from(response.data);

      // Validate file size (LinkedIn supports up to 10MB for images)
      const fileSizeInMB = imageBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 10) {
        throw new Error(`Image exceeds 10MB limit (${fileSizeInMB.toFixed(2)}MB)`);
      }

      if (imageBuffer.length === 0) {
        throw new Error('Downloaded image is empty (0 bytes)');
      }

      this.logger.log(`Successfully downloaded image: ${fileSizeInMB.toFixed(2)}MB, ${imageBuffer.length} bytes`);
      return imageBuffer;
    } catch (error) {
      this.logger.error('Failed to download image from URL:', url);
      this.logger.error('Download error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
      });
      throw new Error(`Failed to download image from URL (${error.response?.status || error.code || 'unknown'}): ${error.message}`);
    }
  }

  /**
   * Determine MIME type from URL file extension
   */
  private getMimeTypeFromUrl(url: string): string | null {
    try {
      const urlLower = url.toLowerCase();

      if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
        return 'image/jpeg';
      } else if (urlLower.includes('.png')) {
        return 'image/png';
      } else if (urlLower.includes('.gif')) {
        return 'image/gif';
      } else if (urlLower.includes('.webp')) {
        return 'image/webp';
      }

      return null; // Unknown type
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine video MIME type from URL file extension
   */
  private getVideoMimeTypeFromUrl(url: string): string | null {
    try {
      const urlLower = url.toLowerCase();

      if (urlLower.includes('.mp4')) {
        return 'video/mp4';
      } else if (urlLower.includes('.mov')) {
        return 'video/quicktime';
      } else if (urlLower.includes('.avi')) {
        return 'video/x-msvideo';
      } else if (urlLower.includes('.webm')) {
        return 'video/webm';
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Download video from external URL
   */
  private async downloadVideoFromUrl(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minute timeout for videos
        maxContentLength: 200 * 1024 * 1024, // 200MB max (LinkedIn limit)
      });

      const videoBuffer = Buffer.from(response.data);

      // Validate file size (LinkedIn supports up to 200MB for videos)
      const fileSizeInMB = videoBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 200) {
        throw new Error(`Video exceeds 200MB limit (${fileSizeInMB.toFixed(2)}MB)`);
      }

      this.logger.log(`Downloaded video: ${fileSizeInMB.toFixed(2)}MB`);
      return videoBuffer;
    } catch (error) {
      this.logger.error('Failed to download video from URL:', error);
      throw new Error(`Failed to download video from URL: ${error.message}`);
    }
  }

  /**
   * Upload video to LinkedIn using the Video API
   * LinkedIn video upload flow:
   * 1. Initialize upload to get upload URL(s) and video ID
   * 2. Upload video data to the upload URL(s) - collect ETags
   * 3. Finalize the upload with collected ETags
   */
  private async uploadVideo(videoData: Buffer, mimeType: string, authorUrn: string): Promise<string> {
    try {
      const fileSizeInMB = videoData.length / (1024 * 1024);
      this.logger.log(`Uploading video: ${fileSizeInMB.toFixed(2)}MB, MIME: ${mimeType}, Author: ${authorUrn}`);

      // Validate file size
      if (fileSizeInMB > 200) {
        throw new Error(`Video exceeds 200MB limit (${fileSizeInMB.toFixed(2)}MB)`);
      }

      // Step 1: Initialize video upload
      const registerRequest = {
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: videoData.length,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      };

      this.logger.log('Step 1: Initializing LinkedIn video upload...');
      const registerResponse = await this.httpClient.post(
        '/rest/videos?action=initializeUpload',
        registerRequest
      );

      const uploadInstructions = registerResponse.data.value;
      const videoUrn = uploadInstructions.video;
      const uploadToken = uploadInstructions.uploadToken || '';
      const instructions = uploadInstructions.uploadInstructions || [];

      if (!instructions.length) {
        throw new Error('No upload instructions received from LinkedIn');
      }

      this.logger.log(`Step 1 Success: Video URN: ${videoUrn}, ${instructions.length} upload instruction(s)`);

      // Step 2: Upload video data according to instructions
      this.logger.log('Step 2: Uploading video binary to LinkedIn...');
      const uploadedPartIds: string[] = [];

      // LinkedIn may provide multiple upload instructions for chunked uploads
      for (let i = 0; i < instructions.length; i++) {
        const instruction = instructions[i];
        const uploadUrl = instruction.uploadUrl;
        const firstByte = instruction.firstByte || 0;
        const lastByte = instruction.lastByte || videoData.length - 1;

        // Extract the chunk based on byte range
        const chunk = videoData.slice(firstByte, lastByte + 1);

        this.logger.log(`Uploading part ${i + 1}/${instructions.length}: bytes ${firstByte}-${lastByte} (${chunk.length} bytes)`);

        const uploadResponse = await axios.put(uploadUrl, chunk, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          timeout: 300000, // 5 minutes per chunk
        });

        // Collect ETag for finalization
        const etag = uploadResponse.headers['etag'];
        if (etag) {
          uploadedPartIds.push(etag);
          this.logger.log(`Part ${i + 1} uploaded, ETag: ${etag}`);
        }
      }

      this.logger.log(`Step 2 Success: Video uploaded successfully, ${uploadedPartIds.length} parts`);

      // Step 3: Finalize upload
      this.logger.log('Step 3: Finalizing video upload...');
      await this.httpClient.post('/rest/videos?action=finalizeUpload', {
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: uploadToken,
          uploadedPartIds: uploadedPartIds,
        },
      });

      this.logger.log(`Step 3 Success: Video finalized. Video URN: ${videoUrn}`);
      return videoUrn;
    } catch (error) {
      this.logger.error('Failed to upload video to LinkedIn:', error);
      this.logger.error('LinkedIn Video Upload Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error('Failed to upload video: ' + error.message);
    }
  }

  async getPosts(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      // Ensure we have person URN
      await this.ensurePersonUrn();

      const count = Math.min(options?.limit || 20, 50);
      const start = options?.offset || 0;

      const response = await this.httpClient.get(
        `/ugcPosts?q=authors&authors=List(urn:li:person:${this.personUrn})&count=${count}&start=${start}`
      );

      return {
        success: true,
        data: {
          items: response.data.elements || [],
          pagination: {
            total: response.data.paging?.total || 0,
            start: response.data.paging?.start || 0,
            count: response.data.paging?.count || 0
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to get LinkedIn posts:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getUserProfile(userId?: string, customFields?: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      const legacy = this.config.credentials?.legacy;

      // Modern API - fixed fields, no customization
      if (!legacy) {
        const endpoint = '/v2/userinfo';
        const response = await this.httpClient.get(endpoint);

        return {
          success: true,
          data: response.data,
        };
      }

      // Legacy API - supports field projection
      const defaultFields = 'id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams)';
      const fields = customFields || defaultFields;
      const projection = `(${fields})`;
      const endpoint = userId ? `/people/id=${userId}:${projection}` : `/people/~:${projection}`;

      const response = await this.httpClient.get(endpoint);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to get LinkedIn profile:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      if (type === 'followers') {
        // LinkedIn API doesn't provide direct access to followers
        return {
          success: false,
          error: {
            code: 'NOT_SUPPORTED',
            message: 'LinkedIn API does not provide access to followers list'
          },
        };
      }

      // Get connections (following)
      const count = Math.min(options?.limit || 50, 500);
      const start = options?.offset || 0;

      const response = await this.httpClient.get(
        `/people/~/connections?count=${count}&start=${start}&fields=(id,firstName,lastName,headline)`
      );

      return {
        success: true,
        data: {
          items: response.data.values || [],
          pagination: {
            total: response.data._total || 0,
            start: start,
            count: response.data._count || 0
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to get LinkedIn connections:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse> {
    // LinkedIn API doesn't natively support scheduled posts
    // This would require a custom scheduling implementation
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Scheduled posts not supported by LinkedIn API'
      },
    };
  }

  async getCompanyUpdates(companyId: string, options?: any): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      const count = Math.min(options?.count || 20, 50);
      const start = options?.start || 0;

      const response = await this.httpClient.get(
        `/ugcPosts?q=authors&authors=List(urn:li:organization:${companyId})&count=${count}&start=${start}`
      );

      return {
        success: true,
        data: {
          items: response.data.elements || [],
          pagination: {
            total: response.data.paging?.total || 0,
            start: response.data.paging?.start || 0,
            count: response.data.paging?.count || 0
          }
        },
      };
    } catch (error) {
      this.logger.error('Failed to get LinkedIn company updates:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async executeAction(actionId: string, input: any): Promise<ConnectorResponse> {
    switch (actionId) {
      case 'create_post':
        return this.postContent(input);
      case 'get_profile':
        return this.getUserProfile(input.user_id, input.fields);
      case 'get_company_updates':
        return this.getCompanyUpdates(input.company_id, input);
      case 'get_person_urn':
        return this.getPersonUrnWithInfo();
      case 'get_organizations':
        return this.getOrganizations();
      case 'get_post':
        return this.getPost(input.postId);
      case 'get_post_stats':
        return this.getPostStats(input.postId);
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${actionId}`
          },
        };
    }
  }

  async getPersonUrnWithInfo(): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      const legacy = this.config.credentials?.legacy;
      let endpoint = '/v2/userinfo';
      if (legacy) {
        endpoint = '/v2/me';
      }

      const response = await this.httpClient.get(endpoint);
      const personData = response.data;

      let firstName = '';
      let lastName = '';
      let personId = '';

      if (legacy) {
        firstName = personData.localizedFirstName || '';
        lastName = personData.localizedLastName || '';
        personId = personData.id;
      } else {
        firstName = personData.given_name || '';
        lastName = personData.family_name || '';
        personId = personData.sub;
      }

      const name = `${firstName} ${lastName}`;

      return {
        success: true,
        data: {
          id: personId,
          name,
          firstName,
          lastName,
          urn: `urn:li:person:${personId}`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get person URN:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getOrganizations(): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      // Get organizations where user has admin access
      const response = await this.httpClient.get(
        `/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,vanityName)))`
      );

      const organizations = response.data.elements?.map((element: any) => {
        const org = element['organization~'];
        return {
          id: element.organization.split(':').pop(),
          name: org.localizedName,
          vanityName: org.vanityName,
          urn: element.organization,
        };
      }) || [];

      return {
        success: true,
        data: {
          organizations,
          count: organizations.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get organizations:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get engagement statistics for a LinkedIn post
   * @param postId - The post URN (e.g., urn:li:share:123456789) or just the ID
   */
  async getPostStats(postId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      this.logger.log(`Fetching post stats for: ${postId}`);

      // Normalize the post URN
      let postUrn = postId;
      if (!postId.startsWith('urn:li:')) {
        postUrn = `urn:li:share:${postId}`;
      }

      // URL encode the URN for the API call
      const encodedUrn = encodeURIComponent(postUrn);

      let numLikes = 0;
      let numComments = 0;
      let numShares = 0;
      let numViews = 0;

      // Try to get reactions count using Social Actions API
      try {
        const reactionsResponse = await this.httpClient.get(
          `/v2/socialActions/${encodedUrn}/reactions?count=0`,
          {
            headers: {
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );
        numLikes = reactionsResponse.data?.paging?.total || 0;
        this.logger.log(`Reactions count: ${numLikes}`);
      } catch (reactionsError: any) {
        this.logger.warn(`Could not fetch reactions: ${reactionsError.message}`);

        // Try alternative: GET the summary
        try {
          const summaryResponse = await this.httpClient.get(
            `/v2/socialActions/${encodedUrn}`,
            {
              headers: {
                'X-Restli-Protocol-Version': '2.0.0',
              },
            }
          );
          numLikes = summaryResponse.data?.likesSummary?.totalLikes || 0;
          numComments = summaryResponse.data?.commentsSummary?.totalFirstLevelComments || 0;
          this.logger.log(`From summary - Likes: ${numLikes}, Comments: ${numComments}`);
        } catch (summaryError: any) {
          this.logger.warn(`Could not fetch social actions summary: ${summaryError.message}`);
        }
      }

      // Try to get comments count
      try {
        const commentsResponse = await this.httpClient.get(
          `/v2/socialActions/${encodedUrn}/comments?count=0`,
          {
            headers: {
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );
        numComments = commentsResponse.data?.paging?.total || numComments;
        this.logger.log(`Comments count: ${numComments}`);
      } catch (commentsError: any) {
        this.logger.warn(`Could not fetch comments: ${commentsError.message}`);
      }

      // Note: Organization share statistics (impressions, views) require Marketing Developer Platform access
      // which most apps don't have. The Social Actions API above provides likes and comments.
      // Skip the organization stats fetch to avoid noisy 403 errors.
      // If you have Marketing Developer Platform access, you can uncomment the code below.

      return {
        success: true,
        data: {
          postId: postUrn,
          numLikes,
          numComments,
          numShares,
          numViews,
          // For compatibility with engagement fetcher
          likesSummary: { totalLikes: numLikes },
          commentsSummary: { totalComments: numComments },
          shareStatistics: { shareCount: numShares },
          impressionCount: numViews,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to get post stats:', error);

      return {
        success: false,
        error: {
          code: 'GET_POST_STATS_FAILED',
          message: error.response?.data?.message || error.message,
          details: error.response?.data,
        },
      };
    }
  }

  /**
   * Get a LinkedIn post by its URN or ID
   * @param postId - The post URN (e.g., urn:li:share:123456789 or urn:li:ugcPost:123456789) or just the ID
   */
  async getPost(postId: string): Promise<ConnectorResponse> {
    try {
      if (!this.httpClient) {
        throw new Error('LinkedIn client not initialized');
      }

      if (!postId) {
        throw new Error('Post ID is required');
      }

      console.log('\n' + '='.repeat(60));
      console.log('🔵 LINKEDIN GET POST - DEBUG');
      console.log('='.repeat(60));
      console.log('Input postId:', postId);

      // Normalize the post URN
      let postUrn = postId;

      // If it's just a number, try both share and ugcPost formats
      if (!postId.startsWith('urn:li:')) {
        // Try to determine the type from the number format
        postUrn = `urn:li:share:${postId}`;
        console.log('Converted to URN:', postUrn);
      }

      // URL encode the URN for the API call
      const encodedUrn = encodeURIComponent(postUrn);

      console.log('Encoded URN:', encodedUrn);
      console.log('='.repeat(60) + '\n');

      // Try the Posts API first (newer API)
      try {
        console.log('🔍 Trying /rest/posts endpoint...');
        const response = await this.httpClient.get(`/rest/posts/${encodedUrn}`, {
          headers: {
            'LinkedIn-Version': this.LINKEDIN_API_VERSION,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        });

        console.log('✅ Post found via /rest/posts');
        console.log('Response:', JSON.stringify(response.data, null, 2));

        return {
          success: true,
          data: {
            id: response.data.id || postUrn,
            author: response.data.author,
            commentary: response.data.commentary,
            visibility: response.data.visibility,
            lifecycleState: response.data.lifecycleState,
            createdAt: response.data.createdAt,
            lastModifiedAt: response.data.lastModifiedAt,
            content: response.data.content,
            distribution: response.data.distribution,
            rawResponse: response.data,
          },
        };
      } catch (postsError: any) {
        console.log('❌ /rest/posts failed:', postsError.response?.status, postsError.response?.data?.message || postsError.message);

        // If it was a share URN, try ugcPost format
        if (postUrn.includes('urn:li:share:')) {
          const ugcPostUrn = postUrn.replace('urn:li:share:', 'urn:li:ugcPost:');
          const encodedUgcUrn = encodeURIComponent(ugcPostUrn);

          console.log('🔍 Trying with ugcPost URN:', ugcPostUrn);

          try {
            const ugcResponse = await this.httpClient.get(`/rest/posts/${encodedUgcUrn}`, {
              headers: {
                'LinkedIn-Version': this.LINKEDIN_API_VERSION,
                'X-Restli-Protocol-Version': '2.0.0',
              },
            });

            console.log('✅ Post found via ugcPost URN');
            console.log('Response:', JSON.stringify(ugcResponse.data, null, 2));

            return {
              success: true,
              data: {
                id: ugcResponse.data.id || ugcPostUrn,
                author: ugcResponse.data.author,
                commentary: ugcResponse.data.commentary,
                visibility: ugcResponse.data.visibility,
                lifecycleState: ugcResponse.data.lifecycleState,
                createdAt: ugcResponse.data.createdAt,
                lastModifiedAt: ugcResponse.data.lastModifiedAt,
                content: ugcResponse.data.content,
                distribution: ugcResponse.data.distribution,
                rawResponse: ugcResponse.data,
              },
            };
          } catch (ugcError: any) {
            console.log('❌ ugcPost URN also failed:', ugcError.response?.status, ugcError.response?.data?.message || ugcError.message);
          }
        }

        // Try the legacy UGC Posts API
        try {
          console.log('🔍 Trying legacy /v2/ugcPosts endpoint...');
          const legacyResponse = await this.httpClient.get(`/v2/ugcPosts/${encodedUrn}`);

          console.log('✅ Post found via legacy /v2/ugcPosts');
          console.log('Response:', JSON.stringify(legacyResponse.data, null, 2));

          return {
            success: true,
            data: {
              id: legacyResponse.data.id || postUrn,
              author: legacyResponse.data.author,
              commentary: legacyResponse.data.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text,
              visibility: legacyResponse.data.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'],
              lifecycleState: legacyResponse.data.lifecycleState,
              createdAt: legacyResponse.data.created?.time,
              lastModifiedAt: legacyResponse.data.lastModified?.time,
              rawResponse: legacyResponse.data,
            },
          };
        } catch (legacyError: any) {
          console.log('❌ Legacy API also failed:', legacyError.response?.status, legacyError.response?.data?.message || legacyError.message);
        }

        // Try shares API as last resort
        try {
          console.log('🔍 Trying /v2/shares endpoint...');
          const sharesResponse = await this.httpClient.get(`/v2/shares/${encodedUrn}`);

          console.log('✅ Post found via /v2/shares');
          console.log('Response:', JSON.stringify(sharesResponse.data, null, 2));

          return {
            success: true,
            data: {
              id: sharesResponse.data.id || postUrn,
              author: sharesResponse.data.owner,
              commentary: sharesResponse.data.text?.text,
              visibility: sharesResponse.data.distribution?.linkedInDistributionTarget?.visibleToGuest ? 'PUBLIC' : 'CONNECTIONS',
              lifecycleState: 'PUBLISHED',
              createdAt: sharesResponse.data.created?.time,
              lastModifiedAt: sharesResponse.data.lastModified?.time,
              rawResponse: sharesResponse.data,
            },
          };
        } catch (sharesError: any) {
          console.log('❌ Shares API also failed:', sharesError.response?.status, sharesError.response?.data?.message || sharesError.message);
        }

        // All attempts failed
        throw postsError;
      }
    } catch (error: any) {
      this.logger.error('Failed to get post:', error);
      console.log('❌ LINKEDIN GET POST FAILED');
      console.log('Error:', error.response?.data || error.message);

      return {
        success: false,
        error: {
          code: 'GET_POST_FAILED',
          message: `${error.response?.data?.message || error.message} (HTTP ${error.response?.status || 'unknown'})`,
          details: error.response?.data,
        },
      };
    }
  }
}