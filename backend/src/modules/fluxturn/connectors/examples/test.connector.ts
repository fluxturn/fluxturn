import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../base/base.connector';
import { IConnector } from '../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse
} from '../types';

@Injectable()
export class TestConnector extends BaseConnector implements IConnector {
  
  getMetadata(): ConnectorMetadata {
    return {
      name: 'Test Connector',
      description: 'A simple test connector for demonstration purposes',
      version: '1.0.0',
      category: ConnectorCategory.SUPPORT,
      type: ConnectorType.SLACK, // Using SLACK as example
      authType: AuthType.API_KEY,
      actions: [
        {
          id: 'test_action',
          name: 'Test Action',
          description: 'A simple test action',
          inputSchema: {
            message: {
              type: 'string',
              required: true,
              description: 'Test message to echo'
            }
          },
          outputSchema: {
            result: {
              type: 'string',
              description: 'Echoed message'
            }
          }
        },
        {
          id: 'status_check',
          name: 'Status Check',
          description: 'Check connector status',
          inputSchema: {},
          outputSchema: {
            status: {
              type: 'string',
              description: 'Connector status'
            },
            timestamp: {
              type: 'string',
              description: 'Current timestamp'
            }
          }
        }
      ],
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    this.logger.log('Initializing test connector...');
    
    // Validate required credentials
    if (!this.config.credentials.apiKey) {
      throw new Error('API key is required for test connector');
    }
    
    // Simulate connection setup
    await this.sleep(100);
    
    this.logger.log('Test connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    this.logger.log('Testing connection...');
    
    // Simulate connection test
    await this.sleep(200);
    
    // Check if API key is valid (simple check)
    const isValid = this.config.credentials.apiKey === 'test-api-key' || 
                   this.config.credentials.apiKey?.startsWith('tk_');
    
    if (!isValid) {
      throw new Error('Invalid API key for test connector');
    }
    
    this.logger.log('Connection test successful');
    return true;
  }

  protected async performHealthCheck(): Promise<void> {
    this.logger.log('Performing health check...');
    
    // Simulate health check
    await this.sleep(50);
    
    // Always healthy for test connector
    this.logger.log('Health check passed');
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    this.logger.log(`Executing request: ${request.method} ${request.endpoint}`);
    
    // Simulate API request
    await this.sleep(300);
    
    // Return mock response based on endpoint
    switch (request.endpoint) {
      case '/test':
        return {
          success: true,
          data: request.body
        };
      
      case '/status':
        return {
          status: 'active',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };
      
      default:
        throw new Error(`Unknown endpoint: ${request.endpoint}`);
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Executing action: ${actionId} with input:`, input);
    
    switch (actionId) {
      case 'test_action':
        return {
          result: `Echo: ${input.message}`,
          timestamp: new Date().toISOString(),
          inputReceived: input
        };
      
      case 'status_check':
        return {
          status: 'operational',
          timestamp: new Date().toISOString(),
          connectorId: this.config.id,
          uptime: Math.floor(Math.random() * 10000)
        };
      
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Cleaning up test connector...');
    
    // Simulate cleanup
    await this.sleep(50);
    
    this.logger.log('Test connector cleanup completed');
  }
}