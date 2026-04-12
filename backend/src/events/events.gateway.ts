import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../modules/auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connection', { message: 'Successfully connected to FluxTurn' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Workflow execution events
  emitWorkflowStarted(workflowId: string, executionId: string, data: any) {
    this.server.emit('workflow:started', {
      workflowId,
      executionId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkflowProgress(executionId: string, step: number, totalSteps: number, data: any) {
    this.server.emit('workflow:progress', {
      executionId,
      step,
      totalSteps,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkflowCompleted(executionId: string, data: any) {
    this.server.emit('workflow:completed', {
      executionId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkflowFailed(executionId: string, error: any) {
    this.server.emit('workflow:failed', {
      executionId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // Node execution events
  emitNodeExecutionStarted(executionId: string, nodeId: string, nodeName: string, data?: any) {
    this.server.emit('node:execution:started', {
      executionId,
      nodeId,
      nodeName,
      inputData: data?.inputData,
      startTime: data?.startTime,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[${executionId}] Node ${nodeName} started with ${data?.inputData?.length || 0} input items`);
  }

  emitNodeExecutionCompleted(executionId: string, nodeId: string, nodeName: string, result: any) {
    // Calculate output item count
    const outputCount = result?.outputData?.[0]?.length || 0;

    this.server.emit('node:execution:completed', {
      executionId,
      nodeId,
      nodeName,
      result,
      inputData: result?.inputData,
      outputData: result?.outputData,
      executionTime: result?.executionTime,
      startTime: result?.startTime,
      endTime: result?.endTime,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[${executionId}] Node ${nodeName} completed in ${result?.executionTime}ms (${result?.inputData?.length || 0} input → ${outputCount} output items)`);
  }

  emitNodeExecutionFailed(executionId: string, nodeId: string, nodeName: string, error: any) {
    this.server.emit('node:execution:failed', {
      executionId,
      nodeId,
      nodeName,
      error,
      inputData: error?.inputData,
      executionTime: error?.executionTime,
      startTime: error?.startTime,
      endTime: error?.endTime,
      timestamp: new Date().toISOString(),
    });

    this.logger.error(`[${executionId}] Node ${nodeName} failed after ${error?.executionTime}ms: ${error?.message}`);
  }

  // Branch execution events (parallel fan-out / fan-in)
  emitBranchExecutionStarted(
    executionId: string,
    branchId: string,
    parentNodeId: string,
    targetNodeId: string,
    data?: any,
  ) {
    this.server.emit('branch:execution:started', {
      executionId,
      branchId,
      parentNodeId,
      targetNodeId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `[${executionId}] Branch ${branchId} started: ${parentNodeId} -> ${targetNodeId}`,
    );
  }

  emitBranchExecutionCompleted(
    executionId: string,
    branchId: string,
    data?: any,
  ) {
    this.server.emit('branch:execution:completed', {
      executionId,
      branchId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `[${executionId}] Branch ${branchId} completed`,
    );
  }

  emitBranchExecutionFailed(
    executionId: string,
    branchId: string,
    error: any,
  ) {
    this.server.emit('branch:execution:failed', {
      executionId,
      branchId,
      error,
      timestamp: new Date().toISOString(),
    });

    this.logger.error(
      `[${executionId}] Branch ${branchId} failed: ${error?.message}`,
    );
  }

  emitParallelFanOut(
    executionId: string,
    parentNodeId: string,
    branchCount: number,
    branchIds: string[],
  ) {
    this.server.emit('parallel:fanout', {
      executionId,
      parentNodeId,
      branchCount,
      branchIds,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `[${executionId}] Fan-out from ${parentNodeId}: ${branchCount} parallel branches`,
    );
  }

  emitParallelFanIn(
    executionId: string,
    joinNodeId: string,
    branchIds: string[],
  ) {
    this.server.emit('parallel:fanin', {
      executionId,
      joinNodeId,
      branchIds,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `[${executionId}] Fan-in at ${joinNodeId}: ${branchIds.length} branches merged`,
    );
  }

  // Connector events
  emitConnectorStatus(connectorId: string, status: string, data: any) {
    this.server.emit('connector:status', {
      connectorId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Subscribe to workflow updates (with authentication)
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('workflow:subscribe')
  handleWorkflowSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    this.logger.log(`Client ${client.id} subscribed to workflow ${data.workflowId}`);
    client.join(`workflow:${data.workflowId}`);
    return { event: 'workflow:subscribed', data: { workflowId: data.workflowId } };
  }

  // Unsubscribe from workflow updates
  @SubscribeMessage('workflow:unsubscribe')
  handleWorkflowUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    this.logger.log(`Client ${client.id} unsubscribed from workflow ${data.workflowId}`);
    client.leave(`workflow:${data.workflowId}`);
    return { event: 'workflow:unsubscribed', data: { workflowId: data.workflowId } };
  }

  // Ping/Pong for connection health
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }

  // Emit to specific workflow room
  emitToWorkflow(workflowId: string, event: string, data: any) {
    this.server.to(`workflow:${workflowId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
