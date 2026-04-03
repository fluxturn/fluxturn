/**
 * Spotify Connector Tests
 */
import nock from 'nock';
import { SpotifyConnector } from '../spotify.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('SpotifyConnector', () => {
  let connector: SpotifyConnector;
  const BASE_URL = 'https://api.spotify.com/v1';

  beforeEach(async () => {
    nock.cleanAll();
    connector = await ConnectorTestHelper.createConnector(SpotifyConnector, 'spotify');
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('testConnection', () => {
    it('should return success when API responds with 200', async () => {
      nock(BASE_URL)
        .get('/me')
        .reply(200, { id: 'testuser', display_name: 'Test User' });

      const result = await connector.testConnection();
      expect(result.success).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/me')
        .reply(401, { error: { message: 'The access token expired' } });

      const result = await connector.testConnection();
      expect(result.success).toBe(false);
    });
  });

  describe('player_pause', () => {
    it('should pause playback successfully', async () => {
      nock(BASE_URL)
        .put('/me/player/pause')
        .reply(204);

      const result = await connector.executeAction('player_pause', {});

      expect(result.success).toBe(true);
    });

    it('should handle no active device error', async () => {
      nock(BASE_URL)
        .put('/me/player/pause')
        .reply(404, { error: { message: 'Player command failed: No active device found' } });

      const result = await connector.executeAction('player_pause', {});

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  describe('track_search', () => {
    it('should search for tracks successfully', async () => {
      const mockResponse = {
        tracks: {
          items: [
            {
              id: '3n3Ppam7vgaVa1iaRUc9Lp',
              name: 'Mr. Brightside',
              artists: [{ name: 'The Killers' }],
              album: { name: 'Hot Fuss' }
            }
          ],
          total: 1
        }
      };

      nock(BASE_URL)
        .get('/search')
        .query(true)
        .reply(200, mockResponse);

      const result = await connector.executeAction('track_search', {
        query: 'Mr. Brightside'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});
      expect(result.success).toBe(false);
    });
  });
});
