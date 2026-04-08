// NeuroTest — Extension Popup

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const CAT_CLASS = {
  "Social Media": "c-social",
  "Video & Streaming": "c-video",
  "News & Media": "c-news",
  "Shopping": "c-shopping",
  "Productivity": "c-prod",
  "Search & Info": "c-search",
  "Communication": "c-comms",
  "Education": "c-edu",
  "Gaming": "c-gaming",
  "Health & Fitness": "c-health",
  "Other": "c-other",
};

const CAT_HEX = {
  "Social Media": "#e8457a",
  "Video & Streaming": "#7c6cf0",
  "News & Media": "#00aadd",
  "Shopping": "#e8a020",
  "Productivity": "#00c88a",
  "Search & Info": "#8a80e0",
  "Communication": "#00aa88",
  "Education": "#b0a8e0",
  "Gaming": "#e04050",
  "Health & Fitness": "#00c88a",
  "Other": "#44445a",
};

function fmt(s) {
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? h + "h " + rm + "m" : h + "h";
}

function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  return h < 24 ? h + "h ago" : Math.floor(h / 24) + "d ago";
}

// Safe DOM helper — no innerHTML
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") node.className = v;
      else if (k === "textContent") node.textContent = v;
      else if (k.startsWith("style.")) node.style[k.slice(6)] = v;
      else node.setAttribute(k, v);
    }
  }
  if (children) {
    for (const c of Array.isArray(children) ? children : [children]) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    }
  }
  return node;
}

// ── Tabs ───────────────────────────────────────────────────

let currentTab = "activity";

function switchTab(name) {
  currentTab = name;
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  $$("#tab-activity, #tab-effects").forEach((p) => p.classList.toggle("hidden", p.id !== "tab-" + name));
}

// ── Load stats ─────────────────────────────────────────────

let lastData = null;

function loadStats() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (data) => {
    if (chrome.runtime.lastError || !data) {
      showApp();
      return;
    }
    lastData = data;

    $("#sessionTime").textContent = data.sessionMinutes > 0 ? data.sessionMinutes + "m" : "<1m";
    $("#totalTime").textContent = fmt(data.totalSeconds);
    $("#siteCount").textContent = String(data.siteCount);

    const cats = Object.entries(data.categories).sort((a, b) => b[1] - a[1]);
    $("#topCategory").textContent = cats.length > 0 ? cats[0][0].split(" ")[0] : "\u2014";

    renderCategories(data.categories, data.totalSeconds);
    renderTopSites(data.topSites);
    renderEffects(data.lastAnalysis);

    showApp();
  });
}

