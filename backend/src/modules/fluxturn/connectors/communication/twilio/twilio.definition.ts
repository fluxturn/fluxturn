// Twilio Connector
// Based on n8n implementation with Fluxturn patterns

import { ConnectorDefinition } from '../../shared';

export const TWILIO_CONNECTOR: ConnectorDefinition = {
  name: 'twilio',
  display_name: 'Twilio',
  category: 'communication',
  description: 'Send SMS, MMS, WhatsApp messages and make phone calls',
  auth_type: 'basic',
  auth_fields: [
    {
      key: 'accountSid',
      label: 'Account SID',
      type: 'string',
      required: true,
      placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'Your Twilio Account SID from the dashboard',
      helpUrl: 'https://console.twilio.com/',
      helpText: 'Find in Twilio Console'
    },
    {
      key: 'authToken',
      label: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      description: 'Your Twilio Auth Token from the dashboard'
    }
  ],
  endpoints: {
    base_url: 'https://api.twilio.com/2010-04-01/Accounts/{accountSid}',
    events_url: 'https://events.twilio.com/v1',
    messages: '/Messages.json',
    calls: '/Calls.json'
  },
  webhook_support: true,
  rate_limits: { requests_per_second: 10 },
  sandbox_available: true,
  verified: false,

  supported_actions: [
    // ============ SMS Actions ============
    {
      id: 'send_sms',
      name: 'Send SMS',
      description: 'Send an SMS message',
      category: 'SMS',
      icon: 'message-square',
      verified: false,
      api: {
        endpoint: '/Messages.json',
        method: 'POST',
        baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/{accountSid}',
        contentType: 'application/x-www-form-urlencoded',
        authType: 'basic',
        paramMapping: {
          from: 'From',
          to: 'To',
          body: 'Body',
          statusCallback: 'StatusCallback',
          mediaUrl: 'MediaUrl'
        }
      },
      inputSchema: {
        from: {
          type: 'string',
          required: true,
          label: 'From Number',
          placeholder: '+14155238886',
          description: 'Your Twilio phone number (E.164 format)',
          aiControlled: false
        },
        to: {
          type: 'string',
          required: true,
          label: 'To Number',
          placeholder: '+14155238886',
          description: 'Recipient phone number (E.164 format)',
          aiControlled: true,
          aiDescription: 'The recipient phone number in E.164 format (e.g., +14155238886).'
        },
        body: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          maxLength: 1600,
          description: 'SMS message body (max 1600 characters)',
          aiControlled: true,
          aiDescription: 'The SMS message text to send. Maximum 1600 characters.'
        },
        mediaUrl: {
          type: 'string',
          label: 'Media URL (MMS)',
          placeholder: 'https://example.com/image.jpg',
          description: 'URL of media to send (for MMS). Only works in US/Canada.',
          aiControlled: false
        },
        statusCallback: {
          type: 'string',
          label: 'Status Callback URL',
          placeholder: 'https://your-webhook.com/status',
          description: 'URL to receive message status updates',
          aiControlled: false
        }
      },
      outputSchema: {
        sid: { type: 'string', description: 'Message SID' },
        status: { type: 'string', description: 'Message status' },
        to: { type: 'string', description: 'Recipient number' },
        from: { type: 'string', description: 'Sender number' },
        body: { type: 'string', description: 'Message body' },
        dateCreated: { type: 'string', description: 'Creation timestamp' },
        dateSent: { type: 'string', description: 'Sent timestamp' },
        price: { type: 'string', description: 'Message price' },
        priceUnit: { type: 'string', description: 'Price currency' }
      }
    },
    {
      id: 'send_whatsapp',
      name: 'Send WhatsApp Message',
      description: 'Send a message via WhatsApp',
      category: 'WhatsApp',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/Messages.json',
        method: 'POST',
        baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/{accountSid}',
        contentType: 'application/x-www-form-urlencoded',
        authType: 'basic',
        paramMapping: {
          from: 'From',
          to: 'To',
          body: 'Body',
          mediaUrl: 'MediaUrl'
        }
      },
      inputSchema: {
        from: {
          type: 'string',
          required: true,
          label: 'From WhatsApp Number',
          placeholder: '+14155238886',
          description: 'Your Twilio WhatsApp-enabled number (without whatsapp: prefix)',
          aiControlled: false
        },
        to: {
          type: 'string',
          required: true,
          label: 'To WhatsApp Number',
          placeholder: '+14155238886',
          description: 'Recipient WhatsApp number (without whatsapp: prefix)',
          aiControlled: true,
          aiDescription: 'The recipient WhatsApp number in E.164 format.'
        },
        body: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          description: 'WhatsApp message content',
          aiControlled: true,
          aiDescription: 'The WhatsApp message text to send.'
        },
        mediaUrl: {
          type: 'string',
          label: 'Media URL',
          placeholder: 'https://example.com/image.jpg',
          description: 'URL of media to attach (image, video, document)',
          aiControlled: false
        }
      },
      outputSchema: {
        sid: { type: 'string', description: 'Message SID' },
        status: { type: 'string', description: 'Message status' },
        to: { type: 'string', description: 'Recipient (whatsapp:+number)' },
        from: { type: 'string', description: 'Sender (whatsapp:+number)' },
        body: { type: 'string', description: 'Message body' }
      }
    },

    // ============ Call Actions ============
    {
      id: 'make_call',
      name: 'Make Call',
      description: 'Make a voice call with text-to-speech or TwiML',
      category: 'Voice',
      icon: 'phone',
      verified: false,
      api: {
        endpoint: '/Calls.json',
        method: 'POST',
        baseUrl: 'https://api.twilio.com/2010-04-01/Accounts/{accountSid}',
        contentType: 'application/x-www-form-urlencoded',
        authType: 'basic',
        paramMapping: {
          from: 'From',
          to: 'To',
          twiml: 'Twiml',
          url: 'Url',
          statusCallback: 'StatusCallback'
        }
      },
      inputSchema: {
        from: {
          type: 'string',
          required: true,
          label: 'From Number',
          placeholder: '+14155238886',
          description: 'Your Twilio phone number (E.164 format)',
          aiControlled: false
        },
        to: {
          type: 'string',
          required: true,
          label: 'To Number',
          placeholder: '+14155238886',
          description: 'Number to call (E.164 format)',
          aiControlled: true,
          aiDescription: 'The phone number to call in E.164 format.'
        },
        message: {
          type: 'string',
          required: true,
          label: 'Message',
          inputType: 'textarea',
          description: 'Text to speak or TwiML content',
          aiControlled: true,
          aiDescription: 'The message to speak during the call (text-to-speech) or TwiML content.'
        },
        useTwiml: {
          type: 'boolean',
          label: 'Use TwiML',
          default: false,
          description: 'Message is raw TwiML markup (otherwise text-to-speech)',
          aiControlled: false
        },
        statusCallback: {
          type: 'string',
          label: 'Status Callback URL',
          placeholder: 'https://your-webhook.com/call-status',
          description: 'URL to receive call status updates',
          aiControlled: false
        }
      },
      outputSchema: {
        sid: { type: 'string', description: 'Call SID' },
        status: { type: 'string', description: 'Call status' },
        to: { type: 'string', description: 'Called number' },
        from: { type: 'string', description: 'Caller number' },
        direction: { type: 'string', description: 'Call direction' },
        dateCreated: { type: 'string', description: 'Creation timestamp' }
      }
    },

    // ============ Lookup Actions ============
    {
      id: 'lookup_phone',
      name: 'Lookup Phone Number',
      description: 'Get information about a phone number',
      category: 'Lookup',
      icon: 'search',
      verified: false,
      api: {
        endpoint: '/PhoneNumbers/{phoneNumber}',
        method: 'GET',
        baseUrl: 'https://lookups.twilio.com/v2',
        authType: 'basic',
        paramMapping: {
          phoneNumber: 'phoneNumber'
        }
      },
      inputSchema: {
        phoneNumber: {
          type: 'string',
          required: true,
          label: 'Phone Number',
          placeholder: '+14155238886',
          description: 'Phone number to lookup (E.164 format)'
        },
        fields: {
          type: 'select',
          label: 'Information Type',
          options: [
            { label: 'Basic (formatting only)', value: '' },
            { label: 'Caller Name', value: 'caller_name' },
            { label: 'Carrier Info', value: 'line_type_intelligence' },
            { label: 'SIM Swap', value: 'sim_swap' }
          ],
          default: '',
          description: 'Type of lookup to perform (additional charges may apply)'
        }
      },
      outputSchema: {
        phoneNumber: { type: 'string', description: 'Phone number (E.164)' },
        countryCode: { type: 'string', description: 'ISO country code' },
        nationalFormat: { type: 'string', description: 'National format' },
        valid: { type: 'boolean', description: 'Whether number is valid' },
        callerName: { type: 'object', description: 'Caller name info if requested' },
        carrier: { type: 'object', description: 'Carrier info if requested' }
      }
    }
  ],

  supported_triggers: [
    {
      id: 'sms_received',
      name: 'SMS Received',
      description: 'Triggers when an SMS message is received',
      eventType: 'com.twilio.messaging.inbound-message.received',
      icon: 'message-square',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        phoneNumber: {
          type: 'string',
          label: 'Filter by To Number',
          placeholder: '+14155238886',
          description: 'Only trigger for messages to this number (optional)'
        }
      },
      outputSchema: {
        twilioEvent: {
          type: 'object',
          properties: {
            messageSid: { type: 'string', description: 'Unique message identifier' },
            from: { type: 'string', description: 'Sender phone number' },
            to: { type: 'string', description: 'Recipient phone number' },
            body: { type: 'string', description: 'Message content' },
            numMedia: { type: 'number', description: 'Number of media attachments' },
            mediaUrls: { type: 'array', description: 'URLs of attached media' },
            fromCity: { type: 'string', description: 'Sender city' },
            fromState: { type: 'string', description: 'Sender state' },
            fromCountry: { type: 'string', description: 'Sender country' },
            timestamp: { type: 'string', description: 'Event timestamp' }
          }
        }
      }
    },
    {
      id: 'call_received',
      name: 'Call Received',
      description: 'Triggers when a phone call is received or completed',
      eventType: 'com.twilio.voice.insights.call-summary.complete',
      icon: 'phone-incoming',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        phoneNumber: {
          type: 'string',
          label: 'Filter by To Number',
          placeholder: '+14155238886',
          description: 'Only trigger for calls to this number (optional)'
        }
      },
      outputSchema: {
        twilioEvent: {
          type: 'object',
          properties: {
            callSid: { type: 'string', description: 'Unique call identifier' },
            from: { type: 'string', description: 'Caller phone number' },
            to: { type: 'string', description: 'Called phone number' },
            status: { type: 'string', description: 'Call status' },
            direction: { type: 'string', description: 'Call direction (inbound/outbound)' },
            duration: { type: 'number', description: 'Call duration in seconds' },
            startTime: { type: 'string', description: 'Call start time' },
            endTime: { type: 'string', description: 'Call end time' },
            fromCity: { type: 'string', description: 'Caller city' },
            fromState: { type: 'string', description: 'Caller state' },
            fromCountry: { type: 'string', description: 'Caller country' },
            timestamp: { type: 'string', description: 'Event timestamp' }
          }
        }
      }
    },
    {
      id: 'whatsapp_received',
      name: 'WhatsApp Message Received',
      description: 'Triggers when a WhatsApp message is received',
      eventType: 'com.twilio.messaging.inbound-message.received',
      icon: 'message-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        phoneNumber: {
          type: 'string',
          label: 'Filter by To Number',
          placeholder: '+14155238886',
          description: 'Only trigger for messages to this WhatsApp number (optional)'
        }
      },
      outputSchema: {
        twilioEvent: {
          type: 'object',
          properties: {
            messageSid: { type: 'string', description: 'Unique message identifier' },
            from: { type: 'string', description: 'Sender WhatsApp number (whatsapp:+...)' },
            to: { type: 'string', description: 'Recipient WhatsApp number' },
            body: { type: 'string', description: 'Message content' },
            numMedia: { type: 'number', description: 'Number of media attachments' },
            mediaUrls: { type: 'array', description: 'URLs of attached media' },
            profileName: { type: 'string', description: 'Sender WhatsApp profile name' },
            timestamp: { type: 'string', description: 'Event timestamp' }
          }
        }
      }
    },
    {
      id: 'message_status_updated',
      name: 'Message Status Updated',
      description: 'Triggers when a message status changes (sent, delivered, failed, etc.)',
      eventType: 'com.twilio.messaging.message.delivered',
      icon: 'check-circle',
      verified: false,
      webhookRequired: true,
      inputSchema: {
        statusFilter: {
          type: 'select',
          label: 'Status Filter',
          options: [
            { label: 'All Status Changes', value: 'all' },
            { label: 'Delivered Only', value: 'delivered' },
            { label: 'Failed Only', value: 'failed' },
            { label: 'Undelivered Only', value: 'undelivered' }
          ],
          default: 'all',
          description: 'Filter by message status'
        }
      },
      outputSchema: {
        twilioEvent: {
          type: 'object',
          properties: {
            messageSid: { type: 'string', description: 'Message identifier' },
            messageStatus: { type: 'string', description: 'New status (sent, delivered, failed, etc.)' },
            to: { type: 'string', description: 'Recipient number' },
            from: { type: 'string', description: 'Sender number' },
            errorCode: { type: 'string', description: 'Error code if failed' },
            errorMessage: { type: 'string', description: 'Error message if failed' },
            timestamp: { type: 'string', description: 'Status update timestamp' }
          }
        }
      }
    }
  ]
};
