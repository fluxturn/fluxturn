#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PlatformService } from '../modules/database/platform.service';

async function checkNodeType() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const platformService = app.get(PlatformService);

  const result = await platformService.query(
    'SELECT type, name, config_schema, input_schema, output_schema FROM node_types WHERE type IN ($1, $2)',
    ['CONNECTOR_TRIGGER', 'CONNECTOR_ACTION']
  );

  console.log('=== NODE TYPE SCHEMAS ===\n');

  result.rows.forEach(row => {
    console.log(`\n${row.type} (${row.name}):`);
    console.log('\nconfig_schema:');
    console.log(JSON.stringify(row.config_schema, null, 2));
    console.log('\ninput_schema:');
    console.log(JSON.stringify(row.input_schema, null, 2));
    console.log('\noutput_schema:');
    console.log(JSON.stringify(row.output_schema, null, 2));
    console.log('\n' + '='.repeat(60));
  });

  await app.close();
}

checkNodeType().catch(console.error);
