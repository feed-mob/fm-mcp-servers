# n8n FeedMob Direct Spend Visualizer – Agent Guidelines

## Build & Development Commands
- `npm install` – installs dependencies and clones the Claude plugin via postinstall hook
- `npm run build` – compiles TypeScript (target ES2020, CommonJS) and copies assets to `dist/`
- `npm run dev` – runs TypeScript compiler in watch mode for local development
- `npm run prepare` – runs build automatically before publishing
- No test suite present; manually verify by linking to local n8n (`npm link`) and testing workflows

## Code Style & Structure
- **TypeScript**: Strict mode, ES2020 target, CommonJS modules, declaration files emitted to `dist/`
- **Imports**: Use named imports from `n8n-workflow` and `@anthropic-ai/claude-agent-sdk`; Node built-ins (`fs`, `path`) imported at top
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes/types, `SCREAMING_SNAKE_CASE` for constants
- **Types**: Define explicit types for credentials and result shapes; use `type` for object shapes, `INodeType` and `INodeTypeDescription` from n8n-workflow
- **Error Handling**: Throw descriptive errors with context (e.g., missing credentials, plugin path not found); support `continueOnFail` for batch processing
- **Functions**: Extract reusable logic into private functions (`extractAssistantText`, `normalizeResult`, `tryParseJson`, `buildRuntimeEnv`, `resolvePluginPath`)
- **Formatting**: Two-space indentation, semicolons required, `esModuleInterop` enabled

## n8n Node Conventions
- Place node classes in `nodes/*/` and credential classes in `credentials/`; export from `index.ts`
- Node `description` object defines UI fields (`displayName`, `properties`, `credentials`)
- `execute()` method processes `INodeExecutionData[]` input items and returns results array
- Use `this.getNodeParameter()` and `this.getCredentials()` to access user inputs
- Environment variables passed to child processes via `buildRuntimeEnv()` helper
