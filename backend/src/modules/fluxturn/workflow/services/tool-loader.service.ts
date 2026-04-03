import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { getGmailTools } from '../tools/gmail.tool';
import { getHttpRequestTools } from '../tools/http-request.tool';
import { getCalculatorTools } from '../tools/calculator.tool';
import { getSlackTools } from '../tools/slack.tool';
import { getTelegramTools } from '../tools/telegram.tool';
import { getDiscordTools } from '../tools/discord.tool';
import { getTeamsTools } from '../tools/teams.tool';

/**
 * Tool Loader Service
 *
 * Automatically registers all available tools with the ToolRegistry on module startup.
 * This ensures tools are available when AI Agent nodes are executed.
 */
@Injectable()
export class ToolLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ToolLoaderService.name);

  constructor(private readonly toolRegistry: ToolRegistryService) {}

  /**
   * Called when the module is initialized.
   * Registers all tools with the registry.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Loading tools into registry...');

    try {
      // Register Gmail tools
      const gmailTools = getGmailTools();
      this.toolRegistry.registerTools(gmailTools);
      this.logger.log(`Registered ${gmailTools.length} Gmail tools`);

      // Register HTTP Request tools
      const httpTools = getHttpRequestTools();
      this.toolRegistry.registerTools(httpTools);
      this.logger.log(`Registered ${httpTools.length} HTTP Request tools`);

      // Register Calculator tools
      const calculatorTools = getCalculatorTools();
      this.toolRegistry.registerTools(calculatorTools);
      this.logger.log(`Registered ${calculatorTools.length} Calculator tools`);

      // Register Slack tools
      const slackTools = getSlackTools();
      this.toolRegistry.registerTools(slackTools);
      this.logger.log(`Registered ${slackTools.length} Slack tools`);

      // Register Telegram tools
      const telegramTools = getTelegramTools();
      this.toolRegistry.registerTools(telegramTools);
      this.logger.log(`Registered ${telegramTools.length} Telegram tools`);

      // Register Discord tools
      const discordTools = getDiscordTools();
      this.toolRegistry.registerTools(discordTools);
      this.logger.log(`Registered ${discordTools.length} Discord tools`);

      // Register Teams tools
      const teamsTools = getTeamsTools();
      this.toolRegistry.registerTools(teamsTools);
      this.logger.log(`Registered ${teamsTools.length} Teams tools`);

      // Log registry stats
      const stats = this.toolRegistry.getStats();
      this.logger.log(
        `Tool registry initialized: ${stats.totalTools} total tools`,
      );
      this.logger.debug(`Tools by category: ${JSON.stringify(stats.toolsByCategory)}`);
    } catch (error: any) {
      this.logger.error(`Failed to load tools: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all tools for a specific connector type
   */
  getToolsForConnector(connectorType: string) {
    return this.toolRegistry
      .getAllTools()
      .filter((tool) => tool.connectorType === connectorType);
  }

  /**
   * Get all tools that don't require credentials
   */
  getStandaloneTools() {
    return this.toolRegistry
      .getAllTools()
      .filter((tool) => !tool.requiresCredentials);
  }
}
