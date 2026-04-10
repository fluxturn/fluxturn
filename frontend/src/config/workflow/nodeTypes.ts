import type { LucideIcon } from "lucide-react";
import {
  MousePointerClick,
  Clock,
  Webhook,
  Globe,
  Database,
  FileJson,
  Code,
  GitBranch,
  Repeat,
  Filter,
  Zap,
  Workflow,
  FileText,
  Brain,
  Bot,
  GitMerge, // For Merge node
  Split, // For Split node
  Mail, // For Gmail Tool
  PauseCircle, // For Wait node
  Edit, // For Set node
  MessageCircle, // For Chat Trigger
  MessageSquare, // For Slack Tool
  Send, // For Telegram Tool
  Hash, // For Discord Tool
  Users, // For Teams Tool
} from "lucide-react";

export enum NodeType {
  // Triggers
  MANUAL_TRIGGER = "MANUAL_TRIGGER",
  SCHEDULE_TRIGGER = "SCHEDULE_TRIGGER",
  WEBHOOK_TRIGGER = "WEBHOOK_TRIGGER",
  FORM_TRIGGER = "FORM_TRIGGER",
  CHAT_TRIGGER = "CHAT_TRIGGER", // For chat/chatbot workflows
  WEBHOOK = "WEBHOOK", // For app webhooks
  CONNECTOR_TRIGGER = "CONNECTOR_TRIGGER", // For dynamic connector triggers (Facebook, Telegram, etc.)

  // Actions
  HTTP_REQUEST = "HTTP_REQUEST",
  DATABASE_QUERY = "DATABASE_QUERY",
  TRANSFORM_DATA = "TRANSFORM_DATA",
  RUN_CODE = "RUN_CODE",
  AI_AGENT = "AI_AGENT",
  OPENAI_CHAT_MODEL = "OPENAI_CHAT_MODEL",
  SIMPLE_MEMORY = "SIMPLE_MEMORY",
  REDIS_MEMORY = "REDIS_MEMORY",
  MERGE = "MERGE",
  SPLIT = "SPLIT",
  SET = "SET",

  // Tools
  GMAIL_TOOL = "GMAIL_TOOL",
  SLACK_TOOL = "SLACK_TOOL",
  TELEGRAM_TOOL = "TELEGRAM_TOOL",
  DISCORD_TOOL = "DISCORD_TOOL",
  TEAMS_TOOL = "TEAMS_TOOL",

  // Dynamic connector actions
  CONNECTOR_ACTION = "CONNECTOR_ACTION",

  // Control Flow
  IF_CONDITION = "IF_CONDITION",
  SWITCH = "SWITCH",
  LOOP = "LOOP",
  FILTER = "FILTER",
  WAIT = "WAIT",
}

export type NodeCategory = "trigger" | "action" | "control";

export interface NodeTypeDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: NodeCategory;
  color: string;
  configFields?: NodeConfigField[];
  connectorTypeForCredentials?: string; // Connector type to fetch credentials for (e.g., 'openai', 'gmail', 'redis')
}

export interface NodeConfigField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "code" | "toggle" | "conditions" | "rules" | "formFields" | "schedule";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  description?: string;
  displayOptions?: {
    show?: Record<string, (string | number | boolean)[]>;
    hide?: Record<string, (string | number | boolean)[]>;
  };
}

