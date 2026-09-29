// ---- Edit these to make the site yours ----
const CONFIG = {
  city: "Your City",
  timeZone: "UTC", // e.g. "Europe/Amsterdam", "America/New_York"
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => t * t * (3 - 2 * t);

// ---------- year + local clock ----------
$("#year").textContent = new Date().getFullYear();
function tick() {
  try {
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: CONFIG.timeZone, timeZoneName: "short",
    }).format(new Date());
    $("#clock").textContent = `${CONFIG.city} · ${time}`;
  } catch { $("#clock").textContent = CONFIG.city; }
}
tick();
setInterval(tick, 15000);

// ---------- nav ----------
const nav = $("#nav"), toggle = $("#navToggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
$$("a", nav).forEach((a) => a.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));

// ---------- scroll progress ----------
const bar = $(".progress");
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- copy email ----------
const toast = $("#toast");
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("on"), 2200);
}
$$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
  const text = btn.dataset.copy;
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${text}`);
  } catch {
    const email = $(".contact__email");
    const range = document.createRange();
    range.selectNodeContents(email);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    email.scrollIntoView({ block: "center" });
    showToast("Email selected. Press Ctrl+C or ⌘C to copy");
  }
}));

// ---------- shared pointer for the hero ----------
const hero = $("#hero");
const pointer = { x: 0, y: 0, active: false, last: 0 };
hero.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.active = true; pointer.last = performance.now();
});
hero.addEventListener("pointerleave", () => { pointer.active = false; });

// When nobody is pointing, a slow virtual cursor sweeps across the name.
function heroFocus(now) {
  if (pointer.active && now - pointer.last < 2500) return { x: pointer.x, y: pointer.y, strength: 1 };
  const r = $("#name").getBoundingClientRect();
  const t = now / 1000;
  return {
    x: r.left + r.width * (0.5 + 0.45 * Math.sin(t * 0.55)),
    y: r.top + r.height * (0.5 + 0.35 * Math.sin(t * 0.9 + 1)),
    strength: 0.75,
  };
}

// ---------- variable-width name ----------
const nameEl = $("#name");
const chars = [];
$$(".name__line", nameEl).forEach((line) => {
  const text = line.textContent;
  line.textContent = "";
  [...text].forEach((c) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = c;
    line.appendChild(s);
    chars.push({ el: s, w: reduceMotion ? 62 : 125, g: reduceMotion ? 800 : 120 });
  });
});
const BASE = { w: 62, g: 800 }, PEAK = { w: 125, g: 900 };
const introStart = performance.now();

function updateName(now, focus) {
  const size = parseFloat(getComputedStyle(nameEl).fontSize);
  const radius = size * 1.1;
  chars.forEach((c, i) => {
    let tw = BASE.w, tg = BASE.g;
    const started = now - introStart > 250 + i * 90;
    if (!started) { tw = 125; tg = 120; }
    else if (focus) {
      const r = c.el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - focus.x, r.top + r.height / 2 - focus.y);
      const t = smooth(clamp01(1 - d / radius)) * focus.strength;
      tw = BASE.w + (PEAK.w - BASE.w) * t;
      tg = BASE.g + (PEAK.g - BASE.g) * t;
    }
    const k = started && now - introStart < 250 + i * 90 + 900 ? 0.07 : 0.14;
    c.w += (tw - c.w) * k;
    c.g += (tg - c.g) * k;
    c.el.style.setProperty("--w", c.w.toFixed(1));
    c.el.style.setProperty("--g", c.g.toFixed(0));
  });
}

// ---------- hero field ----------
const field = $("#field");
const fctx = field.getContext("2d");
let fw = 0, fh = 0, dpr = 1;
function sizeField() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  fw = field.clientWidth; fh = field.clientHeight;
  field.width = fw * dpr; field.height = fh * dpr;
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawField(focus) {
  const rect = field.getBoundingClientRect();
  const fx = focus.x - rect.left, fy = focus.y - rect.top;
  const gap = fw < 600 ? 26 : 32;
  const reach = Math.max(260, Math.min(fw, 900) * 0.45);
  fctx.clearRect(0, 0, fw, fh);
  fctx.lineCap = "round";
  for (let y = gap / 2; y < fh; y += gap) {
    for (let x = gap / 2; x < fw; x += gap) {
      const dx = fx - x, dy = fy - y;
      const d = Math.hypot(dx, dy);
      const t = smooth(clamp01(1 - d / reach)) * focus.strength;
      const a = Math.atan2(dy, dx) + Math.PI / 2 * (1 - t);
      const len = 3 + 9 * t;
      const cx = Math.cos(a) * len, cy = Math.sin(a) * len;
      fctx.strokeStyle = t > 0.35 ? `rgba(255,176,0,${0.35 + t * 0.65})` : `rgba(10,10,10,${0.1 + t * 0.2})`;
      fctx.lineWidth = 1.5 + t * 1.5;
      fctx.beginPath();
      fctx.moveTo(x - cx, y - cy);
      fctx.lineTo(x + cx, y + cy);
      fctx.stroke();
    }
  }
}

let heroVisible = true;
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
sizeField();
addEventListener("resize", () => { sizeField(); drawAllArt(); });

function heroLoop(now) {
  if (heroVisible && !document.hidden) {
    const focus = heroFocus(now);
    updateName(now, focus);
    drawField(focus);
  }
  requestAnimationFrame(heroLoop);
}
if (reduceMotion) {
  chars.forEach((c) => { c.el.style.setProperty("--w", 62); c.el.style.setProperty("--g", 800); });
  const r = nameEl.getBoundingClientRect();
  drawField({ x: r.right, y: r.top + r.height / 2, strength: 0.6 });
} else {
  requestAnimationFrame(heroLoop);
}

// ---------- project art (generative, one pattern per case) ----------
const INK = "#0a0a0a", AMBER = "#ffb000", STONE = "#a39e94";
const ART = {
  bars(ctx, w, h, t) {
    const n = 14, pad = w * 0.08, bw = (w - pad * 2) / n;
    ctx.fillStyle = INK;
    for (let i = 0; i < n; i++) {
      const v = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(i * 0.9 + t * 1.2)) * (0.6 + 0.4 * Math.cos(i * 0.37));
      const bh = (h - pad * 2) * v;
      ctx.fillStyle = i === 9 ? STONE : INK;
      ctx.fillRect(pad + i * bw + bw * 0.15, h - pad - bh, bw * 0.7, bh);
    }
    ctx.fillStyle = INK;
    ctx.fillRect(pad, h - pad, w - pad * 2, 2);
  },
  rings(ctx, w, h, t) {
    ctx.strokeStyle = INK;
    for (let i = 0; i < 9; i++) {
      const r = ((i * 0.11 + t * 0.08) % 1) * Math.max(w, h) * 0.75;
      ctx.lineWidth = 2 + (1 - r / (w * 0.75)) * 6;
      ctx.beginPath();
      ctx.arc(w * 0.38, h * 0.55, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(w * 0.38, h * 0.55, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = STONE;
    ctx.fillRect(w * 0.72, h * 0.2, w * 0.14, w * 0.14);
  },
  grid(ctx, w, h, t) {
    const cols = 8, rows = 6, gw = w / (cols + 1), gh = h / (rows + 1), s = Math.min(gw, gh) * 0.72;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = gw * (c + 1) - s / 2, y = gh * (r + 1) - s / 2;
      const k = (c * 7 + r * 13 + Math.floor(t * 1.5)) % 5;
      if (k === 0) { ctx.fillStyle = INK; ctx.fillRect(x, y, s, s); }
      else if (k === 1) { ctx.fillStyle = STONE; ctx.fillRect(x, y, s, s); }
      else if (k === 2) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, s - 2, s - 2); }
      else if (k === 3) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = INK; ctx.fillRect(x + s * 0.35, y + s * 0.35, s * 0.3, s * 0.3); }
    }
  },
  wave(ctx, w, h, t) {
    ctx.lineWidth = 3;
    for (let k = 0; k < 5; k++) {
      ctx.strokeStyle = k === 2 ? STONE : INK;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h * (0.25 + k * 0.13) + Math.sin(x * 0.02 + t * 1.6 + k) * h * 0.05;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const cx = ((k * 0.23 + t * 0.07) % 1) * w;
      const cy = h * (0.25 + k * 0.13) + Math.sin(cx * 0.02 + t * 1.6 + k) * h * 0.05;
      ctx.fillStyle = INK;
      ctx.fillRect(cx - 2, cy - 18, 4, 22);
      ctx.fillRect(cx, cy - 18, 16, 9);
    }
  },
};
function paint(canvas, pattern, t = 0) {
  const r = Math.min(devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * r)) { canvas.width = Math.round(w * r); canvas.height = Math.round(h * r); }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.fillStyle = AMBER;
  ctx.fillRect(0, 0, w, h);
  ART[pattern](ctx, w, h, t);
}
function drawAllArt() {
  $$(".case.open").forEach((c) => paint($(".case__art", c), c.dataset.pattern, 2));
}

// ---------- case study accordion ----------
$$(".case").forEach((c) => {
  const btn = $(".case__row", c);
  btn.addEventListener("click", () => {
    const open = c.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
    if (open) requestAnimationFrame(() => paint($(".case__art", c), c.dataset.pattern, 2));
    peek.classList.remove("on");
  });
});

// ---------- cursor-following preview over the work list ----------
const peek = $("#peek"), peekCanvas = $("#peekCanvas");
if (finePointer && !reduceMotion) {
  const pos = { x: 0, y: 0, tx: 0, ty: 0 };
  let current = null, running = false;
  function loop(now) {
    pos.x += (pos.tx - pos.x) * 0.16;
    pos.y += (pos.ty - pos.y) * 0.16;
    peek.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${(pos.tx - pos.x) * 0.03}deg)`;
    if (current) paint(peekCanvas, current, now / 1000);
    if (peek.classList.contains("on") || Math.abs(pos.tx - pos.x) > 0.5) requestAnimationFrame(loop);
    else running = false;
  }
  $$(".case__row").forEach((row) => {
    row.addEventListener("pointerenter", (e) => {
      const c = row.closest(".case");
      if (c.classList.contains("open")) return;
      current = c.dataset.pattern;
      if (!peek.classList.contains("on")) { pos.x = pos.tx = e.clientX + 32; pos.y = pos.ty = e.clientY - 110; }
      peek.classList.add("on");
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
    row.addEventListener("pointermove", (e) => {
      const w = peek.offsetWidth;
      pos.tx = e.clientX + 32 + w > innerWidth ? e.clientX - w - 32 : e.clientX + 32;
      pos.ty = e.clientY - peek.offsetHeight / 2;
    });
    row.addEventListener("pointerleave", () => peek.classList.remove("on"));
  });
}
