/**
 * Hybrid Workflow Orchestrator
 * Combines keyword-based and AI-powered workflow generation
 * Uses confidence scoring to determine the best approach
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  WorkflowDefinition,
  ExecutionContext,
  WorkflowStep
} from './types';
import { IntelligentWorkflowBuilder } from './intelligent-builder';
import { LangChainWorkflowBuilder } from './langchain-workflow-builder';
import { WorkflowChainBuilder } from './workflow-config';
import { WorkflowSubAgents } from './sub-agents';

// ============================================
// WORKFLOW GENERATION STRATEGY
// ============================================

export enum GenerationStrategy {
  KEYWORD_ONLY = 'keyword_only',
  AI_ONLY = 'ai_only',
  HYBRID = 'hybrid',
  FALLBACK = 'fallback'
}

export interface GenerationResult {
  strategy: GenerationStrategy;
  workflow: WorkflowDefinition;
  confidence: number;
  keywordConfidence?: number;
  aiConfidence?: number;
  analysis: {
    keywordAnalysis?: any;
    aiAnalysis?: any;
    hybridAnalysis?: any;
  };
  executionPath: string[];
  recommendations: string[];
}

export interface HybridConfig {
  minKeywordConfidence: number;
  minAiConfidence: number;
  preferAiThreshold: number;
  enableFallback: boolean;
  maxRetries: number;
  strategy: GenerationStrategy;
}

// ============================================
// HYBRID WORKFLOW ORCHESTRATOR
// ============================================

@Injectable()
export class HybridWorkflowOrchestrator {
  private readonly logger = new Logger(HybridWorkflowOrchestrator.name);
  private keywordBuilder: IntelligentWorkflowBuilder;
  private aiBuilder: LangChainWorkflowBuilder | null = null;
  private subAgents: WorkflowSubAgents;
  private config: HybridConfig = {
    minKeywordConfidence: 60,
    minAiConfidence: 70,
    preferAiThreshold: 85,
    enableFallback: true,
    maxRetries: 2,
    strategy: GenerationStrategy.AI_ONLY
  };

  constructor(
    private availableConnectors: string[],
    private openAiApiKey?: string
  ) {
    this.keywordBuilder = new IntelligentWorkflowBuilder(availableConnectors);
    this.subAgents = new WorkflowSubAgents();
    
    if (openAiApiKey) {
      this.aiBuilder = new LangChainWorkflowBuilder(openAiApiKey, availableConnectors);
      this.logger.log('AI-powered workflow generation enabled');
    } else {
      this.logger.warn('OpenAI API key not provided - AI generation disabled');
    }
  }

  /**
   * Generate workflow using hybrid approach
   */
  async generateWorkflow(
    prompt: string,
    context?: ExecutionContext,
    customConfig?: Partial<HybridConfig>
  ): Promise<GenerationResult> {
    const config = { ...this.config, ...customConfig };
    const executionPath: string[] = [];
    const recommendations: string[] = [];
    
    this.logger.log(`Generating workflow with strategy: ${config.strategy}`);
    executionPath.push(`Starting with strategy: ${config.strategy}`);

    try {
      switch (config.strategy) {
        case GenerationStrategy.KEYWORD_ONLY:
          return await this.generateKeywordOnly(prompt, context, executionPath, recommendations);
          
        case GenerationStrategy.AI_ONLY:
          return await this.generateAiOnly(prompt, context, executionPath, recommendations);
          
        case GenerationStrategy.HYBRID:
          return await this.generateHybrid(prompt, context, config, executionPath, recommendations);
          
        case GenerationStrategy.FALLBACK:
          return await this.generateWithFallback(prompt, context, config, executionPath, recommendations);
          
        default:
          return await this.generateHybrid(prompt, context, config, executionPath, recommendations);
      }
    } catch (error) {
      this.logger.error('Error generating workflow:', error);
      executionPath.push(`Error: ${error}`);
      
      // Last resort - return a basic workflow
      return this.createFallbackResult(prompt, context, executionPath, recommendations);
    }
  }

  /**
   * Generate using keyword-based approach only
   */
  private async generateKeywordOnly(
    prompt: string,
    context: ExecutionContext | undefined,
    executionPath: string[],
    recommendations: string[]
  ): Promise<GenerationResult> {
    executionPath.push('Using keyword-based generation');
    
    const workflow = this.keywordBuilder.buildWorkflow(prompt, context);
    const confidence = this.calculateKeywordConfidence(workflow);
    
    if (confidence < this.config.minKeywordConfidence) {
      recommendations.push('Consider using AI-powered generation for better results');
    }
    
    return {
      strategy: GenerationStrategy.KEYWORD_ONLY,
      workflow,
      confidence,
      keywordConfidence: confidence,
      analysis: {
        keywordAnalysis: {
          stepsGenerated: workflow.steps.length,
          triggersDetected: workflow.triggers.length,
          conditionsFound: workflow.conditions.length
        }
      },
      executionPath,
      recommendations
    };
  }

  /**
   * Generate using AI-powered approach only
   */
  private async generateAiOnly(
    prompt: string,
    context: ExecutionContext | undefined,
    executionPath: string[],
    recommendations: string[]
  ): Promise<GenerationResult> {
    if (!this.aiBuilder) {
      executionPath.push('AI builder not available, falling back to keyword');
      return this.generateKeywordOnly(prompt, context, executionPath, recommendations);
    }
    
    executionPath.push('Using AI-powered generation');
    
    const result = await this.aiBuilder.generateWorkflow(prompt, context);
    
    if (result.confidence < this.config.minAiConfidence) {
      recommendations.push('AI confidence is low - review generated workflow carefully');
    }
    
    return {
      strategy: GenerationStrategy.AI_ONLY,
      workflow: result.workflow,
      confidence: result.confidence,
      aiConfidence: result.confidence,
      analysis: {
        aiAnalysis: result.analysis
      },
      executionPath,
      recommendations
    };
  }

  /**
   * Generate using hybrid approach - combine both methods
   */
  private async generateHybrid(
    prompt: string,
    context: ExecutionContext | undefined,
    config: HybridConfig,
    executionPath: string[],
    recommendations: string[]
  ): Promise<GenerationResult> {
    executionPath.push('Using hybrid generation approach');
    
    // Step 1: Generate with keyword-based approach
    executionPath.push('Step 1: Keyword-based generation');
    const keywordWorkflow = this.keywordBuilder.buildWorkflow(prompt, context);
    const keywordConfidence = this.calculateKeywordConfidence(keywordWorkflow);
    
    // Step 2: Generate with AI if available
    let aiResult = null;
    let aiConfidence = 0;
    
    if (this.aiBuilder) {
      executionPath.push('Step 2: AI-powered generation');
      try {
        aiResult = await this.aiBuilder.generateWorkflow(prompt, context);
        aiConfidence = aiResult.confidence;
      } catch (error) {
        executionPath.push(`AI generation failed: ${error}`);
        this.logger.warn('AI generation failed, using keyword-only result');
      }
    }
    
    // Step 3: Merge and optimize
    executionPath.push('Step 3: Merging and optimizing results');
    const mergedWorkflow = await this.mergeWorkflows(
      keywordWorkflow,
      aiResult?.workflow,
      keywordConfidence,
      aiConfidence,
      executionPath
    );
    
    // Step 4: Validate and enhance
    executionPath.push('Step 4: Validation and enhancement');
    const enhancedWorkflow = await this.enhanceWorkflow(mergedWorkflow, prompt, context);
    
    // Calculate final confidence
    const finalConfidence = this.calculateHybridConfidence(
      keywordConfidence,
      aiConfidence,
      enhancedWorkflow
    );
    
    // Generate recommendations
    if (keywordConfidence > aiConfidence && aiConfidence > 0) {
      recommendations.push('Keyword-based approach performed better for this prompt');
    } else if (aiConfidence > keywordConfidence && keywordConfidence > 0) {
      recommendations.push('AI-powered approach provided better understanding');
    }
    
    if (finalConfidence < 70) {
      recommendations.push('Consider providing more specific details in your prompt');
    }
    
    return {
      strategy: GenerationStrategy.HYBRID,
      workflow: enhancedWorkflow,
      confidence: finalConfidence,
      keywordConfidence,
      aiConfidence,
      analysis: {
        keywordAnalysis: {
          stepsGenerated: keywordWorkflow.steps.length,
          confidence: keywordConfidence
        },
        aiAnalysis: aiResult?.analysis,
        hybridAnalysis: {
          mergedSteps: enhancedWorkflow.steps.length,
          optimizations: executionPath.filter(p => p.includes('Optimized')).length
        }
      },
      executionPath,
      recommendations
    };
  }

  /**
   * Generate with automatic fallback strategy
   */
  private async generateWithFallback(
    prompt: string,
    context: ExecutionContext | undefined,
    config: HybridConfig,
    executionPath: string[],
    recommendations: string[]
  ): Promise<GenerationResult> {
    executionPath.push('Using fallback strategy');
    
    // Try AI first if confidence threshold suggests it
    if (this.aiBuilder && prompt.length > 50) {
      executionPath.push('Attempting AI generation first');
      try {
        const aiResult = await this.aiBuilder.generateWithConfidence(prompt, config.minAiConfidence);
        if (aiResult.success && aiResult.workflow) {
          executionPath.push(`AI generation successful with ${aiResult.confidence}% confidence`);
          return {
            strategy: GenerationStrategy.FALLBACK,
            workflow: aiResult.workflow,
            confidence: aiResult.confidence,
            aiConfidence: aiResult.confidence,
            analysis: { aiAnalysis: { success: true } },
            executionPath,
            recommendations
          };
        } else {
          executionPath.push(`AI generation failed: ${aiResult.errorMessage}`);
        }
      } catch (error) {
        executionPath.push(`AI generation error: ${error}`);
      }
    }
    
    // Check if we should completely fail instead of trying fallbacks
    if (executionPath.some(path => path.includes('AI generation failed'))) {
      // AI explicitly failed - don't try to generate something random
      throw new Error('Unable to understand your workflow request. Please provide a clearer description of what you want to automate, including specific triggers, actions, and the desired outcome.');
    }
    
    // Fallback to keyword-based
    executionPath.push('Falling back to keyword-based generation');
    const keywordResult = await this.generateKeywordOnly(prompt, context, executionPath, recommendations);
    
    if (keywordResult.confidence < config.minKeywordConfidence) {
      // Confidence too low - fail instead of generating nonsense
      throw new Error(`Workflow generation confidence too low (${keywordResult.confidence}%). Please provide a more detailed description including: 1) What triggers the workflow, 2) What actions should be performed, 3) What the expected outcome is.`);
    }
    
    return keywordResult;
  }

  /**
   * Merge workflows from different sources
   */
  private async mergeWorkflows(
    keywordWorkflow: WorkflowDefinition,
    aiWorkflow: WorkflowDefinition | undefined,
    keywordConfidence: number,
    aiConfidence: number,
    executionPath: string[]
  ): Promise<WorkflowDefinition> {
    if (!aiWorkflow) {
      return keywordWorkflow;
    }
    
    // Use the workflow with higher confidence as base
    const baseWorkflow = aiConfidence > keywordConfidence ? aiWorkflow : keywordWorkflow;
    const supplementWorkflow = aiConfidence > keywordConfidence ? keywordWorkflow : aiWorkflow;
    
    executionPath.push(`Using ${aiConfidence > keywordConfidence ? 'AI' : 'keyword'} workflow as base`);
    
    // Merge steps
    const mergedSteps = this.mergeSteps(baseWorkflow.steps, supplementWorkflow.steps);
    
    // Merge triggers
    const mergedTriggers = this.mergeTriggers(baseWorkflow.triggers, supplementWorkflow.triggers);
    
    // Merge conditions
    const mergedConditions = this.mergeConditions(baseWorkflow.conditions, supplementWorkflow.conditions);
    
    return {
      ...baseWorkflow,
      steps: mergedSteps,
      triggers: mergedTriggers,
      conditions: mergedConditions,
      metadata: {
        ...baseWorkflow.metadata,
        tags: [...(baseWorkflow.metadata.tags || []), 'hybrid-generated']
      }
    };
  }

  /**
   * Merge workflow steps intelligently
   */
  private mergeSteps(baseSteps: WorkflowStep[], supplementSteps: WorkflowStep[]): WorkflowStep[] {
    const merged: WorkflowStep[] = [...baseSteps];
    const baseConnectorActions = new Set(
      baseSteps.map(s => `${s.connector}-${s.action}`)
    );
    
    // Add unique steps from supplement
    for (const step of supplementSteps) {
      const key = `${step.connector}-${step.action}`;
      if (!baseConnectorActions.has(key)) {
        merged.push({
          ...step,
          id: `step_merged_${merged.length + 1}`
        });
      }
    }
    
    return merged;
  }

  /**
   * Merge workflow triggers
   */
  private mergeTriggers(baseTriggers: any[], supplementTriggers: any[]): any[] {
    const merged = [...baseTriggers];
    const baseTriggerTypes = new Set(baseTriggers.map(t => t.type));
    
    for (const trigger of supplementTriggers) {
      if (!baseTriggerTypes.has(trigger.type)) {
        merged.push(trigger);
      }
    }
    
    return merged;
  }

  /**
   * Merge workflow conditions
   */
  private mergeConditions(baseConditions: any[], supplementConditions: any[]): any[] {
    const merged = [...baseConditions];
    const baseConditionExpressions = new Set(baseConditions.map(c => c.expression));
    
    for (const condition of supplementConditions) {
      if (!baseConditionExpressions.has(condition.expression)) {
        merged.push(condition);
      }
    }
    
    return merged;
  }

  /**
   * Enhance workflow with additional optimizations
   */
  private async enhanceWorkflow(
    workflow: WorkflowDefinition,
    prompt: string,
    context?: ExecutionContext
  ): Promise<WorkflowDefinition> {
    // Use sub-agents for enhancement
    const optimized = await this.subAgents.optimizeWorkflow(workflow);
    
    // Validate compliance
    const compliance = await this.subAgents.validateCompliance(optimized, context || {
      workflowId: workflow.id,
      executionId: `exec_${Date.now()}`,
      userId: 'system',
      projectId: '',
      environment: 'development',
      variables: {},
      secrets: {},
      state: {
        currentStep: '',
        completedSteps: [],
        failedSteps: [],
        skippedSteps: [],
        data: {},
        checkpoints: []
      }
    });
    
    // Apply compliance recommendations
    if (compliance.requiredChanges && compliance.requiredChanges.length > 0) {
      optimized.steps.push(...compliance.requiredChanges);
    }
    
    return optimized as unknown as WorkflowDefinition;
  }

  /**
   * Calculate keyword-based confidence
   */
  private calculateKeywordConfidence(workflow: WorkflowDefinition): number {
    let score = 0;
    
    // Base score on number of steps
    if (workflow.steps.length > 0) score += 30;
    if (workflow.steps.length > 2) score += 20;
    
    // Score based on triggers
    if (workflow.triggers.length > 0) score += 20;
    
    // Score based on conditions
    if (workflow.conditions.length > 0) score += 15;
    
    // Score based on error handling
    const hasErrorHandling = workflow.steps.some(s => s.onError);
    if (hasErrorHandling) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * Calculate hybrid confidence score
   */
  private calculateHybridConfidence(
    keywordConfidence: number,
    aiConfidence: number,
    workflow: WorkflowDefinition
  ): number {
    // Weighted average with bonus for agreement
    let baseScore = 0;
    let weights = 0;
    
    if (keywordConfidence > 0) {
      baseScore += keywordConfidence * 0.4;
      weights += 0.4;
    }
    
    if (aiConfidence > 0) {
      baseScore += aiConfidence * 0.6;
      weights += 0.6;
    }
    
    if (weights === 0) return 50; // Default if no scores
    
    let finalScore = baseScore / weights;
    
    // Bonus if both methods agree (similar confidence)
    if (Math.abs(keywordConfidence - aiConfidence) < 10) {
      finalScore = Math.min(100, finalScore + 10);
    }
    
    // Penalty if workflow is too simple
    if (workflow.steps.length < 2) {
      finalScore = Math.max(0, finalScore - 20);
    }
    
    return Math.round(finalScore);
  }

  /**
   * Create fallback result when all else fails
   */
  private createFallbackResult(
    prompt: string,
    context: ExecutionContext | undefined,
    executionPath: string[],
    recommendations: string[]
  ): GenerationResult {
    executionPath.push('Creating minimal fallback workflow');
    recommendations.push('Workflow generation failed - created minimal workflow');
    recommendations.push('Please provide more specific details or try again');
    
    const fallbackWorkflow: WorkflowDefinition = {
      id: `wf_fallback_${Date.now()}`,
      name: 'Fallback Workflow',
      description: `Unable to fully parse: ${prompt.substring(0, 100)}...`,
      version: '1.0.0',
      type: 'custom',
      complexity: 'simple',
      triggers: [{
        type: 'manual'
      }],
      steps: [{
        id: 'step_1',
        connector: 'manual',
        action: 'review',
        params: {
          note: 'Manual review required - automated generation failed'
        }
      }],
      conditions: [],
      variables: [],
      outputs: [],
      permissions: {
        read: [context?.userId || 'system'],
        write: [context?.userId || 'system'],
        execute: [context?.userId || 'system'],
        delete: [context?.userId || 'system'],
        share: []
      },
      security: {
        encryption: true,
        audit: true,
        compliance: [],
        dataRetention: 30,
        pii_handling: {
          detection: true,
          masking: true,
          encryption: true,
          fields: []
        }
      },
      monitoring: {
        alerts: [],
        metrics: [],
        logs: {
          level: 'info',
          retention: 7,
          format: 'json'
        },
        tracing: true
      },
      metadata: {
        createdBy: context?.userId || 'system',
        createdAt: new Date(),
        tags: ['fallback'],
        category: 'error',
        useCases: []
      }
    };
    
    return {
      strategy: GenerationStrategy.FALLBACK,
      workflow: fallbackWorkflow,
      confidence: 10,
      analysis: {},
      executionPath,
      recommendations
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Configuration updated:', this.config);
  }
}

export default HybridWorkflowOrchestrator;