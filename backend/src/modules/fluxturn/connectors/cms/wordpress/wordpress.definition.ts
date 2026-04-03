// WordPress Connector
// Auto-generated connector definition

import { ConnectorDefinition } from '../../shared';

export const WORDPRESS_CONNECTOR: ConnectorDefinition = {
    name: 'wordpress',
    display_name: 'WordPress',
    category: 'cms',
    description: 'Manage WordPress posts, pages, users, categories, tags, media, and comments via REST API',
    auth_type: 'basic_auth',
    auth_fields: [
      {
        key: 'domain',
        label: 'WordPress Site URL',
        type: 'string',
        required: true,
        placeholder: 'https://yoursite.com',
        description: 'The URL of your WordPress site (without /wp-json)'
      },
      {
        key: 'username',
        label: 'Username',
        type: 'string',
        required: true,
        placeholder: 'admin',
        description: 'Your WordPress username'
      },
      {
        key: 'password',
        label: 'Application Password',
        type: 'password',
        required: true,
        placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
        description: 'Application password generated from WordPress user settings',
        helpUrl: 'https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/',
        helpText: 'How to create an Application Password'
      }
    ],
    endpoints: {
      base_url: '{domain}/wp-json/wp/v2',
      posts: '/posts',
      pages: '/pages',
      users: '/users',
      categories: '/categories',
      tags: '/tags',
      media: '/media',
      comments: '/comments'
    },
    webhook_support: false,
    rate_limits: {
      requests_per_minute: 60,
      requests_per_second: 5
    },
    sandbox_available: false,
    verified: true,
    supported_actions: [
      // Post Actions
      {
        id: 'create_post',
        name: 'Create Post',
        description: 'Create a new blog post',
        category: 'Posts',
        icon: 'file-plus',
        verified: true,
        api: {
          endpoint: '/posts',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'My New Post',
            description: 'The title of the post',
            aiControlled: true,
            aiDescription: 'The title of the blog post'
          },
          content: {
            type: 'string',
            required: false,
            label: 'Content',
            inputType: 'textarea',
            placeholder: '<p>Post content here...</p>',
            description: 'The content of the post (HTML supported)',
            aiControlled: true,
            aiDescription: 'The main content/body of the blog post (HTML supported)'
          },
          excerpt: {
            type: 'string',
            required: false,
            label: 'Excerpt',
            inputType: 'textarea',
            placeholder: 'Short summary...',
            description: 'A short summary of the post',
            aiControlled: true,
            aiDescription: 'A short summary or excerpt of the post'
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
              { label: 'Private', value: 'private' },
              { label: 'Future', value: 'future' }
            ],
            description: 'Post status'
          },
          author: {
            type: 'number',
            required: false,
            label: 'Author ID',
            placeholder: '1',
            description: 'The ID of the author'
          },
          featured_media: {
            type: 'number',
            required: false,
            label: 'Featured Image ID',
            placeholder: '123',
            description: 'Media ID for featured image'
          },
          comment_status: {
            type: 'select',
            required: false,
            label: 'Comments',
            default: 'open',
            options: [
              { label: 'Open', value: 'open' },
              { label: 'Closed', value: 'closed' }
            ],
            description: 'Whether comments are allowed'
          },
          ping_status: {
            type: 'select',
            required: false,
            label: 'Pingbacks',
            default: 'open',
            options: [
              { label: 'Open', value: 'open' },
              { label: 'Closed', value: 'closed' }
            ],
            description: 'Whether pingbacks are allowed'
          },
          format: {
            type: 'select',
            required: false,
            label: 'Format',
            default: 'standard',
            options: [
              { label: 'Standard', value: 'standard' },
              { label: 'Aside', value: 'aside' },
              { label: 'Chat', value: 'chat' },
              { label: 'Gallery', value: 'gallery' },
              { label: 'Link', value: 'link' },
              { label: 'Image', value: 'image' },
              { label: 'Quote', value: 'quote' },
              { label: 'Status', value: 'status' },
              { label: 'Video', value: 'video' },
              { label: 'Audio', value: 'audio' }
            ],
            description: 'Post format'
          },
          sticky: {
            type: 'boolean',
            required: false,
            label: 'Sticky',
            default: false,
            description: 'Make post sticky'
          },
          categories: {
            type: 'string',
            required: false,
            label: 'Category IDs',
            placeholder: '1,2,3',
            description: 'Comma-separated category IDs'
          },
          tags: {
            type: 'string',
            required: false,
            label: 'Tag IDs',
            placeholder: '4,5,6',
            description: 'Comma-separated tag IDs'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Post ID' },
          date: { type: 'string', description: 'Post date' },
          slug: { type: 'string', description: 'Post slug' },
          status: { type: 'string', description: 'Post status' },
          link: { type: 'string', description: 'Post URL' },
          title: { type: 'object', description: 'Post title object' },
          content: { type: 'object', description: 'Post content object' }
        }
      },
      {
        id: 'get_post',
        name: 'Get Post',
        description: 'Get a single post by ID',
        category: 'Posts',
        icon: 'file-text',
        verified: true,
        api: {
          endpoint: '/posts/{postId}',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          postId: {
            type: 'number',
            required: true,
            label: 'Post ID',
            placeholder: '123',
            description: 'The ID of the post to retrieve'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Post ID' },
          date: { type: 'string', description: 'Post date' },
          slug: { type: 'string', description: 'Post slug' },
          status: { type: 'string', description: 'Post status' },
          link: { type: 'string', description: 'Post URL' },
          title: { type: 'object', description: 'Post title object' },
          content: { type: 'object', description: 'Post content object' },
          excerpt: { type: 'object', description: 'Post excerpt object' },
          author: { type: 'number', description: 'Author ID' },
          featured_media: { type: 'number', description: 'Featured media ID' },
          categories: { type: 'array', description: 'Category IDs' },
          tags: { type: 'array', description: 'Tag IDs' }
        }
      },
      {
        id: 'get_all_posts',
        name: 'Get All Posts',
        description: 'Get a list of posts',
        category: 'Posts',
        icon: 'list',
        verified: true,
        api: {
          endpoint: '/posts',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of posts per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'keyword',
            description: 'Search posts by keyword'
          },
          status: {
            type: 'select',
            required: false,
            label: 'Status',
            default: 'publish',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Publish', value: 'publish' },
              { label: 'Draft', value: 'draft' },
              { label: 'Pending', value: 'pending' },
              { label: 'Private', value: 'private' },
              { label: 'Future', value: 'future' },
              { label: 'Trash', value: 'trash' }
            ],
            description: 'Filter by post status'
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
              { label: 'Slug', value: 'slug' },
              { label: 'Modified', value: 'modified' },
              { label: 'Author', value: 'author' }
            ],
            description: 'Sort posts by field'
          },
          order: {
            type: 'select',
            required: false,
            label: 'Order',
            default: 'desc',
            options: [
              { label: 'Descending', value: 'desc' },
              { label: 'Ascending', value: 'asc' }
            ],
            description: 'Sort order'
          },
          categories: {
            type: 'string',
            required: false,
            label: 'Category IDs',
            placeholder: '1,2,3',
            description: 'Filter by category IDs'
          },
          tags: {
            type: 'string',
            required: false,
            label: 'Tag IDs',
            placeholder: '4,5,6',
            description: 'Filter by tag IDs'
          },
          author: {
            type: 'number',
            required: false,
            label: 'Author ID',
            placeholder: '1',
            description: 'Filter by author ID'
          }
        },
        outputSchema: {
          posts: { type: 'array', description: 'Array of posts' },
          total: { type: 'number', description: 'Total number of posts' },
          total_pages: { type: 'number', description: 'Total number of pages' }
        }
      },
      {
        id: 'update_post',
        name: 'Update Post',
        description: 'Update an existing post',
        category: 'Posts',
        icon: 'edit',
        verified: true,
        api: {
          endpoint: '/posts/{postId}',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          postId: {
            type: 'number',
            required: true,
            label: 'Post ID',
            placeholder: '123',
            description: 'The ID of the post to update',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Title',
            placeholder: 'Updated Title',
            description: 'New post title',
            aiControlled: true,
            aiDescription: 'The updated title of the blog post'
          },
          content: {
            type: 'string',
            required: false,
            label: 'Content',
            inputType: 'textarea',
            placeholder: '<p>Updated content...</p>',
            description: 'New post content (HTML supported)',
            aiControlled: true,
            aiDescription: 'The updated content/body of the blog post (HTML supported)'
          },
          excerpt: {
            type: 'string',
            required: false,
            label: 'Excerpt',
            inputType: 'textarea',
            description: 'New post excerpt',
            aiControlled: true,
            aiDescription: 'Updated short summary of the post'
          },
          status: {
            type: 'select',
            required: false,
            label: 'Status',
            options: [
              { label: 'Draft', value: 'draft' },
              { label: 'Publish', value: 'publish' },
              { label: 'Pending', value: 'pending' },
              { label: 'Private', value: 'private' },
              { label: 'Future', value: 'future' }
            ],
            description: 'New post status',
            aiControlled: false
          },
          categories: {
            type: 'string',
            required: false,
            label: 'Category IDs',
            placeholder: '1,2,3',
            description: 'New category IDs (comma-separated)'
          },
          tags: {
            type: 'string',
            required: false,
            label: 'Tag IDs',
            placeholder: '4,5,6',
            description: 'New tag IDs (comma-separated)'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Post ID' },
          date: { type: 'string', description: 'Post date' },
          slug: { type: 'string', description: 'Post slug' },
          status: { type: 'string', description: 'Post status' },
          link: { type: 'string', description: 'Post URL' },
          title: { type: 'object', description: 'Post title object' },
          content: { type: 'object', description: 'Post content object' }
        }
      },
      {
        id: 'delete_post',
        name: 'Delete Post',
        description: 'Delete a post',
        category: 'Posts',
        icon: 'trash-2',
        verified: true,
        api: {
          endpoint: '/posts/{postId}',
          method: 'DELETE',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          postId: {
            type: 'number',
            required: true,
            label: 'Post ID',
            placeholder: '123',
            description: 'The ID of the post to delete'
          },
          force: {
            type: 'boolean',
            required: false,
            label: 'Force Delete',
            default: false,
            description: 'Bypass trash and permanently delete'
          }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether post was deleted' },
          previous: { type: 'object', description: 'Previous post data' }
        }
      },
      // Page Actions
      {
        id: 'create_page',
        name: 'Create Page',
        description: 'Create a new page',
        category: 'Pages',
        icon: 'file-plus',
        verified: true,
        api: {
          endpoint: '/pages',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          title: {
            type: 'string',
            required: true,
            label: 'Title',
            placeholder: 'About Us',
            description: 'The title of the page',
            aiControlled: true,
            aiDescription: 'The title of the WordPress page'
          },
          content: {
            type: 'string',
            required: false,
            label: 'Content',
            inputType: 'textarea',
            placeholder: '<p>Page content here...</p>',
            description: 'The content of the page (HTML supported)',
            aiControlled: true,
            aiDescription: 'The main content/body of the page (HTML supported)'
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
            ],
            description: 'Page status',
            aiControlled: false
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent Page ID',
            placeholder: '0',
            description: 'Parent page ID for hierarchical pages'
          },
          menu_order: {
            type: 'number',
            required: false,
            label: 'Menu Order',
            default: 0,
            description: 'Order in menu/navigation'
          },
          template: {
            type: 'string',
            required: false,
            label: 'Page Template',
            placeholder: 'default',
            description: 'Page template file'
          },
          featured_media: {
            type: 'number',
            required: false,
            label: 'Featured Image ID',
            placeholder: '123',
            description: 'Media ID for featured image'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Page ID' },
          date: { type: 'string', description: 'Page date' },
          slug: { type: 'string', description: 'Page slug' },
          status: { type: 'string', description: 'Page status' },
          link: { type: 'string', description: 'Page URL' },
          title: { type: 'object', description: 'Page title object' },
          content: { type: 'object', description: 'Page content object' }
        }
      },
      {
        id: 'get_page',
        name: 'Get Page',
        description: 'Get a single page by ID',
        category: 'Pages',
        icon: 'file-text',
        verified: true,
        api: {
          endpoint: '/pages/{pageId}',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          pageId: {
            type: 'number',
            required: true,
            label: 'Page ID',
            placeholder: '123',
            description: 'The ID of the page to retrieve'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Page ID' },
          date: { type: 'string', description: 'Page date' },
          slug: { type: 'string', description: 'Page slug' },
          status: { type: 'string', description: 'Page status' },
          link: { type: 'string', description: 'Page URL' },
          title: { type: 'object', description: 'Page title object' },
          content: { type: 'object', description: 'Page content object' },
          parent: { type: 'number', description: 'Parent page ID' },
          menu_order: { type: 'number', description: 'Menu order' }
        }
      },
      {
        id: 'get_all_pages',
        name: 'Get All Pages',
        description: 'Get a list of pages',
        category: 'Pages',
        icon: 'list',
        verified: true,
        api: {
          endpoint: '/pages',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of pages per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'keyword',
            description: 'Search pages by keyword'
          },
          status: {
            type: 'select',
            required: false,
            label: 'Status',
            default: 'publish',
            options: [
              { label: 'Any', value: 'any' },
              { label: 'Publish', value: 'publish' },
              { label: 'Draft', value: 'draft' },
              { label: 'Pending', value: 'pending' },
              { label: 'Private', value: 'private' }
            ],
            description: 'Filter by page status'
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent ID',
            placeholder: '0',
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
            ],
            description: 'Sort pages by field'
          },
          order: {
            type: 'select',
            required: false,
            label: 'Order',
            default: 'desc',
            options: [
              { label: 'Descending', value: 'desc' },
              { label: 'Ascending', value: 'asc' }
            ],
            description: 'Sort order'
          }
        },
        outputSchema: {
          pages: { type: 'array', description: 'Array of pages' },
          total: { type: 'number', description: 'Total number of pages' },
          total_pages: { type: 'number', description: 'Total number of result pages' }
        }
      },
      {
        id: 'update_page',
        name: 'Update Page',
        description: 'Update an existing page',
        category: 'Pages',
        icon: 'edit',
        verified: true,
        api: {
          endpoint: '/pages/{pageId}',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          pageId: {
            type: 'number',
            required: true,
            label: 'Page ID',
            placeholder: '123',
            description: 'The ID of the page to update',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Title',
            placeholder: 'Updated Title',
            description: 'New page title',
            aiControlled: true,
            aiDescription: 'The updated title of the page'
          },
          content: {
            type: 'string',
            required: false,
            label: 'Content',
            inputType: 'textarea',
            placeholder: '<p>Updated content...</p>',
            description: 'New page content (HTML supported)',
            aiControlled: true,
            aiDescription: 'The updated content/body of the page (HTML supported)'
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
            ],
            description: 'New page status',
            aiControlled: false
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent Page ID',
            description: 'New parent page ID'
          },
          menu_order: {
            type: 'number',
            required: false,
            label: 'Menu Order',
            description: 'New menu order'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Page ID' },
          date: { type: 'string', description: 'Page date' },
          slug: { type: 'string', description: 'Page slug' },
          status: { type: 'string', description: 'Page status' },
          link: { type: 'string', description: 'Page URL' },
          title: { type: 'object', description: 'Page title object' },
          content: { type: 'object', description: 'Page content object' }
        }
      },
      {
        id: 'delete_page',
        name: 'Delete Page',
        description: 'Delete a page',
        category: 'Pages',
        icon: 'trash-2',
        verified: true,
        api: {
          endpoint: '/pages/{pageId}',
          method: 'DELETE',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          pageId: {
            type: 'number',
            required: true,
            label: 'Page ID',
            placeholder: '123',
            description: 'The ID of the page to delete'
          },
          force: {
            type: 'boolean',
            required: false,
            label: 'Force Delete',
            default: false,
            description: 'Bypass trash and permanently delete'
          }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether page was deleted' },
          previous: { type: 'object', description: 'Previous page data' }
        }
      },
      // User Actions
      {
        id: 'create_user',
        name: 'Create User',
        description: 'Create a new WordPress user',
        category: 'Users',
        icon: 'user-plus',
        verified: true,
        api: {
          endpoint: '/users',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          username: {
            type: 'string',
            required: true,
            label: 'Username',
            placeholder: 'johndoe',
            description: 'Login username',
            aiControlled: false
          },
          email: {
            type: 'string',
            required: true,
            label: 'Email',
            inputType: 'email',
            placeholder: 'john@example.com',
            description: 'User email address',
            aiControlled: false
          },
          password: {
            type: 'string',
            required: true,
            label: 'Password',
            inputType: 'password',
            placeholder: '••••••••',
            description: 'User password',
            aiControlled: false
          },
          first_name: {
            type: 'string',
            required: false,
            label: 'First Name',
            placeholder: 'John',
            description: 'First name',
            aiControlled: true,
            aiDescription: 'First name of the user'
          },
          last_name: {
            type: 'string',
            required: false,
            label: 'Last Name',
            placeholder: 'Doe',
            description: 'Last name',
            aiControlled: true,
            aiDescription: 'Last name of the user'
          },
          name: {
            type: 'string',
            required: false,
            label: 'Display Name',
            placeholder: 'John Doe',
            description: 'Display name',
            aiControlled: true,
            aiDescription: 'Display name for the user'
          },
          nickname: {
            type: 'string',
            required: false,
            label: 'Nickname',
            placeholder: 'johnny',
            description: 'User nickname',
            aiControlled: true,
            aiDescription: 'Nickname for the user'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Bio',
            inputType: 'textarea',
            placeholder: 'A short bio...',
            description: 'User biographical info',
            aiControlled: true,
            aiDescription: 'Biographical information about the user'
          },
          url: {
            type: 'string',
            required: false,
            label: 'Website',
            placeholder: 'https://example.com',
            description: 'User website URL'
          },
          roles: {
            type: 'select',
            required: false,
            label: 'Role',
            default: 'subscriber',
            options: [
              { label: 'Administrator', value: 'administrator' },
              { label: 'Editor', value: 'editor' },
              { label: 'Author', value: 'author' },
              { label: 'Contributor', value: 'contributor' },
              { label: 'Subscriber', value: 'subscriber' }
            ],
            description: 'User role'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'User ID' },
          username: { type: 'string', description: 'Username' },
          name: { type: 'string', description: 'Display name' },
          email: { type: 'string', description: 'Email address' },
          link: { type: 'string', description: 'User profile URL' },
          roles: { type: 'array', description: 'User roles' }
        }
      },
      {
        id: 'get_user',
        name: 'Get User',
        description: 'Get a user by ID',
        category: 'Users',
        icon: 'user',
        verified: true,
        api: {
          endpoint: '/users/{userId}',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          userId: {
            type: 'number',
            required: true,
            label: 'User ID',
            placeholder: '1',
            description: 'The ID of the user to retrieve'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'User ID' },
          username: { type: 'string', description: 'Username' },
          name: { type: 'string', description: 'Display name' },
          email: { type: 'string', description: 'Email address' },
          first_name: { type: 'string', description: 'First name' },
          last_name: { type: 'string', description: 'Last name' },
          link: { type: 'string', description: 'User profile URL' },
          roles: { type: 'array', description: 'User roles' },
          description: { type: 'string', description: 'User bio' }
        }
      },
      {
        id: 'get_all_users',
        name: 'Get All Users',
        description: 'Get a list of users',
        category: 'Users',
        icon: 'users',
        verified: true,
        api: {
          endpoint: '/users',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of users per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'john',
            description: 'Search users by keyword'
          },
          roles: {
            type: 'select',
            required: false,
            label: 'Role',
            options: [
              { label: 'All', value: '' },
              { label: 'Administrator', value: 'administrator' },
              { label: 'Editor', value: 'editor' },
              { label: 'Author', value: 'author' },
              { label: 'Contributor', value: 'contributor' },
              { label: 'Subscriber', value: 'subscriber' }
            ],
            description: 'Filter by role'
          },
          orderby: {
            type: 'select',
            required: false,
            label: 'Order By',
            default: 'name',
            options: [
              { label: 'Name', value: 'name' },
              { label: 'ID', value: 'id' },
              { label: 'Email', value: 'email' },
              { label: 'Registered Date', value: 'registered_date' }
            ],
            description: 'Sort users by field'
          },
          order: {
            type: 'select',
            required: false,
            label: 'Order',
            default: 'asc',
            options: [
              { label: 'Ascending', value: 'asc' },
              { label: 'Descending', value: 'desc' }
            ],
            description: 'Sort order'
          }
        },
        outputSchema: {
          users: { type: 'array', description: 'Array of users' },
          total: { type: 'number', description: 'Total number of users' },
          total_pages: { type: 'number', description: 'Total number of pages' }
        }
      },
      {
        id: 'update_user',
        name: 'Update User',
        description: 'Update an existing user',
        category: 'Users',
        icon: 'user-check',
        verified: true,
        api: {
          endpoint: '/users/{userId}',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          userId: {
            type: 'number',
            required: true,
            label: 'User ID',
            placeholder: '1',
            description: 'The ID of the user to update',
            aiControlled: false
          },
          email: {
            type: 'string',
            required: false,
            label: 'Email',
            inputType: 'email',
            placeholder: 'newemail@example.com',
            description: 'New email address',
            aiControlled: false
          },
          first_name: {
            type: 'string',
            required: false,
            label: 'First Name',
            description: 'New first name',
            aiControlled: true,
            aiDescription: 'Updated first name of the user'
          },
          last_name: {
            type: 'string',
            required: false,
            label: 'Last Name',
            description: 'New last name',
            aiControlled: true,
            aiDescription: 'Updated last name of the user'
          },
          name: {
            type: 'string',
            required: false,
            label: 'Display Name',
            description: 'New display name',
            aiControlled: true,
            aiDescription: 'Updated display name for the user'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Bio',
            inputType: 'textarea',
            description: 'New bio',
            aiControlled: true,
            aiDescription: 'Updated biographical information about the user'
          },
          url: {
            type: 'string',
            required: false,
            label: 'Website',
            description: 'New website URL'
          },
          roles: {
            type: 'select',
            required: false,
            label: 'Role',
            options: [
              { label: 'Administrator', value: 'administrator' },
              { label: 'Editor', value: 'editor' },
              { label: 'Author', value: 'author' },
              { label: 'Contributor', value: 'contributor' },
              { label: 'Subscriber', value: 'subscriber' }
            ],
            description: 'New user role'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'User ID' },
          username: { type: 'string', description: 'Username' },
          name: { type: 'string', description: 'Display name' },
          email: { type: 'string', description: 'Email address' },
          roles: { type: 'array', description: 'User roles' }
        }
      },
      {
        id: 'delete_user',
        name: 'Delete User',
        description: 'Delete a user',
        category: 'Users',
        icon: 'user-minus',
        verified: true,
        api: {
          endpoint: '/users/{userId}',
          method: 'DELETE',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          userId: {
            type: 'number',
            required: true,
            label: 'User ID',
            placeholder: '1',
            description: 'The ID of the user to delete'
          },
          reassign: {
            type: 'number',
            required: true,
            label: 'Reassign Posts To',
            placeholder: '1',
            description: 'User ID to reassign posts to'
          },
          force: {
            type: 'boolean',
            required: false,
            label: 'Force Delete',
            default: true,
            description: 'Required to be true for user deletion'
          }
        },
        outputSchema: {
          deleted: { type: 'boolean', description: 'Whether user was deleted' },
          previous: { type: 'object', description: 'Previous user data' }
        }
      },
      // Category Actions
      {
        id: 'create_category',
        name: 'Create Category',
        description: 'Create a new category',
        category: 'Categories',
        icon: 'folder-plus',
        verified: true,
        api: {
          endpoint: '/categories',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Name',
            placeholder: 'Technology',
            description: 'Category name',
            aiControlled: true,
            aiDescription: 'Name of the category'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            description: 'Category description',
            aiControlled: true,
            aiDescription: 'Description of the category'
          },
          slug: {
            type: 'string',
            required: false,
            label: 'Slug',
            placeholder: 'technology',
            description: 'URL-friendly name',
            aiControlled: false
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent Category ID',
            placeholder: '0',
            description: 'Parent category for hierarchy',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Category ID' },
          name: { type: 'string', description: 'Category name' },
          slug: { type: 'string', description: 'Category slug' },
          description: { type: 'string', description: 'Category description' },
          parent: { type: 'number', description: 'Parent category ID' },
          count: { type: 'number', description: 'Number of posts' },
          link: { type: 'string', description: 'Category URL' }
        }
      },
      {
        id: 'get_all_categories',
        name: 'Get All Categories',
        description: 'Get a list of categories',
        category: 'Categories',
        icon: 'folder',
        verified: true,
        api: {
          endpoint: '/categories',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of categories per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'keyword',
            description: 'Search categories'
          },
          hide_empty: {
            type: 'boolean',
            required: false,
            label: 'Hide Empty',
            default: false,
            description: 'Hide categories with no posts'
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent ID',
            description: 'Filter by parent category'
          }
        },
        outputSchema: {
          categories: { type: 'array', description: 'Array of categories' },
          total: { type: 'number', description: 'Total categories' },
          total_pages: { type: 'number', description: 'Total pages' }
        }
      },
      // Tag Actions
      {
        id: 'create_tag',
        name: 'Create Tag',
        description: 'Create a new tag',
        category: 'Tags',
        icon: 'tag',
        verified: true,
        api: {
          endpoint: '/tags',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          name: {
            type: 'string',
            required: true,
            label: 'Name',
            placeholder: 'JavaScript',
            description: 'Tag name',
            aiControlled: true,
            aiDescription: 'Name of the tag'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            description: 'Tag description',
            aiControlled: true,
            aiDescription: 'Description of the tag'
          },
          slug: {
            type: 'string',
            required: false,
            label: 'Slug',
            placeholder: 'javascript',
            description: 'URL-friendly name',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Tag ID' },
          name: { type: 'string', description: 'Tag name' },
          slug: { type: 'string', description: 'Tag slug' },
          description: { type: 'string', description: 'Tag description' },
          count: { type: 'number', description: 'Number of posts' },
          link: { type: 'string', description: 'Tag URL' }
        }
      },
      {
        id: 'get_all_tags',
        name: 'Get All Tags',
        description: 'Get a list of tags',
        category: 'Tags',
        icon: 'tags',
        verified: true,
        api: {
          endpoint: '/tags',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of tags per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'keyword',
            description: 'Search tags'
          },
          hide_empty: {
            type: 'boolean',
            required: false,
            label: 'Hide Empty',
            default: false,
            description: 'Hide tags with no posts'
          }
        },
        outputSchema: {
          tags: { type: 'array', description: 'Array of tags' },
          total: { type: 'number', description: 'Total tags' },
          total_pages: { type: 'number', description: 'Total pages' }
        }
      },
      // Media Actions
      {
        id: 'upload_media',
        name: 'Upload Media',
        description: 'Upload a media file',
        category: 'Media',
        icon: 'upload',
        verified: true,
        api: {
          endpoint: '/media',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Disposition': 'attachment; filename="{filename}"',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          file_url: {
            type: 'string',
            required: true,
            label: 'File URL',
            placeholder: 'https://example.com/image.jpg',
            description: 'URL of the file to upload',
            aiControlled: false
          },
          title: {
            type: 'string',
            required: false,
            label: 'Title',
            placeholder: 'My Image',
            description: 'Media title',
            aiControlled: true,
            aiDescription: 'Title for the media file'
          },
          alt_text: {
            type: 'string',
            required: false,
            label: 'Alt Text',
            placeholder: 'Description of image',
            description: 'Alternative text for accessibility',
            aiControlled: true,
            aiDescription: 'Alternative text description for accessibility'
          },
          caption: {
            type: 'string',
            required: false,
            label: 'Caption',
            inputType: 'textarea',
            description: 'Media caption',
            aiControlled: true,
            aiDescription: 'Caption for the media'
          },
          description: {
            type: 'string',
            required: false,
            label: 'Description',
            inputType: 'textarea',
            description: 'Media description',
            aiControlled: true,
            aiDescription: 'Description of the media file'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Media ID' },
          title: { type: 'object', description: 'Media title' },
          source_url: { type: 'string', description: 'Full URL to media file' },
          media_type: { type: 'string', description: 'Type of media' },
          mime_type: { type: 'string', description: 'MIME type' },
          alt_text: { type: 'string', description: 'Alt text' }
        }
      },
      {
        id: 'get_all_media',
        name: 'Get All Media',
        description: 'Get a list of media items',
        category: 'Media',
        icon: 'image',
        verified: true,
        api: {
          endpoint: '/media',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of media items per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
          },
          search: {
            type: 'string',
            required: false,
            label: 'Search',
            placeholder: 'keyword',
            description: 'Search media'
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
            ],
            description: 'Filter by media type'
          }
        },
        outputSchema: {
          media: { type: 'array', description: 'Array of media items' },
          total: { type: 'number', description: 'Total media items' },
          total_pages: { type: 'number', description: 'Total pages' }
        }
      },
      // Comment Actions
      {
        id: 'create_comment',
        name: 'Create Comment',
        description: 'Create a new comment on a post',
        category: 'Comments',
        icon: 'message-square',
        verified: true,
        api: {
          endpoint: '/comments',
          method: 'POST',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          post: {
            type: 'number',
            required: true,
            label: 'Post ID',
            placeholder: '123',
            description: 'ID of the post to comment on',
            aiControlled: false
          },
          content: {
            type: 'string',
            required: true,
            label: 'Comment',
            inputType: 'textarea',
            placeholder: 'Your comment here...',
            description: 'Comment content',
            aiControlled: true,
            aiDescription: 'The content of the comment'
          },
          author_name: {
            type: 'string',
            required: false,
            label: 'Author Name',
            placeholder: 'John Doe',
            description: 'Comment author name',
            aiControlled: true,
            aiDescription: 'Name of the comment author'
          },
          author_email: {
            type: 'string',
            required: false,
            label: 'Author Email',
            inputType: 'email',
            placeholder: 'john@example.com',
            description: 'Comment author email',
            aiControlled: false
          },
          parent: {
            type: 'number',
            required: false,
            label: 'Parent Comment ID',
            placeholder: '0',
            description: 'Reply to another comment',
            aiControlled: false
          },
          status: {
            type: 'select',
            required: false,
            label: 'Status',
            default: 'approved',
            options: [
              { label: 'Approved', value: 'approved' },
              { label: 'Hold', value: 'hold' },
              { label: 'Spam', value: 'spam' },
              { label: 'Trash', value: 'trash' }
            ],
            description: 'Comment status',
            aiControlled: false
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Comment ID' },
          post: { type: 'number', description: 'Post ID' },
          author_name: { type: 'string', description: 'Author name' },
          content: { type: 'object', description: 'Comment content' },
          date: { type: 'string', description: 'Comment date' },
          status: { type: 'string', description: 'Comment status' },
          link: { type: 'string', description: 'Comment URL' }
        }
      },
      {
        id: 'get_all_comments',
        name: 'Get All Comments',
        description: 'Get a list of comments',
        category: 'Comments',
        icon: 'message-circle',
        verified: true,
        api: {
          endpoint: '/comments',
          method: 'GET',
          baseUrl: '{domain}/wp-json/wp/v2',
          headers: {
            'Authorization': 'Basic {credentials}'
          }
        },
        inputSchema: {
          per_page: {
            type: 'number',
            required: false,
            label: 'Per Page',
            default: 10,
            min: 1,
            max: 100,
            description: 'Number of comments per page'
          },
          page: {
            type: 'number',
            required: false,
            label: 'Page',
            default: 1,
            min: 1,
            description: 'Page number'
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
              { label: 'All', value: '' },
              { label: 'Approved', value: 'approve' },
              { label: 'Hold', value: 'hold' },
              { label: 'Spam', value: 'spam' },
              { label: 'Trash', value: 'trash' }
            ],
            description: 'Filter by status'
          },
          orderby: {
            type: 'select',
            required: false,
            label: 'Order By',
            default: 'date_gmt',
            options: [
              { label: 'Date', value: 'date_gmt' },
              { label: 'ID', value: 'id' }
            ],
            description: 'Sort by field'
          },
          order: {
            type: 'select',
            required: false,
            label: 'Order',
            default: 'desc',
            options: [
              { label: 'Descending', value: 'desc' },
              { label: 'Ascending', value: 'asc' }
            ],
            description: 'Sort order'
          }
        },
        outputSchema: {
          comments: { type: 'array', description: 'Array of comments' },
          total: { type: 'number', description: 'Total comments' },
          total_pages: { type: 'number', description: 'Total pages' }
        }
      }
    ],
    supported_triggers: [
      {
        id: 'new_post',
        name: 'New Post',
        description: 'Triggers when a new post is published',
        eventType: 'post.created',
        verified: true,
        icon: 'file-plus',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          status: {
            type: 'select',
            required: false,
            label: 'Post Status',
            default: 'publish',
            options: [
              { label: 'Published', value: 'publish' },
              { label: 'Draft', value: 'draft' },
              { label: 'Any', value: 'any' }
            ],
            description: 'Filter by post status'
          },
          categories: {
            type: 'string',
            required: false,
            label: 'Category IDs',
            placeholder: '1,2,3',
            description: 'Filter by category IDs (comma-separated)'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Post ID' },
          date: { type: 'string', description: 'Post date' },
          title: {
            type: 'object',
            description: 'Post title',
            properties: {
              rendered: { type: 'string', description: 'Rendered title' }
            }
          },
          content: {
            type: 'object',
            description: 'Post content',
            properties: {
              rendered: { type: 'string', description: 'Rendered content' }
            }
          },
          excerpt: {
            type: 'object',
            description: 'Post excerpt',
            properties: {
              rendered: { type: 'string', description: 'Rendered excerpt' }
            }
          },
          link: { type: 'string', description: 'Post URL' },
          author: { type: 'number', description: 'Author ID' },
          categories: { type: 'array', description: 'Category IDs' },
          tags: { type: 'array', description: 'Tag IDs' }
        }
      },
      {
        id: 'new_page',
        name: 'New Page',
        description: 'Triggers when a new page is created',
        eventType: 'page.created',
        verified: true,
        icon: 'file-plus',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          status: {
            type: 'select',
            required: false,
            label: 'Page Status',
            default: 'publish',
            options: [
              { label: 'Published', value: 'publish' },
              { label: 'Draft', value: 'draft' },
              { label: 'Any', value: 'any' }
            ],
            description: 'Filter by page status'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Page ID' },
          date: { type: 'string', description: 'Page date' },
          title: {
            type: 'object',
            description: 'Page title',
            properties: {
              rendered: { type: 'string', description: 'Rendered title' }
            }
          },
          content: {
            type: 'object',
            description: 'Page content',
            properties: {
              rendered: { type: 'string', description: 'Rendered content' }
            }
          },
          link: { type: 'string', description: 'Page URL' },
          author: { type: 'number', description: 'Author ID' },
          parent: { type: 'number', description: 'Parent page ID' }
        }
      },
      {
        id: 'new_comment',
        name: 'New Comment',
        description: 'Triggers when a new comment is posted',
        eventType: 'comment.created',
        verified: true,
        icon: 'message-square',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          post: {
            type: 'number',
            required: false,
            label: 'Post ID',
            placeholder: '123',
            description: 'Filter by specific post ID'
          },
          status: {
            type: 'select',
            required: false,
            label: 'Comment Status',
            default: 'approve',
            options: [
              { label: 'Approved', value: 'approve' },
              { label: 'Pending', value: 'hold' },
              { label: 'Any', value: '' }
            ],
            description: 'Filter by comment status'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'Comment ID' },
          post: { type: 'number', description: 'Post ID' },
          author_name: { type: 'string', description: 'Author name' },
          author_email: { type: 'string', description: 'Author email' },
          content: {
            type: 'object',
            description: 'Comment content',
            properties: {
              rendered: { type: 'string', description: 'Rendered content' }
            }
          },
          date: { type: 'string', description: 'Comment date' },
          status: { type: 'string', description: 'Comment status' },
          link: { type: 'string', description: 'Comment URL' }
        }
      },
      {
        id: 'new_user',
        name: 'New User',
        description: 'Triggers when a new user is registered',
        eventType: 'user.created',
        verified: true,
        icon: 'user-plus',
        webhookRequired: false,
        pollingEnabled: true,
        inputSchema: {
          roles: {
            type: 'select',
            required: false,
            label: 'User Role',
            options: [
              { label: 'All', value: '' },
              { label: 'Administrator', value: 'administrator' },
              { label: 'Editor', value: 'editor' },
              { label: 'Author', value: 'author' },
              { label: 'Contributor', value: 'contributor' },
              { label: 'Subscriber', value: 'subscriber' }
            ],
            description: 'Filter by user role'
          }
        },
        outputSchema: {
          id: { type: 'number', description: 'User ID' },
          username: { type: 'string', description: 'Username' },
          name: { type: 'string', description: 'Display name' },
          email: { type: 'string', description: 'Email address' },
          first_name: { type: 'string', description: 'First name' },
          last_name: { type: 'string', description: 'Last name' },
          roles: { type: 'array', description: 'User roles' },
          registered_date: { type: 'string', description: 'Registration date' }
        }
      }
    ]
  };
