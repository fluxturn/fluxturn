import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  ratingCount?: number;
  userRating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  ratingCount = 0,
  userRating,
  onRate,
  readonly = false,
  size = 'md',
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 14,
    md: 18,
    lg: 24,
  };

  const iconSize = sizeClasses[size];

  const handleClick = (star: number) => {
    if (!readonly && onRate) {
      onRate(star);
    }
  };

  const displayRating = hoverRating || userRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayRating;
          const halfFilled = !filled && star - 0.5 <= displayRating;

          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              className={`transition-colors ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              }`}
            >
              <Star
                size={iconSize}
                className={`transition-colors ${
                  filled || halfFilled
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                } ${!readonly && hoverRating >= star ? 'text-yellow-300 fill-yellow-300' : ''}`}
                fill={filled || halfFilled ? 'currentColor' : 'none'}
              />
            </button>
          );
        })}
      </div>

      {/* Rating info */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-yellow-500 font-medium">{rating.toFixed(1)}</span>
        {ratingCount > 0 && (
          <span className="text-gray-500">({ratingCount} ratings)</span>
        )}
      </div>

      {/* User rating indicator */}
      {userRating && userRating > 0 && (
        <span className="text-xs text-cyan-600 ml-2">
          Your rating: {userRating}
        </span>
      )}
    </div>
  );
};

export default RatingStars;
