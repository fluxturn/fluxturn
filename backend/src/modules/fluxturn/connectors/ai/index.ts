// AI Connectors - Category Index
// Each connector is organized in its own folder

// AI Connector interfaces and types (kept at root level)
export * from './ai.interface';

// Export connector implementations
export { OpenAIConnector } from './openai';
export { OpenAIChatbotConnector } from './openai-chatbot';
export { AnthropicConnector } from './anthropic';
export { GoogleAIConnector } from './google-ai';
export { GoogleGeminiConnector } from './google-gemini';
export { AWSBedrockConnector } from './aws-bedrock';

// Export connector definitions
export { OPENAI_CONNECTOR } from './openai';
export { OPENAI_CHATBOT_CONNECTOR } from './openai-chatbot';
export { ANTHROPIC_CONNECTOR } from './anthropic';
export { GOOGLE_AI_CONNECTOR } from './google-ai';
export { GOOGLE_GEMINI_CONNECTOR } from './google-gemini';
export { AWS_BEDROCK_CONNECTOR } from './aws-bedrock';

// Import for registry
import { OpenAIConnector } from './openai';
import { OpenAIChatbotConnector } from './openai-chatbot';
import { AnthropicConnector } from './anthropic';
import { GoogleAIConnector } from './google-ai';
import { GoogleGeminiConnector } from './google-gemini';
import { AWSBedrockConnector } from './aws-bedrock';

// AI Connector class registry (for runtime instantiation)
export const AI_CONNECTOR_REGISTRY = {
  openai: OpenAIConnector,
  openai_chatbot: OpenAIChatbotConnector,
  anthropic: AnthropicConnector,
  google_ai: GoogleAIConnector,
  google_gemini: GoogleGeminiConnector,
  aws_bedrock: AWSBedrockConnector,
} as const;

// Legacy alias for backwards compatibility
export const AI_CONNECTORS = AI_CONNECTOR_REGISTRY;

export type AIConnectorType = keyof typeof AI_CONNECTOR_REGISTRY;

// Combined array of all AI connector definitions (for ConnectorLookup)
import { OPENAI_CONNECTOR } from './openai';
import { OPENAI_CHATBOT_CONNECTOR } from './openai-chatbot';
import { ANTHROPIC_CONNECTOR } from './anthropic';
import { GOOGLE_AI_CONNECTOR } from './google-ai';
import { GOOGLE_GEMINI_CONNECTOR } from './google-gemini';
import { AWS_BEDROCK_CONNECTOR } from './aws-bedrock';

export const AI_CONNECTOR_DEFINITIONS = [
  OPENAI_CONNECTOR,
  OPENAI_CHATBOT_CONNECTOR,
  ANTHROPIC_CONNECTOR,
  GOOGLE_AI_CONNECTOR,
  GOOGLE_GEMINI_CONNECTOR,
  AWS_BEDROCK_CONNECTOR,
];
