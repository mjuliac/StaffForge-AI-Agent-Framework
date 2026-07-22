# Contributing

## Getting started

```bash
git clone https://github.com/StaffForge/StaffForge-AI-Agent-Framework.git
cd StaffForge-AI-Agent-Framework
npm install              # install dependencies — NOTE: no "run" (npm run install is invalid)
npm run validate
npm test
```

## Contributor License Agreement (CLA)

Before your first pull request is merged, you must accept the [Contributor License Agreement](./CLA.md).

This does **not** take away your rights over your own code — you keep authorship and copyright. It simply grants StaffForge the permissions needed to distribute the project under GPL-3.0 for the community **and**, separately, offer commercial products (like StaffForge Enterprise) without licensing conflicts between contributions.

You'll be prompted to accept it automatically the first time you open a PR (via CLA Assistant). No action is needed until then.

## Adding an agent

```bash
npm run init-agent <name>
# or: node tools/init-agent.mjs <name>
```

1. Edit the generated file in `agents/<name>.md`
2. Fill in frontmatter: `id`, `name`, `description`, `mode` (primary/subagent/all), `category` (core/vcs/technology/domain/utility), `tools` (write/bash/edit), `priority`, `input_schema`, `output_schema`, `guardrails`
3. Write the body (`## Mission`, `## Mandatory Rules`, `## Domain Expertise`, `## Deliverables`)
4. Run `npm run validate` to check frontmatter against JSON Schema
5. Run `npm test` to verify nothing breaks
6. Run `npm run export:opencode` to regenerate platform configs
7. Submit a PR

See `schemas/agent.schema.json` for the full list of valid fields and `templates/agent.md` for a complete scaffold.

## Adding a model

1. Create `models/<name>.yaml` following the existing schema
2. Fields: `id`, `name`, `provider`, `family`, `context_window`, `cost_per_1k_input`, `cost_per_1k_output`, `supports_tools`, `supports_streaming`, `supports_reasoning`, `supports_json`, `priority`, `strengths`, `weaknesses`, `version`

## Adding a platform adapter

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function signature: `(agents[]) => [{path, content}]`
3. Run `npm run export:<name>` to test
4. Add the platform to `tools/install.mjs` `VALID_PLATFORMS` list

## Code style

- **Semicolons required** — Prettier enforces `semi: true` (configured in `.prettierrc`)
- Use `const` (no `let` unless necessary, no `var` — enforced by ESLint)
- Use arrow functions, template literals, async/await
- Follow module patterns: class + factory + getInstance() singleton
- Use named exports (no default exports except for platform adapters)
- Use `import { ... } from 'node:*'` for Node built-ins
- No TODO/FIXME comments in commits — each commit should be complete
- Format with `npm run format:fix` before committing
- Validate with `npm run lint` (ESLint) — `no-unused-vars` as warning, `no-undef` as error, `no-var` as error

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## PR process

0. Accept the CLA if this is your first contribution (see above) — CLA Assistant will prompt you automatically
1. Branch from `develop`: `feature/my-change`
2. One commit per logical change, using Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`)
3. All checks must pass locally before pushing:
   - `npm run validate` — all agents valid against JSON Schema
   - `npm run lint` — ESLint clean
   - `npm run format` — Prettier compliant
   - `npm test` — all 848+ tests passing
   - `npm run export:all` — all 6 platform exports generate without errors
4. Update CHANGELOG.md if applicable
5. Open PR against `develop`
6. CI runs automatically (Node 22 + 24) — the `@ci` watchdog enforces zero-tolerance for failures

### Common CI failures and fixes
- **Prettier**: run `npm run format:fix`
- **ESLint**: run `npm run lint` and fix reported issues
- **Tests**: run `npm test` locally to reproduce
- **Agent validation**: run `npm run validate` to check frontmatter
- **Export**: run `npm run export:opencode` to verify platform output
