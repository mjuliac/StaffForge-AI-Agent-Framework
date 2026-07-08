import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { getAgentRegistry } from './lib/agent-registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const agentDir = join(root, 'agents');

const DOMAIN_MAP = {
  python:          { k: ['python', 'programming', 'backend'], c: ['code', 'lint', 'test'] },
  javascript:      { k: ['javascript', 'js', 'programming', 'web'], c: ['code', 'lint', 'test'] },
  typescript:      { k: ['typescript', 'ts', 'programming', 'web'], c: ['code', 'lint', 'typecheck'] },
  go:              { k: ['go', 'golang', 'programming', 'backend'], c: ['code', 'lint', 'test'] },
  rust:            { k: ['rust', 'programming', 'systems'], c: ['code', 'lint', 'test'] },
  java:            { k: ['java', 'jvm', 'programming', 'backend'], c: ['code', 'lint', 'test'] },
  csharp:          { k: ['csharp', 'c#', 'dotnet', 'programming'], c: ['code', 'lint', 'test'] },
  php:             { k: ['php', 'programming', 'web'], c: ['code', 'lint', 'test'] },
  ruby:            { k: ['ruby', 'programming', 'web'], c: ['code', 'lint', 'test'] },
  react:           { k: ['react', 'ui', 'frontend', 'web'], c: ['code', 'component', 'hook'] },
  'nextjs':        { k: ['nextjs', 'next.js', 'react', 'fullstack', 'ssr'], c: ['code', 'server-component', 'api-route'] },
  vue:             { k: ['vue', 'vuejs', 'frontend', 'web'], c: ['code', 'component'] },
  nuxt:            { k: ['nuxt', 'vue', 'fullstack', 'ssr'], c: ['code', 'server-side-rendering'] },
  svelte:          { k: ['svelte', 'frontend', 'web'], c: ['code', 'component'] },
  sveltekit:       { k: ['sveltekit', 'svelte', 'fullstack', 'ssr'], c: ['code', 'server-side-rendering'] },
  angular:         { k: ['angular', 'frontend', 'web', 'typescript'], c: ['code', 'component', 'service'] },
  astro:           { k: ['astro', 'frontend', 'ssg', 'islands'], c: ['code', 'static-site-generation'] },
  gatsby:          { k: ['gatsby', 'react', 'ssg', 'graphql'], c: ['code', 'static-site-generation'] },
  remix:           { k: ['remix', 'react', 'fullstack', 'web'], c: ['code', 'server-component', 'loader'] },
  express:         { k: ['express', 'nodejs', 'backend', 'api'], c: ['code', 'middleware', 'route'] },
  fastapi:         { k: ['fastapi', 'python', 'api', 'backend'], c: ['code', 'route', 'validation'] },
  flask:           { k: ['flask', 'python', 'backend', 'web'], c: ['code', 'route', 'blueprint'] },
  django:          { k: ['django', 'python', 'backend', 'web'], c: ['code', 'orm', 'admin'] },
  'aspnet-core':   { k: ['aspnet-core', 'asp.net', 'csharp', 'dotnet', 'web'], c: ['code', 'controller', 'middleware'] },
  blazor:          { k: ['blazor', 'dotnet', 'csharp', 'wasm'], c: ['code', 'component', 'interactivity'] },
  maui:            { k: ['maui', 'dotnet', 'csharp', 'mobile', 'desktop'], c: ['code', 'ui', 'cross-platform'] },
  winforms:        { k: ['winforms', 'dotnet', 'csharp', 'desktop'], c: ['code', 'ui', 'windows'] },
  wpf:             { k: ['wpf', 'dotnet', 'csharp', 'desktop'], c: ['code', 'ui', 'xaml'] },
  flutter:         { k: ['flutter', 'dart', 'mobile', 'ui'], c: ['code', 'widget', 'cross-platform'] },
  'react-native':  { k: ['react-native', 'react', 'mobile', 'native'], c: ['code', 'component', 'mobile'] },
  swiftui:         { k: ['swiftui', 'swift', 'ios', 'macos', 'ui'], c: ['code', 'view', 'declarative-ui'] },
  'shadcn-ui':     { k: ['shadcn-ui', 'react', 'ui', 'components'], c: ['component', 'design-system', 'tailwind'] },
  mui:             { k: ['mui', 'material-ui', 'react', 'ui'], c: ['component', 'design-system', 'theming'] },
  tailwind:        { k: ['tailwind', 'css', 'styling', 'utility'], c: ['style', 'responsive', 'design'] },
  css:             { k: ['css', 'styling', 'design', 'layout'], c: ['style', 'animation', 'responsive'] },
  sass:            { k: ['sass', 'scss', 'css', 'styling'], c: ['style', 'mixin', 'variable'] },
  graphql:         { k: ['graphql', 'api', 'query', 'backend'], c: ['schema', 'resolver', 'mutation'] },
  grpc:            { k: ['grpc', 'rpc', 'api', 'proto'], c: ['service', 'protobuf', 'streaming'] },
  'api-design':    { k: ['api-design', 'rest', 'openapi', 'contract'], c: ['schema', 'docs', 'versioning'] },
  signalr:         { k: ['signalr', 'dotnet', 'websocket', 'real-time'], c: ['hub', 'realtime', 'push'] },
  websocket:       { k: ['websocket', 'ws', 'realtime', 'bidirectional'], c: ['connection', 'event', 'streaming'] },
  'minimal-api':   { k: ['minimal-api', 'dotnet', 'csharp', 'api'], c: ['route', 'endpoint', 'lightweight'] },
  starlette:       { k: ['starlette', 'python', 'asgi', 'web'], c: ['code', 'middleware', 'route'] },
  httpx:           { k: ['httpx', 'python', 'http', 'client'], c: ['http-client', 'async', 'request'] },
  uvicorn:         { k: ['uvicorn', 'python', 'asgi', 'server'], c: ['serve', 'async', 'reload'] },
  gunicorn:        { k: ['gunicorn', 'python', 'wsgi', 'server'], c: ['serve', 'workers', 'deployment'] },
  postgres:        { k: ['postgres', 'postgresql', 'database', 'sql'], c: ['query', 'schema', 'migration'] },
  mysql:           { k: ['mysql', 'database', 'sql', 'relational'], c: ['query', 'schema', 'migration'] },
  sqlite:          { k: ['sqlite', 'database', 'sql', 'embedded'], c: ['query', 'schema', 'migration'] },
  sqlserver:       { k: ['sql-server', 'mssql', 'database', 'sql'], c: ['query', 'schema', 'migration'] },
  oracle:          { k: ['oracle', 'database', 'sql', 'enterprise'], c: ['query', 'schema', 'plsql'] },
  mongodb:         { k: ['mongodb', 'nosql', 'database', 'document'], c: ['query', 'aggregation', 'index'] },
  cassandra:       { k: ['cassandra', 'nosql', 'database', 'wide-column'], c: ['query', 'cql', 'replication'] },
  redis:           { k: ['redis', 'cache', 'database', 'key-value'], c: ['cache', 'pubsub', 'session'] },
  elasticsearch:   { k: ['elasticsearch', 'elastic', 'search', 'analytics'], c: ['search', 'index', 'aggregation'] },
  prisma:          { k: ['prisma', 'orm', 'database', 'typescript'], c: ['schema', 'query', 'migration'] },
  sqlalchemy:      { k: ['sqlalchemy', 'python', 'orm', 'database'], c: ['schema', 'query', 'migration'] },
  dapper:          { k: ['dapper', 'dotnet', 'orm', 'micro-orm'], c: ['query', 'mapping', 'performance'] },
  'entity-framework': { k: ['entity-framework', 'ef', 'dotnet', 'orm'], c: ['schema', 'query', 'migration'] },
  alembic:         { k: ['alembic', 'python', 'migration', 'database'], c: ['migration', 'schema', 'versioning'] },
  docker:          { k: ['docker', 'container', 'devops', 'infra'], c: ['build', 'compose', 'containerize'] },
  kubernetes:      { k: ['kubernetes', 'k8s', 'container', 'orchestration'], c: ['deploy', 'pod', 'service', 'helm'] },
  terraform:       { k: ['terraform', 'iac', 'infrastructure', 'cloud'], c: ['provision', 'module', 'state'] },
  aws:             { k: ['aws', 'cloud', 'infrastructure', 'amazon'], c: ['deploy', 'serverless', 's3', 'lambda'] },
  azure:           { k: ['azure', 'cloud', 'microsoft', 'infrastructure'], c: ['deploy', 'function', 'app-service'] },
  gcp:             { k: ['gcp', 'google-cloud', 'cloud', 'infrastructure'], c: ['deploy', 'function', 'run'] },
  ansible:         { k: ['ansible', 'automation', 'config-management', 'devops'], c: ['playbook', 'provision', 'deploy'] },
  nginx:           { k: ['nginx', 'reverse-proxy', 'web-server', 'load-balancer'], c: ['proxy', 'serve', 'ssl', 'config'] },
  'github-actions': { k: ['github-actions', 'ci', 'cd', 'automation'], c: ['workflow', 'ci', 'deploy'] },
  'gitlab-ci':     { k: ['gitlab-ci', 'ci', 'cd', 'automation'], c: ['pipeline', 'ci', 'deploy'] },
  jenkins:         { k: ['jenkins', 'ci', 'cd', 'automation'], c: ['pipeline', 'job', 'ci'] },
  linux:           { k: ['linux', 'unix', 'os', 'sysadmin'], c: ['shell', 'config', 'sysadmin'] },
  networking:      { k: ['networking', 'network', 'tcp', 'dns'], c: ['config', 'firewall', 'routing'] },
  windows:         { k: ['windows', 'microsoft', 'os', 'sysadmin'], c: ['shell', 'config', 'sysadmin'] },
  macos:           { k: ['macos', 'apple', 'os', 'desktop'], c: ['shell', 'config', 'sysadmin'] },
  pytest:          { k: ['pytest', 'python', 'testing', 'unit-test'], c: ['test', 'fixture', 'mock', 'assert'] },
  jest:            { k: ['jest', 'javascript', 'testing', 'unit-test'], c: ['test', 'mock', 'assert', 'snapshot'] },
  vitest:          { k: ['vitest', 'javascript', 'testing', 'unit-test'], c: ['test', 'mock', 'assert', 'vite'] },
  playwright:      { k: ['playwright', 'e2e', 'testing', 'browser'], c: ['test', 'e2e', 'browser-automation'] },
  cypress:         { k: ['cypress', 'e2e', 'testing', 'browser'], c: ['test', 'e2e', 'component-test'] },
  xunit:           { k: ['xunit', 'dotnet', 'testing', 'unit-test'], c: ['test', 'assert', 'theory'] },
  'react-query':   { k: ['react-query', 'tanstack', 'react', 'data-fetching'], c: ['query', 'mutation', 'cache'] },
  'react-router':  { k: ['react-router', 'react', 'routing', 'spa'], c: ['route', 'navigation', 'param'] },
  redux:           { k: ['redux', 'state-management', 'react', 'store'], c: ['state', 'reducer', 'middleware'] },
  zustand:         { k: ['zustand', 'state-management', 'react', 'store'], c: ['state', 'store', 'hook'] },
  storybook:       { k: ['storybook', 'ui', 'component', 'documentation'], c: ['story', 'addon', 'visual-test'] },
  pydantic:        { k: ['pydantic', 'python', 'validation', 'schema'], c: ['validation', 'schema', 'serialization'] },
  jinja:           { k: ['jinja', 'jinja2', 'python', 'template'], c: ['template', 'render', 'generation'] },
  celery:          { k: ['celery', 'python', 'task-queue', 'async'], c: ['task', 'queue', 'schedule'] },
  asyncio:         { k: ['asyncio', 'python', 'async', 'concurrency'], c: ['async', 'await', 'event-loop'] },
  tkinter:         { k: ['tkinter', 'python', 'gui', 'desktop'], c: ['gui', 'widget', 'event'] },
  pyside6:         { k: ['pyside6', 'python', 'qt', 'gui'], c: ['gui', 'widget', 'signal-slot'] },
  'qt-designer':   { k: ['qt-designer', 'qt', 'gui', 'ui-designer'], c: ['design', 'widget', 'layout'] },
  dotnet:          { k: ['dotnet', '.net', 'csharp', 'framework'], c: ['code', 'build', 'nuget'] },
  serilog:         { k: ['serilog', 'dotnet', 'logging', 'structured'], c: ['log', 'sink', 'enricher'] },
  android:         { k: ['android', 'kotlin', 'mobile', 'java'], c: ['code', 'activity', 'fragment'] },
  opencode:        { k: ['opencode', 'platform', 'config', 'agent'], c: ['export', 'config', 'agent-definition'] },
  'claude-code':   { k: ['claude-code', 'claude', 'platform', 'agent'], c: ['export', 'rules', 'agent-definition'] },
  cursor:          { k: ['cursor', 'platform', 'rules', 'agent'], c: ['export', 'rules', 'agent-definition'] },
  copilot:         { k: ['copilot', 'github', 'platform', 'agent'], c: ['export', 'instructions', 'agent-definition'] },
  aider:           { k: ['aider', 'platform', 'agent', 'rules'], c: ['export', 'rules', 'agent-definition'] },
  'gemini-cli':    { k: ['gemini-cli', 'gemini', 'platform', 'agent'], c: ['export', 'instructions', 'agent-definition'] },
  orchestrator:    { k: ['orchestrator', 'routing', 'pipeline', 'coordination'], c: ['route', 'delegate', 'coordinate'] },
  architect:       { k: ['architect', 'design', 'architecture', 'patterns'], c: ['design', 'review', 'plan'] },
  git:             { k: ['git', 'version-control', 'branch', 'commit'], c: ['branch', 'commit', 'merge', 'push'] },
  'code-review':   { k: ['code-review', 'review', 'quality', 'best-practices'], c: ['review', 'lint', 'feedback'] },
  security:        { k: ['security', 'owasp', 'vulnerability', 'audit'], c: ['audit', 'review', 'scan'] },
  testing:         { k: ['testing', 'qa', 'quality', 'verification'], c: ['test', 'plan', 'coverage'] },
  performance:     { k: ['performance', 'optimization', 'profiling', 'speed'], c: ['profile', 'optimize', 'benchmark'] },
  documentation:   { k: ['documentation', 'docs', 'readme', 'wiki'], c: ['write', 'generate', 'format'] },
  debugging:       { k: ['debugging', 'debug', 'troubleshooting', 'fix'], c: ['trace', 'analyze', 'fix'] },
  refactor:        { k: ['refactor', 'restructure', 'clean-code', 'tech-debt'], c: ['refactor', 'restructure', 'migrate'] },
  'clean-architecture': { k: ['clean-architecture', 'architecture', 'ddd', 'solid'], c: ['design', 'layer', 'separation-of-concerns'] },
  ddd:             { k: ['ddd', 'domain-driven-design', 'architecture', 'ubiquitous-language'], c: ['model', 'aggregate', 'bounded-context'] },
  cqrs:            { k: ['cqrs', 'command-query', 'architecture', 'segregation'], c: ['command', 'query', 'event'] },
  microservices:   { k: ['microservices', 'distributed', 'architecture', 'soa'], c: ['design', 'decompose', 'communicate'] },
  'data-science':  { k: ['data-science', 'data', 'analytics', 'ml'], c: ['analyze', 'visualize', 'model'] },
  'machine-learning': { k: ['machine-learning', 'ml', 'ai', 'data-science'], c: ['train', 'predict', 'evaluate'] },
  'dependency-audit': { k: ['dependency-audit', 'dependencies', 'cve', 'supply-chain'], c: ['audit', 'scan', 'report'] },
  secrets:         { k: ['secrets', 'credentials', 'security', 'vault'], c: ['scan', 'rotate', 'protect'] },
  pentest:         { k: ['pentest', 'pentesting', 'security', 'exploit'], c: ['scan', 'exploit', 'report'] },
  sre:             { k: ['sre', 'reliability', 'sla', 'incident'], c: ['monitor', 'alert', 'incident-response'] },
  monitoring:      { k: ['monitoring', 'observability', 'metrics', 'alert'], c: ['monitor', 'dashboard', 'alert'] },
  logging:         { k: ['logging', 'log', 'observability', 'structured'], c: ['log', 'aggregate', 'analyze'] },
  integration:     { k: ['integration', 'integration-testing', 'e2e', 'api-test'], c: ['test', 'integrate', 'verify'] },
  e2e:             { k: ['e2e', 'end-to-end', 'testing', 'browser'], c: ['test', 'automate', 'verify'] },
  i18n:            { k: ['i18n', 'internationalization', 'localization', 'translation'], c: ['translate', 'localize', 'format'] },
  a11y:            { k: ['a11y', 'accessibility', 'aria', 'inclusive'], c: ['audit', 'fix', 'screen-reader'] },
  requirements:    { k: ['requirements', 'specification', 'analysis', 'business'], c: ['analyze', 'spec', 'document'] },
  'impact-analysis': { k: ['impact-analysis', 'change-impact', 'risk', 'dependency'], c: ['analyze', 'trace', 'risk-assessment'] },
  knowledge:       { k: ['knowledge', 'discovery', 'search', 'codebase'], c: ['search', 'find', 'explore'] },
  plan:            { k: ['plan', 'planning', 'roadmap', 'estimation'], c: ['plan', 'estimate', 'sequence'] },
  build:           { k: ['build', 'compile', 'bundle', 'artifact'], c: ['build', 'compile', 'package'] },
  release:         { k: ['release', 'versioning', 'changelog', 'deploy'], c: ['release', 'tag', 'changelog'] },
  'ui-ux':         { k: ['ui-ux', 'design', 'user-experience', 'interface'], c: ['design', 'prototype', 'usability'] },
  deployment:      { k: ['deployment', 'deploy', 'cd', 'release'], c: ['deploy', 'rollback', 'canary'] },
  database:        { k: ['database', 'db', 'data', 'storage'], c: ['schema', 'query', 'migration', 'design'] },
  html:            { k: ['html', 'markup', 'web', 'structure'], c: ['markup', 'semantic', 'seo'] },
};

const agents = getAgentRegistry().all();
let updated = 0;
let skipped = 0;

for (const agent of agents) {
  const hasKeywords = agent.frontmatter.keywords && agent.frontmatter.keywords.length > 0;
  const hasCaps = agent.frontmatter.capabilities && agent.frontmatter.capabilities.length > 0;
  if (hasKeywords && hasCaps) { skipped++; continue; }

  let entry = DOMAIN_MAP[agent.id];
  if (!entry) {
    entry = { k: agent.id.split('-'), c: ['code'] };
  }

  const filePath = join(agentDir, agent.file);
  let content = readFileSync(filePath, 'utf-8');

  const [rawFm, ...bodyParts] = content.split('---\n').filter(Boolean);
  const body = '---\n' + bodyParts.join('---\n');

  const fm = yaml.load(rawFm);
  if (!hasKeywords) fm.keywords = entry.k;
  if (!hasCaps) fm.capabilities = entry.c;

  const newFm = yaml.dump(fm, { lineWidth: 120, noRefs: true, sortKeys: false });
  const newContent = '---\n' + newFm + body;

  writeFileSync(filePath, newContent, 'utf-8');
  updated++;
}

console.log(`Updated ${updated} agents with keywords/capabilities (${skipped} already populated)`);
