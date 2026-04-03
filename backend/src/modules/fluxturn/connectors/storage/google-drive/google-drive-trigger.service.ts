import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../../../workflow/interfaces/trigger.interface';

/**
 * Google Drive Trigger Service
 *
 * Handles Google Drive-specific trigger logic including:
 * - Webhook management for file changes
 * - File metadata parsing
 * - Status tracking
 *
 * This service processes Google Drive webhook events and triggers workflows
 * when files are created, updated, or deleted.
 */
@Injectable()
export class GoogleDriveTriggerService implements ITriggerService {
  private readonly logger = new Logger(GoogleDriveTriggerService.name);

  // Store active watches: workflowId -> watch details
  private activeWatches = new Map<string, GoogleDriveWatch>();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.GOOGLE_DRIVE;
  }

  /**
   * Activate Google Drive trigger for a workflow
   *
   * This sets up the trigger configuration and validates credentials.
   * For webhook-based triggers, we store the configuration and wait for
   * webhook events to arrive.
   */
  async activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating Google Drive trigger for workflow: ${workflowId}`);

      // Get workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        return {
          success: false,
          message: 'Workflow not found',
          error: 'Workflow not found',
        };
      }

      // Find Google Drive trigger node
      const driveTrigger = this.findGoogleDriveTrigger(workflow);
      if (!driveTrigger) {
        return {
          success: false,
          message: 'No Google Drive trigger found in workflow',
          error: 'No Google Drive trigger found',
        };
      }

      // Fetch credentials from database
      const credentialId = driveTrigger.data?.credentialId;
      if (!credentialId) {
        return {
          success: false,
          message: 'Google Drive credential not selected',
          error: 'Missing credentialId in trigger configuration',
        };
      }

      // Get credential from database
      const credentialRecord = await this.platformService.query(
        'SELECT * FROM connectors WHERE id = $1',
        [credentialId]
      );

      if (credentialRecord.rows.length === 0) {
        return {
          success: false,
          message: 'Google Drive credential not found',
          error: `Credential ${credentialId} not found in database`,
        };
      }

      const credentials = credentialRecord.rows[0].credentials;
      const accessToken = credentials.access_token || credentials.accessToken;

      if (!accessToken) {
        return {
          success: false,
          message: 'Google Drive credentials not properly configured',
          error: 'Missing accessToken in credentials',
        };
      }

      // Store watch configuration
      const watch: GoogleDriveWatch = {
        workflowId,
        credentialId,
        triggerId: driveTrigger.data?.triggerId || 'file_created',
        folderToWatch: driveTrigger.data?.config?.folderToWatch || 'root',
        fileFilter: driveTrigger.data?.config?.fileFilter,
        active: true,
        createdAt: Date.now()
      };

      this.activeWatches.set(workflowId, watch);

      this.logger.log(`✓ Google Drive trigger activated for workflow ${workflowId}`);
      this.logger.log(`  Trigger type: ${watch.triggerId}`);
      this.logger.log(`  Folder: ${watch.folderToWatch}`);
      this.logger.log(`  File filter: ${watch.fileFilter || 'all files'}`);

      return {
        success: true,
        message: 'Google Drive trigger activated',
        data: {
          triggerId: watch.triggerId,
          folderToWatch: watch.folderToWatch,
          fileFilter: watch.fileFilter,
          note: 'Webhook will be triggered when files change in Google Drive'
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate Google Drive trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate Google Drive trigger',
        error: error.message,
      };
    }
  }

  /**
   * Deactivate Google Drive trigger for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating Google Drive trigger for workflow: ${workflowId}`);

      // Remove watch configuration
      const watch = this.activeWatches.get(workflowId);
      if (watch) {
        this.activeWatches.delete(workflowId);
        this.logger.log(`✓ Removed watch configuration for workflow ${workflowId}`);
      }

      return {
        success: true,
        message: 'Google Drive trigger deactivated',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate Google Drive trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to deactivate Google Drive trigger',
      };
    }
  }

  /**
   * Get Google Drive trigger status for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    try {
      const watch = this.activeWatches.get(workflowId);

      if (watch && watch.active) {
        return {
          active: true,
          type: TriggerType.GOOGLE_DRIVE,
          message: 'Google Drive trigger active (webhook mode)',
          metadata: {
            triggerId: watch.triggerId,
            folderToWatch: watch.folderToWatch,
            fileFilter: watch.fileFilter,
            createdAt: new Date(watch.createdAt),
          },
        };
      }

      return {
        active: false,
        type: TriggerType.GOOGLE_DRIVE,
        message: 'Google Drive trigger not active',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get Google Drive trigger status for workflow ${workflowId}:`, error);
      return {
        active: false,
        type: TriggerType.GOOGLE_DRIVE,
        message: 'Error retrieving status',
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Process webhook event from Google Drive
   * This method is called when a webhook notification arrives
   *
   * @param workflowId - The workflow ID to trigger
   * @param eventData - The webhook payload from Google Drive
   * @returns Parsed file metadata
   */
  async processWebhookEvent(workflowId: string, eventData: any): Promise<GoogleDriveFileData> {
    try {
      this.logger.log(`Processing Google Drive webhook for workflow ${workflowId}`);
      this.logger.debug('Event data:', JSON.stringify(eventData, null, 2));

      const watch = this.activeWatches.get(workflowId);
      if (!watch) {
        this.logger.warn(`No active watch found for workflow ${workflowId}`);
        throw new Error('No active watch found for this workflow');
      }

      // Parse file metadata from webhook event
      // Google Drive webhook events typically include file metadata
      const fileData: GoogleDriveFileData = {
        id: eventData.id || eventData.fileId,
        name: eventData.name || eventData.fileName,
        mimeType: eventData.mimeType,
        size: eventData.size,
        createdTime: eventData.createdTime,
        modifiedTime: eventData.modifiedTime,
        webViewLink: eventData.webViewLink,
        webContentLink: eventData.webContentLink,
        owners: eventData.owners,
        parents: eventData.parents,
        kind: eventData.kind,
      };

      // Apply file filter if configured
      if (watch.fileFilter) {
        const matchesFilter = this.matchesFileFilter(fileData, watch.fileFilter);
        if (!matchesFilter) {
          this.logger.log(`File ${fileData.name} does not match filter ${watch.fileFilter}, skipping`);
          throw new Error('File does not match filter criteria');
        }
      }

      this.logger.log(`✓ Parsed file metadata: ${fileData.name} (${fileData.id})`);

      return fileData;
    } catch (error: any) {
      this.logger.error(`Failed to process webhook event for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Check if file matches the configured filter
   *
   * @param fileData - The file metadata
   * @param filter - The filter pattern (e.g., "video/*", "*.pdf")
   * @returns true if file matches filter
   */
  private matchesFileFilter(fileData: GoogleDriveFileData, filter: string): boolean {
    if (!filter) return true;

    // Handle mime type filters (e.g., "video/*", "image/*")
    if (filter.includes('/')) {
      const [category, subtype] = filter.split('/');
      const [fileCategory] = (fileData.mimeType || '').split('/');

      if (subtype === '*') {
        return fileCategory === category;
      }
      return fileData.mimeType === filter;
    }

    // Handle file extension filters (e.g., "*.pdf", "*.mp4")
    if (filter.startsWith('*.')) {
      const extension = filter.substring(1);
      return fileData.name?.toLowerCase().endsWith(extension.toLowerCase());
    }

    // Handle exact name match
    return fileData.name === filter;
  }

  /**
   * Find Google Drive trigger node in workflow
   */
  private findGoogleDriveTrigger(workflow: any): any | null {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return null;

    return canvas.nodes.find(
      (node: any) =>
        node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'google_drive'
    );
  }

  /**
   * Get watch configuration for a workflow
   */
  getWatch(workflowId: string): GoogleDriveWatch | undefined {
    return this.activeWatches.get(workflowId);
  }

  /**
   * List all active watches
   */
  listActiveWatches(): Map<string, GoogleDriveWatch> {
    return new Map(this.activeWatches);
  }
}

/**
 * Type definitions
 */
export interface GoogleDriveWatch {
  workflowId: string;
  credentialId: string;
  triggerId: 'file_created' | 'file_updated' | 'file_deleted';
  folderToWatch: string;
  fileFilter?: string;
  active: boolean;
  createdAt: number;
}

export interface GoogleDriveFileData {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: any[];
  parents?: string[];
  kind?: string;
}
