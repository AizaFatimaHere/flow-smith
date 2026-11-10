const svg = document.getElementById('svg');
const viewport = document.getElementById('viewport');
const nodesLayer = document.getElementById('nodes');
const edgesLayer = document.getElementById('edges');
const NS = 'http://www.w3.org/2000/svg';

let nodes = [];
let edges = [];
let selectedId = null;

function addNode(x = 180, y = 120, type = 'process', label = 'Process') {
  const sizes = { process: [150, 64], terminator: [150, 52], decision: [110, 110], document: [160, 78], database: [150, 78] };
  const size = sizes[type] || sizes.process;
  const node = {
    id: 'n' + Math.random().toString(36).slice(2, 9),
    x, y, w: size[0], h: size[1], type, label,
    fill: '#ffffff', stroke: '#3b82f6'
  };
  nodes.push(node);
  render();
  saveWorkflow();
  return node;
}

function drawShape(group, node) {
  const shape = document.createElementNS(NS, node.type === 'document' ? 'path' : 'rect');
  if (node.type === 'terminator') shape.setAttribute('rx', '24');
  else if (node.type === 'decision') shape.setAttribute('transform', `rotate(45 ${node.w / 2} ${node.h / 2})`);
  else shape.setAttribute('rx', '8');
  if (node.type === 'document') shape.setAttribute('d', `M0 0 H${node.w} V${node.h - 14} Q${node.w / 2} ${node.h + 8} 0 ${node.h - 14} Z`);
  shape.setAttribute('width', node.w);
  shape.setAttribute('height', node.h);
  shape.setAttribute('class', 'shape');
  shape.setAttribute('fill', node.fill || '#fff');
  shape.setAttribute('stroke', node.stroke || '#3b82f6');
  group.appendChild(shape);
}

function render() {
  nodesLayer.innerHTML = '';
  for (const node of nodes) {
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'node' + (node.id === selectedId ? ' selected' : ''));
    group.setAttribute('data-id', node.id);
    group.setAttribute('transform', `translate(${node.x},${node.y})`);
    drawShape(group, node);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', node.w / 2);
    label.setAttribute('y', node.h / 2 + 5);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = node.label;
    group.appendChild(label);
    group.addEventListener('pointerdown', startDrag);
    group.addEventListener('click', (event) => {
      if (event.shiftKey && selectedId && selectedId !== node.id) {
        addEdge(selectedId, node.id);
        selectedId = null;
        render();
      } else {
        selectedId = node.id;
        render();
      }
    });
    group.addEventListener('dblclick', () => openSettings(node));
    group.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      duplicateNode(node);
    });
    nodesLayer.appendChild(group);
  }
  renderEdges();
}

function startDrag(event) {
  if (event.button !== 0) return;
  const node = nodes.find(item => item.id === event.currentTarget.dataset.id);
  if (!node) return;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const start = point.matrixTransform(viewport.getScreenCTM().inverse());
  const offsetX = start.x - node.x;
  const offsetY = start.y - node.y;

  function move(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const current = p.matrixTransform(viewport.getScreenCTM().inverse());
    node.x = Math.round(current.x - offsetX);
    node.y = Math.round(current.y - offsetY);
    render();
  }
  function stop() {
    svg.removeEventListener('pointermove', move);
    saveWorkflow();
  }
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', stop, { once: true });
  svg.addEventListener('pointercancel', stop, { once: true });
}
function addEdge(from, to) {
  if (edges.some(edge => edge.from === from && edge.to === to)) return;
  edges.push({ id: 'e' + Math.random().toString(36).slice(2, 8), from, to });
  renderEdges();
  saveWorkflow();
}

function renderEdges() {
  edgesLayer.innerHTML = '';
  for (const edge of edges) {
    const from = nodes.find(node => node.id === edge.from);
    const to = nodes.find(node => node.id === edge.to);
    if (!from || !to) continue;
    const path = document.createElementNS(NS, 'path');
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h;
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const mid = (y1 + y2) / 2;
    path.setAttribute('d', `M${x1} ${y1} C${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`);
    path.setAttribute('class', 'edge');
    path.setAttribute('marker-end', 'url(#arrow)');
    edgesLayer.appendChild(path);
  }
}

