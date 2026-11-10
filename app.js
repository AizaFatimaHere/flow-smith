const {
  uid,
  defaultColors,
  humanSize,
  toColor
} = window.FlowSmith;

let nodes = [];
let edges = [];
const nodesG = document.getElementById('nodes');
const edgesG = document.getElementById('edges');
edgesG.style.pointerEvents = 'auto';
const svg = document.getElementById('svg');
const viewport = document.getElementById('viewport');

const STATE = {
  drag: null,
  selectedId: null,
  panning: null,
  panX: 0,
  panY: 0,
  scale: 1,
  spaceHeld: false,
  connect: null,
  hoverId: null,
  selectedEdgeId: null
};
const NODE_BASE = {
  w: 160,
  h: 72
};
const NODE_SPECS = {
  terminator: {
    w: 160,
    h: 56
  },
  process: {
    w: 180,
    h: 72
  },
  decision: {
    w: 120,
    h: 120
  },
  document: {
    w: 180,
    h: 90
  },
  database: {
    w: 160,
    h: 90
  },
  input_output: {
    w: 180,
    h: 72
  },
  display: {
    w: 180,
    h: 72
  },
  manual_operation: {
    w: 180,
    h: 72
  },
  merge: {
    w: 120,
    h: 110
  },
  manual_input: {
    w: 180,
    h: 72
  },
  connector: {
    w: 64,
    h: 64
  },
  internal_storage: {
    w: 160,
    h: 80
  }
};

function addNode({
  x = 260,
  y = 160,
  type = 'process',
  label = 'Process',
  details = '',
  fill,
  stroke
} = {}) {
  const s = NODE_SPECS[type] || NODE_BASE;
  const colors = defaultColors();
  const n = {
    id: uid(),
    x,
    y,
    w: s.w,
    h: s.h,
    type,
    label,
    details,
    fill: fill??colors.fill,
    stroke: stroke??colors.stroke,
    attachments: []
  };
  nodes.push(n);
  render();
  persist();
  return n;
}

function addEdge(from, to) {
  const existing = edges.find(e => e.from === from && e.to === to);
  if (existing) return existing.id;
  const id = 'e' + Math.random().toString(36).slice(2, 9);
  edges.push({
    id,
    from,
    to
  });
  renderEdges();
  persist();
  return id;
}
const getNode = (id) => nodes.find(n => n.id === id);

function createChildNode(parent) {
  if (!parent) return null;
  const gap = 120; // vertical spacing
  const child = addNode({
    x: parent.x,
    y: parent.y + parent.h + gap,
    type: 'process',
    label: 'Step'
  });
  addEdge(parent.id, child.id);
  return child;
}

function duplicateNode(srcId) {
  const src = getNode(srcId);
  if (!src) return null;
  const copy = addNode({
    x: src.x + 24,
    y: src.y + 24,
    type: src.type,
    label: src.label,
    details: src.details,
    fill: src.fill,
    stroke: src.stroke
  });
  if (src.attachments && src.attachments.length) {
    copy.attachments = src.attachments.filter(a => !a.sessionOnly).map(a => ({
      ...a
    }));
  }
  persist();
  return copy;
}

