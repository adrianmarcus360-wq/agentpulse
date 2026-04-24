/* =============================================================
   AGENTPULSE V2 — Core Application
   Bloomberg Terminal × USGS Monitor aesthetic
   Phase 1: Pulse mode, ticker rail, stats bar, mark
   ============================================================= */

'use strict';

/* ── CONFIG ─────────────────────────────────────────────── */
const CONFIG = {
  API_URL:          'https://agentroster-v20.vercel.app/api/live?type=all',
  REFRESH_INTERVAL: 30_000,   // 30s polling
  EKG_SPEED:        60,        // px/s scroll
  EKG_NOISE_AMP:    0.05,      // 5% of canvas height
  TICKER_SPEED:     80,        // px/s
  COUNT_UP_DURATION:800,       // ms for stat counter animation
};

/* ── SIGNAL SYSTEM ──────────────────────────────────────── */
const SIGNAL = {
  funding:  { color: '#F59E0B', glow: '#F59E0B44', label: 'Funding'   },
  launch:   { color: '#06B6D4', glow: '#06B6D444', label: 'Launch'    },
  research: { color: '#818CF8', glow: '#818CF844', label: 'Research'  },
  jobs:     { color: '#10B981', glow: '#10B98144', label: 'Jobs'      },
  infra:    { color: '#FB7185', glow: '#FB718544', label: 'Infra/MCP' },
  model:    { color: '#06B6D4', glow: '#06B6D444', label: 'Model'     },
  mcp:      { color: '#FB7185', glow: '#FB718544', label: 'MCP'       },
  paper:    { color: '#818CF8', glow: '#818CF844', label: 'Research'  },
};

const signalOf = (type) => SIGNAL[type] || SIGNAL.launch;

/* ── MOCK DATA ──────────────────────────────────────────── */
const MOCK = {
  stats: { total: 5062, eventsPerHour: 847 },
  events: [
    { type:'funding',  title:'OpenAI closes $40B at $300B valuation',           meta:'OpenAI · San Francisco',        magnitude:100, time:'2m ago' },
    { type:'launch',   title:'Cursor 1.0 ships with full agentic edit mode',     meta:'Cursor · Product Launch',       magnitude:55,  time:'8m ago' },
    { type:'research', title:'Multi-agent coordination paper hits 1,200 citations', meta:'arXiv · Stanford',           magnitude:40,  time:'14m ago' },
    { type:'mcp',      title:'913 MCP servers now tracked across 72 categories', meta:'AgentRoster · Directory',      magnitude:60,  time:'22m ago' },
    { type:'funding',  title:'Cognition AI raises $175M Series B',               meta:'Cognition AI · San Francisco',  magnitude:72,  time:'35m ago' },
    { type:'launch',   title:'Gemini 2.5 Flash — fastest in class',              meta:'Google DeepMind · Model',      magnitude:80,  time:'48m ago' },
    { type:'research', title:'AgentBench 2.0 — long-horizon agent tasks',        meta:'arXiv · CMU',                  magnitude:35,  time:'1h ago'  },
    { type:'funding',  title:'Mistral AI raises €600M ahead of enterprise push', meta:'Mistral AI · Paris',           magnitude:70,  time:'2h ago'  },
    { type:'mcp',      title:'Anthropic releases official MCP filesystem tools', meta:'Anthropic · Open Source',      magnitude:50,  time:'3h ago'  },
    { type:'launch',   title:'Letta open-sources persistent memory layer',       meta:'Letta · Open Source',          magnitude:45,  time:'4h ago'  },
    { type:'funding',  title:'Hebbia Atlas raises $130M for enterprise AI',      meta:'Hebbia · New York',            magnitude:65,  time:'5h ago'  },
    { type:'launch',   title:'Meta drops Llama 4 Scout — 17B active params',    meta:'Meta AI · Open Source',        magnitude:85,  time:'6h ago'  },
  ],
  tickers: {
    funding:  ['OpenAI $40B @ $300B','Cognition $175M Series B','Mistral €600M','Hebbia $130M','Together AI $100M','Cohere $450M Series D'],
    launch:   ['Cursor 1.0 agentic mode','Letta memory layer OSS','Gemini 2.5 Flash','Llama 4 Scout 17B','Devin 2.0 multi-repo','Perplexity Enterprise'],
    research: ['Multi-agent coordination +1,200 cites','AgentBench 2.0','SWE-bench Lite SOTA','AutoGen v0.4 paper','ToolFormer replication','LongAgent 128K ctx'],
    jobs:     ['OpenAI Safety Research','Anthropic Interpretability','Google DeepMind London','Mistral Paris ML','Cohere Toronto NLP','Cognition AI SF'],
  },
};

