/* =========================================================
   LapPrice Oracle — front-end logic
   Talks to:  POST {API_BASE}/predict   -> { price_euros }
   Optional:  GET  {API_BASE}/options   -> { Company: [...], Cpu: [...], ... }
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- Config ---------------- */
  // Leave empty when FastAPI serves this page (same origin).
  // If you open index.html some other way, set it to e.g. "http://127.0.0.1:8000".
  const API_BASE = "";

  // Suggestions from the laptop_price.csv dataset. If your API exposes GET /options,
  // these get replaced automatically with the exact values the model was trained on.
  const OPTIONS = {
    Company: ["Apple", "HP", "Dell", "Lenovo", "Asus", "Acer", "MSI", "Toshiba", "Microsoft",
      "Samsung", "Razer", "Huawei", "Xiaomi", "Google", "LG", "Fujitsu", "Mediacom", "Chuwi", "Vero"],
    TypeName: ["Notebook", "Ultrabook", "Gaming", "2 in 1 Convertible", "Workstation", "Netbook"],
    OpSys: ["Windows 10", "macOS", "Mac OS X", "Linux", "Chrome OS", "Windows 7", "Windows 10 S", "Android", "No OS"],
    ScreenResolution: [
      "Full HD 1920x1080", "1366x768", "IPS Panel Full HD 1920x1080",
      "IPS Panel Full HD / Touchscreen 1920x1080", "Full HD / Touchscreen 1920x1080", "1600x900",
      "Touchscreen 1366x768", "Quad HD+ / Touchscreen 3200x1800", "IPS Panel 4K Ultra HD 3840x2160",
      "4K Ultra HD / Touchscreen 3840x2160", "IPS Panel Retina Display 2560x1600",
      "IPS Panel Retina Display 2880x1800", "IPS Panel Retina Display 2304x1440", "IPS Panel 1366x768",
    ],
    Cpu: [
      "Intel Core i5 7200U 2.5GHz", "Intel Core i7 7700HQ 2.8GHz", "Intel Core i7 7500U 2.7GHz",
      "Intel Core i7 8550U 1.8GHz", "Intel Core i5 8250U 1.6GHz", "Intel Core i3 6006U 2GHz",
      "Intel Core i3 7100U 2.4GHz", "Intel Core i5 7300HQ 2.5GHz", "Intel Core i7 6500U 2.5GHz",
      "Intel Core i5 2.3GHz", "Intel Core i7 2.7GHz", "Intel Celeron Dual Core N3350 1.1GHz",
      "Intel Pentium Quad Core N4200 1.1GHz", "Intel Atom x5-Z8350 1.44GHz",
      "AMD A9-Series 9420 3GHz", "AMD Ryzen 1700 3GHz",
    ],
    Memory: [
      "256GB SSD", "512GB SSD", "128GB SSD", "1TB SSD", "1TB HDD", "500GB HDD", "2TB HDD",
      "128GB SSD +  1TB HDD", "256GB SSD +  1TB HDD", "32GB Flash Storage", "64GB Flash Storage",
      "128GB Flash Storage", "256GB Flash Storage",
    ],
    Gpu: [
      "Intel HD Graphics 620", "Intel HD Graphics 520", "Intel UHD Graphics 620", "Intel HD Graphics 500",
      "Intel HD Graphics 400", "Intel HD Graphics 6000", "Intel Iris Plus Graphics 640",
      "Intel Iris Plus Graphics 650", "Nvidia GeForce MX150", "Nvidia GeForce 940MX",
      "Nvidia GeForce GTX 1050", "Nvidia GeForce GTX 1050 Ti", "Nvidia GeForce GTX 1060",
      "Nvidia GeForce GTX 1070", "Nvidia Quadro M1200", "AMD Radeon 530", "AMD Radeon R5",
      "AMD Radeon Pro 455",
    ],
  };

  const RAM_OPTIONS = [2, 4, 6, 8, 12, 16, 24, 32, 64];
  const CHIP_FIELDS = ["Company", "TypeName", "OpSys"];
  const TEXT_FIELDS = ["Cpu", "Gpu", "Memory", "ScreenResolution"];
  const RANGE_FIELDS = ["Inches", "Weight"];

  const LABELS = {
    Company: "company", TypeName: "type", OpSys: "operating system", Cpu: "CPU", Gpu: "GPU",
    Memory: "storage option", ScreenResolution: "screen resolution", Ram: "RAM",
    Inches: "screen size", Weight: "weight",
  };

  const PRESETS = [
    { name: "☕ Café MacBook", data: { Company: "Apple", TypeName: "Ultrabook", Inches: 13.3, ScreenResolution: "IPS Panel Retina Display 2560x1600", Cpu: "Intel Core i5 2.3GHz", Ram: 8, Memory: "128GB SSD", Gpu: "Intel Iris Plus Graphics 640", OpSys: "macOS", Weight: 1.37 } },
    { name: "🗂️ Office Workhorse", data: { Company: "HP", TypeName: "Notebook", Inches: 15.6, ScreenResolution: "Full HD 1920x1080", Cpu: "Intel Core i5 7200U 2.5GHz", Ram: 8, Memory: "256GB SSD", Gpu: "Intel HD Graphics 620", OpSys: "No OS", Weight: 1.86 } },
    { name: "🎨 Creative Pro", data: { Company: "Apple", TypeName: "Ultrabook", Inches: 15.4, ScreenResolution: "IPS Panel Retina Display 2880x1800", Cpu: "Intel Core i7 2.7GHz", Ram: 16, Memory: "512GB SSD", Gpu: "AMD Radeon Pro 455", OpSys: "macOS", Weight: 1.83 } },
    { name: "🪙 Budget Hero", data: { Company: "Acer", TypeName: "Notebook", Inches: 15.6, ScreenResolution: "1366x768", Cpu: "AMD A9-Series 9420 3GHz", Ram: 4, Memory: "500GB HDD", Gpu: "AMD Radeon R5", OpSys: "Windows 10", Weight: 2.1 } },
    { name: "🪶 Thin & Mighty", data: { Company: "Asus", TypeName: "Ultrabook", Inches: 14, ScreenResolution: "Full HD 1920x1080", Cpu: "Intel Core i7 8550U 1.8GHz", Ram: 16, Memory: "512GB SSD", Gpu: "Nvidia GeForce MX150", OpSys: "Windows 10", Weight: 1.3 } },
    { name: "🎮 Frag Machine", data: { Company: "MSI", TypeName: "Gaming", Inches: 17.3, ScreenResolution: "Full HD 1920x1080", Cpu: "Intel Core i7 7700HQ 2.8GHz", Ram: 16, Memory: "256GB SSD", Gpu: "Nvidia GeForce GTX 1070", OpSys: "Windows 10", Weight: 2.9 } },
    { name: "🔄 Flip Flopper", data: { Company: "Lenovo", TypeName: "2 in 1 Convertible", Inches: 14, ScreenResolution: "IPS Panel Full HD / Touchscreen 1920x1080", Cpu: "Intel Core i5 8250U 1.6GHz", Ram: 8, Memory: "256GB SSD", Gpu: "Intel UHD Graphics 620", OpSys: "Windows 10", Weight: 1.6 } },
    { name: "🐣 Pocket Netbook", data: { Company: "Lenovo", TypeName: "Netbook", Inches: 11.6, ScreenResolution: "1366x768", Cpu: "Intel Celeron Dual Core N3350 1.1GHz", Ram: 4, Memory: "32GB Flash Storage", Gpu: "Intel HD Graphics 500", OpSys: "Windows 10", Weight: 1.2 } },
  ];
  const DEFAULTS = { ...PRESETS[0].data };

  const TIERS = [
    { max: 500, label: "🪙 Budget Buddy", color: "#4fe3ff" },
    { max: 1000, label: "🎒 Daily Driver", color: "#c8ff4d" },
    { max: 1800, label: "⚡ Power Player", color: "#ffb547" },
    { max: 2800, label: "🚀 Flex Machine", color: "#ff5fa8" },
    { max: Infinity, label: "💸 Wallet Destroyer", color: "#b49bff" },
  ];

  const FUN = [
    { e: "☕", unit: 3.5, label: "coffees" },
    { e: "🍕", unit: 12, label: "pizzas" },
    { e: "🎬", unit: 11, label: "cinema trips" },
  ];

  const HISTORY_KEY = "lapprice-oracle-history";
  const MAX_HISTORY = 6;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- State ---------------- */
  const state = { ...DEFAULTS };
  let serverOptions = false;
  let busy = false;
  let lastPresetIndex = 0;
  let pastGuesses = loadHistory();

  /* ---------------- DOM ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const form = $("#laptopForm");
  const screenEl = $("#screen");
  const priceEl = $("#priceValue");
  const errorEl = $("#errorText");
  const laptopEl = $("#laptop");
  const specTagEl = $("#specTag");
  const tierEl = $("#tier");
  const funEl = $("#fun");
  const predictBtn = $("#predictBtn");
  const toastEl = $("#toast");

  /* ---------------- Helpers ---------------- */
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtEuro = (n) => n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  /* ---------------- Rendering ---------------- */
  function renderChips(field, values, fmt = (v) => v) {
    const wrap = $(`#chips-${field}`);
    wrap.innerHTML = "";
    values.forEach((value) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.value = String(value);
      btn.textContent = fmt(value);
      btn.addEventListener("click", () => setValue(field, value));
      wrap.appendChild(btn);
    });
    refreshChips(field);
  }

  function refreshChips(field) {
    document.querySelectorAll(`#chips-${field} .chip`).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.value === String(state[field])));
    });
  }

  function renderDatalists() {
    TEXT_FIELDS.forEach((field) => {
      const dl = $(`#dl-${field}`);
      dl.innerHTML = "";
      OPTIONS[field].forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        dl.appendChild(opt);
      });
    });
  }

  function renderPresets() {
    const row = $("#presetRow");
    PRESETS.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset";
      btn.textContent = p.name;
      btn.addEventListener("click", () => {
        lastPresetIndex = i;
        applyConfig(p.data, `${p.name} loaded`);
      });
      row.appendChild(btn);
    });
  }

  function refreshField(field, skipInput = false) {
    if (CHIP_FIELDS.includes(field) || field === "Ram") {
      refreshChips(field);
      clearInvalid(field);
      return;
    }
    const input = $(`#${field}`);
    if (!input) return;
    if (!skipInput) input.value = state[field];
    if (RANGE_FIELDS.includes(field)) {
      const min = Number(input.min);
      const max = Number(input.max);
      const pct = clamp(((Number(state[field]) - min) / (max - min)) * 100, 0, 100);
      input.style.setProperty("--fill", `${pct}%`);
      $(`#out-${field}`).textContent =
        field === "Inches" ? `${Number(state[field]).toFixed(1)}″` : `${Number(state[field]).toFixed(2)} kg`;
    }
  }

  function syncUI() {
    Object.keys(state).forEach((f) => refreshField(f));
    TEXT_FIELDS.forEach(clearInvalid);
    updatePreview();
  }

  function updatePreview() {
    const t = clamp((Number(state.Inches) - 10.1) / (18.4 - 10.1), 0, 1);
    laptopEl.style.setProperty("--scale", (0.68 + t * 0.32).toFixed(3));

    const bits = [
      state.Company,
      state.TypeName,
      `${Number(state.Inches).toFixed(1)}″`,
      `${state.Ram}GB RAM`,
      `${Number(state.Weight).toFixed(2)}kg`,
      state.OpSys,
    ];
    specTagEl.innerHTML = "";
    bits.filter(Boolean).forEach((b) => {
      const s = document.createElement("span");
      s.textContent = b;
      specTagEl.appendChild(s);
    });
  }

  /* ---------------- State changes ---------------- */
  function setValue(field, value, { skipInput = false } = {}) {
    state[field] = value;
    refreshField(field, skipInput);
    updatePreview();
    markStale();
  }

  function applyConfig(cfg, msg) {
    Object.assign(state, cfg);
    syncUI();
    markStale();
    if (msg) toast(msg);
  }

  function surprise() {
    let i;
    do { i = Math.floor(Math.random() * PRESETS.length); } while (PRESETS.length > 1 && i === lastPresetIndex);
    lastPresetIndex = i;
    const dice = $("#surpriseBtn");
    dice.classList.remove("rolling");
    void dice.offsetWidth;
    dice.classList.add("rolling");
    applyConfig(PRESETS[i].data, `🎲 Rolled: ${PRESETS[i].name}`);
  }

  /* ---------------- Screen states ---------------- */
  function setScreen(st) {
    screenEl.dataset.state = st;
    screenEl.classList.remove("stale");
  }

  function markStale() {
    if (screenEl.dataset.state === "result") screenEl.classList.add("stale");
  }

  function hideResultExtras() {
    tierEl.hidden = true;
    funEl.hidden = true;
  }

  function setLoading(on) {
    predictBtn.disabled = on;
    $(".btn-text", predictBtn).textContent = on ? "⏳ Thinking…" : "🔮 Predict price";
  }

  /* ---------------- Validation ---------------- */
  function buildPayload() {
    return {
      Company: String(state.Company).trim(),
      TypeName: String(state.TypeName).trim(),
      Inches: Number(state.Inches),
      ScreenResolution: String(state.ScreenResolution).trim(),
      Cpu: String(state.Cpu).trim(),
      Ram: parseInt(state.Ram, 10),
      Memory: String(state.Memory).trim(),
      Gpu: String(state.Gpu).trim(),
      OpSys: String(state.OpSys).trim(),
      Weight: Number(state.Weight),
    };
  }

  function validate(payload) {
    for (const f of [...CHIP_FIELDS, ...TEXT_FIELDS]) {
      if (!payload[f]) return { field: f, msg: `Pick a ${LABELS[f]} first.` };
      if (serverOptions && !OPTIONS[f].includes(payload[f])) {
        return { field: f, msg: `The model has never seen that ${LABELS[f]}. Pick one from the suggestions.` };
      }
    }
    return null;
  }

  function highlightField(field) {
    const el = TEXT_FIELDS.includes(field) ? $(`#${field}`) : $(`#chips-${field}`);
    if (!el) return;
    el.classList.remove("invalid");
    void el.offsetWidth;
    el.classList.add("invalid");
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    if (el.tagName === "INPUT") el.focus({ preventScroll: true });
  }

  function clearInvalid(field) {
    const el = TEXT_FIELDS.includes(field) ? $(`#${field}`) : $(`#chips-${field}`);
    if (el) el.classList.remove("invalid");
  }

  /* ---------------- Predict ---------------- */
  async function predict() {
    if (busy) return;
    const payload = buildPayload();
    const problem = validate(payload);
    if (problem) {
      highlightField(problem.field);
      toast(`⚠️ ${problem.msg}`);
      return;
    }

    busy = true;
    setLoading(true);
    setScreen("loading");
    hideResultExtras();
    const started = performance.now();

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      try { data = await res.json(); } catch { /* non-JSON body */ }

      // Let the loading animation breathe for a moment
      await wait(Math.max(0, 800 - (performance.now() - started)));

      if (!res.ok) {
        const err = new Error(`API error ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      const price = Number(data && data.price_euros);
      if (!Number.isFinite(price)) throw new Error("The API answered, but without a price_euros value.");

      showResult(price);
      addHistory(price, payload);
    } catch (err) {
      showError(err);
    } finally {
      busy = false;
      setLoading(false);
    }
  }

  function showResult(price, { celebrate = true } = {}) {
    setScreen("result");
    animateNumber(priceEl, price);
    showTier(price);
    showFun(price);
    if (celebrate) confetti();
    if (window.innerWidth <= 960) {
      $("#stage").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  function showError(err) {
    let msg = err && err.message ? err.message : "Something went sideways.";
    if (err && err.status) {
      const detail = err.data && err.data.detail;
      if (typeof detail === "string") {
        msg = detail;
        // Backend sends e.g. "Unkown Cpu : Some value"
        const m = detail.match(/^Unk\w*\s+(\w+)\s*:/i);
        if (m) {
          highlightField(m[1]);
          toast(`🤷 The model doesn't know that ${LABELS[m[1]] || m[1]}.`);
        }
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join(" · ");
      }
    } else if (err instanceof TypeError) {
      msg = "Can't reach the API. Is the server running?";
    }
    errorEl.textContent = msg;
    setScreen("error");
  }

  function animateNumber(el, to) {
    if (reduceMotion) { el.textContent = fmtEuro(to); return; }
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtEuro(to * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function showTier(price) {
    const t = TIERS.find((x) => price < x.max) || TIERS[TIERS.length - 1];
    tierEl.textContent = t.label;
    tierEl.style.setProperty("--tier", t.color);
    tierEl.hidden = false;
    tierEl.style.animation = "none";
    void tierEl.offsetWidth;
    tierEl.style.animation = "";
  }

  function showFun(price) {
    funEl.innerHTML = "";
    FUN.forEach((f) => {
      const item = document.createElement("div");
      item.className = "fun-item";
      const e = document.createElement("span");
      e.className = "e";
      e.textContent = f.e;
      const n = document.createElement("strong");
      n.textContent = Math.max(0, Math.floor(price / f.unit)).toLocaleString("en-IE");
      const s = document.createElement("small");
      s.textContent = f.label;
      item.append(e, n, s);
      funEl.appendChild(item);
    });
    const note = document.createElement("p");
    note.className = "fun-note";
    note.textContent = "…or roughly that many. Choose wisely.";
    funEl.appendChild(note);
    funEl.hidden = false;
  }

  /* ---------------- History ---------------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(pastGuesses)); } catch { /* storage unavailable */ }
  }

  function addHistory(price, config) {
    pastGuesses.unshift({ price, config, at: Date.now() });
    pastGuesses = pastGuesses.slice(0, MAX_HISTORY);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    const list = $("#historyList");
    list.innerHTML = "";
    $("#historyEmpty").hidden = pastGuesses.length > 0;
    $("#clearHistory").hidden = pastGuesses.length === 0;

    pastGuesses.forEach((h) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.title = "Load this config";

      const meta = document.createElement("span");
      meta.className = "meta";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = `${h.config.Company} ${h.config.TypeName}`;
      const detail = document.createElement("span");
      detail.className = "detail";
      detail.textContent = `${h.config.Cpu} · ${h.config.Ram}GB · ${h.config.Memory}`;
      meta.append(name, detail);

      const amt = document.createElement("span");
      amt.className = "amt";
      amt.textContent = `€${fmtEuro(Number(h.price))}`;

      btn.append(meta, amt);
      btn.addEventListener("click", () => {
        applyConfig(h.config, "↩️ Config restored");
        showResult(Number(h.price), { celebrate: false });
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  /* ---------------- Confetti ---------------- */
  let confettiRaf = null;
  function confetti() {
    if (reduceMotion) return;
    const canvas = $("#confetti");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let rect = priceEl.getBoundingClientRect();
    if (!rect.width) rect = screenEl.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    const colors = ["#c8ff4d", "#ff5fa8", "#4fe3ff", "#8d6bff", "#ffb547"];

    const parts = Array.from({ length: 140 }, () => ({
      x: ox,
      y: oy,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
    }));

    const maxFrames = 150;
    let frame = 0;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const alpha = Math.max(0, 1 - frame / maxFrames);
      parts.forEach((p) => {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      frame += 1;
      if (frame < maxFrames) {
        confettiRaf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        confettiRaf = null;
      }
    };
    confettiRaf = requestAnimationFrame(tick);
  }

  /* ---------------- API helpers ---------------- */
  async function checkApi() {
    const pill = $("#apiStatus");
    const label = $(".api-label", pill);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      // Any HTTP response means the server is up (even if /docs is disabled).
      await fetch(`${API_BASE}/openapi.json`, { signal: ctrl.signal });
      pill.dataset.status = "online";
      label.textContent = "API online";
    } catch {
      pill.dataset.status = "offline";
      label.textContent = "API offline";
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadServerOptions() {
    try {
      const res = await fetch(`${API_BASE}/options`);
      if (!res.ok) return;
      const data = await res.json();
      let got = false;
      [...CHIP_FIELDS, ...TEXT_FIELDS].forEach((f) => {
        if (Array.isArray(data[f]) && data[f].length) {
          OPTIONS[f] = data[f].map(String).sort((a, b) => a.localeCompare(b));
          got = true;
        }
      });
      if (!got) return;
      serverOptions = true;
      CHIP_FIELDS.forEach((f) => renderChips(f, OPTIONS[f]));
      renderDatalists();
      $("#optionsHint").textContent = "✅ Suggestions are synced with the model's training data.";
    } catch {
      /* /options is optional — keep the built-in suggestions */
    }
  }

  /* ---------------- Events ---------------- */
  function bindEvents() {
    RANGE_FIELDS.forEach((field) => {
      $(`#${field}`).addEventListener("input", (e) => setValue(field, Number(e.target.value), { skipInput: true }));
    });
    TEXT_FIELDS.forEach((field) => {
      $(`#${field}`).addEventListener("input", (e) => {
        e.target.classList.remove("invalid");
        setValue(field, e.target.value, { skipInput: true });
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      predict();
    });

    $("#resetBtn").addEventListener("click", () => {
      lastPresetIndex = 0;
      applyConfig(DEFAULTS, "✨ Back to factory settings");
      setScreen("idle");
      hideResultExtras();
    });

    $("#surpriseBtn").addEventListener("click", surprise);

    $("#clearHistory").addEventListener("click", () => {
      pastGuesses = [];
      saveHistory();
      renderHistory();
      toast("🧹 History cleared");
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        predict();
      }
    });
  }

  /* ---------------- Init ---------------- */
  function init() {
    CHIP_FIELDS.forEach((f) => renderChips(f, OPTIONS[f]));
    renderChips("Ram", RAM_OPTIONS, (v) => `${v} GB`);
    renderDatalists();
    renderPresets();
    bindEvents();
    syncUI();
    renderHistory();
    checkApi();
    loadServerOptions();
  }

  init();
})();