function showApp() {
  $("#loading").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

// ── Categories (safe DOM) ─────────────────────────────────

function renderCategories(categories, total) {
  const container = $("#categories");
  container.textContent = "";
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  if (!sorted.length) {
    container.appendChild(el("div", { className: "empty", textContent: "Browse some sites to see data here" }));
    return;
  }

  sorted.slice(0, 5).forEach(([name, secs]) => {
    const pct = total > 0 ? (secs / total) * 100 : 0;
    const cls = CAT_CLASS[name] || "c-other";
    const hex = CAT_HEX[name] || "#44445a";

    const row = el("div", { className: "cat-row" }, [
      el("div", { className: "cat-info" }, [
        el("div", { className: "cat-left" }, [
          el("div", { className: "cat-dot " + cls }),
          el("span", { className: "cat-name", textContent: name }),
        ]),
        el("span", { className: "cat-time", textContent: fmt(secs) }),
      ]),
      (() => {
        const bg = el("div", { className: "cat-bar-bg" });
        const fill = el("div", { className: "cat-bar-fill" });
        fill.style.width = pct + "%";
        fill.style.background = hex;
        bg.appendChild(fill);
        return bg;
      })(),
    ]);
    container.appendChild(row);
  });
}

// ── Top Sites (safe DOM) ──────────────────────────────────

function renderTopSites(sites) {
  const container = $("#topSites");
  container.textContent = "";

  if (!sites.length) {
    container.appendChild(el("div", { className: "empty", textContent: "No sites tracked yet" }));
    return;
  }

  sites.slice(0, 6).forEach((s, i) => {
    const row = el("div", { className: "site-row" }, [
      el("div", { className: "site-rank" + (i === 0 ? " top" : ""), textContent: String(i + 1) }),
      el("span", { className: "site-host", textContent: s.host }),
      el("div", { className: "site-meta" }, [
        el("span", { className: "site-visits", textContent: s.visits + "x" }),
        el("span", { className: "site-time", textContent: fmt(s.seconds) }),
      ]),
    ]);
    container.appendChild(row);
  });
}

// ── Neural Effects (safe DOM) ─────────────────────────────

function renderEffects(analysis) {
  const container = $("#effectsContent");
  container.textContent = "";

  if (!analysis) {
    const emptyIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    emptyIcon.setAttribute("width", "22");
    emptyIcon.setAttribute("height", "22");
    emptyIcon.setAttribute("viewBox", "0 0 24 24");
    emptyIcon.setAttribute("fill", "none");
    emptyIcon.setAttribute("stroke", "#5a5a72");
    emptyIcon.setAttribute("stroke-width", "1.5");
    emptyIcon.setAttribute("stroke-linecap", "round");
    emptyIcon.setAttribute("stroke-linejoin", "round");
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p1.setAttribute("d", "M2 12h4l3-7 3.5 14 3-12 2.5 5H22");
    emptyIcon.appendChild(p1);

    const iconWrap = el("div", { className: "effects-empty-icon" });
    iconWrap.appendChild(emptyIcon);

    container.appendChild(el("div", { className: "effects-empty" }, [
      iconWrap,
      el("h3", { textContent: "No analysis yet" }),
      el("p", { textContent: 'Hit "Analyze Brain Effects" to see how your browsing affects your brain.' }),
    ]));
    return;
  }

  const effects = [
    { name: "Dopamine", score: analysis.dopamineLoad, color: "#e8457a" },
    { name: "Attention", score: analysis.attentionDrain, color: "#e8a020" },
    { name: "Stress", score: analysis.stressLevel, color: "#e04050" },
    { name: "Learning", score: analysis.learningScore, color: "#00c88a" },
    { name: "Creativity", score: analysis.creativityScore, color: "#7c6cf0" },
    { name: "Social Need", score: analysis.socialNeedScore, color: "#8a80e0" },
  ];

  const grid = el("div", { className: "effects-grid" });
  effects.forEach((e) => {
    const valSpan = el("span", { className: "effect-value", textContent: String(e.score) });
    valSpan.style.color = e.color;
    const barFill = el("div", { className: "effect-bar-fill" });
    barFill.style.width = (e.score * 10) + "%";
    barFill.style.background = e.color;

    grid.appendChild(el("div", { className: "effect-card" }, [
      el("div", { className: "effect-label", textContent: e.name }),
      el("div", { className: "effect-row" }, [
        valSpan,
        el("span", { className: "effect-max", textContent: "/10" }),
      ]),
      el("div", { className: "effect-bar-bg" }, [barFill]),
    ]));
  });
  container.appendChild(grid);

  if (analysis.summary) {
    container.appendChild(el("div", { className: "effects-summary", textContent: analysis.summary }));
  }

  if (analysis.analyzedAt) {
    container.appendChild(el("div", { className: "effects-time", textContent: "Analyzed " + ago(analysis.analyzedAt) }));
  }
}

// ── Analyze ───────────────────────────────────────────────

let analyzing = false;

function startAnalysis() {
  if (analyzing) return;
  analyzing = true;

  $("#app").classList.add("hidden");
  $("#analyzing").classList.remove("hidden");

  let progress = 0;
  const fill = $("#progressFill");
  const status = $("#analyzeStatus");

  const msgs = [
    "Processing browsing patterns...",
    "Extracting attention signals...",
    "5 agents scoring independently...",
    "Computing neural effects...",
    "Building brain report...",
  ];

  const timer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 10 + 3, 90);
    fill.style.width = progress + "%";
    status.textContent = msgs[Math.min(Math.floor(progress / 20), msgs.length - 1)];
  }, 800);

  chrome.runtime.sendMessage({ type: "ANALYZE_BRAIN" }, (res) => {
    clearInterval(timer);
    analyzing = false;
    fill.style.width = "100%";

    setTimeout(() => {
      $("#analyzing").classList.add("hidden");
      if (res && res.success) {
        switchTab("effects");
        loadStats();
      } else {
        const errMsg = (res && res.error) ? res.error : "Analysis failed. Browse a few sites first.";
        alert(errMsg);
        $("#app").classList.remove("hidden");
      }
    }, 500);
  });
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadStats();

  $$(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  $("#analyzeBtn").addEventListener("click", startAnalysis);

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Reset all tracking data?")) {
      chrome.runtime.sendMessage({ type: "RESET_SESSION" }, () => {
        if (chrome.runtime.lastError) {
          console.error("Reset failed:", chrome.runtime.lastError.message);
          return;
        }
        switchTab("activity");
        loadStats();
      });
    }
  });

  $("#fullBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://neurotest.live" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to open tab:", chrome.runtime.lastError.message);
      }
    });
  });
});
