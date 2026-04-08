"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import ScoreBar from "@/components/ScoreBar";
import RegionTable from "@/components/RegionTable";
import { ComparisonResult, NeuralAnalysis } from "@/lib/neuro-engine";

const Brain3D = dynamic(() => import("@/components/Brain3D"), { ssr: false });
const HeroBrain = dynamic(() => import("@/components/Brain3D").then((m) => ({ default: m.HeroBrain })), { ssr: false });

type AppState = "home" | "ab-upload" | "profile-upload" | "processing" | "ab-results" | "profile-results";
type AnalysisMode = "ab-testing" | "photo" | "music" | "browsing" | "social" | "text" | "screen-time";

interface ModeConfig {
  id: AnalysisMode;
  title: string;
  shortTitle: string;
  desc: string;
  color: string;
  acceptText: string;
  acceptTypes: string;
  hasTextInput: boolean;
  hasUrlInput: boolean;
  hasFileInput: boolean;
  textPlaceholder?: string;
  urlPlaceholder?: string;
  badge?: string;
}

const MODES: ModeConfig[] = [
  {
    id: "ab-testing", title: "A/B Creative Testing", shortTitle: "A/B Test",
    desc: "Compare two ads side-by-side. Five AI experts predict the winner before you spend a dollar.",
    color: "#7c6cf0", acceptText: "Two video, image, or audio files", acceptTypes: "video/*,image/*,audio/*",
    hasTextInput: false, hasUrlInput: false, hasFileInput: true, badge: "Most Popular",
  },
  {
    id: "photo", title: "Photo Personality Profile", shortTitle: "Photo",
    desc: "Upload photos to reveal personality traits, lifestyle patterns, and emotional neural signatures.",
    color: "#00e8b0", acceptText: "Images (JPG, PNG, WebP)", acceptTypes: "image/*",
    hasTextInput: false, hasUrlInput: false, hasFileInput: true,
  },
  {
    id: "music", title: "Music Neural Profile", shortTitle: "Music",
    desc: "Analyze songs to discover mood patterns, personality traits, and neurochemical triggers.",
    color: "#ff6090", acceptText: "Audio files or paste a URL", acceptTypes: "audio/*,video/*",
    hasTextInput: false, hasUrlInput: true, hasFileInput: true, urlPlaceholder: "https://youtube.com/watch?v=... or Spotify URL",
  },
  {
    id: "browsing", title: "Browsing Behavior Analysis", shortTitle: "Browsing",
    desc: "Paste your browsing history or URLs. Map digital attention patterns and interest neural signatures.",
    color: "#00c4ff", acceptText: "Browser history export or URL list", acceptTypes: "application/json,text/csv,text/plain",
    hasTextInput: true, hasUrlInput: false, hasFileInput: true, textPlaceholder: "Paste your browsing history, frequently visited URLs, or bookmarks here...",
  },
  {
    id: "social", title: "Social Media Profile", shortTitle: "Social",
    desc: "Analyze your social media presence. Decode communication style, influence patterns, and audience psychology.",
    color: "#ffb020", acceptText: "Social media URLs or profile exports", acceptTypes: "image/*,text/plain,application/json",
    hasTextInput: true, hasUrlInput: true, hasFileInput: true,
    urlPlaceholder: "https://instagram.com/username or profile URL",
    textPlaceholder: "Paste your recent posts, bio, or profile export data here...",
  },
  {
    id: "text", title: "Text & Chat Analysis", shortTitle: "Text",
    desc: "Analyze written communication. Reveal emotional intelligence, persuasion patterns, and cognitive style.",
    color: "#9d8ff8", acceptText: "Text files, chat exports, or paste text", acceptTypes: "text/*,application/json",
    hasTextInput: true, hasUrlInput: false, hasFileInput: true, textPlaceholder: "Paste your messages, emails, or written content here...",
  },
  {
    id: "screen-time", title: "Screen Time Neural Map", shortTitle: "Screen Time",
    desc: "Upload screen time screenshots. Map digital addiction patterns, productivity signals, and attention health.",
    color: "#00e8b0", acceptText: "Screen time screenshots or data exports", acceptTypes: "image/*,text/*",
    hasTextInput: true, hasUrlInput: false, hasFileInput: true, textPlaceholder: "Or describe your daily screen time: which apps, how many hours, when you use them...",
  },
];

