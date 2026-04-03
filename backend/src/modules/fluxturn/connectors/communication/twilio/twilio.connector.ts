import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import { ICommunicationConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger
} from '../../types';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

// Twilio-specific interfaces
export interface TwilioMessage {
  account_sid: string;
  api_version: string;
  body: string;
  date_created: string;
  date_sent?: string;
  date_updated: string;
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';
  error_code?: number;
  error_message?: string;
  from: string;
  messaging_service_sid?: string;
  num_media: string;
  num_segments: string;
  price?: string;
  price_unit?: string;
  sid: string;
  status: 'accepted' | 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered' | 'receiving' | 'received';
  subresource_uris: {
    media?: string;
    feedback?: string;
  };
  to: string;
  uri: string;
}

export interface TwilioCall {
  account_sid: string;
  annotation?: string;
  answered_by?: string;
  api_version: string;
  caller_name?: string;
  date_created: string;
  date_updated: string;
  direction: 'inbound' | 'outbound-api' | 'outbound-dial';
  duration?: string;
  end_time?: string;
  forwarded_from?: string;
  from: string;
  from_formatted: string;
  group_sid?: string;
  parent_call_sid?: string;
  phone_number_sid?: string;
  price?: string;
  price_unit?: string;
  sid: string;
  start_time?: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  subresource_uris: {
    notifications?: string;
    recordings?: string;
    feedback?: string;
    events?: string;
    payments?: string;
    siprec?: string;
    streams?: string;
    transcriptions?: string;
    user_defined_messages?: string;
  };
  to: string;
  to_formatted: string;
  trunk_sid?: string;
  uri: string;
}

export interface TwilioPhoneNumber {
  account_sid: string;
  address_sid?: string;
  api_version: string;
  beta: boolean;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  date_created: string;
  date_updated: string;
  emergency_address_sid?: string;
  emergency_status: string;
  friendly_name: string;
  identity_sid?: string;
  origin: string;
  phone_number: string;
  sid: string;
  sms_application_sid?: string;
  sms_fallback_method?: string;
  sms_fallback_url?: string;
  sms_method?: string;
  sms_url?: string;
  status_callback?: string;
  status_callback_method?: string;
  trunk_sid?: string;
  uri: string;
  voice_application_sid?: string;
  voice_caller_id_lookup?: boolean;
  voice_fallback_method?: string;
  voice_fallback_url?: string;
  voice_method?: string;
  voice_url?: string;
}

export interface TwilioSendSMSRequest {
  to: string;
  from?: string;
  messagingServiceSid?: string;
  body: string;
  mediaUrl?: string[];
  statusCallback?: string;
  applicationSid?: string;
  maxPrice?: string;
  provideFeedback?: boolean;
  attemptLimit?: number;
  validityPeriod?: number;
  forceDelivery?: boolean;
  contentRetention?: 'retain' | 'discard';
  addressRetention?: 'retain' | 'discard';
  smartEncoded?: boolean;
  persistentAction?: string[];
  scheduleType?: 'fixed';
  sendAt?: string;
  sendAsMms?: boolean;
  contentVariables?: string;
}

export interface TwilioMakeCallRequest {
  to: string;
  from: string;
  url?: string;
  twiml?: string;
  applicationSid?: string;
  method?: 'GET' | 'POST';
  fallbackUrl?: string;
  fallbackMethod?: 'GET' | 'POST';
  statusCallback?: string;
  statusCallbackEvent?: string[];
  statusCallbackMethod?: 'GET' | 'POST';
  sendDigits?: string;
  timeout?: number;
  record?: boolean;
  recordingChannels?: 'mono' | 'dual';
  recordingStatusCallback?: string;
  recordingStatusCallbackMethod?: 'GET' | 'POST';
  recordingStatusCallbackEvent?: string[];
  sipAuthUsername?: string;
  sipAuthPassword?: string;
  machineDetection?: 'Enable' | 'DetectMessageEnd';
  machineDetectionTimeout?: number;
  recordingTrack?: 'inbound' | 'outbound' | 'both';
  trim?: 'trim-silence' | 'do-not-trim';
  callerId?: string;
  machineDetectionSpeechThreshold?: number;
  machineDetectionSpeechEndThreshold?: number;
  machineDetectionSilenceTimeout?: number;
  asyncAmd?: 'true' | 'false';
  asyncAmdStatusCallback?: string;
  asyncAmdStatusCallbackMethod?: 'GET' | 'POST';
  byoc?: string;
  callReason?: string;
  callToken?: string;
  answerOnBridge?: boolean;
}

