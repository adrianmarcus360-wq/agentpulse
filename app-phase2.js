/* =============================================================
   AGENTPULSE V2 — Phase 2A: Speedometer Engine
   ============================================================= */
'use strict';

/* ── SPEEDOMETER ─────────────────────────────────────────── */
class SpeedometerEngine {
  constructor(gaugeCanvas, sparklineCanvas) {
    this.gc   = gaugeCanvas;
    this.gctx = gaugeCanvas.getContext('2d');
    this.sc   = sparklineCanvas;
    this.sctx = sparklineCanvas.getContext('2d');

    this.currentValue = 0;
    this.targetValue  = 82;  // mock: deep in redline
    this.animStart    = null;
    this.animFrom     = 0;
    this.animTo       = 0;
    this.rafId        = null;

    this.velHistory = this.buildHistory();
    this.resize();
    this.drawSparkline();
    this.animateToValue(this.targetValue);
    this.loop();

    // Simulate 60s refresh
    setInterval(() => {
      const v = 76 + Math.random() * 16;
      this.animateToValue(v);
    }, 60_000);
  }

  /* ── geometry ─────────────────────────────────────────────── */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const gr  = this.gc.getBoundingClientRect();
    const sr  = this.sc.getBoundingClientRect();

    this.gc.width  = gr.width  * dpr;
    this.gc.height = gr.height * dpr;
    this.gctx.scale(dpr, dpr);
    this.GW = gr.width;  this.GH = gr.height;

    this.sc.width  = sr.width  * dpr;
    this.sc.height = sr.height * dpr;
    this.sctx.scale(dpr, dpr);
    this.SW = sr.width;  this.SH = sr.height;

