import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiHeader } from '@nestjs/swagger';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key-auth.guard';
import { DeadLetterService } from './dead-letter.service';
import { ListDeadLetterDto } from './dto/dead-letter.dto';

@ApiTags('dead-letter')
@Controller('dead-letter')
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
export class DeadLetterController {
  constructor(private readonly deadLetterService: DeadLetterService) {}

  @Get()
  @ApiOperation({ summary: 'List dead letter queue items' })
  @ApiResponse({ status: 200, description: 'List of DLQ items' })
  async listDeadLetterItems(
    @Query(new ValidationPipe({ transform: true })) query: ListDeadLetterDto,
    @Request() req: any,
  ) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.deadLetterService.listDeadLetterItems(orgId, {
      workflow_id: query.workflow_id,
      status: query.status,
      date_from: query.date_from,
      date_to: query.date_to,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dead letter queue item details' })
  @ApiResponse({ status: 200, description: 'DLQ item details with full context' })
  async getDeadLetterItem(@Param('id') id: string, @Request() req: any) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.deadLetterService.getDeadLetterItem(id, orgId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a dead letter queue item from point of failure' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  async retryDeadLetterItem(@Param('id') id: string, @Request() req: any) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.deadLetterService.retryFromDeadLetter(id, orgId);
  }

  @Post(':id/discard')
  @ApiOperation({ summary: 'Discard a dead letter queue item' })
  @ApiResponse({ status: 200, description: 'Item discarded' })
  async discardDeadLetterItem(@Param('id') id: string, @Request() req: any) {
    const orgId = req.headers['x-organization-id'] || req.auth?.organizationId;
    return this.deadLetterService.discardDeadLetterItem(id, orgId);
  }
}