function drawShape(g, n) {
  const {
    w,
    h
  } = n;
  const NS = 'http://www.w3.org/2000/svg';
  const make = (name, attrs) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    e.setAttribute('class', 'shape');
    e.setAttribute('stroke', n.stroke);
    e.setAttribute('fill', n.fill);
    return e;
  };
  const add = e => g.appendChild(e);
  if (n.type === 'process' || n.type === 'internal_storage') {
    add(make('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 8,
      ry: 8
    }));
    if (n.type === 'internal_storage') {
      const line = document.createElementNS(NS, 'path');
      line.setAttribute('d', `M0 ${h*0.25} H ${w}`);
      line.setAttribute('class', 'shape');
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', n.stroke);
      g.appendChild(line);
    }
  } else if (n.type === 'terminator') {
    add(make('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 24,
      ry: 24
    }));
  } else if (n.type === 'decision') {
    add(make('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      transform: `rotate(45 ${w/2} ${h/2})`
    }));
  } else if (n.type === 'document') {
    add(make('path', {
      d: `M0 0 H ${w} V ${h-16} q -20 16 -40 16 H 0 Z`
    }));
  } else if (n.type === 'database') {
    add(make('rect', {
      x: 0,
      y: 14,
      width: w,
      height: h - 28,
      rx: 8,
      ry: 8
    }));
    const top = make('ellipse', {
      cx: w / 2,
      cy: 14,
      rx: w / 2 - 6,
      ry: 10
    });
    add(top);
    const bot = make('ellipse', {
      cx: w / 2,
      cy: h - 14,
      rx: w / 2 - 6,
      ry: 10
    });
    add(bot);
  } else if (n.type === 'input_output') {
    add(make('path', {
      d: `M18 0 H ${w} L ${w-18} ${h} H 0 Z`
    }));
  } else if (n.type === 'display') {
    add(make('path', {
      d: `M10 0 H ${w-10} a10 10 0 0 1 10 10 V ${h-20} a10 10 0 0 1 -10 10 H 10 a10 10 0 0 1 -10 -10 V 10 a10 10 0 0 1 10 -10 Z`
    }));
  } else if (n.type === 'manual_operation') {
    add(make('path', {
      d: `M20 0 H ${w-20} L ${w} ${h} H 0 Z`
    }));
  } else if (n.type === 'merge') {
    add(make('path', {
      d: `M${w/2} ${h} L ${w} 0 H 0 Z`
    }));
  } else if (n.type === 'manual_input') {
    add(make('path', {
      d: `M0 16 L ${w} 0 V ${h} H 0 Z`
    }));
  } else if (n.type === 'connector') {
    add(make('circle', {
      cx: w / 2,
      cy: h / 2,
      r: Math.min(w, h) / 2
    }));
  } else {
    add(make('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 8,
      ry: 8
    }));
  }
}
const labelY = (n) => n.h / 2 + 5;

function render() {
  nodesG.innerHTML = '';
  for (const n of nodes) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', n.id);
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    g.setAttribute('class', 'node');
    drawShape(g, n);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', n.w / 2);
    text.setAttribute('y', labelY(n));
    text.setAttribute('text-anchor', 'middle');
    text.textContent = n.label;
    g.appendChild(text);
    const dotH = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dotH.setAttribute('class', 'conn-dot');
    dotH.setAttribute('transform', `translate(${n.w/2-8},${n.h+6-8})`);
    dotH.innerHTML = '<circle cx="8" cy="8" r="8" fill="#e2e8f0" stroke="#64748b"/><path d="M4 8 H12" stroke="#64748b" stroke-width="1.5"/>';
    const addG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    addG.setAttribute('class', 'add-dot');
    addG.setAttribute('transform', `translate(${n.w/2-8},${n.h+22})`);
    addG.innerHTML = '<circle cx="8" cy="8" r="8" fill="#3b82f6" stroke="#1d4ed8"/><path d="M8 4 V12 M4 8 H12" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>';
    addG.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const child = createChildNode(n);
      if (child) {
        render();
        persist();
      }
    });

    g.appendChild(dotH);
    g.appendChild(addG);

    dotH.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      startConnect(n, e);
    });
    g.addEventListener('pointerdown', onDragStart);
    g.addEventListener('click', (e) => {
      if (e.target.closest('.conn-dot')) return;
      openPopover(n);
      e.stopPropagation();
    });
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      inlineEditLabel(n);
    });
    g.addEventListener('pointerenter', () => {
      STATE.hoverId = n.id;
    });
    g.addEventListener('pointerleave', () => {
      if (STATE.hoverId === n.id) STATE.hoverId = null;
    });
    nodesG.appendChild(g);
  }
  renderEdges();
}

function renderEdges() {
  edgesG.innerHTML = '';
  for (const e of edges) {
    const a = getNode(e.from),
      b = getNode(e.to);
    if (!a || !b) continue;
    let d;
    if (a === b) {
      const sx = a.x + a.w,
        sy = a.y + a.h / 2;
      const ox = Math.max(40, Math.min(80, a.w));
      const oy = Math.max(30, Math.min(60, a.h));
      d = `M ${sx} ${sy} C ${sx+ox} ${sy-oy}, ${sx+ox} ${sy+oy}, ${sx} ${sy}`;
    } else {
      const ax = a.x + a.w / 2,
        ay = a.y + a.h,
        bx = b.x + b.w / 2,
        by = b.y,
        midY = (ay + by) / 2;
      d = `M ${ax} ${ay-10} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by+10}`;
    }
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('class', 'edge-hit');
    hit.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectEdge(e.id);
    });
    edgesG.appendChild(hit);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `edge${STATE.selectedEdgeId===e.id?' selected':''}`);
    path.setAttribute('marker-end', 'url(#arrow)');
    path.style.cursor = 'pointer';
    path.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectEdge(e.id);
    });
    edgesG.appendChild(path);
  }
  if (tempEdgeEl) edgesG.appendChild(tempEdgeEl);
}

