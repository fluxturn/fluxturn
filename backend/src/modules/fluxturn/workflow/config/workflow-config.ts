/**
 * Comprehensive Workflow Configuration System
 * Maps semantic prompts to workflow chains using 54+ connectors
 * Supports intent detection, multi-agent orchestration, and complex business logic
 */

import { 
  WorkflowType, 
  WorkflowStep, 
  ConnectorConfig,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction
} from './types';

// ============================================
// WORKFLOW SEMANTIC MAPPING
// ============================================

export interface SemanticPattern {
  keywords: string[];
  intents: string[];
  connectors: string[];
  complexity: 'simple' | 'medium' | 'complex' | 'advanced';
  category: string;
}

export interface WorkflowConfigTemplate {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  outputs: string[];
  requiredConnectors: string[];
  optionalConnectors: string[];
  semanticPatterns: SemanticPattern[];
  examples: string[];
}

// ============================================
// SEMANTIC KEYWORD DETECTION
// ============================================

export const SEMANTIC_KEYWORDS = {
  // Communication Keywords
  email: ['email', 'mail', 'inbox', 'gmail', 'outlook', 'send', 'reply', 'forward', 'attachment'],
  messaging: ['message', 'chat', 'slack', 'teams', 'discord', 'notify', 'alert', 'ping'],
  sms: ['sms', 'text', 'twilio', 'phone', 'mobile'],
  
  // Data Processing Keywords
  analyze: ['analyze', 'analysis', 'insights', 'metrics', 'statistics', 'report', 'dashboard'],
  transform: ['convert', 'transform', 'format', 'parse', 'extract', 'clean', 'normalize'],
  aggregate: ['combine', 'merge', 'aggregate', 'consolidate', 'summarize', 'compile'],
  
  // CRM & Sales Keywords
  customer: ['customer', 'client', 'contact', 'lead', 'prospect', 'account'],
  sales: ['sales', 'deal', 'opportunity', 'pipeline', 'revenue', 'quota', 'forecast'],
  support: ['support', 'ticket', 'issue', 'complaint', 'help', 'service', 'resolution'],
  
  // Marketing Keywords
  campaign: ['campaign', 'marketing', 'promotion', 'advertisement', 'ads', 'targeting'],
  content: ['content', 'blog', 'article', 'post', 'publish', 'draft', 'write'],
  social: ['social', 'twitter', 'facebook', 'instagram', 'linkedin', 'share', 'post'],
  
  // E-commerce Keywords
  order: ['order', 'purchase', 'buy', 'checkout', 'cart', 'payment', 'transaction'],
  inventory: ['inventory', 'stock', 'product', 'sku', 'warehouse', 'supply'],
  shipping: ['shipping', 'delivery', 'tracking', 'fulfillment', 'logistics'],
  
  // Project Management Keywords
  task: ['task', 'todo', 'assign', 'deadline', 'priority', 'status', 'progress'],
  project: ['project', 'milestone', 'sprint', 'epic', 'story', 'backlog'],
  collaborate: ['collaborate', 'team', 'share', 'review', 'approve', 'feedback'],
  
  // Financial Keywords
  payment: ['payment', 'invoice', 'billing', 'charge', 'subscription', 'refund'],
  expense: ['expense', 'cost', 'budget', 'spending', 'receipt', 'reimbursement'],
  accounting: ['accounting', 'bookkeeping', 'ledger', 'balance', 'profit', 'loss'],
  
  // Automation Keywords
  trigger: ['when', 'if', 'trigger', 'start', 'begin', 'initiate', 'activate'],
  schedule: ['schedule', 'daily', 'weekly', 'monthly', 'recurring', 'cron', 'timer'],
  condition: ['if', 'when', 'unless', 'only', 'check', 'verify', 'validate'],
  action: ['then', 'do', 'execute', 'perform', 'run', 'process', 'handle']
};

// ============================================
// INTENT DETECTION PATTERNS
// ============================================

export const INTENT_PATTERNS = {
  // Primary Intents
  CREATE: ['create', 'make', 'generate', 'build', 'construct', 'develop', 'produce'],
  READ: ['read', 'get', 'fetch', 'retrieve', 'find', 'search', 'lookup', 'check'],
  UPDATE: ['update', 'modify', 'change', 'edit', 'revise', 'adjust', 'set'],
  DELETE: ['delete', 'remove', 'cancel', 'terminate', 'clear', 'purge', 'archive'],
  
  // Business Intents
  NOTIFY: ['notify', 'alert', 'inform', 'tell', 'message', 'email', 'send'],
  ANALYZE: ['analyze', 'examine', 'investigate', 'study', 'review', 'assess'],
  AUTOMATE: ['automate', 'automatically', 'auto', 'schedule', 'trigger', 'workflow'],
  INTEGRATE: ['integrate', 'connect', 'sync', 'link', 'combine', 'merge'],
  
  // Complex Intents
  MONITOR: ['monitor', 'watch', 'track', 'observe', 'detect', 'alert on'],
  OPTIMIZE: ['optimize', 'improve', 'enhance', 'boost', 'maximize', 'minimize'],
  PREDICT: ['predict', 'forecast', 'estimate', 'project', 'anticipate', 'expect'],
  RECOMMEND: ['recommend', 'suggest', 'advise', 'propose', 'tips', 'best']
};

