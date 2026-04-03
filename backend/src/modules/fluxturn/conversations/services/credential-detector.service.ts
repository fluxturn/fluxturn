import { Injectable, Logger } from '@nestjs/common';

export interface DetectedCredential {
  connector: string;
  connectorName: string;
  field: string;
  value: string;
  masked: string;
}

export interface CredentialDetectionResult {
  hasCredentials: boolean;
  credentials: DetectedCredential[];
}

@Injectable()
export class CredentialDetectorService {
  private readonly logger = new Logger(CredentialDetectorService.name);

  // Comprehensive credential patterns for all major connectors
  private readonly CREDENTIAL_PATTERNS = {
    // OpenAI
    openai: {
      name: 'OpenAI',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:openai|gpt)[\s\w]*(?:api[\s-]*key|key|token)[\s:=]+['"]?(sk-[a-zA-Z0-9]{32,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // Slack
    slack: {
      name: 'Slack',
      patterns: [
        {
          field: 'botToken',
          regex: /(?:slack)[\s\w]*(?:bot[\s-]*token|token)[\s:=]+['"]?(xoxb-[a-zA-Z0-9-]+)['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
        {
          field: 'appToken',
          regex: /(?:slack)[\s\w]*(?:app[\s-]*token)[\s:=]+['"]?(xapp-[a-zA-Z0-9-]+)['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // Gmail / Google
    gmail: {
      name: 'Gmail',
      patterns: [
        {
          field: 'clientId',
          regex: /(?:gmail|google)[\s\w]*(?:client[\s-]*id)[\s:=]+['"]?([a-zA-Z0-9.-]+\.apps\.googleusercontent\.com)['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-20)}`,
        },
        {
          field: 'clientSecret',
          regex: /(?:gmail|google)[\s\w]*(?:client[\s-]*secret)[\s:=]+['"]?([a-zA-Z0-9_-]{20,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 6)}...${val.slice(-4)}`,
        },
      ],
    },

    // GitHub
    github: {
      name: 'GitHub',
      patterns: [
        {
          field: 'accessToken',
          regex: /(?:github)[\s\w]*(?:token|access[\s-]*token|pat)[\s:=]+['"]?(ghp_[a-zA-Z0-9]{36,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // Stripe
    stripe: {
      name: 'Stripe',
      patterns: [
        {
          field: 'secretKey',
          regex: /(?:stripe)[\s\w]*(?:secret[\s-]*key|key)[\s:=]+['"]?(sk_(?:test|live)_[a-zA-Z0-9]{24,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 12)}...${val.slice(-4)}`,
        },
        {
          field: 'publishableKey',
          regex: /(?:stripe)[\s\w]*(?:publishable[\s-]*key|public[\s-]*key)[\s:=]+['"]?(pk_(?:test|live)_[a-zA-Z0-9]{24,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 12)}...${val.slice(-4)}`,
        },
      ],
    },

    // Twilio
    twilio: {
      name: 'Twilio',
      patterns: [
        {
          field: 'accountSid',
          regex: /(?:twilio)[\s\w]*(?:account[\s-]*sid|sid)[\s:=]+['"]?(AC[a-z0-9]{32})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
        {
          field: 'authToken',
          regex: /(?:twilio)[\s\w]*(?:auth[\s-]*token|token)[\s:=]+['"]?([a-z0-9]{32})['"]?/i,
          mask: (val: string) => `${val.slice(0, 6)}...${val.slice(-4)}`,
        },
      ],
    },

    // SendGrid
    sendgrid: {
      name: 'SendGrid',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:sendgrid)[\s\w]*(?:api[\s-]*key|key)[\s:=]+['"]?(SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{43,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // MongoDB
    mongodb: {
      name: 'MongoDB',
      patterns: [
        {
          field: 'connectionString',
          regex: /(?:mongodb|mongo)[\s\w]*(?:connection[\s-]*string|uri|url)[\s:=]+['"]?(mongodb(?:\+srv)?:\/\/[^\s'"]+)['"]?/i,
          mask: (val: string) => {
            // Hide password in connection string
            return val.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
          },
        },
      ],
    },

    // PostgreSQL
    postgres: {
      name: 'PostgreSQL',
      patterns: [
        {
          field: 'connectionString',
          regex: /(?:postgres|postgresql)[\s\w]*(?:connection[\s-]*string|uri|url)[\s:=]+['"]?(postgres(?:ql)?:\/\/[^\s'"]+)['"]?/i,
          mask: (val: string) => val.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
        },
      ],
    },

    // AWS
    aws: {
      name: 'AWS',
      patterns: [
        {
          field: 'accessKeyId',
          regex: /(?:aws)[\s\w]*(?:access[\s-]*key[\s-]*id|access[\s-]*key)[\s:=]+['"]?(AKIA[A-Z0-9]{16})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
        {
          field: 'secretAccessKey',
          regex: /(?:aws)[\s\w]*(?:secret[\s-]*access[\s-]*key|secret[\s-]*key)[\s:=]+['"]?([a-zA-Z0-9/+=]{40})['"]?/i,
          mask: (val: string) => `${val.slice(0, 6)}...${val.slice(-4)}`,
        },
      ],
    },

    // Airtable
    airtable: {
      name: 'Airtable',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:airtable)[\s\w]*(?:api[\s-]*key|key)[\s:=]+['"]?(key[a-zA-Z0-9]{14})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
      ],
    },

    // Notion
    notion: {
      name: 'Notion',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:notion)[\s\w]*(?:api[\s-]*key|key|token)[\s:=]+['"]?(secret_[a-zA-Z0-9]{43})['"]?/i,
          mask: (val: string) => `${val.slice(0, 12)}...${val.slice(-4)}`,
        },
      ],
    },

    // Mailchimp
    mailchimp: {
      name: 'Mailchimp',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:mailchimp)[\s\w]*(?:api[\s-]*key|key)[\s:=]+['"]?([a-z0-9]{32}-us[0-9]{1,2})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-6)}`,
        },
      ],
    },

    // Shopify
    shopify: {
      name: 'Shopify',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:shopify)[\s\w]*(?:api[\s-]*key|key)[\s:=]+['"]?([a-z0-9]{32})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
        {
          field: 'password',
          regex: /(?:shopify)[\s\w]*(?:password|access[\s-]*token)[\s:=]+['"]?(shpat_[a-z0-9]{32})['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // HubSpot
    hubspot: {
      name: 'HubSpot',
      patterns: [
        {
          field: 'apiKey',
          regex: /(?:hubspot)[\s\w]*(?:api[\s-]*key|key)[\s:=]+['"]?([a-z0-9-]{36})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
      ],
    },

    // Discord
    discord: {
      name: 'Discord',
      patterns: [
        {
          field: 'botToken',
          regex: /(?:discord)[\s\w]*(?:bot[\s-]*token|token)[\s:=]+['"]?([A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27})['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-4)}`,
        },
      ],
    },

    // Salesforce
    salesforce: {
      name: 'Salesforce',
      patterns: [
        {
          field: 'accessToken',
          regex: /(?:salesforce)[\s\w]*(?:access[\s-]*token|token)[\s:=]+['"]?([a-zA-Z0-9!]{15,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 8)}...${val.slice(-4)}`,
        },
      ],
    },

    // Google Sheets (OAuth)
    googlesheets: {
      name: 'Google Sheets',
      patterns: [
        {
          field: 'clientId',
          regex: /(?:google[\s-]*sheets|sheets)[\s\w]*(?:client[\s-]*id)[\s:=]+['"]?([a-zA-Z0-9.-]+\.apps\.googleusercontent\.com)['"]?/i,
          mask: (val: string) => `${val.slice(0, 10)}...${val.slice(-20)}`,
        },
        {
          field: 'clientSecret',
          regex: /(?:google[\s-]*sheets|sheets)[\s\w]*(?:client[\s-]*secret)[\s:=]+['"]?([a-zA-Z0-9_-]{20,})['"]?/i,
          mask: (val: string) => `${val.slice(0, 6)}...${val.slice(-4)}`,
        },
      ],
    },
  };

  /**
   * Detect credentials in a message
   */
  detectCredentials(message: string): CredentialDetectionResult {
    const detected: DetectedCredential[] = [];

    // Check each connector's patterns
    for (const [connectorKey, connectorConfig] of Object.entries(this.CREDENTIAL_PATTERNS)) {
      for (const pattern of connectorConfig.patterns) {
        const matches = message.match(pattern.regex);
        if (matches && matches[1]) {
          detected.push({
            connector: connectorKey,
            connectorName: connectorConfig.name,
            field: pattern.field,
            value: matches[1],
            masked: pattern.mask(matches[1]),
          });

          this.logger.log(`Detected ${connectorConfig.name} credential: ${pattern.field}`);
        }
      }
    }

    return {
      hasCredentials: detected.length > 0,
      credentials: detected,
    };
  }

  /**
   * Sanitize message by replacing credentials with masked versions
   */
  sanitizeMessage(message: string, credentials: DetectedCredential[]): string {
    let sanitized = message;

    for (const cred of credentials) {
      sanitized = sanitized.replace(cred.value, cred.masked);
    }

    return sanitized;
  }

  /**
   * Group credentials by connector
   */
  groupByConnector(credentials: DetectedCredential[]): Map<string, DetectedCredential[]> {
    const grouped = new Map<string, DetectedCredential[]>();

    for (const cred of credentials) {
      if (!grouped.has(cred.connector)) {
        grouped.set(cred.connector, []);
      }
      grouped.get(cred.connector)!.push(cred);
    }

    return grouped;
  }
}
