import type { JsonObject } from './json';

export interface App {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  organizationId: string;
  type: 'web' | 'mobile' | 'api' | 'desktop';
  framework: 'react' | 'vue' | 'angular' | 'flutter' | 'react-native' | 'nestjs' | 'express' | 'next' | 'nuxt';
  status: 'development' | 'staging' | 'production' | 'archived';
  url?: string;
  repositoryUrl?: string;
  buildConfig?: JsonObject;
  environmentVariables?: Record<string, string>;
  settings?: JsonObject;
  createdAt: string;
  updatedAt: string;
  lastDeployedAt?: string;
  _count?: {
    deployments: number;
    workflows: number;
  };
}

export interface AppDeployment {
  id: string;
  appId: string;
  version: string;
  status: 'pending' | 'building' | 'deploying' | 'success' | 'failed';
  environment: 'development' | 'staging' | 'production';
  url?: string;
  buildTime?: number;
  deployedAt?: string;
  createdAt: string;
}

export interface AppStats {
  total: number;
  byStatus: Record<string, number>;
  byFramework: Record<string, number>;
  totalDeployments: number;
}