import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseConnector } from '../../base/base.connector';
import { IConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse,
  PaginatedRequest
} from '../../types/index';

// WordPress interfaces
interface IPost {
  id?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  author?: number;
  comment_status?: string;
  ping_status?: string;
  format?: string;
  sticky?: boolean;
  template?: string;
  categories?: number[];
  tags?: number[];
  date?: string;
}

interface IPage {
  id?: number;
  title?: string;
  content?: string;
  slug?: string;
  password?: string;
  status?: string;
  author?: number;
  comment_status?: string;
  ping_status?: string;
  template?: string;
  menu_order?: number;
  parent?: number;
  featured_media?: number;
}

interface IUser {
  id?: number;
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  slug?: string;
  email?: string;
  url?: string;
  description?: string;
  password?: string;
}

@Injectable()
export class WordPressConnector extends BaseConnector implements IConnector {
  private client: AxiosInstance;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'WordPress',
      description: 'WordPress REST API for managing posts, pages, users, categories, tags, and media',
      version: '1.0.0',
      category: ConnectorCategory.CMS,
      type: ConnectorType.WORDPRESS,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wordpress.svg',
      authType: AuthType.BASIC_AUTH,
      actions: [
        // Post Actions
        {
          id: 'create_post',
          name: 'Create Post',
          description: 'Create a new WordPress post',
          inputSchema: {
            title: {
              type: 'string',
              required: true,
              label: 'Title',
              description: 'The title for the post',
              placeholder: 'My New Post'
            },
            content: {
              type: 'string',
              required: false,
              label: 'Content',
              description: 'The content for the post (HTML supported)',
              inputType: 'textarea'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              description: 'A named status for the post',
              default: 'draft',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Publish', value: 'publish' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' },
                { label: 'Future', value: 'future' }
              ]
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug',
              description: 'An alphanumeric identifier for the post unique to its type',
              placeholder: 'my-new-post'
            },
            author: {
              type: 'number',
              required: false,
              label: 'Author ID',
              description: 'The ID for the author of the post'
            },
            categories: {
              type: 'string',
              required: false,
              label: 'Category IDs',
              description: 'Comma-separated list of category IDs',
              placeholder: '1,2,3'
            },
            tags: {
              type: 'string',
              required: false,
              label: 'Tag IDs',
              description: 'Comma-separated list of tag IDs',
              placeholder: '1,2,3'
            },
            format: {
              type: 'select',
              required: false,
              label: 'Format',
              description: 'The format for the post',
              default: 'standard',
              options: [
                { label: 'Standard', value: 'standard' },
                { label: 'Aside', value: 'aside' },
                { label: 'Audio', value: 'audio' },
                { label: 'Chat', value: 'chat' },
                { label: 'Gallery', value: 'gallery' },
                { label: 'Image', value: 'image' },
                { label: 'Link', value: 'link' },
                { label: 'Quote', value: 'quote' },
                { label: 'Status', value: 'status' },
                { label: 'Video', value: 'video' }
              ]
            },
            sticky: {
              type: 'boolean',
              required: false,
              label: 'Sticky',
              description: 'Whether the post should be treated as sticky',
              default: false
            },
            comment_status: {
              type: 'select',
              required: false,
              label: 'Comment Status',
              description: 'Whether comments are open on the post',
              default: 'open',
              options: [
                { label: 'Open', value: 'open' },
                { label: 'Closed', value: 'closed' }
              ]
            },
            ping_status: {
              type: 'select',
              required: false,
              label: 'Ping Status',
              description: 'Whether pings are allowed',
              default: 'open',
              options: [
                { label: 'Open', value: 'open' },
                { label: 'Closed', value: 'closed' }
              ]
            },
            date: {
              type: 'string',
              required: false,
              label: 'Date',
              description: 'The date the post was published (ISO8601 format)',
              placeholder: '2024-01-01T12:00:00'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Post ID' },
            title: { type: 'object', description: 'Post title object with rendered property' },
            slug: { type: 'string', description: 'Post slug' },
            status: { type: 'string', description: 'Post status' },
            link: { type: 'string', description: 'Post URL' },
            date: { type: 'string', description: 'Post date' }
          }
        },
        {
          id: 'get_post',
          name: 'Get Post',
          description: 'Get a WordPress post by ID',
          inputSchema: {
            postId: {
              type: 'string',
              required: true,
              label: 'Post ID',
              description: 'Unique identifier for the post',
              placeholder: '123'
            },
            context: {
              type: 'select',
              required: false,
              label: 'Context',
              description: 'Scope under which the request is made',
              default: 'view',
              options: [
                { label: 'View', value: 'view' },
                { label: 'Embed', value: 'embed' },
                { label: 'Edit', value: 'edit' }
              ]
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Post ID' },
            title: { type: 'object', description: 'Post title' },
            content: { type: 'object', description: 'Post content' },
            status: { type: 'string', description: 'Post status' },
            link: { type: 'string', description: 'Post URL' }
          }
        },
        {
          id: 'get_posts',
          name: 'Get Posts',
          description: 'Get multiple WordPress posts',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              description: 'Number of posts to retrieve (max 100)',
              default: 10
            },
            page: {
              type: 'number',
              required: false,
              label: 'Page',
              description: 'Page number',
              default: 1
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              description: 'Filter by post status',
              default: 'publish',
              options: [
                { label: 'Publish', value: 'publish' },
                { label: 'Draft', value: 'draft' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' },
                { label: 'Future', value: 'future' }
              ]
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search',
              description: 'Limit results to those matching a string'
            },
            orderby: {
              type: 'select',
              required: false,
              label: 'Order By',
              description: 'Sort posts by attribute',
              default: 'date',
              options: [
                { label: 'Date', value: 'date' },
                { label: 'ID', value: 'id' },
                { label: 'Title', value: 'title' },
                { label: 'Slug', value: 'slug' },
                { label: 'Author', value: 'author' },
                { label: 'Modified', value: 'modified' }
              ]
            },
            order: {
              type: 'select',
              required: false,
              label: 'Order',
              description: 'Order sort attribute ascending or descending',
              default: 'desc',
              options: [
                { label: 'Ascending', value: 'asc' },
                { label: 'Descending', value: 'desc' }
              ]
            },
            categories: {
              type: 'string',
              required: false,
              label: 'Category IDs',
              description: 'Comma-separated list of category IDs to filter by'
            },
            tags: {
              type: 'string',
              required: false,
              label: 'Tag IDs',
              description: 'Comma-separated list of tag IDs to filter by'
            },
            author: {
              type: 'number',
              required: false,
              label: 'Author ID',
              description: 'Filter by author ID'
            }
          },
          outputSchema: {
            posts: { type: 'array', description: 'Array of posts' },
            total: { type: 'number', description: 'Total number of posts' },
            totalPages: { type: 'number', description: 'Total number of pages' }
          }
        },
        {
          id: 'update_post',
          name: 'Update Post',
          description: 'Update an existing WordPress post',
          inputSchema: {
            postId: {
              type: 'string',
              required: true,
              label: 'Post ID',
              description: 'Unique identifier for the post',
              placeholder: '123'
            },
            title: {
              type: 'string',
              required: false,
              label: 'Title',
              description: 'The title for the post'
            },
            content: {
              type: 'string',
              required: false,
              label: 'Content',
              description: 'The content for the post',
              inputType: 'textarea'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Publish', value: 'publish' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' }
              ]
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug'
            },
            categories: {
              type: 'string',
              required: false,
              label: 'Category IDs',
              description: 'Comma-separated list of category IDs'
            },
            tags: {
              type: 'string',
              required: false,
              label: 'Tag IDs',
              description: 'Comma-separated list of tag IDs'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Post ID' },
            title: { type: 'object', description: 'Post title' },
            status: { type: 'string', description: 'Post status' },
            link: { type: 'string', description: 'Post URL' }
          }
        },
        {
          id: 'delete_post',
          name: 'Delete Post',
          description: 'Delete a WordPress post',
          inputSchema: {
            postId: {
              type: 'string',
              required: true,
              label: 'Post ID',
              description: 'Unique identifier for the post'
            },
            force: {
              type: 'boolean',
              required: false,
              label: 'Force Delete',
              description: 'Whether to bypass trash and force deletion',
              default: false
            }
          },
          outputSchema: {
            deleted: { type: 'boolean', description: 'Whether the post was deleted' },
            previous: { type: 'object', description: 'The deleted post data' }
          }
        },
        // Page Actions
        {
          id: 'create_page',
          name: 'Create Page',
          description: 'Create a new WordPress page',
          inputSchema: {
            title: {
              type: 'string',
              required: true,
              label: 'Title',
              description: 'The title for the page'
            },
            content: {
              type: 'string',
              required: false,
              label: 'Content',
              description: 'The content for the page',
              inputType: 'textarea'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              default: 'draft',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Publish', value: 'publish' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' }
              ]
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug'
            },
            parent: {
              type: 'number',
              required: false,
              label: 'Parent Page ID',
              description: 'The ID for the parent of the page'
            },
            menu_order: {
              type: 'number',
              required: false,
              label: 'Menu Order',
              description: 'The order of the page in relation to other pages'
            },
            template: {
              type: 'string',
              required: false,
              label: 'Template',
              description: 'The theme file to use'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Page ID' },
            title: { type: 'object', description: 'Page title' },
            status: { type: 'string', description: 'Page status' },
            link: { type: 'string', description: 'Page URL' }
          }
        },
        {
          id: 'get_page',
          name: 'Get Page',
          description: 'Get a WordPress page by ID',
          inputSchema: {
            pageId: {
              type: 'string',
              required: true,
              label: 'Page ID',
              description: 'Unique identifier for the page'
            },
            context: {
              type: 'select',
              required: false,
              label: 'Context',
              default: 'view',
              options: [
                { label: 'View', value: 'view' },
                { label: 'Embed', value: 'embed' },
                { label: 'Edit', value: 'edit' }
              ]
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Page ID' },
            title: { type: 'object', description: 'Page title' },
            content: { type: 'object', description: 'Page content' },
            status: { type: 'string', description: 'Page status' },
            link: { type: 'string', description: 'Page URL' }
          }
        },
        {
          id: 'get_pages',
          name: 'Get Pages',
          description: 'Get multiple WordPress pages',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 10
            },
            page: {
              type: 'number',
              required: false,
              label: 'Page',
              default: 1
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              default: 'publish',
              options: [
                { label: 'Publish', value: 'publish' },
                { label: 'Draft', value: 'draft' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' }
              ]
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search'
            },
            parent: {
              type: 'number',
              required: false,
              label: 'Parent ID',
              description: 'Filter by parent page ID'
            },
            orderby: {
              type: 'select',
              required: false,
              label: 'Order By',
              default: 'date',
              options: [
                { label: 'Date', value: 'date' },
                { label: 'ID', value: 'id' },
                { label: 'Title', value: 'title' },
                { label: 'Menu Order', value: 'menu_order' }
              ]
            },
            order: {
              type: 'select',
              required: false,
              label: 'Order',
              default: 'desc',
              options: [
                { label: 'Ascending', value: 'asc' },
                { label: 'Descending', value: 'desc' }
              ]
            }
          },
          outputSchema: {
            pages: { type: 'array', description: 'Array of pages' },
            total: { type: 'number', description: 'Total number of pages' },
            totalPages: { type: 'number', description: 'Total number of result pages' }
          }
        },
        {
          id: 'update_page',
          name: 'Update Page',
          description: 'Update an existing WordPress page',
          inputSchema: {
            pageId: {
              type: 'string',
              required: true,
              label: 'Page ID'
            },
            title: {
              type: 'string',
              required: false,
              label: 'Title'
            },
            content: {
              type: 'string',
              required: false,
              label: 'Content',
              inputType: 'textarea'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Publish', value: 'publish' },
                { label: 'Pending', value: 'pending' },
                { label: 'Private', value: 'private' }
              ]
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug'
            },
            parent: {
              type: 'number',
              required: false,
              label: 'Parent Page ID'
            },
            menu_order: {
              type: 'number',
              required: false,
              label: 'Menu Order'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Page ID' },
            title: { type: 'object', description: 'Page title' },
            status: { type: 'string', description: 'Page status' },
            link: { type: 'string', description: 'Page URL' }
          }
        },
        {
          id: 'delete_page',
          name: 'Delete Page',
          description: 'Delete a WordPress page',
          inputSchema: {
            pageId: {
              type: 'string',
              required: true,
              label: 'Page ID'
            },
            force: {
              type: 'boolean',
              required: false,
              label: 'Force Delete',
              default: false
            }
          },
          outputSchema: {
            deleted: { type: 'boolean', description: 'Whether the page was deleted' },
            previous: { type: 'object', description: 'The deleted page data' }
          }
        },
        // User Actions
        {
          id: 'create_user',
          name: 'Create User',
          description: 'Create a new WordPress user',
          inputSchema: {
            username: {
              type: 'string',
              required: true,
              label: 'Username',
              description: 'Login name for the user'
            },
            email: {
              type: 'string',
              required: true,
              label: 'Email',
              description: 'The email address for the user',
              inputType: 'email'
            },
            password: {
              type: 'string',
              required: true,
              label: 'Password',
              description: 'Password for the user',
              inputType: 'password'
            },
            name: {
              type: 'string',
              required: false,
              label: 'Display Name',
              description: 'Display name for the user'
            },
            first_name: {
              type: 'string',
              required: false,
              label: 'First Name'
            },
            last_name: {
              type: 'string',
              required: false,
              label: 'Last Name'
            },
            nickname: {
              type: 'string',
              required: false,
              label: 'Nickname'
            },
            url: {
              type: 'string',
              required: false,
              label: 'URL',
              description: 'URL of the user'
            },
            description: {
              type: 'string',
              required: false,
              label: 'Description',
              description: 'Description of the user',
              inputType: 'textarea'
            },
            roles: {
              type: 'string',
              required: false,
              label: 'Roles',
              description: 'Comma-separated list of roles (subscriber, contributor, author, editor, administrator)',
              placeholder: 'subscriber'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email' },
            link: { type: 'string', description: 'Author URL' }
          }
        },
        {
          id: 'get_user',
          name: 'Get User',
          description: 'Get a WordPress user by ID',
          inputSchema: {
            userId: {
              type: 'string',
              required: true,
              label: 'User ID',
              description: 'Unique identifier for the user'
            },
            context: {
              type: 'select',
              required: false,
              label: 'Context',
              default: 'view',
              options: [
                { label: 'View', value: 'view' },
                { label: 'Embed', value: 'embed' },
                { label: 'Edit', value: 'edit' }
              ]
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email' },
            roles: { type: 'array', description: 'User roles' }
          }
        },
        {
          id: 'get_users',
          name: 'Get Users',
          description: 'Get multiple WordPress users',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 10
            },
            page: {
              type: 'number',
              required: false,
              label: 'Page',
              default: 1
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search'
            },
            roles: {
              type: 'string',
              required: false,
              label: 'Roles',
              description: 'Filter by roles (comma-separated)'
            },
            orderby: {
              type: 'select',
              required: false,
              label: 'Order By',
              default: 'name',
              options: [
                { label: 'ID', value: 'id' },
                { label: 'Name', value: 'name' },
                { label: 'Email', value: 'email' },
                { label: 'Registered Date', value: 'registered_date' }
              ]
            },
            order: {
              type: 'select',
              required: false,
              label: 'Order',
              default: 'asc',
              options: [
                { label: 'Ascending', value: 'asc' },
                { label: 'Descending', value: 'desc' }
              ]
            }
          },
          outputSchema: {
            users: { type: 'array', description: 'Array of users' },
            total: { type: 'number', description: 'Total number of users' },
            totalPages: { type: 'number', description: 'Total number of pages' }
          }
        },
        {
          id: 'update_user',
          name: 'Update User',
          description: 'Update an existing WordPress user',
          inputSchema: {
            userId: {
              type: 'string',
              required: true,
              label: 'User ID'
            },
            email: {
              type: 'string',
              required: false,
              label: 'Email',
              inputType: 'email'
            },
            name: {
              type: 'string',
              required: false,
              label: 'Display Name'
            },
            first_name: {
              type: 'string',
              required: false,
              label: 'First Name'
            },
            last_name: {
              type: 'string',
              required: false,
              label: 'Last Name'
            },
            nickname: {
              type: 'string',
              required: false,
              label: 'Nickname'
            },
            url: {
              type: 'string',
              required: false,
              label: 'URL'
            },
            description: {
              type: 'string',
              required: false,
              label: 'Description',
              inputType: 'textarea'
            },
            password: {
              type: 'string',
              required: false,
              label: 'New Password',
              inputType: 'password'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email' }
          }
        },
        {
          id: 'delete_user',
          name: 'Delete User',
          description: 'Delete a WordPress user',
          inputSchema: {
            userId: {
              type: 'string',
              required: true,
              label: 'User ID'
            },
            reassign: {
              type: 'number',
              required: true,
              label: 'Reassign To',
              description: 'Reassign posts to this user ID'
            }
          },
          outputSchema: {
            deleted: { type: 'boolean', description: 'Whether the user was deleted' },
            previous: { type: 'object', description: 'The deleted user data' }
          }
        },
        // Category Actions
        {
          id: 'get_categories',
          name: 'Get Categories',
          description: 'Get WordPress categories',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 100
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search'
            },
            hide_empty: {
              type: 'boolean',
              required: false,
              label: 'Hide Empty',
              description: 'Whether to hide categories with no posts',
              default: false
            }
          },
          outputSchema: {
            categories: { type: 'array', description: 'Array of categories' }
          }
        },
        {
          id: 'create_category',
          name: 'Create Category',
          description: 'Create a new WordPress category',
          inputSchema: {
            name: {
              type: 'string',
              required: true,
              label: 'Name',
              description: 'HTML title for the category'
            },
            description: {
              type: 'string',
              required: false,
              label: 'Description',
              inputType: 'textarea'
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug'
            },
            parent: {
              type: 'number',
              required: false,
              label: 'Parent ID',
              description: 'The parent category ID'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Category ID' },
            name: { type: 'string', description: 'Category name' },
            slug: { type: 'string', description: 'Category slug' },
            link: { type: 'string', description: 'Category URL' }
          }
        },
        // Tag Actions
        {
          id: 'get_tags',
          name: 'Get Tags',
          description: 'Get WordPress tags',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 100
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search'
            },
            hide_empty: {
              type: 'boolean',
              required: false,
              label: 'Hide Empty',
              default: false
            }
          },
          outputSchema: {
            tags: { type: 'array', description: 'Array of tags' }
          }
        },
        {
          id: 'create_tag',
          name: 'Create Tag',
          description: 'Create a new WordPress tag',
          inputSchema: {
            name: {
              type: 'string',
              required: true,
              label: 'Name'
            },
            description: {
              type: 'string',
              required: false,
              label: 'Description',
              inputType: 'textarea'
            },
            slug: {
              type: 'string',
              required: false,
              label: 'Slug'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Tag ID' },
            name: { type: 'string', description: 'Tag name' },
            slug: { type: 'string', description: 'Tag slug' },
            link: { type: 'string', description: 'Tag URL' }
          }
        },
        // Media Actions
        {
          id: 'get_media',
          name: 'Get Media',
          description: 'Get WordPress media items',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 10
            },
            page: {
              type: 'number',
              required: false,
              label: 'Page',
              default: 1
            },
            media_type: {
              type: 'select',
              required: false,
              label: 'Media Type',
              options: [
                { label: 'All', value: '' },
                { label: 'Image', value: 'image' },
                { label: 'Video', value: 'video' },
                { label: 'Audio', value: 'audio' },
                { label: 'Application', value: 'application' }
              ]
            },
            search: {
              type: 'string',
              required: false,
              label: 'Search'
            }
          },
          outputSchema: {
            media: { type: 'array', description: 'Array of media items' },
            total: { type: 'number', description: 'Total number of media items' }
          }
        },
        // Comment Actions
        {
          id: 'get_comments',
          name: 'Get Comments',
          description: 'Get WordPress comments',
          inputSchema: {
            per_page: {
              type: 'number',
              required: false,
              label: 'Per Page',
              default: 10
            },
            page: {
              type: 'number',
              required: false,
              label: 'Page',
              default: 1
            },
            post: {
              type: 'number',
              required: false,
              label: 'Post ID',
              description: 'Filter by post ID'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              default: 'approve',
              options: [
                { label: 'Approved', value: 'approve' },
                { label: 'Hold', value: 'hold' },
                { label: 'Spam', value: 'spam' },
                { label: 'Trash', value: 'trash' }
              ]
            }
          },
          outputSchema: {
            comments: { type: 'array', description: 'Array of comments' },
            total: { type: 'number', description: 'Total number of comments' }
          }
        },
        {
          id: 'create_comment',
          name: 'Create Comment',
          description: 'Create a new WordPress comment',
          inputSchema: {
            post: {
              type: 'number',
              required: true,
              label: 'Post ID',
              description: 'The ID of the post to comment on'
            },
            content: {
              type: 'string',
              required: true,
              label: 'Content',
              description: 'The comment content',
              inputType: 'textarea'
            },
            author_name: {
              type: 'string',
              required: false,
              label: 'Author Name'
            },
            author_email: {
              type: 'string',
              required: false,
              label: 'Author Email',
              inputType: 'email'
            },
            parent: {
              type: 'number',
              required: false,
              label: 'Parent Comment ID',
              description: 'The ID of the parent comment (for replies)'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Comment ID' },
            post: { type: 'number', description: 'Post ID' },
            content: { type: 'object', description: 'Comment content' },
            status: { type: 'string', description: 'Comment status' }
          }
        }
      ],
      triggers: [
        // WordPress doesn't have native webhooks, but we can implement polling triggers
        {
          id: 'new_post',
          name: 'New Post',
          description: 'Triggers when a new post is published',
          eventType: 'post.created',
          inputSchema: {
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              description: 'Only trigger for posts with this status',
              default: 'publish',
              options: [
                { label: 'Publish', value: 'publish' },
                { label: 'Draft', value: 'draft' },
                { label: 'Any', value: '' }
              ]
            },
            categories: {
              type: 'string',
              required: false,
              label: 'Category IDs',
              description: 'Only trigger for posts in these categories (comma-separated)'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Post ID' },
            title: { type: 'object', description: 'Post title' },
            content: { type: 'object', description: 'Post content' },
            status: { type: 'string', description: 'Post status' },
            link: { type: 'string', description: 'Post URL' },
            author: { type: 'number', description: 'Author ID' },
            date: { type: 'string', description: 'Post date' }
          },
          webhookRequired: false,
          pollingEnabled: true
        },
        {
          id: 'new_page',
          name: 'New Page',
          description: 'Triggers when a new page is created',
          eventType: 'page.created',
          inputSchema: {
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              default: 'publish',
              options: [
                { label: 'Publish', value: 'publish' },
                { label: 'Draft', value: 'draft' },
                { label: 'Any', value: '' }
              ]
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Page ID' },
            title: { type: 'object', description: 'Page title' },
            content: { type: 'object', description: 'Page content' },
            status: { type: 'string', description: 'Page status' },
            link: { type: 'string', description: 'Page URL' }
          },
          webhookRequired: false,
          pollingEnabled: true
        },
        {
          id: 'new_user',
          name: 'New User',
          description: 'Triggers when a new user is registered',
          eventType: 'user.created',
          outputSchema: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email' }
          },
          webhookRequired: false,
          pollingEnabled: true
        },
        {
          id: 'new_comment',
          name: 'New Comment',
          description: 'Triggers when a new comment is posted',
          eventType: 'comment.created',
          inputSchema: {
            post: {
              type: 'number',
              required: false,
              label: 'Post ID',
              description: 'Only trigger for comments on this post'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status',
              default: 'approve',
              options: [
                { label: 'Approved', value: 'approve' },
                { label: 'Hold', value: 'hold' },
                { label: 'Any', value: '' }
              ]
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Comment ID' },
            post: { type: 'number', description: 'Post ID' },
            author_name: { type: 'string', description: 'Author name' },
            content: { type: 'object', description: 'Comment content' },
            date: { type: 'string', description: 'Comment date' }
          },
          webhookRequired: false,
          pollingEnabled: true
        }
      ],
      rateLimit: {
        requestsPerHour: 5000,
        requestsPerMinute: 100
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Support both 'domain' (from database) and 'siteUrl' (legacy) field names
    const siteUrl = this.config.credentials.domain || this.config.credentials.siteUrl;
    const { username, password } = this.config.credentials;

    if (!siteUrl || !username || !password) {
      throw new Error('WordPress site URL, username, and password are required');
    }

    // Clean up the URL - ensure it has protocol and no trailing slash
    this.baseUrl = siteUrl.replace(/\/$/, '');
    if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
      this.baseUrl = `https://${this.baseUrl}`;
    }

    // Create axios client with basic auth
    this.client = axios.create({
      baseURL: `${this.baseUrl}/wp-json/wp/v2`,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'FluxTurn-Connector/1.0.0'
      },
      auth: {
        username,
        password
      }
    });

    this.logger.log('WordPress connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me');
      this.logger.log(`Connected to WordPress as: ${response.data.name}`);
      return true;
    } catch (error) {
      throw new Error(`WordPress connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.client.get('/users/me');
    if (!response.data) {
      throw new Error('WordPress health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.client.request({
        method: request.method,
        url: request.endpoint,
        data: request.body,
        params: request.queryParams
      });
      return response.data;
    } catch (error) {
      throw new Error(`WordPress API request failed: ${error.message}`);
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      // Post actions
      case 'create_post':
        return this.createPost(input);
      case 'get_post':
        return this.getPost(input.postId, input);
      case 'get_posts':
        return this.getPosts(input);
      case 'update_post':
        return this.updatePost(input.postId, input);
      case 'delete_post':
        return this.deletePost(input.postId, input.force);

      // Page actions
      case 'create_page':
        return this.createPage(input);
      case 'get_page':
        return this.getPage(input.pageId, input);
      case 'get_pages':
        return this.getPages(input);
      case 'update_page':
        return this.updatePage(input.pageId, input);
      case 'delete_page':
        return this.deletePage(input.pageId, input.force);

      // User actions
      case 'create_user':
        return this.createUser(input);
      case 'get_user':
        return this.getUser(input.userId, input);
      case 'get_users':
        return this.getUsers(input);
      case 'update_user':
        return this.updateUser(input.userId, input);
      case 'delete_user':
        return this.deleteUser(input.userId, input.reassign);

      // Category actions
      case 'get_categories':
        return this.getCategories(input);
      case 'create_category':
        return this.createCategory(input);

      // Tag actions
      case 'get_tags':
        return this.getTags(input);
      case 'create_tag':
        return this.createTag(input);

      // Media actions
      case 'get_media':
        return this.getMedia(input);

      // Comment actions
      case 'get_comments':
        return this.getComments(input);
      case 'create_comment':
        return this.createComment(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('WordPress connector cleanup completed');
  }

  // Post Methods
  private async createPost(input: any): Promise<ConnectorResponse> {
    try {
      const body: IPost = {
        title: input.title,
        content: input.content,
        status: input.status || 'draft',
        slug: input.slug,
        author: input.author,
        format: input.format,
        sticky: input.sticky,
        comment_status: input.comment_status,
        ping_status: input.ping_status,
        date: input.date
      };

      if (input.categories) {
        body.categories = input.categories.split(',').map((id: string) => parseInt(id.trim(), 10));
      }
      if (input.tags) {
        body.tags = input.tags.split(',').map((id: string) => parseInt(id.trim(), 10));
      }

      // Remove undefined values
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/posts', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress post');
    }
  }

  private async getPost(postId: string, options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (options.context) params.context = options.context;
      if (options.password) params.password = options.password;

      const response = await this.client.get(`/posts/${postId}`, { params });

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to get WordPress post ${postId}`);
    }
  }

  private async getPosts(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 10,
        page: options.page || 1
      };

      if (options.status) params.status = options.status;
      if (options.search) params.search = options.search;
      if (options.orderby) params.orderby = options.orderby;
      if (options.order) params.order = options.order;
      if (options.author) params.author = options.author;
      if (options.categories) params.categories = options.categories;
      if (options.tags) params.tags = options.tags;

      const response = await this.client.get('/posts', { params });

      return {
        success: true,
        data: {
          posts: response.data,
          total: parseInt(response.headers['x-wp-total'] || '0', 10),
          totalPages: parseInt(response.headers['x-wp-totalpages'] || '0', 10)
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress posts');
    }
  }

  private async updatePost(postId: string, input: any): Promise<ConnectorResponse> {
    try {
      const body: IPost = {};

      if (input.title !== undefined) body.title = input.title;
      if (input.content !== undefined) body.content = input.content;
      if (input.status !== undefined) body.status = input.status;
      if (input.slug !== undefined) body.slug = input.slug;
      if (input.author !== undefined) body.author = input.author;
      if (input.format !== undefined) body.format = input.format;
      if (input.sticky !== undefined) body.sticky = input.sticky;
      if (input.comment_status !== undefined) body.comment_status = input.comment_status;
      if (input.ping_status !== undefined) body.ping_status = input.ping_status;

      if (input.categories) {
        body.categories = input.categories.split(',').map((id: string) => parseInt(id.trim(), 10));
      }
      if (input.tags) {
        body.tags = input.tags.split(',').map((id: string) => parseInt(id.trim(), 10));
      }

      const response = await this.client.post(`/posts/${postId}`, body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to update WordPress post ${postId}`);
    }
  }

  private async deletePost(postId: string, force: boolean = false): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (force) params.force = true;

      const response = await this.client.delete(`/posts/${postId}`, { params });

      return {
        success: true,
        data: {
          deleted: true,
          previous: response.data
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to delete WordPress post ${postId}`);
    }
  }

  // Page Methods
  private async createPage(input: any): Promise<ConnectorResponse> {
    try {
      const body: IPage = {
        title: input.title,
        content: input.content,
        status: input.status || 'draft',
        slug: input.slug,
        author: input.author,
        parent: input.parent,
        menu_order: input.menu_order,
        template: input.template,
        comment_status: input.comment_status,
        ping_status: input.ping_status
      };

      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/pages', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress page');
    }
  }

  private async getPage(pageId: string, options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (options.context) params.context = options.context;
      if (options.password) params.password = options.password;

      const response = await this.client.get(`/pages/${pageId}`, { params });

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to get WordPress page ${pageId}`);
    }
  }

  private async getPages(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 10,
        page: options.page || 1
      };

      if (options.status) params.status = options.status;
      if (options.search) params.search = options.search;
      if (options.orderby) params.orderby = options.orderby;
      if (options.order) params.order = options.order;
      if (options.parent) params.parent = options.parent;
      if (options.menu_order) params.menu_order = options.menu_order;

      const response = await this.client.get('/pages', { params });

      return {
        success: true,
        data: {
          pages: response.data,
          total: parseInt(response.headers['x-wp-total'] || '0', 10),
          totalPages: parseInt(response.headers['x-wp-totalpages'] || '0', 10)
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress pages');
    }
  }

  private async updatePage(pageId: string, input: any): Promise<ConnectorResponse> {
    try {
      const body: IPage = {};

      if (input.title !== undefined) body.title = input.title;
      if (input.content !== undefined) body.content = input.content;
      if (input.status !== undefined) body.status = input.status;
      if (input.slug !== undefined) body.slug = input.slug;
      if (input.author !== undefined) body.author = input.author;
      if (input.parent !== undefined) body.parent = input.parent;
      if (input.menu_order !== undefined) body.menu_order = input.menu_order;
      if (input.template !== undefined) body.template = input.template;
      if (input.comment_status !== undefined) body.comment_status = input.comment_status;
      if (input.ping_status !== undefined) body.ping_status = input.ping_status;

      const response = await this.client.post(`/pages/${pageId}`, body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to update WordPress page ${pageId}`);
    }
  }

  private async deletePage(pageId: string, force: boolean = false): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (force) params.force = true;

      const response = await this.client.delete(`/pages/${pageId}`, { params });

      return {
        success: true,
        data: {
          deleted: true,
          previous: response.data
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to delete WordPress page ${pageId}`);
    }
  }

  // User Methods
  private async createUser(input: any): Promise<ConnectorResponse> {
    try {
      const body: IUser = {
        username: input.username,
        email: input.email,
        password: input.password,
        name: input.name,
        first_name: input.first_name,
        last_name: input.last_name,
        nickname: input.nickname,
        url: input.url,
        description: input.description
      };

      if (input.roles) {
        (body as any).roles = input.roles.split(',').map((r: string) => r.trim());
      }

      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/users', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress user');
    }
  }

  private async getUser(userId: string, options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {};
      if (options.context) params.context = options.context;

      const response = await this.client.get(`/users/${userId}`, { params });

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to get WordPress user ${userId}`);
    }
  }

  private async getUsers(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 10,
        page: options.page || 1
      };

      if (options.search) params.search = options.search;
      if (options.roles) params.roles = options.roles;
      if (options.orderby) params.orderby = options.orderby;
      if (options.order) params.order = options.order;

      const response = await this.client.get('/users', { params });

      return {
        success: true,
        data: {
          users: response.data,
          total: parseInt(response.headers['x-wp-total'] || '0', 10),
          totalPages: parseInt(response.headers['x-wp-totalpages'] || '0', 10)
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress users');
    }
  }

  private async updateUser(userId: string, input: any): Promise<ConnectorResponse> {
    try {
      const body: IUser = {};

      if (input.email !== undefined) body.email = input.email;
      if (input.name !== undefined) body.name = input.name;
      if (input.first_name !== undefined) body.first_name = input.first_name;
      if (input.last_name !== undefined) body.last_name = input.last_name;
      if (input.nickname !== undefined) body.nickname = input.nickname;
      if (input.url !== undefined) body.url = input.url;
      if (input.description !== undefined) body.description = input.description;
      if (input.password !== undefined) body.password = input.password;

      const response = await this.client.post(`/users/${userId}`, body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to update WordPress user ${userId}`);
    }
  }

  private async deleteUser(userId: string, reassign: number): Promise<ConnectorResponse> {
    try {
      const params: any = {
        force: true,
        reassign: reassign
      };

      const response = await this.client.delete(`/users/${userId}`, { params });

      return {
        success: true,
        data: {
          deleted: true,
          previous: response.data
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, `Failed to delete WordPress user ${userId}`);
    }
  }

  // Category Methods
  private async getCategories(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 100
      };

      if (options.search) params.search = options.search;
      if (options.hide_empty !== undefined) params.hide_empty = options.hide_empty;

      const response = await this.client.get('/categories', { params });

      return {
        success: true,
        data: {
          categories: response.data
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress categories');
    }
  }

  private async createCategory(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        name: input.name,
        description: input.description,
        slug: input.slug,
        parent: input.parent
      };

      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/categories', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress category');
    }
  }

  // Tag Methods
  private async getTags(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 100
      };

      if (options.search) params.search = options.search;
      if (options.hide_empty !== undefined) params.hide_empty = options.hide_empty;

      const response = await this.client.get('/tags', { params });

      return {
        success: true,
        data: {
          tags: response.data
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress tags');
    }
  }

  private async createTag(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        name: input.name,
        description: input.description,
        slug: input.slug
      };

      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/tags', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress tag');
    }
  }

  // Media Methods
  private async getMedia(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 10,
        page: options.page || 1
      };

      if (options.media_type) params.media_type = options.media_type;
      if (options.search) params.search = options.search;

      const response = await this.client.get('/media', { params });

      return {
        success: true,
        data: {
          media: response.data,
          total: parseInt(response.headers['x-wp-total'] || '0', 10)
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress media');
    }
  }

  // Comment Methods
  private async getComments(options: any = {}): Promise<ConnectorResponse> {
    try {
      const params: any = {
        per_page: options.per_page || 10,
        page: options.page || 1
      };

      if (options.post) params.post = options.post;
      if (options.status) params.status = options.status;

      const response = await this.client.get('/comments', { params });

      return {
        success: true,
        data: {
          comments: response.data,
          total: parseInt(response.headers['x-wp-total'] || '0', 10)
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get WordPress comments');
    }
  }

  private async createComment(input: any): Promise<ConnectorResponse> {
    try {
      const body: any = {
        post: input.post,
        content: input.content,
        author_name: input.author_name,
        author_email: input.author_email,
        parent: input.parent
      };

      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      const response = await this.client.post('/comments', body);

      return {
        success: true,
        data: response.data,
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create WordPress comment');
    }
  }

  // Resource loading methods for dynamic UI dropdowns
  async getAuthors(): Promise<Array<{ label: string; value: any }>> {
    const response = await this.getUsers({ per_page: 100, roles: 'author,administrator,editor,contributor' });
    if (response.success && response.data?.users) {
      return response.data.users.map((user: any) => ({
        label: user.name,
        value: user.id
      }));
    }
    return [];
  }

  async getCategoriesList(): Promise<Array<{ label: string; value: any }>> {
    const response = await this.getCategories({ per_page: 100 });
    if (response.success && response.data?.categories) {
      return response.data.categories.map((cat: any) => ({
        label: cat.name,
        value: cat.id
      }));
    }
    return [];
  }

  async getTagsList(): Promise<Array<{ label: string; value: any }>> {
    const response = await this.getTags({ per_page: 100 });
    if (response.success && response.data?.tags) {
      return response.data.tags.map((tag: any) => ({
        label: tag.name,
        value: tag.id
      }));
    }
    return [];
  }
}
