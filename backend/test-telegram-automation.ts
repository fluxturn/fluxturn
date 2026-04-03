/**
 * Test file for Telegram automation workflow
 * This demonstrates how to test the Telegram send message functionality
 */

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

async function testTelegramSendMessage() {
  const httpService = new HttpService();
  
  // Replace with your actual bot token and chat ID
  const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
  const CHAT_ID = 'YOUR_CHAT_ID_HERE'; // Can be a number or @username
  
  const message = {
    chat_id: CHAT_ID,
    text: '🚀 Test message from Fluxturn workflow automation!',
    parse_mode: 'Markdown',
    disable_notification: false
  };
  
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    console.log('Sending message to Telegram...');
    const response = await firstValueFrom(
      httpService.post(url, message, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    
    console.log('✅ Message sent successfully!');
    console.log('Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to send message:');
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Test the function
if (require.main === module) {
  testTelegramSendMessage().catch(console.error);
}

export { testTelegramSendMessage };