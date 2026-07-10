# Security Policy

## Supported Versions

We provide security fixes for the most recent minor release of each major version currently documented in [CHANGELOG.md](./CHANGELOG.md). Older versions may not receive patches — please upgrade before reporting an issue tied to an unsupported version.

| Version | Supported |
|---|---|
| Latest `2.x` | ✅ |
| `< 2.0`      | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** Public issues are visible to everyone, including potential attackers, before a fix is available.

Instead, report it privately:

- **Email**: security@staffforge.dev
- **Alternative**: use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature on this repository (Security tab → "Report a vulnerability")

Please include as much of the following as you can:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or commands, if applicable)
- The affected version(s) or commit
- Any suggested mitigation, if known

### What to expect

| Stage | Target timeframe |
|---|---|
| Acknowledgment of your report | Within 3 business days |
| Initial assessment (severity, validity) | Within 7 business days |
| Fix or mitigation plan communicated | Within 30 days for critical/high severity |
| Public disclosure | Coordinated with the reporter, typically after a fix is released |

We follow a **coordinated disclosure** approach: we ask that you give us a reasonable window to investigate and release a fix before any public disclosure, and we commit to keeping you updated on progress throughout.

## Scope

This policy covers the StaffForge AI Agent Framework codebase itself: `packages/core`, `packages/sdk`, `packages/plugin-sdk`, `packages/cli`, `packages/dashboard`, `packages/enterprise`, `adapters/`, `tools/`, and the agent/model definitions under `agents/` and `models/`.

**Out of scope:**
- Vulnerabilities in third-party AI coding assistants (Cursor, Copilot, Claude Code, etc.) that StaffForge exports configuration to — please report those directly to the respective vendor.
- Vulnerabilities requiring physical access to a user's machine.
- Social engineering attacks against maintainers or contributors.

## Security Best Practices for Users

- Review agent definitions and exported configurations before applying them to your projects, especially if sourced from the community marketplace.
- Do not commit API keys, tokens, or credentials into agent definitions, model configs, or pipeline files.
- Keep your installation up to date — run `npm run validate` after updates to catch schema drift early.
- If you use the Enterprise Policy Engine, review access-control and cost-policy configurations periodically, particularly after adding new team members or integrations.

## Acknowledgments

We're grateful to security researchers who report issues responsibly. With your permission, we're happy to credit you in the release notes for the fix.
