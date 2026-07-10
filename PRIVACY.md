# Privacy Policy

**Last updated: [date]**

This Privacy Policy explains what data StaffForge AI Agent Framework ("StaffForge", "we") collects, how it is used, and what happens to it — both in the current open source release and in StaffForge Enterprise.

## 1. Summary

- **The open source core (`@staffforge/core`, `@staffforge/sdk`, `@staffforge/plugin-sdk`, `@staffforge/cli`) does not send any data to StaffForge or any third party.** All execution telemetry is written to a local file on your own machine.
- StaffForge Enterprise features that involve remote storage, dashboards, or shared/team functionality (see Section 4) process organizational data under a separate Data Processing Agreement (DPA), not this policy alone.
- We do not sell personal data. We do not use your data to train AI models.

## 2. What data is collected (open source / local use)

When you run StaffForge locally, the built-in telemetry collector (`TelemetryCollector`) may record the following about each execution run, **written only to `~/.staffforge/telemetry/runs.jsonl` on your own machine**:

- Pipeline/run identifier and timestamp
- Task type and which agents were invoked
- Execution duration and token counts per agent call
- The AI provider/model used for each call (e.g. "anthropic", "claude-sonnet")
- Success/error status and error messages, if any

**This data never leaves your machine unless you explicitly export, upload, or share it yourself** (for example, by attaching a log file to a bug report). StaffForge has no server-side component in the open source release that receives this data automatically.

We do not collect: your source code, the contents of files your agents operate on, credentials, API keys, or any personally identifiable information, as part of this local telemetry.

## 3. How local telemetry data is used

- Powers the local Learning Engine (model/agent selection improves based on your own historical run data).
- Available for you to inspect, export, or delete at any time — it's a plain JSONL file on disk.

You can disable telemetry collection or delete `~/.staffforge/telemetry/` at any time; this does not affect core functionality, only the Learning Engine's ability to improve suggestions over time.

## 4. StaffForge Enterprise (when applicable)

Enterprise features that are remote or multi-user in nature — such as the Enterprise Dashboard, centralized Policy Engine, shared analytics, or the community Marketplace/Remote Registry — may involve StaffForge (or infrastructure StaffForge operates) processing data on behalf of the customer organization. Where this applies:

- The categories of data processed, purpose, retention periods, and security measures are defined in the **Data Processing Agreement (DPA)** signed as part of the Enterprise commercial agreement.
- Data is processed only as needed to provide the contracted service (e.g., usage analytics per team, cost-policy enforcement, audit logs).
- Sub-processors (e.g., cloud hosting providers), if any, will be disclosed in the DPA.
- Customers acting as data controllers remain responsible for ensuring their own end users are informed, per applicable law.

If your organization is evaluating StaffForge Enterprise and needs a DPA prior to purchase, contact **contacto@staffforge.dev**.

## 5. Legal basis and your rights (GDPR)

For any personal data processed under an Enterprise agreement, StaffForge acts as a data processor on behalf of the customer (the data controller), per the terms of the applicable DPA. Data subjects should direct rights requests (access, rectification, erasure, portability, objection) to the controller (their employer/the customer organization), who will coordinate with StaffForge as needed.

Where StaffForge acts as a data controller (e.g., for contact information submitted via sales/support channels), you can exercise your rights under the GDPR by contacting us at the address in Section 7.

## 6. Data retention

- **Local telemetry**: retained indefinitely on your own machine until you delete it; entirely under your control.
- **Enterprise-processed data**: retention periods are defined in the DPA and/or order form for the applicable plan.

## 7. Contact

For privacy questions, DPA requests, or to exercise your rights:

**Email**: privacy@staffforge.dev

## 8. Changes to this policy

We may update this Privacy Policy as the product evolves (for example, when new Enterprise features that process data remotely are released). Material changes will be reflected in this document with an updated "Last updated" date, and communicated to Enterprise customers separately where required by their DPA.

---

*This document is a working draft reflecting the current state of the codebase (local-only telemetry, no server-side collection in the open source release) as of this writing. It should be reviewed by a lawyer before being treated as a binding policy — particularly Sections 4 and 5, once specific Enterprise infrastructure (Dashboard, Remote Registry, Marketplace) is deployed and its actual data flows are finalized. Update this document whenever a new feature changes what data leaves the user's machine.*
