import { Injectable, Logger, Inject, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface PinterestTriggerConfig {
  triggerId?: string;
  credentialId?: string;
  connectorConfigId?: string;
  pollingInterval?: number;
  actionParams?: {
    triggerId?: string;
    pollingInterval?: number;
  };
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  credentials: any;
  pollingInterval: number;
  lastPollTime: number;
  lastPinIds?: string[];
  lastBoardIds?: string[];
}

@Injectable()
export class PinterestTriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(PinterestTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();
  private readonly baseUrl = 'https://api.pinterest.com/v5';
  private pollingIntervalId: NodeJS.Timeout | null = null;
  private readonly DEFAULT_POLLING_INTERVAL = 5; // minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {
    // Start polling loop
    this.startPollingLoop();
  }

  getTriggerType(): TriggerType {
    return TriggerType.PINTEREST;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up Pinterest triggers...');
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    this.activeTriggers.clear();
    this.logger.log('Pinterest trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: PinterestTriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'new_pin_created';
      const pollingInterval = triggerConfig.pollingInterval || triggerConfig.actionParams?.pollingInterval || this.DEFAULT_POLLING_INTERVAL;

      this.logger.log(`Activating Pinterest trigger ${triggerId} for workflow ${workflowId}`);

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let accessToken: string | undefined;

      if (credentialId) {
        const credentials = await this.getCredentials(credentialId);
        accessToken = credentials?.accessToken || credentials?.access_token;
      }

      if (!accessToken) {
        return {
          success: false,
          message: 'Pinterest access token is required',
          error: 'Missing accessToken in credentials',
        };
      }

      // Validate by fetching user account
      try {
        await axios.get(`${this.baseUrl}/user_account`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
      } catch (error) {
        return {
          success: false,
          message: 'Failed to validate Pinterest credentials',
          error: error.response?.data?.message || error.message,
        };
      }

      // Get initial state (pins or boards depending on trigger type)
      let initialState: string[] = [];
      if (triggerId === 'new_pin_created') {
        initialState = await this.fetchPinIds(accessToken);
      } else if (triggerId === 'new_board_created') {
        initialState = await this.fetchBoardIds(accessToken);
      }

      // Store active trigger
      const activeTrigger: ActiveTrigger = {
        workflowId,
        triggerId,
        credentials: { accessToken },
        pollingInterval,
        lastPollTime: Date.now(),
        lastPinIds: triggerId === 'new_pin_created' ? initialState : undefined,
        lastBoardIds: triggerId === 'new_board_created' ? initialState : undefined,
      };

      this.activeTriggers.set(workflowId, activeTrigger);

      return {
        success: true,
        message: 'Pinterest trigger activated successfully (polling mode)',
        data: {
          triggerId,
          mode: 'polling',
          pollingInterval: `${pollingInterval} minute(s)`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate Pinterest trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Pinterest trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Pinterest trigger for workflow ${workflowId}`);
      this.activeTriggers.delete(workflowId);

      return {
        success: true,
        message: 'Pinterest trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate Pinterest trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate Pinterest trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.PINTEREST,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.PINTEREST,
      message: 'Pinterest trigger is active (polling mode)',
      metadata: {
        triggerId: activeTrigger.triggerId,
        pollingInterval: `${activeTrigger.pollingInterval} minute(s)`,
        lastPollTime: new Date(activeTrigger.lastPollTime).toISOString(),
      },
    };
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  // ===== POLLING LOGIC =====

  private startPollingLoop(): void {
    // Poll every minute, but each trigger has its own interval
    this.pollingIntervalId = setInterval(() => {
      this.pollAllTriggers();
    }, 60 * 1000); // Check every minute

    this.logger.log('Pinterest polling loop started');
  }

  private async pollAllTriggers(): Promise<void> {
    const now = Date.now();

    for (const [workflowId, trigger] of this.activeTriggers.entries()) {
      const intervalMs = trigger.pollingInterval * 60 * 1000;

      if (now - trigger.lastPollTime >= intervalMs) {
        try {
          await this.pollTrigger(workflowId, trigger);
          trigger.lastPollTime = now;
        } catch (error) {
          this.logger.error(`Failed to poll Pinterest trigger for workflow ${workflowId}:`, error);
        }
      }
    }
  }

  private async pollTrigger(workflowId: string, trigger: ActiveTrigger): Promise<void> {
    const accessToken = trigger.credentials.accessToken;

    if (trigger.triggerId === 'new_pin_created') {
      await this.pollForNewPins(workflowId, trigger, accessToken);
    } else if (trigger.triggerId === 'new_board_created') {
      await this.pollForNewBoards(workflowId, trigger, accessToken);
    }
  }

  private async pollForNewPins(workflowId: string, trigger: ActiveTrigger, accessToken: string): Promise<void> {
    const currentPinIds = await this.fetchPinIds(accessToken);
    const previousPinIds = trigger.lastPinIds || [];

    // Find new pins
    const newPinIds = currentPinIds.filter(id => !previousPinIds.includes(id));

    if (newPinIds.length > 0) {
      this.logger.log(`Found ${newPinIds.length} new pin(s) for workflow ${workflowId}`);

      // Fetch details for new pins and trigger workflow
      for (const pinId of newPinIds) {
        try {
          const pinDetails = await this.fetchPinDetails(accessToken, pinId);
          await this.triggerWorkflow(workflowId, 'new_pin_created', pinDetails);
        } catch (error) {
          this.logger.error(`Failed to process new pin ${pinId}:`, error);
        }
      }
    }

    // Update state
    trigger.lastPinIds = currentPinIds;
  }

  private async pollForNewBoards(workflowId: string, trigger: ActiveTrigger, accessToken: string): Promise<void> {
    const currentBoardIds = await this.fetchBoardIds(accessToken);
    const previousBoardIds = trigger.lastBoardIds || [];

    // Find new boards
    const newBoardIds = currentBoardIds.filter(id => !previousBoardIds.includes(id));

    if (newBoardIds.length > 0) {
      this.logger.log(`Found ${newBoardIds.length} new board(s) for workflow ${workflowId}`);

      // Fetch details for new boards and trigger workflow
      for (const boardId of newBoardIds) {
        try {
          const boardDetails = await this.fetchBoardDetails(accessToken, boardId);
          await this.triggerWorkflow(workflowId, 'new_board_created', boardDetails);
        } catch (error) {
          this.logger.error(`Failed to process new board ${boardId}:`, error);
        }
      }
    }

    // Update state
    trigger.lastBoardIds = currentBoardIds;
  }

  // ===== API HELPERS =====

  private async fetchPinIds(accessToken: string): Promise<string[]> {
    try {
      const pinIds: string[] = [];

      // First get all boards
      const boardsResponse = await axios.get(`${this.baseUrl}/boards`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { page_size: 25 },
      });

      const boards = boardsResponse.data.items || [];

      // Then get pins from each board
      for (const board of boards) {
        try {
          const pinsResponse = await axios.get(`${this.baseUrl}/boards/${board.id}/pins`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            params: { page_size: 50 },
          });

          const pins = pinsResponse.data.items || [];
          pinIds.push(...pins.map((pin: any) => pin.id));
        } catch (error) {
          this.logger.warn(`Failed to fetch pins from board ${board.id}:`, error.message);
        }
      }

      return pinIds;
    } catch (error) {
      this.logger.error('Failed to fetch Pinterest pin IDs:', error);
      return [];
    }
  }

  private async fetchBoardIds(accessToken: string): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { page_size: 100 },
      });

      return (response.data.items || []).map((board: any) => board.id);
    } catch (error) {
      this.logger.error('Failed to fetch Pinterest board IDs:', error);
      return [];
    }
  }

  private async fetchPinDetails(accessToken: string, pinId: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/pins/${pinId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return response.data;
  }

  private async fetchBoardDetails(accessToken: string, boardId: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/boards/${boardId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return response.data;
  }

  private async triggerWorkflow(workflowId: string, eventType: string, eventData: any): Promise<void> {
    // This would typically call WorkflowService.executeWorkflow
    // For now, we'll emit an event that the workflow service can listen to
    this.logger.log(`Triggering workflow ${workflowId} with Pinterest ${eventType} event`);

    // The actual workflow execution would be handled by injecting WorkflowService
    // and calling executeWorkflow, but to avoid circular dependencies,
    // we can use an event emitter or direct service call from the workflow module
  }

  // ===== CREDENTIAL HELPERS =====

  private async getCredentials(credentialId: string): Promise<any> {
    try {
      const query = `SELECT credentials FROM connector_configs WHERE id = $1`;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;

      if (credentials?.iv && (credentials?.data || credentials?.encrypted) && credentials?.authTag) {
        return this.decryptCredentials(credentials);
      }

      return credentials;
    } catch (error) {
      this.logger.error(`Failed to fetch credentials ${credentialId}:`, error);
      return null;
    }
  }

  private decryptCredentials(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set');
      }

      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(secretKey.slice(0, 32));

      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Credential decryption failed:', error);
      throw error;
    }
  }
}
