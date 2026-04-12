import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../../database/platform.service';
import * as crypto from 'crypto';

/**
 * IdempotencyService prevents duplicate workflow executions caused by
 * the same webhook event being delivered more than once.
 *
 * The idempotency key is derived from:
 *   hash(webhook_url + request_body + timestamp_bucket)
 *
 * where timestamp_bucket = floor(timestamp / window_size).
 *
 * Before creating a new execution the webhook handler calls
 * `isDuplicate(key)` -- if an execution with that key already exists
 * within the dedup window the webhook is silently skipped.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  /** Default deduplication window in seconds (5 minutes). */
  private readonly windowSeconds: number;

  constructor(
    private readonly platformService: PlatformService,
    private readonly configService: ConfigService,
  ) {
    this.windowSeconds = this.configService.get<number>(
      'IDEMPOTENCY_WINDOW_SECONDS',
      300,
    );
  }

  /**
   * Derive an idempotency key from webhook URL, body, and current time.
   */
  generateKey(webhookUrl: string, body: string | object): string {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const bucket = Math.floor(Date.now() / 1000 / this.windowSeconds);
    const raw = `${webhookUrl}:${bodyStr}:${bucket}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Returns `true` if an execution with the given key already exists
   * within the configured dedup window (i.e. this is a duplicate).
   */
  async isDuplicate(idempotencyKey: string): Promise<boolean> {
    try {
      const result = await this.platformService.query(
        `SELECT id FROM workflow_executions
         WHERE idempotency_key = $1
           AND started_at >= NOW() - INTERVAL '${this.windowSeconds} seconds'
         LIMIT 1`,
        [idempotencyKey],
      );
      return result.rows.length > 0;
    } catch (error) {
      // If the column doesn't exist yet (migration pending) never block
      this.logger.warn(
        'Idempotency check failed -- allowing execution',
        error.message,
      );
      return false;
    }
  }
}
