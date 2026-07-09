const API = '';
const app = document.getElementById('app');

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

async function fetchJSON(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Router ──
function navigate() {
  const hash = location.hash.slice(1) || 'agents';
  // Update nav
  qsa('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${hash}`));
  // Route
  const [page, param] = hash.split('/');
  switch (page) {
    case 'agents': return param ? renderAgent(param) : renderAgents();
    case 'pipelines': return param ? renderPipeline(param) : renderPipelines();
    case 'models': return renderModels();
    case 'runs': return renderRuns();
    default: renderAgents();
  }
}

window.addEventListener('hashchange', navigate);

// ── Stats ──
async function renderStats() {
  const stats = await fetchJSON('/api/stats');
  const modes = Object.entries(stats.modes).map(([k, v]) => `<span class="pill">${k}: ${v}</span>`).join('');
  return `<div class="stats-row">
    <div class="stat-card"><div class="num">${stats.totalAgents}</div><div class="label">Agents</div></div>
    <div class="stat-card"><div class="num">${stats.totalPipelines}</div><div class="label">Pipelines</div></div>
    <div class="stat-card"><div class="num">${Object.keys(stats.categories).length}</div><div class="label">Categories</div></div>
    <div class="stat-card"><div class="num" style="font-size:1rem;padding-top:0.3rem">${modes}</div><div class="label">Modes</div></div>
  </div>`;
}

// ── Agents ──
async function renderAgents() {
  const [statsHtml, data] = await Promise.all([renderStats(), fetchJSON('/api/agents?limit=500')]);
  let html = `<header><h2>Agents</h2><span>${data.total} total</span></header>${statsHtml}`;
  html += `<div class="search-bar"><input type="text" id="agent-search" placeholder="Search agents..." oninput="searchAgents(this.value)"></div>`;
  html += `<div class="filters" id="agent-filters">
    <button class="active" data-mode="" onclick="filterAgents('')">All</button>
    <button data-mode="primary" onclick="filterAgents('primary')">Primary</button>
    <button data-mode="subagent" onclick="filterAgents('subagent')">Subagent</button>
    <button data-mode="all" onclick="filterAgents('all')">All modes</button>
  </div>`;
  html += `<table><thead><tr><th>Name</th><th>ID</th><th>Mode</th><th>Category</th><th>Description</th></tr></thead><tbody id="agent-table-body">`;
  for (const a of data.agents) {
    const modeBadge = a.mode === 'primary' ? 'badge-primary' : 'badge-subagent';
    const catBadge = `badge-${a.category === 'core' ? 'core' : 'domain'}`;
    html += `<tr onclick="location='#agents/${a.id}'" style="cursor:pointer">
      <td><strong>${a.name}</strong></td>
      <td><code>${a.id}</code></td>
      <td><span class="badge ${modeBadge}">${a.mode}</span></td>
      <td><span class="badge ${catBadge}">${a.category}</span></td>
      <td style="color:#8b949e">${(a.description || '').slice(0, 80)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  app.innerHTML = html;
}

let _allAgents = [];

async function searchAgents(q) {
  const data = _allAgents.length ? { agents: _allAgents } : await fetchJSON('/api/agents?limit=500');
  if (!_allAgents.length) _allAgents = data.agents;
  const ql = q.toLowerCase();
  const filtered = _allAgents.filter(a => a.id.includes(ql) || a.name.toLowerCase().includes(ql) || (a.description || '').toLowerCase().includes(ql));
  const tbody = document.getElementById('agent-table-body');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(a => {
    const mb = a.mode === 'primary' ? 'badge-primary' : 'badge-subagent';
    const cb = `badge-${a.category === 'core' ? 'core' : 'domain'}`;
    return `<tr onclick="location='#agents/${a.id}'" style="cursor:pointer">
      <td><strong>${a.name}</strong></td><td><code>${a.id}</code></td>
      <td><span class="badge ${mb}">${a.mode}</span></td>
      <td><span class="badge ${cb}">${a.category}</span></td>
      <td style="color:#8b949e">${(a.description || '').slice(0, 80)}</td>
    </tr>`;
  }).join('');
}

async function filterAgents(mode) {
  const data = await fetchJSON(`/api/agents?limit=500${mode ? '&mode=' + mode : ''}`);
  _allAgents = data.agents;
  qsa('#agent-filters button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const tbody = document.getElementById('agent-table-body');
  if (!tbody) return;
  tbody.innerHTML = data.agents.map(a => {
    const mb = a.mode === 'primary' ? 'badge-primary' : 'badge-subagent';
    const cb = `badge-${a.category === 'core' ? 'core' : 'domain'}`;
    return `<tr onclick="location='#agents/${a.id}'" style="cursor:pointer">
      <td><strong>${a.name}</strong></td><td><code>${a.id}</code></td>
      <td><span class="badge ${mb}">${a.mode}</span></td>
      <td><span class="badge ${cb}">${a.category}</span></td>
      <td style="color:#8b949e">${(a.description || '').slice(0, 80)}</td>
    </tr>`;
  }).join('');
}

async function renderAgent(id) {
  app.innerHTML = '<div class="loading">Loading agent...</div>';
  try {
    const a = await fetchJSON(`/api/agents/${encodeURIComponent(id)}`);
    const mb = a.frontmatter?.mode === 'primary' ? 'badge-primary' : 'badge-subagent';
    const cb = `badge-${a.frontmatter?.category === 'core' ? 'core' : 'domain'}`;
    const tools = a.frontmatter?.tools || {};
    app.innerHTML = `<header><h2>${a.name}</h2><a href="#agents">&larr; Back</a></header>
      <div class="agent-detail">
        <h3>${a.name} <code style="font-size:0.8rem;color:#8b949e">${a.id}</code></h3>
        <div class="meta">
          <span class="badge ${mb}">${a.frontmatter?.mode || ''}</span>
          <span class="badge ${cb}">${a.frontmatter?.category || ''}</span>
          <span>Write: ${tools.write ? '✓' : '✗'}</span>
          <span>Bash: ${tools.bash ? '✓' : '✗'}</span>
          <span>Edit: ${tools.edit ? '✓' : '✗'}</span>
        </div>
        <p style="color:#8b949e;margin-bottom:1rem">${a.frontmatter?.description || ''}</p>
        ${a.frontmatter?.keywords ? `<div style="margin-bottom:1rem">${a.frontmatter.keywords.map(k => `<span class="pill">${k}</span>`).join('')}</div>` : ''}
        ${a.frontmatter?.capabilities ? `<div style="margin-bottom:1rem">${a.frontmatter.capabilities.map(c => `<span class="pill" style="background:#1f6feb33;color:#58a6ff">${c}</span>`).join('')}</div>` : ''}
        <div class="body">${escapeHtml(a.body || '')}</div>
      </div>`;
  } catch (err) {
    app.innerHTML = `<div style="color:#f85149;text-align:center;padding:2rem">Agent not found: ${id}</div>`;
  }
}

// ── Pipelines ──
async function renderPipelines() {
  app.innerHTML = '<div class="loading">Loading...</div>';
  const data = await fetchJSON('/api/pipelines');
  let html = `<header><h2>Pipelines</h2><span>${data.count} total</span></header>`;
  html += `<div class="stats-row">${data.pipelines.map(p => `<div class="stat-card" style="cursor:pointer" onclick="location='#pipelines/${p.name}'">
    <div class="num" style="font-size:1rem">${p.name}</div><div class="label">${p.levels.length} levels</div></div>`).join('')}</div>`;
  html += data.pipelines.map(p => `<div class="pipeline-card" onclick="location='#pipelines/${p.name}'" style="cursor:pointer">
    <h3>${p.name}</h3>
    <div class="desc">${p.description || ''}</div>
    <div class="level-list">${p.levels.map(l => `<span class="level-tag ${l.parallel ? 'parallel' : 'sequential'}">${l.name}: ${l.agents.join(', ')}</span>`).join('')}</div>
  </div>`).join('');
  app.innerHTML = html;
}

async function renderPipeline(name) {
  app.innerHTML = '<div class="loading">Loading pipeline...</div>';
  try {
    const p = await fetchJSON(`/api/pipelines/${encodeURIComponent(name)}`);
    let html = `<header><h2>${p.name}</h2><a href="#pipelines">&larr; Back</a></header>`;
    html += `<p style="color:#8b949e;margin-bottom:1rem">${p.description || ''} (v${p.version || '?'})</p>`;
    html += (p.levels || []).map(l => `<div class="pipeline-card">
      <h3>Level: ${l.name}</h3>
      <div style="margin-top:0.5rem">${(l.agents || []).map(a => `<span class="pill ${l.parallel ? 'parallel' : 'sequential'}">${a}</span>`).join('')}</div>
      <span style="font-size:0.75rem;color:#8b949e">${l.parallel ? '⚡ Parallel' : '→ Sequential'}</span>
    </div>`).join('');
    app.innerHTML = html;
  } catch {
    app.innerHTML = `<div style="color:#f85149;text-align:center;padding:2rem">Pipeline not found: ${name}</div>`;
  }
}

// ── Models ──
async function renderModels() {
  app.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const data = await fetchJSON('/api/models');
    let html = `<header><h2>Models</h2><span>${data.count} total</span></header>`;
    html += `<table><thead><tr><th>ID</th><th>Name</th><th>Provider</th><th>Context</th></tr></thead><tbody>`;
    for (const m of data.models) {
      html += `<tr><td><code>${m.id}</code></td><td>${m.name}</td><td>${m.provider}</td><td>${m.context.toLocaleString()}</td></tr>`;
    }
    html += `</tbody></table>`;
    app.innerHTML = html;
  } catch {
    app.innerHTML = `<div style="color:#f85149;text-align:center;padding:2rem">Models not available</div>`;
  }
}

// ── Runs (placeholder) ──
function renderRuns() {
  app.innerHTML = `<header><h2>Execution Runs</h2></header>
    <div style="text-align:center;padding:3rem;color:#8b949e">
      <p style="font-size:1.1rem;margin-bottom:0.5rem">No execution data yet</p>
      <p>Run pipelines to see execution history here.</p>
    </div>`;
}

// ── Utils ──
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Init ──
navigate();
