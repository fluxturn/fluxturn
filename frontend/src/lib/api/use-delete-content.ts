import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { api } from '../api';

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (contentId) => {
      return api.delete(`/content/${contentId}`);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      
      toast.success('The content has been deleted successfully.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete content.');
    },
  });
}

export function useArchiveContent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (contentId) => {
      return api.put(`/content/${contentId}/archive`);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      
      toast.success('The content has been archived successfully.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to archive content.');
    },
  });
}