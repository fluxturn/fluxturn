import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiHeader,
} from "@nestjs/swagger";
import {
  QdrantService,
  VectorDocument,
  VectorSearchQuery,
} from "./qdrant.service";
import { JwtOrApiKeyAuthGuard } from "../auth/guards/jwt-or-api-key-auth.guard";

@ApiTags("Vector Search")
@Controller("vectors")
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity("api_key")
@ApiSecurity("JWT")
@ApiHeader({
  name: "x-organization-id",
  description: "Organization ID for multi-tenant context",
  required: false,
})
@ApiHeader({
  name: "x-project-id",
  description: "Project ID for multi-tenant context",
  required: false,
})
@ApiHeader({
  name: "x-app-id",
  description: "App ID for multi-tenant context (optional)",
  required: false,
})
export class QdrantController {
  constructor(private readonly qdrantService: QdrantService) {}

  @Post("collections")
  @ApiOperation({ summary: "Create a vector collection" })
  @ApiResponse({ status: 201, description: "Collection created" })
  async createCollection(
    @Body()
    data: {
      name: string;
      vectorSize: number;
      distance?: "cosine" | "euclid" | "dot";
    },
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = `${projectId}_${data.name}`;
      await this.qdrantService.createCollection(
        collectionName,
        data.vectorSize,
        data.distance || "cosine"
      );

      return {
        success: true,
        collection: collectionName,
        message: "Collection created successfully",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to create collection",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("collections")
  @ApiOperation({ summary: "List vector collections" })
  @ApiResponse({ status: 200, description: "Collections listed" })
  async listCollections(@Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collections = await this.qdrantService.listCollections();
      const projectCollections = collections.filter((c) =>
        c.startsWith(`${projectId}_`)
      );

      return {
        success: true,
        collections: projectCollections,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to list collections",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("collections/:name")
  @ApiOperation({ summary: "Delete a vector collection" })
  @ApiResponse({ status: 200, description: "Collection deleted" })
  async deleteCollection(@Param("name") name: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${name}`
        : `${projectId}_${name}`;
      await this.qdrantService.deleteCollection(collectionName);

      return {
        success: true,
        message: "Collection deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to delete collection",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("upsert")
  @ApiOperation({ summary: "Upsert vectors" })
  @ApiResponse({ status: 200, description: "Vectors upserted" })
  async upsertVectors(
    @Body()
    data: {
      collection: string;
      vectors: VectorDocument[];
    },
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${data.collection}`
        : `${projectId}_${data.collection}`;
      await this.qdrantService.upsertVectors(collectionName, data.vectors);

      return {
        success: true,
        count: data.vectors.length,
        message: "Vectors upserted successfully",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to upsert vectors",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("search")
  @ApiOperation({ summary: "Search vectors" })
  @ApiResponse({ status: 200, description: "Search results returned" })
  async searchVectors(
    @Body()
    data: {
      collection: string;
      query: VectorSearchQuery;
    },
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${data.collection}`
        : `${projectId}_${data.collection}`;
      const results = await this.qdrantService.searchVectors(
        collectionName,
        data.query.vector,
        data.query.limit || 10
      );

      return {
        success: true,
        results,
        count: results.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Vector search failed",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("vectors/:collection/:id")
  @ApiOperation({ summary: "Delete a vector" })
  @ApiResponse({ status: 200, description: "Vector deleted" })
  async deleteVector(
    @Param("collection") collection: string,
    @Param("id") id: string,
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${collection}`
        : `${projectId}_${collection}`;
      await this.qdrantService.deleteVectors(collectionName, [id]);

      return {
        success: true,
        message: "Vector deleted successfully",
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to delete vector",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("recommend")
  @ApiOperation({ summary: "Get vector recommendations" })
  @ApiResponse({ status: 200, description: "Recommendations returned" })
  async getRecommendations(
    @Body()
    data: {
      collection: string;
      positive: string[];
      negative?: string[];
      limit?: number;
      filter?: Record<string, any>;
    },
    @Req() req: any
  ) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${data.collection}`
        : `${projectId}_${data.collection}`;
      const results = await this.qdrantService.recommendVectors(
        collectionName,
        data.positive,
        data.negative || [],
        data.limit || 10,
        data.filter
      );

      return {
        success: true,
        results,
        count: results.length,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to get recommendations",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("collections/:name/stats")
  @ApiOperation({ summary: "Get collection statistics" })
  @ApiResponse({ status: 200, description: "Statistics returned" })
  async getCollectionStats(@Param("name") name: string, @Req() req: any) {
    try {
      const projectId = req.headers["x-project-id"] || req.auth?.projectId;
      const appId = req.headers["x-app-id"] || req.auth?.appId;
      const collectionName = appId
        ? `${appId}_${name}`
        : `${projectId}_${name}`;
      const stats = await this.qdrantService.getCollectionStats(collectionName);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to get collection stats",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("health")
  @ApiOperation({ summary: "Check Qdrant health" })
  @ApiResponse({ status: 200, description: "Health status returned" })
  async getHealthStatus() {
    try {
      const status = await this.qdrantService.getHealthStatus();

      return {
        success: true,
        ...status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to get health status",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
