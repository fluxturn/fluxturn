import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Rocket,
  Zap,
  Code,
  Globe,
  Shield,
  Cloud,
  Terminal,
  Layers,
  Bot,
  Menu,
  X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { SEO } from "../components/SEO";

// Documentation navigation structure
const docsNavigation = [
  {
    title: "Getting Started",
    icon: <Rocket className="w-4 h-4" />,
    children: [
      { title: "Introduction", slug: "introduction" },
      { title: "Quick Start", slug: "quick-start" },
      { title: "Installation", slug: "installation" },
      { title: "Your First Workflow", slug: "first-workflow" }
    ]
  },
  {
    title: "Using FluxTurn",
    icon: <Zap className="w-4 h-4" />,
    children: [
      { title: "Workflows", slug: "workflows" },
      { title: "Nodes", slug: "nodes" },
      { title: "Credentials", slug: "credentials" },
      { title: "Expressions", slug: "expressions" },
      { title: "Error Handling", slug: "error-handling" }
    ]
  },
  {
    title: "Integrations",
    icon: <Globe className="w-4 h-4" />,
    children: [
      { title: "Overview", slug: "integrations-overview" },
      { title: "HTTP Request", slug: "http-request" },
      { title: "Webhooks", slug: "webhooks" },
      { title: "API Integration", slug: "api-integration" },
      { title: "Database", slug: "database-integration" }
    ]
  },
  {
    title: "Code in FluxTurn",
    icon: <Code className="w-4 h-4" />,
    children: [
      { title: "JavaScript", slug: "javascript" },
      { title: "Python", slug: "python" },
      { title: "Function Nodes", slug: "function-nodes" },
      { title: "Custom Nodes", slug: "custom-nodes" }
    ]
  },
  {
    title: "Advanced AI",
    icon: <Bot className="w-4 h-4" />,
    children: [
      { title: "AI Agents", slug: "ai-agents" },
      { title: "LLM Integration", slug: "llm-integration" },
      { title: "Vector Stores", slug: "vector-stores" },
      { title: "Embeddings", slug: "embeddings" }
    ]
  },
  {
    title: "Hosting FluxTurn",
    icon: <Cloud className="w-4 h-4" />,
    children: [
      { title: "Self-Hosting", slug: "self-hosting" },
      { title: "Docker", slug: "docker" },
      { title: "Cloud Deployment", slug: "cloud-deployment" },
      { title: "Environment Variables", slug: "environment-variables" }
    ]
  },
  {
    title: "API",
    icon: <Terminal className="w-4 h-4" />,
    children: [
      { title: "REST API", slug: "rest-api" },
      { title: "Authentication", slug: "api-authentication" },
      { title: "Endpoints", slug: "api-endpoints" },
      { title: "Webhooks", slug: "api-webhooks" }
    ]
  },
  {
    title: "Enterprise",
    icon: <Shield className="w-4 h-4" />,
    children: [
      { title: "Source Control", slug: "source-control" },
      { title: "SSO & SAML", slug: "sso-saml" },
      { title: "Secrets Management", slug: "secrets-management" },
      { title: "Licensing", slug: "licensing" }
    ]
  }
];

