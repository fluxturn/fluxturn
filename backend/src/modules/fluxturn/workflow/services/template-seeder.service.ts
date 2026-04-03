import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  compareTemplateFields,
  TemplateDiff,
} from '../../common/utils/template-diff.util';

/**
 * Template Seeder Service
 *
 * Seeds templates to PostgreSQL database with smart field-level change detection:
 * - New templates are inserted
 * - Existing templates are updated only if specific fields changed
 * - Unchanged templates are skipped entirely
 * - User-created templates are preserved (not deleted)
 */
@Injectable()
export class TemplateSeederService implements OnModuleInit {
  private readonly logger = new Logger(TemplateSeederService.name);
  private readonly templatesDir = path.join(
    __dirname,
    '..',
    '..',
    'common',
    'templates',
  );

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    try {
      this.logger.log('🌱 Starting template seeding from JSON files...');
      await this.seedTemplates();
    } catch (error) {
      this.logger.error('Failed to seed templates:', error);
    }
  }

  private async seedTemplates() {
    try {
      // Check if templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        this.logger.warn(`Templates directory not found: ${this.templatesDir}`);
        return;
      }

      // Read all JSON files from templates directory (except index.json)
      const files = fs.readdirSync(this.templatesDir).filter(
        (file) => file.endsWith('.json') && file !== 'index.json',
      );

      if (files.length === 0) {
        this.logger.warn('No template files found in templates directory');
        return;
      }

      this.logger.log(`📂 Found ${files.length} template files`);

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      // Process each template file
      for (const file of files) {
        const filePath = path.join(this.templatesDir, file);

        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const template = JSON.parse(fileContent);

          // Check if template exists BY NAME first (to handle templates without id)
          const existingQuery = `
            SELECT
              id,
              name,
              description,
              category,
              template_definition,
              canvas,
              steps,
              triggers,
              conditions,
              variables,
              outputs,
              required_connectors,
              tags,
              is_public,
              verified,
              metadata,
              ai_prompt
            FROM workflow_templates
            WHERE name = $1
          `;
          const existing = await this.platformService.query(existingQuery, [
            template.name,
          ]);

          // Use existing ID if found, otherwise use template ID from file, or generate new one
          const templateId = existing.rows.length > 0
            ? existing.rows[0].id
            : (template.id || uuidv4());

          if (existing.rows.length === 0) {
            // INSERT new template
            await this.insertTemplate(template, templateId);
            inserted++;
            this.logger.log(
              `   ✅ Inserted new template: "${template.name}" (ID: ${templateId})`,
            );
          } else {
            // Compare fields and get diff
            const diff = compareTemplateFields(existing.rows[0], template);

            if (!diff.hasChanges) {
              // No changes - skip
              skipped++;
              // Uncomment for verbose logging:
              // this.logger.debug(`   ⏭️  Skipped (unchanged): ${template.name}`);
            } else {
              // Update only changed fields
              await this.updateTemplateFields(templateId, diff);
              updated++;

              // Log which fields changed
              const changedFields = diff.changes.map((c) => c.field).join(', ');
              this.logger.log(
                `   🔄 Updated template: "${template.name}" (fields: ${changedFields})`,
              );
            }
          }
        } catch (error) {
          this.logger.error(`Error processing file ${file}:`, error.message);
        }
      }

      this.logger.log(
        `✅ Template seeding complete: ${inserted} inserted, ${updated} updated, ${skipped} unchanged`,
      );
    } catch (error) {
      this.logger.error('Error in seedTemplates:', error);
    }
  }

  /**
   * Insert a new template into the database
   */
  private async insertTemplate(template: any, templateId: string): Promise<void> {
    // Build template_definition from the entire template object
    const templateDefinition = {
      canvas: template.canvas || {},
      steps: template.steps || [],
      triggers: template.triggers || [],
      conditions: template.conditions || [],
      variables: template.variables || [],
      outputs: template.outputs || [],
    };

    const insertQuery = `
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        template_definition,
        canvas,
        steps,
        triggers,
        conditions,
        variables,
        outputs,
        required_connectors,
        tags,
        is_public,
        verified,
        metadata,
        ai_prompt,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        NOW(), NOW()
      )
    `;

    const values = [
      templateId,
      template.name,
      template.description,
      template.category,
      JSON.stringify(templateDefinition),
      JSON.stringify(template.canvas || {}),
      JSON.stringify(template.steps || []),
      JSON.stringify(template.triggers || []),
      JSON.stringify(template.conditions || []),
      JSON.stringify(template.variables || []),
      JSON.stringify(template.outputs || []),
      template.required_connectors || [],
      template.tags || [],
      template.is_public !== undefined ? template.is_public : true,
      template.verified !== undefined ? template.verified : false,
      JSON.stringify(template.metadata || {}),
      template.ai_prompt || null,
      null, // created_by (system templates)
    ];

    await this.platformService.query(insertQuery, values);
  }

  /**
   * Update only the changed fields of an existing template
   */
  private async updateTemplateFields(
    templateId: string,
    diff: TemplateDiff,
  ): Promise<void> {
    if (!diff.hasChanges) return;

    // Build dynamic UPDATE query with only changed fields
    const updateQuery = `
      UPDATE workflow_templates
      SET ${diff.setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${diff.values.length + 1}
    `;

    const values = [...diff.values, templateId];

    await this.platformService.query(updateQuery, values);
  }
}
