import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiSecurity,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../../auth/guards/jwt-or-api-key-auth.guard';
import { MetricsService, TimeRange } from './metrics.service';

const VALID_RANGES: TimeRange[] = ['24h', '7d', '30d'];

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('executions')
  @ApiOperation({
    summary: 'Get workflow execution metrics',
    description:
      'Returns success/failure rates, latency percentiles, time-series data, top failing workflows, and per-connector error rates.',
  })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: VALID_RANGES,
    description: 'Time range for metrics (default: 7d)',
  })
  @ApiResponse({ status: 200, description: 'Execution metrics returned' })
  async getExecutionMetrics(
    @Query('range') range: string | undefined,
    @Request() req: any,
  ) {
    const organizationId =
      req.headers['x-organization-id'] || req.auth?.organizationId;

    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required. Provide it via x-organization-id header or ensure your API key has organization context.',
      );
    }

    const timeRange: TimeRange =
      range && VALID_RANGES.includes(range as TimeRange)
        ? (range as TimeRange)
        : '7d';

    return this.metricsService.getExecutionMetrics(organizationId, timeRange);
  }
}
