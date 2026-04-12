import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecretsService } from './secrets.service';

@Controller('secrets')
@UseGuards(JwtAuthGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  /**
   * GET /secrets - List secret names (NOT values)
   */
  @Get()
  async listSecrets(): Promise<{ names: string[] }> {
    const names = await this.secretsService.listSecrets();
    return { names };
  }

  /**
   * POST /secrets - Create or update a secret
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async setSecret(
    @Body() body: { name: string; value: string },
  ): Promise<{ success: boolean; name: string }> {
    if (!body.name || typeof body.name !== 'string') {
      throw new BadRequestException('name is required');
    }
    if (!body.value || typeof body.value !== 'string') {
      throw new BadRequestException('value is required');
    }

    await this.secretsService.setSecret(body.name, body.value);
    return { success: true, name: body.name };
  }

  /**
   * DELETE /secrets/:name - Delete a secret
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  async deleteSecret(
    @Param('name') name: string,
  ): Promise<{ success: boolean; name: string }> {
    await this.secretsService.deleteSecret(name);
    return { success: true, name };
  }

  /**
   * POST /secrets/:name/test - Test that a secret can be resolved
   * Returns boolean, never the value itself.
   */
  @Post(':name/test')
  @HttpCode(HttpStatus.OK)
  async testSecret(
    @Param('name') name: string,
  ): Promise<{ exists: boolean; name: string }> {
    const value = await this.secretsService.getSecret(name);
    return { exists: value !== null, name };
  }
}
