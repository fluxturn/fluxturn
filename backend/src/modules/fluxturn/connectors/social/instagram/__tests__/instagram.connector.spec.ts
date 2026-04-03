/**
 * Instagram Connector Tests
 *
 * Tests for the Instagram connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { InstagramConnector } from '../instagram.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('InstagramConnector', () => {
  let connector: InstagramConnector;
  const BASE_URL = 'https://graph.facebook.com/v18.0';
  const MOCK_INSTAGRAM_ACCOUNT_ID = '17841400008460056';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(InstagramConnector, 'instagram');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}`)
        .query({ fields: 'account_type,username,name', access_token: /.+/ })
        .reply(200, {
          account_type: 'BUSINESS',
          username: 'test_account',
          name: 'Test Account',
          id: MOCK_INSTAGRAM_ACCOUNT_ID,
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}`)
        .query({ fields: 'account_type,username,name', access_token: /.+/ })
        .reply(401, {
          error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190,
          },
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when network error occurs', async () => {
      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}`)
        .query({ fields: 'account_type,username,name', access_token: /.+/ })
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Publish Image Action Tests
  // ===========================================
  describe('publish_image', () => {
    it('should publish single image successfully', async () => {
      const mockContainerId = '17895695668004550';
      const mockMediaId = '17895695668004551';

      // Mock container creation
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, {
          id: mockContainerId,
        });

      // Mock media publish
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, {
          id: mockMediaId,
        });

      const result = await connector.executeAction('publish_image', {
        image_url: 'https://example.com/image.jpg',
        caption: 'Test post caption',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', mockMediaId);
      expect(result.data).toHaveProperty('container_id', mockContainerId);
    });

    it('should publish carousel album successfully', async () => {
      const mockContainerIds = ['12345', '12346', '12347'];
      const mockMediaId = '17895695668004551';

      // Mock first image container
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerIds[0] });

      // Mock additional carousel items
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerIds[1] });

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerIds[2] });

      // Mock carousel album container
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: '99999' });

      // Mock media publish
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, { id: mockMediaId });

      const result = await connector.executeAction('publish_image', {
        image_url: 'https://example.com/image1.jpg',
        caption: 'Carousel post',
        is_carousel: true,
        children: [
          { image_url: 'https://example.com/image2.jpg' },
          { image_url: 'https://example.com/image3.jpg' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should handle validation error for missing image URL', async () => {
      const result = await connector.executeAction('publish_image', {
        caption: 'Caption without image',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API error during image publishing', async () => {
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(400, {
          error: {
            message: 'Invalid image URL',
            type: 'OAuthException',
            code: 100,
          },
        });

      const result = await connector.executeAction('publish_image', {
        image_url: 'invalid-url',
        caption: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Publish Reel Action Tests
  // ===========================================
  describe('publish_reel', () => {
    it('should publish reel successfully', async () => {
      const mockContainerId = '17895695668004550';
      const mockMediaId = '17895695668004551';

      // Mock reel container creation
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, {
          id: mockContainerId,
        });

      // Mock reel publish
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, {
          id: mockMediaId,
        });

      const result = await connector.executeAction('publish_reel', {
        video_url: 'https://example.com/reel.mp4',
        caption: 'Amazing reel!',
        share_to_feed: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', mockMediaId);
      expect(result.data).toHaveProperty('container_id', mockContainerId);
    });

    it('should publish reel with optional fields', async () => {
      const mockContainerId = '17895695668004550';
      const mockMediaId = '17895695668004551';

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerId });

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, { id: mockMediaId });

      const result = await connector.executeAction('publish_reel', {
        video_url: 'https://example.com/reel.mp4',
        caption: 'Reel with options',
        cover_url: 'https://example.com/cover.jpg',
        location_id: '123456',
        thumb_offset: 5000,
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing video URL error', async () => {
      const result = await connector.executeAction('publish_reel', {
        caption: 'Reel without video',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API error during reel publishing', async () => {
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(400, {
          error: {
            message: 'Video format not supported',
            type: 'OAuthException',
            code: 100,
          },
        });

      const result = await connector.executeAction('publish_reel', {
        video_url: 'https://example.com/invalid.mov',
        caption: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Publish Story Action Tests
  // ===========================================
  describe('publish_story', () => {
    it('should publish photo story successfully', async () => {
      const mockContainerId = '17895695668004550';
      const mockMediaId = '17895695668004551';

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerId });

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, { id: mockMediaId });

      const result = await connector.executeAction('publish_story', {
        content_type: 'photo',
        image_url: 'https://example.com/story.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', mockMediaId);
      expect(result.data).toHaveProperty('container_id', mockContainerId);
    });

    it('should publish video story successfully', async () => {
      const mockContainerId = '17895695668004550';
      const mockMediaId = '17895695668004551';

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(201, { id: mockContainerId });

      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media_publish`)
        .query({ access_token: /.+/ })
        .reply(200, { id: mockMediaId });

      const result = await connector.executeAction('publish_story', {
        content_type: 'video',
        video_url: 'https://example.com/story-video.mp4',
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing media URL error', async () => {
      const result = await connector.executeAction('publish_story', {
        content_type: 'photo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API error during story publishing', async () => {
      nock(BASE_URL)
        .post(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query({ access_token: /.+/ })
        .reply(400, {
          error: {
            message: 'Story dimensions invalid',
            type: 'OAuthException',
            code: 100,
          },
        });

      const result = await connector.executeAction('publish_story', {
        content_type: 'photo',
        image_url: 'https://example.com/wrong-size.jpg',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Media Action Tests
  // ===========================================
  describe('get_media', () => {
    it('should get media successfully', async () => {
      const mockMediaData = [
        {
          id: '17895695668004550',
          media_type: 'IMAGE',
          media_url: 'https://example.com/media1.jpg',
          caption: 'First post',
          timestamp: '2024-01-15T10:00:00Z',
          like_count: 150,
          comments_count: 25,
          permalink: 'https://instagram.com/p/abc123',
        },
        {
          id: '17895695668004551',
          media_type: 'VIDEO',
          media_url: 'https://example.com/media2.mp4',
          caption: 'Second post',
          timestamp: '2024-01-14T10:00:00Z',
          like_count: 200,
          comments_count: 30,
          permalink: 'https://instagram.com/p/def456',
        },
      ];

      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query(true)
        .reply(200, {
          data: mockMediaData,
          paging: {
            cursors: {
              after: 'next_cursor_value',
            },
            next: 'https://graph.facebook.com/v18.0/.../media?after=next_cursor_value',
          },
        });

      const result = await connector.executeAction('get_media', {
        limit: 25,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });

      expect(result.data.items).toHaveLength(2);
      expect(result.data.pagination).toBeDefined();
      expect(result.data.pagination.next_cursor).toBe('next_cursor_value');
      expect(result.data.pagination.has_more).toBe(true);
    });

    it('should get media with custom limit', async () => {
      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query(true)
        .reply(200, {
          data: [],
          paging: {},
        });

      const result = await connector.executeAction('get_media', {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should handle API error when getting media', async () => {
      nock(BASE_URL)
        .get(`/${MOCK_INSTAGRAM_ACCOUNT_ID}/media`)
        .query(true)
        .reply(500, {
          error: {
            message: 'Internal server error',
            type: 'OAuthException',
            code: 1,
          },
        });

      const result = await connector.executeAction('get_media', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Get Media Insights Action Tests
  // ===========================================
  describe('get_media_insights', () => {
    it('should get media insights successfully', async () => {
      const mockMediaId = '17895695668004550';
      const mockInsightsData = [
        {
          name: 'impressions',
          period: 'lifetime',
          values: [{ value: 1250 }],
          title: 'Impressions',
          description: 'Total number of times the media object has been seen',
          id: `${mockMediaId}/insights/impressions/lifetime`,
        },
        {
          name: 'reach',
          period: 'lifetime',
          values: [{ value: 980 }],
          title: 'Reach',
          description: 'Total number of unique accounts that have seen the media object',
          id: `${mockMediaId}/insights/reach/lifetime`,
        },
        {
          name: 'engagement',
          period: 'lifetime',
          values: [{ value: 175 }],
          title: 'Engagement',
          description: 'Total number of likes and comments',
          id: `${mockMediaId}/insights/engagement/lifetime`,
        },
      ];

      nock(BASE_URL)
        .get(`/${mockMediaId}/insights`)
        .query(true)
        .reply(200, {
          data: mockInsightsData,
        });

      const result = await connector.executeAction('get_media_insights', {
        media_id: mockMediaId,
        metric: 'impressions,reach,engagement',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('impressions');
      expect(result.data[1].name).toBe('reach');
      expect(result.data[2].name).toBe('engagement');
    });

    it('should get insights with default metrics', async () => {
      const mockMediaId = '17895695668004550';

      nock(BASE_URL)
        .get(`/${mockMediaId}/insights`)
        .query(true)
        .reply(200, {
          data: [],
        });

      const result = await connector.executeAction('get_media_insights', {
        media_id: mockMediaId,
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing media_id error', async () => {
      const result = await connector.executeAction('get_media_insights', {
        metric: 'impressions',
      });

      expect(result.success).toBe(false);
    });

    it('should handle API error when getting insights', async () => {
      const mockMediaId = '17895695668004550';

      nock(BASE_URL)
        .get(`/${mockMediaId}/insights`)
        .query(true)
        .reply(400, {
          error: {
            message: 'Insights not available for this media',
            type: 'OAuthException',
            code: 100,
          },
        });

      const result = await connector.executeAction('get_media_insights', {
        media_id: mockMediaId,
        metric: 'impressions',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
