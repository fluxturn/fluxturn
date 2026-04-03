// Aws Bedrock Connector
// Auto-generated from connector.constants.ts

import { ConnectorDefinition } from '../../shared';

export const AWS_BEDROCK_CONNECTOR: ConnectorDefinition = {
    name: 'aws_bedrock',
    display_name: 'AWS Bedrock',
    category: 'ai',
    description: 'AWS Bedrock for multiple AI models',
    auth_type: 'aws_credentials',
    auth_fields: [
      {
        key: 'accessKeyId',
        label: 'Access Key ID',
        type: 'string',
        required: true,
        placeholder: 'AKIA...',
        description: 'Your AWS Access Key ID'
      },
      {
        key: 'secretAccessKey',
        label: 'Secret Access Key',
        type: 'password',
        required: true,
        placeholder: 'Your secret access key',
        description: 'Your AWS Secret Access Key'
      },
      {
        key: 'region',
        label: 'AWS Region',
        type: 'select',
        required: true,
        default: 'us-east-1',
        options: [
          { label: 'US East (N. Virginia)', value: 'us-east-1' },
          { label: 'US West (Oregon)', value: 'us-west-2' },
          { label: 'Europe (Frankfurt)', value: 'eu-central-1' },
          { label: 'Europe (Ireland)', value: 'eu-west-1' },
          { label: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
          { label: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
          { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2' }
        ],
        description: 'AWS region where Bedrock is available'
      }
    ],
    endpoints: {
      invoke: '/model/{modelId}/invoke',
      invokeWithResponseStream: '/model/{modelId}/invoke-with-response-stream',
      listFoundationModels: '/foundation-models'
    },
    rate_limits: { requests_per_minute: 100 },
    sandbox_available: true,
    verified: true,
    supported_actions: [
      // Chat/Text Completion
      {
        id: 'invoke_model',
        name: 'Invoke Model',
        description: 'Send a prompt to an AWS Bedrock foundation model and get a response',
        category: 'Text',
        icon: 'message-circle',
        verified: false,
        api: {
          endpoint: '/model/{modelId}/invoke',
          method: 'POST',
          baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            modelId: 'modelId',
            messages: 'messages',
            prompt: 'prompt',
            maxTokens: 'max_tokens',
            temperature: 'temperature',
            topP: 'top_p',
            topK: 'top_k',
            stopSequences: 'stop_sequences'
          }
        },
        inputSchema: {
          modelId: {
            type: 'select',
            required: true,
            label: 'Model',
            order: 0,
            default: 'anthropic.claude-3-sonnet-20240229-v1:0',
            dynamicOptions: true,
            options: [
              { label: 'Claude 3.5 Sonnet', value: 'anthropic.claude-3-5-sonnet-20240620-v1:0' },
              { label: 'Claude 3 Sonnet', value: 'anthropic.claude-3-sonnet-20240229-v1:0' },
              { label: 'Claude 3 Haiku', value: 'anthropic.claude-3-haiku-20240307-v1:0' },
              { label: 'Claude 3 Opus', value: 'anthropic.claude-3-opus-20240229-v1:0' },
              { label: 'Claude 2.1', value: 'anthropic.claude-v2:1' },
              { label: 'Claude Instant', value: 'anthropic.claude-instant-v1' },
              { label: 'Amazon Titan Text G1 - Express', value: 'amazon.titan-text-express-v1' },
              { label: 'Amazon Titan Text G1 - Lite', value: 'amazon.titan-text-lite-v1' },
              { label: 'Amazon Titan Text Premier', value: 'amazon.titan-text-premier-v1:0' },
              { label: 'Meta Llama 3.1 8B Instruct', value: 'meta.llama3-1-8b-instruct-v1:0' },
              { label: 'Meta Llama 3.1 70B Instruct', value: 'meta.llama3-1-70b-instruct-v1:0' },
              { label: 'Meta Llama 3.1 405B Instruct', value: 'meta.llama3-1-405b-instruct-v1:0' },
              { label: 'Mistral 7B Instruct', value: 'mistral.mistral-7b-instruct-v0:2' },
              { label: 'Mixtral 8x7B Instruct', value: 'mistral.mixtral-8x7b-instruct-v0:1' },
              { label: 'Mistral Large', value: 'mistral.mistral-large-2402-v1:0' },
              { label: 'Cohere Command R', value: 'cohere.command-r-v1:0' },
              { label: 'Cohere Command R+', value: 'cohere.command-r-plus-v1:0' },
              { label: 'AI21 Jamba-Instruct', value: 'ai21.jamba-instruct-v1:0' }
            ],
            description: 'The foundation model to invoke',
            aiControlled: false
          },
          messages: {
            type: 'array',
            required: true,
            label: 'Messages',
            order: 1,
            description: 'Array of message objects for the conversation (for Claude and other chat models)',
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
          systemPrompt: {
            type: 'string',
            label: 'System Prompt',
            order: 2,
            inputType: 'textarea',
            placeholder: 'You are a helpful assistant...',
            description: 'Optional system prompt to set the behavior of the model',
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
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            default: 2048,
            min: 1,
            max: 200000,
            description: 'Maximum number of tokens to generate in the response',
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            default: 0.7,
            min: 0,
            max: 1,
            step: 0.1,
            description: 'Controls randomness (0-1). Lower is more deterministic',
            aiControlled: false
          },
          topP: {
            type: 'number',
            label: 'Top P',
            default: 0.9,
            min: 0,
            max: 1,
            step: 0.1,
            description: 'Nucleus sampling parameter',
            aiControlled: false
          },
          topK: {
            type: 'number',
            label: 'Top K',
            default: 250,
            min: 0,
            max: 500,
            description: 'Top-k sampling parameter (model-dependent)',
            aiControlled: false
          },
          stopSequences: {
            type: 'array',
            label: 'Stop Sequences',
            description: 'Sequences that will stop generation',
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
          stopReason: { type: 'string', description: 'Reason for stopping generation' },
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

      // Image Analysis (for Claude models with vision)
      {
        id: 'analyze_image',
        name: 'Analyze Image',
        description: 'Analyze an image using Claude vision models on Bedrock',
        category: 'Image',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/model/{modelId}/invoke',
          method: 'POST',
          baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          modelId: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'anthropic.claude-3-sonnet-20240229-v1:0',
            options: [
              { label: 'Claude 3.5 Sonnet', value: 'anthropic.claude-3-5-sonnet-20240620-v1:0' },
              { label: 'Claude 3 Sonnet', value: 'anthropic.claude-3-sonnet-20240229-v1:0' },
              { label: 'Claude 3 Haiku', value: 'anthropic.claude-3-haiku-20240307-v1:0' },
              { label: 'Claude 3 Opus', value: 'anthropic.claude-3-opus-20240229-v1:0' }
            ],
            description: 'Claude model with vision capabilities',
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'Describe what you see in this image',
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
            label: 'Image Format',
            default: 'image/jpeg',
            options: [
              { label: 'JPEG', value: 'image/jpeg' },
              { label: 'PNG', value: 'image/png' },
              { label: 'GIF', value: 'image/gif' },
              { label: 'WebP', value: 'image/webp' }
            ],
            description: 'Format of the image',
            aiControlled: false
          },
          maxTokens: {
            type: 'number',
            label: 'Max Tokens',
            default: 1024,
            min: 1,
            max: 4096,
            description: 'Maximum number of tokens to generate',
            aiControlled: false
          },
          temperature: {
            type: 'number',
            label: 'Temperature',
            default: 0.7,
            min: 0,
            max: 1,
            step: 0.1,
            description: 'Controls randomness',
            aiControlled: false
          }
        },
        outputSchema: {
          text: { type: 'string', description: 'Analysis result' },
          usage: {
            type: 'object',
            description: 'Token usage',
            properties: {
              inputTokens: { type: 'number' },
              outputTokens: { type: 'number' }
            }
          }
        }
      },

      // Embeddings
      {
        id: 'create_embeddings',
        name: 'Create Embeddings',
        description: 'Generate text embeddings using Amazon Titan Embeddings or Cohere Embed',
        category: 'Embeddings',
        icon: 'box',
        verified: false,
        api: {
          endpoint: '/model/{modelId}/invoke',
          method: 'POST',
          baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
          headers: {
            'Content-Type': 'application/json'
          },
          paramMapping: {
            modelId: 'modelId',
            inputText: 'inputText'
          }
        },
        inputSchema: {
          modelId: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'amazon.titan-embed-text-v1',
            options: [
              { label: 'Amazon Titan Embeddings G1 - Text', value: 'amazon.titan-embed-text-v1' },
              { label: 'Amazon Titan Embeddings V2', value: 'amazon.titan-embed-text-v2:0' },
              { label: 'Amazon Titan Multimodal Embeddings G1', value: 'amazon.titan-embed-image-v1' },
              { label: 'Cohere Embed English', value: 'cohere.embed-english-v3' },
              { label: 'Cohere Embed Multilingual', value: 'cohere.embed-multilingual-v3' }
            ],
            description: 'The embeddings model to use',
            aiControlled: false
          },
          inputText: {
            type: 'string',
            required: true,
            label: 'Input Text',
            inputType: 'textarea',
            placeholder: 'Text to create embeddings for',
            description: 'The text to generate embeddings for',
            aiControlled: true,
            aiDescription: 'The text content to generate vector embeddings for'
          },
          dimensions: {
            type: 'number',
            label: 'Dimensions',
            description: 'Output embedding dimensions (Titan V2 only)',
            min: 256,
            max: 1024,
            default: 1024,
            aiControlled: false
          },
          normalize: {
            type: 'boolean',
            label: 'Normalize',
            default: true,
            description: 'Whether to normalize the embeddings',
            aiControlled: false
          }
        },
        outputSchema: {
          embedding: { type: 'array', description: 'Vector embedding' },
          inputTextTokenCount: { type: 'number', description: 'Number of tokens in input' }
        }
      },

      // Image Generation (Titan Image Generator / Stability AI)
      {
        id: 'generate_image',
        name: 'Generate Image',
        description: 'Generate images using Amazon Titan Image Generator or Stability AI models',
        category: 'Image',
        icon: 'image',
        verified: false,
        api: {
          endpoint: '/model/{modelId}/invoke',
          method: 'POST',
          baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        inputSchema: {
          modelId: {
            type: 'select',
            required: true,
            label: 'Model',
            default: 'amazon.titan-image-generator-v1',
            options: [
              { label: 'Amazon Titan Image Generator G1', value: 'amazon.titan-image-generator-v1' },
              { label: 'Amazon Titan Image Generator V2', value: 'amazon.titan-image-generator-v2:0' },
              { label: 'Stability SDXL 1.0', value: 'stability.stable-diffusion-xl-v1' }
            ],
            description: 'The image generation model to use',
            aiControlled: false
          },
          prompt: {
            type: 'string',
            required: true,
            label: 'Prompt',
            inputType: 'textarea',
            placeholder: 'A serene mountain landscape at sunset',
            description: 'Text description of the image to generate',
            maxLength: 1024,
            aiControlled: true,
            aiDescription: 'A detailed description of the image to generate'
          },
          negativePrompt: {
            type: 'string',
            label: 'Negative Prompt',
            inputType: 'textarea',
            placeholder: 'blurry, low quality, distorted',
            description: 'What to exclude from the generated image',
            aiControlled: true,
            aiDescription: 'Elements or qualities to avoid in the generated image'
          },
          width: {
            type: 'number',
            label: 'Width',
            default: 1024,
            min: 256,
            max: 2048,
            step: 64,
            description: 'Image width in pixels',
            aiControlled: false
          },
          height: {
            type: 'number',
            label: 'Height',
            default: 1024,
            min: 256,
            max: 2048,
            step: 64,
            description: 'Image height in pixels',
            aiControlled: false
          },
          numberOfImages: {
            type: 'number',
            label: 'Number of Images',
            default: 1,
            min: 1,
            max: 5,
            description: 'How many images to generate',
            aiControlled: false
          },
          cfgScale: {
            type: 'number',
            label: 'CFG Scale',
            default: 7,
            min: 1,
            max: 15,
            step: 0.5,
            description: 'How closely to follow the prompt (higher = more literal)',
            aiControlled: false
          },
          seed: {
            type: 'number',
            label: 'Seed',
            min: 0,
            max: 4294967295,
            description: 'Random seed for reproducible results (optional)',
            aiControlled: false
          }
        },
        outputSchema: {
          images: { type: 'array', description: 'Generated images (base64 encoded)' },
          seeds: { type: 'array', description: 'Seeds used for generation' }
        }
      }
    ]
  };
