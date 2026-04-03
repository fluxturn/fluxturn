import { Injectable, Logger, Inject, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { ConnectorsService } from '../../connectors.service';
import Imap = require('imap');
import { simpleParser } from 'mailparser';

interface ImapWorkflowConnection {
  workflowId: string;
  config: any;
  connection: Imap;
  lastUid: number;
}

@Injectable()
export class ImapTriggerService implements OnModuleDestroy {
  private readonly logger = new Logger(ImapTriggerService.name);
  private activeConnections: Map<string, ImapWorkflowConnection> = new Map();

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Lifecycle hook - cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up IMAP connections...');
    for (const [workflowId, imapConn] of this.activeConnections.entries()) {
      try {
        if (imapConn.connection) {
          imapConn.connection.end();
        }
      } catch (error) {
        this.logger.error(`Error closing IMAP connection for workflow ${workflowId}:`, error);
      }
    }
    this.activeConnections.clear();
  }

  /**
   * Check for new emails every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleImapPolling() {
    try {
      const workflows = await this.getActiveImapWorkflows();

      for (const workflow of workflows) {
        try {
          await this.pollWorkflowEmails(workflow);
        } catch (error) {
          this.logger.error(`Error polling emails for workflow ${workflow.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in IMAP polling cycle:', error);
    }
  }

  /**
   * Get all active workflows with IMAP triggers
   */
  private async getActiveImapWorkflows(): Promise<any[]> {
    const query = `
      SELECT id, name, status, canvas
      FROM workflows
      WHERE status = 'active'
      AND canvas IS NOT NULL
    `;

    const result = await this.platformService.query(query);

    // Filter workflows that have IMAP trigger nodes
    return result.rows.filter(workflow => {
      try {
        const canvas = workflow.canvas;
        if (!canvas?.nodes) return false;

        return canvas.nodes.some(node =>
          node.type === 'CONNECTOR_TRIGGER' &&
          node.data?.connectorType === 'imap'
        );
      } catch (error) {
        this.logger.error(`Error checking workflow ${workflow.id}:`, error);
        return false;
      }
    });
  }

  /**
   * Poll emails for a specific workflow
   */
  private async pollWorkflowEmails(workflow: any) {
    const canvas = workflow.canvas;
    const triggerNode = canvas.nodes.find(node =>
      node.type === 'CONNECTOR_TRIGGER' &&
      node.data?.connectorType === 'imap'
    );

    if (!triggerNode) {
      this.logger.warn(`No IMAP trigger found in workflow ${workflow.id}`);
      return;
    }

    const triggerConfig = triggerNode.data;
    const credentialId = triggerConfig.credentialId;

    if (!credentialId) {
      this.logger.warn(`No credential configured for IMAP trigger in workflow ${workflow.id}`);
      return;
    }

    // Get trigger parameters
    const triggerParams = triggerConfig.triggerParams || {};
    const mailbox = triggerParams.mailbox || 'INBOX';
    const postProcessAction = triggerParams.postProcessAction || 'read';
    const format = triggerParams.format || 'simple';
    const downloadAttachments = triggerParams.downloadAttachments || false;
    const attachmentPrefix = triggerParams.dataPropertyAttachmentsPrefixName || 'attachment_';
    const customEmailConfig = triggerParams.customEmailConfig || '["UNSEEN"]';
    const pollInterval = Math.max((triggerParams.pollInterval || 60), 10) * 1000; // Convert to ms, minimum 10s

    // Get credentials
    let credentials;
    try {
      credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    } catch (error) {
      this.logger.error(`Error fetching credentials for ${credentialId}:`, error);
      return;
    }

    // Parse search criteria
    let searchCriteria: any[];
    try {
      searchCriteria = JSON.parse(customEmailConfig);
    } catch (error) {
      this.logger.error(`Invalid custom email config for workflow ${workflow.id}:`, error);
      searchCriteria = ['UNSEEN'];
    }

    // Create or reuse IMAP connection
    const connectionKey = `${workflow.id}-${credentialId}`;
    const existingConnection = this.activeConnections.get(connectionKey);

    if (!existingConnection || !existingConnection.connection) {
      await this.createImapConnection(workflow.id, credentialId, credentials, mailbox, {
        searchCriteria,
        postProcessAction,
        format,
        downloadAttachments,
        attachmentPrefix
      });
    } else {
      // Fetch new emails using existing connection
      await this.fetchNewEmails(existingConnection, workflow.id, {
        searchCriteria,
        postProcessAction,
        format,
        downloadAttachments,
        attachmentPrefix
      });
    }
  }

  /**
   * Create a new IMAP connection
   */
  private async createImapConnection(
    workflowId: string,
    credentialId: string,
    credentials: any,
    mailbox: string,
    options: any
  ) {
    const connectionKey = `${workflowId}-${credentialId}`;

    try {
      const tlsOptions: any = {
        // Always set servername for SNI
        servername: credentials.host
      };

      // Check if this is a well-known email provider
      const isWellKnownProvider =
        credentials.host.includes('gmail.com') ||
        credentials.host.includes('outlook.') ||
        credentials.host.includes('yahoo.') ||
        credentials.host.includes('icloud.com');

      // For well-known providers or if explicitly allowed
      if (credentials.allowUnauthorizedCerts === true || isWellKnownProvider) {
        // On Windows, sometimes Node.js has trouble with certificate chains
        // For known providers like Gmail, we can safely bypass certificate validation
        tlsOptions.rejectUnauthorized = false;

        if (credentials.allowUnauthorizedCerts === true) {
          this.logger.warn(`User explicitly allowed unauthorized certificates for ${credentials.host}`);
        } else {
          this.logger.debug(`Using relaxed TLS verification for known provider: ${credentials.host}`);
        }
      }

      const config = {
        user: credentials.user,
        password: credentials.password,
        host: credentials.host,
        port: credentials.port || 993,
        tls: credentials.secure !== false,
        tlsOptions,
        authTimeout: 20000,
        connTimeout: 30000,
        debug: (msg: string) => {
          this.logger.debug(`IMAP Debug: ${msg}`);
        }
      };

      this.logger.log(`Creating IMAP connection for workflow ${workflowId} to ${credentials.host}:${config.port}`);
      this.logger.debug(`TLS enabled: ${config.tls}, TLS options: ${JSON.stringify(tlsOptions)}`);

      const imapConnection = new Imap(config);

      imapConnection.once('ready', () => {
        this.logger.log(`IMAP connection ready for workflow ${workflowId}`);

        imapConnection.openBox(mailbox, false, (err, box) => {
          if (err) {
            this.logger.error(`Error opening mailbox ${mailbox}:`, err);
            return;
          }

          this.logger.log(`Opened mailbox ${mailbox} for workflow ${workflowId}`);

          // Store connection
          this.activeConnections.set(connectionKey, {
            workflowId,
            config: credentials,
            connection: imapConnection,
            lastUid: box.uidnext - 1 // Start from the latest UID
          });

          // Fetch initial emails
          this.fetchNewEmails(this.activeConnections.get(connectionKey)!, workflowId, options);
        });
      });

      imapConnection.once('error', (err) => {
        this.logger.error(`IMAP connection error for workflow ${workflowId}:`, err);
        this.activeConnections.delete(connectionKey);
      });

      imapConnection.once('end', () => {
        this.logger.log(`IMAP connection ended for workflow ${workflowId}`);
        this.activeConnections.delete(connectionKey);
      });

      imapConnection.connect();

    } catch (error) {
      this.logger.error(`Error creating IMAP connection for workflow ${workflowId}:`, error);
    }
  }

  /**
   * Fetch new emails from the connection
   */
  private async fetchNewEmails(
    imapConn: ImapWorkflowConnection,
    workflowId: string,
    options: any
  ) {
    const { connection, lastUid } = imapConn;
    const { searchCriteria, postProcessAction, format, downloadAttachments, attachmentPrefix } = options;

    try {
      // Add UID filter to only get new emails
      const fullCriteria = [...searchCriteria, ['UID', `${lastUid + 1}:*`]];

      this.logger.debug(`Searching for new emails in workflow ${workflowId} with criteria:`, fullCriteria);

      connection.search(fullCriteria, (err, results) => {
        if (err) {
          this.logger.error(`Error searching emails for workflow ${workflowId}:`, err);
          return;
        }

        if (!results || results.length === 0) {
          this.logger.debug(`No new emails found for workflow ${workflowId}`);
          return;
        }

        this.logger.log(`Found ${results.length} new email(s) for workflow ${workflowId}`);

        const fetch = connection.fetch(results, {
          bodies: format === 'raw' ? 'TEXT' : '',
          struct: true
        });

        fetch.on('message', (msg, seqno) => {
          this.logger.log(`Processing email #${seqno} for workflow ${workflowId}`);

          let buffer = '';
          let uid: number = 0;
          let attributes: any = null;

          msg.on('body', (stream, info) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            attributes = attrs;
            uid = attrs.uid;

            // Update last UID
            if (uid > imapConn.lastUid) {
              imapConn.lastUid = uid;
            }
          });

          msg.once('end', async () => {
            try {
              // Parse email based on format
              let emailData: any;

              if (format === 'raw') {
                emailData = {
                  raw: buffer,
                  attributes: { uid }
                };
              } else {
                const parsed = await simpleParser(buffer);

                emailData = {
                  from: parsed.from?.text || '',
                  to: parsed.to?.text || '',
                  subject: parsed.subject || '',
                  date: parsed.date?.toISOString() || new Date().toISOString(),
                  textPlain: parsed.text || '',
                  textHtml: parsed.html || '',
                  cc: parsed.cc?.text || '',
                  metadata: {
                    messageId: parsed.messageId,
                    references: parsed.references,
                    inReplyTo: parsed.inReplyTo
                  },
                  attributes: { uid }
                };

                // Handle attachments if requested
                if (downloadAttachments && parsed.attachments && parsed.attachments.length > 0) {
                  emailData.attachments = parsed.attachments.map((att, index) => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    propertyName: `${attachmentPrefix}${index}`
                  }));
                }
              }

              // Trigger workflow execution
              await this.triggerWorkflow(workflowId, emailData);

              // Mark as read if configured
              if (postProcessAction === 'read') {
                connection.addFlags(uid, '\\Seen', (err) => {
                  if (err) {
                    this.logger.error(`Error marking email ${uid} as read:`, err);
                  } else {
                    this.logger.debug(`Marked email ${uid} as read`);
                  }
                });
              }

            } catch (error) {
              this.logger.error(`Error processing email #${seqno}:`, error);
            }
          });
        });

        fetch.once('error', (err) => {
          this.logger.error(`Fetch error for workflow ${workflowId}:`, err);
        });

        fetch.once('end', () => {
          this.logger.debug(`Finished fetching emails for workflow ${workflowId}`);
        });
      });

    } catch (error) {
      this.logger.error(`Error fetching new emails for workflow ${workflowId}:`, error);
    }
  }

  /**
   * Trigger workflow execution with email data
   */
  private async triggerWorkflow(workflowId: string, emailData: any) {
    try {
      this.logger.log(`Triggering workflow ${workflowId} with email data`);

      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          emailEvent: emailData,
          triggeredAt: new Date().toISOString(),
          trigger: 'imap_polling'
        }
      });

      this.logger.log(`Successfully triggered workflow ${workflowId}`);
    } catch (error) {
      this.logger.error(`Error triggering workflow ${workflowId}:`, error);
      throw error;
    }
  }
}
