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
2. Fill in frontmatter: `id`, `name`, `description`, `mode`, `tools`, `keywords`, `capabilities`
3. Write the body (Mission, Mandatory Rules, Domain Expertise, Deliverables)
4. Run `npm run validate` to check frontmatter
5. Run `npm test` to verify nothing breaks
6. Submit a PR

## Adding a model

1. Create `models/<name>.yaml` following the existing schema
2. Fields: `id`, `name`, `provider`, `family`, `context_window`, `cost_per_1k_input`, `cost_per_1k_output`, `supports_tools`, `supports_streaming`, `supports_reasoning`, `supports_json`, `priority`, `strengths`, `weaknesses`, `version`

## Adding a platform adapter

1. Create `adapters/<name>/index.mjs` exporting a default function
2. Function signature: `(agents[]) => [{path, content}]`
3. Run `npm run export:<name>` to test
4. Add the platform to `tools/install.mjs` `VALID_PLATFORMS` list

## Code style

- No semicolons unless required
- Use `const`, arrow functions, template literals
- Follow existing patterns (class + factory + singleton)
- No TODO/FIXME comments in commits

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## PR process

0. Accept the CLA if this is your first contribution (see above) — CLA Assistant will prompt you automatically
1. Branch from `develop`: `feature/my-change`
2. One commit per logical change
3. All tests must pass
4. Update CHANGELOG.md if applicable
5. Open PR against `develop`
