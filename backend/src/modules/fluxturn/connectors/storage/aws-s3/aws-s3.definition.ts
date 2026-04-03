// AWS S3 Connector Definition
// Synced with aws-s3.connector.ts implementation

import { ConnectorDefinition } from '../../shared';

export const AWS_S3_CONNECTOR: ConnectorDefinition = {
  name: 'aws_s3',
  display_name: 'AWS S3',
  category: 'storage',
  description: 'Amazon S3 cloud storage for file uploads, downloads, and object management',
  auth_type: 'custom',
  verified: false,

  auth_fields: [
    {
      key: 'accessKeyId',
      label: 'Access Key ID',
      type: 'string',
      required: true,
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
      description: 'AWS Access Key ID'
    },
    {
      key: 'secretAccessKey',
      label: 'Secret Access Key',
      type: 'password',
      required: true,
      placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      description: 'AWS Secret Access Key'
    },
    {
      key: 'region',
      label: 'Region',
      type: 'string',
      required: true,
      default: 'us-east-1',
      placeholder: 'us-east-1',
      description: 'AWS Region (e.g., us-east-1, eu-west-1)'
    },
    {
      key: 'defaultBucket',
      label: 'Default Bucket',
      type: 'string',
      required: false,
      placeholder: 'my-bucket',
      description: 'Default S3 bucket to use (optional)'
    }
  ],

  endpoints: {
    base_url: 'https://s3.amazonaws.com'
  },

  webhook_support: true,
  rate_limits: { requests_per_second: 100, requests_per_minute: 6000 },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'upload_file',
      name: 'Upload File',
      description: 'Upload a file to S3',
      category: 'Files',
      icon: 'upload',
      inputSchema: {
        filePath: {
          type: 'string',
          required: true,
          label: 'File Path / Key',
          placeholder: 'documents/report.pdf',
          description: 'S3 object key (path in the bucket)',
          aiControlled: false
        },
        content: {
          type: 'string',
          required: true,
          label: 'Content',
          inputType: 'textarea',
          description: 'File content (string or base64 encoded)',
          aiControlled: false
        },
        metadata: {
          type: 'object',
          required: false,
          label: 'Metadata',
          description: 'File metadata: bucket, contentType, ACL, userMetadata',
          aiControlled: false
        }
      },
      outputSchema: {
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'S3 object key' },
        etag: { type: 'string', description: 'File ETag' },
        location: { type: 'string', description: 'S3 object URL' },
        versionId: { type: 'string', description: 'Version ID (if versioning enabled)' }
      }
    },
    {
      id: 'download_file',
      name: 'Download File',
      description: 'Download a file from S3',
      category: 'Files',
      icon: 'download',
      inputSchema: {
        filePath: {
          type: 'string',
          required: true,
          label: 'File Path / Key',
          placeholder: 'documents/report.pdf',
          description: 'S3 object key to download',
          aiControlled: false
        },
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        }
      },
      outputSchema: {
        content: { type: 'string', description: 'File content as buffer/string' },
        contentType: { type: 'string', description: 'Content type of the file' },
        contentLength: { type: 'number', description: 'File size in bytes' }
      }
    },
    {
      id: 'list_objects',
      name: 'List Objects',
      description: 'List objects in an S3 bucket',
      category: 'Files',
      icon: 'list',
      inputSchema: {
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        },
        prefix: {
          type: 'string',
          required: false,
          label: 'Prefix',
          placeholder: 'documents/',
          description: 'Object key prefix to filter results',
          aiControlled: false
        },
        options: {
          type: 'object',
          required: false,
          label: 'Options',
          description: 'Pagination and filtering options',
          aiControlled: false
        }
      },
      outputSchema: {
        objects: { type: 'array', description: 'List of S3 objects' },
        commonPrefixes: { type: 'array', description: 'Common prefixes (folders)' },
        isTruncated: { type: 'boolean', description: 'Whether results are truncated' },
        nextContinuationToken: { type: 'string', description: 'Token for next page' }
      }
    },
    {
      id: 'create_bucket',
      name: 'Create Bucket',
      description: 'Create a new S3 bucket',
      category: 'Buckets',
      icon: 'folder-plus',
      inputSchema: {
        bucketName: {
          type: 'string',
          required: true,
          label: 'Bucket Name',
          placeholder: 'my-new-bucket',
          description: 'Name for the new bucket (must be globally unique)',
          aiControlled: false
        },
        region: {
          type: 'string',
          required: false,
          label: 'Region',
          placeholder: 'us-east-1',
          description: 'AWS region for the bucket',
          aiControlled: false
        }
      },
      outputSchema: {
        bucket: { type: 'string', description: 'Created bucket name' },
        location: { type: 'string', description: 'Bucket location' },
        region: { type: 'string', description: 'Bucket region' }
      }
    },
    {
      id: 'get_presigned_url',
      name: 'Get Presigned URL',
      description: 'Generate a presigned URL for temporary access',
      category: 'Files',
      icon: 'link',
      inputSchema: {
        bucket: {
          type: 'string',
          required: true,
          label: 'Bucket',
          placeholder: 'my-bucket',
          description: 'S3 bucket name',
          aiControlled: false
        },
        key: {
          type: 'string',
          required: true,
          label: 'Object Key',
          placeholder: 'documents/file.pdf',
          description: 'S3 object key',
          aiControlled: false
        },
        operation: {
          type: 'select',
          required: false,
          label: 'Operation',
          default: 'getObject',
          options: [
            { label: 'Download (GET)', value: 'getObject' },
            { label: 'Upload (PUT)', value: 'putObject' }
          ],
          description: 'Type of presigned URL to generate',
          aiControlled: false
        },
        expiresIn: {
          type: 'number',
          required: false,
          label: 'Expires In (seconds)',
          default: 3600,
          description: 'URL expiration time in seconds (default: 1 hour)',
          aiControlled: false
        }
      },
      outputSchema: {
        url: { type: 'string', description: 'Presigned URL' },
        expiresAt: { type: 'string', description: 'URL expiration timestamp' }
      }
    },
    {
      id: 'copy_object',
      name: 'Copy Object',
      description: 'Copy an object within or between S3 buckets',
      category: 'Files',
      icon: 'copy',
      inputSchema: {
        sourceBucket: {
          type: 'string',
          required: true,
          label: 'Source Bucket',
          placeholder: 'source-bucket',
          description: 'Source bucket name',
          aiControlled: false
        },
        sourceKey: {
          type: 'string',
          required: true,
          label: 'Source Key',
          placeholder: 'path/to/source-file.pdf',
          description: 'Source object key',
          aiControlled: false
        },
        destBucket: {
          type: 'string',
          required: true,
          label: 'Destination Bucket',
          placeholder: 'dest-bucket',
          description: 'Destination bucket name',
          aiControlled: false
        },
        destKey: {
          type: 'string',
          required: true,
          label: 'Destination Key',
          placeholder: 'path/to/dest-file.pdf',
          description: 'Destination object key',
          aiControlled: false
        }
      },
      outputSchema: {
        sourceBucket: { type: 'string', description: 'Source bucket' },
        sourceKey: { type: 'string', description: 'Source key' },
        destBucket: { type: 'string', description: 'Destination bucket' },
        destKey: { type: 'string', description: 'Destination key' },
        etag: { type: 'string', description: 'Copied object ETag' }
      }
    },
    {
      id: 'delete_file',
      name: 'Delete File',
      description: 'Delete a file/object from S3',
      category: 'Files',
      icon: 'trash-2',
      inputSchema: {
        filePath: {
          type: 'string',
          required: true,
          label: 'File Path / Key',
          placeholder: 'documents/report.pdf',
          description: 'S3 object key to delete',
          aiControlled: false
        },
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        }
      },
      outputSchema: {
        deleted: { type: 'boolean', description: 'Whether deletion was successful' },
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'Deleted object key' }
      }
    },
    {
      id: 'create_folder',
      name: 'Create Folder',
      description: 'Create a folder (prefix) in S3',
      category: 'Folders',
      icon: 'folder-plus',
      inputSchema: {
        folderPath: {
          type: 'string',
          required: true,
          label: 'Folder Path',
          placeholder: 'documents/2024/',
          description: 'Folder path to create (will add trailing slash if not present)',
          aiControlled: false
        },
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        }
      },
      outputSchema: {
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'Created folder key' },
        path: { type: 'string', description: 'Folder path' }
      }
    },
    {
      id: 'delete_folder',
      name: 'Delete Folder',
      description: 'Delete a folder and all its contents from S3',
      category: 'Folders',
      icon: 'folder-minus',
      inputSchema: {
        folderPath: {
          type: 'string',
          required: true,
          label: 'Folder Path',
          placeholder: 'documents/2024/',
          description: 'Folder path to delete (all objects with this prefix will be deleted)',
          aiControlled: false
        },
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        }
      },
      outputSchema: {
        deleted: { type: 'boolean', description: 'Whether deletion was successful' },
        deletedCount: { type: 'number', description: 'Number of objects deleted' },
        bucket: { type: 'string', description: 'S3 bucket name' },
        prefix: { type: 'string', description: 'Deleted folder prefix' }
      }
    },
    {
      id: 'list_folders',
      name: 'List Folders',
      description: 'List folders (common prefixes) in an S3 bucket',
      category: 'Folders',
      icon: 'folder',
      inputSchema: {
        bucket: {
          type: 'string',
          required: false,
          label: 'Bucket',
          description: 'S3 bucket name (uses default if not specified)',
          aiControlled: false
        },
        prefix: {
          type: 'string',
          required: false,
          label: 'Prefix',
          placeholder: 'documents/',
          description: 'Parent folder path to list folders under',
          aiControlled: false
        }
      },
      outputSchema: {
        folders: { type: 'array', description: 'List of folder prefixes' },
        bucket: { type: 'string', description: 'S3 bucket name' }
      }
    },
    {
      id: 'list_buckets',
      name: 'List Buckets',
      description: 'List all S3 buckets in the account',
      category: 'Buckets',
      icon: 'database',
      inputSchema: {},
      outputSchema: {
        buckets: { type: 'array', description: 'List of S3 buckets' },
        owner: { type: 'object', description: 'Bucket owner information' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'object_created',
      name: 'Object Created',
      description: 'Triggered when an object is created/uploaded to S3',
      eventType: 'webhook',
      icon: 'upload-cloud',
      webhookRequired: true,
      inputSchema: {
        bucket: {
          type: 'string',
          required: true,
          label: 'Bucket',
          description: 'S3 bucket to monitor'
        },
        prefix: {
          type: 'string',
          required: false,
          label: 'Prefix Filter',
          description: 'Only trigger for objects with this prefix'
        }
      },
      outputSchema: {
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'S3 object key' },
        size: { type: 'number', description: 'Object size in bytes' },
        eventName: { type: 'string', description: 'S3 event type' },
        eventTime: { type: 'string', description: 'Event timestamp' }
      }
    },
    {
      id: 'object_removed',
      name: 'Object Removed',
      description: 'Triggered when an object is deleted from S3',
      eventType: 'webhook',
      icon: 'trash-2',
      webhookRequired: true,
      inputSchema: {
        bucket: {
          type: 'string',
          required: true,
          label: 'Bucket',
          description: 'S3 bucket to monitor'
        },
        prefix: {
          type: 'string',
          required: false,
          label: 'Prefix Filter',
          description: 'Only trigger for objects with this prefix'
        }
      },
      outputSchema: {
        bucket: { type: 'string', description: 'S3 bucket name' },
        key: { type: 'string', description: 'Deleted object key' },
        eventName: { type: 'string', description: 'S3 event type' },
        eventTime: { type: 'string', description: 'Event timestamp' }
      }
    }
  ]
};