// ============================================
// WORKFLOW TEMPLATES
// ============================================

export const WORKFLOW_TEMPLATES: WorkflowConfigTemplate[] = [
  // ========== EMAIL WORKFLOWS ==========
  {
    id: 'email-management',
    name: 'Intelligent Email Management',
    description: 'Process emails, prioritize, categorize, and auto-respond',
    triggers: [
      { type: 'webhook', source: 'gmail', event: 'new_email' },
      { type: 'schedule', cron: '*/15 * * * *' }
    ],
    steps: [
      { 
        id: 'fetch-emails',
        connector: 'gmail',
        action: 'list_emails',
        params: { unread: true }
      },
      {
        id: 'analyze-sentiment',
        connector: 'openai',
        action: 'analyze_sentiment',
        input: '{{fetch-emails.content}}'
      },
      {
        id: 'categorize',
        connector: 'openai',
        action: 'classify',
        input: '{{fetch-emails.content}}',
        params: { categories: ['urgent', 'customer', 'internal', 'spam'] }
      },
      {
        id: 'route-urgent',
        connector: 'slack',
        action: 'send_message',
        condition: "{{categorize.category}} == 'urgent'",
        params: { channel: '#urgent-emails' }
      },
      {
        id: 'draft-response',
        connector: 'openai',
        action: 'generate_text',
        condition: "{{categorize.category}} == 'customer'",
        params: { template: 'customer_response' }
      },
      {
        id: 'save-draft',
        connector: 'gmail',
        action: 'create_draft',
        input: '{{draft-response.text}}'
      }
    ],
    conditions: [],
    outputs: ['processed_count', 'urgent_count', 'draft_ids'],
    requiredConnectors: ['gmail', 'openai'],
    optionalConnectors: ['slack', 'teams'],
    semanticPatterns: [
      {
        keywords: ['email', 'inbox', 'messages', 'priority', 'urgent'],
        intents: ['READ', 'ANALYZE', 'NOTIFY'],
        connectors: ['gmail', 'openai', 'slack'],
        complexity: 'medium',
        category: 'communication'
      }
    ],
    examples: [
      "Check my emails and prioritize urgent ones",
      "Process unread emails and draft responses for customers",
      "Monitor inbox and alert team about urgent messages"
    ]
  },

  // ========== SALES WORKFLOWS ==========
  {
    id: 'lead-qualification',
    name: 'Automated Lead Qualification & Nurturing',
    description: 'Score leads, enrich data, and trigger nurture sequences',
    triggers: [
      { type: 'webhook', source: 'hubspot', event: 'new_contact' },
      { type: 'form_submission', source: 'typeform' }
    ],
    steps: [
      {
        id: 'fetch-lead',
        connector: 'hubspot',
        action: 'get_contact',
        params: { include: ['email', 'company', 'website'] }
      },
      {
        id: 'enrich-data',
        connector: 'clearbit',
        action: 'enrich_company',
        input: '{{fetch-lead.company_domain}}'
      },
      {
        id: 'calculate-score',
        connector: 'openai',
        action: 'score_lead',
        input: {
          contact: '{{fetch-lead}}',
          company: '{{enrich-data}}'
        },
        params: { 
          criteria: ['company_size', 'industry_fit', 'engagement', 'budget']
        }
      },
      {
        id: 'segment-lead',
        connector: 'hubspot',
        action: 'update_contact',
        params: {
          score: '{{calculate-score.score}}',
          segment: '{{calculate-score.segment}}'
        }
      },
      {
        id: 'start-nurture',
        connector: 'mailchimp',
        action: 'add_to_campaign',
        condition: "{{calculate-score.score}} >= 70",
        params: { 
          campaign: 'high_value_nurture'
        }
      },
      {
        id: 'notify-sales',
        connector: 'slack',
        action: 'send_message',
        condition: "{{calculate-score.score}} >= 85",
        params: { 
          channel: '#sales-qualified-leads',
          message: 'New hot lead: {{fetch-lead.name}} from {{enrich-data.company_name}}'
        }
      },
      {
        id: 'create-task',
        connector: 'salesforce',
        action: 'create_task',
        condition: "{{calculate-score.score}} >= 85",
        params: {
          type: 'follow_up',
          priority: 'high',
          due_date: '+1 day'
        }
      }
    ],
    conditions: [
      {
        id: 'is-qualified',
        expression: "{{calculate-score.score}} >= 70"
      }
    ],
    outputs: ['lead_score', 'segment', 'nurture_campaign_id'],
    requiredConnectors: ['hubspot', 'openai'],
    optionalConnectors: ['clearbit', 'mailchimp', 'slack', 'salesforce'],
    semanticPatterns: [
      {
        keywords: ['lead', 'qualify', 'score', 'nurture', 'sales', 'prospect'],
        intents: ['ANALYZE', 'UPDATE', 'NOTIFY', 'AUTOMATE'],
        connectors: ['hubspot', 'salesforce', 'mailchimp'],
        complexity: 'complex',
        category: 'sales'
      }
    ],
    examples: [
      "Track website visitors and qualify them as leads",
      "Score new contacts and add qualified ones to nurture campaigns",
      "Enrich lead data and notify sales team about hot prospects"
    ]
  },

  // ========== CUSTOMER SUPPORT WORKFLOWS ==========
  {
    id: 'multi-channel-support',
    name: 'Multi-Channel Customer Support Automation',
    description: 'Route support requests, analyze sentiment, and provide AI assistance',
    triggers: [
      { type: 'webhook', source: 'zendesk', event: 'ticket_created' },
      { type: 'webhook', source: 'intercom', event: 'conversation_started' },
      { type: 'social_mention', source: 'twitter' }
    ],
    steps: [
      {
        id: 'fetch-request',
        connector: 'zendesk',
        action: 'get_ticket',
        params: { include: ['requester', 'description', 'priority'] }
      },
      {
        id: 'analyze-sentiment',
        connector: 'openai',
        action: 'sentiment_analysis',
        input: '{{fetch-request.description}}'
      },
      {
        id: 'detect-urgency',
        connector: 'openai',
        action: 'classify_urgency',
        input: '{{fetch-request}}',
        params: { 
          levels: ['critical', 'high', 'medium', 'low']
        }
      },
      {
        id: 'search-knowledge',
        connector: 'notion',
        action: 'search_pages',
        input: '{{fetch-request.description}}',
        params: { 
          database: 'knowledge_base'
        }
      },
      {
        id: 'generate-response',
        connector: 'openai',
        action: 'generate_support_response',
        input: {
          ticket: '{{fetch-request}}',
          knowledge: '{{search-knowledge.results}}',
          sentiment: '{{analyze-sentiment}}'
        }
      },
      {
        id: 'check-customer-history',
        connector: 'hubspot',
        action: 'get_contact_history',
        input: '{{fetch-request.requester.email}}'
      },
      {
        id: 'route-to-team',
        connector: 'zendesk',
        action: 'assign_ticket',
        params: {
          group: '{{detect-urgency.suggested_team}}',
          priority: '{{detect-urgency.level}}'
        }
      },
      {
        id: 'alert-manager',
        connector: 'slack',
        action: 'send_direct_message',
        condition: "{{detect-urgency.level}} == 'critical'",
        params: {
          user: '@support-manager',
          message: 'Critical ticket from VIP customer'
        }
      },
      {
        id: 'send-auto-response',
        connector: 'zendesk',
        action: 'add_comment',
        condition: "{{generate-response.confidence}} >= 0.8",
        params: {
          comment: '{{generate-response.text}}',
          public: false
        }
      }
    ],
    conditions: [
      {
        id: 'is-vip',
        expression: "{{check-customer-history.customer_value}} >= 10000"
      },
      {
        id: 'needs-escalation',
        expression: "{{analyze-sentiment.score}} < -0.5 || {{detect-urgency.level}} == 'critical'"
      }
    ],
    outputs: ['ticket_id', 'assigned_team', 'response_time', 'resolution_path'],
    requiredConnectors: ['zendesk', 'openai'],
    optionalConnectors: ['intercom', 'hubspot', 'slack', 'notion'],
    semanticPatterns: [
      {
        keywords: ['support', 'ticket', 'customer', 'issue', 'complaint', 'help'],
        intents: ['READ', 'ANALYZE', 'ROUTE', 'RESPOND'],
        connectors: ['zendesk', 'intercom', 'openai'],
        complexity: 'complex',
        category: 'support'
      }
    ],
    examples: [
      "Handle customer complaints from any channel and route to appropriate team",
      "Analyze support tickets sentiment and prioritize critical issues",
      "Provide AI-powered suggestions for support agents based on knowledge base"
    ]
  },

  // ========== CONTENT WORKFLOWS ==========
  {
    id: 'content-pipeline',
    name: 'Content Creation & Distribution Pipeline',
    description: 'Generate, optimize, and distribute content across channels',
    triggers: [
      { type: 'schedule', cron: '0 9 * * MON' },
      { type: 'manual', source: 'api' }
    ],
    steps: [
      {
        id: 'research-trends',
        connector: 'google',
        action: 'search_trends',
        params: { 
          category: 'industry',
          timeframe: 'last_week'
        }
      },
      {
        id: 'analyze-competitors',
        connector: 'semrush',
        action: 'competitor_analysis',
        params: { 
          domains: ['competitor1.com', 'competitor2.com']
        }
      },
      {
        id: 'generate-ideas',
        connector: 'openai',
        action: 'brainstorm_content',
        input: {
          trends: '{{research-trends}}',
          gaps: '{{analyze-competitors.content_gaps}}'
        },
        params: { 
          count: 10,
          type: 'blog_posts'
        }
      },
      {
        id: 'create-content',
        connector: 'openai',
        action: 'write_article',
        input: '{{generate-ideas.selected_topic}}',
        params: {
          words: 1500,
          tone: 'professional',
          include_seo: true
        }
      },
      {
        id: 'generate-images',
        connector: 'dalle',
        action: 'create_image',
        input: '{{create-content.image_prompts}}',
        params: { 
          style: 'professional',
          count: 3
        }
      },
      {
        id: 'optimize-seo',
        connector: 'yoast',
        action: 'optimize',
        input: '{{create-content.text}}',
        params: { 
          keywords: '{{generate-ideas.keywords}}'
        }
      },
      {
        id: 'publish-blog',
        connector: 'wordpress',
        action: 'create_post',
        input: {
          title: '{{create-content.title}}',
          content: '{{optimize-seo.content}}',
          images: '{{generate-images.urls}}'
        },
        params: { 
          status: 'draft',
          categories: '{{generate-ideas.categories}}'
        }
      },
      {
        id: 'create-social-posts',
        connector: 'openai',
        action: 'adapt_for_social',
        input: '{{create-content}}',
        params: {
          platforms: ['twitter', 'linkedin', 'facebook']
        }
      },
      {
        id: 'schedule-social',
        connector: 'buffer',
        action: 'schedule_posts',
        input: '{{create-social-posts}}',
        params: {
          times: ['10:00', '14:00', '18:00']
        }
      },
      {
        id: 'notify-team',
        connector: 'slack',
        action: 'send_message',
        params: {
          channel: '#content-team',
          message: 'New content ready for review: {{publish-blog.preview_url}}'
        }
      }
    ],
    conditions: [
      {
        id: 'is-trending',
        expression: "{{research-trends.volume}} > 1000"
      }
    ],
    outputs: ['post_id', 'social_scheduled', 'seo_score'],
    requiredConnectors: ['openai', 'wordpress'],
    optionalConnectors: ['dalle', 'buffer', 'semrush', 'slack'],
    semanticPatterns: [
      {
        keywords: ['content', 'blog', 'article', 'write', 'publish', 'social'],
        intents: ['CREATE', 'OPTIMIZE', 'DISTRIBUTE'],
        connectors: ['openai', 'wordpress', 'buffer'],
        complexity: 'advanced',
        category: 'marketing'
      }
    ],
    examples: [
      "Research trending topics and create blog posts automatically",
      "Generate content ideas, write articles, and distribute across social media",
      "Create SEO-optimized content and schedule for publication"
    ]
  },

  // ========== E-COMMERCE WORKFLOWS ==========
  {
    id: 'order-fulfillment',
    name: 'E-commerce Order Processing & Fulfillment',
    description: 'Process orders, manage inventory, and handle shipping',
    triggers: [
      { type: 'webhook', source: 'shopify', event: 'order_created' },
      { type: 'webhook', source: 'woocommerce', event: 'order_placed' }
    ],
    steps: [
      {
        id: 'fetch-order',
        connector: 'shopify',
        action: 'get_order',
        params: { include: ['customer', 'items', 'shipping'] }
      },
      {
        id: 'check-inventory',
        connector: 'inventory_system',
        action: 'check_stock',
        input: '{{fetch-order.items}}',
        params: { warehouses: ['main', 'secondary'] }
      },
      {
        id: 'validate-payment',
        connector: 'stripe',
        action: 'verify_payment',
        input: '{{fetch-order.payment_id}}'
      },
      {
        id: 'fraud-check',
        connector: 'sift',
        action: 'analyze_transaction',
        input: '{{fetch-order}}',
        params: { threshold: 0.7 }
      },
      {
        id: 'reserve-inventory',
        connector: 'inventory_system',
        action: 'reserve_items',
        condition: "{{fraud-check.score}} < 0.7",
        input: '{{fetch-order.items}}'
      },
      {
        id: 'calculate-shipping',
        connector: 'shippo',
        action: 'get_rates',
        input: {
          origin: '{{check-inventory.selected_warehouse}}',
          destination: '{{fetch-order.shipping_address}}',
          parcels: '{{fetch-order.items}}'
        }
      },
      {
        id: 'create-shipping-label',
        connector: 'shippo',
        action: 'purchase_label',
        input: '{{calculate-shipping.selected_rate}}'
      },
      {
        id: 'update-order-status',
        connector: 'shopify',
        action: 'update_order',
        params: {
          status: 'processing',
          tracking: '{{create-shipping-label.tracking_number}}'
        }
      },
      {
        id: 'send-confirmation',
        connector: 'sendgrid',
        action: 'send_email',
        params: {
          template: 'order_confirmation',
          to: '{{fetch-order.customer.email}}',
          data: {
            order: '{{fetch-order}}',
            tracking: '{{create-shipping-label.tracking_number}}'
          }
        }
      },
      {
        id: 'notify-warehouse',
        connector: 'slack',
        action: 'send_message',
        params: {
          channel: '#warehouse-{{check-inventory.selected_warehouse}}',
          message: 'New order ready for picking: {{fetch-order.id}}'
        }
      },
      {
        id: 'update-crm',
        connector: 'hubspot',
        action: 'update_contact',
        input: '{{fetch-order.customer.email}}',
        params: {
          last_order_date: '{{fetch-order.created_at}}',
          total_orders: '+1',
          lifetime_value: '+{{fetch-order.total}}'
        }
      }
    ],
    conditions: [
      {
        id: 'is-high-risk',
        expression: "{{fraud-check.score}} >= 0.7"
      },
      {
        id: 'needs-review',
        expression: "{{fetch-order.total}} > 1000 || {{fraud-check.score}} > 0.5"
      }
    ],
    outputs: ['order_id', 'tracking_number', 'warehouse', 'estimated_delivery'],
    requiredConnectors: ['shopify', 'stripe', 'sendgrid'],
    optionalConnectors: ['woocommerce', 'shippo', 'hubspot', 'slack'],
    semanticPatterns: [
      {
        keywords: ['order', 'purchase', 'fulfillment', 'shipping', 'inventory'],
        intents: ['PROCESS', 'VALIDATE', 'SHIP', 'NOTIFY'],
        connectors: ['shopify', 'stripe', 'shippo'],
        complexity: 'advanced',
        category: 'ecommerce'
      }
    ],
    examples: [
      "Process new orders, check inventory, and create shipping labels",
      "Validate payments, check for fraud, and update order status",
      "Automate order fulfillment from purchase to delivery"
    ]
  },

  // ========== FINANCIAL WORKFLOWS ==========
  {
    id: 'expense-management',
    name: 'Automated Expense Management & Reporting',
    description: 'Process expenses, categorize, approve, and generate reports',
    triggers: [
      { type: 'email', source: 'gmail', filter: 'receipts' },
      { type: 'webhook', source: 'expensify', event: 'expense_submitted' }
    ],
    steps: [
      {
        id: 'extract-receipt',
        connector: 'ocr_service',
        action: 'extract_data',
        input: '{{trigger.attachment}}',
        params: { fields: ['vendor', 'amount', 'date', 'items'] }
      },
      {
        id: 'categorize-expense',
        connector: 'openai',
        action: 'classify',
        input: '{{extract-receipt}}',
        params: {
          categories: ['travel', 'meals', 'supplies', 'software', 'other']
        }
      },
      {
        id: 'check-policy',
        connector: 'expense_system',
        action: 'validate_policy',
        input: {
          amount: '{{extract-receipt.amount}}',
          category: '{{categorize-expense.category}}',
          employee: '{{trigger.sender}}'
        }
      },
      {
        id: 'get-approval',
        connector: 'slack',
        action: 'send_approval_request',
        condition: "{{extract-receipt.amount}} > 500",
        params: {
          approver: '@finance-manager',
          message: 'Expense approval needed',
          actions: ['approve', 'reject', 'request_info']
        }
      },
      {
        id: 'record-expense',
        connector: 'quickbooks',
        action: 'create_expense',
        condition: "{{get-approval.status}} == 'approved' || {{extract-receipt.amount}} <= 500",
        input: {
          vendor: '{{extract-receipt.vendor}}',
          amount: '{{extract-receipt.amount}}',
          category: '{{categorize-expense.category}}',
          receipt: '{{trigger.attachment_url}}'
        }
      },
      {
        id: 'update-budget',
        connector: 'google-sheets',
        action: 'update_cell',
        params: {
          sheet: 'Budget_Tracker',
          cell: '{{categorize-expense.category}}_spent',
          operation: 'add',
          value: '{{extract-receipt.amount}}'
        }
      },
      {
        id: 'notify-employee',
        connector: 'email',
        action: 'send',
        params: {
          to: '{{trigger.sender}}',
          subject: 'Expense {{record-expense.status}}',
          body: 'Your expense of {{extract-receipt.amount}} has been {{record-expense.status}}'
        }
      }
    ],
    conditions: [
      {
        id: 'needs-approval',
        expression: "{{extract-receipt.amount}} > 500"
      },
      {
        id: 'policy-violation',
        expression: "{{check-policy.compliant}} == false"
      }
    ],
    outputs: ['expense_id', 'category', 'approval_status', 'remaining_budget'],
    requiredConnectors: ['quickbooks', 'openai'],
    optionalConnectors: ['expensify', 'google-sheets', 'slack'],
    semanticPatterns: [
      {
        keywords: ['expense', 'receipt', 'reimburse', 'approve', 'budget'],
        intents: ['PROCESS', 'CATEGORIZE', 'APPROVE', 'RECORD'],
        connectors: ['quickbooks', 'expensify'],
        complexity: 'medium',
        category: 'finance'
      }
    ],
    examples: [
      "Process expense receipts and categorize them automatically",
      "Get approval for expenses over $500 and update budgets",
      "Extract data from receipts and record in accounting system"
    ]
  },

  // ========== HR WORKFLOWS ==========
  {
    id: 'recruitment-pipeline',
    name: 'AI-Powered Recruitment & Onboarding',
    description: 'Screen candidates, schedule interviews, and automate onboarding',
    triggers: [
      { type: 'webhook', source: 'greenhouse', event: 'application_submitted' },
      { type: 'form_submission', source: 'typeform' }
    ],
    steps: [
      {
        id: 'parse-resume',
        connector: 'resume_parser',
        action: 'extract_info',
        input: '{{trigger.resume}}',
        params: {
          fields: ['skills', 'experience', 'education', 'certifications']
        }
      },
      {
        id: 'score-candidate',
        connector: 'openai',
        action: 'evaluate_fit',
        input: {
          resume: '{{parse-resume}}',
          job_requirements: '{{trigger.job_description}}'
        },
        params: {
          criteria: ['skills_match', 'experience_level', 'culture_fit']
        }
      },
      {
        id: 'check-references',
        connector: 'checkr',
        action: 'background_check',
        condition: "{{score-candidate.overall_score}} >= 70",
        input: '{{trigger.candidate_info}}'
      },
      {
        id: 'schedule-screening',
        connector: 'calendly',
        action: 'create_booking_link',
        condition: "{{score-candidate.overall_score}} >= 60",
        params: {
          event_type: 'phone_screening',
          duration: 30,
          availability: 'next_5_days'
        }
      },
      {
        id: 'send-screening-invite',
        connector: 'sendgrid',
        action: 'send_email',
        condition: "{{score-candidate.overall_score}} >= 60",
        params: {
          template: 'interview_invitation',
          to: '{{trigger.candidate_email}}',
          data: {
            booking_link: '{{schedule-screening.link}}',
            position: '{{trigger.job_title}}'
          }
        }
      },
      {
        id: 'create-interview-kit',
        connector: 'notion',
        action: 'create_page',
        condition: "{{score-candidate.overall_score}} >= 70",
        params: {
          template: 'interview_guide',
          data: {
            candidate: '{{parse-resume}}',
            questions: '{{score-candidate.suggested_questions}}',
            focus_areas: '{{score-candidate.areas_to_probe}}'
          }
        }
      },
      {
        id: 'notify-hiring-team',
        connector: 'slack',
        action: 'send_message',
        condition: "{{score-candidate.overall_score}} >= 80",
        params: {
          channel: '#hiring-{{trigger.department}}',
          message: 'High-potential candidate: {{trigger.candidate_name}} - Score: {{score-candidate.overall_score}}/100'
        }
      },
      {
        id: 'update-ats',
        connector: 'greenhouse',
        action: 'update_application',
        params: {
          status: '{{score-candidate.recommended_action}}',
          score: '{{score-candidate.overall_score}}',
          notes: '{{score-candidate.summary}}'
        }
      }
    ],
    conditions: [
      {
        id: 'is-qualified',
        expression: "{{score-candidate.overall_score}} >= 60"
      },
      {
        id: 'fast-track',
        expression: "{{score-candidate.overall_score}} >= 85"
      }
    ],
    outputs: ['candidate_score', 'interview_scheduled', 'next_steps'],
    requiredConnectors: ['greenhouse', 'openai', 'sendgrid'],
    optionalConnectors: ['calendly', 'checkr', 'notion', 'slack'],
    semanticPatterns: [
      {
        keywords: ['recruit', 'hire', 'candidate', 'resume', 'interview', 'onboard'],
        intents: ['SCREEN', 'EVALUATE', 'SCHEDULE', 'NOTIFY'],
        connectors: ['greenhouse', 'calendly', 'openai'],
        complexity: 'advanced',
        category: 'hr'
      }
    ],
    examples: [
      "Screen resumes with AI and schedule interviews for qualified candidates",
      "Automate candidate evaluation and send personalized responses",
      "Create interview guides based on candidate profiles"
    ]
  },

  // ========== DATA WORKFLOWS ==========
  {
    id: 'data-pipeline',
    name: 'Real-time Data Processing & Analytics',
    description: 'Collect, transform, analyze, and visualize data',
    triggers: [
      { type: 'schedule', cron: '0 */6 * * *' },
      { type: 'database', source: 'postgres', event: 'row_inserted' },
      { type: 'api', source: 'webhook', event: 'data_received' }
    ],
    steps: [
      {
        id: 'extract-data',
        connector: 'database',
        action: 'query',
        params: {
          query: 'SELECT * FROM transactions WHERE created_at > NOW() - INTERVAL 6 HOURS'
        }
      },
      {
        id: 'clean-data',
        connector: 'pandas',
        action: 'clean_dataframe',
        input: '{{extract-data.results}}',
        params: {
          remove_duplicates: true,
          handle_missing: 'interpolate',
          standardize_formats: true
        }
      },
      {
        id: 'enrich-data',
        connector: 'api',
        action: 'batch_lookup',
        input: '{{clean-data.dataframe}}',
        params: {
          endpoint: 'enrichment_service',
          fields: ['geo_location', 'customer_segment', 'product_category']
        }
      },
      {
        id: 'calculate-metrics',
        connector: 'analytics',
        action: 'compute_kpis',
        input: '{{enrich-data.enriched_data}}',
        params: {
          metrics: ['revenue', 'conversion_rate', 'avg_order_value', 'churn_rate']
        }
      },
      {
        id: 'detect-anomalies',
        connector: 'ml_service',
        action: 'anomaly_detection',
        input: '{{calculate-metrics.timeseries}}',
        params: {
          method: 'isolation_forest',
          sensitivity: 0.95
        }
      },
      {
        id: 'generate-insights',
        connector: 'openai',
        action: 'analyze_trends',
        input: {
          metrics: '{{calculate-metrics}}',
          anomalies: '{{detect-anomalies.outliers}}'
        }
      },
      {
        id: 'create-dashboard',
        connector: 'tableau',
        action: 'update_dashboard',
        input: {
          data: '{{calculate-metrics}}',
          insights: '{{generate-insights.key_findings}}'
        },
        params: {
          dashboard_id: 'executive_overview'
        }
      },
      {
        id: 'alert-on-anomaly',
        connector: 'pagerduty',
        action: 'create_incident',
        condition: "{{detect-anomalies.severity}} == 'critical'",
        params: {
          urgency: 'high',
          description: '{{detect-anomalies.description}}'
        }
      },
      {
        id: 'store-results',
        connector: 'aws-s3',
        action: 'upload',
        params: {
          bucket: 'analytics-results',
          path: 'processed/{{timestamp}}/data.parquet',
          data: '{{enrich-data.enriched_data}}'
        }
      }
    ],
    conditions: [
      {
        id: 'has-anomalies',
        expression: "{{detect-anomalies.count}} > 0"
      },
      {
        id: 'significant-change',
        expression: "{{calculate-metrics.change_percent}} > 20"
      }
    ],
    outputs: ['metrics', 'anomalies', 'dashboard_url', 's3_path'],
    requiredConnectors: ['database', 'analytics'],
    optionalConnectors: ['tableau', 'pagerduty', 'aws-s3', 'openai'],
    semanticPatterns: [
      {
        keywords: ['data', 'analytics', 'metrics', 'dashboard', 'report', 'analyze'],
        intents: ['EXTRACT', 'TRANSFORM', 'ANALYZE', 'VISUALIZE'],
        connectors: ['database', 'tableau', 'analytics'],
        complexity: 'advanced',
        category: 'data'
      }
    ],
    examples: [
      "Process transaction data and update executive dashboards",
      "Detect anomalies in metrics and alert the team",
      "Generate insights from data and create visualizations"
    ]
  }
];

