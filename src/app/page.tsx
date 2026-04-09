"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import ScoreBar from "@/components/ScoreBar";
import RegionTable from "@/components/RegionTable";
import { ComparisonResult, NeuralAnalysis } from "@/lib/neuro-engine";
import ShareCard from "@/components/ShareCard";
import ErrorBoundary from "@/components/ErrorBoundary";

const Brain3D = dynamic(() => import("@/components/Brain3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-24 h-24 rounded-full border border-[#1e1e30] bg-[#0c0c14] animate-pulse" />
    </div>
  ),
});
const HeroBrain = dynamic(() => import("@/components/Brain3D").then((m) => ({ default: m.HeroBrain })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] sm:h-[420px] md:h-[550px] flex items-center justify-center relative overflow-hidden">
      {/* Glow blobs that mimic the brain's color presence */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[280px] h-[220px] sm:w-[360px] sm:h-[280px] md:w-[450px] md:h-[350px]">
        <div className="absolute inset-0 rounded-full bg-[#2a6844]/40 blur-[60px]" />
        <div className="absolute top-[10%] left-[15%] w-[60%] h-[50%] rounded-full bg-[#cc8800]/25 blur-[50px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[45%] h-[40%] rounded-full bg-[#ff6600]/20 blur-[40px]" />
        <div className="absolute top-[20%] right-[20%] w-[35%] h-[35%] rounded-full bg-[#7c6cf0]/15 blur-[35px]" />
      </div>
    </div>
  ),
});

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
  const [activeTab, setActiveTab] = useState<string>("performance");

  // Hero cinematic phase state
  const [scanStatus, setScanStatus] = useState("Initializing neural scan...");
  const [heroPhase, setHeroPhase] = useState("calm");
  const [insightLabel, setInsightLabel] = useState<string | null>(null);
  const handleScanStatus = useCallback((msg: string) => setScanStatus(msg), []);
  const handlePhaseChange = useCallback((phase: string, label: string | null) => {
    setHeroPhase(phase);
    setInsightLabel(label);
  }, []);

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

  const hasA = fileA || urlA;
  const hasB = fileB || urlB;
  const currentMode = MODES.find((m) => m.id === mode) || MODES[0];

  // Strict per-mode input validation — every mode locked down
  const MUSIC_DOMAINS = ["youtube.com", "youtu.be", "music.youtube.com", "spotify.com", "open.spotify.com", "soundcloud.com", "music.apple.com", "tidal.com", "deezer.com", "audiomack.com", "bandcamp.com"];
  const SOCIAL_DOMAINS = ["instagram.com", "twitter.com", "x.com", "facebook.com", "tiktok.com", "linkedin.com", "reddit.com", "threads.net", "pinterest.com"];

  const hasFile = !!profileFile;
  const hasText = !!profileText.trim();
  const hasUrl = !!profileUrl.trim();
  const fileMime = profileFile?.type || "";
  const isImage = fileMime.startsWith("image/");
  const isAudio = fileMime.startsWith("audio/");
  const isVideo = fileMime.startsWith("video/");
  const isMediaFile = isImage || isAudio || isVideo;

  const hasProfile = (() => {
    if (!hasFile && !hasText && !hasUrl) return false;

    switch (mode) {
      case "photo":
        // ONLY image file
        return hasFile && isImage && !hasText && !hasUrl;
      case "music":
        // ONLY audio/video file OR valid music URL
        if (hasText) return false;
        if (hasFile) return isAudio || isVideo;
        if (hasUrl) return MUSIC_DOMAINS.some(d => profileUrl.toLowerCase().includes(d));
        return false;
      case "browsing":
        // ONLY data file (not media) OR pasted text. No URLs.
        if (hasUrl) return false;
        if (hasFile) return !isMediaFile;
        return hasText;
      case "social":
        // Valid social URL, OR screenshot (image), OR pasted text. No audio/video files. No random URLs.
        if (hasUrl && !SOCIAL_DOMAINS.some(d => profileUrl.toLowerCase().includes(d))) return false;
        if (hasFile && (isAudio || isVideo)) return false;
        return hasFile || hasText || hasUrl;
      case "text":
        // ONLY text file OR pasted text. No media, no URLs.
        if (hasUrl) return false;
        if (hasFile) return !isMediaFile;
        return hasText;
      case "screen-time":
        // ONLY screenshot (image) or text file OR pasted text. No audio/video, no URLs.
        if (hasUrl) return false;
        if (hasFile && (isAudio || isVideo)) return false;
        return hasFile || hasText;
      default:
        return false;
    }
  })();

  // Validation message for when user has provided input but it doesn't match the mode
  const validationHint = (() => {
    if (!hasFile && !hasText && !hasUrl) return null;
    if (hasProfile) return null;

    switch (mode) {
      case "photo":
        if (hasUrl) return "Photo mode only accepts image uploads, not URLs";
        if (hasText) return "Photo mode only accepts image uploads, not text";
        if (hasFile && !isImage) return "Please upload an image file (JPG, PNG, WebP)";
        return null;
      case "music":
        if (hasText) return "Music mode only accepts audio files or music URLs, not text";
        if (hasFile && !isAudio && !isVideo) return "Please upload an audio or video file (MP3, WAV, MP4)";
        if (hasUrl) return "Only YouTube, Spotify, SoundCloud, Apple Music, Tidal, Deezer, and Bandcamp URLs accepted";
        return null;
      case "browsing":
        if (hasUrl) return "Browsing mode only accepts data files or pasted text, not URLs";
        if (hasFile && isMediaFile) return "Upload a data file (JSON, CSV, TXT) — not media files";
        return null;
      case "social":
        if (hasUrl && !SOCIAL_DOMAINS.some(d => profileUrl.toLowerCase().includes(d)))
          return "Only Instagram, Twitter/X, TikTok, Facebook, LinkedIn, Reddit, Threads, Pinterest URLs accepted";
        if (hasFile && (isAudio || isVideo)) return "Upload a profile screenshot or paste your posts as text";
        return null;
      case "text":
        if (hasUrl) return "Text mode only accepts text files or pasted text, not URLs";
        if (hasFile && isMediaFile) return "Upload a text file (TXT, JSON, CSV) — not media files";
        return null;
      case "screen-time":
        if (hasUrl) return "Screen Time mode only accepts screenshots or pasted text, not URLs";
        if (hasFile && (isAudio || isVideo)) return "Upload a screenshot or describe your screen time as text";
        return null;
      default:
        return null;
    }
  })();

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
        let errorMsg = "Analysis failed. Please try again.";
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMsg);
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
        let errorMsg = "Analysis failed. Please try again.";
        try {
          const data = await res.json();
          if (data.error) errorMsg = data.error;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMsg);
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
    setActiveTab("performance");
  };

  return (
    <div className="min-h-screen bg-[#050508] overflow-x-hidden relative">
      {/* Animated mesh gradient background — desktop only */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden sm:block">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#7c6cf0]/[0.04] rounded-full blur-[120px] blob-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#00e8b0]/[0.03] rounded-full blur-[120px] blob-2" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-[#ff6090]/[0.02] rounded-full blur-[120px] blob-3" />
      </div>

      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)]/95 sticky top-0 z-50 no-select">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
              </svg>
            </div>
            <span className="text-sm sm:text-base font-medium text-[var(--text-primary)] tracking-tight">NeuroTest</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {(state === "ab-results" || state === "profile-results") && (
              <button onClick={reset} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)] font-medium">
                + New Analysis
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
          {/* Grid BG */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(124,108,240,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,240,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          {/* Hero */}
          <section className="relative max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center pt-4 pb-2">
              <div className="relative -mx-6">
                <HeroBrain onStatusChange={handleScanStatus} onPhaseChange={handlePhaseChange} />
                <div className="absolute inset-x-0 bottom-0 h-32 sm:h-64 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent" />

                {/* INSIGHT overlay — bold label, CSS transition */}
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-all duration-700 ease-out ${
                  heroPhase === "insight" && insightLabel ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}>
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-3xl font-bold font-mono tracking-[0.15em] text-red-400 drop-shadow-[0_0_20px_rgba(255,60,60,0.5)]">
                      {insightLabel || ""}
                    </div>
                    <div className="mt-1 h-[2px] mx-auto bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" style={{ width: "80%" }} />
                  </div>
                </div>

                {/* Overload edge vignette — CSS transition */}
                <div className={`absolute inset-0 pointer-events-none z-10 rounded-lg transition-opacity duration-500 ${
                  heroPhase === "overload" ? "opacity-100" : "opacity-0"
                }`} style={{
                  boxShadow: "inset 0 0 80px 20px rgba(255,40,40,0.08)",
                  animation: heroPhase === "overload" ? "overloadFlash 0.5s ease-in-out infinite alternate" : "none",
                }} />
              </div>
              <div className="relative -mt-12 sm:-mt-36 z-10 space-y-4 sm:space-y-5 px-2 sm:px-0">
                {/* Live scan status */}
                <div className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-mono tracking-wide transition-colors duration-500 ${
                  heroPhase === "overload" ? "text-red-400/90" : heroPhase === "insight" ? "text-red-300/80" : "text-[#7c6cf0]/80"
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${
                    heroPhase === "overload" ? "bg-red-500" : heroPhase === "insight" ? "bg-red-400" : "bg-[#7c6cf0]"
                  }`} />
                  <span key={scanStatus} className="animate-[fadeSlideIn_0.4s_ease-out]">{scanStatus}</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-[-0.03em]">
                  <span className="gradient-text-shimmer">Your Brain on Screen</span>
                  <br />
                  <span className="text-[#f0f0f8]">Decoded in Seconds</span>
                </h1>

                <p className="text-[#f0f0f8]/60 text-base sm:text-lg md:text-xl font-medium tracking-tight max-w-2xl mx-auto">
                  Five independent AI experts analyze your content and map neural activation across 12 brain regions. Free, instant, no account required.
                </p>

                <p className="text-[#7a7a98] max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
                  Upload ads, photos, music, browsing data, or screen time — our multi-agent consensus engine scores 37 neuromarketing features in under 30 seconds.
                </p>

                {/* Hero CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => { document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-[#7c6cf0] hover:bg-[#8d7ff8] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.97]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Start Neural Scan
                  </button>
                  <button
                    onClick={() => { document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" }); }}
                    className="px-6 py-3.5 text-[#7a7a98] hover:text-[#f0f0f8] active:text-[#f0f0f8] text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    Explore All Modes
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Platform stats */}
          <section className="mt-8 sm:mt-10">
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-5 sm:py-6">
              <div className="flex items-center justify-center gap-4 sm:gap-6 text-[#4a4a68] text-xs sm:text-sm flex-wrap">
                <span><strong className="text-[#7c6cf0] font-semibold">5</strong> expert agents</span>
                <span className="text-[#1e1e30]">/</span>
                <span><strong className="text-[#9d8ff8] font-semibold">12</strong> brain regions</span>
                <span className="text-[#1e1e30]">/</span>
                <span><strong className="text-[#00e8b0] font-semibold">37</strong> features scored</span>
                <span className="text-[#1e1e30]">/</span>
                <span><strong className="text-[#00c49a] font-semibold">7</strong> analysis modes</span>
              </div>
            </div>
          </section>

          {/* Sample Result Preview */}
          <section className="max-w-xl mx-auto px-4 md:px-6 py-10 sm:py-14">
            <div className="scroll-reveal">
              {/* Section label */}
              <div className="text-center mb-6">
                <span className="text-[10px] font-bold text-[#4a4a68] uppercase tracking-[0.2em]">Sample Result</span>
                <p className="text-sm text-[#7a7a98] mt-1">Here&apos;s what your neural report looks like</p>
              </div>

              {/* Demo card wrapper — clickable */}
              <div className="relative group cursor-pointer" onClick={() => { document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" }); }}>
                {/* DEMO badge */}
                <div className="absolute top-4 right-4 z-30 px-2.5 py-1 rounded-full bg-[#7c6cf0]/15 border border-[#7c6cf0]/25 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-[#9d8ff8] uppercase tracking-[0.12em]">Demo</span>
                </div>

                {/* The card — slight blur on bottom to tease */}
                <div
                  className="relative overflow-hidden rounded-3xl transition-all duration-500 group-hover:scale-[1.01]"
                  style={{ background: "linear-gradient(145deg, #0c0c18 0%, #08080f 50%, #060610 100%)", border: "1px solid rgba(124,108,240,0.12)" }}
                >
                  {/* Ambient glows */}
                  <div className="absolute top-[-60px] right-[-40px] w-[250px] h-[250px] rounded-full blur-[100px] opacity-[0.18]" style={{ background: "#7c6cf0" }} />
                  <div className="absolute bottom-[-50px] left-[-30px] w-[200px] h-[200px] rounded-full blur-[90px] opacity-[0.12]" style={{ background: "#00e8b0" }} />
                  <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(124,108,240,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124,108,240,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                  <div className="relative p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#7c6cf0] flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(124,108,240,0.3)" }}>
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" /></svg>
                        </div>
                        <span className="text-[11px] font-bold text-[#7a7a98] uppercase tracking-[0.15em]">NeuroTest</span>
                      </div>
                      <div className="px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: "#00e8b012", border: "1px solid #00e8b025" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00e8b0]" style={{ boxShadow: "0 0 6px #00e8b0" }} />
                        <span className="text-[10px] font-black text-[#00e8b0] uppercase tracking-[0.1em]">EXCEPTIONAL</span>
                      </div>
                    </div>

                    {/* Score ring + archetype */}
                    <div className="flex items-center gap-5 sm:gap-7 mb-6">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-[-4px] rounded-full opacity-30 blur-[8px]" style={{ background: "conic-gradient(from 0deg, #7c6cf0, transparent 82%, transparent)" }} />
                        <svg width="120" height="120" viewBox="0 0 128 128" className="transform -rotate-90 relative">
                          <circle cx="64" cy="64" r="54" fill="none" stroke="#1e1e30" strokeWidth="5" />
                          <circle cx="64" cy="64" r="54" fill="none" stroke="url(#demoGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(82 / 100) * (2 * Math.PI * 54)} ${2 * Math.PI * 54}`} style={{ filter: "drop-shadow(0 0 10px rgba(124,108,240,0.5))" }} />
                          <defs><linearGradient id="demoGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#7c6cf0" /><stop offset="100%" stopColor="#00e8b0" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[38px] font-black tabular-nums text-[#f0f0f8] leading-none" style={{ textShadow: "0 0 20px rgba(124,108,240,0.2)" }}>82</span>
                          <span className="text-[10px] text-[#4a4a68] font-semibold">/100</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{"\uD83E\uDDE0"}</span>
                          <span className="text-[10px] font-bold text-[#4a4a68] uppercase tracking-[0.15em]">Photo Analysis</span>
                        </div>
                        <h3 className="text-[26px] sm:text-[32px] font-black bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0] bg-clip-text text-transparent leading-[1.1]">The Architect</h3>
                        <p className="text-[11px] text-[#7a7a98] mt-1.5 leading-relaxed">Your patterns leave permanent neural imprints others can&apos;t replicate</p>
                      </div>
                    </div>

                    {/* Social proof */}
                    <div className="flex items-center gap-3 mb-5 px-3.5 py-2.5 rounded-xl bg-[#0c0c14]/80 border border-[#1e1e30]/30">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#00e8b0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        <span className="text-[11px] font-bold text-[#00e8b0]">Top 12%</span>
                      </div>
                      <div className="w-px h-3 bg-[#1e1e30]" />
                      <span className="text-[11px] text-[#7a7a98]">Outperforms <strong className="text-[#f0f0f8]">88%</strong> of analyzed patterns</span>
                    </div>

                    {/* 3 metrics */}
                    <div className="grid grid-cols-3 gap-2.5 mb-5">
                      {[
                        { label: "Emotion", value: 8.4, emoji: "\u2764\uFE0F" },
                        { label: "Memory", value: 8.7, emoji: "\uD83E\uDDE0" },
                        { label: "Focus", value: 7.2, emoji: "\uD83D\uDC41\uFE0F" },
                      ].map((m) => (
                        <div key={m.label} className="rounded-xl p-3 text-center border border-[#1e1e30]/30" style={{ background: "rgba(12,12,20,0.7)" }}>
                          <div className="text-sm mb-1">{m.emoji}</div>
                          <div className="text-[18px] font-black tabular-nums text-[#f0f0f8]">{m.value}</div>
                          <div className="text-[9px] text-[#4a4a68] font-semibold uppercase tracking-wider mb-2">{m.label}</div>
                          <div className="h-1 rounded-full bg-[#1e1e30] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(m.value / 10) * 100}%`, background: "linear-gradient(90deg, #7c6cf0, #00e8b0)" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Insight */}
                    <div className="rounded-xl p-4 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,108,240,0.06), rgba(0,232,176,0.03))", border: "1px solid rgba(124,108,240,0.1)" }}>
                      <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: "linear-gradient(180deg, #7c6cf0, #00e8b0)" }} />
                      <p className="text-[12px] text-[#c4bfff] leading-[1.7] pl-3 italic">&ldquo;Exceptional memory encoding detected. Your neural patterns create sticky impressions that persist long after exposure.&rdquo;</p>
                    </div>

                    {/* Brain regions */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {[
                        { name: "Memory", pct: 94, color: "#ff4500" },
                        { name: "Decision Making", pct: 87, color: "#ffaa00" },
                        { name: "Emotions", pct: 82, color: "#ff4500" },
                      ].map((r, i) => (
                        <span key={r.name} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border bg-[#050508]/50 flex items-center gap-1.5" style={{ color: r.color, borderColor: `${r.color}20` }}>
                          <span className="text-[8px]">{i === 0 ? "\uD83D\uDD25" : i === 1 ? "\u26A1" : "\u2728"}</span>
                          {r.name} {r.pct}%
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#1e1e30]/25">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-[#00e8b0]" style={{ boxShadow: "0 0 4px #00e8b0" }} />
                        <span className="text-[10px] text-[#4a4a68]">5 AI agents &middot; 37 features &middot; 12 brain regions</span>
                      </div>
                      <span className="text-[11px] font-bold text-[#7c6cf0]">neurotest.live</span>
                    </div>
                  </div>

                  {/* Bottom fade + CTA overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#060610] via-[#060610]/90 to-transparent z-20 flex items-end justify-center pb-5">
                    <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7c6cf0] text-white text-sm font-semibold shadow-[0_4px_25px_rgba(124,108,240,0.35)] group-hover:bg-[#8d7ff8] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Get Your Real Result
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Analysis Modes */}
          <section id="modes" className="max-w-6xl mx-auto px-4 md:px-6 py-12 sm:py-20">
            <div className="scroll-reveal mb-8 sm:mb-12">
              <div className="border-l-2 border-[#7c6cf0] pl-4">
                <h3 className="font-display text-xl sm:text-2xl md:text-4xl font-bold tracking-[-0.02em]">
                  <span className="gradient-text-shimmer">Seven analysis modes.</span>
                </h3>
                <p className="text-sm text-[#7a7a98] mt-2">Each one built for a different kind of content.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" style={{ gridAutoRows: "minmax(140px, auto)" }}>
              {MODES.map((m, i) => {
                const icons = ["M13 10V3L4 14h7v7l9-11h-7z", "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z", "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9", "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z", "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"];
                return (
                <button
                  key={m.id}
                  onClick={() => selectMode(m.id)}
                  className={`scroll-reveal relative group text-left rounded-xl p-5 sm:p-6 transition-all duration-300 active:scale-[0.98] border border-[#1e1e30] hover:border-[${m.color}]/25
                    ${i === 0 ? "sm:col-span-2 lg:col-span-2 sm:row-span-2" : ""}`}
                  style={{ animationDelay: `${i * 60}ms`, background: i === 0 ? `linear-gradient(135deg, ${m.color}06, transparent 60%)` : "rgba(17, 17, 25, 0.6)" }}
                >
                  {m.badge && (
                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider" style={{ color: m.color, backgroundColor: `${m.color}12` }}>
                      {m.badge}
                    </div>
                  )}
                  <div className={`flex ${i === 0 ? "flex-col gap-4" : "items-start gap-3.5"}`}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${m.color}12` }}>
                      <svg className="w-4 h-4" style={{ color: m.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={icons[i]} /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`${i === 0 ? "text-lg" : "text-sm"} font-semibold text-[#f0f0f8] mb-1.5`}>{m.title}</h4>
                      <p className={`${i === 0 ? "text-sm" : "text-xs"} text-[#7a7a98] leading-relaxed`}>{m.desc}</p>
                      <span className="inline-flex items-center gap-1 mt-3 text-[10px] font-medium transition-colors group-hover:text-[#f0f0f8]" style={{ color: m.color }}>
                        {m.acceptText}
                        <svg className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </span>
                    </div>
                  </div>
                </button>
              );})}
            </div>
          </section>

          {/* Browser Extension */}
          <section className="border-t border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 sm:py-20">
              <div className="scroll-reveal">
                <div className="glass-card rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,108,240,0.04), rgba(17,17,25,0.95) 50%)" }}>
                  <div className="p-6 sm:p-10">
                    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                      <div className="flex-1 text-center lg:text-left space-y-4">
                        <span className="text-[11px] font-semibold text-[#7c6cf0] uppercase tracking-[0.15em]">Browser Extension</span>
                        <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#f0f0f8] leading-tight">
                          <span className="gradient-text">Real-time neural mapping</span><br />
                          of your browsing behavior
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto lg:mx-0 leading-relaxed">
                          See what your browsing does to your brain. Dopamine patterns, attention quality, focus metrics — all tracked and mapped to neural regions in real time.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                          <a href="/install" className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Install Extension
                          </a>
                          <span className="text-[11px] text-[var(--text-tertiary)]">Chrome, Brave, Edge</span>
                        </div>
                      </div>

                      {/* Mockup */}
                      <div className="w-full max-w-[260px] flex-shrink-0">
                        <div className="glass-card rounded-lg overflow-hidden">
                          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2.5">
                            <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" /></svg>
                            </div>
                            <span className="text-[11px] font-medium text-[var(--text-primary)]">NeuroTest</span>
                            <div className="ml-auto flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                              <span className="text-[9px] text-[var(--text-tertiary)]">42m</span>
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { v: "42m", l: "Screen Time" },
                                { v: "8", l: "Sites" },
                                { v: "Social", l: "Top Cat" },
                              ].map(s => (
                                <div key={s.l} className="bg-[var(--bg-primary)] rounded-md p-2 text-center border border-[var(--border)]">
                                  <div className="text-[12px] font-medium text-[var(--text-primary)]">{s.v}</div>
                                  <div className="text-[7px] text-[var(--text-tertiary)] uppercase tracking-wider">{s.l}</div>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { n: "Dopamine", s: 7.2 },
                                { n: "Attention", s: 4.8 },
                                { n: "Learning", s: 6.1 },
                                { n: "Focus", s: 5.5 },
                              ].map(e => (
                                <div key={e.n} className="bg-[var(--bg-primary)] rounded-md p-2 border border-[var(--border)]">
                                  <div className="text-[7px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{e.n}</div>
                                  <div className="text-[14px] font-medium text-[var(--accent)]">{e.s}<span className="text-[8px] text-[var(--text-tertiary)]">/10</span></div>
                                  <div className="h-1 bg-[var(--bg-secondary)] rounded-full mt-1 overflow-hidden">
                                    <div className="h-full rounded-full bg-[var(--accent)] opacity-60" style={{ width: `${e.s * 10}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="bg-[var(--accent)] rounded-md py-2 text-center">
                              <span className="text-[10px] font-medium text-white">Analyze Brain Effects</span>
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
          <section className="border-t border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 sm:py-16">
              <div className="scroll-reveal mb-10 sm:mb-14">
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[#f0f0f8]">
                  How it <span className="gradient-text">works</span>
                </h3>
                <p className="text-sm text-[#7a7a98] mt-1.5">Under 30 seconds. No account.</p>
              </div>

              <div className="scroll-reveal relative">
                {/* Connecting line — desktop only */}
                <div className="hidden md:block absolute top-6 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-[#7c6cf0]/30 via-[#00e8b0]/20 to-[#ff6090]/30" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
                  {[
                    { step: "01", title: "Upload", desc: "Drag a file or paste any URL. Video, image, audio — all formats.", color: "#7c6cf0" },
                    { step: "02", title: "Analyze", desc: "Five expert agents score independently. Consensus removes bias.", color: "#00e8b0" },
                    { step: "03", title: "Map", desc: "See 12 brain regions light up. 37 features. Actionable insights.", color: "#ff6090" },
                  ].map((item, idx) => (
                    <div key={item.step} className="relative" style={{ animationDelay: `${idx * 80}ms` }}>
                      <div className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold relative z-10 flex-shrink-0"
                          style={{ backgroundColor: `${item.color}12`, color: item.color, boxShadow: `0 0 20px ${item.color}15` }}>
                          {item.step}
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-[#f0f0f8] mb-1">{item.title}</h4>
                          <p className="text-sm text-[#7a7a98] leading-relaxed max-w-[240px]">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Agent Panel */}
          <section className="border-t border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 sm:py-20">
              <div className="scroll-reveal mb-10 sm:mb-14 max-w-xl">
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[#f0f0f8]">
                  Five experts. One <span className="text-[#7c6cf0]">consensus</span>.
                </h3>
                <p className="text-sm text-[#7a7a98] mt-2 leading-relaxed">Each agent scores independently. Trimmed-mean aggregation drops outliers — no single model bias can skew your results.</p>
              </div>

              <div className="scroll-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 border border-[#1e1e30] rounded-xl overflow-hidden">
                {[
                  { name: "Neuroscientist", focus: "Brain activation patterns", color: "#7c6cf0", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                  { name: "Psychologist", focus: "Cognitive biases", color: "#00e8b0", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
                  { name: "Creative Director", focus: "Production & craft", color: "#ff6090", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
                  { name: "Performance Marketer", focus: "Conversion signals", color: "#ffb020", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
                  { name: "Behavioral Economist", focus: "Decision framing", color: "#9d8ff8", icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
                ].map((agent, i) => (
                  <div key={agent.name} className={`flex items-start gap-3 p-4 sm:p-5 ${i < 4 ? "lg:border-r border-b lg:border-b-0" : ""} ${i < 3 ? "sm:border-r" : ""} border-[#1e1e30] hover:bg-[#0c0c14]/80 transition-colors`}>
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: agent.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={agent.icon} /></svg>
                    <div>
                      <h4 className="text-xs font-semibold text-[#f0f0f8] mb-0.5">{agent.name}</h4>
                      <p className="text-[10px] text-[#4a4a68]">{agent.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="border-t border-[var(--border)] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#7c6cf0]/[0.06] rounded-full blur-[100px]" />
            </div>
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 sm:py-24 text-center relative z-10">
              <div className="scroll-reveal">
                <h3 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">
                  <span className="gradient-text-shimmer">Ready to decode your brain?</span>
                </h3>
                <p className="text-sm text-[#7a7a98] mb-8 max-w-md mx-auto">
                  Free. No account. Results in 30 seconds.
                </p>
                <button
                  onClick={() => { document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-[#7c6cf0] hover:bg-[#8d7ff8] text-white font-semibold text-sm sm:text-base inline-flex items-center gap-2.5 transition-all duration-200 active:scale-[0.97] shadow-[0_4px_30px_rgba(124,108,240,0.3)]"
                >
                  Start Neural Scan
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          </section>

          {/* Built with */}
          <section className="border-t border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 sm:py-10">
              <div className="flex flex-wrap justify-center items-center gap-x-8 sm:gap-x-12 gap-y-3 text-[var(--text-tertiary)]">
                {["Groq", "Cerebras", "Llama 4", "Next.js", "Three.js"].map(name => (
                  <span key={name} className="text-xs font-medium">{name}</span>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <section className="border-t border-[var(--border)]">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
                    </svg>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">&copy; 2026 NeuroTest</span>
                </div>
                <div className="flex items-center gap-x-5 text-xs text-[var(--text-tertiary)]">
                  <a href="/install" className="hover:text-[var(--text-secondary)] transition-colors">Extension</a>
                  <a href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</a>
                  <span>Zero data stored</span>
                </div>
              </div>
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

          {/* Validation hint — shown when input doesn't match mode */}
          {validationHint && (
            <div className="text-center mb-2">
              <p className="text-sm text-[#ff6060] font-medium">{validationHint}</p>
            </div>
          )}

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
          {/* Lightweight CSS brain glow — no WebGL during API call */}
          <div className="absolute inset-0 pointer-events-none h-[50vh] md:h-[60vh] flex items-center justify-center">
            <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]">
              <div className="absolute inset-0 rounded-full bg-[#ffaa00]/20 blur-[80px] animate-pulse" />
              <div className="absolute top-[10%] left-[10%] w-[70%] h-[60%] rounded-full bg-[#ff6600]/15 blur-[60px] animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute bottom-[5%] right-[5%] w-[50%] h-[50%] rounded-full bg-[#7c6cf0]/20 blur-[50px] animate-pulse" style={{ animationDelay: "1s" }} />
              <div className="absolute top-[30%] left-[25%] w-[50%] h-[40%] rounded-full bg-[#00e8b0]/10 blur-[40px] animate-pulse" style={{ animationDelay: "1.5s" }} />
              {/* Brain silhouette icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-24 h-24 sm:w-32 sm:h-32 text-[#7c6cf0]/30 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
                </svg>
              </div>
            </div>
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

          {/* Neuro Cards — shareable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NeuroCard analysis={result.contentA} color="#7c6cf0" mode="A/B Test" />
            <NeuroCard analysis={result.contentB} color="#00e8b0" mode="A/B Test" />
          </div>

          {/* Share Winner Card */}
          <ShareCard
            analysis={result.winner === "A" ? result.contentA : result.contentB}
            mode="A/B Test"
            color={result.winner === "A" ? "#7c6cf0" : "#00e8b0"}
          />

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
          <div className="text-center py-6 space-y-2">
            <p className="text-[11px] text-[#4a4a68] font-medium">Multi-agent consensus AI — 5 expert agents, trimmed-mean aggregation</p>
            <p className="text-[10px] text-[#2d2d50] max-w-lg mx-auto leading-relaxed">Results are AI-generated predictions based on neuromarketing research patterns. Accuracy improves as our models learn from more analyses. Early results may vary from real-world performance — use as directional guidance alongside your own testing.</p>
          </div>
        </main>
      )}

      {/* ==================== PROFILE RESULTS STATE ==================== */}
      {state === "profile-results" && profileResult && (
        <ErrorBoundary onReset={reset}>
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

          {/* Neuro Card — shareable identity artifact */}
          <NeuroCard analysis={profileResult} color={currentMode.color} mode={currentMode.shortTitle} />

          {/* Shareable Result Card */}
          <ShareCard analysis={profileResult} mode={currentMode.shortTitle} color={currentMode.color} />

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
                    <div className="text-3xl font-black tabular-nums" style={{ color: (profileResult.performancePrediction?.overallScore ?? 50) >= 70 ? "#00e8b0" : "#ffb020" }}>
                      {profileResult.performancePrediction?.overallScore ?? 50}
                    </div>
                    <div className="text-[10px] text-[#4a4a68]">/100</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { l: "Est. CTR", v: profileResult.performancePrediction?.estimatedCTR ?? "—" },
                    { l: "Engagement", v: profileResult.performancePrediction?.engagementRate ?? "—" },
                    { l: "Conversion", v: profileResult.performancePrediction?.conversionPotential ?? "—" },
                    { l: "View-Through", v: profileResult.performancePrediction?.viewThroughRate ?? "—" },
                    { l: "Shareability", v: profileResult.performancePrediction?.shareability ?? "—" },
                  ].map((s) => (
                    <div key={s.l} className="bg-[#0c0c14] rounded-xl p-3 border border-[#1e1e30]/30">
                      <p className="text-[10px] text-[#4a4a68] font-medium uppercase tracking-wider mb-1">{s.l}</p>
                      <p className="text-sm font-bold text-[#f0f0f8]">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              {(profileResult.platformScores?.length ?? 0) > 0 && (
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
                        <span className="text-lg font-black tabular-nums" style={{ color: currentMode.color }}>{(ps.score ?? 0).toFixed(1)}</span>
                      </div>
                      <p className="text-[11px] text-[#7a7a98]">{ps.tip}</p>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Creative Health */}
              {profileResult.creativeHealth && (
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h4 className="text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.2em]">Creative Health</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Lifespan</p>
                    <p className="text-xl font-black text-[#ffb020]">{profileResult.creativeHealth.fatigueLifespanDays ?? 15}d</p>
                  </div>
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Brand Safe</p>
                    <p className="text-xl font-black" style={{ color: (profileResult.creativeHealth.brandSafetyScore ?? 5) >= 7 ? "#00e8b0" : "#ffb020" }}>{profileResult.creativeHealth.brandSafetyScore ?? 5}/10</p>
                  </div>
                  <div className="bg-[#0c0c14] rounded-xl p-3 text-center border border-[#1e1e30]/30">
                    <p className="text-[10px] text-[#4a4a68] mb-1">Accessible</p>
                    <p className="text-xl font-black" style={{ color: (profileResult.creativeHealth.accessibilityScore ?? 5) >= 7 ? "#00e8b0" : "#ffb020" }}>{profileResult.creativeHealth.accessibilityScore ?? 5}/10</p>
                  </div>
                </div>
                <p className="text-xs text-[#7a7a98]">{profileResult.creativeHealth.fatigueReason ?? ""}</p>
              </div>
              )}
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
              {(profileResult.audiencePersonas ?? []).map((persona) => {
                const rc = (persona.resonanceScore ?? 5) >= 7 ? "#00e8b0" : (persona.resonanceScore ?? 5) >= 4 ? "#ffb020" : "#ff4060";
                return (
                  <div key={persona.name} className="glass-card glass-card-hover rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[#f0f0f8]">{persona.name}</h5>
                      <span className="text-lg font-black tabular-nums" style={{ color: rc }}>{persona.resonanceScore ?? 5}<span className="text-[10px] text-[#4a4a68]">/10</span></span>
                    </div>
                    <p className="text-xs text-[#7a7a98] leading-relaxed italic">&ldquo;{persona.reaction}&rdquo;</p>
                    {(persona.keyDrivers?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] text-[#00e8b0] font-semibold uppercase tracking-wider mb-1">Works</p>
                        {persona.keyDrivers.map((d, i) => <p key={i} className="text-[11px] text-[#7a7a98] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#00e8b0]" />{d}</p>)}
                      </div>
                    )}
                    {(persona.turnoffs?.length ?? 0) > 0 && (
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
          <div className="text-center py-6 space-y-2">
            <p className="text-[11px] text-[#4a4a68] font-medium">Neural profile powered by multi-agent consensus AI</p>
            <p className="text-[10px] text-[#2d2d50] max-w-lg mx-auto leading-relaxed">Results are AI-generated predictions based on neuromarketing research patterns. Accuracy improves as our models learn from more analyses. Early results may vary from real-world performance — use as directional guidance alongside your own testing.</p>
          </div>
        </main>
        </ErrorBoundary>
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
        <Brain3D regions={analysis.regions} className="w-full h-full" showParticles />
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

function getNeuroArchetype(a: NeuralAnalysis): { name: string; icon: string; desc: string; gradient: string } {
  const scores = [
    { key: "emotional", v: a.emotionalImpact },
    { key: "memory", v: a.memoryRetention },
    { key: "decision", v: a.decisionTrigger },
    { key: "attention", v: a.attentionCapture },
    { key: "trust", v: a.trustBuilding },
  ].sort((x, y) => y.v - x.v);
  const top = scores[0].key;
  const second = scores[1].key;

  if (top === "emotional" && second === "trust") return { name: "The Empath", icon: "heart", desc: "Builds deep emotional connections through authentic trust signals", gradient: "from-[#e8457a] to-[#7c6cf0]" };
  if (top === "emotional") return { name: "The Catalyst", icon: "zap", desc: "Ignites powerful emotional responses that drive action", gradient: "from-[#e8457a] to-[#ffb020]" };
  if (top === "memory") return { name: "The Architect", icon: "layers", desc: "Creates lasting neural imprints that stick in memory", gradient: "from-[#7c6cf0] to-[#00e8b0]" };
  if (top === "decision") return { name: "The Closer", icon: "target", desc: "Engineered to trigger decisive action at the right moment", gradient: "from-[#00e8b0] to-[#ffb020]" };
  if (top === "attention") return { name: "The Magnet", icon: "eye", desc: "Captures and holds attention in a world of distractions", gradient: "from-[#ffb020] to-[#e8457a]" };
  if (top === "trust") return { name: "The Oracle", icon: "shield", desc: "Commands authority and builds unshakeable credibility", gradient: "from-[#00e8b0] to-[#7c6cf0]" };
  return { name: "The Strategist", icon: "brain", desc: "Balanced neural profile with no single weakness", gradient: "from-[#7c6cf0] to-[#00e8b0]" };
}

function NeuroCard({ analysis, color, mode }: { analysis: NeuralAnalysis; color: string; mode: string }) {
  const arch = getNeuroArchetype(analysis);
  const topRegions = [...analysis.regions].sort((a, b) => b.activation - a.activation).slice(0, 3);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1e1e30]" style={{ background: "linear-gradient(135deg, #0c0c14 0%, #0a0a12 100%)" }}>
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20" style={{ background: color }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-[60px] opacity-10" style={{ background: color }} />

      <div className="relative p-6 sm:p-8">
        {/* Top row: branding + score */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#7c6cf0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
            </svg>
            <span className="text-[10px] font-bold text-[#4a4a68] uppercase tracking-[0.2em]">NeuroTest</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black tabular-nums" style={{ color }}>{analysis.overallScore}</span>
            <span className="text-xs text-[#4a4a68] font-medium">/10</span>
          </div>
        </div>

        {/* Archetype */}
        <div className="mb-6">
          <h3 className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${arch.gradient} bg-clip-text text-transparent`}>{arch.name}</h3>
          <p className="text-xs text-[#7a7a98] mt-1.5 max-w-xs">{arch.desc}</p>
        </div>

        {/* 3 key metrics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Emotion", value: analysis.emotionalImpact },
            { label: "Memory", value: analysis.memoryRetention },
            { label: "Action", value: analysis.decisionTrigger },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-lg font-black tabular-nums text-[#f0f0f8]">{(m.value ?? 0).toFixed(1)}</div>
              <div className="text-[9px] text-[#4a4a68] font-semibold uppercase tracking-wider mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Top brain regions */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {topRegions.map((r) => (
            <span key={r.id} className="px-2.5 py-1 rounded-lg text-[9px] font-semibold border border-[#1e1e30] bg-[#050508]/60" style={{ color: r.color }}>
              {r.name} {(r.activation * 100).toFixed(0)}%
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1e1e30]/40">
          <span className="text-[9px] text-[#2d2d50] font-medium">neurotest.live</span>
          <span className="text-[9px] text-[#2d2d50] font-medium">{mode} analysis</span>
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
