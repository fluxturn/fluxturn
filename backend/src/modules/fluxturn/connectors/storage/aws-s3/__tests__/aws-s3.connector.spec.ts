/**
 * AWS S3 Connector Tests
 *
 * Tests for the AWS S3 connector actions using mocked S3 SDK responses.
 */
import { AWSS3Connector } from '../aws-s3.connector';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
    CreateBucketCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    ListBucketsCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

// Mock AWS SDK v2
const mockListBuckets = jest.fn();
const mockPutObject = jest.fn();
const mockGetObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockCopyObject = jest.fn();
const mockCreateBucket = jest.fn();
const mockListObjectsV2 = jest.fn();

jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn(() => ({
      listBuckets: mockListBuckets,
      putObject: mockPutObject,
      getObject: mockGetObject,
      deleteObject: mockDeleteObject,
      copyObject: mockCopyObject,
      createBucket: mockCreateBucket,
      listObjectsV2: mockListObjectsV2,
    })),
    config: {
      update: jest.fn(),
    },
  };
});

describe('AWSS3Connector', () => {
  let connector: AWSS3Connector;
  let mockS3Send: jest.Mock = jest.fn();

  beforeEach(async () => {
    // Reset all mocks
    mockListBuckets.mockClear();
    mockPutObject.mockClear();
    mockGetObject.mockClear();
    mockDeleteObject.mockClear();
    mockCopyObject.mockClear();
    mockCreateBucket.mockClear();
    mockListObjectsV2.mockClear();
    mockS3Send.mockClear();

    // Setup default successful responses
    mockListBuckets.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Buckets: [{ Name: 'test-bucket' }] }),
    });
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ ETag: '"abc123"', VersionId: 'v1' }),
    });
    mockGetObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Body: Buffer.from('test content'), ContentType: 'text/plain' }),
    });
    mockDeleteObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ DeleteMarker: true }),
    });
    mockCopyObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ CopyObjectResult: { ETag: '"xyz789"' } }),
    });
    mockCreateBucket.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: '/test-bucket' }),
    });
    mockListObjectsV2.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Contents: [{ Key: 'file1.txt', Size: 1024 }],
        IsTruncated: false,
      }),
    });

    // Create connector with mock credentials
    connector = await ConnectorTestHelper.createConnector(AWSS3Connector, 'aws_s3');

    // Get the mock send function for v3 SDK
    const { S3Client } = require('@aws-sdk/client-s3');
    const mockClient = new S3Client();
    mockS3Send = mockClient.send as jest.Mock;
    mockS3Send.mockClear();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when S3 client can list buckets', async () => {
      // Already set up in beforeEach
      const result = await connector.testConnection();

      expect(result.success).toBe(true);
    });

    it('should return failure when credentials are invalid', async () => {
      mockListBuckets.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(new Error('InvalidAccessKeyId')),
      });

      // Need to recreate connector to trigger error during initialization
      try {
        await ConnectorTestHelper.createConnector(AWSS3Connector, 'aws_s3');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('AWS S3 connection failed');
      }
    });

    it('should return failure when network error occurs', async () => {
      mockListBuckets.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      const result = await connector.testConnection();

      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Upload File Action Tests
  // ===========================================
  describe('upload_file', () => {
    it('should upload file successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        ETag: '"abc123"',
        VersionId: 'v1',
        Location: 'https://s3.amazonaws.com/bucket/key',
      });

      const result = await connector.executeAction('upload_file', {
        filePath: 'documents/test.pdf',
        content: 'test content',
        metadata: {
          bucket: 'test-bucket',
          contentType: 'application/pdf',
        },
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(true);

      const actualData = result.data?.data !== undefined ? result.data.data : result.data;
      expect(actualData).toHaveProperty('etag');
    });

    it('should handle upload error', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('NoSuchBucket'));

      const result = await connector.executeAction('upload_file', {
        filePath: 'documents/test.pdf',
        content: 'test content',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Download File Action Tests
  // ===========================================
  describe('download_file', () => {
    it('should download file successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        Body: Buffer.from('test content'),
        ContentType: 'text/plain',
        Metadata: { key: 'value' },
      });

      const result = await connector.executeAction('download_file', {
        bucket: 'test-bucket',
        key: 'documents/test.txt',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });

    it('should handle file not found', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('NoSuchKey'));

      const result = await connector.executeAction('download_file', {
        bucket: 'test-bucket',
        key: 'nonexistent.txt',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // List Objects Action Tests
  // ===========================================
  describe('list_objects', () => {
    it('should list objects successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        Contents: [
          { Key: 'file1.txt', Size: 1024, LastModified: new Date() },
          { Key: 'file2.txt', Size: 2048, LastModified: new Date() },
        ],
        IsTruncated: false,
      });

      const result = await connector.executeAction('list_objects', {
        bucket: 'test-bucket',
        prefix: 'documents/',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Create Bucket Action Tests
  // ===========================================
  describe('create_bucket', () => {
    it('should create bucket successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        Location: '/test-new-bucket',
      });

      const result = await connector.executeAction('create_bucket', {
        bucketName: 'test-new-bucket',
        region: 'us-east-1',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });

    it('should handle bucket already exists error', async () => {
      mockS3Send.mockRejectedValueOnce(new Error('BucketAlreadyExists'));

      const result = await connector.executeAction('create_bucket', {
        bucketName: 'existing-bucket',
      });

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });

  // ===========================================
  // Get Presigned URL Action Tests
  // ===========================================
  describe('get_presigned_url', () => {
    it('should generate presigned URL successfully', async () => {
      const result = await connector.executeAction('get_presigned_url', {
        bucket: 'test-bucket',
        key: 'documents/test.pdf',
        expiresIn: 3600,
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });

      const actualData = result.data?.data !== undefined ? result.data.data : result.data;
      expect(actualData).toHaveProperty('url');
      expect(actualData.url).toContain('https://s3.amazonaws.com');
    });
  });

  // ===========================================
  // Copy Object Action Tests
  // ===========================================
  describe('copy_object', () => {
    it('should copy object successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        CopyObjectResult: {
          ETag: '"xyz789"',
          LastModified: new Date(),
        },
      });

      const result = await connector.executeAction('copy_object', {
        sourceBucket: 'source-bucket',
        sourceKey: 'source/file.txt',
        destinationBucket: 'dest-bucket',
        destinationKey: 'dest/file.txt',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Delete File Action Tests
  // ===========================================
  describe('delete_file', () => {
    it('should delete file successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        DeleteMarker: true,
        VersionId: 'v1',
      });

      const result = await connector.executeAction('delete_file', {
        bucket: 'test-bucket',
        key: 'documents/old-file.pdf',
      });

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // List Buckets Action Tests
  // ===========================================
  describe('list_buckets', () => {
    it('should list all buckets successfully', async () => {
      mockS3Send.mockResolvedValueOnce({
        Buckets: [
          { Name: 'bucket1', CreationDate: new Date() },
          { Name: 'bucket2', CreationDate: new Date() },
        ],
        Owner: { DisplayName: 'test-user' },
      });

      const result = await connector.executeAction('list_buckets', {});

      ConnectorTestHelper.assertResponse(result, {
        success: true,
      });
    });
  });

  // ===========================================
  // Unknown Action Test
  // ===========================================
  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      const innerSuccess = result.data?.success !== undefined ? result.data.success : result.success;
      expect(innerSuccess).toBe(false);
    });
  });
});
