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
  }
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', stop, { once: true });
  svg.addEventListener('pointercancel', stop, { once: true });
}
function renderEdges() { edgesLayer.innerHTML = ''; }

document.getElementById('addNode').addEventListener('click', () => {
  addNode(180 + nodes.length * 18, 120 + nodes.length * 18, 'process', 'New step');
});

if (!nodes.length) {
  addNode(180, 120, 'terminator', 'Start');
  addNode(180, 240, 'process', 'First step');
}
render();