export const NODE_DEFINITIONS: Record<NodeType, NodeTypeDefinition> = {
  // Triggers
  [NodeType.MANUAL_TRIGGER]: {
    type: NodeType.MANUAL_TRIGGER,
    label: "Manual Trigger",
    description: "Manually execute the workflow",
    icon: MousePointerClick,
    category: "trigger",
    color: "cyan",
  },
  [NodeType.SCHEDULE_TRIGGER]: {
    type: NodeType.SCHEDULE_TRIGGER,
    label: "Schedule",
    description: "Run on a schedule (cron)",
    icon: Clock,
    category: "trigger",
    color: "cyan",
    configFields: [
      {
        name: "schedule",
        label: "Schedule Configuration",
        type: "schedule",
        required: true,
        defaultValue: {
          mode: "minutes",
          interval: 5,
          hour: 9,
          minute: 0,
          dayOfWeek: [1, 2, 3, 4, 5],
          dayOfMonth: 1,
        },
        description: "Configure when this workflow should run",
      },
      {
        name: "timezone",
        label: "Timezone",
        type: "select",
        options: [
          { label: "UTC", value: "UTC" },
          { label: "America/New_York (EST/EDT)", value: "America/New_York" },
          { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
          { label: "America/Chicago (CST/CDT)", value: "America/Chicago" },
          { label: "Europe/London (GMT/BST)", value: "Europe/London" },
          { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
          { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
          { label: "Asia/Shanghai (CST)", value: "Asia/Shanghai" },
          { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
          { label: "Australia/Sydney (AEDT/AEST)", value: "Australia/Sydney" },
        ],
        defaultValue: "UTC",
        description: "Timezone for the cron schedule",
      },
    ],
  },
  [NodeType.WEBHOOK_TRIGGER]: {
    type: NodeType.WEBHOOK_TRIGGER,
    label: "Webhook",
    description: "Receive HTTP webhooks from any service (Stripe, GitHub, etc.)",
    icon: Webhook,
    category: "trigger",
    color: "cyan",
    configFields: [
      {
        name: "httpMethod",
        label: "HTTP Method",
        type: "select",
        options: [
          { label: "All Methods", value: "ALL" },
          { label: "POST", value: "POST" },
          { label: "GET", value: "GET" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ],
        defaultValue: "POST",
        description: "Which HTTP method(s) to accept",
      },
      {
        name: "authType",
        label: "Authentication",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Basic Auth", value: "basic" },
          { label: "Bearer Token", value: "bearer" },
          { label: "Header Auth", value: "header" },
          { label: "JWT", value: "jwt" },
        ],
        defaultValue: "none",
        description: "How to authenticate webhook requests",
      },
      {
        name: "authData",
        label: "Authentication Data (JSON)",
        type: "code",
        placeholder: '{"username": "user", "password": "pass"}',
        description: "Auth credentials based on type selected",
      },
      {
        name: "responseMode",
        label: "Response Mode",
        type: "select",
        options: [
          { label: "Immediately (async workflow)", value: "onReceived" },
          { label: "When workflow completes", value: "whenComplete" },
          { label: "Output from last node", value: "lastNode" },
        ],
        defaultValue: "onReceived",
        description: "When to send response to webhook caller",
      },
      {
        name: "responseCode",
        label: "Response Code",
        type: "number",
        placeholder: "200",
        defaultValue: 200,
        description: "HTTP status code to return",
      },
      {
        name: "responseBody",
        label: "Response Body (JSON)",
        type: "code",
        placeholder: '{"success": true}',
        defaultValue: '{"success": true}',
        description: "Response body to send back",
      },
      {
        name: "responseHeaders",
        label: "Response Headers (JSON)",
        type: "code",
        placeholder: '{"X-Custom-Header": "value"}',
        defaultValue: '{}',
        description: "Custom response headers",
      },
      {
        name: "corsEnabled",
        label: "Enable CORS",
        type: "toggle",
        defaultValue: true,
        description: "Allow cross-origin requests",
      },
      {
        name: "corsOrigin",
        label: "CORS Origin",
        type: "text",
        placeholder: "*",
        defaultValue: "*",
        description: "Allowed origins for CORS (* for all)",
      },
      {
        name: "ipWhitelist",
        label: "IP Whitelist (JSON Array)",
        type: "code",
        placeholder: '["192.168.1.1", "10.0.0.1"]',
        defaultValue: '[]',
        description: "Only allow requests from these IPs (empty = allow all)",
      },
      {
        name: "ignoreBots",
        label: "Ignore Bots",
        type: "toggle",
        defaultValue: false,
        description: "Block requests from bots/crawlers",
      },
    ],
  },
  [NodeType.FORM_TRIGGER]: {
    type: NodeType.FORM_TRIGGER,
    label: "On Form Submission",
    description: "Create a web form and trigger workflow on submission",
    icon: FileText,
    category: "trigger",
    color: "cyan",
    configFields: [
      {
        name: "formTitle",
        label: "Form Title",
        type: "text",
        placeholder: "Contact Us",
        required: true,
        defaultValue: "Submit Form",
      },
      {
        name: "formDescription",
        label: "Form Description",
        type: "textarea",
        placeholder: "Please fill out this form...",
      },
      {
        name: "formFields",
        label: "Form Fields",
        type: "formFields",
        required: true,
        defaultValue: [
          {
            name: "name",
            label: "Name",
            type: "text",
            required: true,
            placeholder: "Enter your name",
          },
          {
            name: "email",
            label: "Email",
            type: "email",
            required: true,
            placeholder: "your@email.com",
          },
        ],
      },
      {
        name: "submitButtonText",
        label: "Submit Button Text",
        type: "text",
        defaultValue: "Submit",
        placeholder: "Submit",
      },
      {
        name: "successMessage",
        label: "Success Message",
        type: "textarea",
        defaultValue: "Thank you! Your form has been submitted successfully.",
        placeholder: "Success message after submission",
      },
    ],
  },
  [NodeType.CHAT_TRIGGER]: {
    type: NodeType.CHAT_TRIGGER,
    label: "When Chat Message Received",
    description: "Start workflow with a chat message. Perfect for chatbots and AI agents.",
    icon: MessageCircle,
    category: "trigger",
    color: "teal",
    configFields: [
      {
        name: "chatInputKey",
        label: "Chat Input Key",
        type: "text",
        placeholder: "chatInput",
        defaultValue: "chatInput",
        description: "The key to use for the chat message in output data",
      },
      {
        name: "sessionIdKey",
        label: "Session ID Key",
        type: "text",
        placeholder: "sessionId",
        defaultValue: "sessionId",
        description: "The key to use for the session ID (for conversation continuity)",
      },
      {
        name: "placeholder",
        label: "Input Placeholder",
        type: "text",
        placeholder: "Type your message...",
        defaultValue: "Type your message...",
        description: "Placeholder text for the chat input field",
      },
      {
        name: "welcomeMessage",
        label: "Welcome Message",
        type: "textarea",
        placeholder: "Hello! How can I help you today?",
        description: "Optional message shown when chat opens",
      },
      {
        name: "inputFieldLabel",
        label: "Input Field Label",
        type: "text",
        placeholder: "Message",
        defaultValue: "Message",
        description: "Label shown above the chat input",
      },
      {
        name: "allowFileUploads",
        label: "Allow File Uploads",
        type: "toggle",
        defaultValue: false,
        description: "Enable users to upload files with their messages",
      },
      {
        name: "allowedFileTypes",
        label: "Allowed File Types",
        type: "text",
        placeholder: "image/*,application/pdf",
        defaultValue: "image/*,application/pdf",
        description: "Comma-separated list of allowed MIME types",
      },
    ],
  },
  [NodeType.WEBHOOK]: {
    type: NodeType.WEBHOOK,
    label: "App Webhook",
    description: "Receive webhooks from connected apps",
    icon: Webhook,
    category: "trigger",
    color: "cyan",
    configFields: [
      {
        name: "connectorType",
        label: "App",
        type: "select",
        options: [], // Will be populated dynamically
        required: true,
      },
      {
        name: "eventType",
        label: "Event Type",
        type: "select",
        options: [], // Will be populated based on connector
        required: true,
      },
    ],
  },
  [NodeType.CONNECTOR_TRIGGER]: {
    type: NodeType.CONNECTOR_TRIGGER,
    label: "App Trigger",
    description: "Trigger from connected apps",
    icon: Zap,
    category: "trigger",
    color: "cyan",
    configFields: [], // Will be populated dynamically based on selected trigger
  },

  // Actions
  [NodeType.HTTP_REQUEST]: {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Make HTTP/API requests with advanced options",
    icon: Globe,
    category: "action",
    color: "teal",
    connectorTypeForCredentials: "*", // Accept any credential type
    configFields: [
      {
        name: "method",
        label: "Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
          { label: "HEAD", value: "HEAD" },
          { label: "OPTIONS", value: "OPTIONS" },
        ],
        defaultValue: "GET",
        required: true,
        description: "HTTP method to use",
      },
      {
        name: "url",
        label: "URL",
        type: "text",
        placeholder: "https://api.example.com/endpoint",
        required: true,
        description: "The URL to make the request to",
      },
      {
        name: "authentication",
        label: "Authentication",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Use Credential", value: "credential" },
          { label: "Bearer Token (Manual)", value: "bearerToken" },
          { label: "Header Auth (Manual)", value: "headerAuth" },
          { label: "Query Auth (Manual)", value: "queryAuth" },
        ],
        defaultValue: "none",
        description: "Authentication method",
      },
      {
        name: "credentialId",
        label: "Credential",
        type: "select",
        placeholder: "Select a credential",
        description: "Select a stored credential (supports OAuth2, API Key, Bearer Token, etc.)",
      },
      {
        name: "bearerToken",
        label: "Bearer Token",
        type: "text",
        placeholder: "your_token_here",
        description: "Token for bearer authentication",
      },
      {
        name: "headerAuthName",
        label: "Header Name",
        type: "text",
        placeholder: "X-API-Key",
        description: "Custom auth header name",
      },
      {
        name: "headerAuthValue",
        label: "Header Value",
        type: "text",
        placeholder: "api_key_value",
        description: "Custom auth header value",
      },
      {
        name: "queryAuthName",
        label: "Query Parameter Name",
        type: "text",
        placeholder: "api_key",
        description: "Query auth parameter name",
      },
      {
        name: "queryAuthValue",
        label: "Query Parameter Value",
        type: "text",
        placeholder: "your_api_key",
        description: "Query auth parameter value",
      },
      {
        name: "sendQuery",
        label: "Send Query Parameters",
        type: "toggle",
        defaultValue: false,
        description: "Add query parameters",
      },
      {
        name: "queryParameters",
        label: "Query Parameters (JSON)",
        type: "code",
        placeholder: '{"param1": "value1", "param2": "value2"}',
        description: "Query parameters as JSON object",
      },
      {
        name: "sendHeaders",
        label: "Send Custom Headers",
        type: "toggle",
        defaultValue: false,
        description: "Add custom headers",
      },
      {
        name: "headers",
        label: "Headers (JSON)",
        type: "code",
        placeholder: '{"Content-Type": "application/json"}',
        description: "Custom headers as JSON object",
      },
      {
        name: "sendBody",
        label: "Send Body",
        type: "toggle",
        defaultValue: false,
        description: "Add request body (POST/PUT/PATCH/DELETE)",
      },
      {
        name: "bodyContentType",
        label: "Body Content Type",
        type: "select",
        options: [
          { label: "JSON", value: "json" },
          { label: "Form URL-encoded", value: "form-urlencoded" },
          { label: "Multipart Form Data", value: "multipart-form-data" },
          { label: "Raw", value: "raw" },
          { label: "Binary", value: "binary" },
        ],
        defaultValue: "json",
        description: "Type of request body",
      },
      {
        name: "jsonBody",
        label: "JSON Body",
        type: "code",
        placeholder: '{"key": "value"}',
        description: "Request body as JSON",
      },
      {
        name: "bodyParameters",
        label: "Body Parameters (JSON)",
        type: "code",
        placeholder: '{"field1": "value1", "field2": "value2"}',
        description: "Form parameters as JSON object",
      },
      {
        name: "rawBody",
        label: "Raw Body",
        type: "textarea",
        placeholder: "Raw request body content",
        description: "Raw request body",
      },
      {
        name: "rawBodyMimeType",
        label: "Content-Type",
        type: "text",
        placeholder: "text/plain",
        defaultValue: "text/plain",
        description: "MIME type for raw body",
      },
      {
        name: "responseFormat",
        label: "Response Format",
        type: "select",
        options: [
          { label: "Auto-detect", value: "autodetect" },
          { label: "JSON", value: "json" },
          { label: "Text", value: "text" },
          { label: "File", value: "file" },
        ],
        defaultValue: "autodetect",
        description: "How to parse the response",
      },
      {
        name: "fullResponse",
        label: "Full Response",
        type: "toggle",
        defaultValue: false,
        description: "Include headers and status code in response",
      },
      {
        name: "neverError",
        label: "Never Error",
        type: "toggle",
        defaultValue: false,
        description: "Don't fail on HTTP errors",
      },
      {
        name: "timeout",
        label: "Timeout (ms)",
        type: "number",
        placeholder: "10000",
        defaultValue: 10000,
        description: "Request timeout in milliseconds",
      },
      {
        name: "followRedirect",
        label: "Follow Redirects",
        type: "toggle",
        defaultValue: true,
        description: "Follow HTTP 3xx redirects",
      },
      {
        name: "maxRedirects",
        label: "Max Redirects",
        type: "number",
        placeholder: "21",
        defaultValue: 21,
        description: "Maximum number of redirects to follow",
      },
      {
        name: "allowUnauthorizedCerts",
        label: "Ignore SSL Issues",
        type: "toggle",
        defaultValue: false,
        description: "Allow invalid SSL certificates",
      },
      {
        name: "proxy",
        label: "Proxy",
        type: "text",
        placeholder: "http://proxy:8080",
        description: "HTTP proxy URL",
      },
      {
        name: "lowercaseHeaders",
        label: "Lowercase Headers",
        type: "toggle",
        defaultValue: true,
        description: "Convert header names to lowercase",
      },
    ],
  },
  [NodeType.DATABASE_QUERY]: {
    type: NodeType.DATABASE_QUERY,
    label: "Database Query",
    description: "Execute a database query",
    icon: Database,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "connection",
        label: "Database Connection",
        type: "select",
        options: [],
        required: true,
      },
      {
        name: "query",
        label: "SQL Query",
        type: "code",
        placeholder: "SELECT * FROM users WHERE id = ?",
        required: true,
      },
    ],
  },
  [NodeType.TRANSFORM_DATA]: {
    type: NodeType.TRANSFORM_DATA,
    label: "Transform Data",
    description: "Transform data using JSONata",
    icon: FileJson,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "expression",
        label: "JSONata Expression",
        type: "code",
        placeholder: "{ 'fullName': firstName & ' ' & lastName }",
        required: true,
      },
    ],
  },
  [NodeType.RUN_CODE]: {
    type: NodeType.RUN_CODE,
    label: "Run Code",
    description: "Execute custom JavaScript code",
    icon: Code,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "code",
        label: "Code",
        type: "code",
        placeholder: "// Your JavaScript code\nreturn { result: data };",
        required: true,
      },
    ],
  },
  [NodeType.AI_AGENT]: {
    type: NodeType.AI_AGENT,
    label: "AI Agent",
    description: "AI Agent that reasons, selects tools, and executes them autonomously",
    icon: Brain,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "agentType",
        label: "Agent Type",
        type: "select",
        options: [
          { label: "Tools Agent (Recommended)", value: "toolsAgent" },
          { label: "Conversational Agent", value: "conversational" },
          { label: "ReAct Agent", value: "react" },
        ],
        defaultValue: "toolsAgent",
        description: "How the agent reasons and selects tools. Tools Agent uses OpenAI function calling for best results.",
      },
      {
        name: "systemPrompt",
        label: "System Prompt",
        type: "textarea",
        placeholder: "You are a helpful AI assistant that can send emails and perform tasks...",
        description: "Instructions that define the agent's behavior, capabilities, and guardrails",
      },
      {
        name: "input",
        label: "Input Message",
        type: "text",
        placeholder: "{{$json.message}}",
        description: "The input message/prompt for the agent. Use expressions like {{$json.message}} to reference previous node data.",
      },
      {
        name: "maxIterations",
        label: "Max Iterations",
        type: "number",
        placeholder: "10",
        defaultValue: 10,
        description: "Maximum number of reasoning/tool execution cycles (1-50)",
      },
      {
        name: "returnIntermediateSteps",
        label: "Return Intermediate Steps",
        type: "toggle",
        defaultValue: false,
        description: "Include all thinking steps and tool calls in the output for debugging",
      },
      {
        name: "outputFormat",
        label: "Output Format",
        type: "select",
        options: [
          { label: "Plain Text", value: "text" },
          { label: "JSON (Structured)", value: "json" },
        ],
        defaultValue: "text",
        description: "Format of the agent's response",
      },
      {
        name: "outputSchema",
        label: "Output JSON Schema",
        type: "code",
        placeholder: '{\n  "type": "object",\n  "properties": {\n    "summary": { "type": "string" }\n  }\n}',
        description: "JSON schema for structured output (when Output Format is JSON)",
        displayOptions: {
          show: {
            outputFormat: ["json"],
          },
        },
      },
      {
        name: "temperature",
        label: "Temperature",
        type: "number",
        placeholder: "0.7",
        description: "Controls randomness (0-2). Lower = more deterministic. Leave empty to use model default.",
      },
      {
        name: "maxTokens",
        label: "Max Tokens",
        type: "number",
        placeholder: "4096",
        description: "Maximum tokens in response. Leave empty to use model default.",
      },
      // Built-in Tools (no credentials needed)
      {
        name: "enableHttpTool",
        label: "Enable HTTP Request Tool",
        type: "toggle",
        defaultValue: true,
        description: "Allow agent to make HTTP requests to any URL (GET, POST, PUT, DELETE)",
      },
      {
        name: "enableCalculatorTool",
        label: "Enable Calculator Tool",
        type: "toggle",
        defaultValue: true,
        description: "Allow agent to perform math calculations and unit conversions",
      },
    ],
  },
  [NodeType.OPENAI_CHAT_MODEL]: {
    type: NodeType.OPENAI_CHAT_MODEL,
    label: "OpenAI Chat Model",
    description: "Provides OpenAI GPT model configuration for AI Agent",
    icon: Bot,
    category: "action",
    color: "teal",
    connectorTypeForCredentials: "openai",
    configFields: [
      {
        name: "credentialId",
        label: "OpenAI Credential",
        type: "select",
        options: [], // Will be populated dynamically from credentials
        required: true,
        description: "Select your OpenAI API credential",
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        options: [
          { label: "GPT-4o", value: "gpt-4o" },
          { label: "GPT-4o Mini", value: "gpt-4o-mini" },
          { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
          { label: "GPT-4", value: "gpt-4" },
          { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
        ],
        defaultValue: "gpt-4o-mini",
        description: "The OpenAI model to use",
      },
      {
        name: "temperature",
        label: "Temperature",
        type: "number",
        placeholder: "0.7",
        defaultValue: 0.7,
        description: "Controls randomness (0-2)",
      },
      {
        name: "maxTokens",
        label: "Max Tokens",
        type: "number",
        placeholder: "4096",
        defaultValue: 4096,
        description: "Maximum tokens in response",
      },
      {
        name: "topP",
        label: "Top P",
        type: "number",
        placeholder: "1",
        defaultValue: 1,
        description: "Nucleus sampling threshold (0-1)",
      },
      {
        name: "frequencyPenalty",
        label: "Frequency Penalty",
        type: "number",
        placeholder: "0",
        defaultValue: 0,
        description: "Reduces repetition (-2 to 2)",
      },
      {
        name: "presencePenalty",
        label: "Presence Penalty",
        type: "number",
        placeholder: "0",
        defaultValue: 0,
        description: "Encourages new topics (-2 to 2)",
      },
    ],
  },
  [NodeType.SIMPLE_MEMORY]: {
    type: NodeType.SIMPLE_MEMORY,
    label: "Simple Memory",
    description: "Stores conversation history in memory (no credentials required)",
    icon: Database,
    category: "action",
    color: "purple",
    configFields: [
      {
        name: "sessionIdType",
        label: "Session ID",
        type: "select",
        options: [
          {
            label: "From Trigger (sessionId)",
            value: "fromInput",
          },
          {
            label: "Custom Expression",
            value: "customKey",
          },
        ],
        defaultValue: "fromInput",
        description: "Where to get the session ID from",
      },
      {
        name: "sessionKey",
        label: "Session Key",
        type: "text",
        placeholder: "{{ $json.sessionId }}",
        defaultValue: "{{ $json.sessionId }}",
        description: "Expression to extract session ID",
      },
      {
        name: "contextWindowLength",
        label: "Context Window Length",
        type: "number",
        placeholder: "5",
        defaultValue: 5,
        description: "How many past message pairs to remember",
      },
    ],
  },
  [NodeType.REDIS_MEMORY]: {
    type: NodeType.REDIS_MEMORY,
    label: "Redis Chat Memory",
    description: "Stores conversation history in Redis (persistent, scalable)",
    icon: Database,
    category: "action",
    color: "red",
    connectorTypeForCredentials: "redis",
    configFields: [
      {
        name: "credentialId",
        label: "Redis Credential",
        type: "select",
        options: [], // Will be populated dynamically from credentials
        required: true,
        description: "Select your Redis credential",
      },
      {
        name: "sessionIdType",
        label: "Session ID",
        type: "select",
        options: [
          {
            label: "From Trigger (sessionId)",
            value: "fromInput",
          },
          {
            label: "Custom Expression",
            value: "customKey",
          },
        ],
        defaultValue: "fromInput",
        description: "Where to get the session ID from",
      },
      {
        name: "sessionKey",
        label: "Session Key",
        type: "text",
        placeholder: "{{ $json.sessionId }}",
        defaultValue: "{{ $json.sessionId }}",
        description: "Expression to extract session ID",
      },
      {
        name: "sessionTTL",
        label: "Session Time To Live (seconds)",
        type: "number",
        placeholder: "3600",
        defaultValue: 0,
        description: "How long to keep sessions in Redis (0 = never expire)",
      },
      {
        name: "contextWindowLength",
        label: "Context Window Length",
        type: "number",
        placeholder: "5",
        defaultValue: 5,
        description: "How many past message pairs to remember",
      },
    ],
  },
  [NodeType.MERGE]: {
    type: NodeType.MERGE,
    label: "Merge",
    description: "Combine data from multiple inputs using various strategies",
    icon: GitMerge,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "numberOfInputs",
        label: "Number of Inputs",
        type: "number",
        defaultValue: 2,
        placeholder: "2",
        required: true,
        description: "How many inputs to merge (2-10)",
      },
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Append", value: "append" },
          { label: "Combine", value: "combine" },
          { label: "Combine by SQL", value: "combineBySql" },
          { label: "Choose Branch", value: "chooseBranch" },
        ],
        defaultValue: "append",
        required: true,
        description: "How to merge the data from multiple inputs",
      },
      {
        name: "combineBy",
        label: "Combine By",
        type: "select",
        options: [
          { label: "By Fields (Join)", value: "combineByFields" },
          { label: "By Position", value: "combineByPosition" },
          { label: "Combine All (Cross Join)", value: "combineAll" },
        ],
        defaultValue: "combineByPosition",
        description: "Method to combine inputs (only for Combine mode)",
      },
      {
        name: "fieldsToMatchString",
        label: "Fields to Match",
        type: "text",
        placeholder: "id, email",
        description: "Comma-separated field names to match on (for combineByFields)",
      },
      {
        name: "joinMode",
        label: "Join Mode",
        type: "select",
        options: [
          { label: "Keep Matches (Inner Join)", value: "keepMatches" },
          { label: "Keep Non-Matches", value: "keepNonMatches" },
          { label: "Keep Everything (Outer Join)", value: "keepEverything" },
          { label: "Enrich Input 1 (Left Join)", value: "enrichInput1" },
          { label: "Enrich Input 2 (Right Join)", value: "enrichInput2" },
        ],
        defaultValue: "keepMatches",
        description: "How to handle matched/unmatched items",
      },
      {
        name: "outputDataFrom",
        label: "Output Data From",
        type: "select",
        options: [
          { label: "Both Inputs", value: "both" },
          { label: "Input 1", value: "input1" },
          { label: "Input 2", value: "input2" },
        ],
        defaultValue: "both",
        description: "Which input data to include in output",
      },
      {
        name: "clashHandling",
        label: "Clash Handling",
        type: "select",
        options: [
          { label: "Prefer Input 1", value: "preferInput1" },
          { label: "Prefer Input 2", value: "preferInput2" },
          { label: "Add Suffix (_1, _2)", value: "addSuffix" },
        ],
        defaultValue: "preferInput2",
        description: "How to resolve conflicting field names",
      },
      {
        name: "includeUnpaired",
        label: "Include Unpaired Items",
        type: "toggle",
        defaultValue: false,
        description: "Include items without matching pairs (for combineByPosition)",
      },
      {
        name: "query",
        label: "SQL Query",
        type: "textarea",
        placeholder: "SELECT * FROM input1 LEFT JOIN input2 ON input1.id = input2.id",
        description: "SQL query to merge data (for combineBySql mode)",
      },
      {
        name: "output",
        label: "Output",
        type: "select",
        options: [
          { label: "Specified Input", value: "specifiedInput" },
          { label: "Empty Item", value: "empty" },
        ],
        defaultValue: "specifiedInput",
        description: "What to output (for chooseBranch mode)",
      },
      {
        name: "useDataOfInput",
        label: "Use Data of Input",
        type: "number",
        defaultValue: 1,
        placeholder: "1",
        description: "Which input to use (1 or 2) for chooseBranch mode",
      },
    ],
  },
  [NodeType.SPLIT]: {
    type: NodeType.SPLIT,
    label: "Split",
    description: "Split data into multiple outputs using various strategies",
    icon: Split,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "numberOfOutputs",
        label: "Number of Outputs",
        type: "number",
        defaultValue: 2,
        placeholder: "2",
        required: true,
        description: "How many outputs to split data into (2-10)",
      },
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Duplicate - Send same data to all outputs", value: "duplicate" },
          { label: "Split by Condition - Route by conditions", value: "splitByCondition" },
          { label: "Split Evenly - Distribute evenly (round-robin)", value: "splitEvenly" },
          { label: "Split by Field - Route by field value", value: "splitByField" },
          { label: "Split by Size - Break into chunks", value: "splitBySize" },
        ],
        defaultValue: "duplicate",
        required: true,
        description: "How to split the data across multiple outputs",
      },
      {
        name: "conditions",
        label: "Routing Conditions",
        type: "conditions",
        description: "Define conditions to route items to specific outputs",
        defaultValue: {
          combinator: "and",
          conditions: [
            {
              leftValue: "",
              operator: { type: "string", operation: "equals" },
              rightValue: "",
            },
          ],
        },
        displayOptions: {
          show: {
            mode: ["splitByCondition"],
          },
        },
      },
      {
        name: "defaultOutput",
        label: "Default Output",
        type: "number",
        defaultValue: 0,
        placeholder: "0",
        description: "Output index for items that don't match conditions (0-based)",
        displayOptions: {
          show: {
            mode: ["splitByCondition"],
          },
        },
      },
      {
        name: "fieldName",
        label: "Field Name",
        type: "text",
        placeholder: "status",
        description: "Field name to split by",
        displayOptions: {
          show: {
            mode: ["splitByField"],
          },
        },
      },
      {
        name: "fieldValues",
        label: "Field Values (JSON Array)",
        type: "code",
        placeholder: '["pending", "completed", "cancelled"]',
        description: "Array of field values, each goes to corresponding output index",
        displayOptions: {
          show: {
            mode: ["splitByField"],
          },
        },
      },
      {
        name: "chunkSize",
        label: "Chunk Size",
        type: "number",
        placeholder: "10",
        description: "Number of items per chunk",
        displayOptions: {
          show: {
            mode: ["splitBySize"],
          },
        },
      },
    ],
  },
  [NodeType.SET]: {
    type: NodeType.SET,
    label: "Edit Fields (Set)",
    description: "Add, modify, or remove item fields",
    icon: Edit,
    category: "action",
    color: "teal",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Manual Mapping", value: "manual" },
          { label: "JSON", value: "json" },
        ],
        defaultValue: "manual",
        required: true,
        description: "How to set fields",
      },
      // JSON Mode
      {
        name: "jsonOutput",
        label: "JSON Output",
        type: "code",
        placeholder: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}',
        defaultValue: '{\n  "field": "value"\n}',
        description: "JSON object to output",
        displayOptions: {
          show: {
            mode: ["json"],
          },
        },
      },
      // Manual Mode - Fields (simplified for now)
      {
        name: "fields",
        label: "Fields to Set",
        type: "code",
        placeholder: '[\n  {"name": "fieldName", "type": "string", "value": "fieldValue"}\n]',
        defaultValue: '[]',
        description: "Array of fields to set (JSON format)",
        displayOptions: {
          show: {
            mode: ["manual"],
          },
        },
      },
      // Include Options
      {
        name: "includeOtherFields",
        label: "Include Other Input Fields",
        type: "toggle",
        defaultValue: false,
        description: "Pass all input fields to output along with the fields you set",
      },
      {
        name: "include",
        label: "Input Fields to Include",
        type: "select",
        options: [
          { label: "All", value: "all" },
          { label: "Selected", value: "selected" },
          { label: "All Except", value: "except" },
        ],
        defaultValue: "all",
        description: "How to select fields to include",
        displayOptions: {
          show: {
            includeOtherFields: [true],
          },
        },
      },
      {
        name: "includeFields",
        label: "Fields to Include",
        type: "text",
        placeholder: "field1, field2, field3",
        description: "Comma-separated list of fields to include",
        displayOptions: {
          show: {
            includeOtherFields: [true],
            include: ["selected"],
          },
        },
      },
      {
        name: "excludeFields",
        label: "Fields to Exclude",
        type: "text",
        placeholder: "field1, field2, field3",
        description: "Comma-separated list of fields to exclude",
        displayOptions: {
          show: {
            includeOtherFields: [true],
            include: ["except"],
          },
        },
      },
      // Options
      {
        name: "dotNotation",
        label: "Support Dot Notation",
        type: "toggle",
        defaultValue: true,
        description: "Use dot notation for nested fields (e.g., a.b.c)",
      },
      {
        name: "ignoreConversionErrors",
        label: "Ignore Type Conversion Errors",
        type: "toggle",
        defaultValue: false,
        description: "Apply less strict type conversion",
        displayOptions: {
          show: {
            mode: ["manual"],
          },
        },
      },
    ],
  },

  // Tools
  [NodeType.GMAIL_TOOL]: {
    type: NodeType.GMAIL_TOOL,
    label: "Gmail Tool",
    description: "Send emails and manage labels through Gmail (AI Agent tool)",
    icon: Mail,
    category: "action",
    color: "blue",
    connectorTypeForCredentials: "gmail",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          {
            label: "Execute Immediately",
            value: "execute",
          },
          {
            label: "Provide Tools to AI Agent",
            value: "provider",
          },
        ],
        defaultValue: "execute",
        required: true,
        description: '"Execute" runs the operation now. "Provider" gives tools to AI Agent for autonomous use.',
      },
      {
        name: "credentialId",
        label: "Gmail Credential",
        type: "select",
        options: [],
        required: true,
        description: "Select your Gmail credential",
      },
      {
        name: "operation",
        label: "Operation",
        type: "select",
        options: [
          {
            label: "Send Email",
            value: "sendEmail",
          },
          {
            label: "Get Labels",
            value: "getLabels",
          },
        ],
        defaultValue: "sendEmail",
        required: true,
        description: "Choose the operation to perform",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "to",
        label: "To",
        type: "text",
        placeholder: "recipient@example.com",
        required: true,
        description: "Recipient email address (comma-separated for multiple)",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "subject",
        label: "Subject",
        type: "text",
        placeholder: "Email subject",
        required: true,
        description: "Email subject line",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Email body content",
        required: true,
        description: "Email message content",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "emailType",
        label: "Email Type",
        type: "select",
        options: [
          {
            label: "HTML",
            value: "html",
          },
          {
            label: "Text",
            value: "text",
          },
        ],
        defaultValue: "html",
        required: true,
        description: "Format of the email message",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "cc",
        label: "CC",
        type: "text",
        placeholder: "cc@example.com",
        description: "CC recipients (comma-separated for multiple)",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
      {
        name: "bcc",
        label: "BCC",
        type: "text",
        placeholder: "bcc@example.com",
        description: "BCC recipients (comma-separated for multiple)",
        displayOptions: {
          show: {
            mode: ["execute"],
          },
        },
      },
    ],
  },
  [NodeType.SLACK_TOOL]: {
    type: NodeType.SLACK_TOOL,
    label: "Slack Tool",
    description: "Send messages and interact with Slack (AI Agent tool)",
    icon: MessageSquare,
    category: "action",
    color: "blue",
    connectorTypeForCredentials: "slack",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Execute Immediately", value: "execute" },
          { label: "Provide Tools to AI Agent", value: "provider" },
        ],
        defaultValue: "execute",
        required: true,
        description: '"Execute" runs the operation now. "Provider" gives tools to AI Agent for autonomous use.',
      },
      {
        name: "credentialId",
        label: "Slack Credential",
        type: "select",
        options: [],
        required: true,
        description: "Select your Slack credential",
      },
      {
        name: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Send Message", value: "sendMessage" },
          { label: "Get Channels", value: "getChannels" },
          { label: "List Users", value: "listUsers" },
          { label: "Add Reaction", value: "addReaction" },
        ],
        defaultValue: "sendMessage",
        required: true,
        description: "Choose the operation to perform",
        displayOptions: { show: { mode: ["execute"] } },
      },
      {
        name: "channel",
        label: "Channel",
        type: "text",
        placeholder: "#general or C1234567890",
        required: true,
        description: "Channel name or ID to send message to",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage", "addReaction"] } },
      },
      {
        name: "text",
        label: "Message",
        type: "textarea",
        placeholder: "Your message here...",
        required: true,
        description: "Message content (supports Slack markdown)",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "thread_ts",
        label: "Thread Timestamp",
        type: "text",
        placeholder: "1234567890.123456",
        description: "Optional. Reply in a thread by providing the parent message timestamp",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "timestamp",
        label: "Message Timestamp",
        type: "text",
        placeholder: "1234567890.123456",
        required: true,
        description: "Timestamp of the message to react to",
        displayOptions: { show: { mode: ["execute"], operation: ["addReaction"] } },
      },
      {
        name: "emoji",
        label: "Emoji",
        type: "text",
        placeholder: "thumbsup",
        required: true,
        description: "Emoji name without colons (e.g., thumbsup, heart)",
        displayOptions: { show: { mode: ["execute"], operation: ["addReaction"] } },
      },
    ],
  },
  [NodeType.TELEGRAM_TOOL]: {
    type: NodeType.TELEGRAM_TOOL,
    label: "Telegram Tool",
    description: "Send messages and media through Telegram Bot (AI Agent tool)",
    icon: Send,
    category: "action",
    color: "blue",
    connectorTypeForCredentials: "telegram",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Execute Immediately", value: "execute" },
          { label: "Provide Tools to AI Agent", value: "provider" },
        ],
        defaultValue: "execute",
        required: true,
        description: '"Execute" runs the operation now. "Provider" gives tools to AI Agent for autonomous use.',
      },
      {
        name: "credentialId",
        label: "Telegram Credential",
        type: "select",
        options: [],
        required: true,
        description: "Select your Telegram Bot credential",
      },
      {
        name: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Send Message", value: "sendMessage" },
          { label: "Send Photo", value: "sendPhoto" },
          { label: "Get Chat Info", value: "getChat" },
          { label: "Get Updates", value: "getUpdates" },
        ],
        defaultValue: "sendMessage",
        required: true,
        description: "Choose the operation to perform",
        displayOptions: { show: { mode: ["execute"] } },
      },
      {
        name: "chatId",
        label: "Chat ID",
        type: "text",
        placeholder: "123456789",
        required: true,
        description: "Unique identifier for the target chat",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage", "sendPhoto", "getChat"] } },
      },
      {
        name: "text",
        label: "Message",
        type: "textarea",
        placeholder: "Your message here...",
        required: true,
        description: "Message content",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "parseMode",
        label: "Parse Mode",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Markdown", value: "Markdown" },
          { label: "HTML", value: "HTML" },
        ],
        defaultValue: "none",
        description: "How to parse text formatting",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "photo",
        label: "Photo URL",
        type: "text",
        placeholder: "https://example.com/photo.jpg",
        required: true,
        description: "URL of the photo to send",
        displayOptions: { show: { mode: ["execute"], operation: ["sendPhoto"] } },
      },
      {
        name: "caption",
        label: "Caption",
        type: "textarea",
        placeholder: "Photo caption...",
        description: "Optional caption for the photo",
        displayOptions: { show: { mode: ["execute"], operation: ["sendPhoto"] } },
      },
    ],
  },
  [NodeType.DISCORD_TOOL]: {
    type: NodeType.DISCORD_TOOL,
    label: "Discord Tool",
    description: "Send messages and interact with Discord (AI Agent tool)",
    icon: Hash,
    category: "action",
    color: "blue",
    connectorTypeForCredentials: "discord",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Execute Immediately", value: "execute" },
          { label: "Provide Tools to AI Agent", value: "provider" },
        ],
        defaultValue: "execute",
        required: true,
        description: '"Execute" runs the operation now. "Provider" gives tools to AI Agent for autonomous use.',
      },
      {
        name: "credentialId",
        label: "Discord Credential",
        type: "select",
        options: [],
        required: true,
        description: "Select your Discord Bot credential",
      },
      {
        name: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Send Message", value: "sendMessage" },
          { label: "Get Channels", value: "getChannels" },
          { label: "Get Members", value: "getMembers" },
          { label: "Add Reaction", value: "addReaction" },
        ],
        defaultValue: "sendMessage",
        required: true,
        description: "Choose the operation to perform",
        displayOptions: { show: { mode: ["execute"] } },
      },
      {
        name: "channelId",
        label: "Channel ID",
        type: "text",
        placeholder: "1234567890123456789",
        required: true,
        description: "Discord channel ID (enable Developer Mode to copy)",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage", "addReaction"] } },
      },
      {
        name: "guildId",
        label: "Server (Guild) ID",
        type: "text",
        placeholder: "1234567890123456789",
        required: true,
        description: "Discord server ID",
        displayOptions: { show: { mode: ["execute"], operation: ["getChannels", "getMembers"] } },
      },
      {
        name: "content",
        label: "Message",
        type: "textarea",
        placeholder: "Your message here...",
        required: true,
        description: "Message content (max 2000 characters, supports Discord markdown)",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "messageId",
        label: "Message ID",
        type: "text",
        placeholder: "1234567890123456789",
        required: true,
        description: "ID of the message to react to",
        displayOptions: { show: { mode: ["execute"], operation: ["addReaction"] } },
      },
      {
        name: "emoji",
        label: "Emoji",
        type: "text",
        placeholder: "👍 or custom:123456789",
        required: true,
        description: "Unicode emoji or custom emoji in name:id format",
        displayOptions: { show: { mode: ["execute"], operation: ["addReaction"] } },
      },
    ],
  },
  [NodeType.TEAMS_TOOL]: {
    type: NodeType.TEAMS_TOOL,
    label: "Microsoft Teams Tool",
    description: "Send messages and interact with Microsoft Teams (AI Agent tool)",
    icon: Users,
    category: "action",
    color: "blue",
    connectorTypeForCredentials: "teams",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Execute Immediately", value: "execute" },
          { label: "Provide Tools to AI Agent", value: "provider" },
        ],
        defaultValue: "execute",
        required: true,
        description: '"Execute" runs the operation now. "Provider" gives tools to AI Agent for autonomous use.',
      },
      {
        name: "credentialId",
        label: "Microsoft Teams Credential",
        type: "select",
        options: [],
        required: true,
        description: "Select your Microsoft Teams credential",
      },
      {
        name: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Send Message", value: "sendMessage" },
          { label: "Get Channels", value: "getChannels" },
          { label: "Get Members", value: "getMembers" },
          { label: "Get Joined Teams", value: "getJoinedTeams" },
        ],
        defaultValue: "sendMessage",
        required: true,
        description: "Choose the operation to perform",
        displayOptions: { show: { mode: ["execute"] } },
      },
      {
        name: "teamId",
        label: "Team ID",
        type: "text",
        placeholder: "team-guid-here",
        required: true,
        description: "ID of the Microsoft Teams team",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage", "getChannels", "getMembers"] } },
      },
      {
        name: "channelId",
        label: "Channel ID",
        type: "text",
        placeholder: "channel-guid-here",
        required: true,
        description: "ID of the channel to send message to",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "content",
        label: "Message",
        type: "textarea",
        placeholder: "Your message here...",
        required: true,
        description: "Message content (supports HTML formatting)",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "contentType",
        label: "Content Type",
        type: "select",
        options: [
          { label: "Text", value: "text" },
          { label: "HTML", value: "html" },
        ],
        defaultValue: "text",
        description: "Format of the message content",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
      {
        name: "subject",
        label: "Subject",
        type: "text",
        placeholder: "Message subject",
        description: "Optional subject line for the message",
        displayOptions: { show: { mode: ["execute"], operation: ["sendMessage"] } },
      },
    ],
  },
  [NodeType.CONNECTOR_ACTION]: {
    type: NodeType.CONNECTOR_ACTION,
    label: "App Action",
    description: "Perform actions in connected apps",
    icon: Zap,
    category: "action",
    color: "teal",
    configFields: [], // Will be populated dynamically based on selected action
  },

  // Control Flow
  [NodeType.IF_CONDITION]: {
    type: NodeType.IF_CONDITION,
    label: "If",
    description: "Branch workflow based on conditions",
    icon: GitBranch,
    category: "control",
    color: "purple",
    configFields: [
      {
        name: "conditions",
        label: "Conditions",
        type: "conditions",
        required: true,
        description: "Define conditions to evaluate. Data goes to 'true' output if conditions match, otherwise to 'false' output.",
        defaultValue: {
          combinator: "and",
          conditions: [
            {
              leftValue: "",
              operator: { type: "string", operation: "equals" },
              rightValue: "",
            },
          ],
        },
      },
      {
        name: "ignoreCase",
        label: "Ignore Case",
        type: "toggle",
        description: "Ignore letter case when comparing text values",
        defaultValue: true,
      },
    ],
  },
  [NodeType.SWITCH]: {
    type: NodeType.SWITCH,
    label: "Switch",
    description: "Route data to different branches based on rules",
    icon: Workflow,
    category: "control",
    color: "purple",
    configFields: [
      {
        name: "mode",
        label: "Mode",
        type: "select",
        options: [
          { label: "Rules - Build matching rules for each output", value: "rules" },
          { label: "Expression - Return output index via expression", value: "expression" },
        ],
        defaultValue: "rules",
        required: true,
        description: "Choose how data should be routed",
      },
      {
        name: "rules",
        label: "Routing Rules",
        type: "rules",
        description: "Define rules to match and route data",
        defaultValue: {
          values: [
            {
              conditions: {
                combinator: "and",
                conditions: [
                  {
                    leftValue: "",
                    operator: { type: "string", operation: "equals" },
                    rightValue: "",
                  },
                ],
              },
              outputKey: "0",
            },
          ],
        },
      },
      {
        name: "fallbackOutput",
        label: "Fallback Output",
        type: "select",
        options: [
          { label: "None - Ignore unmatched items", value: "none" },
          { label: "Extra Output - Send to separate output", value: "extra" },
        ],
        defaultValue: "none",
        description: "What to do with items that don't match any rule",
      },
      {
        name: "ignoreCase",
        label: "Ignore Case",
        type: "toggle",
        description: "Ignore letter case when comparing text values",
        defaultValue: true,
      },
    ],
  },
  [NodeType.LOOP]: {
    type: NodeType.LOOP,
    label: "Loop Over Items",
    description: "Iterate over array items and execute actions for each",
    icon: Repeat,
    category: "control",
    color: "purple",
    configFields: [
      {
        name: "items",
        label: "Items to Loop",
        type: "text",
        placeholder: "{{$json.items}}",
        required: true,
        description: "Expression that returns an array of items to loop over",
      },
      {
        name: "batchSize",
        label: "Batch Size",
        type: "number",
        placeholder: "1",
        description: "How many items to process at once (leave empty for all)",
      },
    ],
  },
  [NodeType.FILTER]: {
    type: NodeType.FILTER,
    label: "Filter",
    description: "Filter items based on conditions",
    icon: Filter,
    category: "control",
    color: "purple",
    configFields: [
      {
        name: "conditions",
        label: "Filter Conditions",
        type: "conditions",
        required: true,
        description: "Items matching conditions will be kept, others discarded",
        defaultValue: {
          combinator: "and",
          conditions: [
            {
              leftValue: "",
              operator: { type: "string", operation: "equals" },
              rightValue: "",
            },
          ],
        },
      },
      {
        name: "ignoreCase",
        label: "Ignore Case",
        type: "toggle",
        description: "Ignore letter case when comparing text values",
        defaultValue: true,
      },
    ],
  },
  [NodeType.WAIT]: {
    type: NodeType.WAIT,
    label: "Wait",
    description: "Wait before continuing with execution",
    icon: PauseCircle,
    category: "control",
    color: "purple",
    configFields: [
      {
        name: "resume",
        label: "Resume",
        type: "select",
        options: [
          { label: "After Time Interval", value: "timeInterval" },
          { label: "At Specified Time", value: "specificTime" },
          { label: "On Webhook Call", value: "webhook" },
          { label: "On Form Submitted", value: "form" },
        ],
        defaultValue: "timeInterval",
        required: true,
        description: "Determines when the workflow should continue",
      },
      // Time Interval Fields
      {
        name: "amount",
        label: "Wait Amount",
        type: "number",
        placeholder: "5",
        defaultValue: 5,
        description: "The time to wait",
        displayOptions: {
          show: {
            resume: ["timeInterval"],
          },
        },
      },
      {
        name: "unit",
        label: "Wait Unit",
        type: "select",
        options: [
          { label: "Seconds", value: "seconds" },
          { label: "Minutes", value: "minutes" },
          { label: "Hours", value: "hours" },
          { label: "Days", value: "days" },
        ],
        defaultValue: "seconds",
        description: "Unit of time for wait amount",
        displayOptions: {
          show: {
            resume: ["timeInterval"],
          },
        },
      },
      // Specific Time Fields
      {
        name: "dateTime",
        label: "Date and Time",
        type: "text",
        placeholder: "2025-12-01T09:00:00",
        description: "Specific date and time to wait until (ISO format)",
        displayOptions: {
          show: {
            resume: ["specificTime"],
          },
        },
      },
      // Webhook Fields
      {
        name: "httpMethod",
        label: "HTTP Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ],
        defaultValue: "POST",
        description: "HTTP method for webhook",
        displayOptions: {
          show: {
            resume: ["webhook"],
          },
        },
      },
      {
        name: "authentication",
        label: "Authentication",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Basic Auth", value: "basicAuth" },
          { label: "Bearer Token", value: "bearerToken" },
        ],
        defaultValue: "none",
        description: "Webhook authentication method",
        displayOptions: {
          show: {
            resume: ["webhook"],
          },
        },
      },
      {
        name: "responseCode",
        label: "Response Code",
        type: "number",
        placeholder: "200",
        defaultValue: 200,
        description: "HTTP status code to return",
        displayOptions: {
          show: {
            resume: ["webhook"],
          },
        },
      },
      {
        name: "responseData",
        label: "Response Data",
        type: "textarea",
        placeholder: '{"received": true}',
        defaultValue: '{"received": true}',
        description: "Data to return in webhook response",
        displayOptions: {
          show: {
            resume: ["webhook"],
          },
        },
      },
      {
        name: "webhookSuffix",
        label: "Webhook Suffix",
        type: "text",
        placeholder: "approval",
        description: "Suffix path for webhook URL (helpful when using multiple wait nodes)",
        displayOptions: {
          show: {
            resume: ["webhook"],
          },
        },
      },
      // Form Fields
      {
        name: "formTitle",
        label: "Form Title",
        type: "text",
        placeholder: "Approval Form",
        defaultValue: "Form Submission",
        description: "Title of the form",
        displayOptions: {
          show: {
            resume: ["form"],
          },
        },
      },
      {
        name: "formDescription",
        label: "Form Description",
        type: "textarea",
        placeholder: "Please review and approve...",
        description: "Description text for the form",
        displayOptions: {
          show: {
            resume: ["form"],
          },
        },
      },
      // Wait Limit Fields (for webhook/form modes)
      {
        name: "limitWaitTime",
        label: "Limit Wait Time",
        type: "toggle",
        defaultValue: false,
        description: "Set a maximum wait time before timeout",
        displayOptions: {
          show: {
            resume: ["webhook", "form"],
          },
        },
      },
      {
        name: "limitType",
        label: "Limit Type",
        type: "select",
        options: [
          { label: "After Time Interval", value: "afterTimeInterval" },
          { label: "At Specified Time", value: "atSpecifiedTime" },
        ],
        defaultValue: "afterTimeInterval",
        description: "How to specify the wait limit",
        displayOptions: {
          show: {
            resume: ["webhook", "form"],
          },
        },
      },
      {
        name: "resumeAmount",
        label: "Resume Amount",
        type: "number",
        placeholder: "1",
        defaultValue: 1,
        description: "Time to wait before timeout",
        displayOptions: {
          show: {
            resume: ["webhook", "form"],
          },
        },
      },
      {
        name: "resumeUnit",
        label: "Resume Unit",
        type: "select",
        options: [
          { label: "Seconds", value: "seconds" },
          { label: "Minutes", value: "minutes" },
          { label: "Hours", value: "hours" },
          { label: "Days", value: "days" },
        ],
        defaultValue: "hours",
        description: "Unit for timeout duration",
        displayOptions: {
          show: {
            resume: ["webhook", "form"],
          },
        },
      },
      {
        name: "maxDateAndTime",
        label: "Max Date and Time",
        type: "text",
        placeholder: "2025-12-01T18:00:00",
        description: "Maximum date/time to wait until",
        displayOptions: {
          show: {
            resume: ["webhook", "form"],
          },
        },
      },
    ],
  },
};

export const getTriggerNodes = () =>
  Object.values(NODE_DEFINITIONS).filter((node) => node.category === "trigger");

export const getActionNodes = () =>
  Object.values(NODE_DEFINITIONS).filter((node) => node.category === "action");

export const getControlNodes = () =>
  Object.values(NODE_DEFINITIONS).filter((node) => node.category === "control");
