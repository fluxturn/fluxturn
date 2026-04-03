// Whatsapp Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const WHATSAPP_CONNECTOR: ConnectorDefinition = {
    name: 'whatsapp',
    display_name: 'WhatsApp Business',
    category: 'communication',
    description: 'Send and receive messages through WhatsApp Business Cloud API',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'EAAxxxxxxxxxxxxxxx',
        description: 'WhatsApp Business Cloud API access token',
        helpUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started',
        helpText: 'How to get an access token'
      },
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        type: 'string',
        required: true,
        placeholder: '1234567890',
        description: 'WhatsApp Business phone number ID',
        helpUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started',
        helpText: 'Find your phone number ID in Meta Business Manager'
      },
      {
        key: 'businessAccountId',
        label: 'Business Account ID',
        type: 'string',
        required: false,
        placeholder: '1234567890',
        description: 'WhatsApp Business Account ID (for webhooks)',
        helpUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started'
      }
    ],
    endpoints: {
      base_url: 'https://graph.facebook.com/v18.0/{phoneNumberId}',
      message: {
        send: '/messages',
        mark_read: '/messages'
      },
      media: {
        upload: '/media',
        get: '/media/{media_id}'
      }
    },
    webhook_support: true,
    rate_limits: { requests_per_second: 80 },
    sandbox_available: true,
    verified: true,
    supported_actions: [
      // ==================== MESSAGE ACTIONS ====================
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message via WhatsApp (text, image, video, audio, document, location, contacts)',
        category: 'Messages',
        icon: 'Send',
        verified: false,
        api: {
          endpoint: '/messages',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0/{phoneNumberId}',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            to: 'to',
            messageType: 'type',
            text: 'text.body',
            previewUrl: 'text.preview_url'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'Recipient Phone Number',
            placeholder: '1234567890',
            description: 'Phone number in international format (no + sign)',
            hint: 'Include country code, e.g., 1234567890',
            aiControlled: true,
            aiDescription: 'The recipient phone number in international format without + sign.'
          },
          messageType: {
            type: 'select',
            required: true,
            label: 'Message Type',
            description: 'The type of message to send',
            default: 'text',
            aiControlled: false,
            options: [
              { label: 'Text', value: 'text' },
              { label: 'Image', value: 'image' },
              { label: 'Video', value: 'video' },
              { label: 'Audio', value: 'audio' },
              { label: 'Document', value: 'document' },
              { label: 'Location', value: 'location' },
              { label: 'Contacts', value: 'contacts' }
            ]
          },
          text: {
            type: 'string',
            label: 'Message Text',
            inputType: 'textarea',
            maxLength: 4096,
            description: 'Text content of the message',
            aiControlled: true,
            aiDescription: 'The text message content to send via WhatsApp. Maximum 4096 characters.',
            displayOptions: {
              show: {
                messageType: ['text']
              }
            }
          },
          previewUrl: {
            type: 'boolean',
            label: 'Preview URL',
            default: false,
            description: 'Enable URL preview in message',
            aiControlled: false,
            displayOptions: {
              show: {
                messageType: ['text']
              }
            }
          },
          mediaId: {
            type: 'string',
            label: 'Media ID',
            description: 'The ID of the uploaded media',
            aiControlled: false,
            displayOptions: {
              show: {
                messageType: ['image', 'video', 'audio', 'document']
              }
            }
          },
          mediaUrl: {
            type: 'string',
            label: 'Media URL',
            description: 'Public URL of the media file',
            aiControlled: false,
            displayOptions: {
              show: {
                messageType: ['image', 'video', 'audio', 'document']
              }
            }
          },
          caption: {
            type: 'string',
            label: 'Caption',
            inputType: 'textarea',
            description: 'Caption for the media',
            aiControlled: true,
            aiDescription: 'Optional caption text for the media file.',
            displayOptions: {
              show: {
                messageType: ['image', 'video', 'document']
              }
            }
          },
          filename: {
            type: 'string',
            label: 'Filename',
            description: 'Filename for the document',
            displayOptions: {
              show: {
                messageType: ['document']
              }
            },
            aiControlled: false
          },
          latitude: {
            type: 'number',
            label: 'Latitude',
            description: 'Location latitude',
            displayOptions: {
              show: {
                messageType: ['location']
              }
            },
            aiControlled: false
          },
          longitude: {
            type: 'number',
            label: 'Longitude',
            description: 'Location longitude',
            displayOptions: {
              show: {
                messageType: ['location']
              }
            },
            aiControlled: false
          },
          locationName: {
            type: 'string',
            label: 'Location Name',
            description: 'Name of the location',
            displayOptions: {
              show: {
                messageType: ['location']
              }
            },
            aiControlled: true,
            aiDescription: 'The name of the location being shared.'
          },
          locationAddress: {
            type: 'string',
            label: 'Location Address',
            description: 'Address of the location',
            displayOptions: {
              show: {
                messageType: ['location']
              }
            },
            aiControlled: true,
            aiDescription: 'The address of the location being shared.'
          }
        },
        outputSchema: {
          messagingProduct: { type: 'string', description: 'Messaging product (whatsapp)' },
          contacts: {
            type: 'array',
            description: 'Array of contact information',
            properties: {
              input: { type: 'string' },
              wa_id: { type: 'string' }
            }
          },
          messages: {
            type: 'array',
            description: 'Array of sent messages',
            properties: {
              id: { type: 'string', description: 'Message ID' }
            }
          }
        }
      },
      {
        id: 'send_message_and_wait',
        name: 'Send Message and Wait for Response',
        description: 'Send a message and wait for the recipient to respond',
        category: 'Messages',
        icon: 'MessageSquareReply',
        verified: false,
        api: {
          endpoint: '/messages',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0/{phoneNumberId}',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            to: 'to',
            text: 'text.body'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'Recipient Phone Number',
            placeholder: '1234567890',
            description: 'Phone number in international format (no + sign)',
            aiControlled: true,
            aiDescription: 'The recipient phone number in international format without + sign.'
          },
          text: {
            type: 'string',
            required: true,
            label: 'Message Text',
            inputType: 'textarea',
            maxLength: 4096,
            description: 'Text message to send',
            aiControlled: true,
            aiDescription: 'The message text to send via WhatsApp.'
          },
          waitForResponse: {
            type: 'boolean',
            label: 'Wait for Response',
            default: true,
            description: 'Pause workflow execution until response is received',
            aiControlled: false
          },
          timeoutMinutes: {
            type: 'number',
            label: 'Timeout (minutes)',
            default: 60,
            min: 1,
            max: 1440,
            description: 'Maximum time to wait for a response',
            displayOptions: {
              show: {
                waitForResponse: [true]
              }
            },
            aiControlled: false
          },
          approveButtonLabel: {
            type: 'string',
            label: 'Approve Button Label',
            default: '✓ Approve',
            description: 'Label for approve button in interactive message',
            displayOptions: {
              show: {
                waitForResponse: [true]
              }
            },
            aiControlled: false
          },
          disapproveButtonLabel: {
            type: 'string',
            label: 'Disapprove Button Label',
            default: '✗ Decline',
            description: 'Label for disapprove button in interactive message',
            displayOptions: {
              show: {
                waitForResponse: [true]
              }
            },
            aiControlled: false
          }
        },
        outputSchema: {
          sentMessage: {
            type: 'object',
            description: 'Original sent message data',
            properties: {
              messageId: { type: 'string' }
            }
          },
          response: {
            type: 'object',
            description: 'Response from recipient',
            properties: {
              messageId: { type: 'string' },
              from: { type: 'string' },
              text: { type: 'string' },
              timestamp: { type: 'string' },
              approved: { type: 'boolean', description: 'Whether the response was an approval' }
            }
          }
        }
      },
      {
        id: 'send_template',
        name: 'Send Template',
        description: 'Send a pre-approved message template',
        category: 'Messages',
        icon: 'FileText',
        verified: false,
        api: {
          endpoint: '/messages',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0/{phoneNumberId}',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {accessToken}'
          },
          paramMapping: {
            to: 'to',
            templateName: 'template.name',
            languageCode: 'template.language.code'
          }
        },
        inputSchema: {
          to: {
            type: 'string',
            required: true,
            label: 'Recipient Phone Number',
            placeholder: '1234567890',
            description: 'Phone number in international format (no + sign)',
            aiControlled: true,
            aiDescription: 'The recipient phone number in international format without + sign.'
          },
          templateName: {
            type: 'string',
            required: true,
            label: 'Template Name',
            placeholder: 'hello_world',
            description: 'Name of the approved message template',
            aiControlled: false
          },
          languageCode: {
            type: 'string',
            required: true,
            label: 'Language Code',
            placeholder: 'en',
            default: 'en',
            description: 'Template language code (ISO 639-1)',
            hint: 'Examples: en, es, fr, de, pt',
            aiControlled: false
          },
          templateParameters: {
            type: 'array',
            label: 'Template Parameters',
            description: 'Parameters to fill template placeholders',
            itemSchema: {
              type: {
                type: 'select',
                label: 'Parameter Type',
                options: [
                  { label: 'Text', value: 'text' },
                  { label: 'Currency', value: 'currency' },
                  { label: 'Date/Time', value: 'date_time' },
                  { label: 'Image', value: 'image' },
                  { label: 'Document', value: 'document' },
                  { label: 'Video', value: 'video' }
                ],
                default: 'text'
              },
              text: {
                type: 'string',
                label: 'Text Value',
                description: 'Text to insert in template'
              }
            },
            aiControlled: false
          }
        },
        outputSchema: {
          messagingProduct: { type: 'string' },
          contacts: { type: 'array' },
          messages: {
            type: 'array',
            properties: {
              id: { type: 'string', description: 'Message ID' }
            }
          }
        }
      },

      // ==================== MEDIA ACTIONS ====================
      {
        id: 'upload_media',
        name: 'Upload Media',
        description: 'Upload media (image, video, audio, document) to WhatsApp servers',
        category: 'Media',
        icon: 'Upload',
        verified: false,
        api: {
          endpoint: '/media',
          method: 'POST',
          baseUrl: 'https://graph.facebook.com/v18.0/{phoneNumberId}',
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          file: {
            type: 'string',
            required: true,
            label: 'File',
            inputType: 'file',
            description: 'File to upload (binary data or URL)',
            aiControlled: false
          },
          mediaType: {
            type: 'select',
            required: true,
            label: 'Media Type',
            description: 'Type of media being uploaded',
            options: [
              { label: 'Image', value: 'image' },
              { label: 'Video', value: 'video' },
              { label: 'Audio', value: 'audio' },
              { label: 'Document', value: 'document' },
              { label: 'Sticker', value: 'sticker' }
            ],
            default: 'image',
            aiControlled: false
          },
          filename: {
            type: 'string',
            label: 'Filename',
            description: 'Name for the uploaded file (optional)',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Uploaded media ID' },
          url: { type: 'string', description: 'Media URL (if applicable)' }
        }
      },
      {
        id: 'download_media',
        name: 'Download Media',
        description: 'Download media from WhatsApp servers using media ID',
        category: 'Media',
        icon: 'Download',
        verified: false,
        api: {
          endpoint: '/{mediaId}',
          method: 'GET',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          mediaId: {
            type: 'string',
            required: true,
            label: 'Media ID',
            placeholder: 'Enter media ID',
            description: 'The ID of the media to download',
            aiControlled: false
          },
          saveToFile: {
            type: 'boolean',
            label: 'Save to File',
            default: false,
            description: 'Save downloaded media to a file',
            aiControlled: false
          },
          filename: {
            type: 'string',
            label: 'Filename',
            description: 'Filename for saved media',
            displayOptions: {
              show: {
                saveToFile: [true]
              }
            },
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'string', description: 'Media ID' },
          url: { type: 'string', description: 'Download URL for media' },
          mimeType: { type: 'string', description: 'Media MIME type' },
          sha256: { type: 'string', description: 'SHA256 hash of media' },
          fileSize: { type: 'number', description: 'File size in bytes' },
          binaryData: { type: 'object', description: 'Binary data if downloaded' }
        }
      },
      {
        id: 'delete_media',
        name: 'Delete Media',
        description: 'Delete media from WhatsApp servers',
        category: 'Media',
        icon: 'Trash2',
        verified: false,
        api: {
          endpoint: '/{mediaId}',
          method: 'DELETE',
          baseUrl: 'https://graph.facebook.com/v18.0',
          headers: {
            'Authorization': 'Bearer {accessToken}'
          }
        },
        inputSchema: {
          mediaId: {
            type: 'string',
            required: true,
            label: 'Media ID',
            placeholder: 'Enter media ID',
            description: 'The ID of the media to delete',
            aiControlled: false
          }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' },
          mediaId: { type: 'string', description: 'Deleted media ID' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'on_message',
        name: 'On Message',
        description: 'Triggers when a new message is received from a user',
        eventType: 'message',
        verified: false,
        icon: 'message-square',
        webhookRequired: true,
        inputSchema: {
          messageType: {
            type: 'select',
            label: 'Message Type Filter',
            description: 'Filter messages by type',
            options: [
              { label: 'All Messages', value: 'all' },
              { label: 'Text Messages Only', value: 'text' },
              { label: 'Image Messages Only', value: 'image' },
              { label: 'Audio Messages Only', value: 'audio' },
              { label: 'Video Messages Only', value: 'video' },
              { label: 'Document Messages Only', value: 'document' },
              { label: 'Location Messages Only', value: 'location' },
              { label: 'Contacts Messages Only', value: 'contacts' }
            ],
            default: 'all'
          }
        },
        outputSchema: {
          messageId: { type: 'string', description: 'Message ID' },
          from: { type: 'string', description: 'Sender phone number' },
          timestamp: { type: 'string', description: 'Message timestamp' },
          type: { type: 'string', description: 'Message type (text, image, etc.)' },
          text: {
            type: 'object',
            description: 'Text message content',
            properties: {
              body: { type: 'string' }
            }
          },
          image: {
            type: 'object',
            description: 'Image message details',
            properties: {
              id: { type: 'string' },
              mime_type: { type: 'string' },
              sha256: { type: 'string' },
              caption: { type: 'string' }
            }
          }
        }
      },
      {
        id: 'on_account_update',
        name: 'On Account Update',
        description: 'Triggers when the WhatsApp Business Account is updated',
        eventType: 'account_update',
        verified: false,
        icon: 'user-cog',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          accountId: { type: 'string', description: 'Business Account ID' },
          event: { type: 'string', description: 'Update event type' },
          timestamp: { type: 'string', description: 'Event timestamp' },
          changes: { type: 'object', description: 'Account changes details' }
        }
      },
      {
        id: 'on_phone_number_name_update',
        name: 'On Phone Number Name Update',
        description: 'Triggers when the phone number display name is updated',
        eventType: 'phone_number_name_update',
        verified: false,
        icon: 'edit',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          phoneNumberId: { type: 'string', description: 'Phone Number ID' },
          displayName: { type: 'string', description: 'New display name' },
          verifiedName: { type: 'string', description: 'Verified business name' },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_phone_number_quality_update',
        name: 'On Phone Number Quality Update',
        description: 'Triggers when the phone number quality rating changes',
        eventType: 'phone_number_quality_update',
        verified: false,
        icon: 'trending-up',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          phoneNumberId: { type: 'string', description: 'Phone Number ID' },
          currentQuality: {
            type: 'string',
            description: 'Current quality rating (GREEN, YELLOW, RED, UNKNOWN)'
          },
          previousQuality: {
            type: 'string',
            description: 'Previous quality rating'
          },
          timestamp: { type: 'string', description: 'Update timestamp' },
          event: { type: 'string', description: 'Quality event type' }
        }
      },
      {
        id: 'on_account_review_update',
        name: 'On Account Review Update',
        description: 'Triggers when the business account review status changes',
        eventType: 'account_review_update',
        verified: false,
        icon: 'shield-check',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          accountId: { type: 'string', description: 'Business Account ID' },
          reviewStatus: {
            type: 'string',
            description: 'Review status (APPROVED, PENDING, REJECTED)'
          },
          decision: { type: 'string', description: 'Review decision' },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_business_capability_update',
        name: 'On Business Capability Update',
        description: 'Triggers when business capabilities are updated',
        eventType: 'business_capability_update',
        verified: false,
        icon: 'settings',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          accountId: { type: 'string', description: 'Business Account ID' },
          capabilities: {
            type: 'array',
            description: 'Updated capabilities list'
          },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_message_template_quality_update',
        name: 'On Message Template Quality Update',
        description: 'Triggers when a message template quality rating changes',
        eventType: 'message_template_quality_update',
        verified: false,
        icon: 'file-check',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          templateId: { type: 'string', description: 'Template ID' },
          templateName: { type: 'string', description: 'Template name' },
          currentQuality: {
            type: 'string',
            description: 'Current template quality (HIGH, MEDIUM, LOW, UNKNOWN)'
          },
          previousQuality: { type: 'string', description: 'Previous quality rating' },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_message_template_status_update',
        name: 'On Message Template Status Update',
        description: 'Triggers when a message template status changes (approved, rejected, etc.)',
        eventType: 'message_template_status_update',
        verified: false,
        icon: 'file-text',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          templateId: { type: 'string', description: 'Template ID' },
          templateName: { type: 'string', description: 'Template name' },
          status: {
            type: 'string',
            description: 'Template status (APPROVED, REJECTED, PENDING, DISABLED)'
          },
          reason: { type: 'string', description: 'Status change reason' },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_template_category_update',
        name: 'On Template Category Update',
        description: 'Triggers when a message template category is updated',
        eventType: 'template_category_update',
        verified: false,
        icon: 'folder',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          templateId: { type: 'string', description: 'Template ID' },
          templateName: { type: 'string', description: 'Template name' },
          category: {
            type: 'string',
            description: 'Template category (MARKETING, UTILITY, AUTHENTICATION)'
          },
          previousCategory: { type: 'string', description: 'Previous category' },
          timestamp: { type: 'string', description: 'Update timestamp' }
        }
      },
      {
        id: 'on_security',
        name: 'On Security Event',
        description: 'Triggers when a security event occurs (e.g., phone number verification)',
        eventType: 'security',
        verified: false,
        icon: 'shield-alert',
        webhookRequired: true,
        inputSchema: {},
        outputSchema: {
          eventType: {
            type: 'string',
            description: 'Security event type (VERIFY_CODE, PIN_CHANGED, etc.)'
          },
          phoneNumberId: { type: 'string', description: 'Phone Number ID' },
          details: { type: 'object', description: 'Security event details' },
          timestamp: { type: 'string', description: 'Event timestamp' }
        }
      }
    ]
  };