// ============================================
// CONNECTOR REQUIREMENTS & SUGGESTIONS
// ============================================

export const MISSING_CONNECTORS = [
  // Essential Missing Connectors
  {
    name: 'Clearbit',
    category: 'data-enrichment',
    purpose: 'Company and contact data enrichment',
    priority: 'high',
    useCases: ['lead qualification', 'customer research', 'personalization']
  },
  {
    name: 'Sift',
    category: 'fraud-detection',
    purpose: 'Fraud detection and prevention',
    priority: 'high',
    useCases: ['payment validation', 'account security', 'risk scoring']
  },
  {
    name: 'Shippo',
    category: 'shipping',
    purpose: 'Multi-carrier shipping API',
    priority: 'high',
    useCases: ['shipping labels', 'rate calculation', 'tracking']
  },
  {
    name: 'Calendly',
    category: 'scheduling',
    purpose: 'Automated scheduling and booking',
    priority: 'medium',
    useCases: ['interview scheduling', 'meeting booking', 'appointments']
  },
  {
    name: 'QuickBooks',
    category: 'accounting',
    purpose: 'Accounting and bookkeeping',
    priority: 'high',
    useCases: ['expense tracking', 'invoicing', 'financial reporting']
  },
  {
    name: 'Tableau',
    category: 'visualization',
    purpose: 'Data visualization and dashboards',
    priority: 'medium',
    useCases: ['reporting', 'analytics', 'business intelligence']
  },
  {
    name: 'PagerDuty',
    category: 'alerting',
    purpose: 'Incident management and alerting',
    priority: 'medium',
    useCases: ['critical alerts', 'on-call management', 'incident response']
  },
  {
    name: 'Buffer',
    category: 'social-scheduling',
    purpose: 'Social media scheduling',
    priority: 'medium',
    useCases: ['content distribution', 'social posting', 'scheduling']
  },
  {
    name: 'SEMrush',
    category: 'seo',
    purpose: 'SEO and competitive analysis',
    priority: 'medium',
    useCases: ['keyword research', 'competitor analysis', 'SEO optimization']
  },
  {
    name: 'Greenhouse',
    category: 'ats',
    purpose: 'Applicant tracking system',
    priority: 'medium',
    useCases: ['recruitment', 'candidate tracking', 'hiring pipeline']
  }
];