const settings = document.getElementById('settings');
let editingId = null;

function openSettings(node) {
  editingId = node.id;
  document.getElementById('nodeLabel').value = node.label;
  document.getElementById('nodeType').value = node.type;
  document.getElementById('nodeFill').value = node.fill || '#ffffff';
  document.getElementById('nodeStroke').value = node.stroke || '#3b82f6';
  settings.classList.remove('hidden');
}

document.getElementById('saveNode').addEventListener('click', () => {
  const node = nodes.find(item => item.id === editingId);
  if (!node) return;
  node.label = document.getElementById('nodeLabel').value.trim() || node.label;
  node.type = document.getElementById('nodeType').value;
  node.fill = document.getElementById('nodeFill').value;
  node.stroke = document.getElementById('nodeStroke').value;
  const sizes = { process: [150, 64], terminator: [150, 52], decision: [110, 110], document: [160, 78], database: [150, 78] };
  [node.w, node.h] = sizes[node.type] || sizes.process;
  render();
  settings.classList.add('hidden');
  saveWorkflow();
});
document.getElementById('closeSettings').addEventListener('click', () => settings.classList.add('hidden'));

function duplicateNode(node) {
  const copy = { ...node, id: 'n' + Math.random().toString(36).slice(2, 9), x: node.x + 24, y: node.y + 24 };
  nodes.push(copy);
  render();
  saveWorkflow();
}

window.addEventListener('keydown', (event) => {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
    nodes = nodes.filter(node => node.id !== selectedId);
    edges = edges.filter(edge => edge.from !== selectedId && edge.to !== selectedId);
    selectedId = null;
    render();
    saveWorkflow();
  }
});

let pan = { x: 0, y: 0 };
let scale = 1;
let panStart = null;

svg.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.node')) return;
  if (event.button !== 0 && event.button !== 1) return;
  panStart = { x: event.clientX, y: event.clientY, left: pan.x, top: pan.y };
});
svg.addEventListener('pointermove', (event) => {
  if (!panStart) return;
  pan.x = panStart.left + event.clientX - panStart.x;
  pan.y = panStart.top + event.clientY - panStart.y;
  applyView();
});
svg.addEventListener('pointerup', () => panStart = null);
svg.addEventListener('pointercancel', () => panStart = null);
svg.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  scale = Math.max(0.25, Math.min(3, scale + (event.deltaY < 0 ? 0.1 : -0.1)));
  applyView();
}, { passive: false });

function applyView() {
  viewport.setAttribute('transform', `translate(${pan.x},${pan.y}) scale(${scale})`);
}

function saveWorkflow() {
  try {
    localStorage.setItem('wf:nodes', JSON.stringify(nodes));
    localStorage.setItem('wf:edges', JSON.stringify(edges));
  } catch (error) {
    console.warn('Could not save this workflow.');
  }
}

function loadWorkflow() {
  try {
    nodes = JSON.parse(localStorage.getItem('wf:nodes')) || [];
    edges = JSON.parse(localStorage.getItem('wf:edges')) || [];
  } catch (error) {
    nodes = [];
    edges = [];
  }
}
loadWorkflow();

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear this workflow?')) return;
  nodes = [];
  edges = [];
  saveWorkflow();
  render();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const file = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'workflow.json';
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) throw new Error('Invalid workflow');
      nodes = data.nodes;
      edges = data.edges;
      saveWorkflow();
      render();
    } catch (error) {
      alert('That file is not a valid workflow.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
});

document.getElementById('addNode').addEventListener('click', () => {
  addNode(180 + nodes.length * 18, 120 + nodes.length * 18, 'process', 'New step');
});

if (!nodes.length) {
  addNode(180, 120, 'terminator', 'Start');
  addNode(180, 240, 'process', 'First step');
}
render();
