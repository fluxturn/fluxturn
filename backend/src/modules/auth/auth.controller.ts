import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Patch,
  Query,
  Res,
  Redirect,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiProperty,
  ApiSecurity,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from "@nestjs/swagger";
import { AuthService, RegisterInput, LoginInput } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsUUID,
  IsNotEmpty,
} from "class-validator";
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from "./dto/auth.dto";
import { OAuthCallbackDto, OAuthProviderDto } from "./dto/oauth.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Helper to get the appropriate frontend URL
   * Checks: 1) Decoded state parameter (from OAuth callback), 2) Query parameter (from initial request)
   */
  private getFrontendUrl(req: any, state?: string): string {
    // First, try to decode state parameter (used in OAuth callback)
    if (state) {
      try {
        const decoded = Buffer.from(state, 'base64').toString('utf-8');
        // State format: randomState|frontendUrl
        if (decoded.includes('|')) {
          const [, frontendUrl] = decoded.split('|');
          if (frontendUrl) {
            return frontendUrl;
          }
        }
      } catch (e) {
        // Ignore decoding errors
      }
    }

    // Fallback: Check for explicit app query parameter (used in initial OAuth request)
    const app = req.query?.app || req.query?.frontend;

    if (app === 'imagitar') {
      return process.env.FRONTEND_URL_IMAGITAR || 'http://localhost:5184';
    }

    if (app === 'fluxturn') {
      return process.env.FRONTEND_URL_FLUXTURN || 'http://localhost:5175';
    }

    // Default to FluxTurn frontend
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  @ApiResponse({ status: 400, description: "Bad request" })
  async register(@Body() registerDto: RegisterDto) {
    const input: RegisterInput = {
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
    };

    return await this.authService.registerUser(input);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    const input: LoginInput = {
      email: loginDto.email,
      password: loginDto.password,
    };

    return await this.authService.login(input);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get current user info" })
  @ApiSecurity("JWT")
  @ApiResponse({ status: 200, description: "User info retrieved successfully" })
  async getCurrentUser(@Request() req) {
    // Get fresh user data from database to ensure we have all fields
    try {
      const user = await this.authService.getUserById(
        req.user.userId || req.user.sub
      );

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Return the same structure as login response for consistency
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.email.split("@")[0],
          firstName: user.firstName,
          lastName: user.lastName,
          fullName:
            `${user.firstName} ${user.lastName}`.trim() ||
            user.email.split("@")[0],
          name: user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0],
          role: user.role || 'user',
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          website: user.website,
          location: user.location,
          organizationId: user.organizationId || null,
          projectId: null,
        },
      };
    } catch (error) {
      // If we can't get fresh data, use what's in the JWT
      return {
        user: {
          id: req.user.userId || req.user.sub,
          email: req.user.email,
          username: req.user.username || req.user.email.split("@")[0],
          firstName: null,
          lastName: null,
          fullName: req.user.fullName || req.user.email.split("@")[0],
          role: req.user.role || 'user',
          organizationId: req.user.organizationId || null,
          projectId: req.user.projectId || null,
        },
      };
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh JWT token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["refreshToken"],
      properties: {
        refreshToken: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(@Body("refreshToken") refreshToken: string) {
    return await this.authService.refreshToken(refreshToken);
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify user email with token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string", description: "Email verification token" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyEmail(@Body("token") token: string) {
    if (!token) {
      throw new BadRequestException("Verification token is required");
    }
    return await this.authService.verifyEmail(token);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset email" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent if account exists",
  })
  async forgotPassword(@Body("email") email: string) {
    if (!email) {
      throw new BadRequestException("Email is required");
    }
    return await this.authService.forgotPassword(email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: { type: "string", description: "Password reset token" },
        password: {
          type: "string",
          minLength: 8,
          description: "New password (min 8 characters)",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetPassword(
    @Body("token") token: string,
    @Body("password") password: string
  ) {
    if (!token || !password) {
      throw new BadRequestException("Token and password are required");
    }
    if (password.length < 8) {
      throw new BadRequestException(
        "Password must be at least 8 characters long"
      );
    }
    return await this.authService.resetPassword(token, password);
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend verification email" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Verification email sent" })
  @ApiResponse({
    status: 400,
    description: "Email already verified or not found",
  })
  async resendVerification(@Body("email") email: string) {
    if (!email) {
      throw new BadRequestException("Email is required");
    }
    return await this.authService.resendVerificationEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.userId || req.user.id,
      changePasswordDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.authService.updateProfile(
      req.user.userId || req.user.id,
      updateProfileDto
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("avatar")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload user avatar" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        avatar: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("avatar"))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("File size must be less than 5MB");
    }

    // Check file type
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Please upload an image file");
    }

    return this.authService.uploadAvatar(req.user.userId || req.user.id, file);
  }

  // OAuth Endpoints
  @Get("oauth/github")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Initiate GitHub OAuth flow" })
  @ApiResponse({ status: 302, description: "Redirects to GitHub OAuth" })
  async githubOAuth(@Request() req, @Res() res: Response) {
    const frontendUrl = this.getFrontendUrl(req);
    const authUrl = await this.authService.getGitHubAuthUrl(frontendUrl);
    return res.redirect(authUrl);
  }

  @Get("oauth/github/callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Handle GitHub OAuth callback" })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from GitHub' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async githubCallback(
    @Request() req,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      const result = await this.authService.handleGitHubCallback(code);

      // Determine which frontend to redirect to
      const frontendUrl = this.getFrontendUrl(req, state);
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = this.getFrontendUrl(req, state);
      const errorMessage = encodeURIComponent(error.message || 'OAuth authentication failed');
      return res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
    }
  }

  @Get("oauth/google")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Initiate Google OAuth flow" })
  @ApiResponse({ status: 302, description: "Redirects to Google OAuth" })
  async googleOAuth(@Request() req, @Res() res: Response) {
    const frontendUrl = this.getFrontendUrl(req);
    const authUrl = await this.authService.getGoogleAuthUrl(frontendUrl);
    return res.redirect(authUrl);
  }

  @Get("oauth/google/callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Handle Google OAuth callback" })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async googleCallback(
    @Request() req,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      const result = await this.authService.handleGoogleCallback(code);

      // Determine which frontend to redirect to
      const frontendUrl = this.getFrontendUrl(req, state);
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = this.getFrontendUrl(req, state);
      const errorMessage = encodeURIComponent(error.message || 'OAuth authentication failed');
      return res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
    }
  }

  @Get("oauth/facebook")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Initiate Facebook OAuth flow" })
  @ApiResponse({ status: 302, description: "Redirects to Facebook OAuth" })
  async facebookOAuth(@Res() res: Response) {
    const authUrl = await this.authService.getFacebookAuthUrl();
    return res.redirect(authUrl);
  }

  @Get("oauth/facebook/callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Handle Facebook OAuth callback" })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Facebook' })
  @ApiQuery({ name: 'state', required: false, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async facebookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      const result = await this.authService.handleFacebookCallback(code);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = encodeURIComponent(error.message || 'OAuth authentication failed');
      return res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
    }
  }

  @Get("oauth/twitter")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Initiate Twitter/X OAuth flow" })
  @ApiResponse({ status: 302, description: "Redirects to Twitter OAuth" })
  async twitterOAuth(@Res() res: Response) {
    const authUrl = await this.authService.getTwitterAuthUrl();
    return res.redirect(authUrl);
  }

  @Get("oauth/twitter/callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Handle Twitter/X OAuth callback" })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Twitter' })
  @ApiQuery({ name: 'state', required: true, description: 'State parameter for CSRF protection' })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async twitterCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    try {
      if (!code || !state) {
        throw new BadRequestException('Authorization code and state are required');
      }

      const result = await this.authService.handleTwitterCallback(code, state);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = encodeURIComponent(error.message || 'OAuth authentication failed');
      return res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
    }
  }

  @Get("oauth/apple")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Initiate Apple OAuth flow" })
  @ApiResponse({ status: 302, description: "Redirects to Apple OAuth" })
  async appleOAuth(@Res() res: Response) {
    const authUrl = await this.authService.getAppleAuthUrl();
    return res.redirect(authUrl);
  }

  @Post("oauth/apple/callback")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Handle Apple OAuth callback" })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        state: { type: 'string' },
        id_token: { type: 'string' },
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 302, description: "Redirects to frontend with token" })
  async appleCallback(
    @Body('code') code: string,
    @Body('state') state: string,
    @Body('id_token') idToken: string,
    @Body('user') user: any,
    @Res() res: Response
  ) {
    try {
      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      const result = await this.authService.handleAppleCallback(code, user);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/auth/success?token=${result.accessToken}&refreshToken=${result.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorMessage = encodeURIComponent(error.message || 'OAuth authentication failed');
      return res.redirect(`${frontendUrl}/auth/error?message=${errorMessage}`);
    }
  }

  @Post("oauth/link")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Link OAuth provider to existing account" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["provider", "code"],
      properties: {
        provider: {
          type: "string",
          enum: ["github", "google", "facebook", "twitter", "apple"],
          example: "github"
        },
        code: {
          type: "string",
          description: "Authorization code from OAuth provider"
        }
      }
    }
  })
  async linkOAuthProvider(
    @Request() req,
    @Body('provider') provider: string,
    @Body('code') code: string
  ) {
    const userId = req.user.userId || req.user.id;
    return await this.authService.linkOAuthProvider(userId, provider, code);
  }

  @Get("oauth/providers")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get linked OAuth providers for current user" })
  async getLinkedProviders(@Request() req) {
    const userId = req.user.userId || req.user.id;
    return await this.authService.getLinkedProviders(userId);
  }
}