// ============================================
// WORKFLOW CHAIN BUILDER
// ============================================

export class WorkflowChainBuilder {
  private connectors: Map<string, any>;
  private templates: WorkflowConfigTemplate[];

  constructor(connectors: string[], templates: WorkflowConfigTemplate[]) {
    this.connectors = new Map(connectors.map(c => [c, true]));
    this.templates = templates;
  }

  /**
   * Detect workflow type from semantic prompt
   */
  detectWorkflowType(prompt: string): {
    type: string;
    confidence: number;
    keywords: string[];
    intents: string[];
  } {
    const lowerPrompt = prompt.toLowerCase();
    const detectedKeywords: string[] = [];
    const detectedIntents: string[] = [];
    
    // Detect keywords
    for (const [category, keywords] of Object.entries(SEMANTIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
    }

    // Detect intents
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerPrompt.includes(pattern)) {
          detectedIntents.push(intent);
        }
      }
    }

    // Match against templates
    let bestMatch = { template: null as WorkflowConfigTemplate | null, score: 0 };
    
    for (const template of this.templates) {
      let score = 0;
      
      for (const pattern of template.semanticPatterns) {
        // Check keyword matches
        const keywordMatches = pattern.keywords.filter(k => 
          lowerPrompt.includes(k)
        ).length;
        score += keywordMatches * 2;
        
        // Check intent matches
        const intentMatches = pattern.intents.filter(i => 
          detectedIntents.includes(i)
        ).length;
        score += intentMatches * 3;
      }
      
      if (score > bestMatch.score) {
        bestMatch = { template, score };
      }
    }

    return {
      type: bestMatch.template?.id || 'custom',
      confidence: Math.min(bestMatch.score / 10, 1),
      keywords: detectedKeywords,
      intents: detectedIntents
    };
  }

  /**
   * Build workflow chain from detected type and prompt
   */
  buildChain(prompt: string, workflowType: string): {
    steps: WorkflowStep[];
    requiredConnectors: string[];
    missingConnectors: string[];
  } {
    const template = this.templates.find(t => t.id === workflowType);
    
    if (!template) {
      return this.buildCustomChain(prompt);
    }

    // Check which connectors are available
    const missingConnectors = template.requiredConnectors.filter(
      c => !this.connectors.has(c)
    );

    // Filter steps based on available connectors
    const availableSteps = template.steps.filter(step => 
      this.connectors.has(step.connector) || 
      template.optionalConnectors.includes(step.connector)
    );

    return {
      steps: availableSteps,
      requiredConnectors: template.requiredConnectors,
      missingConnectors
    };
  }

  /**
   * Build custom workflow chain for unmatched prompts
   */
  private buildCustomChain(prompt: string): {
    steps: WorkflowStep[];
    requiredConnectors: string[];
    missingConnectors: string[];
  } {
    const { keywords, intents } = this.detectWorkflowType(prompt);
    const steps: WorkflowStep[] = [];
    const requiredConnectors: string[] = [];

    // Build steps based on detected intents
    if (intents.includes('READ') || intents.includes('FETCH')) {
      steps.push({
        id: 'fetch-data',
        connector: this.selectConnector(keywords, 'data-source'),
        action: 'fetch',
        params: {}
      });
    }

    if (intents.includes('ANALYZE')) {
      steps.push({
        id: 'analyze',
        connector: 'openai',
        action: 'analyze',
        input: '{{fetch-data}}',
        params: {}
      });
      requiredConnectors.push('openai');
    }

    if (intents.includes('NOTIFY')) {
      steps.push({
        id: 'notify',
        connector: this.selectConnector(keywords, 'notification'),
        action: 'send',
        input: '{{analyze}}',
        params: {}
      });
    }

    if (intents.includes('CREATE') || intents.includes('GENERATE')) {
      steps.push({
        id: 'create',
        connector: 'openai',
        action: 'generate',
        params: {}
      });
      requiredConnectors.push('openai');
    }

    return {
      steps,
      requiredConnectors: [...new Set(requiredConnectors)],
      missingConnectors: requiredConnectors.filter(c => !this.connectors.has(c))
    };
  }

  /**
   * Select appropriate connector based on keywords and category
   */
  private selectConnector(keywords: string[], category: string): string {
    // Email-related
    if (keywords.some(k => ['email', 'mail', 'gmail'].includes(k))) {
      return 'gmail';
    }
    
    // Messaging
    if (keywords.some(k => ['slack', 'message', 'chat'].includes(k))) {
      return 'slack';
    }
    
    // CRM
    if (keywords.some(k => ['customer', 'contact', 'lead'].includes(k))) {
      return 'hubspot';
    }
    
    // E-commerce
    if (keywords.some(k => ['order', 'product', 'shop'].includes(k))) {
      return 'shopify';
    }
    
    // Default fallback
    return 'openai';
  }
}

