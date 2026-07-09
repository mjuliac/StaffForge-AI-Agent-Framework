import { DAG } from '@staffforge/core';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) { passed++; }
  else { console.error(`FAIL  ${name}`); failed++; }
}

// Test 1: Empty DAG
{
  const dag = new DAG();
  assert(dag.nodeCount() === 0, 'empty dag node count');
  assert(dag.edgeCount() === 0, 'empty dag edge count');
  assert(dag.topologicalSort().length === 0, 'empty dag topo sort');
  assert(dag.validate().valid === true, 'empty dag valid');
}

// Test 2: Single node
{
  const dag = new DAG();
  dag.addNode('a', { name: 'Agent A' });
  assert(dag.nodeCount() === 1, 'single node count');
  assert(dag.topologicalSort().join(',') === 'a', 'single node topo sort');
  assert(dag.getNode('a').name === 'Agent A', 'single node data');
}

// Test 3: Linear chain
{
  const dag = new DAG();
  dag.addNode('a').addNode('b').addNode('c');
  dag.addEdge('a', 'b').addEdge('b', 'c');
  const levels = dag.getLevels();
  assert(levels.length === 3, 'linear chain levels count');
  assert(levels[0][0] === 'a', 'linear chain level 0');
  assert(levels[1][0] === 'b', 'linear chain level 1');
  assert(levels[2][0] === 'c', 'linear chain level 2');
}

// Test 4: Parallel levels
{
  const dag = new DAG();
  dag.addNode('a').addNode('b').addNode('c').addNode('d');
  dag.addEdge('a', 'b').addEdge('a', 'c').addEdge('b', 'd').addEdge('c', 'd');
  const levels = dag.getLevels();
  assert(levels.length === 3, 'parallel levels count');
  assert(levels[0][0] === 'a', 'parallel level 0');
  assert(levels[1].sort().join(',') === 'b,c', 'parallel level 1');
  assert(levels[2][0] === 'd', 'parallel level 2');
}

// Test 5: Diamond DAG
{
  const dag = new DAG();
  dag.addNode('start').addNode('mid1').addNode('mid2').addNode('end');
  dag.addEdge('start', 'mid1').addEdge('start', 'mid2');
  dag.addEdge('mid1', 'end').addEdge('mid2', 'end');
  const topo = dag.topologicalSort();
  assert(topo[0] === 'start', 'diamond first');
  assert(topo[topo.length - 1] === 'end', 'diamond last');
}

// Test 6: Cycle detection
{
  const dag = new DAG();
  dag.addNode('x').addNode('y').addNode('z');
  dag.addEdge('x', 'y').addEdge('y', 'z').addEdge('z', 'x');
  const result = dag.validate();
  assert(result.valid === false, 'cycle detection');
  assert(result.error.includes('Cycle'), 'cycle error message');
  try {
    dag.topologicalSort();
    assert(false, 'cycle should throw');
  } catch (e) {
    assert(e.message.includes('Cycle'), 'cycle throws correctly');
  }
}

// Test 7: Self-loop detection
{
  const dag = new DAG();
  dag.addNode('self');
  dag.addEdge('self', 'self');
  const result = dag.validate();
  assert(result.valid === false, 'self-loop detection');
}

// Test 8: Unconnected nodes
{
  const dag = new DAG();
  dag.addNode('a').addNode('b').addNode('c');
  assert(dag.nodeCount() === 3, 'unconnected count');
  assert(dag.edgeCount() === 0, 'unconnected edges');
  const topo = dag.topologicalSort();
  assert(topo.length === 3, 'unconnected topo length');
}

// Test 9: getLevels with unconnected
{
  const dag = new DAG();
  dag.addNode('a').addNode('b').addNode('c');
  const levels = dag.getLevels();
  assert(levels.length === 1, 'unconnected single level');
  assert(levels[0].length === 3, 'unconnected level has all');
}

// Test 10: addEdges helper
{
  const dag = new DAG();
  dag.addNode('a').addNode('b').addNode('c').addNode('d');
  dag.addEdges('a', ['b', 'c']);
  dag.addEdge('b', 'd');
  const levels = dag.getLevels();
  assert(levels[1].sort().join(',') === 'b,c', 'addEdges helper');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
