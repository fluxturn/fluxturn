import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PlatformService } from "../database/platform.service";
import { EmailService } from "../email/email.service";
import { StorageService } from "../storage/storage.service";
import { ChangePasswordDto, UpdateProfileDto } from "./dto/auth.dto";
import { CreateUserInput, PlatformUser, ProjectInvitation } from "./interfaces";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    role?: string;
    organizationId?: string;
    projectId?: string;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username?: string;
  fullName?: string;
  role?: string;
  organizationId?: string;
  projectId?: string;
}

export interface ApiKeyValidationResult {
  type: "apikey";
  apiKey: string;
  projectId?: string;
  appId?: string;
  organizationId: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    private readonly storageService: StorageService
  ) {}

  /**
   * Log user activity to audit log
   */
  private async logUserActivity(
    userId: string | null,
    action: string,
    description: string,
    metadata?: Record<string, any>,
    request?: any
  ): Promise<void> {
    try {
      const auditData = {
        userId,
        action,
        resourceType: 'auth',
        details: {
          description,
          ...metadata,
        },
        ipAddress: request?.ip || request?.connection?.remoteAddress,
        userAgent: request?.headers?.['user-agent'],
      };

      await this.platformService.createAuditLog(auditData);
    } catch (error) {
      this.logger.error(`Failed to log user activity: ${action}`, error);
    }
  }

  async registerUser(
    input: RegisterInput
  ): Promise<{ userId: string; email: string; message: string }> {
    try {
      // Check if user already exists
      const existingUser = await this.platformService.getUserByEmail(
        input.email
      );
      if (existingUser) {
        throw new BadRequestException("Email already registered");
      }

      // Split the full name into firstName and lastName
      const nameParts = input.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // If no last name, use first name as last name

      // Create user input
      const createUserInput: CreateUserInput = {
        email: input.email,
        password: input.password,
        firstName: firstName,
        lastName: lastName,
        organizationId: null, // Will be set when user joins/creates an organization
        role: "member",
      };

      const user = await this.platformService.createUser(createUserInput);

      // Log registration activity
      await this.logUserActivity(
        user.id,
        'user_registered',
        `New user registered: ${user.email}`,
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      );

      // Auto-create organization and project for new user
      try {
        // Create organization with user's name
        const orgName = `${firstName}'s Workspace`;
        const organization = await this.platformService.createOrganization({
          name: orgName,
          ownerId: user.id,
          description: `Default workspace for ${firstName}`,
        });

        this.logger.log(`Auto-created organization "${orgName}" for user: ${user.email}`);

        // Create default project "My Project" in the organization
        const project = await this.platformService.createProject({
          name: 'My Project',
          description: 'Your first project',
          organizationId: organization.id,
        });

        this.logger.log(`Auto-created project "My Project" for user: ${user.email}`);

        // Log organization and project creation
        await this.logUserActivity(
          user.id,
          'auto_setup_completed',
          `Auto-created organization and project for new user`,
          {
            organizationId: organization.id,
            organizationName: orgName,
            projectId: project.id,
            projectName: 'My Project',
          }
        );
      } catch (setupError) {
        // Log the error but don't fail registration
        this.logger.error(`Failed to auto-create organization/project for user: ${user.email}`, setupError);
      }

      // Generate verification token
      const verificationToken =
        await this.platformService.generateVerificationToken(user.id);

      // Send verification email
      await this.sendVerificationEmail(
        user.email,
        verificationToken,
        `${user.firstName} ${user.lastName}`.trim()
      );

      this.logger.log(`User registered successfully: ${user.email}`);

      return {
        userId: user.id,
        email: user.email,
        message:
          "Registration successful. Please check your email to verify your account.",
      };
    } catch (error) {
      this.logger.error(`Failed to register user: ${input.email}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to register user");
    }
  }

  async validateUserCredentials(
    email: string,
    password: string
  ): Promise<PlatformUser | null> {
    try {
      const user = await this.platformService.validateUserCredentials(
        email,
        password
      );
      if (user) {
        this.logger.debug(`User credentials validated: ${email}`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Failed to validate credentials for: ${email}`, error);
      return null;
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    try {
      // Validate user credentials
      const user = await this.validateUserCredentials(
        input.email,
        input.password
      );

      if (!user) {
        throw new UnauthorizedException("Invalid email or password");
      }

      // Generate tokens
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        username: user.email.split("@")[0], // Generate username from email
        fullName:
          `${user.firstName} ${user.lastName}`.trim() ||
          user.email.split("@")[0],
        role: user.role || 'user',
        organizationId: user.organizationId,
        projectId: null, // Projects are specific to organizations
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "30d" });

      // Log login activity
      await this.logUserActivity(
        user.id,
        'user_login',
        `User logged in: ${user.email}`,
        {
          email: user.email,
          loginMethod: 'password',
        }
      );

      this.logger.log(`User logged in successfully: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: payload.username,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: payload.fullName,
          role: user.role || 'user',
          organizationId: user.organizationId || null,
          projectId: null,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to login user: ${input.email}`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid email or password");
    }
  }

  async getUserById(id: string): Promise<PlatformUser | null> {
    try {
      return await this.platformService.getUserById(id);
    } catch (error) {
      this.logger.error(`Failed to get user by ID: ${id}`, error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;

      // Get fresh user data from database
      let user: PlatformUser | null = null;
      try {
        user = await this.getUserById(payload.sub);
      } catch (error) {
        this.logger.warn(
          `Could not fetch fresh user data for token refresh: ${payload.sub}`
        );
      }

      // Create new payload with fresh data or fallback to token data
      const newPayload: JwtPayload = {
        sub: user?.id || payload.sub,
        email: user?.email || payload.email,
        username: payload.username || payload.email.split("@")[0],
        fullName: user
          ? `${user.firstName} ${user.lastName}`.trim()
          : payload.fullName,
        role: user?.role || payload.role || 'user',
        organizationId: user?.organizationId || payload.organizationId,
        projectId: payload.projectId,
      };

      // Generate new access token (refresh token remains the same)
      const accessToken = this.jwtService.sign(newPayload);

      this.logger.debug(`Token refreshed for user: ${newPayload.email}`);

      return {
        accessToken,
        refreshToken, // Keep the same refresh token
        user: {
          id: newPayload.sub,
          email: newPayload.email,
          username: newPayload.username || newPayload.email.split("@")[0],
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          fullName: newPayload.fullName || newPayload.email.split("@")[0],
          role: newPayload.role || 'user',
          organizationId: newPayload.organizationId || null,
          projectId: newPayload.projectId || null,
        },
      };
    } catch (error) {
      this.logger.error("Failed to refresh token", error);
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult | null> {
    try {
      // Validate API key using platform service
      const keyInfo = await this.platformService.validateApiKey(apiKey);

      if (!keyInfo) {
        return null;
      }

      this.logger.debug(`API key validated: ${keyInfo.name}`);

      return {
        type: "apikey",
        apiKey: keyInfo.key,
        projectId: keyInfo.projectId,
        appId: keyInfo.appId,
        organizationId: keyInfo.organizationId,
        permissions: keyInfo.permissions || [],
      };
    } catch (error) {
      this.logger.error(`Failed to validate API key`, error);
      return null;
    }
  }

  async validateJwtPayload(payload: any): Promise<any> {
    // This method is called by the JWT strategy to validate the payload
    // We can add additional validation logic here if needed
    try {
      // Optionally, verify that the user still exists and is active
      const user = await this.getUserById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException("User account is inactive");
      }

      // Fetch user's organization role if they belong to an organization
      let userRole: string | undefined = undefined;
      if (payload.organizationId) {
        try {
          const roleResult = await this.platformService.query(
            `SELECT role FROM organization_members
             WHERE organization_id = $1 AND user_id = $2`,
            [payload.organizationId, payload.sub]
          );

          if (roleResult.rows.length > 0) {
            userRole = roleResult.rows[0].role;
          }
        } catch (roleError) {
          this.logger.warn(
            `Failed to fetch organization role for user ${payload.sub} in org ${payload.organizationId}`,
            roleError
          );
          // Don't fail the validation if role fetch fails
        }
      }

      return {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        fullName: payload.fullName,
        organizationId: payload.organizationId,
        projectId: payload.projectId,
        role: userRole, // Include the organization role
      };
    } catch (error) {
      this.logger.error(
        `JWT payload validation failed for user: ${payload.sub}`,
        error
      );
      throw new UnauthorizedException("Invalid token payload");
    }
  }

  // ============= PROJECT MEMBER INVITATION METHODS =============

  async inviteProjectMember(
    projectId: string,
    email: string,
    role: "admin" | "member" | "viewer",
    invitedById: string
  ): Promise<ProjectInvitation> {
    try {
      // Check if user exists
      const existingUser = await this.platformService.getUserByEmail(email);

      // Check if user is already a member
      if (existingUser) {
        const members = await this.platformService.getProjectMembers(projectId);
        const isMember = members.some((m) => m.userId === existingUser.id);
        if (isMember) {
          throw new BadRequestException("User is already a project member");
        }
      }

      // Get project details for email
      const project = await this.platformService.getProjectById(projectId);
      if (!project) {
        throw new BadRequestException("Project not found");
      }

      // Get inviter details
      const inviter = await this.platformService.getUserById(invitedById);
      if (!inviter) {
        throw new BadRequestException("Inviter not found");
      }

      // Create invitation
      const invitation = await this.platformService.createProjectInvitation({
        projectId,
        email,
        role,
        invitedBy: invitedById,
      });

      // Send invitation email
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/project/${invitation.token}`;

        await this.emailService.sendEmail({
          to: [email],
          from: process.env.EMAIL_FROM || "noreply@fluxturn.com",
          subject: `You've been invited to join ${project.name}`,
          templateId: "invitation",
          templateData: {
            inviteeName: email.split("@")[0],
            inviterName:
              `${inviter.firstName} ${inviter.lastName}`.trim() ||
              inviter.email,
            appName: project.name,
            role: role,
            inviteLink: inviteUrl,
          },
        });

        this.logger.log(
          `Project invitation sent to ${email} for project ${projectId}`
        );
      } catch (emailError) {
        this.logger.error(
          `Failed to send invitation email to ${email}`,
          emailError
        );
        // Don't fail the invitation if email fails
      }

      return invitation;
    } catch (error) {
      this.logger.error(
        `Failed to invite project member: ${email} to project ${projectId}`,
        error
      );
      throw error;
    }
  }

  async acceptProjectInvitation(
    token: string,
    userId: string
  ): Promise<boolean> {
    try {
      const result = await this.platformService.acceptProjectInvitation(
        token,
        userId
      );

      if (result) {
        this.logger.log(
          `Project invitation accepted: token=${token}, userId=${userId}`
        );

        // Send welcome email
        const user = await this.platformService.getUserById(userId);
        if (user) {
          try {
            await this.emailService.sendEmail({
              to: [user.email],
              from: process.env.EMAIL_FROM || "noreply@fluxturn.com",
              subject: "Welcome to the project!",
              templateId: "welcome",
              templateData: {
                userName:
                  `${user.firstName} ${user.lastName}`.trim() ||
                  user.email.split("@")[0],
                appName: "FluxTurn Project",
              },
            });
          } catch (emailError) {
            this.logger.error(
              `Failed to send welcome email to ${user.email}`,
              emailError
            );
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to accept project invitation: token=${token}`,
        error
      );
      return false;
    }
  }

  async declineProjectInvitation(token: string): Promise<boolean> {
    try {
      return await this.platformService.declineProjectInvitation(token);
    } catch (error) {
      this.logger.error(
        `Failed to decline project invitation: token=${token}`,
        error
      );
      return false;
    }
  }

  async getProjectMembers(projectId: string) {
    try {
      return await this.platformService.getProjectMembers(projectId);
    } catch (error) {
      this.logger.error(`Failed to get project members: ${projectId}`, error);
      return [];
    }
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    try {
      await this.platformService.removeProjectMember(projectId, userId);
      this.logger.log(`Removed member ${userId} from project ${projectId}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove project member: ${userId} from ${projectId}`,
        error
      );
      throw error;
    }
  }

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    role: string
  ): Promise<void> {
    try {
      await this.platformService.updateProjectMemberRole(
        projectId,
        userId,
        role
      );
      this.logger.log(
        `Updated member ${userId} role to ${role} in project ${projectId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update project member role: ${userId} in ${projectId}`,
        error
      );
      throw error;
    }
  }

  // ============= EMAIL VERIFICATION & PASSWORD RESET =============

  async verifyEmail(
    token: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = await this.platformService.verifyEmailToken(token);

      if (!userId) {
        throw new BadRequestException("Invalid or expired verification token");
      }

      await this.platformService.markEmailAsVerified(userId);

      // Log email verification activity
      await this.logUserActivity(
        userId,
        'email_verified',
        'User verified their email address',
        {
          verificationMethod: 'email_token',
        }
      );

      this.logger.log(`Email verified for user: ${userId}`);

      return {
        success: true,
        message: "Email verified successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to verify email with token: ${token}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to verify email");
    }
  }

  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.platformService.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message:
            "If an account exists with this email, a password reset link has been sent",
        };
      }

      // Generate reset token
      const resetToken = await this.platformService.generatePasswordResetToken(
        user.id
      );

      // Send reset email
      await this.sendPasswordResetEmail(
        user.email,
        resetToken,
        `${user.firstName} ${user.lastName}`.trim() || user.email
      );

      // Log password reset request activity
      await this.logUserActivity(
        user.id,
        'password_reset_requested',
        `Password reset requested for: ${user.email}`,
        {
          email: user.email,
        }
      );

      this.logger.log(`Password reset email sent to: ${email}`);

      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent",
      };
    } catch (error) {
      this.logger.error(
        `Failed to process forgot password for: ${email}`,
        error
      );
      // Return success to prevent email enumeration
      return {
        success: true,
        message:
          "If an account exists with this email, a password reset link has been sent",
      };
    }
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId =
        await this.platformService.validatePasswordResetToken(token);

      if (!userId) {
        throw new BadRequestException("Invalid or expired reset token");
      }

      // Update password
      await this.platformService.updateUserPassword(userId, newPassword);

      // Invalidate the reset token
      await this.platformService.invalidatePasswordResetToken(token);

      // Get user for email notification
      const user = await this.platformService.getUserById(userId);

      // Send confirmation email
      if (user) {
        try {
          await this.emailService.sendEmail({
            to: [user.email],
            from: process.env.EMAIL_FROM || "noreply@fluxturn.com",
            subject: "Password Reset Successful",
            templateId: "notification",
            templateData: {
              userName:
                `${user.firstName} ${user.lastName}`.trim() ||
                user.email.split("@")[0],
              notificationTitle: "Password Reset Successful",
              notificationMessage:
                "Your password has been successfully reset. If you did not make this change, please contact support immediately.",
              appName: "FluxTurn",
            },
          });
        } catch (emailError) {
          this.logger.error(
            `Failed to send password reset confirmation email`,
            emailError
          );
        }
      }

      // Log password reset activity
      await this.logUserActivity(
        userId,
        'password_reset_completed',
        'User successfully reset their password',
        {
          resetMethod: 'email_token',
        }
      );

      this.logger.log(`Password reset successfully for user: ${userId}`);

      return {
        success: true,
        message: "Password has been reset successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to reset password with token: ${token}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to reset password");
    }
  }

  async resendVerificationEmail(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.platformService.getUserByEmail(email);

      if (!user) {
        throw new BadRequestException("User not found");
      }

      if (user.isEmailVerified) {
        return {
          success: true,
          message: "Email is already verified",
        };
      }

      // Generate new verification token
      const verificationToken =
        await this.platformService.generateVerificationToken(user.id);

      // Send verification email
      await this.sendVerificationEmail(
        user.email,
        verificationToken,
        `${user.firstName} ${user.lastName}`.trim() || user.email
      );

      this.logger.log(`Verification email resent to: ${email}`);

      return {
        success: true,
        message: "Verification email has been sent",
      };
    } catch (error) {
      this.logger.error(
        `Failed to resend verification email to: ${email}`,
        error
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to resend verification email");
    }
  }

  // ============= EMAIL HELPER METHODS =============

  private async sendVerificationEmail(
    email: string,
    token: string,
    userName: string
  ): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || "https://fluxturn.com"}/verify-email?token=${token}`;
      const displayName = userName || email.split("@")[0];

      // Create HTML email content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to FluxTurn!</h1>
              </div>
              <div class="content">
                <h2>Hi ${displayName},</h2>
                <p>Thank you for registering with FluxTurn. Please verify your email address to complete your registration.</p>
                <p style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <div class="footer">
                  <p>If you didn't create an account with FluxTurn, please ignore this email.</p>
                  <p>&copy; 2025 FluxTurn. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const textContent = `
        Welcome to FluxTurn!

        Hi ${displayName},

        Thank you for registering with FluxTurn. Please verify your email address by clicking the link below:

        ${verificationUrl}

        This link will expire in 24 hours.

        If you didn't create an account with FluxTurn, please ignore this email.

        © 2025 FluxTurn. All rights reserved.
      `;

      await this.emailService.sendEmail({
        to: [email],
        from: process.env.EMAIL_FROM || "noreply@fluxturn.com",
        subject: "Verify your email for FluxTurn",
        html: htmlContent,
        text: textContent,
      });

      this.logger.debug(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      // Don't throw - user is still created
    }
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string,
    userName: string
  ): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || "https://fluxturn.com"}/reset-password?token=${token}`;
      const displayName = userName || email.split("@")[0];

      // Create HTML email content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f7f7f7; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hi ${displayName},</h2>
                <p>We received a request to reset your password for your FluxTurn account.</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                <div class="footer">
                  <p>&copy; 2025 FluxTurn. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const textContent = `
        Password Reset Request

        Hi ${displayName},

        We received a request to reset your password for your FluxTurn account.

        Click here to reset your password: ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email and your password will remain unchanged.

        © 2025 FluxTurn. All rights reserved.
      `;

      await this.emailService.sendEmail({
        to: [email],
        from: process.env.EMAIL_FROM || "noreply@fluxturn.com",
        subject: "Password Reset Request for FluxTurn",
        html: htmlContent,
        text: textContent,
      });

      this.logger.debug(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error
      );
      throw error;
    }
  }

  // ============= SOCKET AUTHENTICATION =============

  async authenticateSocket(client: any): Promise<any> {
    try {
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization;

      if (!token) {
        this.logger.warn("No token provided for socket authentication");
        return null;
      }

      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace("Bearer ", "");

      // Try JWT authentication first
      try {
        const payload = this.jwtService.verify(cleanToken);
        const user = await this.platformService.getUserById(payload.sub);

        if (!user) {
          this.logger.warn(`User not found for JWT: ${payload.sub}`);
          return null;
        }

        return {
          type: "jwt",
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          projectId: payload.projectId,
          appId: payload.appId,
        };
      } catch (jwtError) {
        // If JWT fails, try API key
        if (cleanToken.startsWith("cgx_")) {
          const apiKeyResult = await this.validateApiKey(cleanToken);
          if (apiKeyResult) {
            return {
              type: "apikey",
              userId: "api-user",
              organizationId: apiKeyResult.organizationId,
              projectId: apiKeyResult.projectId,
              appId: apiKeyResult.appId,
            };
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.error("Socket authentication error:", error);
      return null;
    }
  }

  getUserRooms(authContext: any): string[] {
    const rooms = [];

    if (authContext.userId) {
      rooms.push(`user:${authContext.userId}`);
    }

    if (authContext.organizationId) {
      rooms.push(`org:${authContext.organizationId}`);
    }

    if (authContext.projectId) {
      rooms.push(`project:${authContext.projectId}`);
    }

    if (authContext.appId) {
      rooms.push(`app:${authContext.appId}`);
    }

    return rooms;
  }

  // === ACCESS CONTROL METHODS FOR WEBSOCKET ===

  async canAccessApp(authContext: any, appId: string): Promise<boolean> {
    try {
      // Check if the app belongs to the user's organization or project
      if (!authContext || !appId) return false;

      // Admin users can access all apps in their organization
      if (authContext.roles?.includes("admin")) {
        return true;
      }

      // Check if app belongs to user's organization or project
      if (authContext.organizationId || authContext.projectId) {
        // In real implementation, check database for app ownership
        // For now, allow access if user has valid auth context
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Error checking app access:", error);
      return false;
    }
  }

  async canAccessProject(
    authContext: any,
    projectId: string
  ): Promise<boolean> {
    try {
      // Check if the project belongs to the user's organization
      if (!authContext || !projectId) return false;

      // Admin users can access all projects in their organization
      if (authContext.roles?.includes("admin")) {
        return true;
      }

      // Check if project matches user's current project
      if (authContext.projectId === projectId) {
        return true;
      }

      // Check if user belongs to the organization that owns this project
      if (authContext.organizationId) {
        // In real implementation, check database for project ownership
        // For now, allow access if user has organization context
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Error checking project access:", error);
      return false;
    }
  }

  async canJoinRoom(authContext: any, room: string): Promise<boolean> {
    try {
      if (!authContext || !room) return false;

      // Parse room type and ID
      const [roomType, roomId] = room.split(":");

      switch (roomType) {
        case "user":
          // Users can only join their own room
          return roomId === authContext.userId;

        case "organization":
          // Users can join their organization's room
          return roomId === authContext.organizationId;

        case "project":
          // Check if user can access this project
          return await this.canAccessProject(authContext, roomId);

        case "app":
          // Check if user can access this app
          return await this.canAccessApp(authContext, roomId);

        default:
          // Unknown room type
          return false;
      }
    } catch (error) {
      this.logger.error("Error checking room access:", error);
      return false;
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    try {
      const user = await this.platformService.getUserById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await this.platformService.validateUserCredentials(
        user.email,
        changePasswordDto.currentPassword
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Update password using platformService
      await this.platformService.updateUserPassword(
        userId,
        changePasswordDto.newPassword
      );

      // Log password change activity
      await this.logUserActivity(
        userId,
        'password_changed',
        'User changed their password',
        {
          email: user.email,
          changeMethod: 'user_initiated',
        }
      );

      this.logger.log(`Password changed successfully for user: ${userId}`);

      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error(`Failed to change password for user: ${userId}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to change password');
    }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      const user = await this.platformService.getUserById(userId);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Update user profile using platformService
      const updatedUser = await this.platformService.updateUser(userId, {
        firstName: updateProfileDto.firstName || user.firstName,
        lastName: updateProfileDto.lastName || user.lastName,
        fullName: updateProfileDto.name || `${user.firstName} ${user.lastName}`.trim(),
        bio: updateProfileDto.bio !== undefined ? updateProfileDto.bio : user.bio,
        website: updateProfileDto.website !== undefined ? updateProfileDto.website : user.website,
        location: updateProfileDto.location !== undefined ? updateProfileDto.location : user.location,
      });

      // Log profile update activity
      await this.logUserActivity(
        userId,
        "profile_updated",
        "User updated their profile",
        {
          email: user.email,
          updatedFields: Object.keys(updateProfileDto),
        }
      );

      this.logger.log(`Profile updated for user: ${userId}`);

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName || `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
        name: updatedUser.fullName || `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        website: updatedUser.website,
        location: updatedUser.location,
      };
    } catch (error) {
      this.logger.error(`Failed to update profile for user: ${userId}`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile');
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    try {
      const user = await this.platformService.getUserById(userId);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Upload avatar using platform-level storage (no org/project/app required)
      const uploadResult = await this.storageService.uploadFileForPlatform(
        file,
        'avatars',
        {
          contentType: file.mimetype || "image/png",
          metadata: {
            userId,
            type: "avatar",
          },
          isPublic: true,
        }
      );

      // Update user avatar URL using platformService
      const updatedUser = await this.platformService.updateUser(userId, {
        avatarUrl: uploadResult.url,
      });

      // Log avatar upload activity
      await this.logUserActivity(
        userId,
        "avatar_uploaded",
        "User uploaded a new avatar",
        {
          email: user.email,
          fileSize: file.size,
          mimeType: file.mimetype,
          avatarUrl: uploadResult.url,
        }
      );

      this.logger.log(`Avatar uploaded for user: ${userId}`);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          fullName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
          avatarUrl: updatedUser.avatarUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to upload avatar for user: ${userId}`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload avatar');
    }
  }

  // OAuth Methods
  async getGitHubAuthUrl(frontendUrl?: string): Promise<string> {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GITHUB_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/github/callback');
    const scope = 'user:email';
    // Encode frontend URL in state for redirect after callback
    const state = this.generateOAuthState(frontendUrl);

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  }

  async getGoogleAuthUrl(frontendUrl?: string): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/google/callback');
    const scope = 'openid profile email';
    // Encode frontend URL in state for redirect after callback
    const state = this.generateOAuthState(frontendUrl);

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline&prompt=consent`;
  }

  async getFacebookAuthUrl(): Promise<string> {
    const clientId = this.configService.get<string>('FACEBOOK_CLIENT_ID');
    const redirectUri = this.configService.get<string>('FACEBOOK_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/facebook/callback');
    const scope = 'email,public_profile';
    const state = this.generateOAuthState();

    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  }

  async getTwitterAuthUrl(): Promise<string> {
    // Twitter uses OAuth 2.0 with PKCE
    const clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
    const redirectUri = this.configService.get<string>('TWITTER_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/twitter/callback');
    const scope = 'tweet.read users.read offline.access';
    const state = this.generateOAuthState();
    const codeChallenge = this.generateCodeChallenge();

    // Store code verifier for later use
    await this.platformService.query(
      `INSERT INTO oauth_temp_data (state, code_verifier, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (state) DO UPDATE SET code_verifier = $2`,
      [state, codeChallenge.verifier]
    );

    return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${codeChallenge.challenge}&code_challenge_method=S256`;
  }

  async getAppleAuthUrl(): Promise<string> {
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('APPLE_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/apple/callback');
    const scope = 'name email';
    const state = this.generateOAuthState();

    return `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&response_mode=form_post`;
  }

  private generateCodeChallenge() {
    const verifier = Buffer.from(
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    ).toString('base64url');

    const challenge = Buffer.from(
      require('crypto').createHash('sha256').update(verifier).digest()
    ).toString('base64url');

    return { verifier, challenge };
  }

  private generateOAuthState(frontendUrl?: string): string {
    // Generate a random state for CSRF protection
    // Optionally encode frontend URL in the state
    const randomState = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const stateData = frontendUrl ? `${randomState}|${frontendUrl}` : randomState;
    return Buffer.from(stateData).toString('base64');
  }

  async handleGitHubCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
          client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const { access_token } = tokenData;

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to fetch user data from GitHub');
      }

      const githubUser = await userResponse.json();

      // Get user email if not public
      let email = githubUser.email;
      if (!email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Accept': 'application/json',
          },
        });

        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: any) => e.primary);
          email = primaryEmail?.email || emails[0]?.email;
        }
      }

      if (!email) {
        throw new BadRequestException('Unable to retrieve email from GitHub');
      }

      return this.handleOAuthUser('github', githubUser.id.toString(), {
        email,
        name: githubUser.name,
        firstName: githubUser.name?.split(' ')[0],
        lastName: githubUser.name?.split(' ').slice(1).join(' '),
        avatarUrl: githubUser.avatar_url,
        username: githubUser.login,
        accessToken: access_token,
        rawData: githubUser,
      });
    } catch (error) {
      this.logger.error('GitHub OAuth callback error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to authenticate with GitHub');
    }
  }

  async handleGoogleCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          redirect_uri: this.configService.get<string>('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/google/callback'),
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`Google OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const { access_token, refresh_token, id_token } = tokenData;

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to fetch user data from Google');
      }

      const googleUser = await userResponse.json();

      return this.handleOAuthUser('google', googleUser.id, {
        email: googleUser.email,
        name: googleUser.name,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        avatarUrl: googleUser.picture,
        username: googleUser.email.split('@')[0],
        accessToken: access_token,
        refreshToken: refresh_token,
        rawData: googleUser,
      });
    } catch (error) {
      this.logger.error('Google OAuth callback error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to authenticate with Google');
    }
  }

  async handleFacebookCallback(code: string): Promise<AuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${this.configService.get<string>('FACEBOOK_CLIENT_ID')}` +
        `&client_secret=${this.configService.get<string>('FACEBOOK_CLIENT_SECRET')}` +
        `&redirect_uri=${encodeURIComponent(this.configService.get<string>('FACEBOOK_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/facebook/callback'))}` +
        `&code=${code}`
      );

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`Facebook OAuth error: ${tokenData.error.message || tokenData.error}`);
      }

      const { access_token } = tokenData;

      // Get user info from Facebook
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.type(large)&access_token=${access_token}`
      );

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to fetch user data from Facebook');
      }

      const facebookUser = await userResponse.json();

      if (!facebookUser.email) {
        throw new BadRequestException('Unable to retrieve email from Facebook. Please ensure email permission is granted.');
      }

      return this.handleOAuthUser('facebook', facebookUser.id, {
        email: facebookUser.email,
        name: facebookUser.name,
        firstName: facebookUser.name?.split(' ')[0],
        lastName: facebookUser.name?.split(' ').slice(1).join(' '),
        avatarUrl: facebookUser.picture?.data?.url,
        username: facebookUser.email.split('@')[0],
        accessToken: access_token,
        rawData: facebookUser,
      });
    } catch (error) {
      this.logger.error('Facebook OAuth callback error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to authenticate with Facebook');
    }
  }

  async handleTwitterCallback(code: string, state: string): Promise<AuthResult> {
    try {
      // Retrieve code verifier
      const result = await this.platformService.query(
        `SELECT code_verifier FROM oauth_temp_data WHERE state = $1`,
        [state]
      );

      if (!result.rows[0]?.code_verifier) {
        throw new BadRequestException('Invalid OAuth state');
      }

      const codeVerifier = result.rows[0].code_verifier;

      // Clean up temp data
      await this.platformService.query(
        `DELETE FROM oauth_temp_data WHERE state = $1`,
        [state]
      );

      // Exchange code for access token
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${this.configService.get<string>('TWITTER_CLIENT_ID')}:${this.configService.get<string>('TWITTER_CLIENT_SECRET')}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.configService.get<string>('TWITTER_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/twitter/callback'),
          code_verifier: codeVerifier,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`Twitter OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const { access_token, refresh_token } = tokenData;

      // Get user info from Twitter
      const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new BadRequestException('Failed to fetch user data from Twitter');
      }

      const { data: twitterUser } = await userResponse.json();

      // Twitter doesn't provide email in basic API, generate one
      const email = `${twitterUser.username}@twitter.local`;

      return this.handleOAuthUser('twitter', twitterUser.id, {
        email,
        name: twitterUser.name,
        firstName: twitterUser.name?.split(' ')[0],
        lastName: twitterUser.name?.split(' ').slice(1).join(' '),
        avatarUrl: twitterUser.profile_image_url?.replace('_normal', ''),
        username: twitterUser.username,
        accessToken: access_token,
        refreshToken: refresh_token,
        rawData: twitterUser,
      });
    } catch (error) {
      this.logger.error('Twitter OAuth callback error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to authenticate with Twitter');
    }
  }

  async handleAppleCallback(code: string, idToken?: any): Promise<AuthResult> {
    try {
      // Generate client secret JWT for Apple
      const clientSecret = this.generateAppleClientSecret();

      // Exchange code for access token
      const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: this.configService.get<string>('APPLE_CLIENT_ID'),
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.configService.get<string>('APPLE_REDIRECT_URI', 'http://localhost:3000/api/v1/auth/oauth/apple/callback'),
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`Apple OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      // Decode the ID token to get user info
      const decodedToken = this.jwtService.decode(tokenData.id_token) as any;

      if (!decodedToken) {
        throw new BadRequestException('Failed to decode Apple ID token');
      }

      // Apple provides user info only on first authorization
      const email = decodedToken.email;
      const appleUserId = decodedToken.sub;

      if (!email) {
        throw new BadRequestException('Unable to retrieve email from Apple');
      }

      return this.handleOAuthUser('apple', appleUserId, {
        email,
        name: idToken?.user?.name ? `${idToken.user.name.firstName} ${idToken.user.name.lastName}` : email.split('@')[0],
        firstName: idToken?.user?.name?.firstName,
        lastName: idToken?.user?.name?.lastName,
        avatarUrl: null, // Apple doesn't provide avatars
        username: email.split('@')[0],
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        rawData: decodedToken,
      });
    } catch (error) {
      this.logger.error('Apple OAuth callback error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to authenticate with Apple');
    }
  }

  private generateAppleClientSecret(): string {
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const privateKey = this.configService.get<string>('APPLE_PRIVATE_KEY');

    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 15777000, // 6 months
      aud: 'https://appleid.apple.com',
      sub: clientId,
    };

    return this.jwtService.sign(payload, {
      algorithm: 'ES256',
      keyid: keyId,
      privateKey: privateKey,
    });
  }

  private async handleOAuthUser(
    provider: string,
    providerId: string,
    profile: {
      email: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      username?: string;
      accessToken?: string;
      refreshToken?: string;
      rawData?: any;
    }
  ): Promise<AuthResult> {
    // Create or update user in database
    const user = await this.platformService.createOrUpdateOAuthUser(
      provider,
      providerId,
      {
        email: profile.email,
        name: profile.name,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
        username: profile.username,
      }
    );

    // Save OAuth token if provided
    if (profile.accessToken) {
      await this.platformService.saveOAuthToken(
        user.id,
        provider,
        profile.accessToken,
        profile.refreshToken,
        null,
        profile.rawData
      );
    }

    // Log OAuth login activity
    await this.logUserActivity(
      user.id,
      'oauth_login',
      `User logged in via ${provider}: ${user.email}`,
      {
        provider,
        username: profile.username,
      }
    );

    // Check if user has any organizations, if not create default org and project
    try {
      const userOrganizations = await this.platformService.getOrganizationsByUserId(user.id);

      if (userOrganizations.length === 0) {
        // User has no organizations - create default organization and project
        const firstName = profile.firstName || profile.name?.split(' ')[0] || user.email.split('@')[0];
        const orgName = `${firstName}'s Workspace`;

        const organization = await this.platformService.createOrganization({
          name: orgName,
          ownerId: user.id,
          description: `Default workspace for ${firstName}`,
        });

        this.logger.log(`Auto-created organization "${orgName}" for OAuth user: ${user.email}`);

        // Create default project "My Project" in the organization
        const project = await this.platformService.createProject({
          name: 'My Project',
          description: 'Your first project',
          organizationId: organization.id,
        });

        this.logger.log(`Auto-created project "My Project" for OAuth user: ${user.email}`);

        // Log organization and project creation
        await this.logUserActivity(
          user.id,
          'auto_setup_completed',
          `Auto-created organization and project for new OAuth user`,
          {
            provider,
            organizationId: organization.id,
            organizationName: orgName,
            projectId: project.id,
            projectName: 'My Project',
          }
        );
      }
    } catch (setupError) {
      // Log the error but don't fail the OAuth login
      this.logger.error(`Failed to auto-create organization/project for OAuth user: ${user.email}`, setupError);
    }

    // Generate JWT tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username || profile.username || user.email.split('@')[0],
      fullName: user.fullName || profile.name || user.email.split('@')[0],
      organizationId: user.organizationId,
      projectId: null,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: payload.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: payload.fullName,
        organizationId: user.organizationId || null,
        projectId: null,
      },
    };
  }

  async linkOAuthProvider(userId: string, provider: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Similar to handleGitHubCallback but links to existing user
      // This would be implemented for each provider
      // For now, just implementing GitHub

      if (provider !== 'github') {
        throw new BadRequestException(`OAuth provider ${provider} is not yet supported`);
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.configService.get<string>('GITHUB_CLIENT_ID'),
          client_secret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new BadRequestException(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
      }

      const { access_token } = tokenData;

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      });

      const githubUser = await userResponse.json();

      // Link the OAuth account to the existing user
      await this.platformService.query(`
        UPDATE users
        SET github_id = $1,
            oauth_providers =
              CASE
                WHEN oauth_providers::jsonb @> $2::jsonb
                THEN oauth_providers
                ELSE oauth_providers::jsonb || $2::jsonb
              END,
            updated_at = NOW()
        WHERE id = $3
      `, [githubUser.id.toString(), JSON.stringify(['github']), userId]);

      // Save OAuth token
      await this.platformService.saveOAuthToken(
        userId,
        'github',
        access_token,
        null,
        null,
        githubUser
      );

      return {
        success: true,
        message: 'GitHub account linked successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to link ${provider} account for user ${userId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to link ${provider} account`);
    }
  }

  async getLinkedProviders(userId: string): Promise<{ providers: string[] }> {
    try {
      const user = await this.platformService.getUserById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        providers: user.oauthProviders || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get linked providers for user ${userId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get linked providers');
    }
  }

}
