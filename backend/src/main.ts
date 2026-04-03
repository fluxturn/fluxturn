import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe, VersioningType, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
const basicAuth = require("express-basic-auth");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"],  // Added "log" to see module initialization
      rawBody: true,
    });

    const configService = app.get(ConfigService);

    // Configure raw body capture for Stripe webhooks (MUST BE BEFORE other body parsers)
    console.log("Setting up raw body capture for Stripe webhooks...");
    app.use(
      bodyParser.json({
        limit: "500mb",
        verify: (req: any, res, buf) => {
          const url = req.originalUrl || req.url;
          // Capture raw body for Stripe webhook endpoints
          if (
            url === "/api/v1/stripe/webhook" ||
            url.includes("/stripe/webhook")
          ) {
            req.rawBody = buf;
            console.log(`Raw body captured for webhook: ${url}`);
          }
        },
      })
    );

    app.use(
      express.urlencoded({
        limit: "500mb",
        extended: true,
      })
    );

    // Add health check middleware BEFORE CORS
    app.use("/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "fluxturn-backend",
        version: "1.0.0",
        uptime: process.uptime(),
      });
    });

    // MANUAL CORS MIDDLEWARE - Handle at Express level BEFORE NestJS routing
    app.use((req, res, next) => {
      // Set CORS headers for every response
      const origin = req.headers.origin;

      // Only set CORS headers if origin is present
      // When credentials are included, we cannot use wildcard '*'
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-api-key,X-Api-Key,x-organization-id,x-project-id,x-app-id');
      res.setHeader('Access-Control-Max-Age', '86400');

      // Handle preflight OPTIONS requests IMMEDIATELY
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      next();
    });

    // Global prefix
    const apiPrefix = configService.get<string>("API_PREFIX") || "api";
    app.setGlobalPrefix(apiPrefix, {
      exclude: ["health"], // Health check without prefix
    });

    // Enable versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    // Global exception filter for error logging
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Serve static files from uploads directory
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

    // Swagger documentation with basic auth

    // Add basic auth middleware for Swagger endpoints (only if credentials are configured)
    const swaggerUser = configService.get<string>("SWAGGER_USER");
    const swaggerPassword = configService.get<string>("SWAGGER_PASSWORD");

    if (swaggerUser && swaggerPassword) {
      app.use(
        [`/${apiPrefix}/docs`, `/${apiPrefix}/docs-json`],
        basicAuth({
          challenge: true,
          users: {
            [swaggerUser]: swaggerPassword,
          },
        })
      );
    }

      const config = new DocumentBuilder()
        .setTitle("FluxTurn API")
        .setDescription("Multi-Tenant Platform API")
        .setVersion("1.0")
        .addBearerAuth(
          {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Enter JWT token from /auth/login endpoint (without Bearer prefix)",
          },
          "JWT"
        )
        .addApiKey(
          {
            type: "apiKey",
            in: "header",
            name: "Authorization",
            description:
              'Enter API key with "Bearer " prefix (e.g., Bearer cgx_...)',
          },
          "api_key"
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

    const port = parseInt(process.env.PORT || "3004", 10);

    // Get the underlying HTTP server and set proper timeouts
    const server = app.getHttpServer();
    server.setTimeout(120000); // 2 minutes timeout
    server.keepAliveTimeout = 121000;
    server.headersTimeout = 122000;

    await app.listen(port, "0.0.0.0");

    console.log(`
    ========================================
    🚀 FluxTurn Backend is running!
    ========================================
    🌐 API: http://0.0.0.0:${port}/${apiPrefix}/v1
    📚 Docs: http://0.0.0.0:${port}/${apiPrefix}/docs
    🏥 Health: http://0.0.0.0:${port}/health
    📍 Environment: ${process.env.NODE_ENV}
    ✅ Application started successfully!
    ========================================
    `);
  } catch (error) {
    console.error("❌ Error starting application:", error);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error("❌ Fatal error during bootstrap:", error);
  process.exit(1);
});
