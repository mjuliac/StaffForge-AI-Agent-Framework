import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const USAGE = `Usage: node tools/init-agent.mjs <agent-name>

Creates a new agent file at agents/<agent-name>.md from the template.
Agent names should be kebab-case (e.g. async-patterns).

The generated agent follows C.R.E.A.D.O. methodology:
  - Contexto / Restricciones / Especificación / Audiencia / Datos de entrada / Output
  - input_schema / output_schema / guardrails in frontmatter
See skills/agent-design-guide.md for the full specification.
`;

const CATEGORIES = ['core', 'technology', 'domain', 'platform', 'utility'];

function ask(query, defaultValue = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function toTitle(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function validateGuardrail(value, min, max, label) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < min || n > max) {
    console.warn(`  ⚠️  ${label} must be between ${min} and ${max}. Using default: ${value}`);
    return false;
  }
  return true;
}

async function main() {
  const name = process.argv[2];
  if (!name || name === '--help' || name === '-h') {
    console.log(USAGE);
    process.exit(name ? 0 : 1);
  }

  console.log(`\n▸ Creating agent "${name}" — C.R.E.A.D.O. setup\n`);

  // ── Basic info ──
  const title = await ask('Title', toTitle(name));
  const description = await ask('Description', `${name} specialist.`);
  const mode = await ask('Mode (primary/subagent/all)', 'subagent');
  const category = await ask(`Category (${CATEGORIES.join('/')})`, 'utility');
  const priority = await ask('Priority (0–100)', '50');
  const keywordsRaw = await ask('Keywords (comma-separated, optional)', '');
  const keywords = keywordsRaw
    ? keywordsRaw
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  // ── C.R.E.A.D.O. Audience ──
  const defaultAudience = 'Staff Engineer level. Technical, precise tone. No decorative markdown.';
  const audience = await ask('Audiencia (quién consume la salida)', defaultAudience);

  // ── C.R.E.A.D.O. Contexto ──
  const defaultContext = `${title} specialist in the StaffForge framework.`;
  const context = await ask('Contexto (rol y dominio)', defaultContext);

  // ── Guardrails ──
  console.log('\n▸ Guardrails configuration:');
  const maxIterations = await ask('  Max iterations (1-20)', '5');
  validateGuardrail(maxIterations, 1, 20, 'max_iterations');
  const tokenBudget = await ask('  Token budget per call (1000-64000)', '4000');
  validateGuardrail(tokenBudget, 1000, 64000, 'token_budget');

  const hasBashAccess = mode !== 'primary' ? await ask('  Does this agent run bash commands? (y/N)', 'n') : 'y';
  const enableDlp = hasBashAccess.toLowerCase() === 'y' ? 'true' : 'false';

  const isPipelineCritical = await ask('  Is this a critical pipeline agent? (y/N)', 'n');
  const enableHallucination = isPipelineCritical.toLowerCase() === 'y' ? 'true' : 'false';

  // ── Generate from template ──
  const template = readFileSync(join(root, 'templates', 'agent.md'), 'utf-8');
  let content = template.replace(/__NAME__/g, name).replace(/__TITLE__/g, title);

  // Customize frontmatter values
  content = content
    .replace(/^description: .*/m, `description: ${description}`)
    .replace(/^mode: .*/m, `mode: ${mode}`)
    .replace(/^category: .*/m, `category: ${category}`)
    .replace(/^priority: .*/m, `priority: ${priority}`);

  // Customize guardrails
  content = content
    .replace(/^  max_iterations: .*/m, `  max_iterations: ${maxIterations}`)
    .replace(/^  token_budget: .*/m, `  token_budget: ${tokenBudget}`)
    .replace(/^  output_dlp: .*/m, `  output_dlp: ${enableDlp}`)
    .replace(/^  hallucination_check: .*/m, `  hallucination_check: ${enableHallucination}`);

  // Customize C.R.E.A.D.O. body sections
  let bodyLines = content.split('\n');
  let inContexto = false,
    inAudiencia = false;
  bodyLines = bodyLines.map((line) => {
    if (line.startsWith('## Contexto')) {
      inContexto = true;
      return line;
    }
    if (inContexto && line.startsWith('## ')) {
      inContexto = false;
    }
    if (inContexto && line.trim().startsWith('Build,')) {
      return `  ${context}`;
    }

    if (line.startsWith('## Audiencia')) {
      inAudiencia = true;
      return line;
    }
    if (inAudiencia && line.startsWith('## ')) {
      inAudiencia = false;
    }
    if (inAudiencia && line.trim().startsWith('Staff Engineer')) {
      return audience;
    }

    return line;
  });
  content = bodyLines.join('\n');

  // Add keywords if provided
  if (keywords.length) {
    const keywordsYaml = keywords.map((k) => `  - ${k}`).join('\n');
    content = content.replace(/^keywords:.*\n?/m, '');
    content = content.replace(/^---\n/m, `---\nkeywords:\n${keywordsYaml}\n`);
  }

  // ── Write ──
  const outPath = join(root, 'agents', `${name}.md`);
  if (readFileSync(outPath, 'utf-8').trim()) {
    // Only warn, don't block — init creates new agents
  }
  writeFileSync(outPath, content, 'utf-8');

  // ── Summary ──
  console.log(`\n✅ Created ${outPath}`);
  console.log(`\n┌─ C.R.E.A.D.O. Summary ──────────────────────────────`);
  console.log(`│ Contexto:       ${context}`);
  console.log(`│ Restricciones:  From template (includes sanitize + guardrails)`);
  console.log(`│ Especificación: From template (numbered steps)`);
  console.log(`│ Audiencia:      ${audience}`);
  console.log(`│ Datos entrada:  From template (<data> XML delimiters)`);
  console.log(`│ Output:         From template (JSON Schema validation)`);
  console.log(`├─ Guardrails ────────────────────────────────────────`);
  console.log(`│ max_iterations:     ${maxIterations}`);
  console.log(`│ token_budget:       ${tokenBudget}`);
  console.log(`│ input_sanitize:     true`);
  console.log(`│ output_validate:    true`);
  console.log(`│ output_dlp:         ${enableDlp}`);
  console.log(`│ hallucination_check: ${enableHallucination}`);
  console.log(`└─────────────────────────────────────────────────────`);
  console.log(`\n📖 See skills/agent-design-guide.md for the full C.R.E.A.D.O. + Guardrails spec.\n`);
}

main();