function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const inv = viewport.getScreenCTM().inverse();
  return pt.matrixTransform(inv);
}

function onDragStart(e) {
  const g = e.currentTarget;
  const id = g.getAttribute('data-id');
  STATE.selectedId = id;
  const n = getNode(id);
  if (e.shiftKey) {
    startConnect(n, e);
    return;
  }
  if (e.target.closest('.conn-dot')) return;
  const p = svgPoint(e);
  STATE.drag = {
    id,
    dx: p.x - n.x,
    dy: p.y - n.y
  };
  svg.addEventListener('pointermove', onDrag);
  svg.addEventListener('pointerup', onDragEnd, {
    once: true
  });
}

function onDrag(e) {
  if (!STATE.drag) return;
  const n = getNode(STATE.drag.id);
  const p = svgPoint(e);
  n.x = Math.round(p.x - STATE.drag.dx);
  n.y = Math.round(p.y - STATE.drag.dy);
  render();
}

function onDragEnd() {
  STATE.drag = null;
  persist();
  svg.removeEventListener('pointermove', onDrag);
}

let tempEdgeEl = null;

function ensureTempEdge() {
  if (!tempEdgeEl) {
    tempEdgeEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempEdgeEl.setAttribute('class', 'tmp-edge');
    tempEdgeEl.style.pointerEvents = 'none';
    edgesG.appendChild(tempEdgeEl);
  }
  return tempEdgeEl;
}

function startConnect(n, evt) {
  const startX = n.x + n.w / 2,
    startY = n.y + n.h / 2;
  STATE.connect = {
    fromId: n.id,
    sx: startX,
    sy: startY
  };
  const p = svgPoint(evt);
  ensureTempEdge().setAttribute('d', `M ${startX} ${startY} C ${startX} ${(startY+p.y)/2}, ${p.x} ${(startY+p.y)/2}, ${p.x} ${p.y}`);
  svg.addEventListener('pointermove', onConnectMove);
  svg.addEventListener('pointerup', endConnect, {
    once: true
  });
}

function onConnectMove(e) {
  if (!STATE.connect) return;
  STATE.lastClient = {
    x: e.clientX,
    y: e.clientY
  };
  const p = svgPoint(e);
  const {
    sx,
    sy
  } = STATE.connect;
  ensureTempEdge().setAttribute('d', `M ${sx} ${sy} C ${sx} ${(sy+p.y)/2}, ${p.x} ${(sy+p.y)/2}, ${p.x} ${p.y}`);
}

function endConnect() {
  if (STATE.connect) {
    let to = null;
    if (STATE.lastClient) {
      const el = document.elementFromPoint(STATE.lastClient.x, STATE.lastClient.y);
      const g = el && el.closest && el.closest('g.node');
      if (g) to = g.getAttribute('data-id');
    }
    if (!to) {
      const from = STATE.connect.fromId;
      to = STATE.hoverId && STATE.hoverId !== from ? STATE.hoverId : null;
    }
    const fromId = STATE.connect.fromId;
    if (to) addEdge(fromId, to);
  }
  if (tempEdgeEl) {
    edgesG.removeChild(tempEdgeEl);
    tempEdgeEl = null;
  }
  STATE.connect = null;
  svg.removeEventListener('pointermove', onConnectMove);
}

function applyView() {
  viewport.setAttribute('transform', `translate(${STATE.panX},${STATE.panY}) scale(${STATE.scale})`);
  renderEdges();
}
svg.addEventListener('pointerdown', (e) => {
  const isBackground = e.target === svg || e.target === edgesG || e.target === nodesG || e.target.closest('#viewport') === null;
  const panBtn = e.button === 1 || e.button === 2;
  if (isBackground || panBtn || STATE.spaceHeld) {
    STATE.panning = {
      start: svgPoint(e),
      startPanX: STATE.panX,
      startPanY: STATE.panY
    };
    svg.style.cursor = 'grab';
    e.preventDefault();
  }
});
svg.addEventListener('pointermove', (e) => {
  if (!STATE.panning) return;
  const p = svgPoint(e);
  const dx = p.x - STATE.panning.start.x;
  const dy = p.y - STATE.panning.start.y;
  STATE.panX = STATE.panning.startPanX + dx;
  STATE.panY = STATE.panning.startPanY + dy;
  applyView();
});
svg.addEventListener('pointerup', () => {
  STATE.panning = null;
  svg.style.cursor = '';
});
svg.addEventListener('pointerleave', () => {
  STATE.panning = null;
  svg.style.cursor = '';
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    STATE.spaceHeld = true;
    svg.style.cursor = 'grab';
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    STATE.spaceHeld = false;
    svg.style.cursor = '';
  }
});

