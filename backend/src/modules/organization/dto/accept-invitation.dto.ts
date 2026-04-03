import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Invitation token from the email' })
  @IsNotEmpty()
  @IsString()
  token: string;
}
