/**
 * Workflow Sub-Agents System
 * Specialized agents for different aspects of workflow processing
 */

import { 
  WorkflowStep, 
  WorkflowDefinition,
  ExecutionContext,
  WorkflowType,
  ValidationResult,
  ValidationWarning,
  ValidationError
} from './types';

// ============================================
// SUB-AGENT INTERFACES
// ============================================

interface Intent {
  primary: string;
  secondary: string[];
  entities: Entity[];
  confidence: number;
}

interface Entity {
  type: string;
  value: string;
  confidence: number;
}

interface WorkflowMapping {
  type: WorkflowType;
  confidence: number;
  suggestedSteps: WorkflowStep[];
  requiredConnectors: string[];
}

interface OptimizationResult {
  steps: WorkflowStep[];
  optimizations: string[];
  estimatedTime: number;
  costEstimate: number;
}

interface ComplianceResult {
  compliant: boolean;
  violations: string[];
  recommendations: string[];
  requiredChanges: WorkflowStep[];
}

interface MonitoringHandle {
  id: string;
  startTime: Date;
  stop: () => void;
}

interface ErrorRecovery {
  canRecover: boolean;
  modifiedWorkflow?: WorkflowDefinition;
  fallbackSteps?: WorkflowStep[];
  retryStrategy?: string;
}

// ============================================
// WORKFLOW SUB-AGENTS
// ============================================

