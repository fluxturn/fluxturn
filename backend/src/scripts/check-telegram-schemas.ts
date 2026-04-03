#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PlatformService } from '../modules/database/platform.service';

async function checkSchemas() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const platformService = app.get(PlatformService);

  const result = await platformService.query(
    'SELECT name, supported_triggers, supported_actions FROM connectors WHERE name = $1',
    ['telegram']
  );

  if (result.rows.length > 0) {
    const telegram = result.rows[0];

    console.log('=== TELEGRAM CONNECTOR ===\n');

    console.log('TRIGGERS:');
    console.log(JSON.stringify(telegram.supported_triggers, null, 2));

    console.log('\n\nACTIONS:');
    console.log(JSON.stringify(telegram.supported_actions, null, 2));
  }

  await app.close();
}

checkSchemas().catch(console.error);
