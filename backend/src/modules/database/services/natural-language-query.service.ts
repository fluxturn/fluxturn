import { Injectable, Logger } from '@nestjs/common';

interface SchemaInfo {
  tables: {
    [tableName: string]: {
      columns: {
        name: string;
        type: string;
        nullable: boolean;
        primaryKey?: boolean;
        foreignKey?: { table: string; column: string };
      }[];
      relationships?: {
        type: 'hasMany' | 'belongsTo' | 'manyToMany';
        table: string;
        through?: string;
      }[];
    };
  };
}

interface QueryPattern {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, schema?: SchemaInfo) => {
    sql: string;
    params: any[];
  };
}

@Injectable()
export class NaturalLanguageQueryService {
  private readonly logger = new Logger(NaturalLanguageQueryService.name);
  private queryPatterns: QueryPattern[];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    this.queryPatterns = [
      // Find all records
      {
        pattern: /^(show|get|find|list|select)?\s*all\s+(\w+)s?$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]}`,
          params: []
        })
      },
      
      // Find by ID
      {
        pattern: /^(show|get|find|select)?\s*(\w+)\s+(?:by\s+id\s+|with\s+id\s+|#)?(\d+)$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} WHERE id = $1`,
          params: [match[3]]
        })
      },
      
      // Find by field value
      {
        pattern: /^(show|get|find|select)?\s*(\w+)s?\s+(?:where|with|having)\s+(\w+)\s+(?:is|=|equals)\s+['"](.*?)['"]$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} WHERE ${match[3]} = $1`,
          params: [match[4]]
        })
      },
      
      // Count records
      {
        pattern: /^(?:how\s+many|count)?\s*(\w+)s?(?:\s+are\s+there)?$/i,
        handler: (match) => ({
          sql: `SELECT COUNT(*) as count FROM ${match[1]}`,
          params: []
        })
      },
      
      // Find with LIKE
      {
        pattern: /^(show|get|find|select)?\s*(\w+)s?\s+(?:where|with)\s+(\w+)\s+(?:contains|like)\s+['"](.*?)['"]$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} WHERE ${match[3]} ILIKE $1`,
          params: [`%${match[4]}%`]
        })
      },
      
      // Find with greater/less than
      {
        pattern: /^(show|get|find|select)?\s*(\w+)s?\s+(?:where|with)\s+(\w+)\s+(?:>|greater\s+than)\s+(\d+)$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} WHERE ${match[3]} > $1`,
          params: [parseInt(match[4])]
        })
      },
      
      // Find with ordering
      {
        pattern: /^(show|get|find|select)?\s*(\w+)s?\s+(?:ordered|sorted)\s+by\s+(\w+)(?:\s+(desc|asc))?$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} ORDER BY ${match[3]} ${match[4] || 'ASC'}`,
          params: []
        })
      },
      
      // Find with limit
      {
        pattern: /^(show|get|find|select)?\s*(?:top|first)?\s*(\d+)\s+(\w+)s?$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[3]} LIMIT $1`,
          params: [parseInt(match[2])]
        })
      },
      
      // Join tables
      {
        pattern: /^(show|get|find|select)?\s*(\w+)s?\s+with\s+(?:their\s+)?(\w+)s?$/i,
        handler: (match) => ({
          sql: `SELECT * FROM ${match[2]} LEFT JOIN ${match[3]} ON ${match[2]}.${match[3]}_id = ${match[3]}.id`,
          params: []
        })
      },
      
      // Delete by ID
      {
        pattern: /^delete\s+(\w+)\s+(?:by\s+id\s+|with\s+id\s+|#)?(\d+)$/i,
        handler: (match) => ({
          sql: `DELETE FROM ${match[1]} WHERE id = $1`,
          params: [match[2]]
        })
      },
      
      // Update by ID
      {
        pattern: /^update\s+(\w+)\s+#?(\d+)\s+set\s+(\w+)\s+(?:to|=)\s+['"](.*?)['"]$/i,
        handler: (match) => ({
          sql: `UPDATE ${match[1]} SET ${match[3]} = $1 WHERE id = $2`,
          params: [match[4], match[2]]
        })
      },
      
      // Insert new record
      {
        pattern: /^(?:insert|add|create)\s+(?:new\s+)?(\w+)\s+with\s+(.+)$/i,
        handler: (match) => {
          const fieldsStr = match[2];
          const fields: Record<string, any> = {};
          
          // Parse field:value pairs
          const fieldMatches = fieldsStr.matchAll(/(\w+)\s*[:=]\s*['"](.*?)['"]/g);
          for (const fieldMatch of fieldMatches) {
            fields[fieldMatch[1]] = fieldMatch[2];
          }
          
          const columns = Object.keys(fields);
          const values = Object.values(fields);
          const placeholders = columns.map((_, i) => `$${i + 1}`);
          
          return {
            sql: `INSERT INTO ${match[1]} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
            params: values
          };
        }
      }
    ];
  }

  /**
   * Convert natural language to SQL query
   */
  parseNaturalLanguageQuery(query: string, schema?: SchemaInfo): {
    sql: string;
    params: any[];
    explanation?: string;
  } | null {
    const normalizedQuery = query.trim().toLowerCase();
    
    for (const pattern of this.queryPatterns) {
      const match = normalizedQuery.match(pattern.pattern);
      if (match) {
        try {
          const result = pattern.handler(match, schema);
          return {
            ...result,
            explanation: `Interpreted as: ${this.explainQuery(result.sql)}`
          };
        } catch (error) {
          this.logger.error(`Error processing pattern: ${error.message}`);
        }
      }
    }
    
    // If no pattern matches, try to use AI to generate the query
    // This would require integration with the AI service
    this.logger.warn(`No pattern matched for query: ${query}`);
    return null;
  }

  /**
   * Explain what a SQL query does in natural language
   */
  private explainQuery(sql: string): string {
    if (sql.startsWith('SELECT COUNT')) {
      return 'Count the number of records';
    } else if (sql.startsWith('SELECT')) {
      return 'Retrieve records from the database';
    } else if (sql.startsWith('INSERT')) {
      return 'Add a new record to the database';
    } else if (sql.startsWith('UPDATE')) {
      return 'Update an existing record';
    } else if (sql.startsWith('DELETE')) {
      return 'Remove a record from the database';
    }
    return 'Execute database operation';
  }

  /**
   * Get suggestions for natural language queries
   */
  getSuggestions(): string[] {
    return [
      'show all users',
      'find user #123',
      'get users where email is "john@example.com"',
      'count organizations',
      'show users with name contains "john"',
      'get top 10 users',
      'delete user #123',
      'update user #123 set status to "active"',
      'insert new user with name: "John" email: "john@example.com"',
      'show users ordered by created_at desc',
      'find organizations with their users'
    ];
  }
}