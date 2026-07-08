export class DAG {
  constructor() {
    this._nodes = new Map();
    this._edges = new Map();
    this._reverse = new Map();
  }

  addNode(id, data = null) {
    if (!this._nodes.has(id)) {
      this._nodes.set(id, data);
      this._edges.set(id, []);
      this._reverse.set(id, []);
    }
    return this;
  }

  addEdge(fromId, toId) {
    if (!this._nodes.has(fromId)) throw new Error(`Node "${fromId}" not found`);
    if (!this._nodes.has(toId)) throw new Error(`Node "${toId}" not found`);

    if (!this._edges.get(fromId).includes(toId)) {
      this._edges.get(fromId).push(toId);
      this._reverse.get(toId).push(fromId);
    }
    return this;
  }

  addEdges(fromId, toIds) {
    for (const toId of toIds) this.addEdge(fromId, toId);
    return this;
  }

  getNode(id) {
    return this._nodes.get(id) || null;
  }

  hasNode(id) {
    return this._nodes.has(id);
  }

  getEdges(fromId) {
    return this._edges.get(fromId) || [];
  }

  getReverseEdges(toId) {
    return this._reverse.get(toId) || [];
  }

  nodeCount() {
    return this._nodes.size;
  }

  edgeCount() {
    let count = 0;
    for (const [, edges] of this._edges) count += edges.length;
    return count;
  }

  topologicalSort() {
    const inDegree = new Map();
    for (const id of this._nodes.keys()) {
      inDegree.set(id, 0);
    }
    for (const [, targets] of this._edges) {
      for (const t of targets) {
        inDegree.set(t, (inDegree.get(t) || 0) + 1);
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted = [];
    while (queue.length > 0) {
      const id = queue.shift();
      sorted.push(id);
      for (const dep of this._edges.get(id) || []) {
        const newDeg = inDegree.get(dep) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) queue.push(dep);
      }
    }

    if (sorted.length !== this._nodes.size) {
      const missing = [...this._nodes.keys()].filter((id) => !sorted.includes(id));
      throw new Error(`Cycle detected involving: ${missing.join(', ')}`);
    }

    return sorted;
  }

  getLevels() {
    const inDegree = new Map();
    for (const id of this._nodes.keys()) inDegree.set(id, 0);
    for (const [, targets] of this._edges) {
      for (const t of targets) inDegree.set(t, (inDegree.get(t) || 0) + 1);
    }

    const levels = [];
    let current = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) current.push(id);
    }

    const remaining = new Map(inDegree);
    while (current.length > 0) {
      levels.push([...current]);
      const next = [];
      for (const id of current) {
        for (const dep of this._edges.get(id) || []) {
          const newDeg = remaining.get(dep) - 1;
          remaining.set(dep, newDeg);
          if (newDeg === 0) next.push(dep);
        }
      }
      current = next;
    }

    const executed = new Set(levels.flat());
    if (executed.size !== this._nodes.size) {
      const missing = [...this._nodes.keys()].filter((id) => !executed.has(id));
      throw new Error(`Cycle detected involving: ${missing.join(', ')}`);
    }

    return levels;
  }

  validate() {
    try {
      this.topologicalSort();
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  toJSON() {
    const nodes = [];
    for (const [id, data] of this._nodes) {
      nodes.push({
        id,
        data,
        edges: this._edges.get(id) || [],
        reverse: this._reverse.get(id) || [],
      });
    }
    return { nodes, edgeCount: this.edgeCount() };
  }

  static fromAgents(agents) {
    const dag = new DAG();
    for (const agent of agents) {
      dag.addNode(agent.id, agent);
    }
    for (const agent of agents) {
      const prereqs = [...(agent.frontmatter.depends_on || []), ...(agent.frontmatter.after || [])];
      for (const dep of prereqs) {
        if (dag.hasNode(dep)) {
          dag.addEdge(dep, agent.id);
        }
      }
      const before = agent.frontmatter.before || [];
      for (const dep of before) {
        if (dag.hasNode(dep)) {
          dag.addEdge(agent.id, dep);
        }
      }
    }
    return dag;
  }
}

export default DAG;
