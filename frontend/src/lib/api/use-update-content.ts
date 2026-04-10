import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Content } from './use-get-contents';
import { toast } from "sonner";
import { api } from '../api';

export interface UpdateContentDto {
  title?: string;
  content?: unknown;
  contentType?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation<Content, Error, { contentId: string; data: UpdateContentDto }>({
    mutationFn: async ({ contentId, data }) => {
      return api.put<Content>(`/content/${contentId}`, data);
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['content', data.id] });
      
      toast.success('Your content has been updated successfully.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update content.');
    },
  });
}