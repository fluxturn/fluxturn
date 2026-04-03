import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../database/platform.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async check() {
    const services = await this.checkServices();
    const allHealthy = Object.values(services).every(status => status === 'connected');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: this.configService.get('NODE_ENV', 'development'),
      version: '1.0.0',
      services
    };
  }

  async getLiveness() {
    // Simple liveness check - if the app is running, it's alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  }

  async getReadiness() {
    const services = await this.checkServices();
    const isDatabaseReady = services.database === 'connected';
    
    if (!isDatabaseReady) {
      throw new Error('Service not ready: Database not connected');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services
    };
  }

  private async checkServices() {
    const services: Record<string, string> = {};

    // Check database connection
    try {
      await this.platformService.query('SELECT 1');
      services.database = 'connected';
    } catch (error) {
      this.logger.warn('Database health check failed:', error.message);
      services.database = 'disconnected';
    }

    // Check Redis connection (if configured)
    const redisHost = this.configService.get('REDIS_HOST');
    if (redisHost) {
      try {
        // For now, just check if Redis is configured
        // In production, you would actually ping Redis
        services.redis = 'configured';
      } catch (error) {
        services.redis = 'disconnected';
      }
    }

    // Check Elasticsearch connection (if configured)
    const elasticsearchHost = this.configService.get('ELASTICSEARCH_HOST');
    if (elasticsearchHost) {
      try {
        // For now, just check if Elasticsearch is configured
        // In production, you would actually ping Elasticsearch
        services.elasticsearch = 'configured';
      } catch (error) {
        services.elasticsearch = 'disconnected';
      }
    }

    // Check ClickHouse connection (if configured)
    const clickhouseHost = this.configService.get('CLICKHOUSE_HOST');
    if (clickhouseHost) {
      try {
        // For now, just check if ClickHouse is configured
        services.clickhouse = 'configured';
      } catch (error) {
        services.clickhouse = 'disconnected';
      }
    }

    // Check Qdrant connection (if configured)
    const qdrantHost = this.configService.get('QDRANT_HOST');
    if (qdrantHost) {
      try {
        // For now, just check if Qdrant is configured
        services.qdrant = 'configured';
      } catch (error) {
        services.qdrant = 'disconnected';
      }
    }

    return services;
  }
}