// Content for each documentation page
const docsContent: Record<string, { title: string; content: React.ReactNode }> = {
  introduction: {
    title: "Introduction to FluxTurn",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn is a powerful workflow automation platform that helps you connect your apps and automate tasks.
          Whether you're a developer looking to build complex integrations or a business user wanting to streamline processes,
          FluxTurn has you covered.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What is FluxTurn?</h3>
        <p className="text-gray-700 leading-relaxed">
          FluxTurn is a node-based workflow automation tool that allows you to connect different services and create
          automated workflows. It features a visual interface for building workflows, but also supports custom code
          for advanced use cases.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Key Features</h3>
        <ul className="list-disc list-inside space-y-3 text-gray-700">
          <li><strong>Visual Workflow Builder:</strong> Drag-and-drop interface for creating workflows</li>
          <li><strong>120+ Integrations:</strong> Connect to popular apps and services</li>
          <li><strong>Custom Code:</strong> Write JavaScript and Python for custom logic</li>
          <li><strong>AI-Powered:</strong> Build workflows with natural language and run AI agents</li>
          <li><strong>Self-Hosted:</strong> Deploy on your own infrastructure with Docker</li>
        </ul>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-6 mt-8 rounded-r-lg">
          <p className="text-cyan-900 font-semibold mb-2">Ready to get started?</p>
          <p className="text-cyan-800">
            Head over to the <Link to="/docs/quick-start" className="underline hover:text-cyan-600">Quick Start guide</Link> to
            create your first workflow in minutes.
          </p>
        </div>
      </div>
    )
  },
  "quick-start": {
    title: "Quick Start Guide",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Get up and running with FluxTurn in just a few minutes. This guide will walk you through creating your first workflow.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 1: Run FluxTurn Locally</h3>
        <p className="text-gray-700 leading-relaxed">
          Clone the repository and start everything with Docker Compose. This brings up the backend, frontend,
          PostgreSQL, Redis, and Qdrant in a single command.
        </p>

        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm my-4 space-y-1">
          <div>git clone https://github.com/fluxturn/fluxturn.git</div>
          <div>cd fluxturn</div>
          <div>cp backend/.env.example backend/.env</div>
          <div className="text-gray-400"># edit backend/.env to set JWT_SECRET, CONNECTOR_ENCRYPTION_KEY, etc.</div>
          <div>docker compose up -d</div>
        </div>

        <p className="text-gray-700 leading-relaxed">
          Once the containers are up, the frontend is at{" "}
          <code className="bg-gray-100 px-1 rounded">http://localhost:5185</code> and the backend API is at{" "}
          <code className="bg-gray-100 px-1 rounded">http://localhost:5005</code>. Then visit{" "}
          <Link to="/register" className="text-cyan-600 hover:underline">/register</Link> to create your first account.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 2: Create Your First Workflow</h3>
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>Click the <strong>"New Workflow"</strong> button in the dashboard</li>
          <li>Add a <strong>Trigger node</strong> (e.g., Webhook, Schedule, or Manual)</li>
          <li>Add an <strong>Action node</strong> (e.g., HTTP Request, Email, Database)</li>
          <li>Connect the nodes by dragging from one output to another input</li>
          <li>Configure each node with the required settings</li>
          <li>Click <strong>"Execute Workflow"</strong> to test</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 3: Activate Your Workflow</h3>
        <p className="text-gray-700 leading-relaxed">
          Once you've tested your workflow, toggle the <strong>"Active"</strong> switch in the top-right corner to
          enable it. Your workflow will now run automatically based on the trigger you configured.
        </p>

        <div className="bg-green-50 border-l-4 border-green-500 p-6 mt-8 rounded-r-lg">
          <p className="text-green-900 font-semibold mb-2">Congratulations!</p>
          <p className="text-green-800">
            You've created your first FluxTurn workflow. Explore the <Link to="/docs/workflows" className="underline hover:text-green-600">Workflows documentation</Link> to
            learn more advanced features.
          </p>
        </div>
      </div>
    )
  },
  installation: {
    title: "Installation & Setup",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn is self-hosted. The recommended way to install it is with Docker Compose, which brings up
          the backend, frontend, PostgreSQL, Redis, and Qdrant together in one command.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Prerequisites</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li>Docker and Docker Compose installed</li>
          <li>~4GB free RAM and ~5GB disk space</li>
          <li>Ports <code className="bg-gray-100 px-1 rounded">5005</code>, <code className="bg-gray-100 px-1 rounded">5185</code>, and <code className="bg-gray-100 px-1 rounded">5433</code> available on the host</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quick Start with Docker Compose</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 space-y-1">
          <div>git clone https://github.com/fluxturn/fluxturn.git</div>
          <div>cd fluxturn</div>
          <div>cp backend/.env.example backend/.env</div>
          <div className="text-gray-400"># edit backend/.env — at minimum set JWT_SECRET and CONNECTOR_ENCRYPTION_KEY</div>
          <div>docker compose up -d</div>
        </div>

        <p className="text-gray-700 leading-relaxed">
          When everything is up, open <code className="bg-gray-100 px-1 rounded">http://localhost:5185</code> in
          your browser and register a new account. The backend API is at{" "}
          <code className="bg-gray-100 px-1 rounded">http://localhost:5005</code>.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Manual Setup (without Docker)</h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          You'll need Node.js 18+, PostgreSQL 14+, and Redis 7+ running on your host first.
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 space-y-1">
          <div className="text-gray-400"># backend</div>
          <div>cd backend</div>
          <div>cp .env.example .env</div>
          <div>npm install</div>
          <div>npm run start:dev</div>
          <div className="mt-2 text-gray-400"># frontend (new terminal)</div>
          <div>cd frontend</div>
          <div>cp .env.example .env</div>
          <div>npm install</div>
          <div>npm run dev</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Workspace Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Create an <strong>Organization</strong> (your team/company)</li>
          <li>Create a <strong>Project</strong> (groups related workflows)</li>
          <li>Invite team members and set roles</li>
        </ol>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            See <Link to="/docs/environment-variables" className="underline">Environment Variables</Link> for all configuration options
            and <Link to="/docs/docker" className="underline">Docker Deployment</Link> for production tips.
          </p>
        </div>
      </div>
    )
  },
  "first-workflow": {
    title: "Your First Workflow",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Build a workflow that sends a Slack notification when a form is submitted.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 1: Create a New Workflow</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Click <strong>New Workflow</strong> in the dashboard</li>
          <li>Name it "Form to Slack Notification"</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 2: Add a Form Trigger</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Click the <strong>+</strong> button to add a node</li>
          <li>Select <strong>Form Trigger</strong> from Triggers</li>
          <li>Add fields: Name (text), Email (email), Message (textarea)</li>
          <li>Copy the form URL for testing</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 3: Add Slack Action</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Click <strong>+</strong> after the Form Trigger</li>
          <li>Select <strong>Slack</strong> → <strong>Send Message</strong></li>
          <li>Connect your Slack credentials</li>
          <li>Select a channel and configure the message:</li>
        </ol>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-green-400">New form submission:</div>
          <div>Name: {"{{$json.name}}"}</div>
          <div>Email: {"{{$json.email}}"}</div>
          <div>Message: {"{{$json.message}}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Step 4: Test & Activate</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Click <strong>Execute Workflow</strong> to test with sample data</li>
          <li>Submit the form URL to test the full flow</li>
          <li>Toggle <strong>Active</strong> to enable production mode</li>
        </ol>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-6 rounded-r-lg">
          <p className="text-green-800">
            You've built your first automation! Explore <Link to="/docs/nodes" className="underline">Nodes</Link> to see all available triggers and actions.
          </p>
        </div>
      </div>
    )
  },
  workflows: {
    title: "Working with Workflows",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Workflows are the core of FluxTurn. A workflow is a series of connected nodes that automate a specific task or process.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Workflow Basics</h3>
        <p className="text-gray-700 leading-relaxed">
          Every workflow consists of:
        </p>
        <ul className="list-disc list-inside space-y-3 text-gray-700">
          <li><strong>Trigger Nodes:</strong> Start the workflow (webhooks, schedules, manual triggers)</li>
          <li><strong>Action Nodes:</strong> Perform operations (API calls, data transformations, notifications)</li>
          <li><strong>Connections:</strong> Define the flow of data between nodes</li>
          <li><strong>Settings:</strong> Configure execution, error handling, and more</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Workflow Execution</h3>
        <p className="text-gray-700 leading-relaxed">
          Workflows can be executed in several ways:
        </p>
        <ul className="list-disc list-inside space-y-3 text-gray-700">
          <li><strong>Manual:</strong> Click the "Execute" button to run immediately</li>
          <li><strong>Webhook:</strong> Triggered by an HTTP request to a unique URL</li>
          <li><strong>Schedule:</strong> Run on a cron schedule (e.g., every hour, daily at 9am)</li>
          <li><strong>Event:</strong> Triggered by events from connected apps</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mt-8 rounded-r-lg">
          <p className="text-blue-900 font-semibold mb-2">Pro Tip</p>
          <p className="text-blue-800">
            Use the <strong>Split in Batches</strong> node to process large datasets efficiently without hitting API rate limits.
          </p>
        </div>
      </div>
    )
  },
  nodes: {
    title: "Node Types Reference",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Nodes are the building blocks of workflows. Each node performs a specific function.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Trigger Nodes</h3>
        <p className="text-gray-700 mb-4">Start workflow execution based on events:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { name: "Manual Trigger", desc: "Execute workflow on demand" },
            { name: "Schedule Trigger", desc: "Run on cron schedule (hourly, daily, etc.)" },
            { name: "Webhook Trigger", desc: "Triggered by HTTP requests to unique URL" },
            { name: "Form Trigger", desc: "Triggered by form submissions" },
            { name: "Chat Trigger", desc: "Triggered by chat messages for AI workflows" },
            { name: "Connector Trigger", desc: "Events from 120+ connected apps" }
          ].map((node, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <span className="font-semibold text-gray-900">{node.name}</span>
              <span className="text-gray-600 text-sm ml-2">— {node.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Action Nodes</h3>
        <p className="text-gray-700 mb-4">Perform operations on data:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { name: "HTTP Request", desc: "Make API calls to any endpoint" },
            { name: "Connector Action", desc: "Actions from 120+ integrations" },
            { name: "Database Query", desc: "Execute SQL queries" },
            { name: "Transform Data", desc: "Map and transform data fields" },
            { name: "Run Code", desc: "Execute custom JavaScript" },
            { name: "Set (Edit Fields)", desc: "Add, modify, or remove fields" }
          ].map((node, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <span className="font-semibold text-gray-900">{node.name}</span>
              <span className="text-gray-600 text-sm ml-2">— {node.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Control Flow Nodes</h3>
        <p className="text-gray-700 mb-4">Manage execution paths:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { name: "If Condition", desc: "Branch based on true/false conditions" },
            { name: "Switch", desc: "Route to multiple outputs based on rules" },
            { name: "Filter", desc: "Keep or discard items matching conditions" },
            { name: "Loop", desc: "Iterate over array items" },
            { name: "Merge", desc: "Combine data from multiple branches" },
            { name: "Split", desc: "Distribute data to multiple outputs" },
            { name: "Wait", desc: "Pause for time, webhook, or form" }
          ].map((node, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <span className="font-semibold text-gray-900">{node.name}</span>
              <span className="text-gray-600 text-sm ml-2">— {node.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">AI Nodes</h3>
        <p className="text-gray-700 mb-4">Build AI-powered workflows:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "AI Agent", desc: "Autonomous agent with tool access" },
            { name: "OpenAI Chat Model", desc: "Configure OpenAI models" },
            { name: "Simple Memory", desc: "In-memory conversation storage" },
            { name: "Redis Memory", desc: "Persistent conversation storage" }
          ].map((node, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <span className="font-semibold text-gray-900">{node.name}</span>
              <span className="text-gray-600 text-sm ml-2">— {node.desc}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  credentials: {
    title: "Managing Credentials",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Credentials securely store authentication details for your integrations.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Creating Credentials</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Go to <strong>Settings → Credentials</strong></li>
          <li>Click <strong>Add Credential</strong></li>
          <li>Select the service (e.g., Slack, Google Sheets)</li>
          <li>Follow the authentication flow (OAuth or API key)</li>
          <li>Name your credential for easy identification</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Authentication Types</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">OAuth 2.0</h4>
            <p className="text-gray-600 text-sm">Used by most services (Google, Slack, GitHub). Click "Connect" and authorize in the popup.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">API Key</h4>
            <p className="text-gray-600 text-sm">Paste your API key from the service's dashboard (OpenAI, SendGrid, Stripe).</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Basic Auth</h4>
            <p className="text-gray-600 text-sm">Username and password combination for services like SMTP or databases.</p>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Using Credentials in Workflows</h3>
        <p className="text-gray-700 mb-4">
          When adding a connector node, select your saved credential from the dropdown. Credentials are encrypted and never exposed in workflow data.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <p className="text-yellow-800">
            <strong>Security:</strong> Credentials are encrypted at rest. Team members can use credentials without seeing the actual values.
          </p>
        </div>
      </div>
    )
  },
  expressions: {
    title: "Data Expressions",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Expressions let you reference and transform data dynamically in your workflows.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Expression Syntax</h3>
        <p className="text-gray-700 mb-4">Use double curly braces to write expressions:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-green-400">{"{{$json.fieldName}}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Common Patterns</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-2 mb-6">
          <div><span className="text-gray-400">// Current node data</span></div>
          <div>{"{{$json.email}}"}</div>
          <div className="mt-2"><span className="text-gray-400">// Nested fields</span></div>
          <div>{"{{$json.user.profile.name}}"}</div>
          <div className="mt-2"><span className="text-gray-400">// From specific node</span></div>
          <div>{"{{$node[\"HTTP Request\"].json.data}}"}</div>
          <div className="mt-2"><span className="text-gray-400">// Workflow variables</span></div>
          <div>{"{{$workflow.variables.apiUrl}}"}</div>
          <div className="mt-2"><span className="text-gray-400">// Environment variables</span></div>
          <div>{"{{$env.API_KEY}}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Built-in Functions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { fn: "$now", desc: "Current timestamp" },
            { fn: "$today", desc: "Today's date" },
            { fn: "$if(cond, a, b)", desc: "Conditional value" },
            { fn: "$json.field.toUpperCase()", desc: "String methods" },
            { fn: "$json.items.length", desc: "Array length" },
            { fn: "$json.items.map(x => x.id)", desc: "Array operations" }
          ].map((item, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <code className="text-cyan-600 text-sm">{item.fn}</code>
              <span className="text-gray-600 text-sm ml-2">— {item.desc}</span>
            </div>
          ))}
        </div>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            Click the <strong>expression editor</strong> button (fx) next to any field to build expressions with autocomplete.
          </p>
        </div>
      </div>
    )
  },
  "error-handling": {
    title: "Error Handling",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Configure how workflows respond to failures and errors.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Error Behavior Options</h3>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Stop Workflow</h4>
            <p className="text-gray-600 text-sm">Default. Execution stops immediately on error.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Continue on Fail</h4>
            <p className="text-gray-600 text-sm">Skip failed items and continue with remaining data.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-1">Retry on Fail</h4>
            <p className="text-gray-600 text-sm">Automatically retry failed operations (configurable attempts).</p>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Error Workflow</h3>
        <p className="text-gray-700 mb-4">
          Set up a dedicated workflow to handle errors:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Create a workflow with a <strong>Webhook Trigger</strong></li>
          <li>Add error notification logic (email, Slack, etc.)</li>
          <li>In your main workflow settings, set this as the <strong>Error Workflow</strong></li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Per-Node Settings</h3>
        <p className="text-gray-700 mb-4">
          Click the node settings (gear icon) to configure error handling per node:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div>On Error: Continue | Stop | Retry</div>
          <div>Max Retries: 3</div>
          <div>Retry Delay: 1000ms</div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-6 rounded-r-lg">
          <p className="text-red-800">
            <strong>Tip:</strong> Enable "Continue on Fail" for non-critical operations like logging or analytics.
          </p>
        </div>
      </div>
    )
  },
  integrations: {
    title: "Integrations",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn supports 120+ integrations with popular apps and services. Each integration provides pre-built nodes
          for common actions and triggers.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Popular Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Google Sheets", desc: "Read and write spreadsheet data" },
            { name: "Slack", desc: "Send messages and notifications" },
            { name: "GitHub", desc: "Automate repository workflows" },
            { name: "Airtable", desc: "Manage databases and records" },
            { name: "Stripe", desc: "Process payments and subscriptions" },
            { name: "SendGrid", desc: "Send transactional emails" }
          ].map((integration, idx) => (
            <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-cyan-300 transition-colors">
              <h4 className="font-bold text-gray-900 mb-2">{integration.name}</h4>
              <p className="text-sm text-gray-600">{integration.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Custom Integrations</h3>
        <p className="text-gray-700 leading-relaxed">
          Don't see the integration you need? Use the <strong>HTTP Request</strong> node to connect to any REST API,
          or build a custom node using our developer SDK.
        </p>
      </div>
    )
  },
  "integrations-overview": {
    title: "Integrations Overview",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Connect to 120+ services across all major categories. Each connector provides triggers and actions.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Available Connectors by Category</h3>

        <div className="space-y-6">
          {[
            { cat: "AI", items: "OpenAI, Anthropic, Google Gemini, AWS Bedrock, Google AI" },
            { cat: "Communication", items: "Slack, Discord, Telegram, Teams, Gmail, Twilio, WhatsApp, Calendly" },
            { cat: "CRM", items: "Salesforce, HubSpot, Pipedrive, Zoho, Airtable, Monday.com" },
            { cat: "E-commerce", items: "Stripe, Shopify, WooCommerce, Magento, PayPal, Gumroad, Paddle" },
            { cat: "Social Media", items: "Twitter, Facebook, Instagram, LinkedIn, TikTok, YouTube, Pinterest, Reddit" },
            { cat: "Project Management", items: "Jira, Asana, Trello, ClickUp, Linear, Notion" },
            { cat: "Development", items: "GitHub, GitLab, Bitbucket, Jenkins, Netlify" },
            { cat: "Marketing", items: "Mailchimp, SendGrid, Klaviyo, ActiveCampaign, Brevo" },
            { cat: "Storage & Databases", items: "PostgreSQL, MySQL, MongoDB, Redis, AWS S3, Google Drive, Dropbox" },
            { cat: "Finance", items: "QuickBooks, Xero, Chargebee, Wise, Plaid" },
            { cat: "Support", items: "Zendesk, Intercom, Freshdesk, PagerDuty, ServiceNow" }
          ].map((category, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{category.cat}</h4>
              <p className="text-gray-600 text-sm">{category.items}</p>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Connector Features</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Triggers:</strong> React to events (new message, payment, form submission)</li>
          <li><strong>Actions:</strong> Perform operations (send email, create record, post message)</li>
          <li><strong>OAuth:</strong> Secure authentication without storing passwords</li>
          <li><strong>Webhooks:</strong> Real-time event notifications</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Per-Connector Setup Guides</h3>
        <p className="text-gray-700 mb-4">
          Detailed setup instructions, action/trigger references, and example workflows for each connector live
          in markdown files in the repository, where they're easy to read on GitHub and easy to contribute to.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-gray-700 mb-2">
            Browse all connector docs:
          </p>
          <a
            href="https://github.com/fluxturn/fluxturn/tree/main/docs/connectors"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 hover:underline font-mono text-sm break-all"
          >
            github.com/fluxturn/fluxturn/tree/main/docs/connectors
          </a>
        </div>
        <p className="text-gray-700 mb-4">
          Reference docs (use these as the gold standard for new contributions):
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li>
            <a href="https://github.com/fluxturn/fluxturn/blob/main/docs/connectors/telegram.md" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Telegram
            </a>{" "}
            — simple API key auth
          </li>
          <li>
            <a href="https://github.com/fluxturn/fluxturn/blob/main/docs/connectors/gmail.md" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Gmail
            </a>{" "}
            — OAuth2 with polling triggers
          </li>
          <li>
            <a href="https://github.com/fluxturn/fluxturn/blob/main/docs/connectors/slack.md" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
              Slack
            </a>{" "}
            — Bearer token with webhook (Events API) triggers
          </li>
        </ul>
        <p className="text-gray-700">
          Want to help document a connector? See the{" "}
          <a href="https://github.com/fluxturn/fluxturn/blob/main/CONTRIBUTING.md#documenting-a-connector" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
            Documenting a Connector
          </a>{" "}
          section in CONTRIBUTING.md.
        </p>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            Can't find your service? Use the <Link to="/docs/http-request" className="underline">HTTP Request</Link> node to connect to any REST API.
          </p>
        </div>
      </div>
    )
  },
  "http-request": {
    title: "HTTP Request Node",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Make HTTP requests to any REST API. Supports all methods, authentication types, and response formats.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Basic Configuration</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div><span className="text-cyan-400">Method:</span> GET | POST | PUT | PATCH | DELETE</div>
          <div><span className="text-cyan-400">URL:</span> https://api.example.com/endpoint</div>
          <div><span className="text-cyan-400">Headers:</span> {"{ \"Content-Type\": \"application/json\" }"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Authentication</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { type: "Bearer Token", desc: "Authorization: Bearer {token}" },
            { type: "Basic Auth", desc: "Username and password" },
            { type: "API Key", desc: "Header or query parameter" },
            { type: "Custom Headers", desc: "Any custom auth headers" }
          ].map((auth, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <span className="font-semibold text-gray-900">{auth.type}</span>
              <span className="text-gray-600 text-sm ml-2">— {auth.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Request Body</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// JSON body with expressions</div>
          <div>{"{"}</div>
          <div className="pl-4">"email": {"\"{{$json.user.email}}\""},</div>
          <div className="pl-4">"name": {"\"{{$json.user.name}}\""}</div>
          <div>{"}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Response Handling</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Auto-detect:</strong> Parses JSON automatically</li>
          <li><strong>Full Response:</strong> Includes status code and headers</li>
          <li><strong>Binary:</strong> For file downloads</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Advanced Options</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Custom timeout settings</li>
          <li>Redirect handling (follow/don't follow)</li>
          <li>SSL certificate verification</li>
          <li>Proxy configuration</li>
        </ul>
      </div>
    )
  },
  webhooks: {
    title: "Webhook Triggers",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Webhooks let external services trigger your workflows via HTTP requests.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Setting Up a Webhook</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Add a <strong>Webhook Trigger</strong> node to your workflow</li>
          <li>Copy the generated webhook URL</li>
          <li>Configure the external service to send data to this URL</li>
          <li>Activate the workflow</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Webhook URL Format</h3>
        <p className="text-gray-700 mb-4">
          Webhook URLs are scoped to your FluxTurn instance. Replace the host with wherever your backend is reachable
          (your domain in production, or <code className="bg-gray-100 px-1 rounded">localhost:5005</code> in local development).
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Active workflow URL</div>
          <div>https://your-instance.com/webhook/{"<webhook-id>"}</div>
          <div className="mt-2 text-gray-400"># Test URL (for development)</div>
          <div>https://your-instance.com/webhook-test/{"<webhook-id>"}</div>
          <div className="mt-2 text-gray-400"># Local example</div>
          <div>http://localhost:5005/webhook/{"<webhook-id>"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">HTTP Methods</h3>
        <p className="text-gray-700 mb-4">Webhooks accept: GET, POST, PUT, PATCH, DELETE</p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Webhook Response</h3>
        <p className="text-gray-700 mb-4">Configure what to return to the calling service:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div><span className="text-cyan-400">Response Mode:</span> Immediately | When workflow completes</div>
          <div><span className="text-cyan-400">Response Code:</span> 200 (customizable)</div>
          <div><span className="text-cyan-400">Response Data:</span> {"{ \"status\": \"received\" }"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Accessing Webhook Data</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div>{"{{$json.body}}"} <span className="text-gray-400">// Request body</span></div>
          <div>{"{{$json.headers}}"} <span className="text-gray-400">// Request headers</span></div>
          <div>{"{{$json.query}}"} <span className="text-gray-400">// Query parameters</span></div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6 rounded-r-lg">
          <p className="text-yellow-800">
            <strong>Security:</strong> Webhook URLs are unique and unguessable. For additional security, validate signatures from the sending service.
          </p>
        </div>
      </div>
    )
  },
  "api-integration": {
    title: "API Integration Guide",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Connect to any REST API using the HTTP Request node or create reusable API integrations.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quick API Integration</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Add an <strong>HTTP Request</strong> node</li>
          <li>Configure the endpoint URL</li>
          <li>Add authentication headers</li>
          <li>Map response data to subsequent nodes</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Example: REST API Call</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Fetch users from an API</div>
          <div><span className="text-cyan-400">GET</span> https://api.example.com/users</div>
          <div className="mt-2 text-gray-400">// Headers</div>
          <div>Authorization: Bearer {"{{$env.API_TOKEN}}"}</div>
          <div>Content-Type: application/json</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Pagination Handling</h3>
        <p className="text-gray-700 mb-4">Use a Loop node with HTTP Request for paginated APIs:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Loop until no more pages</div>
          <div>URL: https://api.example.com/users?page={"{{$json.currentPage}}"}</div>
          <div>Stop when: {"{{$json.response.nextPage === null}}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Error Handling for APIs</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Check status codes with <code className="bg-gray-100 px-1 rounded">{"{{$json.statusCode}}"}</code></li>
          <li>Use If node to handle different responses</li>
          <li>Enable "Continue on Fail" for optional API calls</li>
        </ul>
      </div>
    )
  },
  "database-integration": {
    title: "Database Integration",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Connect to databases to read, write, and query data directly from workflows.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Supported Databases</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Snowflake"].map((db, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
              <span className="font-semibold text-gray-900">{db}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Setting Up Database Credentials</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Go to <strong>Credentials → Add Credential</strong></li>
          <li>Select your database type</li>
          <li>Enter connection details (host, port, database, user, password)</li>
          <li>Test the connection</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">SQL Query Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">-- Select with parameters</div>
          <div>SELECT * FROM users</div>
          <div>WHERE email = {"{{$json.email}}"}</div>
          <div>LIMIT 10;</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Operations</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Execute Query:</strong> Run any SQL statement</li>
          <li><strong>Insert:</strong> Add new records</li>
          <li><strong>Update:</strong> Modify existing records</li>
          <li><strong>Delete:</strong> Remove records</li>
          <li><strong>Upsert:</strong> Insert or update based on key</li>
        </ul>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-6 rounded-r-lg">
          <p className="text-red-800">
            <strong>Security:</strong> Always use parameterized queries (expressions) to prevent SQL injection. Never concatenate user input directly.
          </p>
        </div>
      </div>
    )
  },
  javascript: {
    title: "JavaScript Code Nodes",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Write custom JavaScript code to transform data, implement complex logic, or integrate with external libraries.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Using the Run Code Node</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Add a <strong>Run Code</strong> node</li>
          <li>Select <strong>JavaScript</strong> as the language</li>
          <li>Write your code in the editor</li>
          <li>Return data to pass to the next node</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Basic Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Access input data</div>
          <div>const items = $input.all();</div>
          <div className="mt-2 text-gray-400">// Transform data</div>
          <div>const result = items.map(item =&gt; {"({"}</div>
          <div className="pl-4">...item.json,</div>
          <div className="pl-4">processed: true,</div>
          <div className="pl-4">timestamp: new Date().toISOString()</div>
          <div>{"}));"}</div>
          <div className="mt-2 text-gray-400">// Return for next node</div>
          <div>return result;</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Available Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {[
            { var: "$input.all()", desc: "All input items as array" },
            { var: "$input.first()", desc: "First input item" },
            { var: "$json", desc: "Current item's JSON data" },
            { var: "$env", desc: "Environment variables" },
            { var: "$workflow", desc: "Workflow metadata" },
            { var: "$now", desc: "Current timestamp" }
          ].map((v, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <code className="text-cyan-600 text-sm">{v.var}</code>
              <span className="text-gray-600 text-sm ml-2">— {v.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Async Operations</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="text-gray-400">// Async/await is supported</div>
          <div>const response = await fetch('https://api.example.com/data');</div>
          <div>const data = await response.json();</div>
          <div>return [{"{ json: data }"}];</div>
        </div>
      </div>
    )
  },
  python: {
    title: "Python Code Nodes",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Execute Python code for data processing, machine learning, or complex calculations.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Basic Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Access input data</div>
          <div>items = _input.all()</div>
          <div className="mt-2 text-gray-400"># Process data</div>
          <div>result = []</div>
          <div>for item in items:</div>
          <div className="pl-4">processed = {"{"}</div>
          <div className="pl-8">**item['json'],</div>
          <div className="pl-8">'uppercase_name': item['json']['name'].upper()</div>
          <div className="pl-4">{"}"}</div>
          <div className="pl-4">result.append({"{ 'json': processed }"})</div>
          <div className="mt-2 text-gray-400"># Return result</div>
          <div>return result</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Available Libraries</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>json</strong> — JSON parsing and serialization</li>
          <li><strong>datetime</strong> — Date and time operations</li>
          <li><strong>re</strong> — Regular expressions</li>
          <li><strong>math</strong> — Mathematical functions</li>
          <li><strong>requests</strong> — HTTP requests (if enabled)</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Data Science Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="text-gray-400"># Aggregate data</div>
          <div>items = _input.all()</div>
          <div>values = [item['json']['amount'] for item in items]</div>
          <div>return [{"{"}</div>
          <div className="pl-4">'json': {"{"}</div>
          <div className="pl-8">'total': sum(values),</div>
          <div className="pl-8">'average': sum(values) / len(values),</div>
          <div className="pl-8">'count': len(values)</div>
          <div className="pl-4">{"}"}</div>
          <div>{"}]"}</div>
        </div>
      </div>
    )
  },
  "function-nodes": {
    title: "Function Node Reference",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Function nodes provide reusable code blocks and built-in data transformations.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Transform Data Node</h3>
        <p className="text-gray-700 mb-4">Map, filter, and transform data without writing code:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Keep Fields:</strong> Select which fields to keep</li>
          <li><strong>Rename Fields:</strong> Change field names</li>
          <li><strong>Add Fields:</strong> Create new computed fields</li>
          <li><strong>Remove Fields:</strong> Delete unwanted fields</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Set Node</h3>
        <p className="text-gray-700 mb-4">Add or modify fields with expressions:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Add computed field</div>
          <div>fullName: {"{{$json.firstName}} {{$json.lastName}}"}</div>
          <div className="mt-2 text-gray-400">// Transform existing field</div>
          <div>email: {"{{$json.email.toLowerCase()}}"}</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Common Patterns</h3>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Flatten Nested Objects</h4>
            <code className="text-sm text-cyan-600">{"{{$json.user.address.city}}"} → city</code>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Merge Objects</h4>
            <code className="text-sm text-cyan-600">Use Merge node → Combine by Position</code>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Split Arrays</h4>
            <code className="text-sm text-cyan-600">Loop node → Process each item separately</code>
          </div>
        </div>
      </div>
    )
  },
  "ai-agents": {
    title: "AI Agents",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Build autonomous AI agents that can reason, use tools, and complete complex tasks.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Setting Up an AI Agent</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Add an <strong>AI Agent</strong> node</li>
          <li>Connect an <strong>OpenAI Chat Model</strong> node</li>
          <li>Configure the system prompt</li>
          <li>Optionally add Tool nodes for capabilities</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Agent Configuration</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div><span className="text-cyan-400">System Prompt:</span></div>
          <div className="pl-4 text-gray-300">You are a helpful assistant that can search</div>
          <div className="pl-4 text-gray-300">databases and send notifications.</div>
          <div className="mt-2"><span className="text-cyan-400">Model:</span> gpt-4 (via OpenAI Chat Model)</div>
          <div><span className="text-cyan-400">Memory:</span> Simple Memory or Redis Memory</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Adding Tools</h3>
        <p className="text-gray-700 mb-4">Tools give agents capabilities to interact with external systems:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Database Tool:</strong> Query and update data</li>
          <li><strong>HTTP Tool:</strong> Call external APIs</li>
          <li><strong>Connector Tools:</strong> Use any connector action</li>
          <li><strong>Custom Tools:</strong> Define custom functions</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Memory Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Simple Memory</h4>
            <p className="text-gray-600 text-sm">In-memory storage. Good for testing and single-instance deployments.</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Redis Memory</h4>
            <p className="text-gray-600 text-sm">Persistent storage. Required for production and multi-instance deployments.</p>
          </div>
        </div>
      </div>
    )
  },
  "llm-integration": {
    title: "LLM Integration",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Integrate large language models from OpenAI, Anthropic, Google, and AWS into your workflows.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Supported Providers</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {["OpenAI", "Anthropic", "Google Gemini", "AWS Bedrock", "Google AI"].map((provider, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
              <span className="font-semibold text-gray-900">{provider}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">OpenAI Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
          <li>Add <strong>OpenAI Chat Model</strong> node</li>
          <li>Create OpenAI credential with your API key</li>
          <li>Select model (gpt-4, gpt-3.5-turbo, etc.)</li>
          <li>Connect to AI Agent or use directly</li>
        </ol>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Direct LLM Call Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Use OpenAI connector directly</div>
          <div><span className="text-cyan-400">Action:</span> Create Chat Completion</div>
          <div><span className="text-cyan-400">Model:</span> gpt-4</div>
          <div><span className="text-cyan-400">Messages:</span></div>
          <div className="pl-4">[{"{ role: 'user', content: {{$json.prompt}} }"}]</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Common Use Cases</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Text summarization and extraction</li>
          <li>Content generation and rewriting</li>
          <li>Classification and sentiment analysis</li>
          <li>Code generation and explanation</li>
          <li>Conversational assistants</li>
        </ul>
      </div>
    )
  },
  "rest-api": {
    title: "REST API Overview",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn provides a REST API for managing workflows, executing automations, and integrating with external systems.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Base URL</h3>
        <p className="text-gray-700 mb-4">
          The API is served from your FluxTurn backend. Replace the host with your deployment URL.
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Local development</div>
          <div>http://localhost:5005/api/v1</div>
          <div className="mt-2 text-gray-400"># Self-hosted production</div>
          <div>https://your-instance.com/api/v1</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">API Structure</h3>
        <div className="space-y-3 mb-6">
          {[
            { path: "/auth/*", desc: "Authentication & user management" },
            { path: "/workflow/*", desc: "Workflow CRUD & execution" },
            { path: "/connectors/*", desc: "Connector configs & actions" },
            { path: "/organization/*", desc: "Organization management" },
            { path: "/project/*", desc: "Project management" }
          ].map((endpoint, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center">
              <code className="text-cyan-600 font-mono text-sm w-40">{endpoint.path}</code>
              <span className="text-gray-600 text-sm">{endpoint.desc}</span>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quick Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="text-gray-400"># Execute a workflow (replace host with your instance)</div>
          <div>curl -X POST http://localhost:5005/api/v1/workflow/{"<id>"}/execute \</div>
          <div className="pl-4">-H "Authorization: Bearer {"<token>"}" \</div>
          <div className="pl-4">-H "Content-Type: application/json" \</div>
          <div className="pl-4">-d '{"{ \"data\": { \"key\": \"value\" } }"}'</div>
        </div>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            See <Link to="/docs/api-authentication" className="underline">Authentication</Link> for details on JWT tokens and API keys.
          </p>
        </div>
      </div>
    )
  },
  "api-authentication": {
    title: "API Authentication",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn supports JWT Bearer tokens and API keys for authentication.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">JWT Bearer Tokens</h3>
        <p className="text-gray-700 mb-4">Obtain a token by logging in:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Login</div>
          <div>POST /api/v1/auth/login</div>
          <div>{"{ \"email\": \"user@example.com\", \"password\": \"...\" }"}</div>
          <div className="mt-2 text-gray-400"># Response</div>
          <div>{"{ \"token\": \"eyJhbG...\", \"refreshToken\": \"...\" }"}</div>
        </div>

        <p className="text-gray-700 mb-4">Use the token in requests:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div>Authorization: Bearer eyJhbG...</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">API Keys</h3>
        <p className="text-gray-700 mb-4">For server-to-server integrations, use API keys:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># API key formats</div>
          <div>service_abc123... <span className="text-gray-400">// Service-level access</span></div>
          <div>anon_xyz789... <span className="text-gray-400">// Anonymous/public access</span></div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Using API Keys</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Option 1: x-api-key header (recommended)</div>
          <div>x-api-key: service_abc123...</div>
          <div className="mt-2 text-gray-400"># Option 2: Bearer token</div>
          <div>Authorization: Bearer service_abc123...</div>
          <div className="mt-2 text-gray-400"># Option 3: Query parameter</div>
          <div>?api_key=service_abc123...</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Multi-Tenant Headers</h3>
        <p className="text-gray-700 mb-4">Include context headers for organization/project scoping:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div>x-organization-id: uuid</div>
          <div>x-project-id: uuid</div>
        </div>
      </div>
    )
  },
  "api-endpoints": {
    title: "API Endpoints Reference",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Complete reference for FluxTurn REST API endpoints.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Authentication</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 font-mono text-sm text-gray-800">
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/auth/register <span className="text-gray-500">— Create account</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/auth/login <span className="text-gray-500">— Login, returns JWT</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/auth/me <span className="text-gray-500">— Get current user</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/auth/refresh <span className="text-gray-500">— Refresh token</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/auth/forgot-password <span className="text-gray-500">— Request reset</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/auth/reset-password <span className="text-gray-500">— Reset with token</span></div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Workflows</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 font-mono text-sm text-gray-800">
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/workflow/create <span className="text-gray-500">— Create workflow</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/workflow <span className="text-gray-500">— Get workflow details</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/workflow/list <span className="text-gray-500">— List workflows</span></div>
          <div><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold mr-2">PUT</span>/workflow/:id <span className="text-gray-500">— Update workflow</span></div>
          <div><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold mr-2">DELETE</span>/workflow/:id <span className="text-gray-500">— Delete workflow</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/workflow/:id/execute <span className="text-gray-500">— Execute workflow</span></div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Connectors</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 font-mono text-sm text-gray-800">
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/connectors <span className="text-gray-500">— List available connectors</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/connectors/:id <span className="text-gray-500">— Get connector details</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/connectors/config/create <span className="text-gray-500">— Create credential</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/connectors/config/test <span className="text-gray-500">— Test credential</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/connectors/action <span className="text-gray-500">— Execute action</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/connectors/config/list <span className="text-gray-500">— List credentials</span></div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Organizations & Projects</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm text-gray-800">
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/organization/create <span className="text-gray-500">— Create org</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/organization/user/list <span className="text-gray-500">— List user orgs</span></div>
          <div><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold mr-2">POST</span>/project/create <span className="text-gray-500">— Create project</span></div>
          <div><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mr-2">GET</span>/project/list <span className="text-gray-500">— List projects</span></div>
        </div>
      </div>
    )
  },
  "api-webhooks": {
    title: "Webhook API",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Receive real-time notifications from external services via webhooks.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Webhook Endpoints</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400"># Generic webhook (workflow-based)</div>
          <div>POST /webhook/:webhookId</div>
          <div className="mt-2 text-gray-400"># Connector-specific webhook</div>
          <div>POST /connectors/webhook/:connectorType/:triggerId</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Connector Webhooks</h3>
        <p className="text-gray-700 mb-4">40+ connectors support webhook triggers:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>Stripe:</strong> Payment events (charge.succeeded, invoice.paid)</li>
          <li><strong>GitHub:</strong> Repository events (push, pull_request)</li>
          <li><strong>Slack:</strong> Message events, slash commands</li>
          <li><strong>Shopify:</strong> Order events (orders/create, orders/updated)</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Webhook Security</h3>
        <p className="text-gray-700 mb-4">Verify webhook signatures when available:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
          <div className="text-gray-400">// Stripe signature verification</div>
          <div>const sig = req.headers['stripe-signature'];</div>
          <div>const event = stripe.webhooks.constructEvent(</div>
          <div className="pl-4">req.body, sig, webhookSecret</div>
          <div>);</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Webhook Response</h3>
        <p className="text-gray-700 mb-4">FluxTurn responds to webhook requests with:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>200 OK:</strong> Webhook received and processed</li>
          <li><strong>Custom response:</strong> Configured in webhook node settings</li>
        </ul>
      </div>
    )
  },
  "self-hosting": {
    title: "Self-Hosting Guide",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          Deploy FluxTurn on your own infrastructure for complete control over your data and workflows.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Requirements</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
          <li><strong>CPU:</strong> 2+ cores recommended</li>
          <li><strong>RAM:</strong> 4GB minimum, 8GB recommended</li>
          <li><strong>Storage:</strong> 20GB+ for application and data</li>
          <li><strong>Database:</strong> PostgreSQL 13+</li>
          <li><strong>Redis:</strong> For queues and caching (optional)</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quick Start</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 space-y-1">
          <div className="text-gray-400"># Clone, configure, and start</div>
          <div>git clone https://github.com/fluxturn/fluxturn.git</div>
          <div>cd fluxturn</div>
          <div>cp backend/.env.example backend/.env</div>
          <div>docker compose up -d</div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Production Checklist</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Generate strong values for <code className="bg-gray-100 px-1 rounded">JWT_SECRET</code>, <code className="bg-gray-100 px-1 rounded">CONNECTOR_ENCRYPTION_KEY</code>, and <code className="bg-gray-100 px-1 rounded">SESSION_SECRET</code></li>
          <li>Set <code className="bg-gray-100 px-1 rounded">FRONTEND_URL</code> and <code className="bg-gray-100 px-1 rounded">VITE_API_BASE_URL</code> to your public domain</li>
          <li>Use a managed PostgreSQL with backups (or back up the <code className="bg-gray-100 px-1 rounded">postgres_data</code> volume)</li>
          <li>Set up Redis persistence for queues and caching</li>
          <li>Enable HTTPS with valid certificates</li>
          <li>Put a reverse proxy (nginx, Caddy, Traefik) in front of the backend and frontend containers</li>
          <li>Set up monitoring and log aggregation</li>
        </ul>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            See <Link to="/docs/docker" className="underline">Docker</Link> for container deployment and <Link to="/docs/environment-variables" className="underline">Environment Variables</Link> for configuration.
          </p>
        </div>
      </div>
    )
  },
  docker: {
    title: "Docker Deployment",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          FluxTurn ships with a <code className="bg-gray-100 px-1 rounded">docker-compose.yml</code> at the
          repository root that brings up the entire stack: the NestJS backend, the React frontend (built and
          served by nginx), PostgreSQL, Redis, and Qdrant. The backend and frontend images are built locally
          from the Dockerfiles in <code className="bg-gray-100 px-1 rounded">backend/</code> and{" "}
          <code className="bg-gray-100 px-1 rounded">frontend/</code> — there is no pre-built image to pull.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Services and Ports</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 font-mono text-sm">
          <div><span className="text-cyan-600">frontend</span> — nginx serving the built React app on host port <strong>5185</strong></div>
          <div><span className="text-cyan-600">backend</span> — NestJS API + WebSocket gateway on host port <strong>5005</strong></div>
          <div><span className="text-cyan-600">postgres</span> — PostgreSQL 15 on host port <strong>5433</strong></div>
          <div><span className="text-cyan-600">redis</span> — Redis 7 on host port <strong>6379</strong></div>
          <div><span className="text-cyan-600">qdrant</span> — Qdrant vector DB on host port <strong>6333</strong></div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Starting the Stack</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 space-y-1">
          <div className="text-gray-400"># From the repo root</div>
          <div>cp backend/.env.example backend/.env</div>
          <div className="text-gray-400"># Edit backend/.env to set JWT_SECRET, CONNECTOR_ENCRYPTION_KEY, etc.</div>
          <div>docker compose up -d</div>
        </div>
        <p className="text-gray-700 mb-4">
          The first run will build the backend and frontend images, which takes a few minutes. Subsequent
          runs are cached and start in seconds. The PostgreSQL container automatically applies the initial
          schema on first boot via an init script.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Frontend API URL (build-time)</h3>
        <p className="text-gray-700 mb-4">
          The frontend uses Vite, which inlines API URLs at <strong>build time</strong>, not runtime. To point
          a self-hosted frontend at a non-default backend, you must pass build args when the image is built:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 space-y-1">
          <div className="text-gray-400"># In docker-compose.yml under frontend.build.args</div>
          <div>args:</div>
          <div className="pl-2">VITE_API_BASE_URL: https://api.your-instance.com</div>
          <div className="pl-2">VITE_WS_URL: wss://api.your-instance.com</div>
        </div>
        <p className="text-gray-700 mb-4">
          Then rebuild with <code className="bg-gray-100 px-1 rounded">docker compose build --no-cache frontend</code>{" "}
          and <code className="bg-gray-100 px-1 rounded">docker compose up -d frontend</code>.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Updating</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-1">
          <div className="text-gray-400"># Pull new code, rebuild, restart</div>
          <div>git pull</div>
          <div>docker compose build</div>
          <div>docker compose up -d</div>
        </div>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-6 rounded-r-lg">
          <p className="text-cyan-800">
            See <Link to="/docs/environment-variables" className="underline">Environment Variables</Link> for
            the full list of configuration options.
          </p>
        </div>
      </div>
    )
  },
  "environment-variables": {
    title: "Environment Variables",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-gray-700 leading-relaxed">
          The backend reads configuration from <code className="bg-gray-100 px-1 rounded">backend/.env</code>.
          Copy <code className="bg-gray-100 px-1 rounded">backend/.env.example</code> as a starting point and
          fill in the values below.
        </p>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Required Secrets</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">JWT_SECRET</span>
            <span className="text-gray-600 text-right">Signing key for auth tokens. Generate with <code>openssl rand -hex 64</code></span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">CONNECTOR_ENCRYPTION_KEY</span>
            <span className="text-gray-600 text-right">Encrypts stored connector credentials. Generate with <code>openssl rand -hex 32</code></span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">SESSION_SECRET</span>
            <span className="text-gray-600 text-right">Signing key for sessions</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Server</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PORT</span>
            <span className="text-gray-600 text-right">Backend port (default: <strong>5005</strong>)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">NODE_ENV</span>
            <span className="text-gray-600 text-right">development | production</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">LOG_LEVEL</span>
            <span className="text-gray-600 text-right">debug | info | warn | error</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">FRONTEND_URL</span>
            <span className="text-gray-600 text-right">Frontend URL used for CORS, email links, and OAuth callbacks (default: http://localhost:5185)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">APP_URL</span>
            <span className="text-gray-600 text-right">Public URL of the backend (default: http://localhost:5005)</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">PostgreSQL</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PLATFORM_DB_HOST</span>
            <span className="text-gray-600 text-right">Hostname (default: localhost)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PLATFORM_DB_PORT</span>
            <span className="text-gray-600 text-right">Port (default: 5432)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PLATFORM_DB_NAME</span>
            <span className="text-gray-600 text-right">Database name (default: fluxturn_platform)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PLATFORM_DB_USER</span>
            <span className="text-gray-600 text-right">Database user</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">PLATFORM_DB_PASSWORD</span>
            <span className="text-gray-600 text-right">Database password</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Redis & Qdrant</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">REDIS_HOST</span>
            <span className="text-gray-600 text-right">Redis hostname</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">REDIS_PORT</span>
            <span className="text-gray-600 text-right">Redis port (default: 6379)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">QDRANT_HOST</span>
            <span className="text-gray-600 text-right">Qdrant hostname</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">QDRANT_PORT</span>
            <span className="text-gray-600 text-right">Qdrant HTTP port (default: 6333)</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Email (SMTP)</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">MAIL_HOST</span>
            <span className="text-gray-600 text-right">SMTP server hostname</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">MAIL_PORT</span>
            <span className="text-gray-600 text-right">SMTP port (587 for STARTTLS, 465 for TLS)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">MAIL_USERNAME / MAIL_PASSWORD</span>
            <span className="text-gray-600 text-right">SMTP credentials</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">EMAIL_DEFAULT_FROM</span>
            <span className="text-gray-600 text-right">Default sender address (e.g. noreply@yourdomain.com)</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Frontend (Vite — build time)</h3>
        <p className="text-gray-700 mb-2">
          These are read by the frontend's Vite build at <strong>build time</strong>, not runtime. Set them in{" "}
          <code className="bg-gray-100 px-1 rounded">frontend/.env</code> for local dev, or as build args in
          <code className="bg-gray-100 px-1 rounded"> docker-compose.yml</code> for the docker frontend.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">VITE_API_BASE_URL</span>
            <span className="text-gray-600 text-right">Backend base URL (default: http://localhost:5005)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-cyan-600 whitespace-nowrap">VITE_WS_URL</span>
            <span className="text-gray-600 text-right">WebSocket URL (default: ws://localhost:5005)</span>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-6 rounded-r-lg">
          <p className="text-yellow-800">
            <strong>Security:</strong> Never commit <code>.env</code> files. They're already in <code>.gitignore</code> —
            keep it that way. Use a secrets manager (Vault, AWS Secrets Manager, Doppler, etc.) for production deployments.
          </p>
        </div>

        <div className="bg-cyan-50 border-l-4 border-cyan-500 p-4 mt-4 rounded-r-lg">
          <p className="text-cyan-800">
            See <code>backend/.env.example</code> in the repository for the complete list of variables, including
            optional ones for AWS, Cloudflare R2, AI providers, OAuth integrations, and Stripe billing.
          </p>
        </div>
      </div>
    )
  }
};

export function Docs() {
  const { slug } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(["Getting Started"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSlug = slug || "introduction";
  const currentContent = docsContent[currentSlug] || docsContent.introduction;

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${currentContent.title} - Documentation`}
        description="Comprehensive FluxTurn documentation. Learn how to build workflows, integrate apps, use custom code, and deploy on cloud or self-hosted infrastructure."
        canonical={`/docs${currentSlug !== 'introduction' ? `/${currentSlug}` : ''}`}
      />
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FluxTurn Docs</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="pl-10 pr-4 py-2 w-80 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
              />
            </div>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-72 bg-white border-r border-gray-200 overflow-y-auto
          transform transition-transform duration-300 z-30
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <nav className="p-6 space-y-6">
            {docsNavigation.map((section, idx) => (
              <div key={idx}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full text-left font-semibold text-gray-900 hover:text-cyan-600 transition-colors mb-3"
                >
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <span>{section.title}</span>
                  </div>
                  {expandedSections.includes(section.title) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {expandedSections.includes(section.title) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 ml-6"
                  >
                    {section.children.map((child, childIdx) => (
                      <Link
                        key={childIdx}
                        to={`/docs/${child.slug}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`block py-2 px-3 rounded-lg text-sm transition-colors ${
                          currentSlug === child.slug
                            ? "bg-cyan-50 text-cyan-600 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <motion.article
              key={currentSlug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                <Link to="/docs" className="hover:text-cyan-600">Docs</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-gray-900">{currentContent.title}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                {currentContent.title}
              </h1>

              {/* Content */}
              <div className="prose prose-lg max-w-none">
                {currentContent.content}
              </div>

              {/* Footer Navigation */}
              <div className="flex items-center justify-between mt-16 pt-8 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Previous</p>
                  <Link to="/docs/introduction" className="text-cyan-600 hover:underline font-medium">
                    Introduction
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-2">Next</p>
                  <Link to="/docs/quick-start" className="text-cyan-600 hover:underline font-medium">
                    Quick Start
                  </Link>
                </div>
              </div>
            </motion.article>
          </div>
        </main>
      </div>
    </div>
  );
}
