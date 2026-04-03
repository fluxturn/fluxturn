// Utility Connectors - Category Index

// Export connector implementations
export { SshConnector } from './ssh';
export { FtpConnector } from './ftp';
export { ExecuteCommandConnector } from './execute-command';
export { DeepLConnector } from './deepl';
export { BitlyConnector } from './bitly';

// Export connector definitions
export { SSH_CONNECTOR } from './ssh';
export { FTP_CONNECTOR } from './ftp';
export { EXECUTE_COMMAND_CONNECTOR } from './execute-command';
export { DEEPL_CONNECTOR } from './deepl';
export { BITLY_CONNECTOR } from './bitly';

// Combined array
import { SSH_CONNECTOR } from './ssh';
import { FTP_CONNECTOR } from './ftp';
import { EXECUTE_COMMAND_CONNECTOR } from './execute-command';
import { DEEPL_CONNECTOR } from './deepl';
import { BITLY_CONNECTOR } from './bitly';

export const UTILITY_CONNECTORS = [
  SSH_CONNECTOR,
  FTP_CONNECTOR,
  EXECUTE_COMMAND_CONNECTOR,
  DEEPL_CONNECTOR,
  BITLY_CONNECTOR,
];