@Injectable()
export class TwilioConnector extends BaseConnector implements ICommunicationConnector {
  private baseUrl = 'https://api.twilio.com/2010-04-01';
  
  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Twilio',
      description: 'Twilio communications platform for SMS, voice, and video',
      version: '1.0.0',
      category: ConnectorCategory.COMMUNICATION,
      type: ConnectorType.SMS,
      logoUrl: 'https://www.twilio.com/content/dam/twilio-com/global/logos/brand/mark-red.svg',
      documentationUrl: 'https://www.twilio.com/docs',
      authType: AuthType.BASIC_AUTH,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 100,
        requestsPerMinute: 6000,
        requestsPerHour: 360000
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Test connection by getting account info
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}.json`,
      headers: this.getAuthHeaders()
    });

    if (!response.sid) {
      throw new Error('Failed to initialize Twilio connection');
    }

    this.logger.log(`Twilio connector initialized for account: ${response.friendly_name || response.sid}`);
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}.json`,
        headers: this.getAuthHeaders()
      });
      return !!response.sid;
    } catch (error) {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.performRequest({
      method: 'GET',
      endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Messages.json`,
      headers: this.getAuthHeaders(),
      queryParams: { PageSize: 1 }
    });

    if (!response.messages) {
      throw new Error('Twilio health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    const response = await this.apiUtils.executeRequest(request, {
      timeout: 30000,
      retries: 3
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Twilio API request failed');
    }

    return response.data;
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'send_sms':
        return this.sendSMS(input);
      case 'send_whatsapp':
        return this.sendWhatsApp(input);
      case 'make_call':
        return this.makeCall(input);
      case 'send_mms':
        return this.sendMMS(input);
      case 'get_message_status':
        return this.getMessageStatus(input.messageSid);
      case 'get_call_status':
        return this.getCallStatus(input.callSid);
      case 'get_phone_numbers':
        return this.getPhoneNumbers(input.options);
      case 'get_messages':
        return this.getMessages(input.options);
      case 'get_calls':
        return this.getCalls(input.options);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Twilio connector cleanup completed');
  }

  // ICommunicationConnector implementation
  async sendMessage(to: string | string[], message: any): Promise<ConnectorResponse> {
    const recipients = Array.isArray(to) ? to : [to];
    const results: any[] = [];

    for (const recipient of recipients) {
      try {
        let result;
        
        // Determine message type based on recipient format
        if (recipient.startsWith('whatsapp:')) {
          result = await this.sendWhatsApp({
            to: recipient,
            body: message.body || message.text,
            from: message.from,
            mediaUrl: message.mediaUrl
          });
        } else {
          // Check if message has media (MMS) or just text (SMS)
          if (message.mediaUrl && message.mediaUrl.length > 0) {
            result = await this.sendMMS({
              to: recipient,
              body: message.body || message.text,
              from: message.from,
              mediaUrl: message.mediaUrl
            });
          } else {
            result = await this.sendSMS({
              to: recipient,
              body: message.body || message.text,
              from: message.from,
              messagingServiceSid: message.messagingServiceSid
            });
          }
        }

        if (result.success) {
          results.push({
            to: recipient,
            success: true,
            messageSid: result.data.sid,
            status: result.data.status
          });
        } else {
          results.push({
            to: recipient,
            success: false,
            error: result.error?.message
          });
        }
      } catch (error) {
        results.push({
          to: recipient,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      data: results
    };
  }

  async getMessages(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        PageSize: Math.min(options?.pageSize || 20, 1000),
        Page: options?.page || 0,
        To: options?.filters?.to,
        From: options?.filters?.from,
        DateSent: options?.filters?.dateSent,
        DateSentBefore: options?.filters?.dateSentBefore,
        DateSentAfter: options?.filters?.dateSentAfter
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Messages.json`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          messages: response.messages,
          totalCount: response.total,
          pageSize: response.page_size,
          page: response.page
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: response.page,
            pageSize: response.page_size,
            hasNext: response.next_page_uri !== null,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get messages');
    }
  }

  async getContact(contactId: string): Promise<ConnectorResponse> {
    // Twilio doesn't have a contacts API - it focuses on communication
    throw new Error('Contact management is not supported by Twilio. Use phone number lookup instead.');
  }

  async upsertContact(contact: any): Promise<ConnectorResponse> {
    // Twilio doesn't have a contacts API - it focuses on communication
    throw new Error('Contact management is not supported by Twilio. Use phone number lookup instead.');
  }

  // Twilio-specific methods
  async sendSMS(request: TwilioSendSMSRequest): Promise<ConnectorResponse> {
    try {
      const body = new URLSearchParams();
      body.append('To', request.to);
      body.append('Body', request.body);
      
      if (request.from) {
        body.append('From', request.from);
      } else if (request.messagingServiceSid) {
        body.append('MessagingServiceSid', request.messagingServiceSid);
      } else {
        throw new Error('Either From phone number or MessagingServiceSid is required');
      }

      if (request.mediaUrl) {
        request.mediaUrl.forEach(url => body.append('MediaUrl', url));
      }
      if (request.statusCallback) body.append('StatusCallback', request.statusCallback);
      if (request.applicationSid) body.append('ApplicationSid', request.applicationSid);
      if (request.maxPrice) body.append('MaxPrice', request.maxPrice);
      if (request.provideFeedback !== undefined) body.append('ProvideFeedback', request.provideFeedback.toString());
      if (request.attemptLimit) body.append('AttemptLimit', request.attemptLimit.toString());
      if (request.validityPeriod) body.append('ValidityPeriod', request.validityPeriod.toString());
      if (request.forceDelivery !== undefined) body.append('ForceDelivery', request.forceDelivery.toString());
      if (request.contentRetention) body.append('ContentRetention', request.contentRetention);
      if (request.addressRetention) body.append('AddressRetention', request.addressRetention);
      if (request.smartEncoded !== undefined) body.append('SmartEncoded', request.smartEncoded.toString());

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Messages.json`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to send SMS');
    }
  }

  async sendWhatsApp(request: { to: string; body: string; from?: string; mediaUrl?: string[] }): Promise<ConnectorResponse> {
    try {
      // WhatsApp messages require a WhatsApp-enabled Twilio number
      const whatsappRequest: TwilioSendSMSRequest = {
        to: request.to.startsWith('whatsapp:') ? request.to : `whatsapp:${request.to}`,
        body: request.body,
        from: request.from ? (request.from.startsWith('whatsapp:') ? request.from : `whatsapp:${request.from}`) : undefined,
        mediaUrl: request.mediaUrl
      };

      return this.sendSMS(whatsappRequest);
    } catch (error) {
      return this.handleError(error as any, 'Failed to send WhatsApp message');
    }
  }

  async makeCall(request: TwilioMakeCallRequest): Promise<ConnectorResponse> {
    try {
      const body = new URLSearchParams();
      body.append('To', request.to);
      body.append('From', request.from);

      if (request.url) {
        body.append('Url', request.url);
      } else if (request.twiml) {
        body.append('Twiml', request.twiml);
      } else if (request.applicationSid) {
        body.append('ApplicationSid', request.applicationSid);
      } else {
        throw new Error('Either Url, Twiml, or ApplicationSid is required');
      }

      if (request.method) body.append('Method', request.method);
      if (request.fallbackUrl) body.append('FallbackUrl', request.fallbackUrl);
      if (request.fallbackMethod) body.append('FallbackMethod', request.fallbackMethod);
      if (request.statusCallback) body.append('StatusCallback', request.statusCallback);
      if (request.statusCallbackEvent) {
        request.statusCallbackEvent.forEach(event => body.append('StatusCallbackEvent', event));
      }
      if (request.statusCallbackMethod) body.append('StatusCallbackMethod', request.statusCallbackMethod);
      if (request.sendDigits) body.append('SendDigits', request.sendDigits);
      if (request.timeout) body.append('Timeout', request.timeout.toString());
      if (request.record !== undefined) body.append('Record', request.record.toString());
      if (request.recordingChannels) body.append('RecordingChannels', request.recordingChannels);
      if (request.recordingStatusCallback) body.append('RecordingStatusCallback', request.recordingStatusCallback);
      if (request.machineDetection) body.append('MachineDetection', request.machineDetection);

      const response = await this.performRequest({
        method: 'POST',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Calls.json`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to make call');
    }
  }

  async sendMMS(request: { to: string; body?: string; from?: string; mediaUrl: string[] }): Promise<ConnectorResponse> {
    const mmsRequest: TwilioSendSMSRequest = {
      to: request.to,
      body: request.body || '',
      from: request.from,
      mediaUrl: request.mediaUrl
    };

    return this.sendSMS(mmsRequest);
  }

  async getMessageStatus(messageSid: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Messages/${messageSid}.json`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          sid: response.sid,
          status: response.status,
          errorCode: response.error_code,
          errorMessage: response.error_message,
          dateSent: response.date_sent,
          dateUpdated: response.date_updated,
          price: response.price,
          priceUnit: response.price_unit
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get message status');
    }
  }

  async getCallStatus(callSid: string): Promise<ConnectorResponse> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Calls/${callSid}.json`,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        data: {
          sid: response.sid,
          status: response.status,
          duration: response.duration,
          startTime: response.start_time,
          endTime: response.end_time,
          price: response.price,
          priceUnit: response.price_unit,
          direction: response.direction,
          answeredBy: response.answered_by
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get call status');
    }
  }

  async getPhoneNumbers(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        PageSize: Math.min(options?.pageSize || 20, 1000),
        Page: options?.page || 0,
        PhoneNumber: options?.filters?.phoneNumber,
        FriendlyName: options?.filters?.friendlyName
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/IncomingPhoneNumbers.json`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          phoneNumbers: response.incoming_phone_numbers,
          totalCount: response.total,
          pageSize: response.page_size,
          page: response.page
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: response.page,
            pageSize: response.page_size,
            hasNext: response.next_page_uri !== null,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get phone numbers');
    }
  }

  async getCalls(options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const params: any = {
        PageSize: Math.min(options?.pageSize || 20, 1000),
        Page: options?.page || 0,
        To: options?.filters?.to,
        From: options?.filters?.from,
        Status: options?.filters?.status,
        StartTimeBefore: options?.filters?.startTimeBefore,
        StartTimeAfter: options?.filters?.startTimeAfter
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await this.performRequest({
        method: 'GET',
        endpoint: `${this.baseUrl}/Accounts/${this.config.credentials.username}/Calls.json`,
        headers: this.getAuthHeaders(),
        queryParams: params
      });

      return {
        success: true,
        data: {
          calls: response.calls,
          totalCount: response.total,
          pageSize: response.page_size,
          page: response.page
        },
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: response.page,
            pageSize: response.page_size,
            hasNext: response.next_page_uri !== null,
            total: 0
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get calls');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = `${this.config.credentials.username}:${this.config.credentials.password}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    
    return {
      'Authorization': `Basic ${encodedCredentials}`,
      'User-Agent': 'FluxTurn/1.0.0'
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'send_sms',
        name: 'Send SMS',
        description: 'Send an SMS message',
        inputSchema: {
          to: { type: 'string', required: true, description: 'Recipient phone number' },
          body: { type: 'string', required: true, description: 'Message content' },
          from: { type: 'string', description: 'Sender phone number' },
          messagingServiceSid: { type: 'string', description: 'Messaging service SID' }
        },
        outputSchema: {
          sid: { type: 'string', description: 'Message SID' },
          status: { type: 'string', description: 'Message status' }
        }
      },
      {
        id: 'send_whatsapp',
        name: 'Send WhatsApp Message',
        description: 'Send a WhatsApp message via Twilio',
        inputSchema: {
          to: { type: 'string', required: true, description: 'Recipient WhatsApp number' },
          body: { type: 'string', required: true, description: 'Message content' },
          from: { type: 'string', description: 'Sender WhatsApp number' },
          mediaUrl: { type: 'array', description: 'Media URLs for attachments' }
        },
        outputSchema: {
          sid: { type: 'string', description: 'Message SID' },
          status: { type: 'string', description: 'Message status' }
        }
      },
      {
        id: 'make_call',
        name: 'Make Voice Call',
        description: 'Make a voice call',
        inputSchema: {
          to: { type: 'string', required: true, description: 'Recipient phone number' },
          from: { type: 'string', required: true, description: 'Caller phone number' },
          url: { type: 'string', description: 'TwiML URL for call instructions' },
          twiml: { type: 'string', description: 'TwiML instructions' },
          record: { type: 'boolean', description: 'Whether to record the call' }
        },
        outputSchema: {
          sid: { type: 'string', description: 'Call SID' },
          status: { type: 'string', description: 'Call status' }
        }
      },
      {
        id: 'send_mms',
        name: 'Send MMS',
        description: 'Send an MMS message with media',
        inputSchema: {
          to: { type: 'string', required: true, description: 'Recipient phone number' },
          from: { type: 'string', description: 'Sender phone number' },
          body: { type: 'string', description: 'Message content' },
          mediaUrl: { type: 'array', required: true, description: 'Media URLs for attachments' }
        },
        outputSchema: {
          sid: { type: 'string', description: 'Message SID' },
          status: { type: 'string', description: 'Message status' }
        }
      },
      {
        id: 'get_message_status',
        name: 'Get Message Status',
        description: 'Get the status of a message',
        inputSchema: {
          messageSid: { type: 'string', required: true, description: 'Message SID' }
        },
        outputSchema: {
          status: { type: 'string', description: 'Current message status' },
          errorCode: { type: 'number', description: 'Error code if failed' },
          errorMessage: { type: 'string', description: 'Error message if failed' }
        }
      },
      {
        id: 'get_call_status',
        name: 'Get Call Status',
        description: 'Get the status of a call',
        inputSchema: {
          callSid: { type: 'string', required: true, description: 'Call SID' }
        },
        outputSchema: {
          status: { type: 'string', description: 'Current call status' },
          duration: { type: 'string', description: 'Call duration in seconds' },
          price: { type: 'string', description: 'Call cost' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'message_received',
        name: 'Message Received',
        description: 'Triggered when an SMS/MMS is received',
        eventType: 'message.received',
        outputSchema: {
          messageSid: { type: 'string', description: 'Message SID' },
          from: { type: 'string', description: 'Sender phone number' },
          to: { type: 'string', description: 'Recipient phone number' },
          body: { type: 'string', description: 'Message content' },
          numMedia: { type: 'string', description: 'Number of media attachments' }
        },
        webhookRequired: true
      },
      {
        id: 'call_received',
        name: 'Call Received',
        description: 'Triggered when a voice call is received',
        eventType: 'call.received',
        outputSchema: {
          callSid: { type: 'string', description: 'Call SID' },
          from: { type: 'string', description: 'Caller phone number' },
          to: { type: 'string', description: 'Called phone number' },
          callStatus: { type: 'string', description: 'Call status' }
        },
        webhookRequired: true
      },
      {
        id: 'message_status_changed',
        name: 'Message Status Changed',
        description: 'Triggered when message delivery status changes',
        eventType: 'message.status',
        outputSchema: {
          messageSid: { type: 'string', description: 'Message SID' },
          messageStatus: { type: 'string', description: 'New message status' },
          errorCode: { type: 'string', description: 'Error code if failed' },
          errorMessage: { type: 'string', description: 'Error message if failed' }
        },
        webhookRequired: true
      }
    ];
  }
}