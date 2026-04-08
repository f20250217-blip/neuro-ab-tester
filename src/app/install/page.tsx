"use client";

import { useState } from "react";

const EXTENSION_FILES = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

export default function InstallPage() {
  const [step, setStep] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    // Download the zip — simplest way to get all files at once
    const link = document.createElement("a");
    link.href = "/extension/neurotest-extension.zip";
    link.download = "neurotest-extension.zip";
    link.click();

    // Wait a moment then mark as downloaded
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      setStep(1);
    }, 1500);
  };

  const steps = [
    {
      num: "01",
      title: "Download Extension",
      desc: "Click the button below to download the NeuroTest AI extension files.",
      color: "#7c6cf0",
    },
    {
      num: "02",
      title: "Unzip the File",
      desc: "Find the downloaded zip file and extract/unzip it to a folder you'll remember.",
      color: "#9d8ff8",
    },
    {
      num: "03",
      title: "Open Extensions Page",
      desc: "",
      color: "#00e8b0",
      hasAction: true,
    },
    {
      num: "04",
      title: "Enable Developer Mode",
      desc: "Toggle the 'Developer mode' switch in the top-right corner of the extensions page.",
      color: "#00c4ff",
    },
    {
      num: "05",
      title: "Load the Extension",
      desc: "Click 'Load unpacked' and select the unzipped NeuroTest folder. That's it — you're done!",
      color: "#ff6090",
    },
  ];

  const browser = typeof navigator !== "undefined" && navigator.userAgent.includes("Firefox") ? "firefox" : "chrome";
  const extensionsUrl = browser === "firefox" ? "about:debugging#/runtime/this-firefox" : "chrome://extensions";

  return (
    <div className="min-h-screen bg-[#050508] text-[#f0f0f8]">
      {/* Header */}
      <header className="border-b border-[#1e1e30]/60 bg-[#050508]/95 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 sm:gap-3.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center shadow-lg shadow-[#7c6cf0]/20 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.5 2 5 4.5 5 8c0 1.5.5 3 1.5 4C5.5 13 5 14.5 5 16c0 3.5 3.5 6 7 6s7-2.5 7-6c0-1.5-.5-3-1.5-4 1-1 1.5-2.5 1.5-4 0-3.5-3.5-6-7-6z" />
                <path d="M12 2v20" />
                <path d="M5 8h14" />
                <path d="M5 16h14" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-[#9d8ff8] to-[#00e8b0] bg-clip-text text-transparent leading-tight">NeuroTest AI</h1>
              <p className="text-[9px] sm:text-[10px] text-[#4a4a68] tracking-[0.15em] uppercase font-medium hidden sm:block">Browser Extension</p>
            </div>
          </a>
          <a href="/" className="px-4 py-2 text-xs sm:text-sm bg-[#111119] border border-[#1e1e30] rounded-xl text-[#7a7a98] hover:text-[#f0f0f8] transition-colors font-medium">
            Back to App
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff6090]/10 border border-[#ff6090]/20 mb-5">
            <div className="w-2 h-2 rounded-full bg-[#ff6090]" />
            <span className="text-[11px] font-bold text-[#ff6090] uppercase tracking-wider">Browser Extension</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Install NeuroTest AI
            <br />
            <span className="bg-gradient-to-r from-[#9d8ff8] via-[#7c6cf0] to-[#00e8b0] bg-clip-text text-transparent">in 60 Seconds</span>
          </h2>
          <p className="text-sm sm:text-base text-[#7a7a98] max-w-md mx-auto">
            Works on Chrome, Brave, Edge, and any Chromium browser. No account needed.
          </p>
        </div>

        {/* Download Button */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="relative group"
          >
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-[#7c6cf0] via-[#00e8b0] to-[#ff6090] opacity-60 group-hover:opacity-100 blur-md transition-opacity duration-500" />
            <div className={`relative px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-white font-bold text-base sm:text-lg flex items-center gap-3 transition-all duration-300 group-active:scale-[0.97]
              ${downloaded ? "bg-[#00e8b0]/20 border border-[#00e8b0]/30" : downloading ? "bg-[#111119]" : "bg-gradient-to-r from-[#7c6cf0] to-[#00e8b0]"}`}
            >
              {downloaded ? (
                <>
                  <svg className="w-6 h-6 text-[#00e8b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-[#00e8b0]">Downloaded! Follow steps below</span>
                </>
              ) : downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#7c6cf0] border-t-transparent rounded-full animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Extension
                </>
              )}
            </div>
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 sm:space-y-5">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`rounded-2xl border transition-all duration-500 overflow-hidden
                ${step >= i
                  ? "bg-[#111119] border-[#1e1e30]"
                  : "bg-[#0c0c14]/50 border-[#1e1e30]/40 opacity-50"
                }
                ${step === i ? "ring-1" : ""}
              `}
              style={step === i ? { borderColor: `${s.color}30`, boxShadow: `0 0 30px ${s.color}10` } : {}}
            >
              <div
                className="flex items-start gap-4 p-5 sm:p-6 cursor-pointer"
                onClick={() => setStep(i)}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-sm sm:text-base font-black flex-shrink-0 transition-all duration-500
                    ${step > i ? "bg-[#00e8b0] text-[#050508]" : step === i ? "text-white" : "bg-[#0c0c14] text-[#4a4a68] border border-[#1e1e30]"}`}
                  style={step === i ? { backgroundColor: s.color } : {}}
                >
                  {step > i ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    s.num
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#f0f0f8] mb-1">{s.title}</h3>

                  {i === 2 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-[#7a7a98]">
                        Copy this URL and paste it into your browser&apos;s address bar:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#050508] border border-[#1e1e30] rounded-xl px-4 py-3 text-sm font-mono text-[#00e8b0] select-all overflow-x-auto">
                          {extensionsUrl}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(extensionsUrl);
                          }}
                          className="px-4 py-3 rounded-xl bg-[#111119] border border-[#1e1e30] text-xs font-semibold text-[#7a7a98] hover:text-[#f0f0f8] transition-colors flex-shrink-0 min-h-[44px]"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-[#4a4a68]">
                        Note: Chrome doesn&apos;t allow clicking links to chrome:// pages for security. You must paste it manually.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#7a7a98] leading-relaxed">{s.desc}</p>
                  )}
                </div>
              </div>

              {/* Step progress button */}
              {step === i && i < steps.length - 1 && (
                <div className="px-5 sm:px-6 pb-5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setStep(i + 1); }}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                    style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}
                  >
                    {i === 0 && !downloaded ? "I'll download first" : "Done — Next Step"}
                  </button>
                </div>
              )}

              {/* Final step - success */}
              {step === i && i === steps.length - 1 && (
                <div className="px-5 sm:px-6 pb-5">
                  <div className="bg-[#00e8b0]/8 border border-[#00e8b0]/20 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-[#00e8b0] mb-1">You&apos;re all set!</p>
                    <p className="text-xs text-[#7a7a98]">
                      Click the puzzle icon in your browser toolbar to pin NeuroTest AI. Start browsing and watch your brain light up.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* What you get */}
        <div className="mt-12 sm:mt-16">
          <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#7c6cf0] mb-6">What the Extension Does</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { title: "Tracks Brain Activity", desc: "See which brain regions light up based on your browsing patterns — social media, news, shopping, and more.", color: "#7c6cf0" },
              { title: "Neural Effect Scores", desc: "Get real-time scores: Dopamine Load, Attention Drain, Focus Quality, Learning Score, Stress Level.", color: "#00e8b0" },
              { title: "AI Brain Analysis", desc: "5 AI agents analyze your session and tell you exactly what your browsing is doing to your brain.", color: "#ff6090" },
            ].map((f) => (
              <div key={f.title} className="bg-[#111119] border border-[#1e1e30] rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${f.color}10` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                </div>
                <h4 className="text-sm font-bold text-[#f0f0f8] mb-1.5">{f.title}</h4>
                <p className="text-xs text-[#4a4a68] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 sm:mt-16 space-y-4">
          <h3 className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#9d8ff8] mb-6">Common Questions</h3>
          {[
            { q: "Is my browsing data sent anywhere?", a: "Only when YOU click 'Analyze Brain Effects'. The data is sent to our AI for analysis and never stored. Regular tracking stays 100% local on your device." },
            { q: "Why can't I install with one click?", a: "Chrome requires extensions to go through the Chrome Web Store for one-click install. We're in the process of publishing there. For now, the manual install takes 60 seconds and works perfectly." },
            { q: "Does it slow down my browser?", a: "No. The extension uses minimal resources — it only listens to tab switches, no content injection, no page modification. Battery impact is near zero." },
            { q: "Which browsers are supported?", a: "Chrome, Brave, Edge, Opera, Vivaldi, Arc — any Chromium-based browser with developer mode." },
          ].map((faq) => (
            <div key={faq.q} className="bg-[#111119] border border-[#1e1e30] rounded-2xl p-5">
              <h4 className="text-sm font-bold text-[#f0f0f8] mb-2">{faq.q}</h4>
              <p className="text-xs text-[#7a7a98] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[11px] text-[#4a4a68]">NeuroTest AI — Neural Intelligence Platform</p>
        </div>
      </main>
    </div>
  );
}
