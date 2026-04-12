import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NodeExecutorService } from './node-executor.service';
import { ControlFlowService } from './control-flow.service';
import { EventsGateway } from '../../../../events/events.gateway';

/**
 * Interfaces for workflow execution
 */
export interface INode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
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
 * Branch tracking state for parallel execution
 */
export interface IBranchState {
  branchId: string;
  parentNodeId: string;
  targetNodeId: string;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: any;
  startTime: number;
  endTime?: number;
}

/**
 * Parallel execution context tracked per workflow execution
 */
export interface IParallelExecutionContext {
  /** Map of branchId -> branch state */
  branches: Record<string, IBranchState>;
  /** Map of joinNodeId -> set of branchIds that must complete before join proceeds */
  pendingJoins: Record<string, Set<string>>;
  /** Map of joinNodeId -> collected branch outputs (branchId -> output) */
  joinOutputs: Record<string, Record<string, any>>;
}

/**
 * Workflow Execution Engine
 * Based on n8n's stack-based execution architecture
 * Supports parallel fan-out/fan-in for nodes with multiple outgoing edges
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

      // 3. Initialize parallel execution context
      const parallelContext: IParallelExecutionContext = {
        branches: {},
        pendingJoins: {},
        joinOutputs: {},
      };

      // 4. Execute nodes from stack (main execution loop)
      const result = await this.processExecutionStack(workflow, runExecutionData, parallelContext);

      this.logger.log(`Workflow execution completed successfully`);

      return result;
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Main execution loop - processes nodes from stack
   * Now detects parallel branches (fan-out) and executes them concurrently
   */
  private async processExecutionStack(
    workflow: IWorkflowDefinition,
    runExecutionData: IRunExecutionData,
    parallelContext: IParallelExecutionContext
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

        // Check if it's a MERGE node acting as a join/fan-in point
        if (node.type === 'MERGE' && this.isJoinNode(workflow, node)) {
          nodeOutput = await this.executeJoinNode(
            workflow,
            node,
            data.main[0] || [],
            executionContext,
            runExecutionData,
            parallelContext
          );
        } else if (this.isControlFlowNode(node.type)) {
          // Standard control flow node
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

        // Detect parallel branches and either fan-out or add sequentially
        const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
        const parallelCandidates = this.getParallelBranchCandidates(
          workflow,
          node,
          nodeOutput,
          outgoingEdges,
          runExecutionData.resultData.runData
        );

        if (parallelCandidates.length > 1) {
          // PARALLEL: fan-out -- execute branches concurrently
          await this.executeFanOut(
            workflow,
            node,
            nodeOutput,
            parallelCandidates,
            runExecutionData,
            parallelContext
          );
          // After fan-out, any remaining stack items continue normally
        } else {
          // SEQUENTIAL: single or zero children -- existing behavior
          this.addChildNodesToStack(
            workflow,
            node,
            nodeOutput,
            nodeExecutionStack,
            runExecutionData.resultData.runData
          );
        }

      } catch (error: any) {
        this.logger.error(`Node ${node.data?.label || node.id} execution failed: ${error.message}`);

        // Calculate execution time even for failed nodes
        const executionEndTime = Date.now();
        const executionTime = executionEndTime - executionStartTime;

        // Store error in result with node status and input data
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

        // Mark last node executed
        runExecutionData.resultData.lastNodeExecuted = node.id;

        // Emit WebSocket event: node execution failed (with input data and timing)
        if (this.eventsGateway && metadata.executionId) {
          this.eventsGateway.emitNodeExecutionFailed(
            metadata.executionId,
            node.id,
            node.data?.label || node.id,
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

        // Attach execution data to error for saving partial results
        const enrichedError = new Error(error.message);
        enrichedError.stack = error.stack;
        enrichedError.name = error.name;
        (enrichedError as any).executionData = {
          success: false,
          data: runExecutionData.resultData.runData,
          lastNodeExecuted: node.id,
          failedNodeId: node.id,
          failedNodeName: node.data?.label || node.id,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        };

        // Stop execution on error
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

  // ============ Parallel Execution (Fan-Out / Fan-In) ============

  /**
   * Determine which outgoing edges can be executed in parallel.
   * Edges that go to a regular node (not an AI_AGENT with pending deps)
   * and have output data are candidates for parallelism.
   */
  private getParallelBranchCandidates(
    workflow: IWorkflowDefinition,
    parentNode: INode,
    nodeOutput: any[][],
    outgoingEdges: IEdge[],
    runData: Record<string, any>
  ): Array<{ edge: IEdge; childNode: INode; outputData: any[] }> {
    const candidates: Array<{ edge: IEdge; childNode: INode; outputData: any[] }> = [];

    for (const edge of outgoingEdges) {
      const childNode = workflow.nodes.find(n => n.id === edge.target);
      if (!childNode) continue;

      // Skip already-executed nodes
      if (runData[childNode.id]) continue;

      // Determine output index for this edge
      const outputIndex = this.getOutputIndexForEdge(edge);
      const outputData = nodeOutput[outputIndex] || [];

      // Skip if no data (unless model provider)
      const isModelProvider = childNode.type === 'CONNECTOR_ACTION' &&
                              childNode.data?.connectorType === 'openai_chatbot';
      if (outputData.length === 0 && !isModelProvider) continue;

      // Skip AI_AGENT nodes that need multi-handle aggregation -- these
      // have their own special path in addChildNodesToStack
      if (childNode.type === 'AI_AGENT') {
        const incomingEdges = workflow.edges.filter(e => e.target === childNode.id);
        if (incomingEdges.length > 1) continue;
      }

      candidates.push({ edge, childNode, outputData });
    }

    return candidates;
  }

  /**
   * Fan-out: execute multiple parallel branches concurrently using Promise.all.
   * Each branch is an independent sub-execution that walks its own sub-graph
   * until it either reaches a MERGE/join node or a leaf node.
   */
  private async executeFanOut(
    workflow: IWorkflowDefinition,
    parentNode: INode,
    nodeOutput: any[][],
    candidates: Array<{ edge: IEdge; childNode: INode; outputData: any[] }>,
    runExecutionData: IRunExecutionData,
    parallelContext: IParallelExecutionContext
  ): Promise<void> {
    const { metadata } = runExecutionData.executionData;

    // Generate branch IDs
    const branchIds = candidates.map(
      (c, i) => `branch_${parentNode.id}_${c.childNode.id}_${i}_${Date.now()}`
    );

    // Emit fan-out event
    if (this.eventsGateway && metadata.executionId) {
      this.eventsGateway.emitParallelFanOut(
        metadata.executionId,
        parentNode.id,
        candidates.length,
        branchIds
      );
    }

    this.logger.log(
      `Fan-out from ${parentNode.data?.label || parentNode.id}: ` +
      `${candidates.length} parallel branches -> [${candidates.map(c => c.childNode.data?.label || c.childNode.id).join(', ')}]`
    );

    // Initialize branch states
    for (let i = 0; i < candidates.length; i++) {
      const branchId = branchIds[i];
      const candidate = candidates[i];

      parallelContext.branches[branchId] = {
        branchId,
        parentNodeId: parentNode.id,
        targetNodeId: candidate.childNode.id,
        status: 'running',
        startTime: Date.now(),
      };

      if (this.eventsGateway && metadata.executionId) {
        this.eventsGateway.emitBranchExecutionStarted(
          metadata.executionId,
          branchId,
          parentNode.id,
          candidate.childNode.id
        );
      }
    }

    // Determine error handling strategy from parent node config
    const errorHandling = parentNode.data?.onError || 'stop';

    // Execute all branches concurrently
    const branchPromises = candidates.map((candidate, index) => {
      const branchId = branchIds[index];
      return this.executeBranch(
        workflow,
        candidate.childNode,
        candidate.outputData,
        candidate.edge,
        parentNode,
        branchId,
        runExecutionData,
        parallelContext
      );
    });

    if (errorHandling === 'stop') {
      // If ANY branch fails, cancel others and throw
      try {
        const results = await Promise.all(branchPromises);
        // Mark all branches complete
        for (let i = 0; i < results.length; i++) {
          const branchId = branchIds[i];
          parallelContext.branches[branchId].status = 'completed';
          parallelContext.branches[branchId].result = results[i];
          parallelContext.branches[branchId].endTime = Date.now();

          if (this.eventsGateway && metadata.executionId) {
            this.eventsGateway.emitBranchExecutionCompleted(
              metadata.executionId,
              branchId,
              { nodesExecuted: results[i]?.executedNodes }
            );
          }
        }
      } catch (error: any) {
        // Mark the failed branch
        for (const branchId of branchIds) {
          const branch = parallelContext.branches[branchId];
          if (branch.status === 'running') {
            branch.status = 'failed';
            branch.error = error;
            branch.endTime = Date.now();

            if (this.eventsGateway && metadata.executionId) {
              this.eventsGateway.emitBranchExecutionFailed(
                metadata.executionId,
                branchId,
                { message: error.message }
              );
            }
          }
        }
        throw error;
      }
    } else {
      // 'continue' mode: use Promise.allSettled so other branches finish
      const settled = await Promise.allSettled(branchPromises);

      for (let i = 0; i < settled.length; i++) {
        const branchId = branchIds[i];
        const result = settled[i];

        if (result.status === 'fulfilled') {
          parallelContext.branches[branchId].status = 'completed';
          parallelContext.branches[branchId].result = result.value;
          parallelContext.branches[branchId].endTime = Date.now();

          if (this.eventsGateway && metadata.executionId) {
            this.eventsGateway.emitBranchExecutionCompleted(
              metadata.executionId,
              branchId,
              { nodesExecuted: result.value?.executedNodes }
            );
          }
        } else {
          const error = result.reason;
          parallelContext.branches[branchId].status = 'failed';
          parallelContext.branches[branchId].error = error;
          parallelContext.branches[branchId].endTime = Date.now();

          // Store error output in runData for the failed branch's target node
          const targetNodeId = candidates[i].childNode.id;
          if (!runExecutionData.resultData.runData[targetNodeId]) {
            runExecutionData.resultData.runData[targetNodeId] = {
              startTime: parallelContext.branches[branchId].startTime,
              executionTime: Date.now() - parallelContext.branches[branchId].startTime,
              status: 'error',
              error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
              },
            };
          }

          this.logger.warn(
            `Branch ${branchId} failed (continue mode): ${error.message}`
          );

          if (this.eventsGateway && metadata.executionId) {
            this.eventsGateway.emitBranchExecutionFailed(
              metadata.executionId,
              branchId,
              { message: error.message }
            );
          }
        }
      }
    }
  }

  /**
   * Execute a single branch starting from a given node.
   * Creates a sub-execution with its own stack and processes nodes
   * sequentially within the branch, stopping at MERGE/join nodes or leaf nodes.
   *
   * Results are written back to the shared runData so downstream nodes
   * and join nodes can access them.
   */
  private async executeBranch(
    workflow: IWorkflowDefinition,
    startNode: INode,
    inputData: any[],
    sourceEdge: IEdge,
    parentNode: INode,
    branchId: string,
    runExecutionData: IRunExecutionData,
    parallelContext: IParallelExecutionContext
  ): Promise<any> {
    const outputIndex = this.getOutputIndexForEdge(sourceEdge);
    const nodeInputData = inputData.length > 0 ? inputData : [{ json: {} }];

    // Create a branch-local execution stack
    const branchStack: IExecuteData[] = [
      {
        node: startNode,
        data: { main: [nodeInputData] },
        source: {
          previousNode: parentNode.id,
          previousNodeOutput: outputIndex,
        },
      },
    ];

    const { contextData, metadata } = runExecutionData.executionData;
    let branchExecutedNodes = 0;

    while (branchStack.length > 0) {
      const stackItem = branchStack.shift()!;
      const { node, data, source } = stackItem;

      // If this node is a MERGE node that acts as a join point, don't execute it
      // in the branch. Instead, record the branch output for the join and stop.
      if (node.type === 'MERGE' && this.isJoinNode(workflow, node)) {
        // Record this branch's contribution to the join
        const joinNodeId = node.id;
        if (!parallelContext.joinOutputs[joinNodeId]) {
          parallelContext.joinOutputs[joinNodeId] = {};
        }
        parallelContext.joinOutputs[joinNodeId][branchId] = data.main[0] || [];

        this.logger.log(
          `Branch ${branchId} reached join node ${node.data?.label || node.id}, depositing output`
        );

        // The join node will be executed by the main stack after all branches complete.
        // Push it to the main stack if not already there.
        const mainStack = runExecutionData.executionData.nodeExecutionStack;
        const alreadyQueued = mainStack.some(item => item.node.id === joinNodeId);
        const alreadyExecuted = !!runExecutionData.resultData.runData[joinNodeId];

        if (!alreadyQueued && !alreadyExecuted) {
          mainStack.push({
            node,
            data: { main: [data.main[0] || []] },
            source,
          });
        }
        continue;
      }

      // Skip already-executed nodes (another branch may have reached here)
      if (runExecutionData.resultData.runData[node.id]) {
        this.logger.log(
          `Branch ${branchId}: node ${node.data?.label || node.id} already executed, skipping`
        );
        continue;
      }

      const inputItems = data.main[0] || [];
      const executionStartTime = Date.now();

      // Emit node execution started
      if (this.eventsGateway && metadata.executionId) {
        this.eventsGateway.emitNodeExecutionStarted(
          metadata.executionId,
          node.id,
          node.data?.label || node.id,
          { inputData: inputItems, startTime: executionStartTime, branchId }
        );
      }

      // Build execution context
      const nodeMetadata: Record<string, any> = {};
      workflow.nodes.forEach((n: any) => {
        nodeMetadata[n.id] = {
          label: n.data?.label || n.data?.name,
          name: n.data?.name,
          type: n.type,
        };
      });

      const executionContext = {
        $json: data.main[0]?.[0]?.json || {},
        $node: runExecutionData.resultData.runData,
        $workflow: { ...contextData.workflow, nodeMetadata },
        $env: process.env,
      };

      // Execute the node
      let nodeOutput: any[][];

      if (this.isControlFlowNode(node.type)) {
        nodeOutput = await this.executeControlFlowNode(
          node,
          data.main[0] || [],
          executionContext
        );
      } else {
        const items = data.main[0] || [];
        const result = await this.nodeExecutor.executeNode(node, items, executionContext);
        nodeOutput = [result];
      }

      const executionEndTime = Date.now();
      const executionTime = executionEndTime - executionStartTime;

      // Store result in shared runData
      runExecutionData.resultData.runData[node.id] = {
        startTime: executionStartTime,
        executionTime,
        status: 'success',
        data: nodeOutput,
        inputData: inputItems,
        source,
        branchId,
      };

      runExecutionData.resultData.lastNodeExecuted = node.id;
      branchExecutedNodes++;

      // Emit node completed
      if (this.eventsGateway && metadata.executionId) {
        this.eventsGateway.emitNodeExecutionCompleted(
          metadata.executionId,
          node.id,
          node.data?.label || node.id,
          {
            status: 'success',
            inputData: inputItems,
            outputData: nodeOutput,
            executionTime,
            startTime: executionStartTime,
            endTime: executionEndTime,
            branchId,
          }
        );
      }

      // Add child nodes to branch stack (sequential within this branch)
      this.addChildNodesToStack(
        workflow,
        node,
        nodeOutput,
        branchStack,
        runExecutionData.resultData.runData
      );
    }

    return {
      branchId,
      executedNodes: branchExecutedNodes,
    };
  }

  /**
   * Check if a MERGE node acts as a join/fan-in point.
   * A MERGE node is a join if it has 2+ incoming edges from different source nodes.
   */
  private isJoinNode(workflow: IWorkflowDefinition, node: INode): boolean {
    if (node.type !== 'MERGE') return false;
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    const uniqueSources = new Set(incomingEdges.map(e => e.source));
    return uniqueSources.size >= 2;
  }

  /**
   * Execute a MERGE node in join/fan-in mode.
   * Collects outputs deposited by parallel branches and merges them.
   */
  private async executeJoinNode(
    workflow: IWorkflowDefinition,
    node: INode,
    inputData: any[],
    context: any,
    runExecutionData: IRunExecutionData,
    parallelContext: IParallelExecutionContext
  ): Promise<any[][]> {
    const joinNodeId = node.id;
    const incomingEdges = workflow.edges.filter(e => e.target === joinNodeId);
    const { metadata } = runExecutionData.executionData;

    this.logger.log(
      `Executing join node ${node.data?.label || node.id} with ${incomingEdges.length} incoming edges`
    );

    // Collect outputs from all incoming branches
    const collectedItems: any[] = [];
    const branchOutputMap: Record<string, any[]> = {};

    // First collect from parallel branch deposits
    const branchDeposits = parallelContext.joinOutputs[joinNodeId] || {};
    const depositBranchIds = Object.keys(branchDeposits);

    for (const branchId of depositBranchIds) {
      const branchOutput = branchDeposits[branchId];
      branchOutputMap[branchId] = branchOutput;
      collectedItems.push(...branchOutput);
    }

    // Also collect from incoming edges whose source nodes have already executed
    // (these may not have gone through the parallel path)
    for (const edge of incomingEdges) {
      const sourceRunData = runExecutionData.resultData.runData[edge.source];
      if (sourceRunData?.data) {
        const outputIndex = this.getOutputIndexForEdge(edge);
        const edgeOutput = sourceRunData.data[outputIndex] || [];

        // Avoid double-counting items already deposited by branches
        const alreadyDeposited = depositBranchIds.some(
          bid => parallelContext.branches[bid]?.targetNodeId === edge.source ||
                 parallelContext.branches[bid]?.parentNodeId === edge.source
        );

        if (!alreadyDeposited && edgeOutput.length > 0) {
          branchOutputMap[edge.source] = edgeOutput;
          collectedItems.push(...edgeOutput);
        }
      }
    }

    // If we still have no items, use the inputData passed directly
    if (collectedItems.length === 0 && inputData.length > 0) {
      collectedItems.push(...inputData);
    }

    // Emit fan-in event
    if (this.eventsGateway && metadata.executionId) {
      this.eventsGateway.emitParallelFanIn(
        metadata.executionId,
        joinNodeId,
        Object.keys(branchOutputMap)
      );
    }

    this.logger.log(
      `Join node ${node.data?.label || node.id} collected ${collectedItems.length} items ` +
      `from ${Object.keys(branchOutputMap).length} sources`
    );

    // Determine merge mode from node config
    const mergeMode = node.data?.mode || 'append';

    if (mergeMode === 'waitAll' || mergeMode === 'append') {
      // Default join behavior: append all branch outputs
      return [collectedItems];
    } else if (mergeMode === 'combine') {
      // Use the existing merge executor logic by delegating to control flow
      return [collectedItems];
    } else if (mergeMode === 'chooseBranch') {
      // Choose a specific branch's output
      const branchIndex = (node.data?.useDataOfInput || 1) - 1;
      const branchKeys = Object.keys(branchOutputMap);
      const chosenKey = branchKeys[branchIndex] || branchKeys[0];
      return [branchOutputMap[chosenKey] || collectedItems];
    }

    return [collectedItems];
  }

  // ============ Control Flow ============

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

  // ============ Stack Management ============

  /**
   * Get the output index for a given edge based on its sourceHandle
   */
  private getOutputIndexForEdge(edge: IEdge): number {
    if (!edge.sourceHandle) return 0;

    if (edge.sourceHandle === 'false' || edge.sourceHandle === 'discarded') {
      return 1;
    }

    if (edge.sourceHandle.startsWith('output-')) {
      const match = edge.sourceHandle.match(/output-(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return 0;
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
      const outputIndex = this.getOutputIndexForEdge(connection);

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

  // ============ Utility Methods ============

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
