// Google Gemini Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const GOOGLE_GEMINI_CONNECTOR: ConnectorDefinition = {
    name: 'google_gemini',
    display_name: 'Google Gemini',
    category: 'ai',
    description: 'Google Gemini AI models for text, image, audio, video generation and analysis',
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
      uploadFile: '/upload/v1beta/files',
      models: '/v1beta/models'
    },
    webhook_support: false,
    rate_limits: { requests_per_minute: 60 },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      // Text Operations
      {
        id: 'text_message',
        name: 'Message a Model',
        description: 'Create a chat completion with Google Gemini model',
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
            messages: 'contents',
            model: 'model',
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
            order: 0,
            default: 'gemini-1.5-flash',
            dynamicOptions: true, // Models are fetched from GET /connectors/:id/models
            options: [
              // Fallback options if dynamic fetch fails
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash (Faster, cost-effective)', value: 'gemini-1.5-flash' },
              { label: 'Gemini Pro (Legacy model)', value: 'gemini-pro' }
            ],
            description: 'The Gemini model to use for generation. Available models are fetched from your credential.',
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
                  { label: 'Model', value: 'model' }
                ],
                default: 'user',
                description: 'The role of the message sender',
                aiControlled: false
              },
              content: {
                type: 'string',
                required: true,
                label: 'Prompt',
                inputType: 'textarea',
                placeholder: 'e.g. Hello, how can you help me?',
                description: 'The content of the message',
                aiControlled: true,
                aiDescription: 'The message content to send to the AI model'
              }
            }
          },
          systemMessage: {
            type: 'string',
            label: 'System Message',
            inputType: 'textarea',
            placeholder: 'e.g. You are a helpful assistant',
            description: 'Optional system instruction for the model',
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
          maxOutputTokens: {
            type: 'number',
            label: 'Maximum Output Tokens',
            default: 2048,
            min: 1,
            max: 8192,
            description: 'Maximum number of tokens to generate',
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            default: 0.9,
            min: 0,
            max: 2,
            step: 0.1,
            description: 'Controls randomness (0-2). Lower is more deterministic',
            aiControlled: false
          },
          topP: {
            type: 'number',
            label: 'Top P',
            default: 1,
            min: 0,
            max: 1,
            step: 0.1,
            description: 'Nucleus sampling parameter',
            aiControlled: false
          },
          topK: {
            type: 'number',
            label: 'Top K',
            default: 40,
            min: 1,
            max: 100,
            description: 'Top-k sampling parameter',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Generated text response' },
          candidates: { type: 'array', description: 'All response candidates' },
          usageMetadata: { type: 'object', description: 'Token usage information' }
        }
      },

      // Image Operations
      {
        id: 'image_analyze',
        name: 'Analyze Image',
        description: 'Take in images and answer questions about them',
        category: 'Image',
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
            default: 'gemini-pro-vision',
            options: [
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
              { label: 'Gemini Pro (Legacy model)', value: 'gemini-pro' }
            ],
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
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' }
        }
      },
      {
        id: 'image_generate',
        name: 'Generate Image',
        description: 'Creates an image from a text prompt using Imagen',
        category: 'Image',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/v1beta/models/imagegeneration:predict',
          method: 'POST',
          baseUrl: 'https://generativelanguage.googleapis.com',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'A serene lake at sunset',
            description: 'Describe the image you want to generate',
            aiControlled: true,
            aiDescription: 'A detailed description of the image to generate'
          },
          numberOfImages: {
            type: 'number',
            label: 'Number of Images',
            default: 1,
            min: 1,
            max: 4,
            description: 'How many images to generate',
            aiControlled: false
          },
          aspectRatio: {
            type: 'select',
            label: 'Aspect Ratio',
            default: '1:1',
            options: [
              { label: 'Square (1:1)', value: '1:1' },
              { label: 'Landscape (16:9)', value: '16:9' },
              { label: 'Portrait (9:16)', value: '9:16' }
            ],
            aiControlled: false
          }
        },
        outputSchema: {
          images: { type: 'array', description: 'Generated images (base64)' }
        }
      },

      // Audio Operations
      {
        id: 'audio_transcribe',
        name: 'Transcribe Audio',
        description: 'Transcribe audio into text',
        category: 'Audio',
        icon: 'mic',
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
            default: 'gemini-1.5-pro',
            options: [
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ],
            aiControlled: false
          },
          audioUrl: {
            type: 'string',
            label: 'Audio URL',
            placeholder: 'https://example.com/audio.mp3',
            description: 'URL of the audio file to transcribe',
            aiControlled: false
          },
          audioData: {
            type: 'string',
            label: 'Audio Data (Base64)',
            inputType: 'textarea',
            description: 'Base64-encoded audio data',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Transcribed text' }
        }
      },
      {
        id: 'audio_analyze',
        name: 'Analyze Audio',
        description: 'Take in audio and answer questions about it',
        category: 'Audio',
        icon: 'mic',
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
            default: 'gemini-1.5-pro',
            options: [
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ],
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'Summarize the content of this audio',
            description: 'Question or instruction about the audio',
            aiControlled: true,
            aiDescription: 'The question or instruction about the audio to analyze'
          },
          audioUrl: {
            type: 'string',
            label: 'Audio URL',
            placeholder: 'https://example.com/audio.mp3',
            aiControlled: false
          },
          audioData: {
            type: 'string',
            label: 'Audio Data (Base64)',
            inputType: 'textarea',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' }
        }
      },

      // Video Operations
      {
        id: 'video_analyze',
        name: 'Analyze Video',
        description: 'Take in videos and answer questions about them',
        category: 'Video',
        icon: 'video',
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
            default: 'gemini-1.5-pro',
            options: [
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ],
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'Describe what happens in this video',
            description: 'Question or instruction about the video',
            aiControlled: true,
            aiDescription: 'The question or instruction about the video to analyze'
          },
          videoUrl: {
            type: 'string',
            label: 'Video URL',
            placeholder: 'https://example.com/video.mp4',
            aiControlled: false
          },
          videoData: {
            type: 'string',
            label: 'Video Data (Base64)',
            inputType: 'textarea',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' }
        }
      },

      // Document Operations
      {
        id: 'document_analyze',
        name: 'Analyze Document',
        description: 'Take in documents and answer questions about them',
        category: 'Document',
        icon: 'file-text',
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
            default: 'gemini-1.5-pro',
            options: [
              { label: 'Gemini 1.5 Pro (Best quality, slower)', value: 'gemini-1.5-pro' },
              { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' }
            ],
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
          documentUrl: {
            type: 'string',
            label: 'Document URL',
            placeholder: 'https://example.com/document.pdf',
            aiControlled: false
          },
          documentData: {
            type: 'string',
            label: 'Document Data (Base64)',
            inputType: 'textarea',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' }
        }
      },

      // File Operations
      {
        id: 'file_upload',
        name: 'Upload File',
        description: 'Upload a file to the Google Gemini API for later use',
        category: 'File',
        icon: 'upload',
        verified: false,
        api: {
          endpoint: '/upload/v1beta/files',
          method: 'POST',
          baseUrl: 'https://generativelanguage.googleapis.com',
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        },
        inputSchema: {
          file: {
            type: 'string',
            required: true,
            label: 'File',
            description: 'The file to upload (base64 or binary)',
            aiControlled: false
          },
          displayName: {
            type: 'string',
            label: 'Display Name',
            placeholder: 'My document',
            description: 'Optional display name for the file',
            aiControlled: true,
            aiDescription: 'A descriptive name for the uploaded file'
          }
        },
        outputSchema: {
          file: {
            type: 'object',
            description: 'Uploaded file information',
            properties: {
              name: { type: 'string' },
              uri: { type: 'string' },
              mimeType: { type: 'string' }
            }
          }
        }
      }
    ]
  };
