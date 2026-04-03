import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-09-16T09:10:04.181Z' },
        uptime: { type: 'number', example: 123456 },
        environment: { type: 'string', example: 'production' },
        version: { type: 'string', example: '1.0.0' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            redis: { type: 'string', example: 'connected' },
            elasticsearch: { type: 'string', example: 'connected' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy' 
  })
  async check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is alive' 
  })
  async live() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is ready' 
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is not ready' 
  })
  async ready() {
    return this.healthService.getReadiness();
  }
}