export default function Home() {
  const [state, setState] = useState<AppState>("home");
  const [mode, setMode] = useState<AnalysisMode>("ab-testing");

  // AB testing states
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [labelA, setLabelA] = useState("Content A");
  const [labelB, setLabelB] = useState("Content B");
  const [result, setResult] = useState<ComparisonResult | null>(null);

  // Profile states
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileText, setProfileText] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [profileResult, setProfileResult] = useState<NeuralAnalysis | null>(null);

  // Shared states
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Animated counter for stats
  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    if (state === "home") {
      const timer = setTimeout(() => setStatsVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setStatsVisible(false);
  }, [state]);

  // Live scan counter (simulated social proof)
  const [liveScans, setLiveScans] = useState(2847);
  const [activeNow, setActiveNow] = useState(23);
  useEffect(() => {
    if (state !== "home") return;
    const scanInterval = setInterval(() => {
      setLiveScans(p => p + Math.floor(Math.random() * 3) + 1);
    }, Math.random() * 2000 + 1500);
    const activeInterval = setInterval(() => {
      setActiveNow(p => Math.max(12, Math.min(45, p + (Math.random() > 0.5 ? 1 : -1))));
    }, Math.random() * 3000 + 2000);
    return () => { clearInterval(scanInterval); clearInterval(activeInterval); };
  }, [state]);

  // Toast notifications (social proof)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState({ name: "", action: "", time: "" });
  const toastNames = ["Alex from NYC", "Priya from Mumbai", "Lucas from Berlin", "Yuki from Tokyo", "Emma from London", "Carlos from SP", "Aisha from Dubai", "Chen from Shanghai", "Sofia from Rome", "Jake from Sydney"];
  const toastActions = ["completed a neural scan", "analyzed their Spotify data", "tested 2 ad creatives", "mapped their browsing profile", "ran a photo personality scan", "analyzed screen time patterns"];
  useEffect(() => {
    if (state !== "home") return;
    const showToast = () => {
      setToastData({
        name: toastNames[Math.floor(Math.random() * toastNames.length)],
        action: toastActions[Math.floor(Math.random() * toastActions.length)],
        time: `${Math.floor(Math.random() * 5) + 1}m ago`
      });
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 4000);
    };
    const first = setTimeout(showToast, 3000);
    const interval = setInterval(showToast, Math.random() * 8000 + 8000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [state]);

  // Scroll reveal observer — wait a tick for DOM to paint
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (state !== "home") return;
    const timer = requestAnimationFrame(() => {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observerRef.current?.unobserve(e.target); // stop watching once revealed
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
      document.querySelectorAll(".scroll-reveal").forEach(el => observerRef.current?.observe(el));
    });
    return () => { cancelAnimationFrame(timer); observerRef.current?.disconnect(); };
  }, [state]);

  // Animated number counter hook
  const useCounter = (target: number, duration = 2000, active = false) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      if (!active) { setCount(0); return; }
      let start = 0;
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [active, target, duration]);
    return count;
  };

  const statScans = useCounter(2847, 2200, statsVisible);
  const statAgents = useCounter(5, 1500, statsVisible);
  const statRegions = useCounter(12, 1800, statsVisible);
  const statFeatures = useCounter(37, 2000, statsVisible);

  const hasA = fileA || urlA;
  const hasB = fileB || urlB;
  const hasProfile = profileFile || profileText.trim() || profileUrl.trim();
  const currentMode = MODES.find((m) => m.id === mode) || MODES[0];

  const selectMode = (m: AnalysisMode) => {
    setMode(m);
    setError(null);
    if (m === "ab-testing") setState("ab-upload");
    else setState("profile-upload");
  };

  const runAnalysis = useCallback(async () => {
    if (!hasA || !hasB) return;
    setState("processing");
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) { clearInterval(progressInterval); return 92; }
        return p + Math.random() * 4;
      });
    }, 800);

    try {
      const formData = new FormData();
      if (fileA) formData.append("contentA", fileA);
      if (fileB) formData.append("contentB", fileB);
      if (urlA) formData.append("urlA", urlA);
      if (urlB) formData.append("urlB", urlB);
      formData.append("labelA", labelA);
      formData.append("labelB", labelB);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data.comparison);
      setProgress(100);
      setTimeout(() => setState("ab-results"), 800);
    } catch (e: any) {
      setError(e.message);
      setState("ab-upload");
    } finally {
      clearInterval(progressInterval);
    }
  }, [fileA, fileB, urlA, urlB, hasA, hasB, labelA, labelB]);

  const runProfileAnalysis = useCallback(async () => {
    if (!hasProfile) return;
    setState("processing");
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) { clearInterval(progressInterval); return 92; }
        return p + Math.random() * 5;
      });
    }, 600);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      if (profileFile) formData.append("file", profileFile);
      if (profileText.trim()) formData.append("text", profileText.trim());
      if (profileUrl.trim()) formData.append("url", profileUrl.trim());

      const res = await fetch("/api/profile", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setProfileResult(data.analysis);
      setProgress(100);
      setTimeout(() => setState("profile-results"), 800);
    } catch (e: any) {
      setError(e.message);
      setState("profile-upload");
    } finally {
      clearInterval(progressInterval);
    }
  }, [profileFile, profileText, profileUrl, hasProfile, mode]);

  const reset = () => {
    setState("home");
    setFileA(null); setFileB(null);
    setUrlA(""); setUrlB("");
    setProfileFile(null); setProfileText(""); setProfileUrl("");
    setResult(null); setProfileResult(null);
    setError(null); setProgress(0);
    setActiveTab("overview");
  };

  return (
    <div className="min-h-screen bg-[#050508] overflow-x-hidden relative">
      {/* Ambient background — desktop only (blur is expensive on mobile) */}
      <div className="fixed inset-0 pointer-events-none z-0 hidden sm:block">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#7c6cf0]/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#00e8b0]/[0.02] rounded-full blur-[150px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-[#ff6090]/[0.015] rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="border-b border-[#1e1e30]/60 bg-[#050508]/95 sm:bg-[#050508]/80 sm:backdrop-blur-xl sticky top-0 z-50 no-select">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group" onClick={reset}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center shadow-lg shadow-[#7c6cf0]/20 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold gradient-text leading-tight tracking-tight">NeuroTest AI</h1>
              <p className="text-[9px] sm:text-[10px] text-[#4a4a68] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-medium hidden sm:block">Neural Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {(state === "ab-results" || state === "profile-results") && (
              <button onClick={reset} className="px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm bg-[#111119] border border-[#1e1e30] rounded-xl hover:bg-[#16161f] transition-all text-[#f0f0f8] font-medium active:bg-[#16161f]">
                + New
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c0c14] border border-[#1e1e30]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00e8b0] shadow-[0_0_6px_rgba(0,232,176,0.5)]" />
              <span className="text-[10px] text-[#7a7a98] font-medium">Multi-Agent Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== HOME STATE ==================== */}
      {state === "home" && (
        <main className="relative z-10">
          {/* Animated mesh gradient background — desktop only */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden sm:block">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#7c6cf0]/[0.04] rounded-full blur-[120px] blob-1" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00e8b0]/[0.03] rounded-full blur-[120px] blob-2" />
            <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-[#ff6090]/[0.02] rounded-full blur-[120px] blob-3" />
          </div>

          {/* Grid BG */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,108,240,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,240,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          {/* Toast notification */}
          {toastVisible && (
            <div className="fixed top-20 right-4 sm:right-6 z-50 toast-animate">
              <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/40 border border-[#1e1e30] max-w-[300px]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#f0f0f8] truncate">{toastData.name}</p>
                  <p className="text-[10px] text-[#4a4a68] truncate">{toastData.action} &middot; {toastData.time}</p>
                </div>
              </div>
            </div>
          )}

          {/* Hero */}
          <section className="relative max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center pt-4 pb-2">
              <div className="relative -mx-6">
                <HeroBrain />
                <div className="absolute inset-x-0 bottom-0 h-32 sm:h-64 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent" />
              </div>
              <div className="relative -mt-12 sm:-mt-36 z-10 space-y-4 sm:space-y-5 px-2 sm:px-0">
                {/* Live counter badge */}
                <div className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#7c6cf0]/10 to-[#00e8b0]/10 border border-[#7c6cf0]/20 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-full bg-[#00e8b0] live-dot flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] text-[#d0ccf0] font-semibold tracking-wide">
                    <span className="text-[#00e8b0] font-mono tabular-nums">{activeNow}</span> scanning now &middot; <span className="text-[#9d8ff8] font-mono tabular-nums">{liveScans.toLocaleString()}</span> scans today
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-[-0.03em]">
                  <span className="gradient-text-shimmer">See What Your Brain</span>
                  <br />
                  <span className="gradient-text">Can&apos;t Hide</span>
                </h2>

                <p className="text-[#f0f0f8]/70 text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                  AI reads your digital fingerprint. <span className="text-[#00e8b0]">Every click tells a story.</span>
                </p>

                <p className="text-[#7a7a98] max-w-xl mx-auto text-xs sm:text-sm leading-relaxed font-medium">
                  Upload anything — ads, photos, playlists, browsing history, screen time — and 5 AI experts
                  map your neural response across 12 brain regions in real time.
                </p>

                {/* Hero CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <button
                    onClick={() => selectMode("ab-testing")}
                    className="relative group w-full sm:w-auto"
                  >
                    <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-[#7c6cf0] via-[#00e8b0] to-[#ff6090] opacity-60 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                    <div className="relative px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 group-hover:shadow-[0_20px_60px_rgba(124,108,240,0.4)] group-active:scale-[0.97]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Start Neural Scan — Free
                    </div>
                  </button>
                  <button
                    onClick={() => { document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="px-6 py-3.5 rounded-2xl text-[#7a7a98] hover:text-[#f0f0f8] active:text-[#f0f0f8] text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    Explore 7 Modes
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="flex justify-center mt-6 sm:mt-8">
              <div className="bounce-indicator">
                <svg className="w-5 h-5 text-[#4a4a68]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </div>
            </div>
          </section>

          {/* Stats — live counters */}
          <section className="relative border-y border-[#1e1e30]/40 bg-[#0c0c14] sm:bg-[#0c0c14]/50 sm:backdrop-blur-xl mt-6 sm:mt-8">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 sm:py-6">
              <div className="grid grid-cols-4 gap-3 sm:gap-8">
                {[
                  { value: statScans, label: "Scans Today", color: "#7c6cf0", suffix: "" },
                  { value: statAgents, label: "AI Agents", color: "#00e8b0", suffix: "" },
                  { value: statRegions, label: "Brain Regions", color: "#9d8ff8", suffix: "" },
                  { value: statFeatures, label: "Features", color: "#ff6090", suffix: "" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className={`text-xl sm:text-3xl md:text-4xl font-black tabular-nums tracking-tight transition-all duration-700 font-mono ${statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ color: stat.color }}>
                      {stat.value.toLocaleString()}{stat.suffix}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-[#4a4a68] font-semibold uppercase tracking-[0.1em] sm:tracking-[0.15em] mt-0.5 sm:mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Blurred Preview Teaser */}
          <section className="max-w-5xl mx-auto px-4 md:px-6 py-10 sm:py-14">
            <div className="scroll-reveal">
              <div className="relative glass-card rounded-3xl overflow-hidden group cursor-pointer" onClick={() => selectMode("ab-testing")}>
                {/* Fake result preview */}
                <div className="p-5 sm:p-8 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent z-20" />
                  <div className="filter blur-[6px] group-hover:blur-[3px] transition-all duration-700">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-[#7c6cf0] flex items-center justify-center text-xl font-black text-white">A</div>
                      <div className="flex-1">
                        <div className="h-3 bg-[#1e1e30] rounded-full w-1/3 mb-2" />
                        <div className="h-2 bg-[#1e1e30]/50 rounded-full w-1/2" />
                      </div>
                      <div className="text-4xl font-black text-[#00e8b0]">8.7</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {["Emotional", "Memory", "Decision", "Attention", "Trust"].map((l, i) => (
                        <div key={l} className="bg-[#0c0c14] rounded-xl p-3 border border-[#1e1e30]/30">
                          <div className="h-2 bg-[#1e1e30]/50 rounded-full w-2/3 mb-2" />
                          <div className="h-1.5 rounded-full" style={{ width: `${60 + i * 8}%`, background: `linear-gradient(90deg, #7c6cf0, #00e8b0)` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Overlay CTA */}
                  <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center shadow-2xl shadow-[#7c6cf0]/30 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-[#f0f0f8]">See Your Neural Report</p>
                      <p className="text-[11px] text-[#7a7a98]">Takes 30 seconds. No signup needed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mode Selector — Bento Grid */}
          <section id="modes" className="max-w-6xl mx-auto px-4 md:px-6 py-10 sm:py-16">
            <div className="scroll-reveal">
              <div className="text-center mb-8 sm:mb-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-[#7c6cf0]">Choose Your Analysis</p>
                <h3 className="text-xl sm:text-2xl md:text-4xl font-bold text-[#f0f0f8] tracking-[-0.02em]">
                  7 Ways to Read Your Mind
                </h3>
                <p className="text-xs sm:text-sm text-[#4a4a68] mt-2 font-medium">Pick one. You won&apos;t be able to stop at just one.</p>
              </div>
            </div>

            {/* Bento grid — featured card large, rest in grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => selectMode(m.id)}
                  className={`scroll-reveal relative group text-left glass-card glass-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-500 active:scale-[0.97] hover:scale-[1.02]
                    ${i === 0 ? "sm:col-span-2 lg:col-span-2 sm:row-span-1" : ""}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${m.color}08, transparent 70%)` }} />

                  {m.badge && (
                    <div className="absolute -top-2.5 right-4 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] text-white shadow-lg shadow-[#7c6cf0]/20">
                      {m.badge}
                    </div>
                  )}
                  <div className={`flex ${i === 0 ? "flex-col sm:flex-row items-start" : "items-start"} gap-4`}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#1e1e30] group-hover:border-transparent group-hover:shadow-lg transition-all duration-500 group-active:scale-90"
                      style={{ backgroundColor: `${m.color}10` }}>
                      <div className="w-3 h-3 rounded-full transition-all duration-500 group-hover:scale-150 group-hover:shadow-lg" style={{ backgroundColor: m.color, boxShadow: `0 0 0 0 ${m.color}` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`${i === 0 ? "text-base sm:text-lg" : "text-sm"} font-bold text-[#f0f0f8] mb-1.5 group-hover:text-white transition-colors`}>{m.title}</h4>
                      <p className={`${i === 0 ? "text-sm sm:text-sm" : "text-xs"} text-[#4a4a68] leading-relaxed ${i === 0 ? "" : "line-clamp-2"}`}>{m.desc}</p>
                      <p className="text-[10px] font-semibold mt-2.5 flex items-center gap-1.5 transition-colors group-hover:gap-2.5" style={{ color: m.color }}>
                        {m.acceptText}
                        <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Browser Extension Promo */}
          <section className="border-t border-[#1e1e30]/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7c6cf0]/[0.03] via-transparent to-[#00e8b0]/[0.02] pointer-events-none" />
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 sm:py-16 relative">
              <div className="scroll-reveal">
                <div className="glass-card rounded-3xl overflow-hidden relative">
                  {/* Background glow */}
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#7c6cf0]/[0.06] rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#00e8b0]/[0.04] rounded-full blur-[60px] pointer-events-none" />

                  <div className="p-6 sm:p-10 relative">
                    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                      {/* Left — text */}
                      <div className="flex-1 text-center lg:text-left space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6090]/10 border border-[#ff6090]/20">
                          <span className="text-[10px] font-bold text-[#ff6090] uppercase tracking-wider">New — Browser Extension</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#f0f0f8] tracking-[-0.03em] leading-tight">
                          Your browser knows you<br />
                          <span className="gradient-text">better than you think.</span>
                        </h3>
                        <p className="text-sm sm:text-base text-[#7a7a98] max-w-md mx-auto lg:mx-0 leading-relaxed">
                          Install our Chrome/Brave extension and see in real time what your browsing does to your brain.
                          Dopamine spikes. Attention drain. Focus quality. All mapped live.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                          <a
                            href="/extension/neurotest-extension.zip"
                            className="relative group inline-flex w-full sm:w-auto"
                          >
                            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#7c6cf0] to-[#ff6090] opacity-50 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
                            <div className="relative px-6 sm:px-8 py-3.5 rounded-2xl bg-[#0c0c14] text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 group-hover:bg-[#111119] group-active:scale-[0.97] w-full sm:w-auto">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Install Extension
                            </div>
                          </a>
                          <span className="text-[11px] text-[#4a4a68] font-medium">Chrome &middot; Brave &middot; Edge</span>
                        </div>
                      </div>

                      {/* Right — mockup */}
                      <div className="w-full max-w-[280px] lg:max-w-[260px] flex-shrink-0">
                        <div className="glass-card rounded-2xl overflow-hidden border border-[#1e1e30] shadow-2xl shadow-black/40">
                          {/* Fake extension popup preview */}
                          <div className="bg-[#0c0c14] px-4 py-3 border-b border-[#1e1e30] flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <span className="text-[11px] font-bold gradient-text">NeuroTest AI</span>
                            <div className="ml-auto flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00e8b0] live-dot" />
                              <span className="text-[9px] text-[#4a4a68]">42m</span>
                            </div>
                          </div>
                          {/* Fake stats */}
                          <div className="p-3 space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { v: "42m", l: "Screen Time" },
                                { v: "8", l: "Sites" },
                                { v: "Social", l: "Top Cat" },
                              ].map(s => (
                                <div key={s.l} className="bg-[#050508] rounded-lg p-2 text-center border border-[#1e1e30]/50">
                                  <div className="text-[13px] font-extrabold text-[#f0f0f8]">{s.v}</div>
                                  <div className="text-[7px] text-[#4a4a68] uppercase tracking-wider font-semibold">{s.l}</div>
                                </div>
                              ))}
                            </div>
                            {/* Fake neural scores */}
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { n: "Dopamine", s: 7.2, c: "#ff6090" },
                                { n: "Attention", s: 4.8, c: "#ffb020" },
                                { n: "Learning", s: 6.1, c: "#00e8b0" },
                                { n: "Focus", s: 5.5, c: "#7c6cf0" },
                              ].map(e => (
                                <div key={e.n} className="bg-[#050508] rounded-lg p-2 border border-[#1e1e30]/50">
                                  <div className="text-[7px] text-[#4a4a68] uppercase tracking-wider font-semibold mb-1">{e.n}</div>
                                  <div className="text-[15px] font-extrabold" style={{ color: e.c }}>{e.s}<span className="text-[8px] text-[#4a4a68]">/10</span></div>
                                  <div className="h-1 bg-[#111119] rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${e.s * 10}%`, background: e.c }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Fake analyze button */}
                            <div className="bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] rounded-lg py-2 text-center">
                              <span className="text-[10px] font-bold text-white">Analyze Brain Effects</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="border-t border-[#1e1e30]/40 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c14]/30 to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 sm:py-16 relative">
              <div className="scroll-reveal text-center mb-8 sm:mb-12">
                <p className="text-[10px] text-[#00e8b0] font-bold uppercase tracking-[0.3em] mb-3">How It Works</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#f0f0f8] tracking-[-0.02em]">30 Seconds. Zero Signup. Full Neural Map.</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { step: "01", title: "Drop Anything In", desc: "Drag and drop any file. Paste any URL. Type any text. We eat all formats for breakfast.", color: "#7c6cf0", emoji: "" },
                  { step: "02", title: "5 AI Brains Argue", desc: "A neuroscientist, psychologist, creative director, marketer, and economist score your content independently. Then they fight about it.", color: "#9d8ff8", emoji: "" },
                  { step: "03", title: "Your Brain, Mapped", desc: "See exactly which of your 12 brain regions light up. Get recommendations that actually make sense.", color: "#00e8b0", emoji: "" },
                ].map((item) => (
                  <div key={item.step} className="scroll-reveal glass-card glass-card-hover rounded-2xl p-5 sm:p-7 group" style={{ animationDelay: `${parseInt(item.step) * 80}ms` }}>
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-base sm:text-lg font-black border border-[#1e1e30] group-hover:border-transparent group-hover:scale-110 transition-all duration-500"
                        style={{ backgroundColor: `${item.color}10`, color: item.color }}>
                        {item.step}
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-[#f0f0f8] mb-2.5">{item.title}</h4>
                    <p className="text-sm text-[#7a7a98] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Agent Showcase */}
          <section className="border-t border-[#1e1e30]/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7c6cf0]/[0.02] via-transparent to-[#00e8b0]/[0.02] pointer-events-none" />
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 sm:py-16 relative">
              <div className="scroll-reveal text-center mb-8 sm:mb-12">
                <p className="text-[10px] text-[#9d8ff8] font-bold uppercase tracking-[0.3em] mb-3">The Panel</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#f0f0f8] tracking-[-0.02em]">5 Experts. One Verdict. Zero BS.</h3>
                <p className="text-xs sm:text-sm text-[#4a4a68] mt-2 max-w-lg mx-auto">Each agent scores independently. We drop the highest and lowest, then average. No single AI bias can skew your results.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                  { name: "Neuromarketing Scientist", focus: "Brain activation & fMRI patterns", color: "#7c6cf0" },
                  { name: "Consumer Psychologist", focus: "Cialdini's principles & cognitive biases", color: "#9d8ff8" },
                  { name: "Creative Director", focus: "Production quality & storytelling", color: "#d0ccf0" },
                  { name: "Performance Marketer", focus: "CTR signals & conversion optimization", color: "#00e8b0" },
                  { name: "Behavioral Economist", focus: "Loss aversion, anchoring & persuasion", color: "#00c49a" },
                ].map((agent, i) => (
                  <div key={agent.name} className="scroll-reveal glass-card rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center group hover:border-[rgba(124,108,240,0.15)] transition-all duration-500 hover:translate-y-[-2px] active:scale-[0.97]" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2.5 sm:mb-3 flex items-center justify-center border-2 transition-all duration-500 group-hover:scale-110" style={{ borderColor: `${agent.color}30`, backgroundColor: `${agent.color}08` }}>
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500 group-hover:shadow-lg" style={{ backgroundColor: agent.color, boxShadow: `0 0 0 0 ${agent.color}` }} />
                    </div>
                    <h4 className="text-[11px] sm:text-xs font-bold text-[#f0f0f8] mb-1.5 leading-tight">{agent.name}</h4>
                    <p className="text-[10px] text-[#4a4a68] leading-relaxed">{agent.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA — curiosity gap */}
          <section className="border-t border-[#1e1e30]/40 relative overflow-hidden">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-14 sm:py-20 text-center relative">
              <div className="scroll-reveal">
                {/* Animated background glow */}
                <div className="absolute inset-0 items-center justify-center pointer-events-none hidden sm:flex">
                  <div className="w-[400px] h-[400px] rounded-full bg-[#7c6cf0]/[0.06] blur-[100px] blob-1" />
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-[#f0f0f8] tracking-[-0.03em] mb-4 relative">
                  Your brain is already deciding.
                  <br />
                  <span className="gradient-text-shimmer">Let us show you how.</span>
                </h3>
                <p className="text-sm sm:text-base text-[#7a7a98] mb-8 max-w-md mx-auto">
                  Join <span className="text-[#00e8b0] font-bold font-mono tabular-nums">{liveScans.toLocaleString()}</span> neural scans completed today. Free. No account needed.
                </p>
                <button
                  onClick={() => selectMode("ab-testing")}
                  className="relative group inline-flex"
                >
                  <div className="absolute -inset-[2px] rounded-2xl opacity-70 group-hover:opacity-100 blur-md transition-opacity duration-500" style={{ background: "conic-gradient(from 0deg, #7c6cf0, #00e8b0, #ff6090, #ffb020, #7c6cf0)" }} />
                  <div className="relative px-10 sm:px-14 py-4 sm:py-5 rounded-2xl bg-[#0c0c14] text-white font-bold text-base sm:text-lg flex items-center gap-3 group-hover:bg-[#111119] transition-all duration-300 group-active:scale-[0.97]">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Scan My Brain Now
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="border-t border-[#1e1e30]/40">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 sm:py-10">
              <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-10 gap-y-3 text-[11px] sm:text-xs text-[#4a4a68] font-medium">
                {["Groq + Cerebras AI", "5-Agent Consensus", "Real Neuroscience", "Zero Data Stored", "100% Free"].map((t, i) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["#00e8b0", "#7c6cf0", "#9d8ff8", "#00c49a", "#ff6090"][i] }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] text-[#2d2d50] mt-4 sm:mt-6 font-medium">NeuroTest AI — Neural Intelligence Platform</p>
            </div>
          </section>
        </main>
      )}

      {/* ==================== AB UPLOAD STATE ==================== */}
      {state === "ab-upload" && (
        <main className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8">
          <button onClick={() => setState("home")} className="flex items-center gap-2 text-sm text-[#4a4a68] hover:text-[#7a7a98] active:text-[#7a7a98] transition-colors mb-6 sm:mb-8 group min-h-[44px]">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to modes
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7c6cf0]/8 border border-[#7c6cf0]/15 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#7c6cf0]" />
              <span className="text-[11px] text-[#9d8ff8] font-semibold">A/B Creative Testing</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-[#f0f0f8] tracking-tight mb-2">Compare Two Creatives</h3>
            <p className="text-sm text-[#4a4a68]">Upload or paste URLs for the two pieces you want to test</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-[#ff4060]/8 border border-[#ff4060]/20 rounded-2xl text-[#ff4060] text-sm font-medium flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c6cf0] to-[#6054d0] flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-[#7c6cf0]/25">A</div>
                <div className="flex-1">
                  <input value={labelA} onChange={(e) => setLabelA(e.target.value)} className="bg-transparent text-[#f0f0f8] font-bold text-base focus:outline-none border-b-2 border-transparent focus:border-[#7c6cf0]/50 transition-colors w-full" placeholder="Content A" />
                </div>
              </div>
              <UploadZone label="Content A" sublabel="Video, image, or audio" onFileSelected={setFileA} onUrlProvided={setUrlA} file={fileA} url={urlA} accentColor="#7c6cf0" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e8b0] to-[#00c49a] flex items-center justify-center text-sm font-bold text-[#050508] shadow-lg shadow-[#00e8b0]/25">B</div>
                <div className="flex-1">
                  <input value={labelB} onChange={(e) => setLabelB(e.target.value)} className="bg-transparent text-[#f0f0f8] font-bold text-base focus:outline-none border-b-2 border-transparent focus:border-[#00e8b0]/50 transition-colors w-full" placeholder="Content B" />
                </div>
              </div>
              <UploadZone label="Content B" sublabel="Video, image, or audio" onFileSelected={setFileB} onUrlProvided={setUrlB} file={fileB} url={urlB} accentColor="#00e8b0" />
            </div>
          </div>

          <div className="flex justify-center">
            <div className={`relative group ${hasA && hasB ? "cta-glow" : ""}`}>
              {hasA && hasB && <div className="absolute -inset-1 bg-gradient-to-r from-[#7c6cf0] via-[#9d8ff8] to-[#00e8b0] rounded-2xl opacity-50 group-hover:opacity-75 blur-lg transition-opacity duration-500" />}
              <button onClick={runAnalysis} disabled={!hasA || !hasB}
                className={`relative px-10 md:px-16 py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold transition-all duration-500 flex items-center gap-3
                  ${hasA && hasB ? "bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] text-white cursor-pointer hover:shadow-[0_20px_60px_rgba(124,108,240,0.3)] hover:translate-y-[-2px]" : "bg-[#111119] text-[#4a4a68] cursor-not-allowed border border-[#1e1e30]"}`}>
                {hasA && hasB && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                Run Neural Analysis
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ==================== PROFILE UPLOAD STATE ==================== */}
      {state === "profile-upload" && (
        <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8">
          <button onClick={() => setState("home")} className="flex items-center gap-2 text-sm text-[#4a4a68] hover:text-[#7a7a98] active:text-[#7a7a98] transition-colors mb-6 sm:mb-8 group min-h-[44px]">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to modes
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4" style={{ backgroundColor: `${currentMode.color}08`, borderColor: `${currentMode.color}20` }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentMode.color }} />
              <span className="text-[11px] font-semibold" style={{ color: currentMode.color }}>{currentMode.title}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-[#f0f0f8] tracking-tight mb-2">{currentMode.title}</h3>
            <p className="text-sm text-[#4a4a68] max-w-lg mx-auto">{currentMode.desc}</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-[#ff4060]/8 border border-[#ff4060]/20 rounded-2xl text-[#ff4060] text-sm font-medium flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* File upload */}
            {currentMode.hasFileInput && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#7a7a98] uppercase tracking-wider">Upload File</label>
                <div
                  className={`relative glass-card glass-card-hover rounded-2xl p-8 text-center cursor-pointer group transition-all duration-500
                    ${profileFile ? "border-[#00e8b0]/20 shadow-[0_0_30px_rgba(0,232,176,0.06)]" : "border-dashed border-2 border-[#1e1e30]"}`}
                >
                  <input
                    type="file"
                    accept={currentMode.acceptTypes}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setProfileFile(f); }}
                  />
                  {profileFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: `${currentMode.color}15` }}>
                        <svg className="w-6 h-6" style={{ color: currentMode.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-[#f0f0f8]">{profileFile.name}</p>
                      <p className="text-xs text-[#00e8b0]">Ready for analysis</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center group-hover:shadow-lg transition-all"
                        style={{ borderColor: `${currentMode.color}25`, backgroundColor: `${currentMode.color}05` }}>
                        <svg className="w-7 h-7 group-hover:scale-110 transition-transform" style={{ color: currentMode.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm text-[#f0f0f8] font-semibold">Drop file or click to browse</p>
                      <p className="text-xs text-[#4a4a68]">{currentMode.acceptText}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* URL input */}
            {currentMode.hasUrlInput && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#7a7a98] uppercase tracking-wider">Or Paste URL</label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    placeholder={currentMode.urlPlaceholder || "Paste URL here..."}
                    className="flex-1 bg-[#050508] border border-[#1e1e30] rounded-xl px-4 py-3 text-sm text-[#f0f0f8] placeholder:text-[#2d2d50] focus:outline-none focus:border-[#7c6cf0]/40 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Text input */}
            {currentMode.hasTextInput && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#7a7a98] uppercase tracking-wider">{currentMode.hasFileInput ? "Or Paste Text" : "Paste Your Content"}</label>
                <textarea
                  value={profileText}
                  onChange={(e) => setProfileText(e.target.value)}
                  placeholder={currentMode.textPlaceholder || "Paste your content here..."}
                  rows={6}
                  className="w-full bg-[#050508] border border-[#1e1e30] rounded-xl px-4 py-3 text-sm text-[#f0f0f8] placeholder:text-[#2d2d50] focus:outline-none focus:border-[#7c6cf0]/40 transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex justify-center mt-10">
            <div className={`relative group ${hasProfile ? "cta-glow" : ""}`}>
              {hasProfile && <div className="absolute -inset-1 rounded-2xl opacity-50 group-hover:opacity-75 blur-lg transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${currentMode.color}, #00e8b0)` }} />}
              <button onClick={runProfileAnalysis} disabled={!hasProfile}
                className={`relative px-10 md:px-16 py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold transition-all duration-500 flex items-center gap-3
                  ${hasProfile ? "text-white cursor-pointer hover:translate-y-[-2px]" : "bg-[#111119] text-[#4a4a68] cursor-not-allowed border border-[#1e1e30]"}`}
                style={hasProfile ? { background: `linear-gradient(135deg, ${currentMode.color}, #00e8b0)` } : {}}>
                {hasProfile && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                Analyze {currentMode.shortTitle}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ==================== PROCESSING STATE ==================== */}
      {state === "processing" && (
        <main className="fixed inset-0 top-[56px] overflow-hidden bg-[#050508] z-10">
          <div className="absolute inset-0 pointer-events-none h-[50vh] md:h-[60vh]">
            <Brain3D
              regions={[
                { name: "L-Frontal", id: "lf", role: "", position: [-0.4, 0.3, 0.7], activation: 0.85, color: "#ffaa00" },
                { name: "R-Frontal", id: "rf", role: "", position: [0.4, 0.3, 0.7], activation: 0.80, color: "#ffcc00" },
                { name: "L-Parietal", id: "lp", role: "", position: [-0.5, 0.5, 0.0], activation: 0.82, color: "#ff8800" },
                { name: "R-Parietal", id: "rp", role: "", position: [0.5, 0.5, 0.0], activation: 0.72, color: "#ddcc00" },
                { name: "L-Motor", id: "lm", role: "", position: [-0.3, 0.6, 0.2], activation: 0.88, color: "#ff6600" },
                { name: "R-Motor", id: "rm", role: "", position: [0.3, 0.6, 0.2], activation: 0.75, color: "#ffaa00" },
                { name: "L-Temporal", id: "lt", role: "", position: [-0.8, -0.1, 0.2], activation: 0.62, color: "#88cc00" },
                { name: "R-Temporal", id: "rt", role: "", position: [0.8, -0.1, 0.2], activation: 0.52, color: "#44aa66" },
                { name: "Prefrontal", id: "pfc", role: "", position: [0, 0.2, 0.9], activation: 0.82, color: "#ffbb00" },
              ]}
              className="w-full h-full"
              autoRotate
              showParticles
            />
          </div>

          <div className="absolute inset-x-0 bottom-0" style={{ height: "55vh", background: "linear-gradient(to bottom, transparent 0%, #050508 50%)" }} />

          <div className="absolute inset-x-0 bottom-0 pb-16 md:pb-12 px-4 md:px-6">
            <div className="max-w-lg mx-auto text-center space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#f0f0f8] mb-2 tracking-tight">
                  {mode === "ab-testing" ? "Analyzing Your Creatives" : `Building ${currentMode.shortTitle} Profile`}
                </h2>
                <p className="text-[#7a7a98] text-sm">
                  {progress < 15 && "Processing content..."}
                  {progress >= 15 && progress < 30 && "Extracting features..."}
                  {progress >= 30 && progress < 50 && "Running primary neural analysis..."}
                  {progress >= 50 && progress < 70 && "5 expert agents scoring independently..."}
                  {progress >= 70 && progress < 85 && "Aggregating multi-agent consensus..."}
                  {progress >= 85 && progress < 95 && "Building your neural report..."}
                  {progress >= 95 && "Finalizing results..."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#4a4a68] font-medium">Progress</span>
                  <span className="text-[#7c6cf0] font-mono font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-[#0c0c14] rounded-full overflow-hidden border border-[#1e1e30]/50">
                  <div className="h-full rounded-full transition-all duration-700 relative" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentMode.color}, #00e8b0)` }}>
                    <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15), transparent)" }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {["Process", "Extract", "Analyze", "Consensus", "Report"].map((step, i) => (
                  <div key={step} className="text-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-bold mb-1.5 sm:mb-2 transition-all duration-700
                      ${progress > (i + 1) * 18 ? "bg-[#00e8b0] text-black shadow-[0_0_15px_rgba(0,232,176,0.3)]"
                        : progress > i * 18 ? "bg-[#7c6cf0] text-white animate-pulse shadow-[0_0_15px_rgba(124,108,240,0.3)] scale-110"
                          : "bg-[#0c0c14] text-[#4a4a68] border border-[#1e1e30]"}`}>
                      {progress > (i + 1) * 18 ? "\u2713" : i + 1}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-[#4a4a68] font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ==================== AB RESULTS STATE ==================== */}
      {state === "ab-results" && result && (
        <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-7">
          {/* Winner Banner */}
          <div className="animated-border rounded-2xl">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-30"
                style={{ background: result.winner === "A" ? "radial-gradient(ellipse at 0% 50%, rgba(124,108,240,0.1), transparent 60%)" : "radial-gradient(ellipse at 0% 50%, rgba(0,232,176,0.1), transparent 60%)" }} />
              <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shadow-2xl flex-shrink-0
                  ${result.winner === "A" ? "bg-[#7c6cf0] shadow-[#7c6cf0]/30" : "bg-[#00e8b0] text-[#050508] shadow-[#00e8b0]/30"}`}>
                  {result.winner}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em] mb-1">Winner</p>
                  <h3 className="text-lg sm:text-xl font-bold text-[#f0f0f8] tracking-tight truncate">
                    {result.winner === "A" ? result.contentA.label : result.contentB.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#7a7a98] mt-1 font-medium">
                    Score: <span className="text-[#f0f0f8] font-bold">{result.winner === "A" ? result.contentA.overallScore : result.contentB.overallScore}/10</span>
                    <span className="text-[#4a4a68] mx-2">vs</span>
                    <span className="text-[#4a4a68]">{result.winner === "A" ? result.contentB.overallScore : result.contentA.overallScore}/10</span>
                  </p>
                </div>
                <div className="hidden md:flex gap-5">
                  <MiniStat label="Emotion" valueA={result.contentA.emotionalImpact} valueB={result.contentB.emotionalImpact} />
                  <div className="w-px bg-[#1e1e30]" />
                  <MiniStat label="Memory" valueA={result.contentA.memoryRetention} valueB={result.contentB.memoryRetention} />
                  <div className="w-px bg-[#1e1e30]" />
                  <MiniStat label="Converts" valueA={result.contentA.decisionTrigger} valueB={result.contentB.decisionTrigger} />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Nav */}
          <div className="flex gap-1 bg-[#0c0c14] rounded-2xl p-1.5 border border-[#1e1e30] tab-scroll no-select">
            {[
              { id: "overview", label: "Overview" }, { id: "performance", label: "Performance" },
              { id: "platforms", label: "Platforms" }, { id: "audience", label: "Audience" },
              { id: "regions", label: "Brain Map" }, { id: "detailed", label: "Deep Dive" },
              { id: "recommendations", label: "Improve" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 md:px-4 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id ? "tab-active text-[#f0f0f8]" : "text-[#4a4a68] hover:text-[#7a7a98]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-7 animate-float-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                <BrainCard analysis={result.contentA} color="#7c6cf0" label="A" />
                <BrainCard analysis={result.contentB} color="#00e8b0" label="B" />
              </div>
              <div className="glass-card rounded-2xl p-7">
                <h3 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em] mb-6">Head-to-Head</h3>
                <div className="space-y-5">
                  {[
                    { label: "Emotional Impact", a: result.contentA.emotionalImpact, b: result.contentB.emotionalImpact },
                    { label: "Memory Retention", a: result.contentA.memoryRetention, b: result.contentB.memoryRetention },
                    { label: "Decision Trigger", a: result.contentA.decisionTrigger, b: result.contentB.decisionTrigger },
                    { label: "Attention Capture", a: result.contentA.attentionCapture, b: result.contentB.attentionCapture },
                    { label: "Trust Building", a: result.contentA.trustBuilding, b: result.contentB.trustBuilding },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold font-mono tabular-nums text-[#9d8ff8] w-10 text-right">{row.a.toFixed(1)}</span>
                        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-[#0c0c14] border border-[#1e1e30]/30">
                          <div className="h-full rounded-l-full transition-all duration-1000" style={{ width: `${(row.a / 10) * 50}%`, background: "linear-gradient(90deg, #7c6cf066, #7c6cf0)" }} />
                          <div className="w-px bg-[#2d2d50] flex-shrink-0" />
                          <div className="h-full rounded-r-full transition-all duration-1000 ml-auto" style={{ width: `${(row.b / 10) * 50}%`, background: "linear-gradient(270deg, #00e8b066, #00e8b0)" }} />
                        </div>
                        <span className="text-xs font-bold font-mono tabular-nums text-[#00e8b0] w-10">{row.b.toFixed(1)}</span>
                      </div>
                      <p className="text-center text-[10px] text-[#4a4a68] mt-1 font-medium">{row.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PERFORMANCE */}
          {activeTab === "performance" && (
            <div className="space-y-7 animate-float-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                {[result.contentA, result.contentB].map((analysis, idx) => {
                  const color = idx === 0 ? "#7c6cf0" : "#00e8b0";
                  const lbl = idx === 0 ? "A" : "B";
                  const perf = analysis.performancePrediction;
                  const sc = perf.overallScore >= 70 ? "#00e8b0" : perf.overallScore >= 40 ? "#ffb020" : "#ff4060";
                  return (
                    <div key={lbl} className="glass-card rounded-2xl p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color, color: lbl === "B" ? "#050508" : "#fff" }}>{lbl}</div>
                          <span className="text-sm font-semibold text-[#f0f0f8]">{analysis.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black tabular-nums" style={{ color: sc }}>{perf.overallScore}</div>
                          <div className="text-[10px] text-[#4a4a68] font-medium">/100</div>
                        </div>
                      </div>
                      <div className="h-2 bg-[#0c0c14] rounded-full overflow-hidden border border-[#1e1e30]/50">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${perf.overallScore}%`, background: `linear-gradient(90deg, ${sc}66, ${sc})` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ l: "Est. CTR", v: perf.estimatedCTR }, { l: "Engagement", v: perf.engagementRate }, { l: "Conversion", v: perf.conversionPotential }, { l: "View-Through", v: perf.viewThroughRate }, { l: "Shareability", v: perf.shareability }].map((s) => (
                          <div key={s.l} className="bg-[#0c0c14] rounded-xl p-3 border border-[#1e1e30]/30">
                            <p className="text-[10px] text-[#4a4a68] font-medium uppercase tracking-wider mb-1">{s.l}</p>
                            <p className="text-sm font-bold text-[#f0f0f8]">{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PLATFORMS */}
          {activeTab === "platforms" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 animate-float-up">
              {[result.contentA, result.contentB].map((analysis, idx) => {
                const color = idx === 0 ? "#7c6cf0" : "#00e8b0";
                const lbl = idx === 0 ? "A" : "B";
                return (
                  <div key={lbl} className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color, color: lbl === "B" ? "#050508" : "#fff" }}>{lbl}</div>
                      <span className="text-sm font-semibold text-[#f0f0f8]">{analysis.label}</span>
                    </div>
                    {analysis.platformScores.map((ps) => {
                      const fc = ps.fit === "Excellent" ? "#00e8b0" : ps.fit === "Good" ? "#7c6cf0" : ps.fit === "Average" ? "#ffb020" : "#ff4060";
                      return (
                        <div key={ps.platform} className="bg-[#0c0c14] rounded-xl p-4 border border-[#1e1e30]/30 stat-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-bold text-[#f0f0f8]">{ps.platform}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${fc}15`, color: fc }}>{ps.fit}</span>
                            </div>
                            <span className="text-lg font-black tabular-nums" style={{ color }}>{ps.score.toFixed(1)}</span>
                          </div>
                          <div className="h-1.5 bg-[#050508] rounded-full overflow-hidden mb-2">
                            <div className="h-full rounded-full" style={{ width: `${(ps.score / 10) * 100}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
                          </div>
                          <p className="text-[11px] text-[#7a7a98]">{ps.tip}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDIENCE */}
          {activeTab === "audience" && (
            <div className="space-y-7 animate-float-up">
              {[result.contentA, result.contentB].map((analysis, idx) => {
                const color = idx === 0 ? "#7c6cf0" : "#00e8b0";
                const lbl = idx === 0 ? "A" : "B";
                return (
                  <div key={lbl}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color, color: lbl === "B" ? "#050508" : "#fff" }}>{lbl}</div>
                      <span className="text-sm font-semibold text-[#f0f0f8]">{analysis.label}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysis.audiencePersonas.map((persona) => {
                        const rc = persona.resonanceScore >= 7 ? "#00e8b0" : persona.resonanceScore >= 4 ? "#ffb020" : "#ff4060";
                        return (
                          <div key={persona.name} className="glass-card glass-card-hover rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-[#f0f0f8]">{persona.name}</h5>
                              <span className="text-lg font-black tabular-nums" style={{ color: rc }}>{persona.resonanceScore}<span className="text-[10px] text-[#4a4a68]">/10</span></span>
                            </div>
                            <p className="text-xs text-[#7a7a98] leading-relaxed italic">&ldquo;{persona.reaction}&rdquo;</p>
                            {persona.keyDrivers.length > 0 && (
                              <div>
                                <p className="text-[10px] text-[#00e8b0] font-semibold uppercase tracking-wider mb-1">Works</p>
                                {persona.keyDrivers.map((d, i) => <p key={i} className="text-[11px] text-[#7a7a98] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#00e8b0]" />{d}</p>)}
                              </div>
                            )}
                            {persona.turnoffs.length > 0 && (
                              <div>
                                <p className="text-[10px] text-[#ff4060] font-semibold uppercase tracking-wider mb-1">Doesn&apos;t Work</p>
                                {persona.turnoffs.map((t, i) => <p key={i} className="text-[11px] text-[#7a7a98] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#ff4060]" />{t}</p>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REGIONS */}
          {activeTab === "regions" && (
            <div className="glass-card rounded-2xl p-7 animate-float-up">
              <h3 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em] mb-5">Neural Activation by Region</h3>
              <RegionTable rows={result.regionComparison} />
            </div>
          )}

          {/* DETAILED */}
          {activeTab === "detailed" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 animate-float-up">
              <DetailPanel analysis={result.contentA} color="#7c6cf0" />
              <DetailPanel analysis={result.contentB} color="#00e8b0" />
            </div>
          )}

          {/* RECOMMENDATIONS */}
          {activeTab === "recommendations" && (
            <div className="space-y-7 animate-float-up">
              <div className="glass-card rounded-2xl p-7 relative overflow-hidden">
                <div className="relative flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${result.winner === "A" ? "bg-[#7c6cf0] text-white" : "bg-[#00e8b0] text-[#050508]"}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-[#f0f0f8] text-lg tracking-tight">The Verdict</h4>
                    <p className="text-sm text-[#7a7a98] mt-2 leading-relaxed">{result.winnerReason}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                {[{ analysis: result.contentA, color: "#7c6cf0" }, { analysis: result.contentB, color: "#00e8b0" }].map(({ analysis, color }) => (
                  <div key={color} className="glass-card rounded-2xl p-6">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-5" style={{ color }}>Optimize {analysis.label}</h4>
                    <ul className="space-y-4">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-3.5 text-sm">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 border" style={{ backgroundColor: `${color}10`, color, borderColor: `${color}15` }}>{i + 1}</span>
                          <span className="text-[#7a7a98] leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divider-gradient mt-8" />
          <div className="text-center py-6">
            <p className="text-[11px] text-[#4a4a68] font-medium">Multi-agent consensus AI — 5 expert agents, trimmed-mean aggregation</p>
          </div>
        </main>
      )}

      {/* ==================== PROFILE RESULTS STATE ==================== */}
      {state === "profile-results" && profileResult && (
        <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-7">
          {/* Header */}
          <div className="animated-border rounded-2xl">
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at 0% 50%, ${currentMode.color}15, transparent 60%)` }} />
              <div className="relative flex flex-wrap items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0" style={{ backgroundColor: currentMode.color }}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: currentMode.color }}>{currentMode.title}</p>
                  <h3 className="text-lg sm:text-xl font-bold text-[#f0f0f8] tracking-tight">Neural Profile Complete</h3>
                  <p className="text-sm text-[#7a7a98] mt-1">Overall Score: <span className="text-[#f0f0f8] font-bold">{profileResult.overallScore}/10</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#0c0c14] rounded-2xl p-1.5 border border-[#1e1e30] tab-scroll no-select">
            {[
              { id: "overview", label: "Brain Map" }, { id: "performance", label: "Scores" },
              { id: "detailed", label: "Deep Dive" }, { id: "audience", label: "Personas" },
              { id: "recommendations", label: "Insights" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 md:px-4 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id ? "tab-active text-[#f0f0f8]" : "text-[#4a4a68] hover:text-[#7a7a98]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Overview */}
          {activeTab === "overview" && (
            <div className="space-y-7 animate-float-up">
              <BrainCard analysis={profileResult} color={currentMode.color} label="P" />
              <div className="glass-card rounded-2xl p-7">
                <h3 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em] mb-6">Neural Dimensions</h3>
                <div className="space-y-4">
                  {[
                    { label: "Emotional Impact", score: profileResult.emotionalImpact },
                    { label: "Memory Retention", score: profileResult.memoryRetention },
                    { label: "Decision Trigger", score: profileResult.decisionTrigger },
                    { label: "Attention Capture", score: profileResult.attentionCapture },
                    { label: "Trust Building", score: profileResult.trustBuilding },
                  ].map((row) => (
                    <ScoreBar key={row.label} label={row.label} score={row.score} color={currentMode.color} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scores */}
          {activeTab === "performance" && (
            <div className="space-y-7 animate-float-up">
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#f0f0f8]">Performance Prediction</span>
                  <div className="text-right">
                    <div className="text-3xl font-black tabular-nums" style={{ color: profileResult.performancePrediction.overallScore >= 70 ? "#00e8b0" : "#ffb020" }}>
                      {profileResult.performancePrediction.overallScore}
                    </div>
                    <div className="text-[10px] text-[#4a4a68]">/100</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { l: "Est. CTR", v: profileResult.performancePrediction.estimatedCTR },
                    { l: "Engagement", v: profileResult.performancePrediction.engagementRate },
                    { l: "Conversion", v: profileResult.performancePrediction.conversionPotential },
                    { l: "View-Through", v: profileResult.performancePrediction.viewThroughRate },
                    { l: "Shareability", v: profileResult.performancePrediction.shareability },
                  ].map((s) => (
                    <div key={s.l} className="bg-[#0c0c14] rounded-xl p-3 border border-[#1e1e30]/30">
                      <p className="text-[10px] text-[#4a4a68] font-medium uppercase tracking-wider mb-1">{s.l}</p>
                      <p className="text-sm font-bold text-[#f0f0f8]">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h4 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em]">Platform Fit</h4>
                {profileResult.platformScores.map((ps) => {
                  const fc = ps.fit === "Excellent" ? "#00e8b0" : ps.fit === "Good" ? "#7c6cf0" : ps.fit === "Average" ? "#ffb020" : "#ff4060";
                  return (
                    <div key={ps.platform} className="bg-[#0c0c14] rounded-xl p-4 border border-[#1e1e30]/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-[#f0f0f8]">{ps.platform}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${fc}15`, color: fc }}>{ps.fit}</span>
                        </div>
                        <span className="text-lg font-black tabular-nums" style={{ color: currentMode.color }}>{ps.score.toFixed(1)}</span>
                      </div>
                      <p className="text-[11px] text-[#7a7a98]">{ps.tip}</p>
                    </div>
                  );
                })}
              </div>

              {/* Creative Health */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h4 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em]">Creative Health</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Lifespan</p>
                    <p className="text-xl font-black text-[#ffb020]">{profileResult.creativeHealth.fatigueLifespanDays}d</p>
                  </div>
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Brand Safe</p>
                    <p className="text-xl font-black" style={{ color: profileResult.creativeHealth.brandSafetyScore >= 7 ? "#00e8b0" : "#ffb020" }}>{profileResult.creativeHealth.brandSafetyScore}/10</p>
                  </div>
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Accessible</p>
                    <p className="text-xl font-black" style={{ color: profileResult.creativeHealth.accessibilityScore >= 7 ? "#00e8b0" : "#ffb020" }}>{profileResult.creativeHealth.accessibilityScore}/10</p>
                  </div>
                </div>
                <p className="text-xs text-[#7a7a98]">{profileResult.creativeHealth.fatigueReason}</p>
              </div>
            </div>
          )}

          {/* Deep Dive */}
          {activeTab === "detailed" && (
            <div className="animate-float-up">
              <DetailPanel analysis={profileResult} color={currentMode.color} />
            </div>
          )}

          {/* Audience Personas */}
          {activeTab === "audience" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-float-up">
              {profileResult.audiencePersonas.map((persona) => {
                const rc = persona.resonanceScore >= 7 ? "#00e8b0" : persona.resonanceScore >= 4 ? "#ffb020" : "#ff4060";
                return (
                  <div key={persona.name} className="glass-card glass-card-hover rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[#f0f0f8]">{persona.name}</h5>
                      <span className="text-lg font-black tabular-nums" style={{ color: rc }}>{persona.resonanceScore}<span className="text-[10px] text-[#4a4a68]">/10</span></span>
                    </div>
                    <p className="text-xs text-[#7a7a98] leading-relaxed italic">&ldquo;{persona.reaction}&rdquo;</p>
                    {persona.keyDrivers.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#00e8b0] font-semibold uppercase tracking-wider mb-1">Works</p>
                        {persona.keyDrivers.map((d, i) => <p key={i} className="text-[11px] text-[#7a7a98] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#00e8b0]" />{d}</p>)}
                      </div>
                    )}
                    {persona.turnoffs.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#ff4060] font-semibold uppercase tracking-wider mb-1">Doesn&apos;t Work</p>
                        {persona.turnoffs.map((t, i) => <p key={i} className="text-[11px] text-[#7a7a98] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#ff4060]" />{t}</p>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {activeTab === "recommendations" && (
            <div className="animate-float-up glass-card rounded-2xl p-6">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-5" style={{ color: currentMode.color }}>Neural Insights & Recommendations</h4>
              <ul className="space-y-4">
                {profileResult.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3.5 text-sm">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 border" style={{ backgroundColor: `${currentMode.color}10`, color: currentMode.color, borderColor: `${currentMode.color}15` }}>{i + 1}</span>
                    <span className="text-[#7a7a98] leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="divider-gradient mt-8" />
          <div className="text-center py-6">
            <p className="text-[11px] text-[#4a4a68] font-medium">Neural profile powered by multi-agent consensus AI</p>
          </div>
        </main>
      )}
    </div>
  );
}

/* ==================== Sub-components ==================== */

function BrainCard({ analysis, color, label }: { analysis: NeuralAnalysis; color: string; label: string }) {
  return (
    <div className="glass-card glass-card-hover rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1e1e30]/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg" style={{ backgroundColor: color, color: label === "B" ? "#050508" : "#fff", boxShadow: `0 4px 15px ${color}33` }}>
            {label}
          </div>
          <span className="text-sm font-semibold text-[#f0f0f8]">{analysis.label}</span>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black tabular-nums tracking-tight" style={{ color }}>{analysis.overallScore}</span>
          <span className="text-xs text-[#4a4a68] font-medium ml-0.5">/10</span>
        </div>
      </div>
      <div className="h-[220px] md:h-[300px] bg-[#050508] relative">
        <Brain3D regions={analysis.regions} className="w-full h-full" showParticles interactive />
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
          {analysis.regions.filter((r) => r.activation > 0.5).sort((a, b) => b.activation - a.activation).slice(0, 4).map((r) => (
            <span key={r.id} className="px-2.5 py-1 rounded-lg text-[9px] font-semibold bg-[#050508]/80 backdrop-blur-md border border-white/5" style={{ color: r.color }}>
              {r.name} {(r.activation * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-3">
        <ScoreBar label="Emotional Pull" score={analysis.emotionalImpact} color={color} />
        <ScoreBar label="Memorability" score={analysis.memoryRetention} color={color} />
        <ScoreBar label="Call to Action" score={analysis.decisionTrigger} color={color} />
        <ScoreBar label="Attention Grab" score={analysis.attentionCapture} color={color} />
        <ScoreBar label="Trust Factor" score={analysis.trustBuilding} color={color} />
      </div>
    </div>
  );
}

function DetailPanel({ analysis, color }: { analysis: NeuralAnalysis; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color }}>{analysis.label} — Deep Analysis</h4>
      <p className="text-sm text-[#7a7a98] leading-relaxed">{analysis.detailedAnalysis}</p>
      <div className="space-y-3">
        {[
          { title: "Visual Analysis", text: analysis.visualAnalysis },
          { title: "Audio Analysis", text: analysis.audioAnalysis },
          { title: "Pacing & Flow", text: analysis.pacingAnalysis },
        ].map((s) => (
          <div key={s.title} className="bg-[#0c0c14] rounded-xl p-4 border border-[#1e1e30]/30">
            <h6 className="text-[10px] font-semibold text-[#f0f0f8] uppercase tracking-[0.15em] mb-2">{s.title}</h6>
            <p className="text-xs text-[#7a7a98] leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
      <div>
        <h5 className="text-[10px] font-semibold text-[#f0f0f8] uppercase tracking-[0.15em] mb-3">Emotion Profile</h5>
        <div className="grid grid-cols-3 gap-2.5">
          {Object.entries(analysis.emotionBreakdown).map(([emotion, value]) => (
            <div key={emotion} className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/50">
              <p className="text-[10px] text-[#4a4a68] capitalize mb-1.5">{emotion}</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color }}>{(value * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const winner = valueA >= valueB ? "A" : "B";
  return (
    <div className="text-center px-3">
      <p className="text-[10px] text-[#4a4a68] uppercase tracking-[0.15em] font-semibold mb-1.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-bold font-mono tabular-nums ${winner === "A" ? "text-[#9d8ff8]" : "text-[#4a4a68]"}`}>{valueA.toFixed(1)}</span>
        <span className="text-[10px] text-[#2d2d50]">vs</span>
        <span className={`text-sm font-bold font-mono tabular-nums ${winner === "B" ? "text-[#00e8b0]" : "text-[#4a4a68]"}`}>{valueB.toFixed(1)}</span>
      </div>
    </div>
  );
}
