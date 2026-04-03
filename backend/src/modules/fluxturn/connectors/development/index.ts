// Development Connectors - Category Index

// Export connector implementations
export { GitHubConnector } from './github';
export { GitLabConnector } from './gitlab';
export { N8nConnector } from './n8n';
export { JenkinsConnector } from './jenkins';
export { TravisCiConnector } from './travis-ci';
export { NetlifyConnector } from './netlify';
export { GitConnector } from './git';
export { BitbucketConnector } from './bitbucket';
export { NpmConnector } from './npm';

// Export connector definitions
export { GITHUB_CONNECTOR } from './github';
export { GITLAB_CONNECTOR } from './gitlab';
export { N8N_CONNECTOR } from './n8n';
export { JENKINS_CONNECTOR } from './jenkins';
export { TRAVIS_CI_CONNECTOR } from './travis-ci';
export { NETLIFY_CONNECTOR } from './netlify';
export { GIT_CONNECTOR } from './git';
export { BITBUCKET_CONNECTOR } from './bitbucket';
export { NPM_CONNECTOR } from './npm';

// Combined array
import { GITHUB_CONNECTOR } from './github';
import { GITLAB_CONNECTOR } from './gitlab';
import { N8N_CONNECTOR } from './n8n';
import { JENKINS_CONNECTOR } from './jenkins';
import { TRAVIS_CI_CONNECTOR } from './travis-ci';
import { NETLIFY_CONNECTOR } from './netlify';
import { GIT_CONNECTOR } from './git';
import { BITBUCKET_CONNECTOR } from './bitbucket';
import { NPM_CONNECTOR } from './npm';

export const DEVELOPMENT_CONNECTORS = [
  GITHUB_CONNECTOR,
  GITLAB_CONNECTOR,
  N8N_CONNECTOR,
  JENKINS_CONNECTOR,
  TRAVIS_CI_CONNECTOR,
  NETLIFY_CONNECTOR,
  GIT_CONNECTOR,
  BITBUCKET_CONNECTOR,
  NPM_CONNECTOR,
];
