import React, { useState } from 'react';
import { User, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { BlogComment } from '../../types/blog';
import CommentForm from './CommentForm';

interface CommentProps {
  comment: BlogComment;
  onReply: (content: string, parentId: string) => void;
  isSubmitting?: boolean;
}

export const Comment: React.FC<CommentProps> = ({ comment, onReply, isSubmitting }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleReplySubmit = (content: string) => {
    onReply(content, comment.id);
    setShowReplyForm(false);
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white">
            <User size={18} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900">
                {comment.author_name || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>

            {/* Comment Content */}
            <p className="text-gray-600 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2 ml-2">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-600 transition-colors"
            >
              <MessageCircle size={14} />
              Reply
            </button>

            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-600 transition-colors"
              >
                {showReplies ? (
                  <>
                    <ChevronUp size={14} />
                    Hide {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Show {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200">
              <CommentForm
                onSubmit={handleReplySubmit}
                isSubmitting={isSubmitting}
                placeholder={`Reply to ${comment.author_name || 'Anonymous'}...`}
                buttonText="Reply"
                compact
              />
            </div>
          )}

          {/* Nested Replies */}
          {hasReplies && showReplies && (
            <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 space-y-4">
              {comment.replies!.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comment;
