import {
  Controller,
  All,
  Param,
  Req,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WorkflowService } from './workflow.service';
import { WebhookAuthService } from './services/webhook-auth.service';
import { IdempotencyService } from './services/idempotency.service';

/**
 * Generic Webhook Controller
 * Handles webhooks from ANY external service (Stripe, GitHub, custom APIs, etc.)
 *
 * URL Pattern: /webhook/:workflowId
 *
 * Supports:
 * - All HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * - Authentication (Basic, Bearer, Header, JWT - configured in node)
 * - CORS
 * - Custom response configuration
 *
 * Similar to n8n's Webhook node but simpler - no database tables needed!
 */
@ApiTags('webhooks')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly webhookAuthService: WebhookAuthService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @All(':workflowId')
  @ApiOperation({
    summary: 'Generic webhook endpoint',
    description: 'Receives webhooks from any external service and triggers workflow execution'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const startTime = Date.now();

    try {
      this.logger.log(`Received ${req.method} webhook for workflow ${workflowId}`);

      // Load workflow
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        this.logger.warn(`Workflow ${workflowId} not found`);
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'Workflow not found'
        });
      }

      // Get canvas from either workflow.canvas or workflow.workflow.canvas
      const canvas = workflow.canvas || workflow.workflow?.canvas;

      // Debug: Log workflow structure
      this.logger.debug(`Canvas nodes:`, canvas?.nodes?.map((n: any) => ({ id: n.id, type: n.type })));

      // Find WEBHOOK_TRIGGER node in workflow canvas
      const webhookNode = canvas?.nodes?.find(
        (node: any) => node.type === 'WEBHOOK_TRIGGER'
      );

      if (!webhookNode) {
        this.logger.warn(`No webhook trigger node found in workflow ${workflowId}`);
        this.logger.warn(`Available nodes: ${canvas?.nodes?.map((n: any) => n.type).join(', ') || 'none'}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'No webhook trigger configured in this workflow'
        });
      }

      // Get webhook configuration from node
      const webhookConfig = webhookNode.data?.config || {};
      const {
        httpMethod = 'POST',
        authType = 'none',
        authData = {},
        responseMode = 'onReceived',
        responseCode = 200,
        responseBody = '{"success": true}',
        responseHeaders = {},
        ipWhitelist = [],
        corsEnabled = true,
        corsOrigin = '*',
        ignoreBots = false,
      } = webhookConfig;

      // Validate HTTP method
      if (httpMethod !== 'ALL' && req.method !== httpMethod) {
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json({
          error: `Method ${req.method} not allowed. Expected ${httpMethod}`
        });
      }

      // Handle CORS preflight
      if (corsEnabled) {
        res.header('Access-Control-Allow-Origin', corsOrigin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          return res.status(HttpStatus.NO_CONTENT).send();
        }
      }

      // Check IP whitelist
      if (ipWhitelist.length > 0) {
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!ipWhitelist.includes(clientIp)) {
          this.logger.warn(`IP ${clientIp} not whitelisted for workflow ${workflowId}`);
          return res.status(HttpStatus.FORBIDDEN).json({
            error: 'IP address not allowed'
          });
        }
      }

      // Check for bots
      if (ignoreBots) {
        const userAgent = req.headers['user-agent'] || '';
        const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
        const isBot = botPatterns.some(pattern =>
          userAgent.toLowerCase().includes(pattern)
        );

        if (isBot) {
          this.logger.log(`Bot detected and ignored: ${userAgent}`);
          return res.status(HttpStatus.FORBIDDEN).json({
            error: 'Bots are not allowed'
          });
        }
      }

      // Authenticate request
      const authResult = await this.webhookAuthService.authenticate(
        req,
        authType,
        authData
      );

      if (!authResult.authenticated) {
        this.logger.warn(`Authentication failed for workflow ${workflowId}: ${authResult.error}`);
        return res.status(HttpStatus.UNAUTHORIZED).json({
          error: authResult.error || 'Authentication failed'
        });
      }

      // Idempotency check: skip duplicate webhook deliveries
      const idempotencyKey = this.idempotencyService.generateKey(
        req.originalUrl || req.path,
        req.body,
      );

      const isDuplicate = await this.idempotencyService.isDuplicate(idempotencyKey);
      if (isDuplicate) {
        this.logger.log(`Duplicate webhook detected for workflow ${workflowId}, key=${idempotencyKey.slice(0, 12)}...`);
        return res.status(HttpStatus.OK).json({
          success: true,
          deduplicated: true,
          message: 'Duplicate webhook detected, execution skipped',
        });
      }

      // Prepare webhook data for workflow execution
      const webhookData = {
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      };

      // Response immediately if configured (before workflow execution)
      if (responseMode === 'onReceived') {
        // Set custom headers
        Object.entries(responseHeaders).forEach(([key, value]) => {
          res.header(key, value as string);
        });

        // Parse response body if JSON
        let responseData;
        try {
          responseData = JSON.parse(responseBody);
        } catch {
          responseData = responseBody;
        }

        res.status(responseCode).json(responseData);

        // Execute workflow asynchronously
        this.executeWorkflowAsync(workflow, workflowId, webhookData, startTime, idempotencyKey);

        return;
      }

      // Execute workflow and wait for completion
      const execution = await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: webhookData,
        organization_id: workflow.organization_id,
        project_id: workflow.project_id,
        idempotency_key: idempotencyKey,
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(`Workflow ${workflowId} executed in ${executionTime}ms`);

      // Response modes
      if (responseMode === 'lastNode') {
        // Return output from last node
        const lastNodeOutput = execution.output_data || {};
        return res.status(responseCode).json(lastNodeOutput);
      } else {
        // Default: return configured response
        let responseData;
        try {
          responseData = JSON.parse(responseBody);
        } catch {
          responseData = responseBody;
        }

        // Set custom headers
        Object.entries(responseHeaders).forEach(([key, value]) => {
          res.header(key, value as string);
        });

        return res.status(responseCode).json(responseData);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Error processing webhook for workflow ${workflowId}:`, error);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  }

  /**
   * Execute workflow asynchronously (fire and forget)
   */
  private async executeWorkflowAsync(
    workflow: any,
    workflowId: string,
    webhookData: any,
    startTime: number,
    idempotencyKey?: string,
  ) {
    try {
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: webhookData,
        organization_id: workflow.organization_id,
        project_id: workflow.project_id,
        idempotency_key: idempotencyKey,
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(`Async workflow ${workflowId} executed in ${executionTime}ms`);
    } catch (error) {
      this.logger.error(`Error in async workflow execution ${workflowId}:`, error);
    }
  }
}