    const s = this.GW / 560;
    this.cx       = this.GW / 2;
    this.cy       = this.GH * 0.72;
    this.arcR     = 190 * s;
    this.arcW     = 30  * s;
    this.needleR  = 174 * s;
    this.labelR   = 242 * s;
    this.pivotR   =   8 * s;
    this.tailLen  = this.needleR * 0.18;
  }

  /* angle for value 0-100: Math.PI (left) → 2π (right), through top */
  vToA(v) { return Math.PI + (Math.max(0, Math.min(100, v)) / 100) * Math.PI; }

  /* ── cubic-bezier evaluator (Newton) ───────────────────────── */
  bezier(t, x1, y1, x2, y2) {
    const cx = 3*x1, bx = 3*(x2-x1)-cx, ax = 1-cx-bx;
    const cy = 3*y1, by = 3*(y2-y1)-cy, ay = 1-cy-by;
    const sx = (t) => ((ax*t+bx)*t+cx)*t;
    const dx = (t) => (3*ax*t+2*bx)*t+cx;
    const sy = (t) => ((ay*t+by)*t+cy)*t;
    let g = t;
    for (let i=0; i<8; i++) {
      const d = dx(g); if (Math.abs(d) < 1e-6) break;
      g -= (sx(g) - t) / d;
    }
    return sy(g);
  }

  /* ── animation ─────────────────────────────────────────────── */
  animateToValue(v) {
    this.animFrom  = this.currentValue;
    this.animTo    = v;
    this.animStart = performance.now();
  }

  tick(ts) {
    if (!this.animStart) return this.currentValue;
    const t = Math.min((ts - this.animStart) / 1200, 1);
    const e = this.bezier(t, 0.34, 1.56, 0.64, 1);  // overshoot
    this.currentValue = this.animFrom + (this.animTo - this.animFrom) * e;
    if (t >= 1) { this.currentValue = this.animTo; this.animStart = null; }
    return this.currentValue;
  }

  loop() {
    const frame = (ts) => {
      this.drawGauge(ts);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop() { if (this.rafId) cancelAnimationFrame(this.rafId); }

  /* ── draw gauge ─────────────────────────────────────────────── */
  drawGauge(ts) {
    const ctx = this.gctx;
    const { cx, cy, arcR, arcW, needleR, labelR, tailLen, GW, GH } = this;
    const v = this.tick(ts);

    ctx.clearRect(0, 0, GW, GH);

    // Housing track
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, Math.PI, 2*Math.PI, false);
    ctx.strokeStyle = '#1A1A28';
    ctx.lineWidth   = arcW + 10;
    ctx.stroke();

    // Colored zones
    const ZONES = [
      { from:  0, to: 25, color: '#374151' },
      { from: 25, to: 60, color: '#10B981' },
      { from: 60, to: 80, color: '#F59E0B' },
      { from: 80, to:100, color: '#EF4444' },
    ];
    for (const z of ZONES) {
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, this.vToA(z.from), this.vToA(z.to), false);
      ctx.strokeStyle = z.color;
      ctx.lineWidth   = arcW;
      ctx.stroke();
    }

    // Progress shimmer up to current value
    const cv = Math.max(0, Math.min(100, v));
    if (cv > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, Math.PI, this.vToA(cv), false);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth   = arcW;
      ctx.stroke();
    }

    // Zone labels
    const s = GW / 560;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#475569';
    ctx.font         = `600 ${Math.round(9*s)}px 'IBM Plex Mono'`;
    for (const [mid, lbl] of [[12.5,'BASELINE'],[42.5,'GROWTH'],[70,'ACCEL'],[90,'REDLINE']]) {
      const a = this.vToA(mid);
      ctx.fillText(lbl, cx + Math.cos(a)*labelR, cy + Math.sin(a)*labelR);
    }

    // Tick marks
    for (let tv = 0; tv <= 100; tv += 10) {
      const a  = this.vToA(tv);
      const r0 = arcR - arcW/2 - 3*s;
      const r1 = arcR - arcW/2 - (tv%25===0 ? 14 : 8)*s;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0);
      ctx.lineTo(cx+Math.cos(a)*r1, cy+Math.sin(a)*r1);
      ctx.strokeStyle = tv%25===0 ? '#64748B' : '#1E293B';
      ctx.lineWidth   = tv%25===0 ? 1.5 : 1;
      ctx.stroke();
    }

    // Redline pulse aura (when v > 80)
    if (v > 80) {
      const pulse = (Math.sin(ts/1000*Math.PI) + 1) / 2;
      const alpha = pulse * 0.13 * ((v-80)/20);
      const gr = ctx.createRadialGradient(cx, cy, arcR*0.2, cx, cy, arcR*1.3);
      gr.addColorStop(0.5, 'transparent');
      gr.addColorStop(1,   `rgba(239,68,68,${alpha})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, GW, GH);

      // Page-level subtle red tint
      document.getElementById('mode-speedometer')
        ?.style.setProperty('--redzone-alpha', ((v-80)/20 * 0.04).toFixed(3));
    }

    // Needle shadow in redzone
    if (v > 80) { ctx.shadowColor = 'rgba(239,68,68,0.6)'; ctx.shadowBlur = 12; }

    // Needle
    const na  = this.vToA(cv);
    const nta = na + Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(nta)*tailLen, cy+Math.sin(nta)*tailLen);
    ctx.lineTo(cx+Math.cos(na)*needleR,  cy+Math.sin(na)*needleR);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth   = 3 * s;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Pivot circle
    ctx.beginPath();
    ctx.arc(cx, cy, this.pivotR, 0, 2*Math.PI);
    ctx.fillStyle   = '#1A1A24';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth   = 2 * s;
    ctx.stroke();

    // Center value display
    const dispY = cy + 40*s;
    ctx.font         = `800 ${Math.round(68*s)}px 'Inter'`;
    ctx.fillStyle    = '#E2E8F0';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(cv).toString(), cx, dispY);

    ctx.font      = `500 ${Math.round(9*s)}px 'IBM Plex Mono'`;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('COMPOSITE VELOCITY INDEX', cx, dispY + Math.round(50*s));
  }

  /* ── sparkline ──────────────────────────────────────────────── */
  buildHistory() {
    // Jan 2022 → Apr 2026 = 51 months; key inflection points
    const kp = [
      [0,3],[8,8],[14,28],[18,40],[24,60],[30,68],[36,74],[42,78],[50,82]
    ];
    const n = 51, h = new Float32Array(n);
    for (let i=0; i<n; i++) {
      let lo=kp[0], hi=kp[kp.length-1];
      for (let j=0; j<kp.length-1; j++) {
        if (i>=kp[j][0] && i<=kp[j+1][0]) { lo=kp[j]; hi=kp[j+1]; break; }
      }
      const t  = lo[0]===hi[0] ? 0 : (i-lo[0])/(hi[0]-lo[0]);
      const st = t*t*(3-2*t);
      const base = lo[1] + (hi[1]-lo[1])*st;
      const noise = (Math.sin(i*7.3)*0.4 + Math.sin(i*13.7)*0.3)*2.5;
      h[i] = Math.max(0, Math.min(100, base+noise));
    }
    return h;
  }

  drawSparkline() {
    const ctx = this.sctx;
    const W=this.SW, H=this.SH;
    const d=this.velHistory, n=d.length;
    ctx.clearRect(0,0,W,H);

    // Grid
    ctx.setLineDash([2,4]);
    ctx.strokeStyle='#1E1E32'; ctx.lineWidth=0.5;
    for (let i=0; i<=4; i++) {
      const y = H*0.1 + H*0.8*i/4;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Points
    const pts = Array.from({length:n}, (_,i) => ({
      x: (i/(n-1))*W,
      y: H - (d[i]/100)*H*0.82 - H*0.06,
    }));

    // Fill
    const gr = ctx.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'rgba(129,140,248,0.22)');
    gr.addColorStop(1,'rgba(129,140,248,0)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<n; i++) {
      const mx = (pts[i-1].x + pts[i].x)/2;
      ctx.bezierCurveTo(mx, pts[i-1].y, mx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();

    // Line
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<n; i++) {
      const mx = (pts[i-1].x+pts[i].x)/2;
      ctx.bezierCurveTo(mx, pts[i-1].y, mx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle='#818CF8'; ctx.lineWidth=1; ctx.stroke();

    // Annotation dots + labels
    const ANNS = [[14,'GPT-4'],[18,'Claude 2'],[24,'Agents mainstream']];
    for (const [mi, lbl] of ANNS) {
      if (mi >= n) continue;
      const {x,y} = pts[mi];
      ctx.beginPath(); ctx.arc(x,y,3,0,2*Math.PI);
      ctx.fillStyle='#818CF8'; ctx.fill();
      ctx.strokeStyle='#0C0C18'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font='500 9px "IBM Plex Mono"';
      ctx.fillStyle='#475569'; ctx.textAlign='center';
      ctx.fillText(lbl, x, y-8);
    }

    // TODAY
    const lp = pts[n-1];
    ctx.beginPath(); ctx.arc(lp.x,lp.y,3,0,2*Math.PI);
    ctx.fillStyle='#EF4444'; ctx.fill();
    ctx.font='600 9px "IBM Plex Mono"'; ctx.fillStyle='#EF4444';
    ctx.textAlign='right'; ctx.fillText('TODAY', lp.x-1, lp.y-8);
  }
}

/* =============================================================
   Phase 2B: War Room Manager
   ============================================================= */
const WR_CATEGORIES = [
  { key:'models',     label:'Models',         color:'#F59E0B', score:91 },
  { key:'agents',     label:'AI Agents',      color:'#06B6D4', score:87 },
  { key:'frameworks', label:'Frameworks',     color:'#818CF8', score:74 },
  { key:'infra',      label:'Infrastructure', color:'#FB7185', score:68 },
  { key:'tools',      label:'Tools',          color:'#10B981', score:62 },
  { key:'research',   label:'Research',       color:'#94A3B8', score:55 },
];

const WR_NAMES = [
  'OpenAI','Anthropic','Google DeepMind','Meta AI','Mistral AI','Cohere','AI21 Labs',
  'Hugging Face','Stability AI','Runway','Cursor','Cognition AI','Perplexity','xAI',
  'Together AI','Replicate','Modal','LlamaIndex','LangChain','AutoGen','CrewAI','Letta',
  'BabyAGI','AutoGPT','Devin AI','Character.AI','Inflection','Imbue','Aleph Alpha','01.AI',
];

class WarRoomManager {
  constructor() {
    this.entities   = this._genEntities(200);
    this.initialized = false;
  }

  _genEntities(count) {
    return Array.from({length:count}, (_,i) => ({
      id:       i,
      name:     i < WR_NAMES.length ? WR_NAMES[i] : `Agent-${String(i+1).padStart(3,'0')}`,
      velocity: Math.round(5 + Math.random()*95),
      category: WR_CATEGORIES[i % WR_CATEGORIES.length].key,
    })).sort((a,b) => b.velocity - a.velocity);
  }

  _vColor(v) {
    if (v < 25)  return `rgba(12,12,24,${0.3 + v/25*0.4})`;    // void → dim
    if (v < 55)  return `rgba(129,140,248,${(v-25)/30*0.25})`;  // violet tint
    if (v < 80)  return `rgba(245,158,11,${(v-55)/25*0.35})`;   // amber tint
    return `rgba(239,68,68,${0.15 + (v-80)/20*0.3})`;           // red hot
  }

  _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.heatGrid  = document.getElementById('heatmap-grid');
    this.feedList  = document.getElementById('wr-feed-list');
    this.raceEl    = document.getElementById('wr-race');
    this.detailPanel = document.getElementById('wr-detail');
    this.detailContent = document.getElementById('wr-detail-content');

    document.getElementById('wr-detail-close')
      ?.addEventListener('click', () => this.detailPanel.classList.add('hidden'));

    this._renderHeatmap();
    this._renderRace();
    this._seedFeed();
    this._initTopTicker();

    // Live updates
    setInterval(() => this._pulseHeatmap(), 1800);
    setInterval(() => this._updateRace(),   30_000);
    setInterval(() => this._injectFeedItem(), 14_000);
  }

  /* ── heatmap ─────────────────────────────────────────────── */
  _renderHeatmap() {
    this.heatGrid.innerHTML = '';
    for (const e of this.entities) {
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      cell.dataset.id = e.id;
      cell.style.background = this._vColor(e.velocity);
      cell.innerHTML =
        `<span class="hm-name">${this._esc(e.name)}</span>` +
        `<span class="hm-vel">${e.velocity}</span>`;
      cell.addEventListener('click', () => this._showDetail(e));
      this.heatGrid.appendChild(cell);
    }
  }

  _pulseHeatmap() {
    // Randomly bump a few cells
    const cells = this.heatGrid.querySelectorAll('.hm-cell');
    const picks = Math.floor(3 + Math.random()*8);
    for (let i=0; i<picks; i++) {
      const idx = Math.floor(Math.random()*Math.min(50, cells.length));
      const cell = cells[idx];
      if (!cell) continue;
      const id = parseInt(cell.dataset.id);
      const e  = this.entities.find(x => x.id===id);
      if (!e) continue;
      e.velocity = Math.max(5, Math.min(100, e.velocity + Math.round((Math.random()-0.4)*8)));
      cell.style.background = this._vColor(e.velocity);
      cell.querySelector('.hm-vel').textContent = e.velocity;
    }
  }

  _showDetail(e) {
    const cat = WR_CATEGORIES.find(c => c.key===e.category) || WR_CATEGORIES[0];
    this.detailContent.innerHTML =
      `<div class="wd-name">${this._esc(e.name)}</div>` +
      `<span class="wd-badge" style="border-color:${cat.color};color:${cat.color}">${cat.label}</span>` +
      `<div class="wd-row"><span>Velocity</span><strong>${e.velocity} / 100</strong></div>` +
      `<div class="wd-row"><span>Category</span><strong>${cat.label}</strong></div>` +
      `<div class="wd-row"><span>Rank</span><strong>#${e.id+1}</strong></div>` +
      `<div class="wd-bar-wrap"><div class="wd-bar" style="width:${e.velocity}%;background:${cat.color}"></div></div>`;
    this.detailPanel.classList.remove('hidden');
  }

  /* ── category race ──────────────────────────────────────────── */
  _renderRace() {
    const sorted = [...WR_CATEGORIES].sort((a,b) => b.score - a.score);
    const max    = sorted[0].score;
    this.raceEl.innerHTML = '';
    for (const cat of sorted) {
      const row = document.createElement('div');
      row.className  = 'race-row';
      row.dataset.key = cat.key;
      const pct = (cat.score / max * 100).toFixed(1);
      row.innerHTML =
        `<span class="race-label">${cat.label}</span>` +
        `<div class="race-bar-track">` +
          `<div class="race-bar" style="width:${pct}%;background:${cat.color}"></div>` +
        `</div>` +
        `<span class="race-value">${cat.score}</span>`;
      this.raceEl.appendChild(row);
    }
  }

  _updateRace() {
    for (const cat of WR_CATEGORIES) {
      cat.score = Math.max(30, Math.min(99, cat.score + Math.round((Math.random()-0.45)*6)));
    }
    const sorted = [...WR_CATEGORIES].sort((a,b) => b.score-a.score);
    const max    = sorted[0].score;

    // Re-order DOM rows
    for (const cat of sorted) {
      const row = this.raceEl.querySelector(`[data-key="${cat.key}"]`);
      if (!row) continue;
      const pct = (cat.score/max*100).toFixed(1);
      row.querySelector('.race-bar').style.width = `${pct}%`;
      row.querySelector('.race-value').textContent = cat.score;
      this.raceEl.appendChild(row); // moves to end = sorted order
    }
  }

  /* ── signal feed ─────────────────────────────────────────────── */
  _seedFeed() {
    for (const ev of MOCK.events.slice(0,8)) this._addFeedItem(ev);
  }

  _injectFeedItem() {
    const ev = SIM_EVENTS[Math.floor(Math.random()*SIM_EVENTS.length)];
    this._addFeedItem({ ...ev, time: 'now', isNew: true });
  }

  _addFeedItem(ev) {
    const li  = document.createElement('li');
    const sig = signalOf(ev.type);
    li.className = 'wr-feed-item';
    li.style.setProperty('--sig-color', sig.color);
    li.innerHTML =
      `<div class="wfi-body">` +
        `<div class="wfi-name">${this._esc(ev.title)}</div>` +
        `<div class="wfi-meta">${this._esc(ev.meta)} · <span>${this._esc(ev.time||'now')}</span></div>` +
      `</div>`;

    const list = this.feedList;
    list.insertBefore(li, list.firstChild);

    // Cap at 40 items
    while (list.children.length > 40) list.removeChild(list.lastChild);

    // Fade items past 15
    Array.from(list.children).forEach((el,i) => {
      el.style.opacity = i < 15 ? '1' : '0.3';
    });
  }

  /* ── top funding ticker ──────────────────────────────────────── */
  _initTopTicker() {
    const track = document.getElementById('ticker-wr-funding');
    if (!track) return;
    const items = [...MOCK.tickers.funding, ...MOCK.tickers.funding];
    track.innerHTML = items.map(t =>
      `<span class="ticker-item" data-type="funding">` +
      `<span class="ticker-dot" style="background:#F59E0B"></span>${t}</span>`
    ).join('');
    requestAnimationFrame(() => {
      const half = track.scrollWidth / 2;
      const dur  = (half / 100).toFixed(1); // 100px/s (faster than bottom rail)
      track.style.animation = `ticker-scroll ${dur}s linear infinite`;
    });
  }
}

/* =============================================================
   Phase 2 Init — wires into existing mode tab switching
   ============================================================= */
(function initPhase2() {
  let speedometer = null;
  let warRoom     = null;
  let speedoInited = false;
  let wrInited     = false;

  // Hook into existing mode tab clicks
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;

      if (mode === 'speedometer' && !speedoInited) {
        speedoInited = true;
        requestAnimationFrame(() => {
          speedometer = new SpeedometerEngine(
            document.getElementById('gauge-canvas'),
            document.getElementById('sparkline-canvas')
          );
        });
      }

      if (mode === 'warroom' && !wrInited) {
        wrInited = true;
        warRoom = new WarRoomManager();
        warRoom.init();
      }

      // Pause/resume EKG when switching away/back
      if (typeof window._ekg !== 'undefined') {
        if (mode === 'pulse') window._ekg?.start?.();
        else window._ekg?.stop?.();
      }
    });
  });
})();
