import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, Tag, TrendingUp, Search } from 'lucide-react';
import type { BlogCategory, PopularTag } from '../../types/blog';

interface BlogSidebarProps {
  categories?: BlogCategory[];
  popularTags?: PopularTag[];
  selectedCategory?: string;
  selectedTags?: string[];
  onCategorySelect?: (category: string | undefined) => void;
  onTagSelect?: (tag: string) => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  categories = [],
  popularTags = [],
  selectedCategory,
  selectedTags = [],
  onCategorySelect,
  onTagSelect,
  onSearch,
  searchQuery = '',
}) => {
  return (
    <aside className="space-y-6">
      {/* Search */}
      {onSearch && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
            <Search size={18} className="text-cyan-500" />
            Search
          </h3>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
          <Folder size={18} className="text-cyan-500" />
          Categories
        </h3>
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => onCategorySelect?.(undefined)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                !selectedCategory
                  ? 'bg-cyan-50 text-cyan-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All Posts
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => onCategorySelect?.(category.slug)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.slug
                    ? 'bg-cyan-50 text-cyan-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
            <Tag size={18} className="text-cyan-500" />
            Popular Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => onTagSelect?.(tag.name)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag.name)
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                #{tag.name}
                <span className="ml-1 text-xs opacity-70">({tag.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="flex items-center gap-2 text-gray-900 font-semibold mb-3">
          <TrendingUp size={18} className="text-cyan-500" />
          Quick Links
        </h3>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              to="/blog"
              className="text-gray-600 hover:text-cyan-600 transition-colors"
            >
              Latest Posts
            </Link>
          </li>
          <li>
            <Link
              to="/blog?featured=true"
              className="text-gray-600 hover:text-cyan-600 transition-colors"
            >
              Featured Articles
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default BlogSidebar;