svg.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const zoomFactor = 1 + Math.abs(e.deltaY) * 0.0015;
  const oldScale = STATE.scale;
  const newScale = e.deltaY < 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  STATE.scale = clamp(newScale, 0.25, 3);
  const p = svgPoint(e);
  STATE.panX = p.x - (p.x - STATE.panX) * (STATE.scale / oldScale);
  STATE.panY = p.y - (p.y - STATE.panY) * (STATE.scale / oldScale);
  applyView();
}, {
  passive: false
});

function selectEdge(id) {
  STATE.selectedEdgeId = id;
  renderEdges();
}

function deleteSelectedEdge() {
  if (!STATE.selectedEdgeId) return;
  edges = edges.filter(e => e.id !== STATE.selectedEdgeId);
  STATE.selectedEdgeId = null;
  renderEdges();
  persist();
}
window.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && STATE.selectedEdgeId) {
    e.preventDefault();
    deleteSelectedEdge();
  }
});
const pop = document.getElementById('popover');
const pLabel = document.getElementById('pLabel');
const pType = document.getElementById('pType');
const pDetails = document.getElementById('pDetails');
const pFill = document.getElementById('pFill');
const pStroke = document.getElementById('pStroke');
const pFile = document.getElementById('pFile');
const pAddFile = document.getElementById('pAddFile');
const pFilesList = document.getElementById('pFilesList');
const attachHint = document.getElementById('attachHint');
const MAX_EMBED_SIZE = 200 * 1024;
let popNodeId = null;
const labelEditor = document.getElementById('labelEditor');

const getActiveNode = () => nodes.find(n => n.id === popNodeId);

function renderFilesList(n) {
  if (!n.attachments) n.attachments = [];
  pFilesList.innerHTML = '';
  n.attachments.forEach((att, idx) => {
    const li = document.createElement('li');
    li.className = 'flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1';
    const left = document.createElement('div');
    left.className = 'min-w-0';
    left.innerHTML = `<div class="truncate text-slate-700">${att.name}</div><div class="text-[11px] text-slate-400">${humanSize(att.size)}${att.sessionOnly?' · session-only':''}</div>`;
    const right = document.createElement('div');
    right.className = 'flex items-center gap-2 flex-shrink-0';
    const a = document.createElement('a');
    a.className = 'text-xs text-blue-600 hover:underline';
    a.textContent = 'Open';
    a.target = '_blank';
    a.rel = 'noopener';
    a.href = att.dataUrl || att.blobUrl || '#';
    const del = document.createElement('button');
    del.className = 'text-xs text-rose-600 hover:underline';
    del.textContent = 'Remove';
    del.addEventListener('click', () => {
      if (att.blobUrl) URL.revokeObjectURL(att.blobUrl);
      n.attachments.splice(idx, 1);
      renderFilesList(n);
      persist();
    });
    right.appendChild(a);
    right.appendChild(del);
    li.appendChild(left);
    li.appendChild(right);
    pFilesList.appendChild(li);
  });
  attachHint.textContent = 'Small files persist; large files are session‑only';
}

function addAttachmentFromFile(n, file) {
  if (!n.attachments) n.attachments = [];
  if (file.size <= MAX_EMBED_SIZE) {
    const fr = new FileReader();
    fr.onload = () => {
      n.attachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: fr.result,
        sessionOnly: false
      });
      renderFilesList(n);
      persist();
    };
    fr.readAsDataURL(file);
  } else {
    const url = URL.createObjectURL(file);
    n.attachments.push({
      name: file.name,
      size: file.size,
      type: file.type,
      blobUrl: url,
      sessionOnly: true
    });
    renderFilesList(n);
    persist();
  }
}

pAddFile.addEventListener('click', () => {
  const n = getActiveNode();
  if (!n) return;
  const f = pFile.files && pFile.files[0];
  if (!f) return;
  addAttachmentFromFile(n, f);
  pFile.value = '';
});

