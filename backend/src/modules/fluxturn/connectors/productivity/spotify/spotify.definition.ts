// Spotify Connector Definition
// Converted from n8n Spotify node

import { ConnectorDefinition } from '../../shared';

export const SPOTIFY_CONNECTOR: ConnectorDefinition = {
  name: 'spotify',
  display_name: 'Spotify',
  category: 'productivity',
  description: 'Control Spotify playback, manage playlists, search tracks, albums, artists, and access user library data',
  auth_type: 'multiple',
  complexity: 'Medium',
  verified: true,

  auth_fields: [
    {
      key: 'authType',
      label: 'Authentication Type',
      type: 'select',
      required: true,
      options: [
        { label: 'OAuth2 (Recommended)', value: 'oauth2', description: 'Connect with one-click OAuth' },
        { label: 'Custom OAuth App', value: 'manual', description: 'Use your own Spotify app credentials' }
      ],
      default: 'oauth2'
    },
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Your Spotify Client ID',
      displayOptions: { authType: ['manual'] }
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Your Spotify Client Secret',
      displayOptions: { authType: ['manual'] }
    }
  ],

  oauth_config: {
    authorization_url: 'https://accounts.spotify.com/authorize',
    token_url: 'https://accounts.spotify.com/api/token',
    scopes: [
      'user-read-playback-state',
      'playlist-read-collaborative',
      'user-modify-playback-state',
      'playlist-modify-public',
      'user-read-currently-playing',
      'playlist-read-private',
      'user-read-recently-played',
      'playlist-modify-private',
      'user-library-read',
      'user-follow-read',
    ],
  },

  endpoints: {
    base_url: 'https://api.spotify.com/v1',
    player: {
      pause: '/me/player/pause',
      play: '/me/player/play',
      next: '/me/player/next',
      previous: '/me/player/previous',
      volume: '/me/player/volume',
      queue: '/me/player/queue',
      currently_playing: '/me/player/currently-playing',
      recently_played: '/me/player/recently-played',
    },
    playlists: {
      list: '/me/playlists',
      create: '/me/playlists',
      get: '/playlists/{id}',
      tracks: '/playlists/{id}/tracks',
    },
    tracks: {
      get: '/tracks/{id}',
      audio_features: '/audio-features/{id}',
      search: '/search',
    },
    albums: {
      get: '/albums/{id}',
      tracks: '/albums/{id}/tracks',
      new_releases: '/browse/new-releases',
      search: '/search',
    },
    artists: {
      get: '/artists/{id}',
      albums: '/artists/{id}/albums',
      top_tracks: '/artists/{id}/top-tracks',
      related: '/artists/{id}/related-artists',
      search: '/search',
    },
    library: {
      saved_tracks: '/me/tracks',
    },
    user: {
      following: '/me/following',
    },
  },

  webhook_support: false,
  rate_limits: {
    requests_per_minute: 180,
    requests_per_second: 10,
  },
  sandbox_available: false,

  supported_actions: [
    // ==================== PLAYER ACTIONS ====================
    {
      id: 'player_pause',
      name: 'Pause Playback',
      description: 'Pause playback on the current active device',
      category: 'Player',
      icon: 'pause',
      verified: false,
      api: {
        endpoint: '/me/player/pause',
        method: 'PUT',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {},
      },
      inputSchema: {},
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the pause was successful',
        },
      },
    },
    {
      id: 'player_resume',
      name: 'Resume Playback',
      description: 'Resume playback on the current active device',
      category: 'Player',
      icon: 'play',
      verified: false,
      api: {
        endpoint: '/me/player/play',
        method: 'PUT',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {},
      },
      inputSchema: {},
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the resume was successful',
        },
      },
    },
    {
      id: 'player_start_music',
      name: 'Start Music',
      description: 'Start playing a playlist, artist, or album',
      category: 'Player',
      icon: 'play-circle',
      verified: false,
      api: {
        endpoint: '/me/player/play',
        method: 'PUT',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          contextUri: 'context_uri',
        },
      },
      inputSchema: {
        contextUri: {
          type: 'string',
          required: true,
          label: 'Resource URI',
          placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
          description: 'Enter a playlist, artist, or album URI or ID',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether playback started successfully',
        },
      },
    },
    {
      id: 'player_next_song',
      name: 'Next Song',
      description: 'Skip to the next track',
      category: 'Player',
      icon: 'skip-forward',
      verified: false,
      api: {
        endpoint: '/me/player/next',
        method: 'POST',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {},
      },
      inputSchema: {},
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether skip was successful',
        },
      },
    },
    {
      id: 'player_previous_song',
      name: 'Previous Song',
      description: 'Skip to the previous song',
      category: 'Player',
      icon: 'skip-back',
      verified: false,
      api: {
        endpoint: '/me/player/previous',
        method: 'POST',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {},
      },
      inputSchema: {},
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether skip was successful',
        },
      },
    },
    {
      id: 'player_add_to_queue',
      name: 'Add Song to Queue',
      description: 'Add a song to your queue',
      category: 'Player',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/me/player/queue',
        method: 'POST',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          uri: 'uri',
        },
      },
      inputSchema: {
        uri: {
          type: 'string',
          required: true,
          label: 'Track URI',
          placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
          description: 'Enter a track URI or ID',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether the track was added to queue',
        },
      },
    },
    {
      id: 'player_set_volume',
      name: 'Set Volume',
      description: 'Set volume on the current active device',
      category: 'Player',
      icon: 'volume-2',
      verified: false,
      api: {
        endpoint: '/me/player/volume',
        method: 'PUT',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          volumePercent: 'volume_percent',
        },
      },
      inputSchema: {
        volumePercent: {
          type: 'number',
          required: true,
          label: 'Volume Percent',
          placeholder: '50',
          description: 'Volume percentage (0-100)',
          min: 0,
          max: 100,
        },
      },
      outputSchema: {
        success: {
          type: 'boolean',
          description: 'Whether volume was set successfully',
        },
      },
    },
    {
      id: 'player_currently_playing',
      name: 'Get Currently Playing',
      description: 'Get your currently playing track',
      category: 'Player',
      icon: 'music',
      verified: false,
      api: {
        endpoint: '/me/player/currently-playing',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {},
      },
      inputSchema: {},
      outputSchema: {
        item: {
          type: 'object',
          description: 'Currently playing track',
        },
        is_playing: {
          type: 'boolean',
          description: 'Whether something is currently playing',
        },
        progress_ms: {
          type: 'number',
          description: 'Progress in milliseconds',
        },
      },
    },
    {
      id: 'player_recently_played',
      name: 'Get Recently Played',
      description: 'Get your recently played tracks',
      category: 'Player',
      icon: 'clock',
      verified: false,
      api: {
        endpoint: '/me/player/recently-played',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          limit: 'limit',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of items to return (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Recently played tracks',
        },
      },
    },

    // ==================== PLAYLIST ACTIONS ====================
    {
      id: 'playlist_create',
      name: 'Create Playlist',
      description: 'Create a new playlist',
      category: 'Playlist',
      icon: 'plus-square',
      verified: false,
      api: {
        endpoint: '/me/playlists',
        method: 'POST',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          name: 'name',
          description: 'description',
          public: 'public',
        },
      },
      inputSchema: {
        name: {
          type: 'string',
          required: true,
          label: 'Playlist Name',
          placeholder: 'Favorite Songs',
          description: 'Name of the playlist to create',
          inputType: 'text',
          aiControlled: true,
          aiDescription: 'Generate a creative and descriptive playlist name',
        },
        description: {
          type: 'string',
          required: false,
          label: 'Description',
          placeholder: 'These are all my favorite songs.',
          description: 'Description for the playlist',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'Generate a compelling description for the playlist',
        },
        public: {
          type: 'boolean',
          required: false,
          label: 'Public',
          description: 'Whether the playlist is publicly accessible',
          default: true,
          aiControlled: false,
        },
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Playlist ID',
        },
        name: {
          type: 'string',
          description: 'Playlist name',
        },
        uri: {
          type: 'string',
          description: 'Spotify URI',
        },
      },
    },
    {
      id: 'playlist_get',
      name: 'Get Playlist',
      description: 'Get a playlist by URI or ID',
      category: 'Playlist',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/playlists/{id}',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          playlistId: 'id',
        },
      },
      inputSchema: {
        playlistId: {
          type: 'string',
          required: true,
          label: 'Playlist ID',
          placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
          description: "The playlist's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Playlist ID',
        },
        name: {
          type: 'string',
          description: 'Playlist name',
        },
        tracks: {
          type: 'object',
          description: 'Playlist tracks',
        },
      },
    },
    {
      id: 'playlist_get_user_playlists',
      name: "Get User's Playlists",
      description: "Get a user's playlists",
      category: 'Playlist',
      icon: 'folder',
      verified: false,
      api: {
        endpoint: '/me/playlists',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          limit: 'limit',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of playlists to return (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'User playlists',
        },
      },
    },
    {
      id: 'playlist_get_tracks',
      name: 'Get Playlist Tracks',
      description: "Get a playlist's tracks by URI or ID",
      category: 'Playlist',
      icon: 'music',
      verified: false,
      api: {
        endpoint: '/playlists/{id}/tracks',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          playlistId: 'id',
          limit: 'limit',
        },
      },
      inputSchema: {
        playlistId: {
          type: 'string',
          required: true,
          label: 'Playlist ID',
          placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
          description: "The playlist's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of tracks to return (1-100)',
          default: 20,
          min: 1,
          max: 100,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Playlist tracks',
        },
      },
    },
    {
      id: 'playlist_add_item',
      name: 'Add Item to Playlist',
      description: 'Add tracks to a playlist by track and playlist URI or ID',
      category: 'Playlist',
      icon: 'plus',
      verified: false,
      api: {
        endpoint: '/playlists/{id}/tracks',
        method: 'POST',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          playlistId: 'id',
          trackUri: 'uris',
          position: 'position',
        },
      },
      inputSchema: {
        playlistId: {
          type: 'string',
          required: true,
          label: 'Playlist ID',
          placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
          description: "The playlist's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
        trackUri: {
          type: 'string',
          required: true,
          label: 'Track URI',
          placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
          description: "The track's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
        position: {
          type: 'number',
          required: false,
          label: 'Position',
          placeholder: '0',
          description: "The new track's position in the playlist",
          min: 0,
          aiControlled: false,
        },
      },
      outputSchema: {
        snapshot_id: {
          type: 'string',
          description: 'Snapshot ID',
        },
      },
    },
    {
      id: 'playlist_remove_item',
      name: 'Remove Item from Playlist',
      description: 'Remove tracks from a playlist by track and playlist URI or ID',
      category: 'Playlist',
      icon: 'minus',
      verified: false,
      api: {
        endpoint: '/playlists/{id}/tracks',
        method: 'DELETE',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {
          'Content-Type': 'application/json',
        },
        paramMapping: {
          playlistId: 'id',
          trackUri: 'tracks',
        },
      },
      inputSchema: {
        playlistId: {
          type: 'string',
          required: true,
          label: 'Playlist ID',
          placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
          description: "The playlist's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
        trackUri: {
          type: 'string',
          required: true,
          label: 'Track URI',
          placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
          description: "The track's Spotify URI or its ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        snapshot_id: {
          type: 'string',
          description: 'Snapshot ID',
        },
      },
    },
    {
      id: 'playlist_search',
      name: 'Search Playlists',
      description: 'Search playlists by keyword',
      category: 'Playlist',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          query: 'q',
          limit: 'limit',
          market: 'market',
        },
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'chill vibes',
          description: 'The keyword term to search for',
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of results (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
        market: {
          type: 'string',
          required: false,
          label: 'Market',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        playlists: {
          type: 'object',
          description: 'Search results',
        },
      },
    },

    // ==================== TRACK ACTIONS ====================
    {
      id: 'track_get',
      name: 'Get Track',
      description: 'Get a track by its URI or ID',
      category: 'Track',
      icon: 'music',
      verified: false,
      api: {
        endpoint: '/tracks/{id}',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          trackId: 'id',
        },
      },
      inputSchema: {
        trackId: {
          type: 'string',
          required: true,
          label: 'Track ID',
          placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
          description: "The track's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Track ID',
        },
        name: {
          type: 'string',
          description: 'Track name',
        },
        artists: {
          type: 'array',
          description: 'Track artists',
        },
        album: {
          type: 'object',
          description: 'Album information',
        },
      },
    },
    {
      id: 'track_get_audio_features',
      name: 'Get Audio Features',
      description: 'Get audio features for a track by URI or ID',
      category: 'Track',
      icon: 'activity',
      verified: false,
      api: {
        endpoint: '/audio-features/{id}',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          trackId: 'id',
        },
      },
      inputSchema: {
        trackId: {
          type: 'string',
          required: true,
          label: 'Track ID',
          placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
          description: "The track's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        danceability: {
          type: 'number',
          description: 'Danceability score',
        },
        energy: {
          type: 'number',
          description: 'Energy score',
        },
        tempo: {
          type: 'number',
          description: 'Tempo in BPM',
        },
      },
    },
    {
      id: 'track_search',
      name: 'Search Tracks',
      description: 'Search tracks by keyword',
      category: 'Track',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          query: 'q',
          limit: 'limit',
          market: 'market',
        },
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'Bohemian Rhapsody',
          description: 'The keyword term to search for',
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of results (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
        market: {
          type: 'string',
          required: false,
          label: 'Market',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        tracks: {
          type: 'object',
          description: 'Search results',
        },
      },
    },

    // ==================== ALBUM ACTIONS ====================
    {
      id: 'album_get',
      name: 'Get Album',
      description: 'Get an album by URI or ID',
      category: 'Album',
      icon: 'disc',
      verified: false,
      api: {
        endpoint: '/albums/{id}',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          albumId: 'id',
        },
      },
      inputSchema: {
        albumId: {
          type: 'string',
          required: true,
          label: 'Album ID',
          placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
          description: "The album's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Album ID',
        },
        name: {
          type: 'string',
          description: 'Album name',
        },
        artists: {
          type: 'array',
          description: 'Album artists',
        },
      },
    },
    {
      id: 'album_get_tracks',
      name: 'Get Album Tracks',
      description: "Get an album's tracks by URI or ID",
      category: 'Album',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/albums/{id}/tracks',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          albumId: 'id',
          limit: 'limit',
        },
      },
      inputSchema: {
        albumId: {
          type: 'string',
          required: true,
          label: 'Album ID',
          placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
          description: "The album's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of tracks (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Album tracks',
        },
      },
    },
    {
      id: 'album_get_new_releases',
      name: 'Get New Releases',
      description: 'Get a list of new album releases',
      category: 'Album',
      icon: 'gift',
      verified: false,
      api: {
        endpoint: '/browse/new-releases',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          limit: 'limit',
          country: 'country',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of albums (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
        country: {
          type: 'string',
          required: false,
          label: 'Country',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        albums: {
          type: 'object',
          description: 'New album releases',
        },
      },
    },
    {
      id: 'album_search',
      name: 'Search Albums',
      description: 'Search albums by keyword',
      category: 'Album',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          query: 'q',
          limit: 'limit',
          market: 'market',
        },
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'Abbey Road',
          description: 'The keyword term to search for',
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of results (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
        market: {
          type: 'string',
          required: false,
          label: 'Market',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        albums: {
          type: 'object',
          description: 'Search results',
        },
      },
    },

    // ==================== ARTIST ACTIONS ====================
    {
      id: 'artist_get',
      name: 'Get Artist',
      description: 'Get an artist by URI or ID',
      category: 'Artist',
      icon: 'user',
      verified: false,
      api: {
        endpoint: '/artists/{id}',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          artistId: 'id',
        },
      },
      inputSchema: {
        artistId: {
          type: 'string',
          required: true,
          label: 'Artist ID',
          placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
          description: "The artist's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        id: {
          type: 'string',
          description: 'Artist ID',
        },
        name: {
          type: 'string',
          description: 'Artist name',
        },
        genres: {
          type: 'array',
          description: 'Artist genres',
        },
      },
    },
    {
      id: 'artist_get_albums',
      name: 'Get Artist Albums',
      description: "Get an artist's albums by URI or ID",
      category: 'Artist',
      icon: 'disc',
      verified: false,
      api: {
        endpoint: '/artists/{id}/albums',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          artistId: 'id',
          limit: 'limit',
        },
      },
      inputSchema: {
        artistId: {
          type: 'string',
          required: true,
          label: 'Artist ID',
          placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
          description: "The artist's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of albums (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Artist albums',
        },
      },
    },
    {
      id: 'artist_get_top_tracks',
      name: 'Get Top Tracks',
      description: "Get an artist's top tracks by URI or ID",
      category: 'Artist',
      icon: 'trending-up',
      verified: false,
      api: {
        endpoint: '/artists/{id}/top-tracks',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          artistId: 'id',
          country: 'country',
        },
      },
      inputSchema: {
        artistId: {
          type: 'string',
          required: true,
          label: 'Artist ID',
          placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
          description: "The artist's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
        country: {
          type: 'string',
          required: true,
          label: 'Country',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          default: 'US',
          aiControlled: false,
        },
      },
      outputSchema: {
        tracks: {
          type: 'array',
          description: 'Top tracks',
        },
      },
    },
    {
      id: 'artist_get_related',
      name: 'Get Related Artists',
      description: "Get an artist's related artists by URI or ID",
      category: 'Artist',
      icon: 'users',
      verified: false,
      api: {
        endpoint: '/artists/{id}/related-artists',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          artistId: 'id',
        },
      },
      inputSchema: {
        artistId: {
          type: 'string',
          required: true,
          label: 'Artist ID',
          placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
          description: "The artist's Spotify URI or ID",
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        artists: {
          type: 'array',
          description: 'Related artists',
        },
      },
    },
    {
      id: 'artist_search',
      name: 'Search Artists',
      description: 'Search artists by keyword',
      category: 'Artist',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/search',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          query: 'q',
          limit: 'limit',
          market: 'market',
        },
      },
      inputSchema: {
        query: {
          type: 'string',
          required: true,
          label: 'Search Query',
          placeholder: 'The Beatles',
          description: 'The keyword term to search for',
          inputType: 'text',
          aiControlled: false,
        },
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of results (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
        market: {
          type: 'string',
          required: false,
          label: 'Market',
          placeholder: 'US',
          description: 'ISO 3166-1 alpha-2 country code',
          inputType: 'text',
          aiControlled: false,
        },
      },
      outputSchema: {
        artists: {
          type: 'object',
          description: 'Search results',
        },
      },
    },

    // ==================== LIBRARY ACTIONS ====================
    {
      id: 'library_get_liked_tracks',
      name: 'Get Liked Tracks',
      description: "Get the user's liked tracks",
      category: 'Library',
      icon: 'heart',
      verified: false,
      api: {
        endpoint: '/me/tracks',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          limit: 'limit',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of tracks (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Liked tracks',
        },
      },
    },

    // ==================== USER DATA ACTIONS ====================
    {
      id: 'user_get_following_artists',
      name: 'Get Following Artists',
      description: 'Get your followed artists',
      category: 'User Data',
      icon: 'user-check',
      verified: false,
      api: {
        endpoint: '/me/following',
        method: 'GET',
        baseUrl: 'https://api.spotify.com/v1',
        headers: {},
        paramMapping: {
          limit: 'limit',
        },
      },
      inputSchema: {
        limit: {
          type: 'number',
          required: false,
          label: 'Limit',
          placeholder: '20',
          description: 'Maximum number of artists (1-50)',
          default: 20,
          min: 1,
          max: 50,
          aiControlled: false,
        },
      },
      outputSchema: {
        artists: {
          type: 'object',
          description: 'Following artists',
        },
      },
    },
  ],

  supported_triggers: [],
};
