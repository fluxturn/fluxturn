import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'User ID of the member to update' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['admin', 'member'], example: 'member', description: 'New role for the member' })
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';
}
