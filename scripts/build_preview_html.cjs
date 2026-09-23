const fs = require('fs');
const path = require('path');

const designDir = 'c:/Users/mscott/AI_Workspace/AgentForge-Staging/design';
const outputFile = 'c:/Users/mscott/AI_Workspace/AgentForge-Staging/agentops_preview_standalone.html';

const cyberJpg = fs.readFileSync(path.join(designDir, 'agentops_obsidian_cyber_dashboard_1790163629187.jpg')).toString('base64');
const cmdJpg = fs.readFileSync(path.join(designDir, 'agentforge_ui_command_center_1790163493277.jpg')).toString('base64');
const collabJpg = fs.readFileSync(path.join(designDir, 'agentforge_ui_workspace_collab_1790163518511.jpg')).toString('base64');
const devJpg = fs.readFileSync(path.join(designDir, 'agentforge_ui_developer_harness_1790163534849.jpg')).toString('base64');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentForge — Obsidian & AgentOps Cybernetic UI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020408;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      padding: 24px;
      overflow-x: hidden;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(0, 229, 255, 0.25);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #00e5ff, #a855f7);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      color: #020408;
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #fff;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      background: rgba(0, 229, 255, 0.15);
      border: 1px solid #00e5ff;
      color: #00e5ff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: monospace;
      margin-left: 8px;
    }
    .tabs {
      display: flex;
      gap: 10px;
    }
    .tab-btn {
      background: #091322;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      background: rgba(0, 229, 255, 0.15);
      border-color: #00e5ff;
      color: #fff;
    }
    .tab-btn.active {
      background: rgba(0, 229, 255, 0.25);
      border-color: #00e5ff;
      color: #00e5ff;
      box-shadow: 0 0 15px rgba(0, 229, 255, 0.35);
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .hero-card {
      background: rgba(8, 16, 28, 0.9);
      border: 1px solid rgba(0, 229, 255, 0.35);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 0 40px rgba(0, 229, 255, 0.15);
      margin-bottom: 30px;
    }
    .hero-img-wrap {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(0, 229, 255, 0.4);
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
      background: #000;
    }
    .hero-img-wrap img {
      width: 100%;
      height: auto;
      display: block;
    }
    .info-bar {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .info-item {
      background: #050c17;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 14px;
    }
    .info-label {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-val {
      font-size: 16px;
      font-weight: 700;
    }
    .canvas-wrap {
      position: relative;
      background: #030712;
      border-radius: 12px;
      border: 1px solid rgba(0, 229, 255, 0.35);
      overflow: hidden;
      min-height: 600px;
      box-shadow: 0 0 35px rgba(0, 229, 255, 0.15);
    }
    canvas {
      width: 100%;
      height: 600px;
      display: block;
      cursor: grab;
    }
    .canvas-ctrls {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      gap: 10px;
      z-index: 10;
    }
    .c-btn {
      background: rgba(6, 14, 26, 0.9);
      border: 1px solid rgba(0, 229, 255, 0.4);
      color: #e2e8f0;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .c-btn:hover {
      background: #00e5ff;
      color: #000;
    }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .opt-card {
      background: #060e1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .opt-card:hover {
      border-color: #00e5ff;
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(0, 229, 255, 0.2);
    }
    .opt-card img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .opt-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }
    .opt-desc {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo">AF</div>
      <div>
        <h1>AGENTFORGE CYBERNETIC DASHBOARD <span class="badge">DESIGN SHOWCASE</span></h1>
        <div style="font-size:11px; color:#64748b; font-family:monospace; margin-top:3px">OBSIDIAN FORCE-GRAPH • AGENTOPS DASHBOARD V1 SPECIFICATION</div>
      </div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="showTab('graphic')">⚡ The Graphic From Chat</button>
      <button class="tab-btn" onclick="showTab('physics')">🎮 Interactive Live Physics Canvas</button>
      <button class="tab-btn" onclick="showTab('other-options')">🗂️ All 3 Design Directions</button>
    </div>
  </header>

  <div class="container">

    <!-- VIEW 1: THE CHAT GRAPHIC -->
    <div id="view-graphic" class="hero-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <div>
          <h2 style="font-size:20px; font-weight:800; color:#fff">Obsidian Force-Graph + AgentOps Dashboard (Mockup from Chat)</h2>
          <p style="font-size:13px; color:#94a3b8; margin-top:4px">High-resolution render of the requested cybernetic dashboard with dark void theme, radial telemetry gauges, interactive topology, and human-in-the-loop approval card.</p>
        </div>
        <button class="tab-btn" onclick="showTab('physics')" style="border-color:#00e5ff; color:#00e5ff">Test Live Interactive Canvas →</button>
      </div>

      <div class="hero-img-wrap">
        <img src="data:image/jpeg;base64,${cyberJpg}" alt="Obsidian and AgentOps Dashboard Design">
      </div>

      <div class="info-bar">
        <div class="info-item">
          <div class="info-label">Topology Engine</div>
          <div class="info-val" style="color:#00e5ff">Obsidian Force-Directed</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px">Draggable AI teammate nodes with particle spring links.</div>
        </div>
        <div class="info-item">
          <div class="info-label">Compute Pool</div>
          <div class="info-val" style="color:#00e676">32GB RAM GGUF / KV-Cache</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px">Local Ollama DeepSeek-R1 inference with zero cloud cost.</div>
        </div>
        <div class="info-item">
          <div class="info-label">Boundary Policy</div>
          <div class="info-val" style="color:#b388ff">ExecutionContract Veto</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px">Hard boundary preventing tampering with .env and source.</div>
        </div>
        <div class="info-item">
          <div class="info-label">Human Review Gate</div>
          <div class="info-val" style="color:#ff9100">One-Click HITL Card</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px">Signed EvidencePack verification before committing changes.</div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: INTERACTIVE PHYSICS CANVAS -->
    <div id="view-physics" class="hero-card hidden">
      <div style="margin-bottom:16px">
        <h2 style="font-size:20px; font-weight:800; color:#fff">Interactive Force-Directed Physics Graph</h2>
        <p style="font-size:13px; color:#94a3b8; margin-top:4px">Drag the nodes below! Watch how the springs, Coulomb repulsion, and data flow particles dynamically simulate in real-time.</p>
      </div>

      <div class="canvas-wrap">
        <div class="canvas-ctrls">
          <button class="c-btn" onclick="resetSim()">Reset Positions</button>
          <button class="c-btn" id="btnFreeze" onclick="toggleFreeze()">Freeze Physics</button>
          <button class="c-btn" onclick="pulseFlow()">Pulse Flow</button>
        </div>
        <canvas id="cyberCanvas"></canvas>
      </div>

      <div id="inspector" style="margin-top:16px; background:#060e1a; border:1px solid rgba(0, 229, 255, 0.3); border-radius:8px; padding:14px; font-family:monospace; font-size:12px; color:#94a3b8">
        <strong style="color:#00e5ff">NODE INSPECTOR:</strong> Click or drag any entity above to inspect runtime bindings, models, and boundaries.
      </div>
    </div>

    <!-- VIEW 3: ALL 3 UI DIRECTIONS -->
    <div id="view-other-options" class="hero-card hidden">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px; font-weight:800; color:#fff">All 3 Architectural Directions</h2>
        <p style="font-size:13px; color:#94a3b8; margin-top:4px">Compare the 3 visual directions designed for AgentForge autonomous workforce:</p>
      </div>

      <div class="options-grid">
        <div class="opt-card">
          <img src="data:image/jpeg;base64,${cmdJpg}" alt="Command Center">
          <div class="opt-title">Direction A: Command Center</div>
          <div class="opt-desc">High-density operations cockpit with fleet-wide telemetry, real-time agent gauges, contract boundary alerts, and worktree activity feeds.</div>
        </div>
        <div class="opt-card">
          <img src="data:image/jpeg;base64,${collabJpg}" alt="Collaborative Workspace">
          <div class="opt-title">Direction B: Team Workspace</div>
          <div class="opt-desc">Conversational execution platform with threaded multi-agent messaging, inline diff reviews, and interactive approval chips.</div>
        </div>
        <div class="opt-card">
          <img src="data:image/jpeg;base64,${devJpg}" alt="Developer Control Plane">
          <div class="opt-title">Direction C: Developer Control Plane</div>
          <div class="opt-desc">IDE-grade developer interface with Git worktree branch browser, split-pane syntax diffs, and EvidencePack signature verification.</div>
        </div>
      </div>
    </div>

  </div>

  <script>
    function showTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');

      document.getElementById('view-graphic').classList.add('hidden');
      document.getElementById('view-physics').classList.add('hidden');
      document.getElementById('view-other-options').classList.add('hidden');

      const target = document.getElementById('view-' + tab);
      if (target) {
        target.classList.remove('hidden');
        if (tab === 'physics') {
          setTimeout(initPhysics, 50);
        }
      }
    }

    // ── Live Physics Simulation ─────────────────
    let canvas, ctx, simLoop;
    let nodes = [], links = [], particles = [];
    let isFrozen = false, draggedNode = null, hoveredNode = null;

    function initPhysics() {
      canvas = document.getElementById('cyberCanvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      nodes = [
        { id: 'core', label: 'AgentForge Core', type: 'core', color: '#00e5ff', radius: 26, x: w / 2, y: h / 2, vx: 0, vy: 0, info: 'Orchestrator Kernel • Active Route: Empirical • Staging Isolated' },
        { id: 'alex', label: 'Alex (Engineer)', type: 'agent', color: '#b388ff', radius: 20, x: w / 2 - 150, y: h / 2 - 100, vx: 0, vy: 0, info: 'Pi Coding Harness • Preferred Model: GPT-4o / DeepSeek-R1 • Worktree: .worktrees/AF-142' },
        { id: 'sarah', label: 'Sarah (Acquisitions)', type: 'agent', color: '#ff9100', radius: 20, x: w / 2 + 150, y: h / 2 - 90, vx: 0, vy: 0, info: 'Pydantic AI Harness • Preferred Model: Llama3.1:8B (Ollama Local) • Tools: CRM, Voice' },
        { id: 'ollama', label: 'Ollama Local (DeepSeek)', type: 'model', color: '#00e676', radius: 18, x: w / 2 - 180, y: h / 2 + 110, vx: 0, vy: 0, info: 'Local Endpoint: http://localhost:11434 • GGUF Pool: 32GB • Paged KV-Cache: 8k ctx' },
        { id: 'worktree', label: 'Worktree Sandbox', type: 'harness', color: '#ec4899', radius: 18, x: w / 2 + 180, y: h / 2 + 100, vx: 0, vy: 0, info: 'Git Isolated Worktree • Read/Write sandboxed • Deletions Vetoed' },
        { id: 'contract', label: 'ExecutionContract', type: 'contract', color: '#38bdf8', radius: 19, x: w / 2, y: h / 2 + 160, vx: 0, vy: 0, info: 'Boundary Policy: Protected [.env, src/core/*] • Max Files: 10 • EvidencePack: Required' },
        { id: 'evidence', label: 'EvidencePack Signed', type: 'contract', color: '#eab308', radius: 16, x: w / 2, y: h / 2 - 160, vx: 0, vy: 0, info: 'Cryptographic SHA-256 receipt • Test Output Verified • Zero Unchecked Claims' },
      ];

      links = [
        { source: 'core', target: 'alex', len: 140 },
        { source: 'core', target: 'sarah', len: 140 },
        { source: 'core', target: 'ollama', len: 160 },
        { source: 'core', target: 'worktree', len: 160 },
        { source: 'core', target: 'contract', len: 130 },
        { source: 'core', target: 'evidence', len: 130 },
        { source: 'alex', target: 'worktree', len: 150 },
        { source: 'alex', target: 'contract', len: 140 },
        { source: 'sarah', target: 'ollama', len: 140 },
        { source: 'worktree', target: 'contract', len: 120 },
      ];

      particles = [];
      for (let i = 0; i < 28; i++) {
        particles.push({
          linkIdx: Math.floor(Math.random() * links.length),
          progress: Math.random(),
          speed: 0.005 + Math.random() * 0.008,
        });
      }

      const nodeMap = new Map();
      nodes.forEach(n => nodeMap.set(n.id, n));

      canvas.onmousedown = (e) => {
        const mx = e.offsetX, my = e.offsetY;
        for (const n of nodes) {
          const dx = mx - n.x, dy = my - n.y;
          if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
            draggedNode = n;
            canvas.style.cursor = 'grabbing';
            document.getElementById('inspector').innerHTML = '<strong style=\"color:' + n.color + '\">[' + n.type.toUpperCase() + '] ' + n.label + ':</strong> ' + n.info;
            break;
          }
        }
      };

      canvas.onmousemove = (e) => {
        const mx = e.offsetX, my = e.offsetY;
        if (draggedNode) {
          draggedNode.x = mx;
          draggedNode.y = my;
          draggedNode.vx = 0;
          draggedNode.vy = 0;
          return;
        }
        let found = null;
        for (const n of nodes) {
          const dx = mx - n.x, dy = my - n.y;
          if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 6) {
            found = n;
            break;
          }
        }
        hoveredNode = found;
        canvas.style.cursor = found ? 'pointer' : 'grab';
      };

      canvas.onmouseup = () => {
        draggedNode = null;
        canvas.style.cursor = 'grab';
      };

      function loop() {
        if (!isFrozen) {
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = nodes[i], b = nodes[j];
              let dx = b.x - a.x, dy = b.y - a.y;
              let dist = Math.sqrt(dx * dx + dy * dy) || 1;
              if (dist < 320) {
                const force = (320 - dist) / dist * 0.4;
                if (a !== draggedNode) { a.vx -= dx * force; a.vy -= dy * force; }
                if (b !== draggedNode) { b.vx += dx * force; b.vy += dy * force; }
              }
            }
          }

          for (const link of links) {
            const a = nodeMap.get(link.source), b = nodeMap.get(link.target);
            if (!a || !b) continue;
            let dx = b.x - a.x, dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - link.len) * 0.035;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (a !== draggedNode) { a.vx += fx; a.vy += fy; }
            if (b !== draggedNode) { b.vx -= fx; b.vy -= fy; }
          }

          for (const n of nodes) {
            if (n === draggedNode) continue;
            n.vx += (w / 2 - n.x) * 0.015;
            n.vy += (h / 2 - n.y) * 0.015;
            n.vx *= 0.85;
            n.vy *= 0.85;
            n.x += n.vx;
            n.y += n.vy;
            n.x = Math.max(n.radius + 10, Math.min(w - n.radius - 10, n.x));
            n.y = Math.max(n.radius + 10, Math.min(h - n.radius - 10, n.y));
          }
        }

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#091322';
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        for (const link of links) {
          const a = nodeMap.get(link.source), b = nodeMap.get(link.target);
          if (!a || !b) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        for (const p of particles) {
          const link = links[p.linkIdx];
          if (!link) continue;
          const a = nodeMap.get(link.source), b = nodeMap.get(link.target);
          if (!a || !b) continue;
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;
          const px = a.x + (b.x - a.x) * p.progress;
          const py = a.y + (b.y - a.y) * p.progress;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#00e5ff';
          ctx.fill();
        }

        for (const n of nodes) {
          const isH = hoveredNode === n;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + (isH ? 8 : 4), 0, Math.PI * 2);
          ctx.fillStyle = n.color + '26';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#050c18';
          ctx.fill();
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = n.color;
          ctx.fill();

          ctx.font = '600 11px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + n.radius + 15);
        }

        simLoop = requestAnimationFrame(loop);
      }

      if (simLoop) cancelAnimationFrame(simLoop);
      simLoop = requestAnimationFrame(loop);
    }

    window.resetSim = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      nodes.forEach(n => {
        n.x = w / 2 + (Math.random() - 0.5) * 220;
        n.y = h / 2 + (Math.random() - 0.5) * 220;
        n.vx = 0; n.vy = 0;
      });
    };

    window.toggleFreeze = () => {
      isFrozen = !isFrozen;
      document.getElementById('btnFreeze').textContent = isFrozen ? 'Resume Physics' : 'Freeze Physics';
    };

    window.pulseFlow = () => {
      particles.forEach(p => { p.speed *= 3; });
      setTimeout(() => { particles.forEach(p => { p.speed /= 3; }); }, 1500);
    };
  </script>
</body>
</html>`;

fs.writeFileSync(outputFile, html, 'utf8');
console.log('Successfully built ' + outputFile + ' (' + fs.statSync(outputFile).size + ' bytes)');
