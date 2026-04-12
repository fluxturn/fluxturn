import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import * as yaml from 'js-yaml';

export interface WorkflowDefinitionSchema {
  version: string;
  name: string;
  description: string;
  trigger?: {
    type: string;
    config?: Record<string, any>;
  };
  nodes: Array<{
    id: string;
    type: string;
    name?: string;
    config?: Record<string, any>;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    conditions?: Record<string, any>;
  }>;
}

interface ValidationError {
  field: string;
  message: string;
}

@Injectable()
export class WorkflowSerializerService {
  private readonly logger = new Logger(WorkflowSerializerService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Export a workflow as YAML string
   */
  async exportToYaml(workflowId: string): Promise<string> {
    const definition = await this.buildExportDefinition(workflowId);
    return yaml.dump(definition, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }

  /**
   * Export a workflow as JSON string
   */
  async exportToJson(workflowId: string): Promise<string> {
    const definition = await this.buildExportDefinition(workflowId);
    return JSON.stringify(definition, null, 2);
  }

  /**
   * Import a workflow from a YAML string
   */
  async importFromYaml(
    organizationId: string,
    projectId: string,
    userId: string,
    yamlString: string,
  ): Promise<any> {
    let parsed: any;
    try {
      parsed = yaml.load(yamlString);
    } catch (err: any) {
      throw new BadRequestException(`Invalid YAML: ${err.message}`);
    }

    return this.importFromDefinition(organizationId, projectId, userId, parsed);
  }

  /**
   * Import a workflow from a JSON string
   */
  async importFromJson(
    organizationId: string,
    projectId: string,
    userId: string,
    jsonString: string,
  ): Promise<any> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err: any) {
      throw new BadRequestException(`Invalid JSON: ${err.message}`);
    }

    return this.importFromDefinition(organizationId, projectId, userId, parsed);
  }

  /**
   * Build the export definition from a workflow in the database
   */
  private async buildExportDefinition(workflowId: string): Promise<WorkflowDefinitionSchema> {
    const result = await this.platformService.query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    const row = result.rows[0];
    const canvas = row.canvas || { nodes: [], edges: [] };
    const nodes = (canvas.nodes || []).map((node: any) => ({
      id: node.id,
      type: node.type || node.data?.type,
      name: node.data?.label || node.data?.name || undefined,
      config: node.data?.config || node.data?.configuration || undefined,
      position: node.position || undefined,
    }));

    const edges = (canvas.edges || []).map((edge: any) => ({
      id: edge.id || undefined,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      conditions: edge.data?.conditions || undefined,
    }));

    const trigger = row.trigger_type
      ? {
          type: row.trigger_type,
          config: row.trigger_config || undefined,
        }
      : undefined;

    return {
      version: '1.0',
      name: row.name || 'Untitled Workflow',
      description: row.description || '',
      trigger,
      nodes,
      edges,
    };
  }

