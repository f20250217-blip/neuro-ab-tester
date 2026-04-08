// NeuroTest AI — Background Service Worker (Manifest V3)
// Tracks browsing activity: sites visited, time spent, categories

const API_BASE = "https://neurotest.live";
// const API_BASE = "http://localhost:3000"; // dev

// ── Active tab time tracking ──────────────────────────────────────

let activeTab = { tabId: null, url: null, host: null, start: Date.now() };

function getHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

function flushActiveTime() {
  if (!activeTab.host || !activeTab.start) return;
  const seconds = Math.round((Date.now() - activeTab.start) / 1000);
  if (seconds < 3) return; // ignore very short visits

  chrome.storage.local.get(["timeData", "visitCounts", "sessionStart"], (r) => {
    const timeData = r.timeData || {};
    const visitCounts = r.visitCounts || {};
    const sessionStart = r.sessionStart || Date.now();

    timeData[activeTab.host] = (timeData[activeTab.host] || 0) + seconds;
    visitCounts[activeTab.host] = (visitCounts[activeTab.host] || 0) + 1;

    chrome.storage.local.set({ timeData, visitCounts, sessionStart });
  });
}

// Tab switch
chrome.tabs.onActivated.addListener(({ tabId }) => {
  flushActiveTime();
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    const host = getHost(tab.url);
    activeTab = { tabId, url: tab.url, host, start: Date.now() };
  });
});

// Tab URL change
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (tabId === activeTab.tabId && change.url) {
    flushActiveTime();
    const host = getHost(change.url);
    activeTab = { tabId, url: change.url, host, start: Date.now() };
  }
});

// Window focus lost — pause tracking
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    flushActiveTime();
    activeTab = { tabId: null, url: null, host: null, start: null };
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]?.url) {
        const host = getHost(tabs[0].url);
        activeTab = { tabId: tabs[0].id, url: tabs[0].url, host, start: Date.now() };
      }
    });
  }
});

// ── Periodic flush (every 1 min) via alarms ─────────────────────

chrome.alarms.create("flush", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "flush") {
    flushActiveTime();
    // Re-start timer for current tab
    if (activeTab.host) activeTab.start = Date.now();
  }
});

// ── Session init ────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    sessionStart: Date.now(),
    timeData: {},
    visitCounts: {},
    lastAnalysis: null,
  });
});

// ── Categorization helper ───────────────────────────────────────

const CATEGORIES = {
  "Social Media": ["facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com", "snapchat.com", "reddit.com", "linkedin.com", "threads.net", "mastodon.social", "bsky.app"],
  "Video & Streaming": ["youtube.com", "netflix.com", "twitch.tv", "disneyplus.com", "hulu.com", "primevideo.com", "crunchyroll.com", "vimeo.com"],
  "News & Media": ["cnn.com", "bbc.com", "nytimes.com", "theguardian.com", "reuters.com", "apnews.com", "washingtonpost.com", "news.google.com", "foxnews.com"],
  "Shopping": ["amazon.com", "ebay.com", "walmart.com", "etsy.com", "aliexpress.com", "shopify.com", "target.com", "bestbuy.com"],
  "Productivity": ["docs.google.com", "notion.so", "figma.com", "canva.com", "trello.com", "asana.com", "slack.com", "linear.app", "github.com", "gitlab.com", "vercel.com"],
  "Search & Info": ["google.com", "bing.com", "duckduckgo.com", "wikipedia.org", "stackoverflow.com", "quora.com"],
  "Communication": ["mail.google.com", "outlook.live.com", "discord.com", "telegram.org", "whatsapp.com", "zoom.us", "meet.google.com"],
  "Education": ["coursera.org", "udemy.com", "edx.org", "khanacademy.org", "duolingo.com", "medium.com", "substack.com"],
  "Gaming": ["store.steampowered.com", "epicgames.com", "roblox.com", "chess.com", "miniclip.com"],
  "Health & Fitness": ["myfitnesspal.com", "strava.com", "headspace.com", "calm.com"],
};

function categorizeHost(host) {
  for (const [category, domains] of Object.entries(CATEGORIES)) {
    if (domains.some(d => host.includes(d))) return category;
  }
  return "Other";
}

// ── Message handler for popup ───────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATS") {
    flushActiveTime();
    if (activeTab.host) activeTab.start = Date.now();

    chrome.storage.local.get(["timeData", "visitCounts", "sessionStart", "lastAnalysis"], (r) => {
      const timeData = r.timeData || {};
      const visitCounts = r.visitCounts || {};
      const sessionMinutes = Math.round((Date.now() - (r.sessionStart || Date.now())) / 60000);

      // Build categorized data
      const categories = {};
      const sites = [];

      for (const [host, seconds] of Object.entries(timeData)) {
        const cat = categorizeHost(host);
        categories[cat] = (categories[cat] || 0) + seconds;
        sites.push({
          host,
          seconds,
          visits: visitCounts[host] || 1,
          category: cat,
        });
      }

      sites.sort((a, b) => b.seconds - a.seconds);

      const totalSeconds = Object.values(timeData).reduce((a, b) => a + b, 0);

      sendResponse({
        totalSeconds,
        sessionMinutes,
        categories,
        topSites: sites.slice(0, 15),
        allSites: sites,
        siteCount: sites.length,
        lastAnalysis: r.lastAnalysis,
      });
    });
    return true; // async response
  }

  if (msg.type === "ANALYZE_BRAIN") {
    flushActiveTime();
    if (activeTab.host) activeTab.start = Date.now();

    chrome.storage.local.get(["timeData", "visitCounts", "sessionStart"], async (r) => {
      const timeData = r.timeData || {};
      const visitCounts = r.visitCounts || {};
      const sessionMinutes = Math.round((Date.now() - (r.sessionStart || Date.now())) / 60000);

      // Build browsing summary for AI
      const sites = Object.entries(timeData)
        .map(([host, seconds]) => ({
          host,
          minutes: Math.round(seconds / 60),
          visits: visitCounts[host] || 1,
          category: categorizeHost(host),
        }))
        .sort((a, b) => b.minutes - a.minutes);

      const categories = {};
      sites.forEach(s => {
        categories[s.category] = (categories[s.category] || 0) + s.minutes;
      });

      const summary = {
        sessionMinutes,
        totalMinutes: Math.round(Object.values(timeData).reduce((a, b) => a + b, 0) / 60),
        siteCount: sites.length,
        topSites: sites.slice(0, 20),
        categories,
        timestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch(`${API_BASE}/api/brain-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(summary),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        chrome.storage.local.set({ lastAnalysis: { ...data.analysis, analyzedAt: Date.now() } });
        sendResponse({ success: true, analysis: data.analysis });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }

  if (msg.type === "RESET_SESSION") {
    chrome.storage.local.set({
      sessionStart: Date.now(),
      timeData: {},
      visitCounts: {},
    });
    sendResponse({ success: true });
    return true;
  }
});
