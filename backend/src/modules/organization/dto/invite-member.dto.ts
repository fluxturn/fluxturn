import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address of the user to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['admin', 'member'], example: 'member', description: 'Role to assign to the invited member' })
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';

  @ApiProperty({ required: false, description: 'Optional message to include in the invitation email' })
  @IsOptional()
  @IsString()
  message?: string;
}
