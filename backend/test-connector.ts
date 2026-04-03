// Test script to verify the connector implementation
// This demonstrates how the updated connectors.service.ts will work with real connector implementations

import { ConnectorActionDto } from './src/modules/connectors/dto/connector.dto';

// Example of how to call the Telegram connector through the API
const testTelegramConnector = async () => {
  const connectorId = 'your-connector-id'; // This would be the ID from the database
  
  const actionDto: ConnectorActionDto = {
    action: 'send_message',
    parameters: {
      chatId: '@your_channel_or_chat_id',
      text: 'Hello from Fluxturn! This is a test message.',
      parseMode: 'Markdown'
    }
  };

  console.log('Testing Telegram connector with action:', actionDto);
  
  // This would be called through the ConnectorsService.executeConnectorAction method
  // The service will:
  // 1. Get the connector configuration from the database
  // 2. Decrypt the credentials (including botToken)
  // 3. Use the ConnectorFactory to create a Telegram connector instance
  // 4. Call the connector's executeAction method
  // 5. Return the real API response
};

// Example response format
const exampleResponse = {
  success: true,
  data: {
    message_id: 123,
    date: 1234567890,
    chat: {
      id: -1001234567890,
      title: 'Test Channel',
      type: 'channel'
    }
  },
  metadata: {
    connector_type: 'telegram',
    execution_time_ms: 150
  },
  executed_at: '2024-01-15T12:00:00Z',
  duration_ms: 150
};

console.log('Example response:', exampleResponse);