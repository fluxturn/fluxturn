import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { MulterModule } from "@nestjs/platform-express";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { ApiKeyStrategy } from "./strategies/api-key.strategy";
import { AuthController } from "./auth.controller";
import { AdminController } from "./admin.controller";
import { AuthService } from "./auth.service";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
      inject: [ConfigService],
    }),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for avatars/images
      },
    }),
    DatabaseModule,
    forwardRef(() => EmailModule),
    StorageModule,
  ],
  controllers: [AuthController, AdminController],
  providers: [AuthService, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
