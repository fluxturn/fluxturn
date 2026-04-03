import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';

@Controller()
export class HealthController {
  @Version(VERSION_NEUTRAL)
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'fluxturn-backend',
      version: '1.0.0',
      uptime: process.uptime(),
    };
  }
}