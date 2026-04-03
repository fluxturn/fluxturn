import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Connector Analyzer Service
 *
 * Analyzes actual connector TypeScript files to extract:
 * - Available actions
 * - Supported triggers
 * - Input/output schemas
 * - Use case examples
 *
 * Generates proper Qdrant seed data from real code instead of hardcoded examples
 */
@Injectable()
export class ConnectorAnalyzerService {
  private readonly logger = new Logger(ConnectorAnalyzerService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Analyze a connector file and extract structured information
   */
  async analyzeConnectorFile(filePath: string): Promise<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    triggers: string[];
    actions: string[];
    examples: string[];
    parameters: Record<string, any>;
  }> {
    try {
      // Read the connector file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      this.logger.log(`Analyzing connector file: ${fileName}`);

      // Use OpenAI to analyze the code
      const analysis = await this.analyzeWithAI(fileContent, fileName);

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing connector file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Analyze all connectors in a directory
   */
  async analyzeAllConnectors(connectorsDir: string): Promise<any[]> {
    const results = [];

    try {
      // Get all subdirectories (categories)
      const categories = fs.readdirSync(connectorsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const category of categories) {
        const categoryPath = path.join(connectorsDir, category);

        // Get all .connector.ts files
        const files = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.connector.ts'));

        for (const file of files) {
          const filePath = path.join(categoryPath, file);

          try {
            const analysis = await this.analyzeConnectorFile(filePath);
            results.push({
              ...analysis,
              category,
              sourceFile: filePath,
            });

            this.logger.log(`✅ Analyzed: ${file}`);
          } catch (error) {
            this.logger.warn(`⚠️ Skipped ${file}: ${error.message}`);
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Error analyzing connectors directory:', error);
      throw error;
    }
  }

  /**
   * Use OpenAI to analyze connector code and extract information
   */
  private async analyzeWithAI(
    code: string,
    fileName: string,
  ): Promise<any> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const prompt = `Analyze this TypeScript connector file and extract structured information.

File: ${fileName}

Code:
\`\`\`typescript
${code.substring(0, 10000)} // Truncate to avoid token limits
\`\`\`

Extract the following information and return as JSON:
1. name: connector name (lowercase, kebab-case, e.g., "gmail", "slack")
2. displayName: human-readable name (e.g., "Gmail", "Slack")
3. description: brief description of what this connector does
4. category: category (e.g., "communication", "crm", "storage")
5. triggers: array of trigger types this connector supports (e.g., ["email_received", "new_message"])
6. actions: array of actions this connector can perform (e.g., ["send_email", "read_messages"])
7. examples: array of 3-5 example use cases (e.g., ["Send email when form submitted", "Monitor inbox for new emails"])
8. parameters: object describing common parameters this connector uses

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code analyzer that extracts structured information from TypeScript connector files. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      this.logger.error('Error analyzing with AI:', error);
      throw error;
    }
  }

  /**
   * Generate Qdrant seed data from analyzed connectors
   */
  async generateQdrantSeedData(
    analyzedConnectors: any[],
  ): Promise<{
    connectorDocs: any[];
    workflowExamples: any[];
    rules: any[];
  }> {
    const connectorDocs = [];
    const workflowExamples = [];
    const rules = [];

    for (const connector of analyzedConnectors) {
      // Connector documentation
      connectorDocs.push({
        name: connector.name,
        displayName: connector.displayName,
        description: connector.description,
        category: connector.category,
        triggers: connector.triggers || [],
        actions: connector.actions || [],
        examples: connector.examples || [],
        parameters: connector.parameters || {},
      });

      // Generate workflow examples from connector use cases
      if (connector.examples && connector.examples.length > 0) {
        for (const example of connector.examples.slice(0, 2)) {
          // Take top 2 examples
          workflowExamples.push({
            prompt: example,
            connectors: [connector.name],
            complexity: 'simple',
            workflow: {
              triggers: connector.triggers?.[0]
                ? [{ type: connector.triggers[0] }]
                : [],
              steps: connector.actions?.[0]
                ? [{ connector: connector.name, action: connector.actions[0] }]
                : [],
            },
          });
        }
      }

      // Generate rules from triggers and actions
      if (connector.triggers && connector.triggers.length > 0) {
        rules.push({
          pattern: `when ${connector.triggers.join(' or ')}`,
          connector: connector.name,
          trigger_type: 'trigger',
        });
      }

      if (connector.actions && connector.actions.length > 0) {
        rules.push({
          pattern: connector.actions.join(', '),
          connector: connector.name,
          trigger_type: 'action',
        });
      }
    }

    return {
      connectorDocs,
      workflowExamples,
      rules,
    };
  }

  /**
   * Save analyzed data to JSON file (for debugging/review)
   */
  async saveAnalysisToFile(
    data: any,
    outputPath: string,
  ): Promise<void> {
    try {
      fs.writeFileSync(
        outputPath,
        JSON.stringify(data, null, 2),
        'utf-8',
      );
      this.logger.log(`✅ Saved analysis to: ${outputPath}`);
    } catch (error) {
      this.logger.error('Error saving analysis:', error);
      throw error;
    }
  }
}
