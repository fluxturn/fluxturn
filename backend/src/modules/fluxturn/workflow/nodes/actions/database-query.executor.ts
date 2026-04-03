import { Injectable, Optional } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { PlatformService } from '../../../../database/platform.service';

/**
 * Database Query Executor
 * Executes SQL database queries
 */
@Injectable()
export class DatabaseQueryExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['DATABASE_QUERY'];

  constructor(
    @Optional() private readonly platformService?: PlatformService,
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const results: NodeInputItem[] = [];

    for (const item of inputData) {
      const itemContext = this.buildItemContext(item, context);

      const query = this.resolveExpression(config.query, itemContext);
      const connection = config.connection;

      this.logger.log(`Executing database query on: ${connection}`);

      if (this.platformService && connection === 'platform') {
        try {
          const queryResult = await this.platformService.query(query);
          results.push({
            json: {
              success: true,
              query,
              connection,
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              executedAt: new Date().toISOString()
            }
          });
        } catch (error: any) {
          throw new Error(`Database query failed: ${error.message}`);
        }
      } else {
        // For other connections, return placeholder
        // TODO: Implement external database connections
        results.push({
          json: {
            success: true,
            query,
            connection,
            rows: [],
            rowCount: 0,
            executedAt: new Date().toISOString()
          }
        });
      }
    }

    return results;
  }
}
