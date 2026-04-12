import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NodeExecutorService } from './node-executor.service';
import { ControlFlowService } from './control-flow.service';
import { EventsGateway } from '../../../../events/events.gateway';

/**
 * Retry configuration for a workflow node
 */
export interface IRetryConfig {
  /** Delay strategy: constant, exponential, or random jitter */
  strategy: 'constant' | 'exponential' | 'random';
  /** Maximum number of retry attempts (default 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default 1000) */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds (default 30000) */
  maxDelayMs: number;
}

/**
 * Interfaces for workflow execution
 */
export interface INode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    onError?: 'stop' | 'continue' | 'retry' | 'fallback';
    retryConfig?: Partial<IRetryConfig>;
    fallbackValue?: any;
    [key: string]: any;
  };
}

export interface IEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface IWorkflowDefinition {
  nodes: INode[];
  edges: IEdge[];
}

export interface IExecuteData {
  node: INode;
  data: {
    main: any[][];
  };
  source: {
    previousNode?: string;
    previousNodeOutput?: number;
  } | null;
}

export interface IRunExecutionData {
  startData: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: Record<string, any>;
    lastNodeExecuted?: string;
  };
  executionData: {
    nodeExecutionStack: IExecuteData[];
    waitingExecution: Record<string, any>;
    contextData: Record<string, any>;
    metadata: Record<string, any>;
  };
}

/**
 * Workflow Execution Engine
 * Based on n8n's stack-based execution architecture
 */
