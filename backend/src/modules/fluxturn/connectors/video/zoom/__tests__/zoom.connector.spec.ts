/**
 * Zoom Connector Tests
 *
 * Tests for the Zoom connector actions using mocked HTTP responses.
 */
import nock from 'nock';
import { ZoomConnector } from '../zoom.connector';
import { ConnectorTestHelper, TestFixture } from '@test/helpers/connector-test.helper';

// Import fixtures
import createMeetingFixture from './fixtures/create_meeting.json';

describe('ZoomConnector', () => {
  let connector: ZoomConnector;
  const BASE_URL = 'https://api.zoom.us/v2';

  beforeEach(async () => {
    nock.cleanAll();

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(ZoomConnector, 'zoom');
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
        .get('/users/me')
        .reply(200, {
          id: 'user123',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          type: 2,
        });

      const result = await connector.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return failure when API responds with 401', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .reply(401, { code: 124, message: 'Invalid access token.' });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });

    it('should return failure when API is unreachable', async () => {
      nock(BASE_URL)
        .get('/users/me')
        .replyWithError('Network error');

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Create Meeting Action Tests (Fixture-based)
  // ===========================================
  describe('create_meeting', () => {
    const fixture = createMeetingFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup mock
        nock(BASE_URL)
          .post('/users/me/meetings')
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await connector.executeAction('create_meeting', testCase.input);

        // Assert
        ConnectorTestHelper.assertResponse(result, testCase.expected);
      });
    });
  });

  // ===========================================
  // Create Meeting Action Tests (Manual)
  // ===========================================
  describe('create_meeting (manual tests)', () => {
    it('should create an instant meeting successfully', async () => {
      const mockMeeting = {
        id: 123456789,
        uuid: 'mock-uuid-12345',
        host_id: 'host123',
        topic: 'Quick Sync',
        type: 1,
        start_url: 'https://zoom.us/s/123?zak=token',
        join_url: 'https://zoom.us/j/123456789',
        password: 'abc123',
      };

      nock(BASE_URL)
        .post('/users/me/meetings')
        .reply(201, mockMeeting);

      const result = await connector.executeAction('create_meeting', {
        topic: 'Quick Sync',
        type: 1, // Instant meeting
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe(123456789);
      expect(data.join_url).toContain('zoom.us');
    });

    it('should create a scheduled meeting with duration and settings', async () => {
      const mockMeeting = {
        id: 987654321,
        uuid: 'mock-uuid-98765',
        host_id: 'host123',
        topic: 'Weekly Team Meeting',
        type: 2,
        start_time: '2024-12-31T10:00:00Z',
        duration: 60,
        timezone: 'America/New_York',
        start_url: 'https://zoom.us/s/987?zak=token',
        join_url: 'https://zoom.us/j/987654321',
        password: 'xyz789',
        settings: {
          waiting_room: true,
          join_before_host: false,
          mute_upon_entry: true,
        },
      };

      nock(BASE_URL)
        .post('/users/me/meetings', (body) => {
          expect(body.topic).toBe('Weekly Team Meeting');
          expect(body.type).toBe(2);
          expect(body.duration).toBe(60);
          return true;
        })
        .reply(201, mockMeeting);

      const result = await connector.executeAction('create_meeting', {
        topic: 'Weekly Team Meeting',
        type: 2, // Scheduled meeting
        start_time: '2024-12-31T10:00:00Z',
        duration: 60,
        timezone: 'America/New_York',
        settings: {
          waiting_room: true,
          join_before_host: false,
          mute_upon_entry: true,
        },
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.topic).toBe('Weekly Team Meeting');
      expect(data.duration).toBe(60);
    });

    it('should handle API rate limit error', async () => {
      nock(BASE_URL)
        .post('/users/me/meetings')
        .reply(429, {
          code: 429,
          message: 'Rate limit exceeded',
        });

      const result = await connector.executeAction('create_meeting', {
        topic: 'Test Meeting',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });

    it('should handle invalid request error', async () => {
      nock(BASE_URL)
        .post('/users/me/meetings')
        .reply(400, {
          code: 300,
          message: 'Invalid request body',
        });

      const result = await connector.executeAction('create_meeting', {
        topic: '', // Empty topic
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Meeting Action Tests
  // ===========================================
  describe('get_meeting', () => {
    it('should get meeting details successfully', async () => {
      const mockMeeting = {
        id: 123456789,
        uuid: 'meeting-uuid',
        host_id: 'host123',
        topic: 'Weekly Standup',
        type: 2,
        start_time: '2024-01-15T10:00:00Z',
        duration: 30,
        timezone: 'UTC',
        join_url: 'https://zoom.us/j/123456789',
        password: 'pass123',
      };

      nock(BASE_URL)
        .get('/meetings/123456789')
        .reply(200, mockMeeting);

      const result = await connector.executeAction('get_meeting', {
        meetingId: '123456789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe(123456789);
      expect(data.topic).toBe('Weekly Standup');
    });

    it('should handle meeting not found', async () => {
      nock(BASE_URL)
        .get('/meetings/999999')
        .reply(404, {
          code: 3001,
          message: 'Meeting does not exist.',
        });

      const result = await connector.executeAction('get_meeting', {
        meetingId: '999999',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // List Meetings Action Tests
  // ===========================================
  describe('list_meetings', () => {
    it('should list meetings successfully', async () => {
      const mockMeetings = {
        page_count: 1,
        page_number: 1,
        page_size: 30,
        total_records: 2,
        meetings: [
          { id: 111, topic: 'Meeting 1', type: 2, start_time: '2024-01-15T10:00:00Z' },
          { id: 222, topic: 'Meeting 2', type: 2, start_time: '2024-01-16T10:00:00Z' },
        ],
      };

      nock(BASE_URL)
        .get('/users/me/meetings')
        .query(true)
        .reply(200, mockMeetings);

      const result = await connector.executeAction('list_meetings', {
        userId: 'me',
        type: 'scheduled',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.meetings).toHaveLength(2);
      expect(data.total_records).toBe(2);
    });

    it('should handle empty meeting list', async () => {
      nock(BASE_URL)
        .get('/users/me/meetings')
        .query(true)
        .reply(200, { meetings: [], total_records: 0 });

      const result = await connector.executeAction('list_meetings', {});

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.meetings).toHaveLength(0);
    });
  });

  // ===========================================
  // Update Meeting Action Tests
  // ===========================================
  describe('update_meeting', () => {
    it('should update meeting successfully', async () => {
      nock(BASE_URL)
        .patch('/meetings/123456789')
        .reply(204);

      const result = await connector.executeAction('update_meeting', {
        meetingId: '123456789',
        topic: 'Updated Topic',
        duration: 45,
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.updated).toBe(true);
    });

    it('should handle update on non-existent meeting', async () => {
      nock(BASE_URL)
        .patch('/meetings/999999')
        .reply(404, {
          code: 3001,
          message: 'Meeting does not exist.',
        });

      const result = await connector.executeAction('update_meeting', {
        meetingId: '999999',
        topic: 'New Topic',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Delete Meeting Action Tests
  // ===========================================
  describe('delete_meeting', () => {
    it('should delete meeting successfully', async () => {
      nock(BASE_URL)
        .delete('/meetings/123456789')
        .reply(204);

      const result = await connector.executeAction('delete_meeting', {
        meetingId: '123456789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.deleted).toBe(true);
    });

    it('should handle deletion of non-existent meeting', async () => {
      nock(BASE_URL)
        .delete('/meetings/999999')
        .reply(404, {
          code: 3001,
          message: 'Meeting does not exist.',
        });

      const result = await connector.executeAction('delete_meeting', {
        meetingId: '999999',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Recordings Action Tests
  // ===========================================
  describe('get_recordings', () => {
    it('should get meeting recordings successfully', async () => {
      const mockRecordings = {
        id: 123456789,
        uuid: 'meeting-uuid',
        host_id: 'host123',
        topic: 'Recorded Meeting',
        start_time: '2024-01-15T10:00:00Z',
        recording_files: [
          {
            id: 'rec-file-1',
            meeting_id: 123456789,
            recording_type: 'shared_screen_with_speaker_view',
            file_type: 'MP4',
            file_size: 104857600,
            download_url: 'https://zoom.us/rec/download/mock',
            play_url: 'https://zoom.us/rec/play/mock',
            status: 'completed',
          },
          {
            id: 'rec-file-2',
            meeting_id: 123456789,
            recording_type: 'audio_only',
            file_type: 'M4A',
            file_size: 10485760,
            download_url: 'https://zoom.us/rec/download/audio-mock',
            status: 'completed',
          },
        ],
      };

      nock(BASE_URL)
        .get('/meetings/123456789/recordings')
        .reply(200, mockRecordings);

      const result = await connector.executeAction('get_recordings', {
        meeting_id: '123456789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.recording_files).toHaveLength(2);
      expect(data.recording_files[0].file_type).toBe('MP4');
    });

    it('should handle meeting with no recordings', async () => {
      nock(BASE_URL)
        .get('/meetings/999999/recordings')
        .reply(404, {
          code: 3301,
          message: 'This meeting does not have a recording.',
        });

      const result = await connector.executeAction('get_recordings', {
        meeting_id: '999999',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Analytics Action Tests
  // ===========================================
  describe('get_analytics', () => {
    it('should get meeting participants analytics successfully', async () => {
      const mockAnalytics = {
        page_count: 1,
        page_size: 30,
        total_records: 3,
        participants: [
          {
            id: 'participant-1',
            user_id: 'user-1',
            name: 'John Doe',
            user_email: 'john@example.com',
            join_time: '2024-01-15T10:00:00Z',
            leave_time: '2024-01-15T11:00:00Z',
            duration: 3600,
          },
          {
            id: 'participant-2',
            user_id: 'user-2',
            name: 'Jane Smith',
            user_email: 'jane@example.com',
            join_time: '2024-01-15T10:05:00Z',
            leave_time: '2024-01-15T10:55:00Z',
            duration: 3000,
          },
          {
            id: 'participant-3',
            user_id: 'user-3',
            name: 'Bob Wilson',
            user_email: 'bob@example.com',
            join_time: '2024-01-15T10:10:00Z',
            leave_time: '2024-01-15T11:00:00Z',
            duration: 3000,
          },
        ],
      };

      nock(BASE_URL)
        .get('/report/meetings/123456789/participants')
        .reply(200, mockAnalytics);

      const result = await connector.executeAction('get_analytics', {
        meeting_id: '123456789',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.participants).toHaveLength(3);
      expect(data.total_records).toBe(3);
    });

    it('should handle meeting not found for analytics', async () => {
      nock(BASE_URL)
        .get('/report/meetings/999999/participants')
        .reply(404, {
          code: 3001,
          message: 'Meeting does not exist.',
        });

      const result = await connector.executeAction('get_analytics', {
        meeting_id: '999999',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get User Action Tests
  // ===========================================
  describe('get_user', () => {
    it('should get current user info successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        type: 2,
        role_name: 'Owner',
        pmi: 1234567890,
        timezone: 'America/New_York',
      };

      nock(BASE_URL)
        .get('/users/me')
        .reply(200, mockUser);

      const result = await connector.executeAction('get_user', {
        userId: 'me',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.email).toBe('test@example.com');
      expect(data.first_name).toBe('Test');
    });

    it('should get specific user info successfully', async () => {
      const mockUser = {
        id: 'user456',
        email: 'other@example.com',
        first_name: 'Other',
        last_name: 'User',
        type: 1,
      };

      nock(BASE_URL)
        .get('/users/user456')
        .reply(200, mockUser);

      const result = await connector.executeAction('get_user', {
        userId: 'user456',
      });

      expect(result.success).toBe(true);
      const data = result.data?.data !== undefined ? result.data.data : result.data;
      expect(data.id).toBe('user456');
    });

    it('should handle user not found', async () => {
      nock(BASE_URL)
        .get('/users/invalid-user')
        .reply(404, {
          code: 1001,
          message: 'User does not exist.',
        });

      const result = await connector.executeAction('get_user', {
        userId: 'invalid-user',
      });

      const innerSuccess = result.data?.success !== undefined
        ? result.data.success
        : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown action', () => {
    it('should handle unknown action gracefully', async () => {
      const result = await connector.executeAction('non_existent_action', {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // IVideoConnector Interface Tests
  // ===========================================
  describe('IVideoConnector interface', () => {
    describe('uploadVideo', () => {
      it('should return not supported error', async () => {
        const result = await connector.uploadVideo(Buffer.from('test'), {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_SUPPORTED');
      });
    });

    describe('processVideo', () => {
      it('should return not supported error', async () => {
        const result = await connector.processVideo('video-123', {});

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_SUPPORTED');
      });
    });

    describe('getVideo', () => {
      it('should get video recordings successfully', async () => {
        const mockRecordings = {
          id: 123456789,
          recording_files: [{ id: 'rec-1', file_type: 'MP4' }],
        };

        nock(BASE_URL)
          .get('/meetings/123456789/recordings')
          .reply(200, mockRecordings);

        const result = await connector.getVideo('123456789');

        expect(result.success).toBe(true);
        expect(result.data.recording_files).toBeDefined();
      });

      it('should handle video not found', async () => {
        nock(BASE_URL)
          .get('/meetings/999/recordings')
          .reply(404, { code: 3001, message: 'Meeting not found' });

        const result = await connector.getVideo('999');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('OPERATION_FAILED');
      });
    });

    describe('getVideoAnalytics', () => {
      it('should get video analytics successfully', async () => {
        const mockAnalytics = {
          total_records: 5,
          participants: [{ name: 'User 1' }],
        };

        nock(BASE_URL)
          .get('/report/meetings/123456789/participants')
          .reply(200, mockAnalytics);

        const result = await connector.getVideoAnalytics('123456789');

        expect(result.success).toBe(true);
        expect(result.data.participants).toBeDefined();
      });

      it('should handle analytics error', async () => {
        nock(BASE_URL)
          .get('/report/meetings/999/participants')
          .reply(500, { message: 'Internal server error' });

        const result = await connector.getVideoAnalytics('999');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('OPERATION_FAILED');
      });
    });

    describe('createLiveStream', () => {
      it('should create live stream (meeting) successfully', async () => {
        const mockMeeting = {
          id: 123456789,
          topic: 'Live Event',
          join_url: 'https://zoom.us/j/123456789',
        };

        nock(BASE_URL)
          .post('/users/me/meetings')
          .reply(201, mockMeeting);

        const result = await connector.createLiveStream({
          topic: 'Live Event',
          type: 1,
        });

        expect(result.success).toBe(true);
        expect(result.data.id).toBe(123456789);
      });

      it('should handle live stream creation error', async () => {
        nock(BASE_URL)
          .post('/users/me/meetings')
          .reply(400, { message: 'Invalid request' });

        const result = await connector.createLiveStream({
          topic: '',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('OPERATION_FAILED');
      });
    });
  });
});
