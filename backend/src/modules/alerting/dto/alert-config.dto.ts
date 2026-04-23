import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AlertChannel {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
}

export class AlertChannelConfigDto {
  @ApiPropertyOptional({ description: 'Email address for email channel' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'URL for webhook channel' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'HMAC secret for webhook signature verification' })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({ description: 'Slack incoming webhook URL' })
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string;
}

export class AlertConditionsDto {
  @ApiPropertyOptional({
    description: 'Alert on every failure',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  onEveryFailure?: boolean;

  @ApiPropertyOptional({
    description: 'Alert only when error rate exceeds this threshold (0-1)',
  })
  @IsOptional()
  errorRateThreshold?: number;

  @ApiPropertyOptional({
    description: 'Time window in minutes for error rate calculation',
    default: 60,
  })
  @IsOptional()
  errorRateWindowMinutes?: number;
}

export class CreateAlertConfigDto {
  @ApiProperty({ enum: AlertChannel, description: 'Alert channel type' })
  @IsEnum(AlertChannel)
  channel: AlertChannel;

  @ApiProperty({ description: 'Channel-specific configuration' })
  @IsObject()
  @ValidateNested()
  @Type(() => AlertChannelConfigDto)
  config: AlertChannelConfigDto;

  @ApiPropertyOptional({ description: 'Alert conditions' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AlertConditionsDto)
  conditions?: AlertConditionsDto;

  @ApiPropertyOptional({ description: 'Whether the alert config is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAlertConfigDto {
  @ApiPropertyOptional({ enum: AlertChannel, description: 'Alert channel type' })
  @IsOptional()
  @IsEnum(AlertChannel)
  channel?: AlertChannel;

  @ApiPropertyOptional({ description: 'Channel-specific configuration' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AlertChannelConfigDto)
  config?: AlertChannelConfigDto;

  @ApiPropertyOptional({ description: 'Alert conditions' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AlertConditionsDto)
  conditions?: AlertConditionsDto;

  @ApiPropertyOptional({ description: 'Whether the alert config is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