/* ── EKG ENGINE ─────────────────────────────────────────── */
class EKGEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.spikes = [];       // active spikes
    this.noisePhase = 0;    // oscillator phase
    this.time   = 0;        // elapsed seconds
    this.rafId  = null;
    this.lastTs = null;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width  = rect.width  * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.W = rect.width;
    this.H = rect.height;
    this.baseline  = this.H * 0.6;
    this.noiseAmp  = this.H * CONFIG.EKG_NOISE_AMP;
    this.maxSpike  = this.H * 0.70;
  }

  /** Inject a new spike. magnitude 0–100, type = signal key */
  addSpike({ magnitude, type }) {
    const sig = signalOf(type);
    const height = (magnitude / 100) * this.maxSpike;
    this.spikes.push({
      peakX:  this.W + CONFIG.EKG_SPEED * 0.08,  // peak arrives just after right edge
      height,
      color:  sig.color,
      glow:   sig.glow,
      riseD:  CONFIG.EKG_SPEED * 0.08,   // rise distance in px (80ms at 60px/s = 4.8px)
      decayD: CONFIG.EKG_SPEED * 0.60,   // decay distance (600ms = 36px)
    });
  }

  /** Y offset from baseline contributed by a spike at canvas x */
  spikeAt(spike, x) {
    const startX = spike.peakX + spike.riseD;   // spike start (right of peak)
    const dx = startX - x;                       // distance past start
    if (dx <= 0) return 0;                       // not yet
    if (dx <= spike.riseD) {
      // Rising: linear ease-out
      return spike.height * (dx / spike.riseD);
    }
    const decayDx = dx - spike.riseD;
    if (decayDx <= spike.decayD) {
      // Decaying: quadratic ease-out (fast peak → slow tail)
      const t = decayDx / spike.decayD;
      return spike.height * Math.pow(1 - t, 1.8);
    }
    return 0;
  }

  /** Noise sample at position x and time t */
  noise(x) {
    const p = this.noisePhase;
    return (Math.sin(x * 0.018 + p * 1.7) * 0.55
          + Math.sin(x * 0.006 + p * 0.8) * 0.30
          + Math.sin(x * 0.041 + p * 2.3) * 0.15)
          * this.noiseAmp;
  }

  start() {
    const loop = (ts) => {
      if (this.lastTs === null) this.lastTs = ts;
      const dt = Math.min((ts - this.lastTs) / 1000, 0.05); // cap at 50ms
      this.lastTs = ts;
      this.time += dt;
      this.noisePhase += dt * 0.7;

      // Advance spike positions
      for (const s of this.spikes) s.peakX -= CONFIG.EKG_SPEED * dt;
      // Remove spikes fully off left
      this.spikes = this.spikes.filter(s => s.peakX + s.riseD + s.decayD > 0);

      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastTs = null;
  }

  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines at 10% intervals
    ctx.strokeStyle = '#1E1E32';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 10; i++) {
      const y = (H * i) / 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Vertical time markers (every 120px = 2s)
    ctx.strokeStyle = '#1E1E3280';
    const markerSpacing = 120;
    const markerOffset = (this.time * CONFIG.EKG_SPEED) % markerSpacing;
    for (let x = W - markerOffset; x >= 0; x -= markerSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // ── Draw spike glow fills (under main line) ────────────────
    for (const spike of this.spikes) {
      if (spike.height < 8) continue;
      const x0 = Math.max(0, Math.floor(spike.peakX - spike.decayD));
      const x1 = Math.min(W, Math.ceil(spike.peakX + spike.riseD + 4));
      if (x1 <= x0) continue;

      const grad = ctx.createLinearGradient(0, this.baseline - spike.height * 0.8, 0, this.baseline);
      grad.addColorStop(0, spike.glow.replace('44', '33'));
      grad.addColorStop(1, 'transparent');

      ctx.beginPath();
      for (let x = x0; x <= x1; x++) {
        const sy  = this.spikeAt(spike, x);
        const ny  = this.noise(x);
        const y   = this.baseline + ny - sy;
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(x1, this.baseline);
      ctx.lineTo(x0, this.baseline);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Draw main EKG line (segmented by dominant signal) ──────
    // Build array of [x, y, color] then draw connected segments
    const pts = new Float32Array(W * 2);
    const colors = new Array(W);
    let defaultColor = '#475569';  // dim slate for baseline

    for (let x = 0; x < W; x++) {
      const noise = this.noise(x);
      let maxSpike = 0, dominantColor = defaultColor;

      for (const spike of this.spikes) {
        const sy = this.spikeAt(spike, x);
        if (sy > maxSpike) { maxSpike = sy; dominantColor = spike.color; }
      }

      pts[x * 2]     = x;
      pts[x * 2 + 1] = this.baseline + noise - maxSpike;
      colors[x] = dominantColor;
    }

    // Draw segments grouped by color for performance
    let segStart = 0;
    for (let x = 1; x <= W; x++) {
      if (x === W || colors[x] !== colors[segStart]) {
        ctx.beginPath();
        ctx.moveTo(pts[segStart * 2], pts[segStart * 2 + 1]);
        for (let i = segStart + 1; i < x; i++) {
          ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
        }
        ctx.strokeStyle = colors[segStart];
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.stroke();
        segStart = x;
      }
    }

    // Baseline idle glow (pulse when no spikes)
    if (this.spikes.length === 0) {
      const glowAlpha = (Math.sin(this.time * 0.8) * 0.5 + 0.5) * 0.15;
      ctx.strokeStyle = `rgba(6, 182, 212, ${glowAlpha})`;  // launch cyan
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y = pts[x * 2 + 1];
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Right edge cursor
    ctx.strokeStyle = '#2A2A44';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(W - 1, 0);
    ctx.lineTo(W - 1, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/* ── TICKER MANAGER ─────────────────────────────────────── */
class TickerManager {
  constructor() {
    this.tracks = {
      funding:  document.getElementById('ticker-funding'),
      launch:   document.getElementById('ticker-launch'),
      research: document.getElementById('ticker-research'),
      jobs:     document.getElementById('ticker-jobs'),
    };
  }

  populate(data) {
    const map = {
      funding:  data.funding  || MOCK.tickers.funding,
      launch:   data.launch   || MOCK.tickers.launch,
      research: data.research || MOCK.tickers.research,
      jobs:     data.jobs     || MOCK.tickers.jobs,
    };

    for (const [type, items] of Object.entries(map)) {
      const track = this.tracks[type];
      if (!track) continue;
      const sig = signalOf(type);
      // Build two copies for seamless loop
      const html = [...items, ...items].map(text =>
        `<span class="ticker-item" data-type="${type}">` +
        `<span class="ticker-dot" style="background:${sig.color}"></span>${this.escHtml(text)}` +
        `</span>`
      ).join('');
      track.innerHTML = html;
      // Calculate scroll duration from content width / speed
      // We measure after inserting; use a small delay
      requestAnimationFrame(() => {
        const halfWidth = track.scrollWidth / 2;
        const duration  = halfWidth / CONFIG.TICKER_SPEED;
        track.style.animation = `ticker-scroll ${duration.toFixed(1)}s linear infinite`;
      });
    }
  }

  prependItem(type, text) {
    const track = this.tracks[type];
    if (!track) return;
    const sig  = signalOf(type);
    const item = document.createElement('span');
    item.className = 'ticker-item';
    item.dataset.type = type;
    item.innerHTML = `<span class="ticker-dot" style="background:${sig.color}"></span>${this.escHtml(text)}`;
    track.insertBefore(item, track.firstChild);
  }

  escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}

/* ── STATS BAR ──────────────────────────────────────────── */
function countUp(el, target, duration) {
  const start = performance.now();
  const from  = parseInt(el.textContent.replace(/,/g, '')) || 0;
  const step  = (ts) => {
    const t = Math.min((ts - start) / duration, 1);
    const easedT = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const val = Math.round(from + (target - from) * easedT);
    el.textContent = val.toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function updateStats(stats) {
  const elEntities = document.getElementById('stat-entities');
  const elEventsHr = document.getElementById('stat-events-hr');
  const elMark     = document.getElementById('mark-count');

  const total = stats?.total        ?? MOCK.stats.total;
  const evHr  = stats?.eventsPerHour ?? MOCK.stats.eventsPerHour;

  countUp(elEntities, total, CONFIG.COUNT_UP_DURATION);
  countUp(elEventsHr, evHr,  CONFIG.COUNT_UP_DURATION);
  if (elMark) elMark.textContent = total.toLocaleString();
}

/* ── EVENT PANEL ─────────────────────────────────────────── */
class EventPanel {
  constructor(maxItems = 20) {
    this.list     = document.getElementById('event-list');
    this.countEl  = document.getElementById('panel-event-count');
    this.items    = [];
    this.maxItems = maxItems;
    this.total    = 0;
  }

  populate(events) {
    this.list.innerHTML = '';
    this.items = [];
    for (const ev of events) this.appendItem(ev, false);
  }

  prependNew(ev) {
    this.total++;
    this.appendItem({ ...ev, isNew: true }, true);
    if (this.countEl) {
      this.countEl.textContent = `${this.total.toLocaleString()} events`;
    }
  }

  appendItem(ev, prepend = false) {
    const li = document.createElement('li');
    li.className = `event-item${ev.isNew ? ' is-new' : ''}`;
    li.dataset.type = ev.type;
    li.innerHTML =
      `<div class="event-signal"></div>` +
      `<div class="event-body">` +
        `<div class="event-title">${this.esc(ev.title)}</div>` +
        `<div class="event-meta">${this.esc(ev.meta)}</div>` +
      `</div>` +
      `<time class="event-time">${this.esc(ev.time || 'now')}</time>`;

    if (prepend && this.list.firstChild) {
      this.list.insertBefore(li, this.list.firstChild);
    } else {
      this.list.appendChild(li);
    }

    this.items.push(li);
    if (this.items.length > this.maxItems) {
      const oldest = this.items.shift();
      oldest.remove();
    }

    // Remove "new" highlight after 5s
    if (ev.isNew) {
      setTimeout(() => li.classList.remove('is-new'), 5000);
    }
  }

  esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}

/* ── DATA FETCH ─────────────────────────────────────────── */
async function fetchLiveData() {
  if (!CONFIG.API_URL) return null;
  try {
    const res = await fetch(CONFIG.API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('[AgentPulse] API unavailable, using mock data:', e.message);
    return null;
  }
}

/* ── SIMULATED LIVE EVENTS ──────────────────────────────── */
// Injects synthetic events while waiting for real API data
const SIM_EVENTS = [
  { type:'funding',  title:'New funding round detected',   meta:'Undisclosed · Series A',  magnitude:45, time:'now' },
  { type:'launch',   title:'Agent framework v2.0 released',meta:'Open Source · GitHub',    magnitude:38, time:'now' },
  { type:'research', title:'New paper: scaling agent memory', meta:'arXiv · preprint',      magnitude:32, time:'now' },
  { type:'mcp',      title:'New MCP server published',     meta:'Community · npm',          magnitude:25, time:'now' },
  { type:'jobs',     title:'AI engineer role opened',      meta:'Stealth Startup · Remote', magnitude:20, time:'now' },
  { type:'funding',  title:'Bridge round closed',          meta:'Series B · SF',            magnitude:58, time:'now' },
];
let simIndex = 0;

function simulateEvent(ekg, panel, ticker) {
  const ev = { ...SIM_EVENTS[simIndex % SIM_EVENTS.length], time: 'now' };
  simIndex++;
  ekg.addSpike({ magnitude: ev.magnitude, type: ev.type });
  panel.prependNew(ev);
  // Add to the right ticker lane
  const laneKey = ev.type === 'mcp' ? 'infra' :
                  ev.type === 'paper' ? 'research' :
                  ev.type === 'model' ? 'launch' : ev.type;
  ticker.prependItem(laneKey in MOCK.tickers ? laneKey : 'launch', ev.title);
}

/* ── MODE TABS ──────────────────────────────────────────── */
function initModeTabs() {
  const tabs  = document.querySelectorAll('.mode-tab:not(.soon)');
  const views = document.querySelectorAll('.mode-view');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      views.forEach(v => v.classList.add('hidden'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      const view = document.getElementById(`mode-${tab.dataset.mode}`);
      if (view) view.classList.remove('hidden');
    });
  });
}

/* ── RESIZE HANDLER ─────────────────────────────────────── */
function initResize(ekg) {
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ekg.stop();
      ekg.resize();
      ekg.start();
    }, 150);
  });
}

/* ── MAIN INIT ──────────────────────────────────────────── */
async function init() {
  // EKG
  const canvas = document.getElementById('ekg-canvas');
  const ekg    = new EKGEngine(canvas);

  // Panel
  const panel  = new EventPanel(20);
  panel.populate(MOCK.events);
  panel.countEl.textContent = `${MOCK.events.length} events`;
  panel.total = MOCK.events.length;

  // Ticker
  const ticker = new TickerManager();
  ticker.populate(MOCK.tickers);

  // Stats bar
  updateStats(MOCK.stats);

  // Seed initial spikes from mock data (most recent first, smallest magnitude)
  const seedEvents = [...MOCK.events].reverse().slice(0, 6);
  let seedDelay = 400;
  for (const ev of seedEvents) {
    setTimeout(() => ekg.addSpike({ magnitude: ev.magnitude * 0.6, type: ev.type }), seedDelay);
    seedDelay += 600;
  }

  // Start EKG
  ekg.start();

  // Mode tabs
  initModeTabs();

  // Resize handler
  initResize(ekg);

  // ── Live data fetch cycle ──────────────────────────────
  async function refresh() {
    const data = await fetchLiveData();
    if (data) {
      if (data.stats) updateStats(data.stats);
      if (Array.isArray(data.events) && data.events.length) {
        panel.populate(data.events);
        panel.total = data.events.length;
        if (panel.countEl) panel.countEl.textContent = `${data.events.length.toLocaleString()} events`;
        // Inject newest event as a spike
        const newest = data.events[0];
        if (newest) ekg.addSpike({ magnitude: newest.magnitude ?? 50, type: newest.type });
      }
      if (data.tickers) ticker.populate(data.tickers);
    }
  }

  // Initial fetch
  refresh();

  // Polling cycle
  setInterval(refresh, CONFIG.REFRESH_INTERVAL);

  // ── Simulated events (fills the experience while API warms up)
  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionOK) {
    // Inject a spike shortly after load
    setTimeout(() => simulateEvent(ekg, panel, ticker), 3000);
    // Then every 18–30s
    const scheduleNext = () => {
      const delay = 18_000 + Math.random() * 12_000;
      setTimeout(() => {
        simulateEvent(ekg, panel, ticker);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
