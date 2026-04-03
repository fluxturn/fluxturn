import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BlogComment } from '../../types/blog';
import Comment from './Comment';
import CommentForm from './CommentForm';

interface CommentSectionProps {
  comments: BlogComment[];
  onSubmitComment: (content: string, parentId?: string) => void;
  isSubmitting?: boolean;
  isAuthenticated?: boolean;
  totalComments?: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  onSubmitComment,
  isSubmitting = false,
  isAuthenticated = false,
  totalComments = 0,
}) => {
  const { t } = useTranslation();

  const handleNewComment = (content: string) => {
    onSubmitComment(content);
  };

  const handleReply = (content: string, parentId: string) => {
    onSubmitComment(content, parentId);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <MessageCircle size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{t('blogPage.comments.title')}</h3>
          <p className="text-sm text-gray-500">
            {totalComments} {totalComments === 1 ? t('blogPage.comments.comment') : t('blogPage.comments.comments')}
          </p>
        </div>
      </div>

      {/* Comment Form */}
      {isAuthenticated ? (
        <div className="mb-8">
          <CommentForm
            onSubmit={handleNewComment}
            isSubmitting={isSubmitting}
            placeholder={t('blogPage.comments.placeholder')}
          />
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-500">
            <a href="/login" className="text-cyan-600 hover:underline">
              {t('blogPage.comments.signIn')}
            </a>
            {' '}{t('blogPage.comments.signInPrompt')}
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{t('blogPage.comments.noComments')}</p>
        </div>
      )}
    </section>
  );
};

export default CommentSection;
