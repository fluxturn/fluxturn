// Project Management Connectors - Category Index

// Export connector implementations
export { AsanaConnector } from './asana';
export { ClickUpConnector } from './clickup';
export { JiraConnector } from './jira';
export { LinearConnector } from './linear';
export { NotionConnector } from './notion';
export { TrelloConnector } from './trello';

// Export connector definitions
export { ASANA_CONNECTOR } from './asana';
export { CLICKUP_CONNECTOR } from './clickup';
export { JIRA_CONNECTOR } from './jira';
export { LINEAR_CONNECTOR } from './linear';
export { NOTION_CONNECTOR } from './notion';
export { TRELLO_CONNECTOR } from './trello';

// Combined array
import { ASANA_CONNECTOR } from './asana';
import { CLICKUP_CONNECTOR } from './clickup';
import { JIRA_CONNECTOR } from './jira';
import { LINEAR_CONNECTOR } from './linear';
import { NOTION_CONNECTOR } from './notion';
import { TRELLO_CONNECTOR } from './trello';

export const PROJECT_MANAGEMENT_CONNECTORS = [
  ASANA_CONNECTOR,
  CLICKUP_CONNECTOR,
  JIRA_CONNECTOR,
  LINEAR_CONNECTOR,
  NOTION_CONNECTOR,
  TRELLO_CONNECTOR,
];
