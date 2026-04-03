// OpenAI Chatbot Connector Definition
// Focused connector for conversational AI using OpenAI's chat completion models

import { ConnectorDefinition } from '../../shared';

export const OPENAI_CHATBOT_CONNECTOR: ConnectorDefinition = {
  name: 'openai_chatbot',
  display_name: 'OpenAI Chatbot',
  category: 'ai',
  description: 'OpenAI chatbot connector for conversational AI using GPT models',
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
    base_url: 'https://api.openai.com',
    chat_completions: '/v1/chat/completions',
    models: '/v1/models'
  },
  webhook_support: false,
  rate_limits: { requests_per_minute: 60 },
  sandbox_available: false,
  supported_actions: [
    // Send Message - Primary chatbot action
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Send a message to the OpenAI chatbot and receive a response',
      category: 'Chat',
      icon: 'message-circle',
      verified: true,
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
          presencePenalty: 'presence_penalty'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use for chat completion',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        userMessage: {
          type: 'string',
          required: true,
          label: 'User Message',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Enter your message to the chatbot...',
          description: 'The message to send to the chatbot',
          aiControlled: true,
          aiDescription: 'The user message or prompt to send to the AI chatbot for a response'
        },
        systemMessage: {
          type: 'string',
          label: 'System Message',
          order: 2,
          inputType: 'textarea',
          placeholder: 'You are a helpful assistant...',
          description: 'Optional system instruction that defines the chatbot behavior and personality',
          aiControlled: true,
          aiDescription: 'System instructions that define the AI chatbot behavior, personality, and context'
        },
        conversationHistory: {
          type: 'array',
          label: 'Conversation History',
          order: 3,
          description: 'Previous messages in the conversation for context',
          aiControlled: true,
          aiDescription: 'The conversation history providing context for the AI response',
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
              aiControlled: false
            },
            content: {
              type: 'string',
              required: true,
              label: 'Content',
              inputType: 'textarea',
              placeholder: 'Message content...',
              aiControlled: true,
              aiDescription: 'The content of this conversation message'
            }
          }
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 4,
          description: 'Controls randomness (0-2). Lower values make responses more focused and deterministic',
          default: 0.7,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 5,
          description: 'Maximum number of tokens to generate in the response',
          default: 1024,
          min: 1,
          max: 128000,
          aiControlled: false
        },
        topP: {
          type: 'number',
          label: 'Top P',
          order: 6,
          description: 'Nucleus sampling parameter (0-1). Alternative to temperature',
          default: 1,
          min: 0,
          max: 1,
          step: 0.1,
          aiControlled: false
        },
        frequencyPenalty: {
          type: 'number',
          label: 'Frequency Penalty',
          order: 7,
          description: 'Penalize repeated tokens (-2 to 2). Reduces repetition',
          default: 0,
          min: -2,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        presencePenalty: {
          type: 'number',
          label: 'Presence Penalty',
          order: 8,
          description: 'Encourage new topics (-2 to 2). Increases topic diversity',
          default: 0,
          min: -2,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        simplify: {
          type: 'boolean',
          label: 'Simplify Output',
          order: 9,
          default: true,
          description: 'Return simplified response instead of raw API data',
          aiControlled: false
        }
      },
      outputSchema: {
        message: { type: 'string', description: 'The chatbot response message' },
        role: { type: 'string', description: 'The role of the responder (assistant)' },
        finishReason: { type: 'string', description: 'Reason the response ended' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Chat Completion - Full control over messages array
    {
      id: 'chat_complete',
      name: 'Chat Completion',
      description: 'Create a chat completion with full control over the messages array',
      category: 'Chat',
      icon: 'message-square',
      verified: true,
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
          stop: 'stop',
          responseFormat: 'response_format'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use for chat completion',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
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
                { label: 'System', value: 'system' },
                { label: 'User', value: 'user' },
                { label: 'Assistant', value: 'assistant' }
              ],
              default: 'user',
              aiControlled: false
            },
            content: {
              type: 'string',
              required: true,
              label: 'Content',
              inputType: 'textarea',
              placeholder: 'Enter message content...',
              aiControlled: true,
              aiDescription: 'The content of this conversation message'
            }
          }
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 2,
          description: 'Controls randomness (0-2). Lower values make responses more focused',
          default: 1,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 3,
          description: 'Maximum number of tokens to generate',
          default: 1024,
          min: 1,
          max: 128000,
          aiControlled: false
        },
        topP: {
          type: 'number',
          label: 'Top P',
          order: 4,
          description: 'Nucleus sampling parameter (0-1)',
          default: 1,
          min: 0,
          max: 1,
          step: 0.1,
          aiControlled: false
        },
        frequencyPenalty: {
          type: 'number',
          label: 'Frequency Penalty',
          order: 5,
          description: 'Penalize repeated tokens (-2 to 2)',
          default: 0,
          min: -2,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        presencePenalty: {
          type: 'number',
          label: 'Presence Penalty',
          order: 6,
          description: 'Encourage new topics (-2 to 2)',
          default: 0,
          min: -2,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        n: {
          type: 'number',
          label: 'Number of Completions',
          order: 7,
          description: 'How many completions to generate',
          default: 1,
          min: 1,
          max: 10,
          aiControlled: false
        },
        stop: {
          type: 'array',
          label: 'Stop Sequences',
          order: 8,
          description: 'Up to 4 sequences where the API will stop generating',
          aiControlled: false,
          itemSchema: {
            type: 'string',
            label: 'Stop Sequence',
            placeholder: 'Enter stop sequence...'
          }
        },
        responseFormat: {
          type: 'select',
          label: 'Response Format',
          order: 9,
          description: 'Format of the response',
          default: 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'JSON Object', value: 'json_object' }
          ],
          aiControlled: false
        },
        simplify: {
          type: 'boolean',
          label: 'Simplify Output',
          order: 10,
          default: true,
          description: 'Return simplified response instead of raw API data',
          aiControlled: false
        }
      },
      outputSchema: {
        choices: {
          type: 'array',
          description: 'Array of completion choices',
          properties: {
            message: {
              type: 'object',
              properties: {
                role: { type: 'string' },
                content: { type: 'string' }
              }
            },
            finishReason: { type: 'string' }
          }
        },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Generate Response with Context
    {
      id: 'generate_response',
      name: 'Generate Response with Context',
      description: 'Generate a chatbot response using provided context and instructions',
      category: 'Chat',
      icon: 'cpu',
      verified: true,
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
          maxTokens: 'max_tokens'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-4', value: 'gpt-4' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        context: {
          type: 'string',
          required: true,
          label: 'Context',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Provide relevant context, data, or information...',
          description: 'Context information that the AI should use when generating its response',
          aiControlled: true,
          aiDescription: 'The context or background information for the AI to use in generating the response'
        },
        instruction: {
          type: 'string',
          required: true,
          label: 'Instruction',
          order: 2,
          inputType: 'textarea',
          placeholder: 'Based on the context above, please...',
          description: 'Specific instruction for what the AI should do with the context',
          aiControlled: true,
          aiDescription: 'The specific instruction telling the AI what to do with the provided context'
        },
        systemPrompt: {
          type: 'string',
          label: 'System Prompt',
          order: 3,
          inputType: 'textarea',
          placeholder: 'You are an expert assistant...',
          description: 'System-level instructions for the AI behavior',
          aiControlled: true,
          aiDescription: 'System-level instructions defining the AI assistant behavior and expertise'
        },
        outputFormat: {
          type: 'string',
          label: 'Output Format Instructions',
          order: 4,
          inputType: 'textarea',
          placeholder: 'Respond in JSON format with keys: summary, key_points, action_items',
          description: 'Instructions for how the response should be formatted',
          aiControlled: true,
          aiDescription: 'Instructions specifying how the AI should format its response'
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 5,
          description: 'Controls randomness (0-2)',
          default: 0.7,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 6,
          description: 'Maximum number of tokens to generate',
          default: 2048,
          min: 1,
          max: 128000,
          aiControlled: false
        },
        simplify: {
          type: 'boolean',
          label: 'Simplify Output',
          order: 7,
          default: true,
          description: 'Return simplified response instead of raw API data',
          aiControlled: false
        }
      },
      outputSchema: {
        response: { type: 'string', description: 'The generated response' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Summarize Text
    {
      id: 'summarize_text',
      name: 'Summarize Text',
      description: 'Generate a summary of provided text using the chatbot',
      category: 'Text Processing',
      icon: 'file-text',
      verified: true,
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
          maxTokens: 'max_tokens'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Text to Summarize',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Paste the text you want to summarize...',
          description: 'The text content to be summarized',
          aiControlled: true,
          aiDescription: 'The text content that should be summarized by the AI'
        },
        summaryType: {
          type: 'select',
          label: 'Summary Type',
          order: 2,
          description: 'The type of summary to generate',
          default: 'concise',
          options: [
            { label: 'Concise (1-2 sentences)', value: 'concise' },
            { label: 'Brief (1 paragraph)', value: 'brief' },
            { label: 'Detailed (multiple paragraphs)', value: 'detailed' },
            { label: 'Bullet Points', value: 'bullets' },
            { label: 'Executive Summary', value: 'executive' }
          ],
          aiControlled: false
        },
        additionalInstructions: {
          type: 'string',
          label: 'Additional Instructions',
          order: 3,
          inputType: 'textarea',
          placeholder: 'Focus on the financial aspects...',
          description: 'Optional additional instructions for the summary',
          aiControlled: true,
          aiDescription: 'Additional instructions or focus areas for generating the summary'
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 4,
          description: 'Controls randomness (0-2)',
          default: 0.5,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 5,
          description: 'Maximum length of the summary',
          default: 512,
          min: 1,
          max: 4096,
          aiControlled: false
        }
      },
      outputSchema: {
        summary: { type: 'string', description: 'The generated summary' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Translate Text
    {
      id: 'translate_text',
      name: 'Translate Text',
      description: 'Translate text between languages using the chatbot',
      category: 'Text Processing',
      icon: 'globe',
      verified: true,
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
          maxTokens: 'max_tokens'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Text to Translate',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Enter the text you want to translate...',
          description: 'The text to be translated',
          aiControlled: true,
          aiDescription: 'The text content that should be translated to the target language'
        },
        sourceLanguage: {
          type: 'string',
          label: 'Source Language',
          order: 2,
          placeholder: 'Auto-detect or specify (e.g., English)',
          description: 'The language of the source text (leave empty for auto-detection)',
          aiControlled: false
        },
        targetLanguage: {
          type: 'string',
          required: true,
          label: 'Target Language',
          order: 3,
          placeholder: 'e.g., Spanish, French, Japanese',
          description: 'The language to translate to',
          aiControlled: false
        },
        preserveTone: {
          type: 'boolean',
          label: 'Preserve Tone',
          order: 4,
          default: true,
          description: 'Attempt to preserve the original tone and style',
          aiControlled: false
        },
        additionalContext: {
          type: 'string',
          label: 'Additional Context',
          order: 5,
          inputType: 'textarea',
          placeholder: 'This is a formal business email...',
          description: 'Optional context to improve translation accuracy',
          aiControlled: true,
          aiDescription: 'Additional context to help improve the translation accuracy and appropriateness'
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 6,
          description: 'Controls creativity in translation (0-2)',
          default: 0.3,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 7,
          description: 'Maximum length of the translation',
          default: 2048,
          min: 1,
          max: 8192,
          aiControlled: false
        }
      },
      outputSchema: {
        translation: { type: 'string', description: 'The translated text' },
        detectedLanguage: { type: 'string', description: 'The detected source language (if auto-detected)' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Extract Information
    {
      id: 'extract_information',
      name: 'Extract Information',
      description: 'Extract structured information from unstructured text',
      category: 'Text Processing',
      icon: 'search',
      verified: true,
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
          responseFormat: 'response_format'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Source Text',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Paste the text to extract information from...',
          description: 'The text to extract information from',
          aiControlled: true,
          aiDescription: 'The source text from which to extract structured information'
        },
        extractionSchema: {
          type: 'string',
          required: true,
          label: 'Extraction Schema',
          order: 2,
          inputType: 'textarea',
          placeholder: '{\n  "name": "string",\n  "email": "string",\n  "phone": "string"\n}',
          description: 'JSON schema describing what fields to extract',
          aiControlled: true,
          aiDescription: 'The JSON schema defining what information should be extracted from the text'
        },
        extractionInstructions: {
          type: 'string',
          label: 'Extraction Instructions',
          order: 3,
          inputType: 'textarea',
          placeholder: 'Extract all contact information including...',
          description: 'Additional instructions for extraction',
          aiControlled: true,
          aiDescription: 'Additional instructions to guide the extraction process'
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 4,
          description: 'Controls extraction precision (lower is more precise)',
          default: 0.1,
          min: 0,
          max: 1,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 5,
          description: 'Maximum tokens for the response',
          default: 1024,
          min: 1,
          max: 4096,
          aiControlled: false
        }
      },
      outputSchema: {
        extracted: { type: 'object', description: 'The extracted structured data' },
        raw: { type: 'string', description: 'Raw extraction result' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Answer Question
    {
      id: 'answer_question',
      name: 'Answer Question',
      description: 'Answer a question based on provided context or knowledge',
      category: 'Q&A',
      icon: 'help-circle',
      verified: true,
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
          maxTokens: 'max_tokens'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        question: {
          type: 'string',
          required: true,
          label: 'Question',
          order: 1,
          inputType: 'textarea',
          placeholder: 'What would you like to know?',
          description: 'The question to be answered',
          aiControlled: true,
          aiDescription: 'The question that the AI should answer'
        },
        context: {
          type: 'string',
          label: 'Context',
          order: 2,
          inputType: 'textarea',
          placeholder: 'Provide relevant context or documents...',
          description: 'Optional context to base the answer on',
          aiControlled: true,
          aiDescription: 'Background context or reference material for answering the question'
        },
        answerStyle: {
          type: 'select',
          label: 'Answer Style',
          order: 3,
          description: 'How the answer should be formatted',
          default: 'detailed',
          options: [
            { label: 'Brief (1-2 sentences)', value: 'brief' },
            { label: 'Detailed', value: 'detailed' },
            { label: 'Step-by-Step', value: 'steps' },
            { label: 'With Examples', value: 'examples' },
            { label: 'Technical', value: 'technical' }
          ],
          aiControlled: false
        },
        includeConfidence: {
          type: 'boolean',
          label: 'Include Confidence Level',
          order: 4,
          default: false,
          description: 'Include a confidence indicator in the response',
          aiControlled: false
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 5,
          description: 'Controls answer creativity (0-2)',
          default: 0.5,
          min: 0,
          max: 2,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 6,
          description: 'Maximum length of the answer',
          default: 1024,
          min: 1,
          max: 4096,
          aiControlled: false
        }
      },
      outputSchema: {
        answer: { type: 'string', description: 'The generated answer' },
        confidence: { type: 'string', description: 'Confidence level (if requested)' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    },

    // Classify Text
    {
      id: 'classify_text',
      name: 'Classify Text',
      description: 'Classify text into predefined categories',
      category: 'Text Processing',
      icon: 'tag',
      verified: true,
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
          maxTokens: 'max_tokens'
        }
      },
      inputSchema: {
        model: {
          type: 'select',
          required: true,
          label: 'Model',
          order: 0,
          description: 'The GPT model to use',
          default: 'gpt-4o-mini',
          dynamicOptions: true,
          options: [
            { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
            { label: 'GPT-4o Mini (Fast & affordable)', value: 'gpt-4o-mini' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
          ],
          aiControlled: false
        },
        text: {
          type: 'string',
          required: true,
          label: 'Text to Classify',
          order: 1,
          inputType: 'textarea',
          placeholder: 'Enter text to classify...',
          description: 'The text to be classified',
          aiControlled: true,
          aiDescription: 'The text content to be classified into categories'
        },
        categories: {
          type: 'array',
          required: true,
          label: 'Categories',
          order: 2,
          description: 'List of possible categories for classification',
          aiControlled: false,
          itemSchema: {
            type: 'string',
            label: 'Category',
            placeholder: 'e.g., Positive, Negative, Neutral'
          }
        },
        categoryDescriptions: {
          type: 'string',
          label: 'Category Descriptions',
          order: 3,
          inputType: 'textarea',
          placeholder: 'Positive: Express satisfaction or happiness\nNegative: Express dissatisfaction or frustration',
          description: 'Optional descriptions for each category to improve accuracy',
          aiControlled: true,
          aiDescription: 'Descriptions of each category to help the AI classify more accurately'
        },
        allowMultiple: {
          type: 'boolean',
          label: 'Allow Multiple Categories',
          order: 4,
          default: false,
          description: 'Allow text to be classified into multiple categories',
          aiControlled: false
        },
        includeConfidence: {
          type: 'boolean',
          label: 'Include Confidence Scores',
          order: 5,
          default: true,
          description: 'Include confidence scores for each classification',
          aiControlled: false
        },
        temperature: {
          type: 'number',
          label: 'Temperature',
          order: 6,
          description: 'Controls classification precision (lower is more precise)',
          default: 0.1,
          min: 0,
          max: 1,
          step: 0.1,
          aiControlled: false
        },
        maxTokens: {
          type: 'number',
          label: 'Max Tokens',
          order: 7,
          description: 'Maximum tokens for the response',
          default: 256,
          min: 1,
          max: 1024,
          aiControlled: false
        }
      },
      outputSchema: {
        category: { type: 'string', description: 'The primary classification category' },
        categories: { type: 'array', description: 'All matched categories (if multiple allowed)' },
        confidence: { type: 'number', description: 'Confidence score (0-1)' },
        reasoning: { type: 'string', description: 'Explanation for the classification' },
        usage: {
          type: 'object',
          description: 'Token usage information',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' }
          }
        }
      }
    }
  ],
  supported_triggers: []
};