  /**
   * Import a workflow from a parsed definition object
   */
  private async importFromDefinition(
    organizationId: string,
    projectId: string,
    userId: string,
    definition: any,
  ): Promise<any> {
    // Validate the definition schema
    const errors = this.validateDefinition(definition);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Workflow definition validation failed',
        errors,
      });
    }

    const def = definition as WorkflowDefinitionSchema;

    // Validate node type references in edges
    const nodeIds = new Set(def.nodes.map((n) => n.id));
    const edgeErrors: ValidationError[] = [];
    for (const edge of def.edges) {
      if (!nodeIds.has(edge.source)) {
        edgeErrors.push({
          field: `edges`,
          message: `Edge source "${edge.source}" references a non-existent node`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        edgeErrors.push({
          field: `edges`,
          message: `Edge target "${edge.target}" references a non-existent node`,
        });
      }
    }
    if (edgeErrors.length > 0) {
      throw new BadRequestException({
        message: 'Workflow definition validation failed',
        errors: edgeErrors,
      });
    }

    // Validate that node types exist in the database
    const nodeTypeErrors = await this.validateNodeTypes(def.nodes);
    if (nodeTypeErrors.length > 0) {
      throw new BadRequestException({
        message: 'Workflow definition validation failed',
        errors: nodeTypeErrors,
      });
    }

    // Build canvas structure expected by the workflow system
    const canvas = {
      nodes: def.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 },
        data: {
          type: node.type,
          label: node.name || node.type,
          name: node.name || node.type,
          config: node.config || {},
          configuration: node.config || {},
        },
      })),
      edges: def.edges.map((edge, idx) => ({
        id: edge.id || `edge-${idx}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
        data: {
          conditions: edge.conditions || undefined,
        },
      })),
    };

    // Insert the workflow
    const insertQuery = `
      INSERT INTO workflows (
        name, description, status, canvas,
        trigger_type, trigger_config,
        organization_id, project_id,
        created_by, updated_by,
        created_at, updated_at
      )
      VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $8, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.platformService.query(insertQuery, [
      def.name,
      def.description || '',
      JSON.stringify(canvas),
      def.trigger?.type || null,
      def.trigger?.config ? JSON.stringify(def.trigger.config) : null,
      organizationId,
      projectId,
      userId,
    ]);

    const createdRow = result.rows[0];

    return {
      id: createdRow.id,
      name: createdRow.name,
      description: createdRow.description,
      status: createdRow.status,
      created_at: createdRow.created_at,
      updated_at: createdRow.updated_at,
      canvas,
    };
  }

  /**
   * Validate the definition schema
   */
  private validateDefinition(definition: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!definition || typeof definition !== 'object') {
      errors.push({ field: 'root', message: 'Definition must be an object' });
      return errors;
    }

    if (!definition.name || typeof definition.name !== 'string') {
      errors.push({ field: 'name', message: 'Name is required and must be a string' });
    }

    if (!Array.isArray(definition.nodes)) {
      errors.push({ field: 'nodes', message: 'Nodes must be an array' });
    } else {
      const nodeIds = new Set<string>();
      for (let i = 0; i < definition.nodes.length; i++) {
        const node = definition.nodes[i];
        if (!node.id || typeof node.id !== 'string') {
          errors.push({ field: `nodes[${i}].id`, message: 'Node id is required and must be a string' });
        } else {
          if (nodeIds.has(node.id)) {
            errors.push({ field: `nodes[${i}].id`, message: `Duplicate node id: "${node.id}"` });
          }
          nodeIds.add(node.id);
        }
        if (!node.type || typeof node.type !== 'string') {
          errors.push({ field: `nodes[${i}].type`, message: 'Node type is required and must be a string' });
        }
      }
    }

    if (!Array.isArray(definition.edges)) {
      errors.push({ field: 'edges', message: 'Edges must be an array' });
    } else {
      for (let i = 0; i < definition.edges.length; i++) {
        const edge = definition.edges[i];
        if (!edge.source || typeof edge.source !== 'string') {
          errors.push({ field: `edges[${i}].source`, message: 'Edge source is required and must be a string' });
        }
        if (!edge.target || typeof edge.target !== 'string') {
          errors.push({ field: `edges[${i}].target`, message: 'Edge target is required and must be a string' });
        }
      }
    }

    return errors;
  }

  /**
   * Validate that node types exist in the database
   */
  private async validateNodeTypes(nodes: Array<{ type: string }>): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const uniqueTypes = [...new Set(nodes.map((n) => n.type))];

    if (uniqueTypes.length === 0) {
      return errors;
    }

    try {
      const placeholders = uniqueTypes.map((_, i) => `$${i + 1}`).join(', ');
      const result = await this.platformService.query(
        `SELECT DISTINCT type FROM node_types WHERE type IN (${placeholders})`,
        uniqueTypes,
      );

      const foundTypes = new Set(result.rows.map((r: any) => r.type));

      for (const type of uniqueTypes) {
        if (!foundTypes.has(type)) {
          // Check if it's a built-in/standard node type that might not be in the table
          const builtInTypes = [
            'trigger', 'action', 'condition', 'loop', 'delay', 'webhook',
            'http_request', 'code', 'set_variable', 'switch', 'merge',
            'split', 'filter', 'transform', 'ai_agent', 'output',
          ];
          if (!builtInTypes.includes(type)) {
            errors.push({
              field: 'nodes',
              message: `Unknown node type: "${type}"`,
            });
          }
        }
      }
    } catch {
      // If node_types table doesn't exist, skip validation
      this.logger.warn('Could not validate node types - node_types table may not exist');
    }

    return errors;
  }
}
