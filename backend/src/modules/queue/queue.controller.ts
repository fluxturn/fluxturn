import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService, AuthContext } from './queue.service';
import {
  SendToQueueDto,
  ReceiveFromQueueDto,
  DeleteFromQueueDto
} from './dto/queue.dto';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats(@Request() req) {
    return this.queueService.getQueueStats();
  }

  @Get('jobs/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get job status' })
  async getJobStatus(@Request() req, @Param('jobId') jobId: string) {
    return this.queueService.getJobStatus(jobId);
  }

  @Post('jobs/:jobId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel job' })
  async cancelJob(@Request() req, @Param('jobId') jobId: string) {
    return this.queueService.cancelJob(jobId);
  }

  @Post('jobs/:jobId/retry')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retry failed job' })
  async retryJob(@Request() req, @Param('jobId') jobId: string) {
    return this.queueService.retryJob(jobId);
  }
}