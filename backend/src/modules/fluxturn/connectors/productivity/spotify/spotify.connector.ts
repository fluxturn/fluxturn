import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
} from '../../types';

@Injectable()
export class SpotifyConnector extends BaseConnector {
  protected readonly logger = new Logger(SpotifyConnector.name);
  private readonly baseUrl = 'https://api.spotify.com/v1';

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Spotify',
      description: 'Control Spotify playback, manage playlists, search tracks, albums, artists, and access user library data',
      version: '1.0.0',
      category: ConnectorCategory.PRODUCTIVITY,
      type: ConnectorType.SPOTIFY,
      authType: AuthType.OAUTH2,
      actions: [],
      triggers: [],
      webhookSupport: false,
    };
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.config.credentials?.accessToken) {
      throw new Error('Spotify access token is required');
    }
    this.logger.log('Spotify connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/me',
      });
      return !!response;
    } catch (error) {
      this.logger.error('Spotify connection test failed', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    if (!this.config?.credentials?.accessToken) {
      throw new Error('Access token not configured');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const url = `${this.baseUrl}${request.endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...request.headers,
    };

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Spotify API request failed', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Player actions
      case 'player_pause':
        return await this.playerPause();
      case 'player_resume':
        return await this.playerResume();
      case 'player_start_music':
        return await this.playerStartMusic(input);
      case 'player_next_song':
        return await this.playerNextSong();
      case 'player_previous_song':
        return await this.playerPreviousSong();
      case 'player_add_to_queue':
        return await this.playerAddToQueue(input);
      case 'player_set_volume':
        return await this.playerSetVolume(input);
      case 'player_currently_playing':
        return await this.playerCurrentlyPlaying();
      case 'player_recently_played':
        return await this.playerRecentlyPlayed(input);

      // Playlist actions
      case 'playlist_create':
        return await this.playlistCreate(input);
      case 'playlist_get':
        return await this.playlistGet(input);
      case 'playlist_get_user_playlists':
        return await this.playlistGetUserPlaylists(input);
      case 'playlist_get_tracks':
        return await this.playlistGetTracks(input);
      case 'playlist_add_item':
        return await this.playlistAddItem(input);
      case 'playlist_remove_item':
        return await this.playlistRemoveItem(input);
      case 'playlist_search':
        return await this.playlistSearch(input);

      // Track actions
      case 'track_get':
        return await this.trackGet(input);
      case 'track_get_audio_features':
        return await this.trackGetAudioFeatures(input);
      case 'track_search':
        return await this.trackSearch(input);

      // Album actions
      case 'album_get':
        return await this.albumGet(input);
      case 'album_get_tracks':
        return await this.albumGetTracks(input);
      case 'album_get_new_releases':
        return await this.albumGetNewReleases(input);
      case 'album_search':
        return await this.albumSearch(input);

      // Artist actions
      case 'artist_get':
        return await this.artistGet(input);
      case 'artist_get_albums':
        return await this.artistGetAlbums(input);
      case 'artist_get_top_tracks':
        return await this.artistGetTopTracks(input);
      case 'artist_get_related':
        return await this.artistGetRelated(input);
      case 'artist_search':
        return await this.artistSearch(input);

      // Library actions
      case 'library_get_liked_tracks':
        return await this.libraryGetLikedTracks(input);

      // User data actions
      case 'user_get_following_artists':
        return await this.userGetFollowingArtists(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Spotify connector cleanup completed');
  }

  // ==================== PLAYER ACTION IMPLEMENTATIONS ====================
  private async playerPause(): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'PUT',
        endpoint: '/me/player/pause',
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_PAUSE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerResume(): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'PUT',
        endpoint: '/me/player/play',
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_RESUME_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerStartMusic(input: any): Promise<ConnectorResponse> {
    try {
      const body = {
        context_uri: input.contextUri,
      };

      await this.performRequest({
        method: 'PUT',
        endpoint: '/me/player/play',
        body,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_START_MUSIC_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerNextSong(): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'POST',
        endpoint: '/me/player/next',
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_NEXT_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerPreviousSong(): Promise<ConnectorResponse> {
    try {
      await this.performRequest({
        method: 'POST',
        endpoint: '/me/player/previous',
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_PREVIOUS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerAddToQueue(input: any): Promise<ConnectorResponse> {
    try {
      const endpoint = `/me/player/queue?uri=${encodeURIComponent(input.uri)}`;

      await this.performRequest({
        method: 'POST',
        endpoint,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_ADD_TO_QUEUE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerSetVolume(input: any): Promise<ConnectorResponse> {
    try {
      const endpoint = `/me/player/volume?volume_percent=${input.volumePercent}`;

      await this.performRequest({
        method: 'PUT',
        endpoint,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_SET_VOLUME_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerCurrentlyPlaying(): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/me/player/currently-playing',
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_CURRENTLY_PLAYING_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playerRecentlyPlayed(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      const endpoint = `/me/player/recently-played?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYER_RECENTLY_PLAYED_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== PLAYLIST ACTION IMPLEMENTATIONS ====================
  private async playlistCreate(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        name: input.name,
      };

      if (input.description) {
        body.description = input.description;
      }

      if (input.public !== undefined) {
        body.public = input.public;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint: '/me/playlists',
        body,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_CREATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistGet(input: any): Promise<ConnectorResponse> {
    try {
      const playlistId = this.extractId(input.playlistId, 'playlist');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/playlists/${playlistId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistGetUserPlaylists(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      const endpoint = `/me/playlists?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_GET_USER_PLAYLISTS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistGetTracks(input: any): Promise<ConnectorResponse> {
    try {
      const playlistId = this.extractId(input.playlistId, 'playlist');
      const limit = input.limit || 20;
      const endpoint = `/playlists/${playlistId}/tracks?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_GET_TRACKS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistAddItem(input: any): Promise<ConnectorResponse> {
    try {
      const playlistId = this.extractId(input.playlistId, 'playlist');
      let endpoint = `/playlists/${playlistId}/tracks?uris=${encodeURIComponent(input.trackUri)}`;

      if (input.position !== undefined) {
        endpoint += `&position=${input.position}`;
      }

      const response = await this.performRequest({
        method: 'POST',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_ADD_ITEM_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistRemoveItem(input: any): Promise<ConnectorResponse> {
    try {
      const playlistId = this.extractId(input.playlistId, 'playlist');
      const body = {
        tracks: [
          {
            uri: input.trackUri,
          },
        ],
      };

      const response = await this.performRequest({
        method: 'DELETE',
        endpoint: `/playlists/${playlistId}/tracks`,
        body,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_REMOVE_ITEM_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async playlistSearch(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      let endpoint = `/search?q=${encodeURIComponent(input.query)}&type=playlist&limit=${limit}`;

      if (input.market) {
        endpoint += `&market=${input.market}`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAYLIST_SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== TRACK ACTION IMPLEMENTATIONS ====================
  private async trackGet(input: any): Promise<ConnectorResponse> {
    try {
      const trackId = this.extractId(input.trackId, 'track');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/tracks/${trackId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRACK_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async trackGetAudioFeatures(input: any): Promise<ConnectorResponse> {
    try {
      const trackId = this.extractId(input.trackId, 'track');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/audio-features/${trackId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRACK_GET_AUDIO_FEATURES_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async trackSearch(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      let endpoint = `/search?q=${encodeURIComponent(input.query)}&type=track&limit=${limit}`;

      if (input.market) {
        endpoint += `&market=${input.market}`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRACK_SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== ALBUM ACTION IMPLEMENTATIONS ====================
  private async albumGet(input: any): Promise<ConnectorResponse> {
    try {
      const albumId = this.extractId(input.albumId, 'album');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/albums/${albumId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALBUM_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async albumGetTracks(input: any): Promise<ConnectorResponse> {
    try {
      const albumId = this.extractId(input.albumId, 'album');
      const limit = input.limit || 20;
      const endpoint = `/albums/${albumId}/tracks?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALBUM_GET_TRACKS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async albumGetNewReleases(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      let endpoint = `/browse/new-releases?limit=${limit}`;

      if (input.country) {
        endpoint += `&country=${input.country}`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALBUM_GET_NEW_RELEASES_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async albumSearch(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      let endpoint = `/search?q=${encodeURIComponent(input.query)}&type=album&limit=${limit}`;

      if (input.market) {
        endpoint += `&market=${input.market}`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ALBUM_SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== ARTIST ACTION IMPLEMENTATIONS ====================
  private async artistGet(input: any): Promise<ConnectorResponse> {
    try {
      const artistId = this.extractId(input.artistId, 'artist');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/artists/${artistId}`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARTIST_GET_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async artistGetAlbums(input: any): Promise<ConnectorResponse> {
    try {
      const artistId = this.extractId(input.artistId, 'artist');
      const limit = input.limit || 20;
      const endpoint = `/artists/${artistId}/albums?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARTIST_GET_ALBUMS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async artistGetTopTracks(input: any): Promise<ConnectorResponse> {
    try {
      const artistId = this.extractId(input.artistId, 'artist');
      const country = input.country || 'US';
      const endpoint = `/artists/${artistId}/top-tracks?country=${country}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARTIST_GET_TOP_TRACKS_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async artistGetRelated(input: any): Promise<ConnectorResponse> {
    try {
      const artistId = this.extractId(input.artistId, 'artist');
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `/artists/${artistId}/related-artists`,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARTIST_GET_RELATED_FAILED',
          message: error.message,
        },
      };
    }
  }

  private async artistSearch(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      let endpoint = `/search?q=${encodeURIComponent(input.query)}&type=artist&limit=${limit}`;

      if (input.market) {
        endpoint += `&market=${input.market}`;
      }

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ARTIST_SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== LIBRARY ACTION IMPLEMENTATIONS ====================
  private async libraryGetLikedTracks(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      const endpoint = `/me/tracks?limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIBRARY_GET_LIKED_TRACKS_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== USER DATA ACTION IMPLEMENTATIONS ====================
  private async userGetFollowingArtists(input: any): Promise<ConnectorResponse> {
    try {
      const limit = input.limit || 20;
      const endpoint = `/me/following?type=artist&limit=${limit}`;

      const response = await this.performRequest({
        method: 'GET',
        endpoint,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'USER_GET_FOLLOWING_ARTISTS_FAILED',
          message: error.message,
        },
      };
    }
  }

  // ==================== HELPER METHODS ====================
  private extractId(uri: string, type: string): string {
    // Extract ID from Spotify URI (e.g., spotify:track:abc123 -> abc123)
    if (uri.startsWith(`spotify:${type}:`)) {
      return uri.replace(`spotify:${type}:`, '');
    }
    // Already an ID
    return uri;
  }
}
