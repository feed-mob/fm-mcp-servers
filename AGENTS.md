# Repository Guidelines

## Project Structure & Module Organization
This monorepo hosts standalone MCP servers under `src/<integration-name>`. Each package keeps its own `package.json`, TypeScript sources in `src/`, and emits `dist/` when built. Shared compiler defaults live in the root `tsconfig.json`. Keep utilities local to the package that owns them and document integration specifics in that package’s README. Add tests beside the code to keep each server self-contained.

## Build, Test, and Development Commands
Install dependencies inside the package you touch (for example, `cd src/imagekit && npm install`). Common scripts:
- `npm run dev` — runs `tsx src/server.ts` with hot reload.
- `npm run inspect` — opens `fastmcp inspect` for manual tool trials.
- `npm run build` — compiles to `dist` and marks CLIs executable.
- `npm run start` — executes the compiled output for smoke checks.
Always run `npm run build` before committing so published artifacts stay up to date.

## Coding Style & Naming Conventions
Write TypeScript targeting ES2022/NodeNext with strict mode. Use two-space indentation, `camelCase` for variables and functions, `PascalCase` for types, and favour `const`. Validate untrusted input with `zod` schemas and surface actionable error messages. Load secrets through environment variables and mention required keys in the package README.

Respect the Single Responsibility Principle. When an implementation starts doing more than one thing, pull supporting logic into small private helpers (preferred) or, if multiple packages need it, a clearly named shared module. This keeps public surfaces focused and easier to test.

## Testing Guidelines
Automate coverage for new logic. Create co-located specs such as `src/tools/__tests__/upload.test.ts` and wire `npm test` to your chosen runner (Vitest or Node’s built-in test module). Stub external HTTP calls to avoid hitting partner APIs. Before opening a PR, run `npm run build && npm test` in every package you touched and note any manual checks performed.

## Commit & Pull Request Guidelines
Prefer present-tense, scoped commits like `feat(imagekit): add signed-url tool`; keep unrelated changes in separate commits. Pull requests should summarise the integration affected, link to Jira or GitHub issues, list required env vars, and attach screenshots or CLI transcripts when behaviour shifts. Request review from an engineer familiar with the server and wait for green checks before merging.

## Security & Configuration Tips
Never commit secrets. Use `.env` files loaded via `dotenv`, rotate credentials when rolling keys, and redact sensitive output from logs and pull requests.
