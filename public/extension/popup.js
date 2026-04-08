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

    // Session time
    $("#sessionTime").textContent = data.sessionMinutes > 0 ? data.sessionMinutes + "m" : "<1m";

    // Metrics
    $("#totalTime").textContent = fmt(data.totalSeconds);
    $("#siteCount").textContent = data.siteCount;

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

// ── Categories ────────────────────────────────────────────

function renderCategories(categories, total) {
  const el = $("#categories");
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  if (!sorted.length) {
    el.innerHTML = '<div class="empty">Browse some sites to see data here</div>';
    return;
  }

  el.innerHTML = sorted.slice(0, 5).map(([name, secs]) => {
    const pct = total > 0 ? (secs / total) * 100 : 0;
    const cls = CAT_CLASS[name] || "c-other";
    const hex = CAT_HEX[name] || "#44445a";
    return `<div class="cat-row">
      <div class="cat-info">
        <div class="cat-left"><div class="cat-dot ${cls}"></div><span class="cat-name">${name}</span></div>
        <span class="cat-time">${fmt(secs)}</span>
      </div>
      <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%;background:${hex}"></div></div>
    </div>`;
  }).join("");
}

// ── Top Sites ─────────────────────────────────────────────

function renderTopSites(sites) {
  const el = $("#topSites");

  if (!sites.length) {
    el.innerHTML = '<div class="empty">No sites tracked yet</div>';
    return;
  }

  el.innerHTML = sites.slice(0, 6).map((s, i) => `
    <div class="site-row">
      <div class="site-rank${i === 0 ? " top" : ""}">${i + 1}</div>
      <span class="site-host">${s.host}</span>
      <div class="site-meta">
        <span class="site-visits">${s.visits}x</span>
        <span class="site-time">${fmt(s.seconds)}</span>
      </div>
    </div>
  `).join("");
}

// ── Neural Effects ────────────────────────────────────────

function renderEffects(analysis) {
  const el = $("#effectsContent");

  if (!analysis) {
    el.innerHTML = `<div class="effects-empty">
      <div class="effects-empty-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5a5a72" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8.5 2 5 4.5 5 8c0 1.5.5 3 1.5 4C5.5 13 5 14.5 5 16c0 3.5 3.5 6 7 6s7-2.5 7-6c0-1.5-.5-3-1.5-4 1-1 1.5-2.5 1.5-4 0-3.5-3.5-6-7-6z"/>
          <path d="M12 2v20"/><path d="M5 8h14"/><path d="M5 16h14"/>
        </svg>
      </div>
      <h3>No analysis yet</h3>
      <p>Hit "Analyze Brain Effects" to see how your browsing affects your brain.</p>
    </div>`;
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

  let html = '<div class="effects-grid">';
  effects.forEach((e) => {
    html += `<div class="effect-card">
      <div class="effect-label">${e.name}</div>
      <div class="effect-row">
        <span class="effect-value" style="color:${e.color}">${e.score}</span>
        <span class="effect-max">/10</span>
      </div>
      <div class="effect-bar-bg"><div class="effect-bar-fill" style="width:${e.score * 10}%;background:${e.color}"></div></div>
    </div>`;
  });
  html += "</div>";

  if (analysis.summary) {
    html += `<div class="effects-summary">${analysis.summary}</div>`;
  }

  if (analysis.analyzedAt) {
    html += `<div class="effects-time">Analyzed ${ago(analysis.analyzedAt)}</div>`;
  }

  el.innerHTML = html;
}

// ── Analyze ───────────────────────────────────────────────

function startAnalysis() {
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
    fill.style.width = "100%";

    setTimeout(() => {
      $("#analyzing").classList.add("hidden");
      if (res && res.success) {
        switchTab("effects");
        loadStats();
      } else {
        alert(res?.error || "Analysis failed. Browse a few sites first.");
        $("#app").classList.remove("hidden");
      }
    }, 500);
  });
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadStats();

  // Tab clicks
  $$(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  // Buttons
  $("#analyzeBtn").addEventListener("click", startAnalysis);

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Reset all tracking data?")) {
      chrome.runtime.sendMessage({ type: "RESET_SESSION" }, () => {
        switchTab("activity");
        loadStats();
      });
    }
  });

  $("#fullBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://neurotest.live" });
  });
});
