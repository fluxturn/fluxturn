import { Request } from 'express';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIConnector } from './openai';
import { OpenAIChatbotConnector } from './openai-chatbot';
import { AnthropicConnector } from './anthropic';
import { GoogleAIConnector } from './google-ai';
import { AWSBedrockConnector } from './aws-bedrock';

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAIConnector,
    OpenAIChatbotConnector,
    AnthropicConnector,
    GoogleAIConnector,
    AWSBedrockConnector,
  ],
  exports: [
    OpenAIConnector,
    OpenAIChatbotConnector,
    AnthropicConnector,
    GoogleAIConnector,
    AWSBedrockConnector,
  ],
})
export class AIConnectorModule {}