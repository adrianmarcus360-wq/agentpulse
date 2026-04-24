/* ============================================================
   AgentPulse — Globe, Counters, Feed, Share
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // CONFIG — swap API_URL when Seed Data Builder provides it
  // ============================================================
  const CONFIG = {
    API_URL: 'https://agentroster-v20.vercel.app/api/live?type=all',
    REFRESH_MS: 30000,
    GLOBE_RADIUS: 1.5,
    AUTO_ROTATE_SPEED: 0.0015,
  };

  // ============================================================
  // MOCK DATA — used until live API is available
  // ============================================================
  const MOCK = {
    counters: {
      agents: 5062,
      funding: '1,221',
      models: 913,
      builders: 8420,
    },
    locations: [
      { lat: 37.7749, lng: -122.4194, label: 'San Francisco', mag: 1.0 },
      { lat: 40.7128, lng: -74.0060, label: 'New York', mag: 0.8 },
      { lat: 51.5074, lng: -0.1278, label: 'London', mag: 0.7 },
      { lat: 35.6762, lng: 139.6503, label: 'Tokyo', mag: 0.6 },
      { lat: 52.5200, lng: 13.4050, label: 'Berlin', mag: 0.5 },
      { lat: 48.8566, lng: 2.3522, label: 'Paris', mag: 0.5 },
      { lat: 1.3521, lng: 103.8198, label: 'Singapore', mag: 0.6 },
      { lat: 43.6532, lng: -79.3832, label: 'Toronto', mag: 0.4 },
      { lat: -33.8688, lng: 151.2093, label: 'Sydney', mag: 0.4 },
      { lat: 55.7558, lng: 37.6176, label: 'Moscow', mag: 0.3 },
      { lat: 25.2048, lng: 55.2708, label: 'Dubai', mag: 0.4 },
      { lat: 19.0760, lng: 72.8777, label: 'Mumbai', mag: 0.5 },
      { lat: 31.2304, lng: 121.4737, label: 'Shanghai', mag: 0.5 },
      { lat: 37.5665, lng: 126.9780, label: 'Seoul', mag: 0.4 },
      { lat: -23.5505, lng: -46.6333, label: 'São Paulo', mag: 0.3 },
      { lat: 47.6062, lng: -122.3321, label: 'Seattle', mag: 0.6 },
      { lat: 30.2672, lng: -97.7431, label: 'Austin', mag: 0.7 },
      { lat: 34.0522, lng: -118.2437, label: 'Los Angeles', mag: 0.6 },
      { lat: 41.8781, lng: -87.6298, label: 'Chicago', mag: 0.4 },
      { lat: 47.3769, lng: 8.5417, label: 'Zurich', mag: 0.3 },
    ],
    arcs: [
      { from: { lat: 37.7749, lng: -122.4194 }, to: { lat: 40.7128, lng: -74.0060 } },
      { from: { lat: 37.7749, lng: -122.4194 }, to: { lat: 51.5074, lng: -0.1278 } },
      { from: { lat: 40.7128, lng: -74.0060 }, to: { lat: 48.8566, lng: 2.3522 } },
      { from: { lat: 51.5074, lng: -0.1278 }, to: { lat: 52.5200, lng: 13.4050 } },
      { from: { lat: 37.7749, lng: -122.4194 }, to: { lat: 1.3521, lng: 103.8198 } },
      { from: { lat: 35.6762, lng: 139.6503 }, to: { lat: 37.7749, lng: -122.4194 } },
    ],
    feed: [
      { type: 'funding', icon: '💰', title: 'OpenAI closes $40B round at $300B valuation', meta: 'OpenAI · San Francisco', time: '2m ago', isNew: true },
      { type: 'mcp', icon: '🔌', title: '913 MCP servers now tracked across 72 categories', meta: 'AgentRoster · Directory Update', time: '6m ago', isNew: true },
      { type: 'model', icon: '🧠', title: 'Google releases Gemini 2.5 Flash — fastest in class', meta: 'Google DeepMind · Model Release', time: '12m ago', isNew: false },
      { type: 'paper', icon: '📄', title: 'Multi-agent coordination paper hits 1,200 citations', meta: 'arXiv · Research · Stanford', time: '28m ago', isNew: false },
      { type: 'launch', icon: '🚀', title: 'Cursor 1.0 ships with full agentic edit mode', meta: 'Cursor · Product Launch', time: '44m ago', isNew: false },
      { type: 'funding', icon: '💰', title: 'Cognition AI raises $175M Series B for Devin platform', meta: 'Cognition AI · San Francisco', time: '1h ago', isNew: false },
      { type: 'model', icon: '🧠', title: 'Meta drops Llama 4 Scout — 17B active params, open weights', meta: 'Meta AI · Open Source', time: '2h ago', isNew: false },
      { type: 'launch', icon: '🚀', title: 'Letta open-sources persistent memory layer for agents', meta: 'Letta · Open Source', time: '3h ago', isNew: false },
      { type: 'paper', icon: '📄', title: 'AgentBench 2.0 — new benchmark for long-horizon agent tasks', meta: 'arXiv · Research · CMU', time: '4h ago', isNew: false },
      { type: 'funding', icon: '💰', title: 'Mistral AI raises €600M ahead of enterprise expansion', meta: 'Mistral AI · Paris', time: '5h ago', isNew: false },
      { type: 'mcp', icon: '🔌', title: 'Anthropic releases official MCP filesystem + browser tools', meta: 'Anthropic · MCP · Open Source', time: '6h ago', isNew: false },
      { type: 'launch', icon: '🚀', title: 'Hebbia Atlas launches multi-agent research for hedge funds', meta: 'Hebbia · New York · Enterprise', time: '8h ago', isNew: false },
    ],
  };

  // ============================================================
  // GLOBE
  // ============================================================
  function initGlobe() {
    const canvas = document.getElementById('globeCanvas');
    const section = document.getElementById('globe-section');
    const W = section.clientWidth;
    const H = section.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 4.5;

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0x4fffb0, 0.8);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.4);
    dirLight2.position.set(-5, -3, -5);
    scene.add(dirLight2);

    const R = CONFIG.GLOBE_RADIUS;

    // Globe core
    const globeGeo = new THREE.SphereGeometry(R, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      specular: 0x1a3060,
      shininess: 30,
      transparent: true,
      opacity: 0.95,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // Grid lines (lat/lng)
    const gridGroup = new THREE.Group();
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a3060, transparent: true, opacity: 0.35 });

    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lng = 0; lng <= 360; lng += 3) {
        pts.push(latLngToVec3(lat, lng, R + 0.002));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        pts.push(latLngToVec3(lat, lng, R + 0.002));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }
    scene.add(gridGroup);

    // Atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(R * 1.08, 64, 64);
    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x0d2040,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Outer glow ring
    const glowGeo = new THREE.SphereGeometry(R * 1.15, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // Location dots
    const dotGroup = new THREE.Group();
    const dotMeshes = [];

    MOCK.locations.forEach((loc) => {
      const pos = latLngToVec3(loc.lat, loc.lng, R + 0.01);
      const size = 0.015 + loc.mag * 0.018;

      const dotGeo = new THREE.SphereGeometry(size, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x4fffb0 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(size * 1.5, size * 2.2, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4fffb0,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      ring.rotateX(Math.PI / 2);

      dotGroup.add(dot);
      dotGroup.add(ring);
      dotMeshes.push({ dot, ring, baseSize: size, phase: Math.random() * Math.PI * 2 });
    });
    scene.add(dotGroup);

    // Arcs (great circle paths)
    const arcGroup = new THREE.Group();
    MOCK.arcs.forEach((arc) => {
      const pts = greatCirclePoints(arc.from, arc.to, R * 1.04, 60);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x4fffb0,
        transparent: true,
        opacity: 0.25,
      });
      arcGroup.add(new THREE.Line(geo, mat));
    });
    scene.add(arcGroup);

    // Globe group for rotation
    const globeGroup = new THREE.Group();
    globeGroup.add(globeMesh);
    globeGroup.add(gridGroup);
    globeGroup.add(dotGroup);
    globeGroup.add(arcGroup);
    scene.remove(globeMesh);
    scene.remove(gridGroup);
    scene.remove(dotGroup);
    scene.remove(arcGroup);
    scene.add(globeGroup);
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));
    scene.add(new THREE.Mesh(glowGeo, glowMat));

    // Mouse drag
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      velocity = { x: 0, y: 0 };
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      velocity.x = dx * 0.005;
      velocity.y = dy * 0.005;
      globeGroup.rotation.y += velocity.x;
      globeGroup.rotation.x += velocity.y;
      prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Touch drag
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevMouse.x;
      const dy = e.touches[0].clientY - prevMouse.y;
      velocity.x = dx * 0.005;
      velocity.y = dy * 0.005;
      globeGroup.rotation.y += velocity.x;
      globeGroup.rotation.x += velocity.y;
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { isDragging = false; });

    // Resize
    window.addEventListener('resize', () => {
      const W2 = section.clientWidth;
      const H2 = section.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    });

    // Animate
    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.016;

      if (!isDragging) {
        globeGroup.rotation.y += CONFIG.AUTO_ROTATE_SPEED;
        velocity.x *= 0.95;
        velocity.y *= 0.95;
      }

      // Pulse dots
      dotMeshes.forEach(({ ring, baseSize, phase }) => {
        const scale = 1 + 0.5 * Math.sin(t * 2 + phase);
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = 0.4 * (1 - (scale - 1));
      });

      renderer.render(scene, camera);
    }
    animate();
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function latLngToVec3(lat, lng, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function greatCirclePoints(from, to, r, steps) {
    const pts = [];
    const v1 = latLngToVec3(from.lat, from.lng, r);
    const v2 = latLngToVec3(to.lat, to.lng, r);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = new THREE.Vector3().lerpVectors(v1, v2, t).normalize().multiplyScalar(r);
      // Arc up
      const arcH = r * 0.12 * Math.sin(t * Math.PI);
      pt.normalize().multiplyScalar(r + arcH);
      pts.push(pt);
    }
    return pts;
  }

  // ============================================================
  // COUNTERS
  // ============================================================
  function animateCounter(el, target, prefix, suffix, duration) {
    const start = Date.now();
    const isNum = typeof target === 'number';

    if (!isNum) {
      // animate dollar amount like "$1.2B" -> just set directly with delay
      setTimeout(() => {
        el.textContent = (prefix || '') + target + (suffix || '');
        el.style.transition = 'opacity 0.4s';
        el.style.opacity = 0;
        requestAnimationFrame(() => {
          el.style.opacity = 1;
        });
      }, 400);
      return;
    }

    function step() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(ease * target);
      el.textContent = (prefix || '') + value.toLocaleString() + (suffix || '');
      if (progress < 1) requestAnimationFrame(step);
    }
    step();
  }

  function initCounters(data) {
    const counters = data || MOCK.counters;
    setTimeout(() => {
      const el0 = document.getElementById('cnt-agents');
      const el1 = document.getElementById('cnt-funding');
      const el2 = document.getElementById('cnt-models');
      const el3 = document.getElementById('cnt-builders');

      animateCounter(el0, counters.agents, '', '', 1400);
      animateCounter(el1, counters.funding, '', '', 800);
      animateCounter(el2, counters.models, '', '', 1000);
      animateCounter(el3, counters.builders, '', '', 1800);
    }, 600);
  }

  // ============================================================
  // FEED
  // ============================================================
  function renderFeed(items) {
    const list = document.getElementById('feed-list');
    list.innerHTML = '';

    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'feed-item';

      const tagClass = `tag-${item.type}`;
      const iconBg = `feed-icon-${item.type}`;
      const newBadge = item.isNew ? '<span class="new-badge">NEW</span>' : '';

      div.innerHTML = `
        <div class="feed-item-icon ${iconBg}">${item.icon}</div>
        <div class="feed-item-content">
          <div class="feed-item-title">${item.title}</div>
          <div class="feed-item-meta">
            <span class="feed-tag ${tagClass}">${item.type.toUpperCase()}</span>
            <span>${item.meta}</span>
            ${newBadge}
            <span class="feed-item-time">${item.time}</span>
          </div>
        </div>
      `;

      list.appendChild(div);

      // Staggered entrance
      setTimeout(() => {
        div.classList.add('visible');
      }, 100 + i * 60);
    });
  }

  // Simulate new items appearing
  function startFeedSimulation() {
    const newItems = [
      { type: 'launch', icon: '🚀', title: 'Replit Agent now supports multi-file refactoring in 60+ languages', meta: 'Replit · Product Launch', time: 'just now', isNew: true },
      { type: 'funding', icon: '💰', title: 'ElevenLabs raises $80M Series C to expand voice AI agents', meta: 'ElevenLabs · London', time: 'just now', isNew: true },
      { type: 'model', icon: '🧠', title: 'Mistral Large 3 drops with 128k context and function calling', meta: 'Mistral AI · Model Release', time: 'just now', isNew: true },
    ];
    let idx = 0;
    setInterval(() => {
      if (idx >= newItems.length) return;
      const newItem = { ...newItems[idx++], time: 'just now' };
      const currentItems = [...MOCK.feed];
      currentItems.unshift(newItem);
      currentItems.pop();
      MOCK.feed = currentItems;
      renderFeed(currentItems);
    }, 12000);
  }

  // ============================================================
  // DATA FETCH (with fallback to mock)
  // ============================================================
  async function fetchData() {
    if (!CONFIG.API_URL) return null;
    try {
      const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.warn('[AgentPulse] API unavailable, using mock data');
      return null;
    }
  }

  async function loadData() {
    const data = await fetchData();
    initCounters(data?.counters || null);
    renderFeed(data?.feed || MOCK.feed);
    if (!data) startFeedSimulation();
  }

  // ============================================================
  // SHARE CARD
  // ============================================================
  function generateShareCard() {
    const canvas = document.getElementById('shareCanvas');
    const ctx = canvas.getContext('2d');
    const W = 1200, H = 630;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0a0a');
    bg.addColorStop(1, '#0a1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(26,48,96,0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Glow orb
    const radial = ctx.createRadialGradient(W * 0.65, H * 0.45, 0, W * 0.65, H * 0.45, 250);
    radial.addColorStop(0, 'rgba(79,255,176,0.12)');
    radial.addColorStop(1, 'rgba(79,255,176,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    // Live dot
    ctx.fillStyle = '#4fffb0';
    ctx.beginPath();
    ctx.arc(80, 80, 8, 0, Math.PI * 2);
    ctx.fill();

    // Header
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#4fffb0';
    ctx.fillText('AgentPulse  •  LIVE', 104, 87);

    // Main headline
    ctx.font = '700 72px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText('The AI Agent', 80, 220);

    const grad = ctx.createLinearGradient(80, 230, 600, 320);
    grad.addColorStop(0, '#4fffb0');
    grad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = grad;
    ctx.fillText('Economy, Live.', 80, 315);

    // Stats bar
    const stats = [
      { label: 'AI Entities', value: MOCK.counters.agents.toLocaleString() },
      { label: 'Research Papers', value: MOCK.counters.funding },
      { label: 'MCP Servers', value: MOCK.counters.models.toString() },
    ];

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, 80, 380, W - 160, 120, 12);
    ctx.fill();
    ctx.stroke();

    stats.forEach((s, i) => {
      const x = 140 + i * 340;
      ctx.font = '700 42px JetBrains Mono, monospace';
      ctx.fillStyle = ['#4fffb0', '#f59e0b', '#3b82f6'][i];
      ctx.fillText(s.value, x, 445);
      ctx.font = '400 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText(s.label, x, 470);
    });

    // Bottom attribution
    ctx.font = '400 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.fillText('Powered by AgentRoster →', W - 80, H - 40);
    ctx.textAlign = 'left';

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ============================================================
  // MODAL
  // ============================================================
  function initShareModal() {
    const modal = document.getElementById('share-modal');
    const openBtns = [document.getElementById('shareBtn'), document.getElementById('exploreBtn')];

    function openModal() {
      modal.classList.remove('hidden');
      generateShareCard();
    }

    function closeModal() {
      modal.classList.add('hidden');
    }

    document.getElementById('shareBtn').addEventListener('click', openModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeModal);
    document.getElementById('modalClose').addEventListener('click', closeModal);

    document.getElementById('shareTwitter').addEventListener('click', () => {
      const text = encodeURIComponent('🤖 The AI agent economy is moving FAST. Check out AgentPulse — live funding rounds, model drops, and agent launches on one globe. Powered by @AgentRoster 👇');
      const url = encodeURIComponent(window.location.href);
      window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    });

    document.getElementById('copyLink').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const btn = document.getElementById('copyLink');
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Link'; }, 2000);
      });
    });

    document.getElementById('downloadCard').addEventListener('click', () => {
      const canvas = document.getElementById('shareCanvas');
      const link = document.createElement('a');
      link.download = 'agentpulse-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  // ============================================================
  // SCROLL REVEAL
  // ============================================================
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.counter-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.5s ${i * 0.1}s, transform 0.5s ${i * 0.1}s`;
      observer.observe(el);
    });

    document.getElementById('exploreBtn').addEventListener('click', () => {
      document.getElementById('counters-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  window.addEventListener('DOMContentLoaded', () => {
    initGlobe();
    loadData();
    initShareModal();
    initScrollReveal();

    // Periodic refresh
    if (CONFIG.API_URL) {
      setInterval(loadData, CONFIG.REFRESH_MS);
    }
  });

})();

