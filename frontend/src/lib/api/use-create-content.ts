import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { api } from '../api';

export interface CreateContentDto {
  prompt: string;
  contentType: 'blog_post' | 'caption' | 'email' | 'summary' | 'custom';
  parameters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateContentResponse {
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export function useCreateContent(_projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<CreateContentResponse, Error, CreateContentDto>({
    mutationFn: async (data) => {
      let response: Record<string, unknown>;

      // Based on content type, call different AI endpoints
      switch (data.contentType) {
        case 'blog_post':
          response = await api.post<Record<string, unknown>>('/ai/blog-post', {
            topic: data.prompt,
            keywords: data.parameters?.keywords || [],
            tone: data.parameters?.tone,
          });
          return {
            content: response.blogPost as string,
            title: `Blog Post: ${data.prompt}`,
            metadata: {
              contentType: 'blog_post',
              keywords: data.parameters?.keywords,
              tone: data.parameters?.tone,
            },
          };
          
        case 'caption':
          response = await api.post<Record<string, unknown>>('/ai/caption', {
            content: data.prompt,
            platform: data.parameters?.platform || 'general',
            hashtags: data.parameters?.hashtags || [],
            tone: data.parameters?.tone,
          });
          return {
            content: response.caption as string,
            title: `Caption for ${data.parameters?.platform || 'social media'}`,
            metadata: { 
              contentType: 'caption',
              platform: data.parameters?.platform,
              hashtags: data.parameters?.hashtags,
            },
          };
          
        case 'email':
          response = await api.post<Record<string, unknown>>('/ai/email-reply', {
            originalEmail: data.prompt,
            context: data.parameters?.context,
            tone: data.parameters?.tone,
          });
          return {
            content: response.emailReply as string,
            title: 'Email Reply',
            metadata: { 
              contentType: 'email',
              tone: data.parameters?.tone,
            },
          };
          
        case 'summary':
          response = await api.post<Record<string, unknown>>('/ai/summarize', {
            text: data.prompt,
            maxLength: data.parameters?.maxLength,
            style: data.parameters?.style || 'paragraph',
            focus: data.parameters?.focus,
          });
          return {
            content: response.summary as string,
            title: 'Summary',
            metadata: { 
              contentType: 'summary',
              style: data.parameters?.style,
              focus: data.parameters?.focus,
            },
          };
          
        default:
          response = await api.post<Record<string, unknown>>('/ai/text', {
            prompt: data.prompt,
            model: data.parameters?.model,
            temperature: data.parameters?.temperature,
            maxTokens: data.parameters?.maxTokens,
          });
          return {
            content: response.result as string,
            title: 'Generated Text',
            metadata: { 
              contentType: 'text',
              model: data.parameters?.model,
            },
          };
      }
    },
    onSuccess: () => {
      // Invalidate content queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      
      toast.success('Your content has been generated successfully.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate content.');
    },
  });
}