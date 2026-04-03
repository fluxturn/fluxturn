import { Injectable, BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { PlatformService } from '../database';
import { EmailService } from '../email/email.service';
import { Organization, Project, CreateOrganizationInput, OrganizationInvitation } from '../auth/interfaces';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly platformService: PlatformService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new organization
   */
  async createOrganization(input: CreateOrganizationInput): Promise<{
    success: boolean;
    message: string;
    organizationId: string;
    organization: Organization;
    projects: Project[];
    members: any[];
  }> {
    try {
      this.logger.log(`Creating organization with name: ${input.name}, ownerId: ${input.ownerId}`);
      const organization = await this.platformService.createOrganization(input);
      this.logger.log(`Organization created successfully: ${JSON.stringify(organization)}`);

      // Fetch projects for this organization
      const projects = await this.platformService.getProjectsByOrganizationId(organization.id);

      return {
        success: true,
        message: 'Organization created successfully',
        organizationId: organization.id,
        organization,
        projects,
        members: [], // Members not implemented yet
      };
    } catch (error: any) {
      this.logger.error('Failed to create organization:', error);
      this.logger.error('Error stack:', error.stack);
      
      // Handle common errors with user-friendly messages
      if (error.message?.includes('duplicate key') && error.message?.includes('organizations_name_key')) {
        throw new BadRequestException('An organization with this name already exists. Please choose a different name.');
      }
      if (error.message?.includes('duplicate key') && error.message?.includes('organization_members')) {
        throw new BadRequestException('You are already a member of this organization.');
      }
      
      // Generic error for other cases
      throw new BadRequestException('Failed to create organization. Please try again or contact support if the issue persists.');
    }
  }

  /**
   * Get organization by ID with projects
   */
  async getOrganizationDetails(organizationId: string): Promise<{
    organization: Organization;
    projects: Project[];
    members: any[];
  }> {
    try {
      const organization = await this.platformService.getOrganizationById(organizationId);
      if (!organization) {
        throw new BadRequestException('Organization not found');
      }

      const projects = await this.platformService.getProjectsByOrganizationId(organizationId);
      
      return {
        organization,
        projects,
        members: [], // Members functionality not implemented yet
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch organization:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch organization details');
    }
  }

  /**
   * Get all organizations for a user
   */
  async getUserOrganizations(userId: string): Promise<{
    data: Organization[];
    total: number;
  }> {
    try {
      // Get organizations where user is owner or member
      const organizations = await this.platformService.getOrganizationsByUserId(userId);
      
      return {
        data: organizations || [],
        total: organizations?.length || 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch user organizations:', error);
      // Return empty array instead of throwing error for better UX
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Get all projects for an organization
   */
  async getOrganizationProjects(organizationId: string): Promise<{
    data: Project[];
    total: number;
  }> {
    try {
      const projects = await this.platformService.getProjectsByOrganizationId(organizationId);
      
      return {
        data: projects || [],
        total: projects?.length || 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch organization projects:', error);
      // Return empty array instead of throwing error for better UX
      return {
        data: [],
        total: 0,
      };
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(organizationId: string, userId: string, updates: Partial<Organization>): Promise<Organization> {
    try {
      // Check if organization exists
      const organization = await this.platformService.getOrganizationById(organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check if user is owner or admin
      const members = await this.platformService.getOrganizationMembers(organizationId);
      const member = members.find(m => m.userId === userId);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new ForbiddenException('Only organization owners and admins can update organization settings');
      }

      // Update organization
      const updated = await this.platformService.updateOrganization(organizationId, updates);
      this.logger.log(`Organization ${organizationId} updated by user ${userId}`);

      return updated;
    } catch (error: any) {
      this.logger.error('Failed to update organization:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update organization');
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if organization exists
      const organization = await this.platformService.getOrganizationById(organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check if user is owner
      const members = await this.platformService.getOrganizationMembers(organizationId);
      const member = members.find(m => m.userId === userId);
      if (!member || member.role !== 'owner') {
        throw new ForbiddenException('Only organization owners can delete the organization');
      }

      // Delete organization (this will cascade delete all projects, apps, etc.)
      const deleted = await this.platformService.deleteOrganization(organizationId);

      if (deleted) {
        this.logger.log(`Organization ${organizationId} deleted by owner ${userId}`);
        return {
          success: true,
          message: 'Organization and all associated data deleted successfully'
        };
      } else {
        throw new BadRequestException('Failed to delete organization');
      }
    } catch (error: any) {
      this.logger.error('Failed to delete organization:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete organization');
    }
  }

  /**
   * Invite member to organization
   */
  async inviteMember(organizationId: string, email: string, role: 'admin' | 'member', invitedById: string): Promise<OrganizationInvitation> {
    try {
      // Check if user exists
      const existingUser = await this.platformService.getUserByEmail(email);

      // Check if user is already a member
      if (existingUser) {
        const members = await this.platformService.getOrganizationMembers(organizationId);
        const isMember = members.some((m) => m.userId === existingUser.id);
        if (isMember) {
          throw new BadRequestException('User is already an organization member');
        }
      }

      // Get organization details for email
      const organization = await this.platformService.getOrganizationById(organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Get inviter details
      const inviter = await this.platformService.getUserById(invitedById);
      if (!inviter) {
        throw new NotFoundException('Inviter not found');
      }

      // Create invitation
      const invitation = await this.platformService.createOrganizationInvitation({
        organizationId,
        email,
        role,
        invitedBy: invitedById,
      });

      // Send invitation email
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
        const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p><strong>${inviterName}</strong> has invited you to join <strong>${organization.name}</strong> as a <strong>${role}</strong>.</p>
                <p>Click the button below to accept the invitation:</p>
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${inviteUrl}</p>
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
              </div>
              <div class="footer">
                <p>Powered by FluxTurn</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await this.emailService.sendEmail({
          to: [email],
          from: process.env.EMAIL_FROM || 'noreply@fluxturn.com',
          subject: `You've been invited to join ${organization.name}`,
          html,
          organizationId,
        });

        this.logger.log(`Organization invitation sent to ${email} for organization ${organizationId}`);
      } catch (emailError) {
        this.logger.error(`Failed to send invitation email to ${email}`, emailError);
        // Don't fail the invitation if email fails
      }

      return invitation;
    } catch (error) {
      this.logger.error(`Failed to invite organization member: ${email} to organization ${organizationId}`, error);
      throw error;
    }
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string): Promise<any[]> {
    try {
      return await this.platformService.getOrganizationMembers(organizationId);
    } catch (error: any) {
      this.logger.error('Failed to fetch organization members:', error);
      throw new BadRequestException('Failed to fetch organization members');
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, requesterId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if requester is admin/owner
      const members = await this.platformService.getOrganizationMembers(organizationId);
      const requester = members.find((m) => m.userId === requesterId);

      if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
        throw new BadRequestException('Only organization owners and admins can remove members');
      }

      // Don't allow removing the owner
      const targetMember = members.find((m) => m.userId === userId);
      if (targetMember && targetMember.role === 'owner') {
        throw new BadRequestException('Cannot remove organization owner');
      }

      await this.platformService.removeOrganizationMember(organizationId, userId);

      return {
        success: true,
        message: 'Member removed successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to remove organization member:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to remove organization member');
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, userId: string, role: 'admin' | 'member', requesterId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if requester is admin/owner
      const members = await this.platformService.getOrganizationMembers(organizationId);
      const requester = members.find((m) => m.userId === requesterId);

      if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
        throw new BadRequestException('Only organization owners and admins can update member roles');
      }

      // Don't allow changing the owner role
      const targetMember = members.find((m) => m.userId === userId);
      if (targetMember && targetMember.role === 'owner') {
        throw new BadRequestException('Cannot change organization owner role');
      }

      await this.platformService.updateOrganizationMemberRole(organizationId, userId, role);

      return {
        success: true,
        message: 'Member role updated successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to update member role:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update member role');
    }
  }

  /**
   * Get organization invitations
   */
  async getInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      return await this.platformService.getOrganizationInvitations(organizationId);
    } catch (error: any) {
      this.logger.error('Failed to fetch organization invitations:', error);
      throw new BadRequestException('Failed to fetch organization invitations');
    }
  }

  /**
   * Get invitation by token (public endpoint)
   */
  async getInvitationByToken(token: string): Promise<any> {
    try {
      const invitation = await this.platformService.getOrganizationInvitation(token);

      if (!invitation) {
        throw new NotFoundException('Invitation not found or has expired');
      }

      // Get organization details
      const organization = await this.platformService.getOrganizationById(invitation.organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Get inviter details
      const inviter = await this.platformService.getUserById(invitation.invitedBy);

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email : 'Unknown',
        createdAt: invitation.createdAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch invitation by token:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch invitation');
    }
  }

  /**
   * Resend organization invitation
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get invitation details before resending
      const invitations = await this.platformService.query<any>(`
        SELECT * FROM organization_invitations
        WHERE id = $1 AND status = 'pending'
      `, [invitationId]);

      if (invitations.rows.length === 0) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      const invitation = invitations.rows[0];

      // Update expiration date
      const success = await this.platformService.resendOrganizationInvitation(invitationId);

      if (!success) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      // Get organization and inviter details for email
      const organization = await this.platformService.getOrganizationById(invitation.organization_id);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      const inviter = await this.platformService.getUserById(invitation.invited_by);
      if (!inviter) {
        throw new NotFoundException('Inviter not found');
      }

      // Resend invitation email
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
        const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reminder: You're Invited!</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p><strong>${inviterName}</strong> has invited you to join <strong>${organization.name}</strong> as a <strong>${invitation.role}</strong>.</p>
                <p>Click the button below to accept the invitation:</p>
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${inviteUrl}</p>
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
              </div>
              <div class="footer">
                <p>Powered by FluxTurn</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await this.emailService.sendEmail({
          to: [invitation.email],
          from: process.env.EMAIL_FROM || 'noreply@fluxturn.com',
          subject: `Reminder: You've been invited to join ${organization.name}`,
          html,
          organizationId: invitation.organization_id,
        });

        this.logger.log(`Organization invitation resent to ${invitation.email} for organization ${invitation.organization_id}`);
      } catch (emailError) {
        this.logger.error(`Failed to resend invitation email to ${invitation.email}`, emailError);
        // Don't fail if email fails - the invitation was still updated
      }

      return {
        success: true,
        message: 'Invitation resent successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to resend invitation:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to resend invitation');
    }
  }

  /**
   * Cancel organization invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.platformService.cancelOrganizationInvitation(invitationId);

      if (!success) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to cancel invitation:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to cancel invitation');
    }
  }

  /**
   * Accept organization invitation
   */
  async acceptInvitation(token: string, userId?: string): Promise<{ success: boolean; message: string; type: string; organizationId: string }> {
    try {
      // Get invitation details first
      const invitation = await this.platformService.getOrganizationInvitation(token);

      if (!invitation) {
        throw new BadRequestException('Invalid or expired invitation token');
      }

      // If no userId provided, check if user exists with invitation email
      if (!userId) {
        const user = await this.platformService.getUserByEmail(invitation.email);
        if (!user) {
          throw new BadRequestException('Please create an account or log in first');
        }
        userId = user.id;
      }

      const success = await this.platformService.acceptOrganizationInvitation(token, userId);

      if (!success) {
        throw new BadRequestException('Failed to accept invitation');
      }

      return {
        success: true,
        message: 'Invitation accepted successfully',
        type: 'ORGANIZATION',
        organizationId: invitation.organizationId,
      };
    } catch (error: any) {
      this.logger.error('Failed to accept invitation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to accept invitation');
    }
  }

  /**
   * Decline organization invitation
   */
  async declineInvitation(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.platformService.declineOrganizationInvitation(token);

      if (!success) {
        throw new BadRequestException('Invalid or expired invitation token');
      }

      return {
        success: true,
        message: 'Invitation declined successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to decline invitation:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to decline invitation');
    }
  }

  /**
   * Get organization members (legacy method, keeping for compatibility)
   */
  async getOrganizationMembers(organizationId: string): Promise<any[]> {
    return this.getMembers(organizationId);
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(organizationId: string, settings: any): Promise<{ success: boolean; message: string }> {
    try {
      // This would require implementing updateOrganizationSettings in PlatformService
      // For now, throw not implemented error
      throw new BadRequestException('Organization settings functionality not yet implemented');
    } catch (error: any) {
      this.logger.error('Failed to update organization settings:', error);
      throw new BadRequestException('Failed to update organization settings');
    }
  }

  /**
   * Get organization dashboard statistics
   */
  async getOrganizationStats(organizationId: string) {
    try {
      this.logger.log(`Fetching stats for organization: ${organizationId}`);

      const stats = await this.platformService.query(`
        SELECT
          (SELECT COUNT(*) FROM organization_members WHERE organization_id = $1) as member_count,
          (SELECT COUNT(*) FROM projects WHERE organization_id = $1) as project_count,
          (SELECT COUNT(*) FROM workflows WHERE organization_id = $1) as workflow_count,
          (SELECT COALESCE(SUM(size), 0) FROM file_metadata WHERE organization_id = $1) as storage_bytes,
          (SELECT COUNT(*) FROM email_logs WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '30 days') as emails_sent_30d,
          (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '30 days') as active_users_30d
      `, [organizationId]);

      // Get workflow execution metrics
      const workflowMetrics = await this.platformService.query(`
        SELECT
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
          AVG(duration_ms) as avg_duration_ms
        FROM workflow_executions
        WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      `, [organizationId]);

      // Get storage breakdown by content type
      const storageBreakdown = await this.platformService.query(`
        SELECT
          content_type,
          COUNT(*) as file_count,
          SUM(size) as total_size
        FROM file_metadata
        WHERE organization_id = $1
        GROUP BY content_type
        ORDER BY total_size DESC
        LIMIT 10
      `, [organizationId]);

      // Get recent activity from audit logs
      const recentActivity = await this.platformService.query(`
        SELECT
          al.id,
          al.action,
          al.resource_type,
          al.resource_id,
          al.created_at,
          u.email as user_email,
          COALESCE(u.full_name, u.first_name, u.email) as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.organization_id = $1
        ORDER BY al.created_at DESC
        LIMIT 10
      `, [organizationId]);

      // Get team members with their activity
      const teamMembers = await this.platformService.query(`
        SELECT
          om.id,
          om.role,
          om.joined_at,
          u.email,
          u.full_name,
          u.avatar_url,
          (SELECT COUNT(*) FROM audit_logs WHERE user_id = u.id AND organization_id = $1 AND created_at > NOW() - INTERVAL '7 days') as actions_last_7d,
          (SELECT MAX(created_at) FROM audit_logs WHERE user_id = u.id AND organization_id = $1) as last_active
        FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE om.organization_id = $1
        ORDER BY om.joined_at ASC
      `, [organizationId]);

      const baseStats = stats.rows[0] || {};
      const workflowStats = workflowMetrics.rows[0] || {};

      return {
        overview: {
          memberCount: parseInt(baseStats.member_count) || 0,
          projectCount: parseInt(baseStats.project_count) || 0,
          workflowCount: parseInt(baseStats.workflow_count) || 0,
          storageBytes: parseInt(baseStats.storage_bytes) || 0,
          storageMB: ((parseInt(baseStats.storage_bytes) || 0) / 1024 / 1024).toFixed(2),
          storageGB: ((parseInt(baseStats.storage_bytes) || 0) / 1024 / 1024 / 1024).toFixed(2),
          emailsSent30d: parseInt(baseStats.emails_sent_30d) || 0,
          activeUsers30d: parseInt(baseStats.active_users_30d) || 0,
        },
        workflows: {
          totalExecutions: parseInt(workflowStats.total_executions) || 0,
          successfulExecutions: parseInt(workflowStats.successful_executions) || 0,
          failedExecutions: parseInt(workflowStats.failed_executions) || 0,
          successRate: workflowStats.total_executions > 0
            ? ((workflowStats.successful_executions / workflowStats.total_executions) * 100).toFixed(2)
            : '0',
          avgDurationMs: parseFloat(workflowStats.avg_duration_ms) || 0,
        },
        storage: {
          breakdown: storageBreakdown.rows.map(item => ({
            contentType: item.content_type,
            fileCount: parseInt(item.file_count),
            totalSize: parseInt(item.total_size),
            totalSizeMB: (parseInt(item.total_size) / 1024 / 1024).toFixed(2),
          }))
        },
        recentActivity: recentActivity.rows.map(activity => ({
          id: activity.id,
          action: activity.action,
          resourceType: activity.resource_type,
          resourceId: activity.resource_id,
          userName: activity.user_name || activity.user_email || 'Unknown User',
          userEmail: activity.user_email,
          timestamp: activity.created_at,
        })),
        teamMembers: teamMembers.rows.map(member => ({
          id: member.id,
          role: member.role,
          email: member.email,
          displayName: member.full_name,
          profileImage: member.avatar_url,
          joinedAt: member.joined_at,
          actionsLast7d: parseInt(member.actions_last_7d) || 0,
          lastActive: member.last_active,
          status: this.getUserStatus(member.last_active),
        }))
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch organization stats:', error);
      throw new BadRequestException('Failed to fetch organization statistics');
    }
  }

  private getUserStatus(lastActive: Date | null): 'online' | 'away' | 'offline' {
    if (!lastActive) return 'offline';
    const now = new Date();
    const diff = now.getTime() - new Date(lastActive).getTime();
    const minutes = diff / 1000 / 60;

    if (minutes < 5) return 'online';
    if (minutes < 60) return 'away';
    return 'offline';
  }
}