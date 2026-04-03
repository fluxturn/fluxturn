// Anthropic Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const ANTHROPIC_CONNECTOR: ConnectorDefinition = {
    name: 'anthropic',
    display_name: 'Anthropic Claude',
    category: 'ai',
    description: 'Claude AI for advanced reasoning and analysis',
    auth_type: 'api_key',
    auth_fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
        description: 'Your Anthropic API key',
        helpUrl: 'https://console.anthropic.com/settings/keys',
        helpText: 'Get your API key from Anthropic Console'
      }
    ],
    verified: false,
    endpoints: {
      messages: '/v1/messages',
      completions: '/v1/complete'
    },
    rate_limits: { requests_per_minute: 50 },
    sandbox_available: false,
    supported_actions: [
      // Chat Operations
      {
        id: 'chat_complete',
        name: 'Message a Model',
        description: 'Create a chat completion using Claude models',
        category: 'Chat',
        icon: 'message-circle',
        verified: false,
        api: {
          endpoint: '/v1/messages',
          method: 'POST',
          baseUrl: 'https://api.anthropic.com',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': '{api_key}',
            'anthropic-version': '2023-06-01'
          },
          paramMapping: {
            model: 'model',
            messages: 'messages',
            system: 'system',
            maxTokens: 'max_tokens',
            temperature: 'temperature',
            topP: 'top_p',
            topK: 'top_k',
            stopSequences: 'stop_sequences'
          }
        },
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            order: 0,
            description: 'The Claude model to use for chat completion',
            default: 'claude-sonnet-4-20250514',
            dynamicOptions: true,
            options: [
              { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
              { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
              { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
              { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
              { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
              { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
              { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ],
            aiControlled: false
          },
          messages: {
            type: 'array',
            required: true,
            label: 'Messages',
            order: 1,
            description: 'Array of message objects for the conversation',
            aiControlled: true,
            aiDescription: 'The conversation messages to send to the AI model',
            itemSchema: {
              role: {
                type: 'select',
                required: true,
                label: 'Role',
                options: [
                  { label: 'User', value: 'user' },
                  { label: 'Assistant', value: 'assistant' }
                ],
                default: 'user',
                description: 'The role of the message sender',
                aiControlled: false
              },
              content: {
                type: 'string',
                required: true,
                label: 'Content',
                inputType: 'textarea',
                placeholder: 'Enter message content...',
                description: 'The content of the message',
                aiControlled: true,
                aiDescription: 'The message content to send to the AI model'
              }
            }
          },
          system: {
            type: 'string',
            label: 'System Message',
            order: 2,
            inputType: 'textarea',
            placeholder: 'e.g. You are a helpful assistant',
            description: 'Optional system prompt to guide the model behavior',
            aiControlled: true,
            aiDescription: 'System instructions that guide the AI model behavior'
          },
          simplify: {
            type: 'boolean',
            label: 'Simplify Output',
            default: true,
            description: 'Return simplified response instead of raw data',
            aiControlled: false
          },
          jsonOutput: {
            type: 'boolean',
            label: 'Output Content as JSON',
            default: false,
            description: 'Attempt to return the response in JSON format',
            aiControlled: false
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            description: 'Maximum number of tokens to generate',
            default: 1024,
            min: 1,
            max: 200000,
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            description: 'Controls randomness (0-1). Lower is more deterministic',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1,
            aiControlled: false
          },
          topP: {
            type: 'number',
            label: 'Top P',
            description: 'Nucleus sampling parameter (0-1)',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1,
            aiControlled: false
          },
          topK: {
            type: 'number',
            label: 'Top K',
            description: 'Top-k sampling parameter',
            min: 1,
            max: 500,
            aiControlled: false
          },
          stopSequences: {
            type: 'array',
            label: 'Stop Sequences',
            description: 'Sequences where the API will stop generating',
            itemSchema: {
              type: 'string',
              label: 'Stop Sequence',
              placeholder: 'Enter stop sequence'
            },
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Generated text response' },
          id: { type: 'string', description: 'Message ID' },
          model: { type: 'string', description: 'Model used' },
          stopReason: { type: 'string', description: 'Reason for stopping' },
          usage: {
            type: 'object',
            description: 'Token usage information',
            properties: {
              inputTokens: { type: 'number' },
              outputTokens: { type: 'number' }
            }
          }
        }
      },

      // Vision Operations
      {
        id: 'image_analyze',
        name: 'Analyze Image',
        description: 'Take in images and answer questions about them using Claude vision',
        category: 'Image',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/v1/messages',
          method: 'POST',
          baseUrl: 'https://api.anthropic.com',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': '{api_key}',
            'anthropic-version': '2023-06-01'
          }
        },
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'claude-sonnet-4-20250514',
            options: [
              { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
              { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
              { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
              { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
              { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
              { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
              { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ],
            description: 'The Claude model to use for vision analysis',
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'Describe this image',
            description: 'Question or instruction about the image',
            aiControlled: true,
            aiDescription: 'The question or instruction about the image to analyze'
          },
          imageUrl: {
            type: 'string',
            label: 'Image URL',
            placeholder: 'https://example.com/image.jpg',
            description: 'URL of the image to analyze',
            aiControlled: false
          },
          imageData: {
            type: 'string',
            label: 'Image Data (Base64)',
            inputType: 'textarea',
            description: 'Base64-encoded image data',
            aiControlled: false
          },
          mediaType: {
            type: 'select',
            label: 'Media Type',
            default: 'image/jpeg',
            options: [
              { label: 'JPEG', value: 'image/jpeg' },
              { label: 'PNG', value: 'image/png' },
              { label: 'GIF', value: 'image/gif' },
              { label: 'WebP', value: 'image/webp' }
            ],
            description: 'The media type of the image',
            aiControlled: false
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            description: 'Maximum number of tokens to generate',
            default: 1024,
            min: 1,
            max: 200000,
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            description: 'Controls randomness (0-1)',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1,
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' },
          id: { type: 'string', description: 'Message ID' },
          usage: {
            type: 'object',
            description: 'Token usage information',
            properties: {
              inputTokens: { type: 'number' },
              outputTokens: { type: 'number' }
            }
          }
        }
      },

      // Document Operations
      {
        id: 'document_analyze',
        name: 'Analyze Document',
        description: 'Take in documents (PDF) and answer questions about them',
        category: 'Document',
        icon: 'file-text',
        verified: false,
        api: {
          endpoint: '/v1/messages',
          method: 'POST',
          baseUrl: 'https://api.anthropic.com',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': '{api_key}',
            'anthropic-version': '2023-06-01'
          }
        },
        inputSchema: {
          model: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'claude-sonnet-4-20250514',
            options: [
              { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
              { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
              { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
              { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
              { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
              { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
              { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' }
            ],
            description: 'The Claude model to use for document analysis',
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'Summarize this document',
            description: 'Question or instruction about the document',
            aiControlled: true,
            aiDescription: 'The question or instruction about the document to analyze'
          },
          documentData: {
            type: 'string',
            label: 'Document Data (Base64)',
            inputType: 'textarea',
            description: 'Base64-encoded document data (PDF supported)',
            aiControlled: false
          },
          mediaType: {
            type: 'select',
            label: 'Media Type',
            default: 'application/pdf',
            options: [
              { label: 'PDF', value: 'application/pdf' }
            ],
            description: 'The media type of the document',
            aiControlled: false
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            description: 'Maximum number of tokens to generate',
            default: 1024,
            min: 1,
            max: 200000,
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            description: 'Controls randomness (0-1)',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1,
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' },
          id: { type: 'string', description: 'Message ID' },
          usage: {
            type: 'object',
            description: 'Token usage information',
            properties: {
              inputTokens: { type: 'number' },
              outputTokens: { type: 'number' }
            }
          }
        }
      }
    ]
  };
