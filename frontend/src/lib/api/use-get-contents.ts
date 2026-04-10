import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface Content {
  id: string;
  resourceId: string;
  resourceType: "project" | "app";
  userId: string;
  contentType: string;
  title: string;
  content: unknown;
  source: string;
  sourceDetails?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: string;
  version: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  app?: {
    id: string;
    name: string;
  };
}

interface GetContentsParams {
  projectId?: string;
  appId?: string;
  contentType?: string;
  status?: string;
}

export function useGetContents(params: GetContentsParams) {
  return useQuery<Content[]>({
    queryKey: [
      "contents",
      params.projectId,
      params.appId,
      params.contentType,
      params.status,
    ],
    queryFn: async () => {
      const url = `/content/resource`;
      const queryParams = new URLSearchParams();

      if (params.contentType) {
        queryParams.append("contentType", params.contentType);
      }

      if (params.status) {
        queryParams.append("status", params.status);
      }

      const finalUrl = queryParams.toString() ? `${url}?${queryParams}` : url;
      return api.get<Content[]>(finalUrl);
    },
    enabled: !!params.projectId || !!params.appId,
  });
}