@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);

  constructor(
    private readonly nodeExecutor: NodeExecutorService,
    private readonly controlFlowService: ControlFlowService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway
  ) {}

  /**
   * Main execution method - executes a complete workflow
   */
  async executeWorkflow(
    workflow: IWorkflowDefinition,
    inputData: any = {},
    options: {
      startNodeId?: string;
      destinationNodeId?: string;
      mode?: 'manual' | 'production';
      executionId?: string;
    } = {}
  ): Promise<any> {
    this.logger.log(`Starting workflow execution with ${workflow.nodes.length} nodes`);

    try {
      // 1. Find start node (trigger or specified start node)
      const startNode = options.startNodeId
        ? workflow.nodes.find(n => n.id === options.startNodeId)
        : this.findTriggerNode(workflow.nodes);

      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      this.logger.log(`Start node: ${startNode.data?.label || startNode.id} (${startNode.type})`);

      // 2. Initialize execution data structure
      const runExecutionData: IRunExecutionData = {
        startData: {
          destinationNode: options.destinationNodeId,
          runNodeFilter: options.destinationNodeId
            ? this.getParentNodes(workflow, options.destinationNodeId)
            : undefined
        },
        resultData: {
          runData: {}
        },
        executionData: {
          nodeExecutionStack: [
            {
              node: startNode,
              data: {
                main: [[{ json: inputData }]]
              },
              source: null
            }
          ],
          waitingExecution: {},
          contextData: {
            workflow,
            inputData,
            executionId: options.executionId
          },
          metadata: {
            startedAt: new Date(),
            executionId: options.executionId,
            mode: options.mode || 'manual'
          }
        }
      };

      // 3. Execute nodes from stack (main execution loop)
      const result = await this.processExecutionStack(workflow, runExecutionData);

      this.logger.log(`Workflow execution completed successfully`);

      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main execution loop - processes nodes from stack
   */
  private async processExecutionStack(
    workflow: IWorkflowDefinition,
    runExecutionData: IRunExecutionData
  ): Promise<any> {
    const { nodeExecutionStack, contextData, metadata } = runExecutionData.executionData;
    const totalNodes = workflow.nodes.length;
    let executedNodesCount = 0;

    // Execute until stack is empty
    while (nodeExecutionStack.length > 0) {
      // Pop next node from stack
      const executionStackItem = nodeExecutionStack.shift()!;
      const { node, data, source } = executionStackItem;

      this.logger.log(
        `[${executedNodesCount + 1}/${totalNodes}] Executing: ${node.data?.label || node.id} (${node.type})`
      );

      // Capture input data and start time
      const inputItems = data.main[0] || [];
      const executionStartTime = Date.now();

      // Emit WebSocket event: node execution started (with input data)
      if (this.eventsGateway && metadata.executionId) {
        this.eventsGateway.emitNodeExecutionStarted(
          metadata.executionId,
          node.id,
          node.data?.label || node.id,
          {
            inputData: inputItems,
            startTime: executionStartTime
          }
        );
      }

      try {
        // Build node metadata map for label lookups
        const nodeMetadata: Record<string, any> = {};
        workflow.nodes.forEach((n: any) => {
          nodeMetadata[n.id] = {
            label: n.data?.label || n.data?.name,
            name: n.data?.name,
            type: n.type
          };
        });

        // Build execution context for this node
        const executionContext = {
          $json: data.main[0]?.[0]?.json || {},
          $node: runExecutionData.resultData.runData,
          $workflow: {
            ...contextData.workflow,
            nodeMetadata
          },
          $env: process.env
        };

        // Execute the node
        let nodeOutput: any[][];

        // Check if it's a control flow node
        if (this.isControlFlowNode(node.type)) {
          nodeOutput = await this.executeControlFlowNode(
            node,
            data.main[0] || [],
            executionContext
          );
        } else {
          // Regular trigger/action node
          const items = data.main[0] || [];
          const result = await this.nodeExecutor.executeNode(node, items, executionContext);
          nodeOutput = [result];
        }

        // Calculate execution time
        const executionEndTime = Date.now();
        const executionTime = executionEndTime - executionStartTime;

        // Store execution result with input/output data and timing
        runExecutionData.resultData.runData[node.id] = {
          startTime: executionStartTime,
          executionTime: executionTime,
          status: 'success',
          data: nodeOutput,
          inputData: inputItems,
          source
        };

        runExecutionData.resultData.lastNodeExecuted = node.id;
        executedNodesCount++;

        // Emit WebSocket event: node execution completed (with input/output data)
        if (this.eventsGateway && metadata.executionId) {
          this.eventsGateway.emitNodeExecutionCompleted(
            metadata.executionId,
            node.id,
            node.data?.label || node.id,
            {
              status: 'success',
              inputData: inputItems,
              outputData: nodeOutput,
              executionTime: executionTime,
              startTime: executionStartTime,
              endTime: executionEndTime
            }
          );
        }

        // Add child nodes to stack based on node output
        this.addChildNodesToStack(
          workflow,
          node,
          nodeOutput,
          nodeExecutionStack,
          runExecutionData.resultData.runData
        );

      } catch (error: any) {
        const nodeLabel = node.data?.label || node.id;
        this.logger.error(`Node ${nodeLabel} execution failed: ${error.message}`);

        const onError: string = node.data?.onError || 'stop';

        // ---- Retry logic ----
        if (onError === 'retry') {
          const retryConfig = this.buildRetryConfig(node.data?.retryConfig);
          let lastError = error;
          let retrySuccess = false;

          for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
            const delay = this.calculateRetryDelay(attempt, retryConfig);
            this.logger.warn(
              `[Retry] Node ${nodeLabel}: attempt ${attempt}/${retryConfig.maxRetries} ` +
              `(strategy=${retryConfig.strategy}, delay=${Math.round(delay)}ms)`
            );

            // Emit retry event over WebSocket
            if (this.eventsGateway && metadata.executionId) {
              this.eventsGateway.emitNodeExecutionStarted(
                metadata.executionId,
                node.id,
                nodeLabel,
                {
                  inputData: inputItems,
                  startTime: Date.now(),
                  retryAttempt: attempt,
                  retryMaxAttempts: retryConfig.maxRetries,
                }
              );
            }

            await this.sleep(delay);

            try {
              let nodeOutput: any[][];

              if (this.isControlFlowNode(node.type)) {
                nodeOutput = await this.executeControlFlowNode(
                  node,
                  data.main[0] || [],
                  {
                    $json: data.main[0]?.[0]?.json || {},
                    $node: runExecutionData.resultData.runData,
                    $workflow: contextData.workflow,
                    $env: process.env,
                  },
                );
              } else {
                const items = data.main[0] || [];
                const result = await this.nodeExecutor.executeNode(node, items, {
                  $json: data.main[0]?.[0]?.json || {},
                  $node: runExecutionData.resultData.runData,
                  $workflow: contextData.workflow,
                  $env: process.env,
                });
                nodeOutput = [result];
              }

              // Retry succeeded
              const retryEndTime = Date.now();
              const totalTime = retryEndTime - executionStartTime;

              runExecutionData.resultData.runData[node.id] = {
                startTime: executionStartTime,
                executionTime: totalTime,
                status: 'success',
                data: nodeOutput,
                inputData: inputItems,
                source,
                retryAttempts: attempt,
              };

              runExecutionData.resultData.lastNodeExecuted = node.id;
              executedNodesCount++;

              if (this.eventsGateway && metadata.executionId) {
                this.eventsGateway.emitNodeExecutionCompleted(
                  metadata.executionId,
                  node.id,
                  nodeLabel,
                  {
                    status: 'success',
                    inputData: inputItems,
                    outputData: nodeOutput,
                    executionTime: totalTime,
                    startTime: executionStartTime,
                    endTime: retryEndTime,
                    retryAttempts: attempt,
                  }
                );
              }

              this.logger.log(
                `[Retry] Node ${nodeLabel} succeeded on attempt ${attempt}`
              );

              this.addChildNodesToStack(
                workflow,
                node,
                nodeOutput,
                nodeExecutionStack,
                runExecutionData.resultData.runData,
              );

              retrySuccess = true;
              break;
            } catch (retryError: any) {
              lastError = retryError;
              this.logger.warn(
                `[Retry] Node ${nodeLabel}: attempt ${attempt} failed: ${retryError.message}`
              );
            }
          }

          if (retrySuccess) {
            continue; // Move to next item in the execution stack
          }

          // All retries exhausted -- fall through to 'stop' behaviour
          this.logger.error(
            `[Retry] Node ${nodeLabel}: all ${retryConfig.maxRetries} retries exhausted`
          );
          error = lastError;
        }

        // ---- Continue mode: log error and keep going ----
        if (onError === 'continue') {
          const executionEndTime = Date.now();
          const executionTime = executionEndTime - executionStartTime;

          runExecutionData.resultData.runData[node.id] = {
            startTime: executionStartTime,
            executionTime,
            status: 'error',
            inputData: inputItems,
            error: { message: error.message, stack: error.stack, name: error.name },
            onError: 'continue',
          };

          runExecutionData.resultData.lastNodeExecuted = node.id;
          executedNodesCount++;

          if (this.eventsGateway && metadata.executionId) {
            this.eventsGateway.emitNodeExecutionFailed(
              metadata.executionId,
              node.id,
              nodeLabel,
              {
                message: error.message,
                stack: error.stack,
                name: error.name,
                inputData: inputItems,
                executionTime,
                startTime: executionStartTime,
                endTime: executionEndTime,
                onError: 'continue',
              }
            );
          }

          this.logger.warn(`Node ${nodeLabel} failed but onError=continue, proceeding`);

          // Push empty output to children so they still execute
          this.addChildNodesToStack(
            workflow,
            node,
            [[]], // empty output
            nodeExecutionStack,
            runExecutionData.resultData.runData,
          );

          continue;
        }

        // ---- Fallback mode: substitute fallback value and keep going ----
        if (onError === 'fallback') {
          const executionEndTime = Date.now();
          const executionTime = executionEndTime - executionStartTime;
          const fallbackValue = node.data?.fallbackValue ?? {};
          const fallbackOutput = [[{ json: fallbackValue }]];

          runExecutionData.resultData.runData[node.id] = {
            startTime: executionStartTime,
            executionTime,
            status: 'fallback',
            data: fallbackOutput,
            inputData: inputItems,
            error: { message: error.message, stack: error.stack, name: error.name },
            onError: 'fallback',
          };

          runExecutionData.resultData.lastNodeExecuted = node.id;
          executedNodesCount++;

          if (this.eventsGateway && metadata.executionId) {
            this.eventsGateway.emitNodeExecutionCompleted(
              metadata.executionId,
              node.id,
              nodeLabel,
              {
                status: 'fallback',
                inputData: inputItems,
                outputData: fallbackOutput,
                executionTime,
                startTime: executionStartTime,
                endTime: executionEndTime,
                onError: 'fallback',
              }
            );
          }

          this.logger.warn(
            `Node ${nodeLabel} failed but onError=fallback, using fallback value`
          );

          this.addChildNodesToStack(
            workflow,
            node,
            fallbackOutput,
            nodeExecutionStack,
            runExecutionData.resultData.runData,
          );

          continue;
        }

        // ---- Default / stop mode: halt the workflow ----
        const executionEndTime = Date.now();
        const executionTime = executionEndTime - executionStartTime;

        runExecutionData.resultData.runData[node.id] = {
          startTime: executionStartTime,
          executionTime: executionTime,
          status: 'error',
          inputData: inputItems,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        };

        runExecutionData.resultData.lastNodeExecuted = node.id;

        if (this.eventsGateway && metadata.executionId) {
          this.eventsGateway.emitNodeExecutionFailed(
            metadata.executionId,
            node.id,
            nodeLabel,
            {
              message: error.message,
              stack: error.stack,
              name: error.name,
              inputData: inputItems,
              executionTime: executionTime,
              startTime: executionStartTime,
              endTime: executionEndTime
            }
          );
        }

        const enrichedError = new Error(error.message);
        enrichedError.stack = error.stack;
        enrichedError.name = error.name;
        (enrichedError as any).executionData = {
          success: false,
          data: runExecutionData.resultData.runData,
          lastNodeExecuted: node.id,
          failedNodeId: node.id,
          failedNodeName: nodeLabel,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        };

        throw enrichedError;
      }
    }

    return {
      success: true,
      data: runExecutionData.resultData.runData,
      lastNodeExecuted: runExecutionData.resultData.lastNodeExecuted,
      executedNodes: executedNodesCount,
      totalNodes
    };
  }

  /**
   * Check if node is a control flow node
   */
  private isControlFlowNode(nodeType: string): boolean {
    return ['IF_CONDITION', 'SWITCH', 'FILTER', 'LOOP'].includes(nodeType);
  }

  /**
   * Execute control flow node
   */
  private async executeControlFlowNode(
    node: INode,
    items: any[],
    context: any
  ): Promise<any[][]> {
    const config = node.data;

    switch (node.type) {
      case 'IF_CONDITION': {
        if (!config.conditions) {
          // No conditions, route all to false
          return [[], items];
        }

        const result = await this.controlFlowService.executeIfNode(
          config as any, // Cast to bypass strict type checking for node data
          items.map(i => i.json || i)
        );

        // Return in format: [trueOutput, falseOutput]
        return [
          result.trueOutput.map(json => ({ json })),
          result.falseOutput.map(json => ({ json }))
        ];
      }

      case 'SWITCH': {
        if (!config.rules && !config.expression) {
          return [items]; // Pass through
        }

        const result = await this.controlFlowService.executeSwitchNode(
          config as any, // Cast to bypass strict type checking for node data
          items.map(i => i.json || i)
        );

        // Convert outputs to array format
        return Object.values(result.outputs).map((outputItems: any) =>
          outputItems.map((json: any) => ({ json }))
        );
      }

      case 'FILTER': {
        if (!config.conditions) {
          return [items]; // Pass through
        }

        const result = await this.controlFlowService.executeFilterNode(
          config as any, // Cast to bypass strict type checking for node data
          items.map(i => i.json || i)
        );

        // Return in format: [kept, discarded]
        return [
          result.kept.map(json => ({ json })),
          result.discarded.map(json => ({ json }))
        ];
      }

      case 'LOOP': {
        if (!config.items) {
          return [items];
        }

        // Execute loop via node executor to split array into individual items
        const result = await this.nodeExecutor.executeNode(
          node,
          items,
          context
        );

        // Return as single output (all split items)
        return [result];
      }

      default:
        return [items];
    }
  }

  /**
   * Add child nodes to execution stack
   */
  private addChildNodesToStack(
    workflow: IWorkflowDefinition,
    parentNode: INode,
    nodeOutput: any[][],
    executionStack: IExecuteData[],
    runData: Record<string, any>
  ): void {
    // Find all connections from this node
    const connections = workflow.edges.filter(e => e.source === parentNode.id);

    if (connections.length === 0) {
      this.logger.log(`Node ${parentNode.data?.label || parentNode.id} has no outgoing connections`);
      return;
    }

    for (const connection of connections) {
      const childNode = workflow.nodes.find(n => n.id === connection.target);

      if (!childNode) {
        this.logger.warn(`Target node ${connection.target} not found`);
        continue;
      }

      // Determine which output to use based on connection handle
      let outputIndex = 0;

      // Handle control flow node outputs
      if (connection.sourceHandle) {
        if (connection.sourceHandle === 'false' || connection.sourceHandle === 'discarded') {
          outputIndex = 1;
        } else if (connection.sourceHandle.startsWith('output-')) {
          // Extract index from "output-0", "output-1", etc.
          const match = connection.sourceHandle.match(/output-(\d+)/);
          if (match) {
            outputIndex = parseInt(match[1]);
          }
        }
      }

      // Get data for this output
      const outputData = nodeOutput[outputIndex] || [];

      // Skip if this node already executed
      if (runData[childNode.id]) {
        this.logger.log(`Node ${childNode.data?.label || childNode.id} already executed, skipping`);
        continue;
      }

      // Skip if no data to pass (except for model provider nodes)
      const isModelProvider = childNode.type === 'CONNECTOR_ACTION' &&
                              childNode.data?.connectorType === 'openai_chatbot';

      if (outputData.length === 0 && !isModelProvider) {
        this.logger.log(
          `No data from output ${outputIndex} of ${parentNode.data?.label || parentNode.id}, skipping child node`
        );
        continue;
      }

      // Model provider nodes can execute with empty input - they generate their own config
      const nodeInputData = outputData.length > 0 ? outputData : [{ json: {} }];

      // Check if this is a multi-handle node (AI_AGENT)
      this.logger.log(`[DEBUG] Processing child node: ${childNode.data?.label || childNode.id} (${childNode.type})`);
      if (childNode.type === 'AI_AGENT') {
        this.logger.log(`[DEBUG] AI_AGENT detected, checking inputs...`);
        // For AI Agent, check if all required incoming connections are satisfied
        const incomingEdges = workflow.edges.filter(e => e.target === childNode.id);
        const executedSourceNodes = incomingEdges.filter(edge => runData[edge.source]);

        this.logger.log(
          `AI Agent ${childNode.data?.label || childNode.id}: ${executedSourceNodes.length}/${incomingEdges.length} inputs ready`
        );
        this.logger.log(
          `Incoming edges: ${incomingEdges.map(e => `${e.source} (${e.sourceHandle || 'default'}) -> ${e.targetHandle || 'default'}`).join(', ')}`
        );
        this.logger.log(
          `Executed sources: ${executedSourceNodes.map(e => e.source).join(', ')}`
        );

        if (executedSourceNodes.length < incomingEdges.length) {
          // Not all inputs ready yet - check if we can execute missing nodes
          const missingEdges = incomingEdges.filter(edge => !runData[edge.source]);

          for (const missingEdge of missingEdges) {
            const missingNode = workflow.nodes.find(n => n.id === missingEdge.source);
            if (!missingNode) continue;

            // Check if this missing node can be executed (has no incoming edges, or they're all satisfied)
            const missingNodeIncomingEdges = workflow.edges.filter(e => e.target === missingNode.id);
            const canExecute = missingNodeIncomingEdges.length === 0 ||
                              missingNodeIncomingEdges.every(e => runData[e.source]);

            if (canExecute && !executionStack.find(item => item.node.id === missingNode.id)) {
              // This is a model provider or other standalone node - add it to stack
              this.logger.log(
                `Adding standalone node ${missingNode.data?.label || missingNode.id} to stack (required by AI Agent)`
              );

              // Prepare input data for the node
              let nodeInput: any[] = [{ json: {} }];

              // If it has incoming edges, collect their data
              if (missingNodeIncomingEdges.length > 0) {
                nodeInput = [];
                for (const inEdge of missingNodeIncomingEdges) {
                  const inData = runData[inEdge.source]?.data?.[0] || [];
                  nodeInput.push(...inData);
                }
                if (nodeInput.length === 0) {
                  nodeInput = [{ json: {} }];
                }
              }

              executionStack.unshift({
                node: missingNode,
                data: {
                  main: [nodeInput]
                },
                source: null
              });
            }
          }

          const stillMissingNodes = missingEdges
            .filter(edge => !runData[edge.source])
            .map(edge => {
              const node = workflow.nodes.find(n => n.id === edge.source);
              return node?.data?.label || edge.source;
            });

          if (stillMissingNodes.length > 0) {
            this.logger.log(
              `AI Agent ${childNode.data?.label || childNode.id} still waiting for: ${stillMissingNodes.join(', ')}`
            );
          }

          continue;
        }

        // All inputs ready, prepare combined data for AI Agent
        const combinedData = this.prepareAIAgentInput(childNode, incomingEdges, runData, workflow);

        this.logger.log(
          `Adding AI Agent to stack with combined inputs from ${incomingEdges.length} source(s)`
        );
        this.logger.log(`Combined data: ${JSON.stringify(combinedData, null, 2)}`);

        executionStack.push({
          node: childNode,
          data: {
            main: [combinedData]
          },
          source: {
            previousNode: parentNode.id,
            previousNodeOutput: outputIndex
          }
        });
      } else {
        // Regular node - add to stack normally
        this.logger.log(
          `Adding to stack: ${childNode.data?.label || childNode.id} (${nodeInputData.length} items from output ${outputIndex})`
        );
        this.logger.log(`[DEBUG] Regular node path for: ${childNode.type}`);

        executionStack.push({
          node: childNode,
          data: {
            main: [nodeInputData]
          },
          source: {
            previousNode: parentNode.id,
            previousNodeOutput: outputIndex
          }
        });
      }
    }
  }

  /**
   * Prepare combined input data for AI Agent from multiple handles
   */
  private prepareAIAgentInput(
    agentNode: INode,
    incomingEdges: IEdge[],
    runData: Record<string, any>,
    workflow: IWorkflowDefinition
  ): any[] {
    const result: any = {
      json: {}
    };

    this.logger.log(`Preparing AI Agent input from ${incomingEdges.length} sources`);

    for (const edge of incomingEdges) {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      const sourceLabel = sourceNode?.data?.label || edge.source;
      const sourceData = runData[edge.source];

      this.logger.log(`Processing edge from ${sourceLabel} (${edge.source}) -> ${edge.targetHandle || 'main'}`);

      if (!sourceData || !sourceData.data) {
        this.logger.warn(`No data from source: ${sourceLabel}`);
        continue;
      }

      // Extract the output data from the source node
      const sourceOutput = sourceData.data[0]?.[0]?.json || {};
      this.logger.log(`Source output: ${JSON.stringify(sourceOutput).substring(0, 200)}...`);

      // Assign data based on target handle
      if (edge.targetHandle === 'chatModel') {
        // Model configuration from OpenAI Chat Model connector
        result.json.modelConfig = sourceOutput.modelConfig || sourceOutput;
        this.logger.log(`Assigned modelConfig from ${sourceLabel}`);
      } else if (edge.targetHandle === 'memory') {
        // Memory/conversation history
        result.json.memory = sourceOutput.memory || sourceOutput;
        this.logger.log(`Assigned memory from ${sourceLabel}`);
      } else if (edge.targetHandle === 'tools') {
        // Tools/functions - can be ToolProviderOutput or direct tool data
        // Support multiple tool sources by aggregating into an array
        const toolData = sourceOutput.isToolProvider ? sourceOutput : (sourceOutput.tools || sourceOutput);

        if (!result.json.tools) {
          result.json.tools = toolData;
        } else if (Array.isArray(result.json.tools)) {
          // Already an array, add this tool source
          result.json.tools.push(toolData);
        } else {
          // Convert to array to support multiple tool sources
          result.json.tools = [result.json.tools, toolData];
        }
        this.logger.log(`Assigned tools from ${sourceLabel} (isToolProvider: ${sourceOutput.isToolProvider || false})`);
      } else {
        // Main data input (default handle)
        Object.assign(result.json, sourceOutput);
        this.logger.log(`Assigned main data from ${sourceLabel}`);
      }
    }

    this.logger.log(`Final prepared data: ${JSON.stringify(result, null, 2)}`);
    return [result];
  }

  /**
   * Find trigger node in workflow
   */
  private findTriggerNode(nodes: INode[]): INode | undefined {
    return nodes.find(n =>
      n.type === 'MANUAL_TRIGGER' ||
      n.type === 'WEBHOOK_TRIGGER' ||
      n.type === 'SCHEDULE_TRIGGER' ||
      n.type === 'FORM_TRIGGER' ||
      n.type === 'CHAT_TRIGGER' ||
      n.type === 'CONNECTOR_TRIGGER' ||
      n.type === 'FACEBOOK_TRIGGER' ||
      n.type === 'GMAIL_TRIGGER'
    );
  }

  /**
   * Get all parent nodes of a destination node (for partial execution)
   */
  private getParentNodes(workflow: IWorkflowDefinition, nodeId: string): string[] {
    const parents: string[] = [];
    const visited = new Set<string>();

    const findParents = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const incomingConnections = workflow.edges.filter(e => e.target === currentNodeId);

      for (const connection of incomingConnections) {
        parents.push(connection.source);
        findParents(connection.source);
      }
    };

    findParents(nodeId);
    parents.push(nodeId); // Include destination node itself

    return parents;
  }

  /**
   * Calculate retry delay based on the configured strategy.
   */
  private calculateRetryDelay(attempt: number, config: IRetryConfig): number {
    let delay: number;

    switch (config.strategy) {
      case 'exponential':
        delay = Math.pow(2, attempt) * config.baseDelayMs;
        break;
      case 'random':
        // Jitter: random value between 0 and 2^attempt * baseDelay
        delay = Math.random() * Math.pow(2, attempt) * config.baseDelayMs;
        break;
      case 'constant':
      default:
        delay = config.baseDelayMs;
        break;
    }

    return Math.min(delay, config.maxDelayMs);
  }

  /**
   * Build a full IRetryConfig from partial node config with defaults.
   */
  private buildRetryConfig(partial?: Partial<IRetryConfig>): IRetryConfig {
    return {
      strategy: partial?.strategy ?? 'exponential',
      maxRetries: partial?.maxRetries ?? 3,
      baseDelayMs: partial?.baseDelayMs ?? 1000,
      maxDelayMs: partial?.maxDelayMs ?? 30000,
    };
  }

  /**
   * Sleep helper for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a single node for testing purposes
   * This allows testing individual nodes without running the entire workflow
   */
  async executeSingleNode(
    node: INode,
    testData: any = {},
    context: {
      $json?: any;
      $node?: Record<string, any>;
      $workflow?: Record<string, any>;
      $env?: Record<string, any>;
    } = {}
  ): Promise<any> {
    this.logger.log(`Executing single node: ${node.data?.label || node.id} (${node.type})`);

    try {
      // Prepare input data in n8n format
      const inputData = [{
        json: testData
      }];

      // Execute the node
      const result = await this.nodeExecutor.executeNode(node, inputData, context);

      this.logger.log(`Node executed successfully: ${node.id}`);

      return {
        success: true,
        output: result,
        executedAt: new Date().toISOString()
      };
    } catch (error: any) {
      this.logger.error(`Failed to execute node ${node.id}: ${error.message}`);
      throw error;
    }
  }
}
