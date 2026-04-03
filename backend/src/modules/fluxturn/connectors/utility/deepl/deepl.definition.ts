// DeepL Connector Definition
// Converted from n8n DeepL node

import { ConnectorDefinition } from '../../shared';

export const DEEPL_CONNECTOR: ConnectorDefinition = {
  name: 'deepl',
  display_name: 'DeepL',
  category: 'utility',
  description: 'Translate text using DeepL translation API with support for 30+ languages',
  auth_type: 'api_key',
  complexity: 'Simple',
  verified: true,

  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your DeepL API key',
      description: 'Get your API key from DeepL account settings',
      helpUrl: 'https://www.deepl.com/pro-api',
      helpText: 'How to get API key'
    },
    {
      key: 'apiPlan',
      label: 'API Plan',
      type: 'select',
      required: true,
      options: [
        { label: 'Pro Plan', value: 'pro' },
        { label: 'Free Plan', value: 'free' }
      ],
      default: 'pro',
      description: 'Select your DeepL API plan (Free or Pro)'
    }
  ],

  endpoints: {
    base_url_pro: 'https://api.deepl.com/v2',
    base_url_free: 'https://api-free.deepl.com/v2',
    translate: '/translate',
    usage: '/usage',
    languages: '/languages'
  },

  webhook_support: false,
  rate_limits: {
    requests_per_second: 10
  },
  sandbox_available: false,

  supported_actions: [
    {
      id: 'translate',
      name: 'Translate Text',
      description: 'Translate text from one language to another using DeepL',
      category: 'Translation',
      icon: 'globe',
      verified: false,
      api: {
        endpoint: '/translate',
        method: 'GET',
        baseUrl: 'dynamic', // Will be determined by API plan
        headers: {},
        paramMapping: {
          text: 'text',
          translateTo: 'target_lang',
          sourceLang: 'source_lang'
        }
      },
      inputSchema: {
        text: {
          type: 'string',
          required: true,
          label: 'Text to Translate',
          placeholder: 'Hello world',
          description: 'The text you want to translate',
          inputType: 'textarea',
          aiControlled: true,
          aiDescription: 'The text content to be translated to the target language'
        },
        translateTo: {
          type: 'select',
          required: true,
          label: 'Target Language',
          description: 'Language to translate to',
          aiControlled: false,
          options: [
            { label: 'Arabic', value: 'AR' },
            { label: 'Bulgarian', value: 'BG' },
            { label: 'Chinese (simplified)', value: 'ZH' },
            { label: 'Czech', value: 'CS' },
            { label: 'Danish', value: 'DA' },
            { label: 'Dutch', value: 'NL' },
            { label: 'English', value: 'EN' },
            { label: 'English (American)', value: 'EN-US' },
            { label: 'English (British)', value: 'EN-GB' },
            { label: 'Estonian', value: 'ET' },
            { label: 'Finnish', value: 'FI' },
            { label: 'French', value: 'FR' },
            { label: 'German', value: 'DE' },
            { label: 'Greek', value: 'EL' },
            { label: 'Hungarian', value: 'HU' },
            { label: 'Indonesian', value: 'ID' },
            { label: 'Italian', value: 'IT' },
            { label: 'Japanese', value: 'JA' },
            { label: 'Korean', value: 'KO' },
            { label: 'Latvian', value: 'LV' },
            { label: 'Lithuanian', value: 'LT' },
            { label: 'Norwegian (Bokmål)', value: 'NB' },
            { label: 'Polish', value: 'PL' },
            { label: 'Portuguese', value: 'PT' },
            { label: 'Portuguese (Brazilian)', value: 'PT-BR' },
            { label: 'Portuguese (European)', value: 'PT-PT' },
            { label: 'Romanian', value: 'RO' },
            { label: 'Russian', value: 'RU' },
            { label: 'Slovak', value: 'SK' },
            { label: 'Slovenian', value: 'SL' },
            { label: 'Spanish', value: 'ES' },
            { label: 'Swedish', value: 'SV' },
            { label: 'Turkish', value: 'TR' },
            { label: 'Ukrainian', value: 'UK' }
          ]
        },
        sourceLang: {
          type: 'select',
          required: false,
          label: 'Source Language',
          description: 'Language of the input text (auto-detect if not specified)',
          aiControlled: false,
          options: [
            { label: 'Auto-detect', value: 'auto' },
            { label: 'Arabic', value: 'AR' },
            { label: 'Bulgarian', value: 'BG' },
            { label: 'Chinese (simplified)', value: 'ZH' },
            { label: 'Czech', value: 'CS' },
            { label: 'Danish', value: 'DA' },
            { label: 'Dutch', value: 'NL' },
            { label: 'English', value: 'EN' },
            { label: 'Estonian', value: 'ET' },
            { label: 'Finnish', value: 'FI' },
            { label: 'French', value: 'FR' },
            { label: 'German', value: 'DE' },
            { label: 'Greek', value: 'EL' },
            { label: 'Hungarian', value: 'HU' },
            { label: 'Indonesian', value: 'ID' },
            { label: 'Italian', value: 'IT' },
            { label: 'Japanese', value: 'JA' },
            { label: 'Korean', value: 'KO' },
            { label: 'Latvian', value: 'LV' },
            { label: 'Lithuanian', value: 'LT' },
            { label: 'Norwegian (Bokmål)', value: 'NB' },
            { label: 'Polish', value: 'PL' },
            { label: 'Portuguese', value: 'PT' },
            { label: 'Romanian', value: 'RO' },
            { label: 'Russian', value: 'RU' },
            { label: 'Slovak', value: 'SK' },
            { label: 'Slovenian', value: 'SL' },
            { label: 'Spanish', value: 'ES' },
            { label: 'Swedish', value: 'SV' },
            { label: 'Turkish', value: 'TR' },
            { label: 'Ukrainian', value: 'UK' }
          ],
          default: 'auto'
        },
        splitSentences: {
          type: 'select',
          required: false,
          label: 'Split Sentences',
          description: 'How the translation engine should split sentences',
          aiControlled: false,
          options: [
            { label: 'On Punctuation and Newlines', value: '1' },
            { label: 'Interpunction Only', value: 'nonewlines' },
            { label: 'No Splitting', value: '0' }
          ],
          default: '1'
        },
        preserveFormatting: {
          type: 'select',
          required: false,
          label: 'Preserve Formatting',
          description: 'Whether the translation engine should respect the original formatting',
          aiControlled: false,
          options: [
            { label: 'Apply Corrections', value: '0' },
            { label: 'Do Not Correct', value: '1' }
          ],
          default: '0'
        },
        formality: {
          type: 'select',
          required: false,
          label: 'Formality',
          description: 'How formal or informal the target text should be. May not be supported with all languages.',
          aiControlled: false,
          options: [
            { label: 'Neutral', value: 'default' },
            { label: 'Formal', value: 'more' },
            { label: 'Informal', value: 'less' }
          ],
          default: 'default'
        }
      },
      outputSchema: {
        detected_source_language: {
          type: 'string',
          description: 'The detected source language'
        },
        text: {
          type: 'string',
          description: 'The translated text'
        }
      }
    },
    {
      id: 'get_usage',
      name: 'Get Usage Statistics',
      description: 'Get current API usage and limits',
      category: 'Account',
      icon: 'bar-chart',
      verified: false,
      api: {
        endpoint: '/usage',
        method: 'GET',
        baseUrl: 'dynamic',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {},
      outputSchema: {
        character_count: {
          type: 'number',
          description: 'Characters translated in the current billing period'
        },
        character_limit: {
          type: 'number',
          description: 'Character limit for the current billing period'
        }
      }
    },
    {
      id: 'get_languages',
      name: 'Get Supported Languages',
      description: 'Get list of supported languages',
      category: 'Information',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/languages',
        method: 'GET',
        baseUrl: 'dynamic',
        headers: {},
        paramMapping: {
          type: 'type'
        }
      },
      inputSchema: {
        type: {
          type: 'select',
          required: false,
          label: 'Language Type',
          description: 'Type of languages to retrieve',
          aiControlled: false,
          options: [
            { label: 'Source Languages', value: 'source' },
            { label: 'Target Languages', value: 'target' }
          ],
          default: 'target'
        }
      },
      outputSchema: {
        languages: {
          type: 'array',
          description: 'List of supported languages'
        }
      }
    }
  ],

  supported_triggers: []
};
