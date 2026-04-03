// Openai Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const OPENAI_CONNECTOR: ConnectorDefinition = {
    name: 'openai',
    display_name: 'OpenAI',
    category: 'ai',
    description: 'OpenAI GPT models for text generation, embeddings, and more',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: 'Your OpenAI API key from the OpenAI dashboard',
        helpUrl: 'https://platform.openai.com/api-keys',
        helpText: 'Get your API key'
      },
      {
        key: 'organization',
        label: 'Organization ID',
        type: 'string',
        required: false,
        placeholder: 'org-...',
        description: 'Optional: Your OpenAI organization ID'
      },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'string',
        required: false,
        placeholder: 'https://api.openai.com/v1',
        description: 'Optional: Custom API base URL (for Azure OpenAI or other compatible APIs)'
      }
    ],
    verified: true,
    endpoints: {
      completions: '/v1/chat/completions',
      embeddings: '/v1/embeddings',
      models: '/v1/models',
      images: '/v1/images/generations',
      moderations: '/v1/moderations',
      text_completions: '/v1/completions',
      edits: '/v1/edits'
    },
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: false,
    supported_actions: [
      // Chat Operations
      {
        id: 'chat_complete',
        name: 'Chat Completion',
        description: 'Create a chat completion using GPT models (gpt-4, gpt-3.5-turbo, etc.)',
        category: 'Chat',
        icon: 'message-circle',
        verified: false,
        api: {
          endpoint: '/v1/chat/completions',
          method: 'POST',
          baseUrl: 'https://api.openai.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {api_key}'
          },
          paramMapping: {
            model: 'model',
            messages: 'messages',
            temperature: 'temperature',
            maxTokens: 'max_tokens',
            topP: 'top_p',
            frequencyPenalty: 'frequency_penalty',
            presencePenalty: 'presence_penalty',
            n: 'n',
            stream: 'stream',
            stop: 'stop',
            responseFormat: 'response_format'
          }
        },
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            description: 'The model to use for chat completion',
            default: 'gpt-3.5-turbo',
            options: [
              { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
              { label: 'GPT-4', value: 'gpt-4' },
              { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
              { label: 'GPT-3.5 Turbo 16K', value: 'gpt-3.5-turbo-16k' }
            ],
            aiControlled: false
          },
          messages: {
            type: 'array',
            required: true,
            label: 'Messages',
            description: 'Array of message objects for the conversation',
            itemSchema: {
              role: {
                type: 'select',
                required: true,
                label: 'Role',
                options: [
                  { label: 'System', value: 'system' },
                  { label: 'User', value: 'user' },
                  { label: 'Assistant', value: 'assistant' }
                ],
                default: 'user'
              },
              content: {
                type: 'string',
                required: true,
                label: 'Content',
                inputType: 'textarea',
                placeholder: 'Enter message content...'
              }
            },
            aiControlled: true,
            aiDescription: 'The conversation messages to send to the AI model'
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            description: 'Controls randomness (0-2). Lower is more deterministic',
            default: 1,
            min: 0,
            max: 2,
            step: 0.1,
            aiControlled: false
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            description: 'Maximum number of tokens to generate',
            default: 16,
            min: 1,
            max: 32768
          },
          topP: {
            type: 'number',
            label: 'Top P',
            description: 'Nucleus sampling parameter (0-1)',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1
          },
          frequencyPenalty: {
            type: 'number',
            label: 'Frequency Penalty',
            description: 'Penalize repeated tokens (-2 to 2)',
            default: 0,
            min: -2,
            max: 2,
            step: 0.1
          },
          presencePenalty: {
            type: 'number',
            label: 'Presence Penalty',
            description: 'Encourage new topics (-2 to 2)',
            default: 0,
            min: -2,
            max: 2,
            step: 0.1
          },
          n: {
            type: 'number',
            label: 'Number of Completions',
            description: 'How many completions to generate',
            default: 1,
            min: 1,
            max: 10
          }
        }
      },

      // Image Operations
      {
        id: 'image_create',
        name: 'Generate Image',
        description: 'Create an image using DALL-E models',
        category: 'Image',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/v1/images/generations',
          method: 'POST',
          baseUrl: 'https://api.openai.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {api_key}'
          },
          paramMapping: {
            prompt: 'prompt',
            model: 'model',
            n: 'n',
            size: 'size',
            quality: 'quality',
            style: 'style',
            responseFormat: 'response_format'
          }
        },
        inputSchema: {
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'e.g. A cute cat eating a dinosaur',
            description: 'A text description of the desired image(s). Maximum 1000 characters.',
            maxLength: 1000,
            aiControlled: true,
            aiDescription: 'Text description of the image to generate'
          },
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            description: 'The model to use for image generation',
            default: 'dall-e-2',
            options: [
              { label: 'DALL-E 3', value: 'dall-e-3' },
              { label: 'DALL-E 2', value: 'dall-e-2' }
            ],
            aiControlled: false
          },
          size: {
            type: 'select',
            label: 'Size',
            description: 'The size of the generated image',
            default: '1024x1024',
            options: [
              { label: '256x256', value: '256x256' },
              { label: '512x512', value: '512x512' },
              { label: '1024x1024', value: '1024x1024' },
              { label: '1792x1024 (DALL-E 3 only)', value: '1792x1024' },
              { label: '1024x1792 (DALL-E 3 only)', value: '1024x1792' }
            ]
          },
          quality: {
            type: 'select',
            label: 'Quality',
            description: 'Image quality (DALL-E 3 only)',
            default: 'standard',
            options: [
              { label: 'Standard', value: 'standard' },
              { label: 'HD', value: 'hd' }
            ],
            displayOptions: {
              show: {
                model: ['dall-e-3']
              }
            }
          },
          style: {
            type: 'select',
            label: 'Style',
            description: 'Image style (DALL-E 3 only)',
            default: 'vivid',
            options: [
              { label: 'Vivid', value: 'vivid' },
              { label: 'Natural', value: 'natural' }
            ],
            displayOptions: {
              show: {
                model: ['dall-e-3']
              }
            }
          },
          n: {
            type: 'number',
            label: 'Number of Images',
            description: 'Number of images to generate',
            default: 1,
            min: 1,
            max: 10
          },
          responseFormat: {
            type: 'select',
            label: 'Response Format',
            description: 'Format in which to return the image',
            default: 'url',
            options: [
              { label: 'Image URL', value: 'url' },
              { label: 'Base64 JSON', value: 'b64_json' }
            ]
          }
        }
      },

      // Text Completion (Legacy)
      {
        id: 'text_complete',
        name: 'Text Completion',
        description: 'Create a completion using legacy completion models',
        category: 'Text',
        icon: 'type',
        verified: false,
        api: {
          endpoint: '/v1/completions',
          method: 'POST',
          baseUrl: 'https://api.openai.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {api_key}'
          },
          paramMapping: {
            model: 'model',
            prompt: 'prompt',
            temperature: 'temperature',
            maxTokens: 'max_tokens',
            topP: 'top_p',
            frequencyPenalty: 'frequency_penalty',
            presencePenalty: 'presence_penalty',
            n: 'n',
            echo: 'echo'
          }
        },
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            description: 'The model to use for completion',
            default: 'gpt-3.5-turbo-instruct',
            options: [
              { label: 'GPT-3.5 Turbo Instruct', value: 'gpt-3.5-turbo-instruct' },
              { label: 'Text-Davinci-003', value: 'text-davinci-003' },
              { label: 'Text-Davinci-002', value: 'text-davinci-002' }
            ]
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'e.g. Say this is a test',
            description: 'The prompt to generate completion(s) for'
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            description: 'Controls randomness (0-1)',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            description: 'Maximum number of tokens to generate',
            default: 16,
            min: 1,
            max: 32768
          },
          topP: {
            type: 'number',
            label: 'Top P',
            description: 'Nucleus sampling parameter',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1
          },
          frequencyPenalty: {
            type: 'number',
            label: 'Frequency Penalty',
            description: 'Penalize repeated tokens',
            default: 0,
            min: -2,
            max: 2,
            step: 0.1
          },
          presencePenalty: {
            type: 'number',
            label: 'Presence Penalty',
            description: 'Encourage new topics',
            default: 0,
            min: -2,
            max: 2,
            step: 0.1
          },
          n: {
            type: 'number',
            label: 'Number of Completions',
            description: 'How many completions to generate',
            default: 1,
            min: 1,
            max: 10
          },
          echo: {
            type: 'boolean',
            label: 'Echo Prompt',
            description: 'Echo back the prompt in addition to completion',
            default: false
          }
        }
      },

      // Text Moderation
      {
        id: 'text_moderate',
        name: 'Moderate Text',
        description: "Classify if text violates OpenAI's content policy",
        category: 'Text',
        icon: 'shield',
        verified: false,
        api: {
          endpoint: '/v1/moderations',
          method: 'POST',
          baseUrl: 'https://api.openai.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {api_key}'
          },
          paramMapping: {
            input: 'input',
            model: 'model'
          }
        },
        inputSchema: {
          input: {
            type: 'string',
            required: true,
            label: 'Input Text',
            inputType: 'textarea',
            placeholder: 'e.g. Text to classify for content policy violations',
            description: 'The text to classify for moderation'
          },
          model: {
            type: 'select',
            label: 'Model',
            description: 'The moderation model to use',
            default: 'text-moderation-latest',
            options: [
              { label: 'Latest', value: 'text-moderation-latest' },
              { label: 'Stable', value: 'text-moderation-stable' }
            ]
          }
        }
      },

      // Embeddings
      {
        id: 'create_embeddings',
        name: 'Create Embeddings',
        description: 'Create embeddings vector from text input',
        category: 'Embeddings',
        icon: 'box',
        verified: false,
        api: {
          endpoint: '/v1/embeddings',
          method: 'POST',
          baseUrl: 'https://api.openai.com',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer {api_key}'
          },
          paramMapping: {
            input: 'input',
            model: 'model'
          }
        },
        inputSchema: {
          input: {
            type: 'string',
            required: true,
            label: 'Input Text',
            inputType: 'textarea',
            placeholder: 'Text to create embeddings for',
            description: 'The text to get embeddings for. Can be a string or array of strings.'
          },
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            description: 'The embedding model to use',
            default: 'text-embedding-ada-002',
            options: [
              { label: 'Text Embedding Ada 002', value: 'text-embedding-ada-002' },
              { label: 'Text Embedding 3 Small', value: 'text-embedding-3-small' },
              { label: 'Text Embedding 3 Large', value: 'text-embedding-3-large' }
            ]
          }
        }
      }
    ]
  };
