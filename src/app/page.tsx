"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import UploadZone from "@/components/UploadZone";
import ScoreBar from "@/components/ScoreBar";
import RegionTable from "@/components/RegionTable";
import { ComparisonResult, NeuralAnalysis } from "@/lib/neuro-engine";

const Brain3D = dynamic(() => import("@/components/Brain3D"), { ssr: false });
const HeroBrain = dynamic(() => import("@/components/Brain3D").then((m) => ({ default: m.HeroBrain })), { ssr: false });

type AppState = "upload" | "processing" | "results";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [labelA, setLabelA] = useState("Content A");
  const [labelB, setLabelB] = useState("Content B");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "regions" | "detailed" | "recommendations">("overview");

  const hasA = fileA || urlA;
  const hasB = fileB || urlB;

  const runAnalysis = useCallback(async () => {
    if (!hasA || !hasB) return;

    setState("processing");
    setError(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) { clearInterval(progressInterval); return 92; }
        return p + Math.random() * 6;
      });
    }, 600);

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
      setTimeout(() => setState("results"), 600);
    } catch (e: any) {
      setError(e.message);
      setState("upload");
    } finally {
      clearInterval(progressInterval);
    }
  }, [fileA, fileB, urlA, urlB, hasA, hasB, labelA, labelB]);

  const reset = () => {
    setState("upload");
    setFileA(null);
    setFileB(null);
    setUrlA("");
    setUrlB("");
    setResult(null);
    setError(null);
    setProgress(0);
    setActiveTab("overview");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-[#2a2a4a]/60 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#00d2a0] flex items-center justify-center shadow-lg shadow-[#6c5ce7]/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text leading-tight">NeuroTest AI</h1>
              <p className="text-[10px] text-[#8888a8] tracking-wider uppercase">Neural A/B Testing</p>
            </div>
          </div>

          {state === "results" && (
            <button onClick={reset} className="px-4 py-2 text-sm bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg hover:bg-[#222240] transition-colors text-[#e8e8f0] hover:border-[#6c5ce7]/50">
              + New Test
            </button>
          )}
        </div>
      </header>

      {/* ==================== UPLOAD STATE ==================== */}
      {state === "upload" && (
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Hero Section with Brain */}
          <div className="text-center mb-6">
            <div className="relative">
              <HeroBrain />
              {/* Overlay gradient for fade effect */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
            </div>
            <div className="relative -mt-20 z-10">
              <h2 className="text-4xl font-bold gradient-text mb-3">A/B Neural Comparison</h2>
              <p className="text-[#8888a8] max-w-xl mx-auto text-sm">
                Drop two pieces of content. See which one triggers a stronger neural response.
                Simulate brain activation before spending a single dollar.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg text-[#ff4757] text-sm max-w-3xl mx-auto">
              {error}
            </div>
          )}

          {/* Upload Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#6c5ce7] shadow-lg shadow-[#6c5ce7]/40" />
                <input value={labelA} onChange={(e) => setLabelA(e.target.value)} className="bg-transparent text-[#e8e8f0] font-medium focus:outline-none border-b border-transparent focus:border-[#6c5ce7] text-sm" placeholder="Label A" />
              </div>
              <UploadZone label="Content A" sublabel="Video, image, or audio" onFileSelected={setFileA} onUrlProvided={setUrlA} file={fileA} url={urlA} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00d2a0] shadow-lg shadow-[#00d2a0]/40" />
                <input value={labelB} onChange={(e) => setLabelB(e.target.value)} className="bg-transparent text-[#e8e8f0] font-medium focus:outline-none border-b border-transparent focus:border-[#00d2a0] text-sm" placeholder="Label B" />
              </div>
              <UploadZone label="Content B" sublabel="Video, image, or audio" onFileSelected={setFileB} onUrlProvided={setUrlB} file={fileB} url={urlB} />
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={runAnalysis} disabled={!hasA || !hasB}
              className={`px-10 py-4 rounded-xl font-semibold text-lg transition-all
                ${hasA && hasB
                  ? "bg-gradient-to-r from-[#6c5ce7] to-[#00d2a0] text-white hover:shadow-xl hover:shadow-[#6c5ce7]/30 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-[#1a1a2e] text-[#555] cursor-not-allowed border border-[#2a2a4a]"}`}>
              Run Neural Analysis
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-3xl mx-auto">
            {["Video Analysis", "Audio Transcription", "Brain Mapping", "12 Brain Regions", "Emotion Detection", "Optimization Tips"].map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full bg-[#1a1a2e] border border-[#2a2a4a] text-xs text-[#8888a8]">{f}</span>
            ))}
          </div>
        </main>
      )}

      {/* ==================== PROCESSING STATE ==================== */}
      {state === "processing" && (
        <main className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center space-y-6">
            {/* Animated brain during processing */}
            <div className="relative mx-auto" style={{ height: 280 }}>
              <HeroBrain />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6c5ce7] to-transparent scan-animation opacity-60" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#e8e8f0] mb-2">Analyzing Neural Response</h2>
              <p className="text-[#8888a8] text-sm">
                {progress < 20 && "Extracting video frames..."}
                {progress >= 20 && progress < 40 && "Transcribing audio with Whisper..."}
                {progress >= 40 && progress < 60 && "Analyzing 37 content dimensions..."}
                {progress >= 60 && progress < 80 && "Mapping activations across 12 brain regions..."}
                {progress >= 80 && progress < 95 && "Generating neural comparison report..."}
                {progress >= 95 && "Finalizing..."}
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8888a8]">Neural mapping progress</span>
                <span className="text-[#6c5ce7] font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6c5ce7, #00d2a0)" }} />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto mt-6">
              {["Frames", "Audio", "Features", "Brain Map", "Report"].map((step, i) => (
                <div key={step} className="text-center">
                  <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-all duration-500
                    ${progress > (i + 1) * 18 ? "bg-[#00d2a0] text-black scale-100" : progress > i * 18 ? "bg-[#6c5ce7] text-white animate-pulse scale-110" : "bg-[#1a1a2e] text-[#555] scale-90"}`}>
                    {progress > (i + 1) * 18 ? "\u2713" : i + 1}
                  </div>
                  <span className="text-[10px] text-[#8888a8]">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ==================== RESULTS STATE ==================== */}
      {state === "results" && result && (
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          {/* Winner Banner */}
          <div className="glow-border rounded-2xl bg-gradient-to-r from-[#12121a] to-[#1a1a2e] border border-[#2a2a4a] p-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg
                ${result.winner === "A" ? "bg-[#6c5ce7] shadow-[#6c5ce7]/30" : "bg-[#00d2a0] text-black shadow-[#00d2a0]/30"}`}>
                {result.winner}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#e8e8f0]">
                  {result.winner === "A" ? result.contentA.label : result.contentB.label} triggers a stronger neural response
                </h3>
                <p className="text-sm text-[#8888a8] mt-0.5">
                  Score: {result.winner === "A" ? result.contentA.overallScore : result.contentB.overallScore}/10 vs {result.winner === "A" ? result.contentB.overallScore : result.contentA.overallScore}/10
                </p>
              </div>
              <div className="hidden md:flex gap-4">
                <MiniStat label="Emotional" valueA={result.contentA.emotionalImpact} valueB={result.contentB.emotionalImpact} />
                <MiniStat label="Memory" valueA={result.contentA.memoryRetention} valueB={result.contentB.memoryRetention} />
                <MiniStat label="Decision" valueA={result.contentA.decisionTrigger} valueB={result.contentB.decisionTrigger} />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-[#12121a] rounded-xl p-1 border border-[#2a2a4a]">
            {[
              { id: "overview" as const, label: "Brain Map Overview" },
              { id: "regions" as const, label: "Region Comparison" },
              { id: "detailed" as const, label: "Detailed Analysis" },
              { id: "recommendations" as const, label: "Recommendations" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id ? "bg-[#1a1a2e] text-[#e8e8f0] shadow-lg" : "text-[#8888a8] hover:text-[#e8e8f0]"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ---- OVERVIEW TAB ---- */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Side-by-side Brain Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BrainCard analysis={result.contentA} color="#6c5ce7" label="A" />
                <BrainCard analysis={result.contentB} color="#00d2a0" label="B" />
              </div>

              {/* Quick Scores Comparison */}
              <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-6">
                <h3 className="text-sm font-medium text-[#8888a8] uppercase tracking-wider mb-4">Score Comparison</h3>
                <div className="space-y-4">
                  {[
                    { label: "Emotional Impact", a: result.contentA.emotionalImpact, b: result.contentB.emotionalImpact },
                    { label: "Memory Retention", a: result.contentA.memoryRetention, b: result.contentB.memoryRetention },
                    { label: "Decision Trigger", a: result.contentA.decisionTrigger, b: result.contentB.decisionTrigger },
                    { label: "Attention Capture", a: result.contentA.attentionCapture, b: result.contentB.attentionCapture },
                    { label: "Trust Building", a: result.contentA.trustBuilding, b: result.contentB.trustBuilding },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-4">
                      <span className="text-xs font-mono text-[#6c5ce7] w-8 text-right">{row.a.toFixed(1)}</span>
                      <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-[#0a0a0f]">
                        <div className="h-full bg-[#6c5ce7] rounded-l-full transition-all duration-1000" style={{ width: `${(row.a / 10) * 50}%` }} />
                        <div className="w-px bg-[#2a2a4a]" />
                        <div className="h-full bg-[#00d2a0] rounded-r-full transition-all duration-1000 ml-auto" style={{ width: `${(row.b / 10) * 50}%` }} />
                      </div>
                      <span className="text-xs font-mono text-[#00d2a0] w-8">{row.b.toFixed(1)}</span>
                      <span className="text-xs text-[#8888a8] w-32">{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- REGIONS TAB ---- */}
          {activeTab === "regions" && (
            <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-6">
              <h3 className="text-sm font-medium text-[#8888a8] uppercase tracking-wider mb-4">Region-by-Region Neural Activation</h3>
              <RegionTable rows={result.regionComparison} />
            </div>
          )}

          {/* ---- DETAILED TAB ---- */}
          {activeTab === "detailed" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailPanel analysis={result.contentA} color="#6c5ce7" />
                <DetailPanel analysis={result.contentB} color="#00d2a0" />
              </div>

              {/* Transcripts */}
              {(result.contentA.transcript || result.contentB.transcript) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {result.contentA.transcript && (
                    <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-5">
                      <h4 className="text-xs font-medium text-[#6c5ce7] uppercase tracking-wider mb-3">Transcript — {result.contentA.label}</h4>
                      <p className="text-sm text-[#8888a8] leading-relaxed">{result.contentA.transcript}</p>
                    </div>
                  )}
                  {result.contentB.transcript && (
                    <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-5">
                      <h4 className="text-xs font-medium text-[#00d2a0] uppercase tracking-wider mb-3">Transcript — {result.contentB.label}</h4>
                      <p className="text-sm text-[#8888a8] leading-relaxed">{result.contentB.transcript}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- RECOMMENDATIONS TAB ---- */}
          {activeTab === "recommendations" && (
            <div className="space-y-6">
              {/* Winner recommendation */}
              <div className={`rounded-2xl p-6 border ${result.winner === "A" ? "bg-[#6c5ce7]/5 border-[#6c5ce7]/30" : "bg-[#00d2a0]/5 border-[#00d2a0]/30"}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${result.winner === "A" ? "bg-[#6c5ce7]" : "bg-[#00d2a0] text-black"}`}>!</div>
                  <div>
                    <h4 className="font-medium text-[#e8e8f0]">Key Insight</h4>
                    <p className="text-sm text-[#8888a8] mt-1">{result.winnerReason}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-5">
                  <h4 className="text-xs font-medium text-[#6c5ce7] uppercase tracking-wider mb-4">How to improve {result.contentA.label}</h4>
                  <ul className="space-y-3">
                    {result.contentA.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[#6c5ce7]/20 text-[#6c5ce7] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-[#aaa]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-5">
                  <h4 className="text-xs font-medium text-[#00d2a0] uppercase tracking-wider mb-4">How to improve {result.contentB.label}</h4>
                  <ul className="space-y-3">
                    {result.contentB.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[#00d2a0]/20 text-[#00d2a0] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-[#aaa]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

/* ==================== Sub-components ==================== */

function BrainCard({ analysis, color, label }: { analysis: NeuralAnalysis; color: string; label: string }) {
  return (
    <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#2a2a4a]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color, color: label === "B" ? "#000" : "#fff" }}>
            {label}
          </div>
          <span className="text-sm font-medium text-[#e8e8f0]">{analysis.label}</span>
        </div>
        <div>
          <span className="text-2xl font-black" style={{ color }}>{analysis.overallScore}</span>
          <span className="text-xs text-[#555]">/10</span>
        </div>
      </div>

      {/* 3D Brain */}
      <div className="h-[320px] bg-[#080810] relative">
        <Brain3D regions={analysis.regions} className="w-full h-full" showParticles={true} />
        {/* Region legend overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
          {analysis.regions
            .filter((r) => r.activation > 0.5)
            .sort((a, b) => b.activation - a.activation)
            .slice(0, 4)
            .map((r) => (
              <span key={r.id} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-black/60 backdrop-blur-sm border border-white/10" style={{ color: r.color }}>
                {r.name} {(r.activation * 100).toFixed(0)}%
              </span>
            ))}
        </div>
      </div>

      {/* Score bars */}
      <div className="p-4 space-y-2.5">
        <ScoreBar label="Emotional Impact" score={analysis.emotionalImpact} color={color} />
        <ScoreBar label="Memory Retention" score={analysis.memoryRetention} color={color} />
        <ScoreBar label="Decision Trigger" score={analysis.decisionTrigger} color={color} />
        <ScoreBar label="Attention Capture" score={analysis.attentionCapture} color={color} />
        <ScoreBar label="Trust Building" score={analysis.trustBuilding} color={color} />
      </div>
    </div>
  );
}

function DetailPanel({ analysis, color }: { analysis: NeuralAnalysis; color: string }) {
  return (
    <div className="bg-[#12121a] border border-[#2a2a4a] rounded-2xl p-5 space-y-4">
      <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color }}>{analysis.label} — Neural Response Analysis</h4>

      <p className="text-sm text-[#999] leading-relaxed">{analysis.detailedAnalysis}</p>

      <div className="grid grid-cols-1 gap-3">
        <AnalysisSection title="Visual Processing" text={analysis.visualAnalysis} />
        <AnalysisSection title="Auditory Processing" text={analysis.audioAnalysis} />
        <AnalysisSection title="Temporal Pacing" text={analysis.pacingAnalysis} />
      </div>

      {/* Emotion Grid */}
      <div>
        <h5 className="text-xs font-medium text-[#e8e8f0] mb-2">Emotion Activation</h5>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(analysis.emotionBreakdown).map(([emotion, value]) => (
            <div key={emotion} className="bg-[#0a0a0f] rounded-lg p-2.5 text-center border border-[#2a2a4a]/50">
              <p className="text-[10px] text-[#8888a8] capitalize mb-1">{emotion}</p>
              <p className="text-base font-bold font-mono" style={{ color }}>{(value * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-3 border border-[#2a2a4a]/30">
      <h6 className="text-[10px] font-medium text-[#e8e8f0] uppercase tracking-wider mb-1">{title}</h6>
      <p className="text-xs text-[#888] leading-relaxed">{text}</p>
    </div>
  );
}

function MiniStat({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const winner = valueA >= valueB ? "A" : "B";
  return (
    <div className="text-center px-3">
      <p className="text-[10px] text-[#8888a8] uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-sm font-bold font-mono ${winner === "A" ? "text-[#6c5ce7]" : "text-[#555]"}`}>{valueA.toFixed(1)}</span>
        <span className="text-[10px] text-[#555]">vs</span>
        <span className={`text-sm font-bold font-mono ${winner === "B" ? "text-[#00d2a0]" : "text-[#555]"}`}>{valueB.toFixed(1)}</span>
      </div>
    </div>
  );
}
