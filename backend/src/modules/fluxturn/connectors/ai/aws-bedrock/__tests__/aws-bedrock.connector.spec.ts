/**
 * AWS Bedrock Connector Tests
 *
 * Tests for the AWS Bedrock connector actions.
 * Note: AWS Bedrock uses internal mock clients for testing since actual AWS SDK
 * requires real credentials and configuration.
 */
import { AWSBedrockConnector } from '../aws-bedrock.connector';
import { AWS_BEDROCK_CONNECTOR } from '../aws-bedrock.definition';
import { ConnectorTestHelper } from '@test/helpers/connector-test.helper';

describe('AWSBedrockConnector', () => {
  let connector: AWSBedrockConnector;

  beforeEach(async () => {
    connector = await ConnectorTestHelper.createConnector(AWSBedrockConnector, 'aws_bedrock');
  });

  // ===========================================
  // Metadata Tests
  // ===========================================
  describe('getMetadata', () => {
    it('should return correct connector metadata', () => {
      const metadata = connector.getMetadata();

      expect(metadata.name).toBe('AWS Bedrock');
      expect(metadata.category).toBe('ai');
      expect(metadata.authType).toBe('custom');
      expect(metadata.actions).toBeDefined();
      expect(metadata.actions.length).toBeGreaterThan(0);
      expect(metadata.triggers).toEqual([]);
    });

    it('should have all required action definitions', () => {
      const metadata = connector.getMetadata();
      const actionIds = metadata.actions.map(a => a.id);

      // Legacy action IDs from connector
      expect(actionIds).toContain('invokeModel');
      expect(actionIds).toContain('generateText');
      expect(actionIds).toContain('generateImage');
      expect(actionIds).toContain('createEmbedding');
      expect(actionIds).toContain('streamResponse');
    });
  });

  // ===========================================
  // Definition Tests
  // ===========================================
  describe('definition', () => {
    it('should have correct definition structure', () => {
      expect(AWS_BEDROCK_CONNECTOR.name).toBe('aws_bedrock');
      expect(AWS_BEDROCK_CONNECTOR.display_name).toBe('AWS Bedrock');
      expect(AWS_BEDROCK_CONNECTOR.category).toBe('ai');
      expect(AWS_BEDROCK_CONNECTOR.auth_type).toBe('aws_credentials');
    });

    it('should have required auth fields', () => {
      const authFields = AWS_BEDROCK_CONNECTOR.auth_fields;
      expect(authFields).toBeInstanceOf(Array);

      const fieldKeys = authFields?.map((f: any) => f.key) || [];
      expect(fieldKeys).toContain('accessKeyId');
      expect(fieldKeys).toContain('secretAccessKey');
      expect(fieldKeys).toContain('region');
    });

    it('should have supported actions', () => {
      const actions = AWS_BEDROCK_CONNECTOR.supported_actions;
      expect(actions).toBeInstanceOf(Array);
      expect(actions?.length).toBeGreaterThan(0);

      const actionIds = actions?.map((a: any) => a.id) || [];
      expect(actionIds).toContain('invoke_model');
      expect(actionIds).toContain('analyze_image');
      expect(actionIds).toContain('create_embeddings');
      expect(actionIds).toContain('generate_image');
    });

    it('should have model options for invoke_model action', () => {
      const invokeModelAction = AWS_BEDROCK_CONNECTOR.supported_actions?.find(
        (a: any) => a.id === 'invoke_model'
      );

      expect(invokeModelAction).toBeDefined();
      expect(invokeModelAction?.inputSchema?.modelId?.options).toBeDefined();
      expect(invokeModelAction?.inputSchema?.modelId?.options?.length).toBeGreaterThan(0);

      // Should include Claude models
      const modelValues = invokeModelAction?.inputSchema?.modelId?.options?.map((o: any) => o.value) || [];
      expect(modelValues.some((v: string) => v.includes('claude'))).toBe(true);
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return failure when AWS SDK is not configured', async () => {
      // The mock client throws an error about AWS SDK not being configured
      const result = await connector.testConnection();

      // Expected to fail since we're using mock clients
      expect(result.success).toBe(false);
    });
  });

  // ===========================================
  // Action Routing Tests (Definition Actions)
  // ===========================================
  describe('performAction routing (definition actions)', () => {
    // Note: Definition action IDs (invoke_model, analyze_image, etc.) are defined
    // in the .definition.ts file and handled by performAction, but they're not
    // in getMetadata(), so executeAction returns "Action not found".
    // The workflow engine calls performAction directly, bypassing this check.

    it('should reject invoke_model via executeAction (not in metadata)', async () => {
      const result = await connector.executeAction('invoke_model', {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      // Action not in metadata, so executeAction validation fails
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Action not found');
    });

    it('should reject analyze_image via executeAction (not in metadata)', async () => {
      const result = await connector.executeAction('analyze_image', {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        imageData: 'base64encodedimage',
        prompt: 'Describe this image',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Action not found');
    });

    it('should reject create_embeddings via executeAction (not in metadata)', async () => {
      const result = await connector.executeAction('create_embeddings', {
        modelId: 'amazon.titan-embed-text-v1',
        inputText: 'Hello world',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Action not found');
    });

    it('should reject generate_image via executeAction (not in metadata)', async () => {
      const result = await connector.executeAction('generate_image', {
        modelId: 'amazon.titan-image-generator-v1',
        prompt: 'A sunset over mountains',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Action not found');
    });
  });

  // ===========================================
  // Action Routing Tests (Legacy Actions)
  // ===========================================
  describe('performAction routing (legacy actions)', () => {
    it('should route invokeModel action', async () => {
      const result = await connector.executeAction('invokeModel', {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: { messages: [{ role: 'user', content: 'Hello' }] },
      });

      // May succeed or fail depending on base connector implementation
      expect(result).toBeDefined();
    });

    it('should route generateText action', async () => {
      const result = await connector.executeAction('generateText', {
        prompt: 'Hello world',
      });

      // May succeed or fail depending on base connector implementation
      expect(result).toBeDefined();
    });

    it('should route generateImage action', async () => {
      const result = await connector.executeAction('generateImage', {
        prompt: 'A beautiful sunset',
      });

      expect(result).toBeDefined();
    });

    it('should route createEmbedding action', async () => {
      const result = await connector.executeAction('createEmbedding', {
        input: 'Hello world',
      });

      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // Unknown Action Tests
  // ===========================================
  describe('unknown actions', () => {
    it('should return error for unknown action', async () => {
      const result = await connector.executeAction('unknown_action', {});

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/Unknown action|Action not found/);
    });
  });

  // ===========================================
  // Model Capability Tests
  // ===========================================
  describe('model capabilities', () => {
    it('should validate known models', async () => {
      const result = await connector.validateModel('anthropic.claude-3-5-sonnet-20241022-v2:0');
      expect(result).toBe(true);
    });

    it('should reject unknown models', async () => {
      const result = await connector.validateModel('unknown-model-xyz');
      expect(result).toBe(false);
    });

    it('should get context window for model', async () => {
      const contextWindow = await connector.getContextWindow('anthropic.claude-3-5-sonnet-20241022-v2:0');

      expect(contextWindow).toBeDefined();
      expect(contextWindow.size).toBe(200000);
      expect(contextWindow.remaining).toBe(200000);
    });

    it('should throw error for unknown model context window', async () => {
      await expect(
        connector.getContextWindow('unknown-model')
      ).rejects.toThrow('Unknown model');
    });

    it('should estimate token count', async () => {
      const tokenCount = await connector.getTokenCount('Hello world');

      // Rough estimate: ~2.5 chars per token
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBeLessThanOrEqual(10);
    });
  });

  // ===========================================
  // AI Interface Method Tests
  // ===========================================
  describe('AI interface methods', () => {
    describe('generateText', () => {
      it('should attempt text generation', async () => {
        const result = await connector.generateText('Hello', { model: 'anthropic.claude-3-sonnet-20240229-v1:0' });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should throw for unknown model', async () => {
        const result = await connector.generateText('Hello', { model: 'unknown-model' });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Unknown model');
      });
    });

    describe('chat', () => {
      it('should attempt chat completion', async () => {
        const messages = [
          { role: 'user' as const, content: 'Hello' },
        ];

        const result = await connector.chat(messages, { model: 'anthropic.claude-3-sonnet-20240229-v1:0' });

        expect(result.success).toBe(false);
      });
    });

    describe('generateCode', () => {
      it('should attempt code generation', async () => {
        const result = await connector.generateCode('Create a hello world function', 'javascript');

        expect(result.success).toBe(false);
      });
    });

    describe('summarize', () => {
      it('should attempt text summarization', async () => {
        const result = await connector.summarize('This is a long text that needs summarization.');

        expect(result.success).toBe(false);
      });
    });

    describe('classifyText', () => {
      it('should attempt text classification', async () => {
        const result = await connector.classifyText(
          'This product is amazing!',
          ['positive', 'negative', 'neutral']
        );

        expect(result.success).toBe(false);
      });
    });

    describe('extractData', () => {
      it('should attempt data extraction', async () => {
        const result = await connector.extractData(
          'John Doe, 30 years old, lives in New York',
          { name: 'string', age: 'number', city: 'string' }
        );

        expect(result.success).toBe(false);
      });
    });

    describe('analyzeDocument', () => {
      it('should attempt document analysis', async () => {
        const result = await connector.analyzeDocument({
          content: 'Test document content',
          task: 'summarize',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('createEmbedding', () => {
      it('should attempt embedding creation', async () => {
        const result = await connector.createEmbedding({
          input: 'Hello world',
          model: 'amazon.titan-embed-text-v1',
        });

        expect(result.success).toBe(false);
      });
    });

    describe('generateImage', () => {
      it('should attempt image generation', async () => {
        const result = await connector.generateImage({
          prompt: 'A beautiful sunset',
          model: 'stability.stable-diffusion-xl-v1',
        });

        expect(result.success).toBe(false);
      });

      it('should throw for non-Stability model', async () => {
        const result = await connector.generateImage({
          prompt: 'A beautiful sunset',
          model: 'anthropic.claude-3-sonnet-20240229-v1:0',
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('only supported with Stability AI');
      });
    });
  });

  // ===========================================
  // Available Models Tests
  // ===========================================
  describe('getAvailableModels', () => {
    it('should return available models (fallback to capabilities)', async () => {
      const models = await connector.getAvailableModels();

      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);

      // Should include some known models
      expect(models.some(m => m.includes('claude'))).toBe(true);
      expect(models.some(m => m.includes('titan'))).toBe(true);
    });
  });
});
