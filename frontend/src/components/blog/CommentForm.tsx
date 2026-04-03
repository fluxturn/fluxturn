import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
  buttonText?: string;
  compact?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  isSubmitting = false,
  placeholder = 'Write a comment...',
  buttonText = 'Post Comment',
  compact = false,
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSubmitting) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        rows={compact ? 2 : 4}
        className={`w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none transition-all ${
          compact ? 'text-sm' : ''
        }`}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium transition-all hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            compact ? 'text-sm px-3 py-1.5' : ''
          }`}
        >
          <Send size={compact ? 14 : 16} />
          {isSubmitting ? 'Posting...' : buttonText}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;
