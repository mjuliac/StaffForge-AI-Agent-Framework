export class TelemetryReporter {
  generateSummary(agents) {
    if (!agents || agents.length === 0) return {};

    const byStatus = {};
    for (const agent of agents) {
      const s = agent.status || 'unknown';
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(agent.id);
    }

    return {
      total: agents.length,
      byStatus,
      stats: {
        success: agents.filter((a) => a.status === 'success').length,
        error: agents.filter((a) => a.status === 'error').length,
        totalTokens: agents.reduce((s, a) => s + (a.tokens || 0), 0),
        totalDuration: agents.reduce((s, a) => s + (a.duration_ms || 0), 0),
        avgTokens: agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.tokens || 0), 0) / agents.length) : 0,
        avgDuration:
          agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.duration_ms || 0), 0) / agents.length) : 0,
      },
      slowest: agents
        .filter((a) => a.duration_ms)
        .sort((a, b) => b.duration_ms - a.duration_ms)
        .slice(0, 3)
        .map((a) => ({ id: a.id, duration_ms: a.duration_ms })),
      topTokens: agents
        .filter((a) => a.tokens)
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 3)
        .map((a) => ({ id: a.id, tokens: a.tokens })),
    };
  }

  generateMarkdown(report) {
    if (!report) return '# Pipeline Report\n\n_No data_';

    const lines = [];
    lines.push(`# Pipeline Report: \`${report.pipeline_id}\``);
    lines.push('');
    lines.push(`- **Task Type:** ${report.task_type || 'N/A'}`);
    lines.push(`- **Status:** ${report.status}`);
    lines.push(`- **Duration:** ${report.duration_ms || 0}ms`);
    lines.push(`- **Total Tokens:** ${report.total_tokens || 0}`);
    lines.push(`- **Provider:** ${report.provider || 'N/A'}`);
    lines.push(`- **Model:** ${report.model || 'N/A'}`);
    lines.push(`- **Timestamp:** ${report.timestamp || 'N/A'}`);
    lines.push('');

    const agents = report.agents || [];
    if (agents.length > 0) {
      lines.push('## Agents');
      lines.push('');
      lines.push('| Agent | Status | Duration (ms) | Tokens |');
      lines.push('|-------|--------|---------------|--------|');
      for (const agent of agents) {
        lines.push(`| ${agent.id} | ${agent.status || 'N/A'} | ${agent.duration_ms || '-'} | ${agent.tokens || '-'} |`);
      }
      lines.push('');

      const summary = this.generateSummary(agents);
      lines.push('## Summary');
      lines.push('');
      lines.push(`- **Total Agents:** ${summary.total}`);
      lines.push(`- **Success:** ${summary.stats.success}`);
      lines.push(`- **Errors:** ${summary.stats.error}`);
      lines.push(`- **Avg Tokens:** ${summary.stats.avgTokens}`);
      lines.push(`- **Avg Duration:** ${summary.stats.avgDuration}ms`);
      lines.push('');

      if (summary.slowest.length > 0) {
        lines.push('### Slowest Agents');
        lines.push('');
        for (const s of summary.slowest) {
          lines.push(`- \`${s.id}\`: ${s.duration_ms}ms`);
        }
        lines.push('');
      }
    }

    if (report.errors && report.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const err of report.errors) {
        lines.push(`- **${err.agent_id}:** ${err.error}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`_Generated: ${new Date().toISOString()}_`);

    return lines.join('\n');
  }

  generateJSON(report) {
    if (!report) return JSON.stringify({ error: 'No data' }, null, 2);

    return JSON.stringify(
      {
        ...report,
        agent_summary: report.agents ? this.generateSummary(report.agents) : null,
        _generated_at: new Date().toISOString(),
      },
      null,
      2,
    );
  }
}

export function getReporter() {
  return new TelemetryReporter();
}

export default TelemetryReporter;