// ============================================
// WORKFLOW EXECUTION ENGINE
// ============================================

export class WorkflowExecutor {
  private connectorInstances: Map<string, any>;
  private context: Map<string, any>;

  constructor(connectors: Map<string, any>) {
    this.connectorInstances = connectors;
    this.context = new Map();
  }

  /**
   * Execute workflow step by step
   */
  async execute(workflow: WorkflowConfigTemplate, input: any): Promise<any> {
    const results: any = {};
    
    for (const step of workflow.steps) {
      try {
        // Check conditions
        if (step.condition && !this.evaluateCondition(step.condition)) {
          continue;
        }

        // Get connector instance
        const connector = this.connectorInstances.get(step.connector);
        if (!connector) {
          throw new Error(`Connector ${step.connector} not found`);
        }

        // Resolve input references
        const resolvedInput = this.resolveReferences(step.input || input);
        
        // Execute action
        const result = await connector[step.action](resolvedInput, step.params);
        
        // Store result in context
        results[step.id] = result;
        this.context.set(step.id, result);
        
      } catch (error) {
        console.error(`Error in step ${step.id}:`, error);
        
        // Handle error based on step configuration
        if (step.onError === 'continue') {
          continue;
        } else if (step.onError === 'retry') {
          // Implement retry logic
          await this.retry(step, input);
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * Evaluate condition expressions
   */
  private evaluateCondition(condition: string): boolean {
    // Simple expression evaluator
    // In production, use a proper expression parser
    const expression = this.resolveReferences(condition);
    return eval(expression);
  }

  /**
   * Resolve references like {{step-id.field}}
   */
  private resolveReferences(input: any): any {
    if (typeof input === 'string') {
      return input.replace(/\{\{([^}]+)\}\}/g, (match, ref) => {
        const [stepId, ...fieldPath] = ref.split('.');
        const stepResult = this.context.get(stepId);
        
        if (!stepResult) return match;
        
        // Navigate nested fields
        return fieldPath.reduce((obj, field) => obj?.[field], stepResult);
      });
    }
    
    if (typeof input === 'object') {
      const resolved: any = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = this.resolveReferences(value);
      }
      return resolved;
    }
    
    return input;
  }

  /**
   * Retry failed step
   */
  private async retry(step: WorkflowStep, input: any, maxRetries = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        const connector = this.connectorInstances.get(step.connector);
        return await connector[step.action](input, step.params);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
    }
  }
}

// Export everything
export default {
  SEMANTIC_KEYWORDS,
  INTENT_PATTERNS,
  WORKFLOW_TEMPLATES,
  MISSING_CONNECTORS,
  WorkflowChainBuilder,
  WorkflowExecutor
};