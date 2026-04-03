const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '..', '.claude', 'templates');

// Helper function to extract node types and create a readable list
function extractNodes(canvas) {
  if (!canvas || !canvas.nodes) return [];

  const nodeDescriptions = canvas.nodes.map(node => {
    const type = node.type;
    const label = node.data?.label || '';
    const connector = node.data?.connectorDisplayName || node.data?.connector || '';

    if (type === 'CONNECTOR_TRIGGER') {
      return `${connector} Trigger`;
    } else if (type === 'CONNECTOR_ACTION') {
      return `${connector} Action`;
    } else if (type === 'AI_AGENT') {
      return 'AI Agent';
    } else if (type === 'SCHEDULE_TRIGGER') {
      return 'Schedule Trigger';
    } else if (type === 'OPENAI_CHAT_MODEL') {
      return 'OpenAI Chat Model';
    } else if (type === 'WEBHOOK_TRIGGER') {
      return 'Webhook Trigger';
    } else {
      return type.replace(/_/g, ' ');
    }
  });

  // Remove duplicates and return
  return [...new Set(nodeDescriptions)];
}

// Helper function to generate AI prompt from template
function generateAIPrompt(template) {
  const nodes = extractNodes(template.canvas);
  const name = template.name;

  // Get trigger type
  const triggerNodes = template.canvas?.nodes?.filter(n =>
    n.type.includes('TRIGGER')
  ) || [];

  const actionNodes = template.canvas?.nodes?.filter(n =>
    n.type.includes('ACTION') || n.type.includes('AGENT')
  ) || [];

  let prompt = `Create a workflow for "${name.toLowerCase()}"`;

  if (triggerNodes.length > 0) {
    const trigger = triggerNodes[0];
    const triggerName = trigger.data?.connectorDisplayName || trigger.data?.connector || trigger.type;
    prompt += ` that triggers when ${trigger.data?.description?.toLowerCase() || 'an event occurs'}`;
  }

  if (actionNodes.length > 0) {
    const actions = actionNodes.map(node => {
      const connector = node.data?.connectorDisplayName || node.data?.connector || '';
      const action = node.data?.actionName || node.data?.label || '';
      return `${action} ${connector ? 'via ' + connector : ''}`.trim();
    }).filter(Boolean);

    if (actions.length > 0) {
      prompt += ` and then ${actions.join(', ')}`;
    }
  }

  return prompt;
}

// Main function to update all templates
function updateAllTemplates() {
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} template files to update...\n`);

  let updated = 0;
  let errors = 0;

  files.forEach(file => {
    try {
      const filePath = path.join(templatesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const template = JSON.parse(content);

      // Extract nodes
      const nodes = extractNodes(template.canvas);
      const nodeList = nodes.length > 0 ? `Nodes: ${nodes.join(', ')}` : '';

      // Update description if it's generic or empty
      const currentDesc = template.description || '';
      if (!currentDesc.includes('Nodes:') && nodeList) {
        // Keep the original description and add node list
        template.description = currentDesc.trim() + (currentDesc ? '. ' : '') + nodeList;
      }

      // Generate and add AI prompt if null
      if (template.ai_prompt === null || template.ai_prompt === undefined) {
        template.ai_prompt = generateAIPrompt(template);
      }

      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');

      console.log(`✅ Updated: ${file}`);
      updated++;

    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
      errors++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${files.length}`);
}

// Run the script
updateAllTemplates();
