import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogApi } from '../lib/api/blog';
import type {
  BlogQueryParams,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCommentDto,
  CreateCategoryDto,
} from '../types/blog';

// Query keys for cache management
export const blogKeys = {
  all: ['blog'] as const,
  posts: (params?: BlogQueryParams) => [...blogKeys.all, 'posts', params] as const,
  post: (slug: string) => [...blogKeys.all, 'post', slug] as const,
  postById: (id: string) => [...blogKeys.all, 'postById', id] as const,
  myPosts: (params?: BlogQueryParams) => [...blogKeys.all, 'myPosts', params] as const,
  comments: (postId: string) => [...blogKeys.all, 'comments', postId] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
  tags: () => [...blogKeys.all, 'tags'] as const,
  stats: () => [...blogKeys.all, 'stats'] as const,
};

// =============================================
// QUERIES
// =============================================

export function useBlogPosts(params?: BlogQueryParams) {
  return useQuery({
    queryKey: blogKeys.posts(params),
    queryFn: () => blogApi.getPosts(params),
  });
}

export function useBlogPostBySlug(slug: string | null) {
  return useQuery({
    queryKey: blogKeys.post(slug || ''),
    queryFn: () => blogApi.getPostBySlug(slug!),
    enabled: !!slug,
  });
}

export function useBlogPost(id: string | null) {
  return useQuery({
    queryKey: blogKeys.postById(id || ''),
    queryFn: () => blogApi.getPostById(id!),
    enabled: !!id,
  });
}

export function useMyBlogPosts(params?: BlogQueryParams) {
  return useQuery({
    queryKey: blogKeys.myPosts(params),
    queryFn: () => blogApi.getMyPosts(params),
  });
}

export function useBlogComments(postId: string) {
  return useQuery({
    queryKey: blogKeys.comments(postId),
    queryFn: () => blogApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useBlogCategories() {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: () => blogApi.getCategories(),
  });
}

export function useBlogTags() {
  return useQuery({
    queryKey: blogKeys.tags(),
    queryFn: () => blogApi.getPopularTags(),
  });
}

export function useBlogStats() {
  return useQuery({
    queryKey: blogKeys.stats(),
    queryFn: () => blogApi.getStats(),
  });
}

// =============================================
// MUTATIONS
// =============================================

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBlogPostDto) => blogApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlogPostDto }) =>
      blogApi.updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}

export function useRatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, rating }: { postId: string; rating: number }) =>
      blogApi.ratePost(postId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: string;
      data: CreateCommentDto;
    }) => blogApi.createComment(postId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
    },
  });
}

export function useUploadBlogImages() {
  return useMutation({
    mutationFn: (files: File[]) => blogApi.uploadImages(files),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryDto) => blogApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.categories() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => blogApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.categories() });
    },
  });
}
