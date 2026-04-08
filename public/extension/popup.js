// NeuroTest AI — Extension Popup Logic

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const CATEGORY_COLORS = {
  "Social Media": "cat-social",
  "Video & Streaming": "cat-video",
  "News & Media": "cat-news",
  "Shopping": "cat-shopping",
  "Productivity": "cat-productivity",
  "Search & Info": "cat-search",
  "Communication": "cat-communication",
  "Education": "cat-education",
  "Gaming": "cat-gaming",
  "Health & Fitness": "cat-health",
  "Other": "cat-other",
};

const CATEGORY_COLORS_HEX = {
  "Social Media": "#ff6090",
  "Video & Streaming": "#7c6cf0",
  "News & Media": "#00c4ff",
  "Shopping": "#ffb020",
  "Productivity": "#00e8b0",
  "Search & Info": "#9d8ff8",
  "Communication": "#00c49a",
  "Education": "#d0ccf0",
  "Gaming": "#ff4060",
  "Health & Fitness": "#00e8b0",
  "Other": "#4a4a68",
};

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Load stats ────────────────────────────────────────────────

function loadStats() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (data) => {
    if (chrome.runtime.lastError || !data) {
      $("#loading").classList.add("hidden");
      $("#app").classList.remove("hidden");
      return;
    }

    // Session time
    $("#sessionTime").textContent = data.sessionMinutes > 0 ? `${data.sessionMinutes}m` : "< 1m";

    // Quick stats
    $("#totalTime").textContent = formatTime(data.totalSeconds);
    $("#siteCount").textContent = data.siteCount;

    // Top category
    const cats = Object.entries(data.categories).sort((a, b) => b[1] - a[1]);
    $("#topCategory").textContent = cats.length > 0 ? cats[0][0].split(" ")[0] : "—";

    // Categories
    renderCategories(data.categories, data.totalSeconds);

    // Top sites
    renderTopSites(data.topSites);

    // Last analysis
    if (data.lastAnalysis) {
      renderEffects(data.lastAnalysis);
    }

    // Show app
    $("#loading").classList.add("hidden");
    $("#app").classList.remove("hidden");
  });
}

function renderCategories(categories, totalSeconds) {
  const container = $("#categories");
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state">No browsing data yet<p>Start browsing and come back!</p></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 6).map(([name, seconds]) => {
    const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
    const colorClass = CATEGORY_COLORS[name] || "cat-other";
    const colorHex = CATEGORY_COLORS_HEX[name] || "#4a4a68";
    return `
      <div class="category-item">
        <div class="category-top">
          <div class="category-left">
            <div class="category-dot ${colorClass}"></div>
            <span class="category-name">${name}</span>
          </div>
          <span class="category-time">${formatTime(seconds)}</span>
        </div>
        <div class="category-bar-wrap">
          <div class="category-bar" style="width:${pct}%; background:${colorHex}"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderTopSites(sites) {
  const container = $("#topSites");

  if (sites.length === 0) {
    container.innerHTML = '<div class="empty-state">No sites tracked yet</div>';
    return;
  }

  container.innerHTML = sites.slice(0, 8).map((s, i) => `
    <div class="site-row">
      <div class="site-rank">${i + 1}</div>
      <span class="site-host">${s.host}</span>
      <span class="site-visits">${s.visits}x</span>
      <span class="site-time">${formatTime(s.seconds)}</span>
    </div>
  `).join("");
}

function renderEffects(analysis) {
  const section = $("#effectsSection");
  section.classList.remove("hidden");

  if (analysis.analyzedAt) {
    $("#analyzedTime").textContent = timeAgo(analysis.analyzedAt);
  }

  const effects = [
    { name: "Dopamine Load", score: analysis.dopamineLoad, color: "#ff6090" },
    { name: "Attention Drain", score: analysis.attentionDrain, color: "#ffb020" },
    { name: "Stress Level", score: analysis.stressLevel, color: "#ff4060" },
    { name: "Learning Score", score: analysis.learningScore, color: "#00e8b0" },
    { name: "Creativity", score: analysis.creativityScore, color: "#7c6cf0" },
    { name: "Social Need", score: analysis.socialNeedScore, color: "#9d8ff8" },
  ];

  $("#effects").innerHTML = effects.map(e => `
    <div class="effect-card">
      <div class="effect-name">${e.name}</div>
      <div class="effect-score" style="color:${e.color}">${e.score}<span style="font-size:11px;color:#4a4a68">/10</span></div>
      <div class="effect-bar">
        <div class="effect-fill" style="width:${e.score * 10}%; background:${e.color}"></div>
      </div>
    </div>
  `).join("");

  if (analysis.summary) {
    $("#effectsSummary").textContent = analysis.summary;
    $("#effectsSummary").style.display = "block";
  }
}

// ── Analyze ───────────────────────────────────────────────────

function startAnalysis() {
  $("#app").classList.add("hidden");
  $("#analyzing").classList.remove("hidden");

  let progress = 0;
  const fill = $("#progressFill");
  const status = $("#analyzeStatus");

  const messages = [
    "Processing browsing patterns...",
    "Extracting attention signals...",
    "5 AI agents scoring independently...",
    "Calculating neural effects...",
    "Building your brain report...",
  ];

  const progressTimer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 12 + 3, 90);
    fill.style.width = `${progress}%`;
    const msgIdx = Math.min(Math.floor(progress / 20), messages.length - 1);
    status.textContent = messages[msgIdx];
  }, 800);

  chrome.runtime.sendMessage({ type: "ANALYZE_BRAIN" }, (res) => {
    clearInterval(progressTimer);
    fill.style.width = "100%";

    setTimeout(() => {
      $("#analyzing").classList.add("hidden");
      if (res && res.success) {
        loadStats(); // reload with new analysis
      } else {
        // Show error and go back
        alert(res?.error || "Analysis failed. Make sure you have some browsing data.");
        $("#app").classList.remove("hidden");
      }
    }, 600);
  });
}

// ── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadStats();

  $("#analyzeBtn").addEventListener("click", startAnalysis);

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Reset all tracking data for this session?")) {
      chrome.runtime.sendMessage({ type: "RESET_SESSION" }, () => {
        loadStats();
      });
    }
  });

  $("#fullBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://neurotest.live" });
  });
});