function openPopover(n) {
  popNodeId = n.id;
  pLabel.value = n.label;
  pType.value = n.type;
  pDetails.value = n.details || '';
  pFill.value = toColor(n.fill);
  pStroke.value = toColor(n.stroke);
  if (!n.attachments) n.attachments = [];
  renderFilesList(n);
  const pt = svg.createSVGPoint();
  pt.x = n.x + n.w + 8;
  pt.y = n.y;
  const scr = pt.matrixTransform(viewport.getScreenCTM());
  pop.style.left = scr.x + 'px';
  pop.style.top = scr.y + 'px';
  pop.classList.remove('hidden');
  setTimeout(() => pop.classList.add('popover-active'), 0);
}

function closePopover() {
  pop.classList.add('hidden');
  pop.classList.remove('popover-active');
  popNodeId = null;
}
document.getElementById('closePop').addEventListener('click', closePopover);

document.getElementById('pSave').addEventListener('click', () => {
  const n = getNode(popNodeId);
  if (!n) return;
  n.label = pLabel.value || n.label;
  n.type = pType.value;
  n.details = pDetails.value;
  n.fill = pFill.value;
  n.stroke = pStroke.value;
  const s = NODE_SPECS[n.type] || NODE_BASE;
  n.w = s.w;
  n.h = s.h;
  render();
  persist();
  closePopover();
});
document.getElementById('pDelete').addEventListener('click', () => {
  if (!popNodeId) return;
  nodes = nodes.filter(n => n.id !== popNodeId);
  edges = edges.filter(e => e.from !== popNodeId && e.to !== popNodeId);
  render();
  persist();
  closePopover();
});
document.getElementById('pDuplicate').addEventListener('click', () => {
  duplicateNode(popNodeId);
});

function inlineEditLabel(n) {
  labelEditor.value = n.label;
  const pt = svg.createSVGPoint();
  pt.x = n.x + n.w / 2 - 60;
  pt.y = n.y + n.h / 2 - 14;
  const scr = pt.matrixTransform(viewport.getScreenCTM());
  labelEditor.style.left = scr.x + 'px';
  labelEditor.style.top = scr.y + 'px';
  labelEditor.classList.remove('hidden');
  labelEditor.focus();
  labelEditor.select();

  function commit() {
    n.label = labelEditor.value.trim() || n.label;
    labelEditor.classList.add('hidden');
    render();
    persist();
    labelEditor.removeEventListener('keydown', onKey);
    labelEditor.removeEventListener('blur', onBlur);
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      labelEditor.classList.add('hidden');
      labelEditor.removeEventListener('keydown', onKey);
      labelEditor.removeEventListener('blur', onBlur);
    }
  }

  function onBlur() {
    commit();
  }
  labelEditor.addEventListener('keydown', onKey);
  labelEditor.addEventListener('blur', onBlur);
}
document.getElementById('addStartBtn').addEventListener('click', () => {
  addNode({
    x: 300,
    y: 120,
    type: 'terminator',
    label: 'Start'
  });
});
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Clear the canvas and local data?')) {
    nodes = [];
    edges = [];
    STATE.panX = 0;
    STATE.panY = 0;
    STATE.scale = 1;
    applyView();
    render();
    persist();
    closePopover();
    localStorage.removeItem('wf:nodes');
    localStorage.removeItem('wf:edges');
  }
});
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    nodes,
    edges,
    view: {
      panX: STATE.panX,
      panY: STATE.panY,
      scale: STATE.scale
    }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workflow.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importInput').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const obj = JSON.parse(r.result);
      nodes = obj.nodes || [];
      edges = (obj.edges || []).filter(e => e.from && e.to);
      const v = obj.view || {};
      STATE.panX = v.panX || 0;
      STATE.panY = v.panY || 0;
      STATE.scale = v.scale || 1;
      applyView();
      render();
      persist();
    } catch {
      alert('Invalid JSON');
    }
  };
  r.readAsText(f);
});

function persist() {
  saveWorkflow(nodes, edges);
}

function load() {
  try {
    nodes = JSON.parse(localStorage.getItem('wf:nodes')) || [];
    edges = JSON.parse(localStorage.getItem('wf:edges')) || [];
  } catch {}
  if (nodes.length === 0) {
    const s = addNode({
      x: 300,
      y: 120,
      type: 'terminator',
      label: 'Start'
    });
    const a = addNode({
      x: 300,
      y: 280,
      type: 'process',
      label: 'Action'
    });
    addEdge(s.id, a.id);
  }
  render();

}
svg.addEventListener('click', (e) => {
  const clickedEdge = e.target && e.target.closest && e.target.closest('path.edge');
  if (!clickedEdge) {
    STATE.selectedEdgeId = null;
    renderEdges();
  }
  if (e.target === svg || e.target.closest('#edges')) closePopover();
});

load();