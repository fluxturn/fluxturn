import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBody, ApiHeader, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto, InviteMemberDto, UpdateMemberRoleDto, AcceptInvitationDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Organizations')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Create a new organization (user becomes owner)' })
  @ApiBody({ type: CreateOrganizationDto })
  async createOrganization(
    @Request() req,
    @Body() dto: CreateOrganizationDto
  ) {
    return this.organizationService.createOrganization({
      name: dto.name,
      ownerId: req.user.userId,
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get current user organization details' })
  async getMyOrganization(@Request() req) {
    // This endpoint is deprecated - use /user/list instead
    // Keeping for backward compatibility
    return {
      hasOrganization: false,
      message: 'Please use /organization/user/list endpoint instead',
    };
  }

  @Get('user/list')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'List all organizations for the current user' })
  async getUserOrganizations(@Request() req) {
    return this.organizationService.getUserOrganizations(req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to retrieve (required)',
    required: true,
  })
  async getOrganization(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.getOrganizationDetails(organizationId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get organization dashboard statistics' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to get stats for (required)',
    required: true,
  })
  async getOrganizationStats(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.getOrganizationStats(organizationId);
  }

  @Get('projects')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get all projects for an organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to get projects for (required)',
    required: true,
  })
  async getOrganizationProjects(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.getOrganizationProjects(organizationId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Update organization details' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to update (required)',
    required: true,
  })
  @ApiBody({ type: UpdateOrganizationDto })
  async updateOrganization(@Request() req, @Body() dto: UpdateOrganizationDto) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.updateOrganization(organizationId, req.user.userId, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Delete organization (owner only)' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to delete (required)',
    required: true,
  })
  async deleteOrganization(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.deleteOrganization(organizationId, req.user.userId);
  }

  // Member Management Endpoints

  @Get('members')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get all members of an organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to get members for (required)',
    required: true,
  })
  async getMembers(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.getMembers(organizationId);
  }

  @Post('members/invite')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to invite member to (required)',
    required: true,
  })
  @ApiBody({ type: InviteMemberDto })
  async inviteMember(@Request() req, @Body() dto: InviteMemberDto) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.inviteMember(
      organizationId,
      dto.email,
      dto.role,
      req.user.userId
    );
  }

  @Delete('members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to remove member from (required)',
    required: true,
  })
  @ApiParam({ name: 'userId', description: 'User ID of the member to remove' })
  async removeMember(@Request() req, @Param('userId') userId: string) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.removeMember(organizationId, userId, req.user.userId);
  }

  @Patch('members/role')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Update a member\'s role in the organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID (required)',
    required: true,
  })
  @ApiBody({ type: UpdateMemberRoleDto })
  async updateMemberRole(@Request() req, @Body() dto: UpdateMemberRoleDto) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.updateMemberRole(
      organizationId,
      dto.userId,
      dto.role,
      req.user.userId
    );
  }

  // Invitation Management Endpoints

  // Public endpoints (no auth required - token-based)
  // NO @UseGuards here - these are public
  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token (public endpoint)' })
  @ApiParam({ name: 'token', description: 'Invitation token from email' })
  async getInvitationByToken(@Param('token') token: string) {
    return this.organizationService.getInvitationByToken(token);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept an organization invitation by token (public endpoint)' })
  @ApiParam({ name: 'token', description: 'Invitation token from email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID (optional, if logged in)' }
      }
    }
  })
  async acceptInvitationByToken(@Param('token') token: string, @Body() body: { userId?: string }) {
    return this.organizationService.acceptInvitation(token, body.userId);
  }

  @Post('invitations/:token/decline')
  @ApiOperation({ summary: 'Decline an organization invitation by token (public endpoint)' })
  @ApiParam({ name: 'token', description: 'Invitation token from email' })
  async declineInvitationByToken(@Param('token') token: string) {
    return this.organizationService.declineInvitation(token);
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Get all pending invitations for an organization' })
  @ApiHeader({
    name: 'x-organization-id',
    description: 'Organization ID to get invitations for (required)',
    required: true,
  })
  async getInvitations(@Request() req) {
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required. Please provide x-organization-id header.');
    }
    return this.organizationService.getInvitations(organizationId);
  }

  @Post('invitations/:invitationId/resend')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Resend an organization invitation' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID to resend' })
  async resendInvitation(@Param('invitationId') invitationId: string) {
    return this.organizationService.resendInvitation(invitationId);
  }

  @Delete('invitations/:invitationId')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Cancel an organization invitation' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID to cancel' })
  async cancelInvitation(@Param('invitationId') invitationId: string) {
    return this.organizationService.cancelInvitation(invitationId);
  }

  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Accept an organization invitation' })
  @ApiBody({ type: AcceptInvitationDto })
  async acceptInvitation(@Request() req, @Body() dto: AcceptInvitationDto) {
    return this.organizationService.acceptInvitation(dto.token, req.user.userId);
  }

  @Post('invitations/decline')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('JWT')
  @ApiOperation({ summary: 'Decline an organization invitation' })
  @ApiBody({ type: AcceptInvitationDto })
  async declineInvitation(@Body() dto: AcceptInvitationDto) {
    return this.organizationService.declineInvitation(dto.token);
  }
}