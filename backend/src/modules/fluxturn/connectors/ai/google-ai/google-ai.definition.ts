// Google AI Connector Definition
// Full definition with actions and aiControlled fields

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_AI_CONNECTOR: ConnectorDefinition = {
  name: 'google_ai',
  display_name: 'Google AI',
  category: 'ai',
  description: 'Google AI connector for generative AI capabilities using Gemini models',
  auth_type: 'api_key',
  auth_fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'AIza...',
      description: 'Your Google AI API key',
      helpUrl: 'https://ai.google.dev/tutorials/setup',
      helpText: 'Get your API key from Google AI Studio'
    }
  ],
  endpoints: {
    base_url: 'https://generativelanguage.googleapis.com',
    generateContent: '/v1beta/models/{model}:generateContent',
    embedContent: '/v1beta/models/{model}:embedContent',
    models: '/v1beta/models'
  },
  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },
  sandbox_available: false,
  verified: false,
  supported_actions: [
    // Chat/Text Generation
    {
      id: 'generate_content',
      name: 'Generate Content',
      description: 'Generate text content using Google AI Gemini models',
      category: 'Text',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/v1beta/models/{model}:generateContent',
        method: 'POST',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          model: 'model',
          contents: 'contents',
          maxOutputTokens: 'generationConfig.maxOutputTokens',
          temperature: 'generationConfig.temperature',
          topP: 'generationConfig.topP',
          topK: 'generationConfig.topK'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          description: 'The Google AI model to use for generation',
          default: 'gemini-1.5-flash',
          options: [
            { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            { label: 'Gemini 1.0 Pro', value: 'gemini-1.0-pro' }
          ],
          aiControlled: false
        },
        messages: {
          type: 'array',
          required: true,
          label: 'Messages',
          description: 'Array of message objects for the conversation',
          aiControlled: true,
          aiDescription: 'The conversation messages to send to the Google AI model',
          itemSchema: {
            role: {
              type: 'select',
              required: true,
              label: 'Role',
              options: [
                { label: 'User', value: 'user' },
                { label: 'Model', value: 'model' }
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
        systemInstruction: {
          type: 'string',
          label: 'System Instruction',
          inputType: 'textarea',
          placeholder: 'You are a helpful assistant...',
          description: 'Optional system instruction to guide the model behavior',
          aiControlled: true,
          aiDescription: 'System instructions that define the AI model behavior and context'
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
        maxOutputTokens: {
          type: 'number',
          label: 'Max Output Tokens',
          description: 'Maximum number of tokens to generate',
          default: 2048,
          min: 1,
          max: 8192,
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
          default: 40,
          min: 1,
          max: 100,
          aiControlled: false
        },
        stopSequences: {
          type: 'array',
          label: 'Stop Sequences',
          description: 'Sequences that will stop generation when encountered',
          aiControlled: false,
          itemSchema: {
            type: 'string'
          }
        }
      },
      outputSchema: {
        text: { type: 'string', description: 'Generated text response' },
        candidates: { type: 'array', description: 'All response candidates' },
        usageMetadata: { type: 'object', description: 'Token usage information' }
      }
    },

    // Chat Completion (simplified interface)
    {
      id: 'chat_complete',
      name: 'Chat Completion',
      description: 'Send a single prompt and get a response from Google AI',
      category: 'Chat',
      icon: 'message-circle',
      verified: false,
      api: {
        endpoint: '/v1beta/models/{model}:generateContent',
        method: 'POST',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          model: 'model',
          prompt: 'contents[0].parts[0].text',
          maxOutputTokens: 'generationConfig.maxOutputTokens',
          temperature: 'generationConfig.temperature'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          description: 'The Google AI model to use',
          default: 'gemini-1.5-flash',
          options: [
            { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            { label: 'Gemini 1.0 Pro', value: 'gemini-1.0-pro' }
          ],
          aiControlled: false
        },
        prompt: {
          type: 'string',
          required: true,
          label: 'Prompt',
          inputType: 'textarea',
          placeholder: 'Enter your prompt here...',
          description: 'The prompt to send to the AI model',
          aiControlled: true,
          aiDescription: 'The user prompt or question to send to the Google AI model'
        },
        systemInstruction: {
          type: 'string',
          label: 'System Instruction',
          inputType: 'textarea',
          placeholder: 'You are a helpful assistant...',
          description: 'Optional system instruction to guide the model behavior',
          aiControlled: true,
          aiDescription: 'System instructions that define the AI model behavior and context'
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
        maxOutputTokens: {
          type: 'number',
          label: 'Max Output Tokens',
          description: 'Maximum number of tokens to generate',
          default: 2048,
          min: 1,
          max: 8192,
          aiControlled: false
        }
      },
      outputSchema: {
        text: { type: 'string', description: 'Generated text response' },
        usageMetadata: { type: 'object', description: 'Token usage information' }
      }
    },

    // Image Analysis
    {
      id: 'analyze_image',
      name: 'Analyze Image',
      description: 'Analyze an image and answer questions about it using Google AI vision capabilities',
      category: 'Vision',
      icon: 'image',
      verified: false,
      api: {
        endpoint: '/v1beta/models/{model}:generateContent',
        method: 'POST',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          description: 'The Google AI model to use for vision tasks',
          default: 'gemini-1.5-flash',
          options: [
            { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
          ],
          aiControlled: false
        },
        prompt: {
          type: 'string',
          required: true,
          label: 'Prompt',
          inputType: 'textarea',
          placeholder: 'Describe what you see in this image...',
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
        imageBase64: {
          type: 'string',
          label: 'Image Data (Base64)',
          inputType: 'textarea',
          description: 'Base64-encoded image data (use this OR Image URL)',
          aiControlled: false
        },
        mimeType: {
          type: 'select',
          label: 'Image MIME Type',
          description: 'MIME type of the image (required for base64)',
          default: 'image/jpeg',
          options: [
            { label: 'JPEG', value: 'image/jpeg' },
            { label: 'PNG', value: 'image/png' },
            { label: 'GIF', value: 'image/gif' },
            { label: 'WebP', value: 'image/webp' }
          ],
          aiControlled: false
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          description: 'Controls randomness (0-2)',
          default: 0.4,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxOutputTokens: {
          type: 'number',
          label: 'Max Output Tokens',
          description: 'Maximum number of tokens to generate',
          default: 2048,
          min: 1,
          max: 8192,
          aiControlled: false
        }
      },
      outputSchema: {
        text: { type: 'string', description: 'Analysis result' },
        usageMetadata: { type: 'object', description: 'Token usage information' }
      }
    },

    // Text Embeddings
    {
      id: 'create_embedding',
      name: 'Create Embedding',
      description: 'Generate text embeddings using Google AI embedding models',
      category: 'Embeddings',
      icon: 'box',
      verified: false,
      api: {
        endpoint: '/v1beta/models/{model}:embedContent',
        method: 'POST',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          model: 'model',
          text: 'content.parts[0].text'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          description: 'The embedding model to use',
          default: 'text-embedding-004',
          options: [
            { label: 'Text Embedding 004', value: 'text-embedding-004' },
            { label: 'Embedding 001', value: 'embedding-001' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Text',
          inputType: 'textarea',
          placeholder: 'Enter text to create embeddings for...',
          description: 'The text to generate embeddings for',
          aiControlled: true,
          aiDescription: 'The text content to convert into embedding vectors'
        },
        taskType: {
          type: 'select',
          label: 'Task Type',
          description: 'The type of task for optimized embeddings',
          default: 'RETRIEVAL_DOCUMENT',
          options: [
            { label: 'Retrieval Query', value: 'RETRIEVAL_QUERY' },
            { label: 'Retrieval Document', value: 'RETRIEVAL_DOCUMENT' },
            { label: 'Semantic Similarity', value: 'SEMANTIC_SIMILARITY' },
            { label: 'Classification', value: 'CLASSIFICATION' },
            { label: 'Clustering', value: 'CLUSTERING' }
          ],
          aiControlled: false
        },
        title: {
          type: 'string',
          label: 'Title',
          placeholder: 'Optional title for the content',
          description: 'Optional title for the content (improves quality for documents)',
          aiControlled: true,
          aiDescription: 'An optional title describing the content being embedded'
        }
      },
      outputSchema: {
        embedding: { type: 'array', description: 'The embedding vector' },
        values: { type: 'array', description: 'Embedding values array' }
      }
    },

    // Count Tokens
    {
      id: 'count_tokens',
      name: 'Count Tokens',
      description: 'Count the number of tokens in text using Google AI tokenizer',
      category: 'Utility',
      icon: 'hash',
      verified: false,
      api: {
        endpoint: '/v1beta/models/{model}:countTokens',
        method: 'POST',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        },
        paramMapping: {
          model: 'model',
          text: 'contents[0].parts[0].text'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          description: 'The model to use for token counting',
          default: 'gemini-1.5-flash',
          options: [
            { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            { label: 'Gemini 1.0 Pro', value: 'gemini-1.0-pro' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Text',
          inputType: 'textarea',
          placeholder: 'Enter text to count tokens...',
          description: 'The text to count tokens for',
          aiControlled: true,
          aiDescription: 'The text content to count tokens for'
        }
      },
      outputSchema: {
        totalTokens: { type: 'number', description: 'Total number of tokens' }
      }
    },

    // List Models
    {
      id: 'list_models',
      name: 'List Models',
      description: 'List available Google AI models',
      category: 'Utility',
      icon: 'list',
      verified: false,
      api: {
        endpoint: '/v1beta/models',
        method: 'GET',
        baseUrl: 'https://generativelanguage.googleapis.com',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      inputSchema: {
        pageSize: {
          type: 'number',
          label: 'Page Size',
          description: 'Maximum number of models to return',
          default: 50,
          min: 1,
          max: 100,
          aiControlled: false
        },
        pageToken: {
          type: 'string',
          label: 'Page Token',
          description: 'Token for pagination',
          aiControlled: false
        }
      },
      outputSchema: {
        models: { type: 'array', description: 'List of available models' },
        nextPageToken: { type: 'string', description: 'Token for next page' }
      }
    }
  ],
  supported_triggers: []
};