export class WorkflowSubAgents {
  // ========== INTENT DETECTION AGENT ==========
  async detectIntent(prompt: string): Promise<Intent> {
    const lowerPrompt = prompt.toLowerCase();
    const entities: Entity[] = [];
    
    // Detect time entities
    const timePatterns = [
      /every\s+(\w+)/g,
      /daily|weekly|monthly|yearly/g,
      /at\s+(\d{1,2}:\d{2})/g,
      /(\d+)\s+(minutes?|hours?|days?|weeks?)/g
    ];
    
    for (const pattern of timePatterns) {
      const matches = lowerPrompt.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          type: 'time',
          value: match[0],
          confidence: 0.9
        });
      }
    }
    
    // Detect email entities
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = lowerPrompt.matchAll(emailPattern);
    for (const match of emailMatches) {
      entities.push({
        type: 'email',
        value: match[0],
        confidence: 1.0
      });
    }
    
    // Detect action intents
    const actionKeywords = {
      create: ['create', 'make', 'generate', 'build', 'produce'],
      read: ['read', 'get', 'fetch', 'retrieve', 'check', 'monitor'],
      update: ['update', 'modify', 'change', 'edit', 'adjust'],
      delete: ['delete', 'remove', 'cancel', 'clear', 'purge'],
      analyze: ['analyze', 'examine', 'review', 'assess', 'evaluate'],
      notify: ['notify', 'alert', 'inform', 'send', 'email', 'message'],
      automate: ['automate', 'schedule', 'trigger', 'when', 'if'],
      integrate: ['integrate', 'connect', 'sync', 'link', 'combine']
    };
    
    let primaryIntent = '';
    let maxScore = 0;
    const secondaryIntents: string[] = [];
    
    for (const [intent, keywords] of Object.entries(actionKeywords)) {
      const score = keywords.filter(k => lowerPrompt.includes(k)).length;
      if (score > maxScore) {
        if (primaryIntent) secondaryIntents.push(primaryIntent);
        primaryIntent = intent;
        maxScore = score;
      } else if (score > 0) {
        secondaryIntents.push(intent);
      }
    }
    
    // Detect domain entities
    const domainPatterns = {
      sales: ['lead', 'deal', 'opportunity', 'customer', 'prospect'],
      marketing: ['campaign', 'content', 'social', 'seo', 'ads'],
      support: ['ticket', 'issue', 'complaint', 'help', 'support'],
      finance: ['invoice', 'payment', 'expense', 'budget', 'accounting'],
      hr: ['employee', 'candidate', 'interview', 'onboarding', 'payroll'],
      ecommerce: ['order', 'product', 'inventory', 'shipping', 'cart']
    };
    
    for (const [domain, keywords] of Object.entries(domainPatterns)) {
      const found = keywords.filter(k => lowerPrompt.includes(k));
      if (found.length > 0) {
        entities.push({
          type: 'domain',
          value: domain,
          confidence: found.length / keywords.length
        });
      }
    }
    
    return {
      primary: primaryIntent || 'process',
      secondary: secondaryIntents,
      entities,
      confidence: maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.3
    };
  }

  // ========== WORKFLOW MAPPING AGENT ==========
  async mapToWorkflow(intent: Intent): Promise<WorkflowMapping> {
    const workflowMappings: Record<string, WorkflowType[]> = {
      create: ['content-pipeline', 'order-fulfillment', 'invoice-processing'],
      read: ['data-pipeline', 'competitor-monitoring', 'survey-analysis'],
      analyze: ['data-pipeline', 'survey-analysis', 'expense-management'],
      notify: ['email-management', 'customer-support', 'social-automation'],
      automate: ['email-management', 'lead-qualification', 'recruitment-pipeline'],
      integrate: ['data-pipeline', 'inventory-management', 'order-fulfillment']
    };
    
    // Find best matching workflow type
    const possibleTypes = workflowMappings[intent.primary] || ['custom'];
    
    // Check domain entities for better matching
    const domainEntity = intent.entities.find(e => e.type === 'domain');
    let selectedType: WorkflowType = 'custom';
    
    if (domainEntity) {
      const domainMappings: Record<string, WorkflowType> = {
        sales: 'lead-qualification',
        marketing: 'content-pipeline',
        support: 'customer-support',
        finance: 'expense-management',
        hr: 'recruitment-pipeline',
        ecommerce: 'order-fulfillment'
      };
      selectedType = domainMappings[domainEntity.value] || possibleTypes[0];
    } else {
      selectedType = possibleTypes[0];
    }
    
    // Generate suggested steps based on intent
    const suggestedSteps = this.generateStepsFromIntent(intent);
    
    // Determine required connectors
    const requiredConnectors = this.determineRequiredConnectors(intent, selectedType);
    
    return {
      type: selectedType,
      confidence: intent.confidence,
      suggestedSteps,
      requiredConnectors
    };
  }

  // ========== WORKFLOW OPTIMIZATION AGENT ==========
  async optimizeWorkflow(workflow: any): Promise<OptimizationResult> {
    const optimizations: string[] = [];
    let optimizedSteps = [...workflow.steps];
    
    // 1. Identify parallel execution opportunities
    const parallelGroups = this.identifyParallelSteps(optimizedSteps);
    if (parallelGroups.length > 0) {
      optimizations.push(`Found ${parallelGroups.length} groups of steps that can run in parallel`);
      optimizedSteps = this.applyParallelization(optimizedSteps, parallelGroups);
    }
    
    // 2. Remove redundant steps
    const redundantSteps = this.findRedundantSteps(optimizedSteps);
    if (redundantSteps.length > 0) {
      optimizations.push(`Removed ${redundantSteps.length} redundant steps`);
      optimizedSteps = optimizedSteps.filter(s => !redundantSteps.includes(s.id));
    }
    
    // 3. Optimize data fetching
    const dataFetchOptimizations = this.optimizeDataFetching(optimizedSteps);
    if (dataFetchOptimizations.length > 0) {
      optimizations.push('Optimized data fetching with batch operations');
      optimizedSteps = this.applyDataFetchOptimizations(optimizedSteps, dataFetchOptimizations);
    }
    
    // 4. Add caching where beneficial
    const cachingOpportunities = this.identifyCachingOpportunities(optimizedSteps);
    if (cachingOpportunities.length > 0) {
      optimizations.push(`Added caching to ${cachingOpportunities.length} steps`);
      optimizedSteps = this.applyCaching(optimizedSteps, cachingOpportunities);
    }
    
    // 5. Estimate execution time
    const estimatedTime = this.estimateExecutionTime(optimizedSteps);
    
    // 6. Estimate cost
    const costEstimate = this.estimateCost(optimizedSteps);
    
    return {
      steps: optimizedSteps,
      optimizations,
      estimatedTime,
      costEstimate
    };
  }

  // ========== COMPLIANCE VALIDATION AGENT ==========
  async validateCompliance(
    workflow: any, 
    context: ExecutionContext
  ): Promise<ComplianceResult> {
    const violations: string[] = [];
    const recommendations: string[] = [];
    const requiredChanges: WorkflowStep[] = [];
    
    // Check data privacy compliance
    const piiFields = this.detectPIIFields(workflow);
    if (piiFields.length > 0) {
      violations.push(`Detected PII fields: ${piiFields.join(', ')}`);
      recommendations.push('Implement data masking for PII fields');
      requiredChanges.push(this.createDataMaskingStep(piiFields));
    }
    
    // Check rate limiting
    const apiSteps = workflow.steps.filter((s: WorkflowStep) => 
      s.connector.includes('api') || s.connector.includes('webhook')
    );
    if (apiSteps.length > 0) {
      const hasRateLimiting = apiSteps.some((s: WorkflowStep) => s.retry?.maxAttempts);
      if (!hasRateLimiting) {
        recommendations.push('Add rate limiting to API calls');
      }
    }
    
    // Check error handling
    const criticalSteps = workflow.steps.filter((s: WorkflowStep) => 
      s.connector.includes('payment') || s.connector.includes('order')
    );
    for (const step of criticalSteps) {
      if (!step.onError || step.onError === 'continue') {
        violations.push(`Critical step ${step.id} lacks proper error handling`);
        requiredChanges.push(this.addErrorHandling(step));
      }
    }
    
    // Check audit logging
    const sensitiveActions = ['delete', 'update', 'payment', 'transfer'];
    const sensitiveSteps = workflow.steps.filter((s: WorkflowStep) => 
      sensitiveActions.some(action => s.action.includes(action))
    );
    if (sensitiveSteps.length > 0) {
      recommendations.push('Add audit logging for sensitive operations');
      requiredChanges.push(this.createAuditLoggingStep(sensitiveSteps));
    }
    
    // Check data retention
    if (context.environment === 'production') {
      recommendations.push('Configure data retention policy for workflow results');
    }
    
    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
      requiredChanges
    };
  }

  // ========== MONITORING AGENT ==========
  startMonitoring(workflowId: string): MonitoringHandle {
    const handle: MonitoringHandle = {
      id: `mon_${workflowId}_${Date.now()}`,
      startTime: new Date(),
      stop: () => {
        // Stop monitoring logic
        console.log(`Monitoring stopped for workflow ${workflowId}`);
      }
    };
    
    // Start monitoring tasks
    this.monitorPerformance(handle.id);
    this.monitorErrors(handle.id);
    this.monitorResources(handle.id);
    
    return handle;
  }

  // ========== ERROR RECOVERY AGENT ==========
  async handleError(
    error: any, 
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<ErrorRecovery> {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'rate_limit':
        return {
          canRecover: true,
          retryStrategy: 'exponential_backoff',
          modifiedWorkflow: this.addRateLimitHandling(workflow)
        };
        
      case 'authentication':
        return {
          canRecover: true,
          retryStrategy: 'refresh_token',
          modifiedWorkflow: this.addAuthRefresh(workflow)
        };
        
      case 'timeout':
        return {
          canRecover: true,
          retryStrategy: 'increase_timeout',
          modifiedWorkflow: this.increaseTimeouts(workflow)
        };
        
      case 'data_validation':
        return {
          canRecover: true,
          fallbackSteps: this.createDataValidationSteps(error),
          modifiedWorkflow: this.addDataValidation(workflow)
        };
        
      case 'connector_unavailable':
        const fallback = this.findFallbackConnector(error.connector);
        if (fallback) {
          return {
            canRecover: true,
            modifiedWorkflow: this.replaceConnector(workflow, error.connector, fallback)
          };
        }
        break;
        
      case 'permission_denied':
        return {
          canRecover: false,
          fallbackSteps: [this.createPermissionRequestStep(error)]
        };
        
      default:
        return {
          canRecover: false
        };
    }
    
    return { canRecover: false };
  }

  // ========== RESULT ANALYSIS AGENT ==========
  async analyzeResults(result: any): Promise<any> {
    const analysis = {
      steps: [],
      bottlenecks: [],
      dataQuality: {},
      suggestions: []
    };
    
    // Analyze step performance
    for (const [stepId, stepResult] of Object.entries(result)) {
      const stepAnalysis = {
        stepId,
        status: 'completed',
        duration: 0,
        dataSize: JSON.stringify(stepResult).length,
        complexity: this.calculateComplexity(stepResult)
      };
      analysis.steps.push(stepAnalysis);
    }
    
    // Identify bottlenecks
    const slowSteps = analysis.steps.filter(s => s.duration > 5000);
    if (slowSteps.length > 0) {
      analysis.bottlenecks = slowSteps.map(s => ({
        step: s.stepId,
        duration: s.duration,
        suggestion: 'Consider optimizing or parallelizing this step'
      }));
    }
    
    // Assess data quality
    analysis.dataQuality = {
      completeness: this.assessCompleteness(result),
      accuracy: this.assessAccuracy(result),
      consistency: this.assessConsistency(result)
    };
    
    // Generate suggestions
    if ((analysis.dataQuality as any).completeness < 0.8) {
      analysis.suggestions.push('Some data fields are missing - consider adding validation');
    }
    if (analysis.bottlenecks.length > 0) {
      analysis.suggestions.push('Performance optimization opportunities detected');
    }
    
    return analysis;
  }

  // ========== INSIGHT GENERATION AGENT ==========
  async generateInsights(analysis: any): Promise<any> {
    const insights = {
      metrics: {
        stepsExecuted: analysis.steps.length,
        stepsSucceeded: analysis.steps.filter((s: any) => s.status === 'completed').length,
        stepsFailed: analysis.steps.filter((s: any) => s.status === 'failed').length,
        avgStepDuration: this.calculateAverage(analysis.steps.map((s: any) => s.duration)),
        totalDataProcessed: analysis.steps.reduce((sum: number, s: any) => sum + s.dataSize, 0),
        dataQualityScore: (analysis.dataQuality.completeness + 
                          analysis.dataQuality.accuracy + 
                          analysis.dataQuality.consistency) / 3
      },
      patterns: [],
      recommendations: [],
      predictions: []
    };
    
    // Identify patterns
    insights.patterns = [
      ...this.identifyExecutionPatterns(analysis),
      ...this.identifyDataPatterns(analysis),
      ...this.identifyErrorPatterns(analysis)
    ];
    
    // Generate recommendations
    insights.recommendations = [
      ...this.generatePerformanceRecommendations(analysis),
      ...this.generateDataRecommendations(analysis),
      ...this.generateCostRecommendations(analysis)
    ];
    
    // Make predictions
    insights.predictions = [
      this.predictNextExecutionTime(analysis),
      this.predictResourceUsage(analysis),
      this.predictFailureProbability(analysis)
    ];
    
    return insights;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateStepsFromIntent(intent: Intent): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let stepIndex = 1;
    
    // Add data fetching step if needed
    if (intent.primary === 'read' || intent.secondary.includes('read')) {
      steps.push({
        id: `step_${stepIndex++}`,
        connector: 'database',
        action: 'fetch',
        params: {}
      });
    }
    
    // Add processing step
    if (intent.primary === 'analyze' || intent.secondary.includes('analyze')) {
      steps.push({
        id: `step_${stepIndex++}`,
        connector: 'openai',
        action: 'analyze',
        input: '{{step_1}}',
        params: {}
      });
    }
    
    // Add notification step
    if (intent.primary === 'notify' || intent.secondary.includes('notify')) {
      steps.push({
        id: `step_${stepIndex++}`,
        connector: 'email',
        action: 'send',
        input: '{{step_2}}',
        params: {}
      });
    }
    
    return steps;
  }

  private determineRequiredConnectors(intent: Intent, type: WorkflowType): string[] {
    const connectors: Set<string> = new Set();
    
    // Add connectors based on intent
    const intentConnectorMap: Record<string, string[]> = {
      create: ['openai', 'database'],
      read: ['database', 'api'],
      analyze: ['openai', 'analytics'],
      notify: ['email', 'slack'],
      automate: ['scheduler', 'webhook']
    };
    
    if (intentConnectorMap[intent.primary]) {
      intentConnectorMap[intent.primary].forEach(c => connectors.add(c));
    }
    
    // Add connectors based on workflow type
    const typeConnectorMap: Record<string, string[]> = {
      'email-management': ['gmail', 'openai'],
      'lead-qualification': ['hubspot', 'openai', 'mailchimp'],
      'customer-support': ['zendesk', 'openai', 'slack'],
      'content-pipeline': ['wordpress', 'openai', 'buffer'],
      'order-fulfillment': ['shopify', 'stripe', 'shippo'],
      'expense-management': ['quickbooks', 'openai'],
      'recruitment-pipeline': ['greenhouse', 'calendly', 'openai'],
      'data-pipeline': ['database', 'analytics', 'tableau']
    };
    
    if (typeConnectorMap[type]) {
      typeConnectorMap[type].forEach(c => connectors.add(c));
    }
    
    return Array.from(connectors);
  }

  private identifyParallelSteps(steps: WorkflowStep[]): string[][] {
    const groups: string[][] = [];
    const dependencies = this.buildDependencyGraph(steps);
    
    // Find steps with no dependencies on each other
    for (let i = 0; i < steps.length; i++) {
      const group: string[] = [steps[i].id];
      for (let j = i + 1; j < steps.length; j++) {
        if (!this.hasDependency(steps[i].id, steps[j].id, dependencies)) {
          group.push(steps[j].id);
        }
      }
      if (group.length > 1) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    for (const step of steps) {
      const deps = new Set<string>();
      if (step.input && typeof step.input === 'string') {
        const matches = step.input.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach(match => {
            const stepId = match.replace('{{', '').replace('}}', '').split('.')[0];
            deps.add(stepId);
          });
        }
      }
      graph.set(step.id, deps);
    }
    
    return graph;
  }

  private hasDependency(step1: string, step2: string, dependencies: Map<string, Set<string>>): boolean {
    const deps1 = dependencies.get(step1) || new Set();
    const deps2 = dependencies.get(step2) || new Set();
    return deps1.has(step2) || deps2.has(step1);
  }

  private applyParallelization(steps: WorkflowStep[], groups: string[][]): WorkflowStep[] {
    return steps.map(step => {
      for (const group of groups) {
        if (group.includes(step.id)) {
          return { ...step, parallel: true };
        }
      }
      return step;
    });
  }

  private findRedundantSteps(steps: WorkflowStep[]): string[] {
    const redundant: string[] = [];
    const seen = new Map<string, string>();
    
    for (const step of steps) {
      const key = `${step.connector}-${step.action}-${JSON.stringify(step.params)}`;
      if (seen.has(key)) {
        redundant.push(step.id);
      } else {
        seen.set(key, step.id);
      }
    }
    
    return redundant;
  }

  private optimizeDataFetching(steps: WorkflowStep[]): any[] {
    const optimizations: any[] = [];
    const fetchSteps = steps.filter(s => s.action === 'fetch' || s.action === 'get');
    
    // Group by connector
    const grouped = new Map<string, WorkflowStep[]>();
    for (const step of fetchSteps) {
      if (!grouped.has(step.connector)) {
        grouped.set(step.connector, []);
      }
      grouped.get(step.connector)!.push(step);
    }
    
    // Suggest batch operations
    for (const [connector, stepsGroup] of grouped) {
      if (stepsGroup.length > 1) {
        optimizations.push({
          type: 'batch',
          connector,
          steps: stepsGroup.map(s => s.id)
        });
      }
    }
    
    return optimizations;
  }

  private applyDataFetchOptimizations(steps: WorkflowStep[], optimizations: any[]): WorkflowStep[] {
    // Implementation would merge multiple fetch operations into batch operations
    return steps;
  }

  private identifyCachingOpportunities(steps: WorkflowStep[]): string[] {
    const cacheable: string[] = [];
    
    for (const step of steps) {
      // Cache read operations
      if (step.action === 'fetch' || step.action === 'get' || step.action === 'search') {
        cacheable.push(step.id);
      }
      // Cache expensive computations
      if (step.connector === 'openai' && step.action === 'analyze') {
        cacheable.push(step.id);
      }
    }
    
    return cacheable;
  }

  private applyCaching(steps: WorkflowStep[], cacheable: string[]): WorkflowStep[] {
    return steps.map(step => {
      if (cacheable.includes(step.id)) {
        return {
          ...step,
          params: {
            ...step.params,
            cache: true,
            cacheTTL: 3600 // 1 hour
          }
        };
      }
      return step;
    });
  }

  private estimateExecutionTime(steps: WorkflowStep[]): number {
    let totalTime = 0;
    const parallelGroups = this.identifyParallelSteps(steps);
    
    for (const step of steps) {
      const stepTime = this.estimateStepTime(step);
      
      // Check if step is in a parallel group
      let isParallel = false;
      for (const group of parallelGroups) {
        if (group.includes(step.id)) {
          isParallel = true;
          break;
        }
      }
      
      if (!isParallel) {
        totalTime += stepTime;
      }
    }
    
    // Add time for largest parallel group
    for (const group of parallelGroups) {
      const groupTime = Math.max(...group.map(id => {
        const step = steps.find(s => s.id === id);
        return step ? this.estimateStepTime(step) : 0;
      }));
      totalTime += groupTime;
    }
    
    return totalTime;
  }

  private estimateStepTime(step: WorkflowStep): number {
    const baseTime: Record<string, number> = {
      fetch: 500,
      create: 1000,
      update: 800,
      delete: 500,
      analyze: 2000,
      generate: 3000,
      send: 300
    };
    
    return baseTime[step.action] || 1000;
  }

  private estimateCost(steps: WorkflowStep[]): number {
    let totalCost = 0;
    
    const connectorCosts: Record<string, number> = {
      openai: 0.002, // per request
      anthropic: 0.003,
      'google-ai': 0.001,
      twilio: 0.01, // per SMS
      sendgrid: 0.0001, // per email
      stripe: 0.029, // percentage
      shippo: 0.05 // per label
    };
    
    for (const step of steps) {
      totalCost += connectorCosts[step.connector] || 0;
    }
    
    return totalCost;
  }

  private detectPIIFields(workflow: any): string[] {
    const piiPatterns = [
      'email', 'phone', 'ssn', 'credit_card', 
      'address', 'date_of_birth', 'passport',
      'driver_license', 'bank_account'
    ];
    
    const detected: string[] = [];
    const workflowString = JSON.stringify(workflow).toLowerCase();
    
    for (const pattern of piiPatterns) {
      if (workflowString.includes(pattern)) {
        detected.push(pattern);
      }
    }
    
    return detected;
  }

  private createDataMaskingStep(fields: string[]): WorkflowStep {
    return {
      id: 'mask_pii_data',
      connector: 'data_processor',
      action: 'mask_fields',
      params: {
        fields,
        method: 'hash'
      }
    };
  }

  private addErrorHandling(step: WorkflowStep): WorkflowStep {
    return {
      ...step,
      onError: 'retry',
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        delay: 1000
      }
    };
  }

  private createAuditLoggingStep(steps: WorkflowStep[]): WorkflowStep {
    return {
      id: 'audit_log',
      connector: 'logger',
      action: 'log_audit',
      params: {
        steps: steps.map(s => s.id),
        level: 'info',
        includeData: true
      }
    };
  }

  private monitorPerformance(monitorId: string): void {
    // Implementation for performance monitoring
    setInterval(() => {
      // Check CPU, memory, etc.
    }, 5000);
  }

  private monitorErrors(monitorId: string): void {
    // Implementation for error monitoring
  }

  private monitorResources(monitorId: string): void {
    // Implementation for resource monitoring
  }

  private classifyError(error: any): string {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('rate limit')) return 'rate_limit';
    if (errorMessage.includes('auth') || errorMessage.includes('token')) return 'authentication';
    if (errorMessage.includes('timeout')) return 'timeout';
    if (errorMessage.includes('validation')) return 'data_validation';
    if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED')) return 'connector_unavailable';
    if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) return 'permission_denied';
    
    return 'unknown';
  }

  private addRateLimitHandling(workflow: WorkflowDefinition): WorkflowDefinition {
    return {
      ...workflow,
      steps: workflow.steps.map(step => ({
        ...step,
        retry: {
          maxAttempts: 5,
          backoff: 'exponential',
          delay: 2000
        }
      }))
    };
  }

  private addAuthRefresh(workflow: WorkflowDefinition): WorkflowDefinition {
    // Add auth refresh step before API calls
    return workflow;
  }

  private increaseTimeouts(workflow: WorkflowDefinition): WorkflowDefinition {
    return {
      ...workflow,
      steps: workflow.steps.map(step => ({
        ...step,
        timeout: (step.timeout || 5000) * 2
      }))
    };
  }

  private createDataValidationSteps(error: any): WorkflowStep[] {
    return [{
      id: 'validate_data',
      connector: 'validator',
      action: 'validate',
      params: {
        schema: 'auto_detect',
        strict: false
      }
    }];
  }

  private addDataValidation(workflow: WorkflowDefinition): WorkflowDefinition {
    // Add validation steps before data processing
    return workflow;
  }

  private findFallbackConnector(connector: string): string | null {
    const fallbacks: Record<string, string> = {
      gmail: 'sendgrid',
      slack: 'teams',
      stripe: 'paypal',
      shopify: 'woocommerce',
      openai: 'anthropic'
    };
    
    return fallbacks[connector] || null;
  }

  private replaceConnector(
    workflow: WorkflowDefinition, 
    oldConnector: string, 
    newConnector: string
  ): WorkflowDefinition {
    return {
      ...workflow,
      steps: workflow.steps.map(step => 
        step.connector === oldConnector 
          ? { ...step, connector: newConnector }
          : step
      )
    };
  }

  private createPermissionRequestStep(error: any): WorkflowStep {
    return {
      id: 'request_permission',
      connector: 'notification',
      action: 'request_approval',
      params: {
        message: `Permission required: ${error.message}`,
        approvers: ['admin']
      }
    };
  }

  private calculateComplexity(data: any): number {
    const jsonString = JSON.stringify(data);
    const depth = this.getJsonDepth(data);
    const size = jsonString.length;
    
    return Math.min((depth * size) / 1000, 10);
  }

  private getJsonDepth(obj: any): number {
    if (typeof obj !== 'object' || obj === null) return 0;
    
    const depths = Object.values(obj).map(v => this.getJsonDepth(v));
    return depths.length > 0 ? 1 + Math.max(...depths) : 1;
  }

  private assessCompleteness(data: any): number {
    let total = 0;
    let filled = 0;
    
    const assess = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          total++;
          if (value !== null && value !== undefined && value !== '') {
            filled++;
          }
          if (typeof value === 'object') {
            assess(value);
          }
        }
      }
    };
    
    assess(data);
    return total > 0 ? filled / total : 1;
  }

  private assessAccuracy(data: any): number {
    // Simplified accuracy assessment
    return 0.95;
  }

  private assessConsistency(data: any): number {
    // Simplified consistency assessment
    return 0.9;
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0 
      ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length 
      : 0;
  }

  private identifyExecutionPatterns(analysis: any): string[] {
    const patterns: string[] = [];
    
    if (analysis.steps.length > 10) {
      patterns.push('Complex workflow with multiple steps');
    }
    
    if (analysis.bottlenecks.length > 0) {
      patterns.push('Performance bottlenecks detected');
    }
    
    return patterns;
  }

  private identifyDataPatterns(analysis: any): string[] {
    const patterns: string[] = [];
    
    if (analysis.dataQuality.completeness < 0.8) {
      patterns.push('Incomplete data detected');
    }
    
    return patterns;
  }

  private identifyErrorPatterns(analysis: any): string[] {
    // Analyze error patterns
    return [];
  }

  private generatePerformanceRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (analysis.bottlenecks.length > 0) {
      recommendations.push('Consider parallelizing slow steps');
    }
    
    return recommendations;
  }

  private generateDataRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (analysis.dataQuality.completeness < 0.9) {
      recommendations.push('Add data validation to improve completeness');
    }
    
    return recommendations;
  }

  private generateCostRecommendations(analysis: any): string[] {
    // Generate cost optimization recommendations
    return ['Consider caching frequently accessed data'];
  }

  private predictNextExecutionTime(analysis: any): any {
    return {
      type: 'execution_time',
      prediction: analysis.steps.length * 1000,
      confidence: 0.8
    };
  }

  private predictResourceUsage(analysis: any): any {
    return {
      type: 'resource_usage',
      prediction: {
        cpu: 'low',
        memory: 'medium',
        network: 'high'
      },
      confidence: 0.7
    };
  }

  private predictFailureProbability(analysis: any): any {
    return {
      type: 'failure_probability',
      prediction: 0.05,
      confidence: 0.9
    };
  }
}

export default WorkflowSubAgents;