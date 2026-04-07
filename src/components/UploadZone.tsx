"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  label: string;
  sublabel: string;
  onFileSelected: (file: File) => void;
  onUrlProvided?: (url: string) => void;
  file?: File | null;
  url?: string;
  accept?: string;
  accentColor?: string;
}

export default function UploadZone({ label, sublabel, onFileSelected, onUrlProvided, file, url, accept = "video/*,image/*,audio/*", accentColor = "#7c6cf0" }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("url");
  const [urlInput, setUrlInput] = useState(url || "");

  const handleFile = useCallback((f: File) => {
    onFileSelected(f);
    if (f.type.startsWith("video/") || f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    }
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUrlSubmit = () => {
    if (urlInput.trim() && onUrlProvided) {
      onUrlProvided(urlInput.trim());
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Mode Toggle */}
      <div className="flex bg-[#0c0c14] rounded-xl p-1 border border-[#1e1e30] no-select">
        <button
          onClick={() => setMode("url")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${mode === "url" ? "bg-[#111119] text-[#f0f0f8] shadow-lg shadow-black/20" : "text-[#4a4a68] hover:text-[#7a7a98] active:text-[#7a7a98]"}`}
        >
          Paste URL
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${mode === "upload" ? "bg-[#111119] text-[#f0f0f8] shadow-lg shadow-black/20" : "text-[#4a4a68] hover:text-[#7a7a98] active:text-[#7a7a98]"}`}
        >
          Upload File
        </button>
      </div>

      {/* URL Input Mode */}
      {mode === "url" && (
        <div className={`glass-card rounded-2xl p-5 transition-all duration-500 ${url ? "border-[#00e8b0]/20 shadow-[0_0_30px_rgba(0,232,176,0.06)]" : ""}`}>
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}10` }}>
              <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="text-xs text-[#7a7a98] font-medium">YouTube, TikTok, Instagram, or direct URL</span>
          </div>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-[#050508] border border-[#1e1e30] rounded-xl px-4 py-3 text-sm text-[#f0f0f8] placeholder:text-[#2d2d50] focus:outline-none focus:border-[#7c6cf0]/40 focus:shadow-[0_0_20px_rgba(124,108,240,0.08)] transition-all duration-300"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex-shrink-0 ${urlInput.trim() ? "btn-primary" : "bg-[#111119] text-[#4a4a68] cursor-not-allowed border border-[#1e1e30]"}`}
            >
              Set
            </button>
          </div>
          {url && (
            <div className="mt-3 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#00e8b0] animate-pulse shadow-[0_0_8px_rgba(0,232,176,0.5)]" />
              <span className="text-xs text-[#00e8b0] font-medium">Ready for analysis</span>
            </div>
          )}
        </div>
      )}

      {/* File Upload Mode */}
      {mode === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-2xl p-6 transition-all duration-500 cursor-pointer group
            ${isDragging
              ? "border-2 border-[#7c6cf0] bg-[#7c6cf0]/5 shadow-[0_0_40px_rgba(124,108,240,0.1)]"
              : file
                ? "glass-card border-[#00e8b0]/20 shadow-[0_0_30px_rgba(0,232,176,0.06)]"
                : "glass-card glass-card-hover border-dashed border-2 border-[#1e1e30]"
            }`}
        >
          <input
            type="file"
            accept={accept}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {preview ? (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 max-h-36 border border-[#1e1e30]">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider shadow-lg"
                  style={{ backgroundColor: accentColor, color: "#fff" }}>
                  {label}
                </div>
              </div>
              <p className="text-xs text-[#7a7a98] truncate font-medium">{file?.name}</p>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 space-y-3 sm:space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center group-hover:shadow-lg transition-all duration-500"
                style={{ borderColor: `${accentColor}25`, backgroundColor: `${accentColor}05` }}>
                <svg className="w-7 h-7 transition-all duration-500 group-hover:scale-110" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-base text-[#f0f0f8] font-bold">{label}</p>
                <p className="text-xs text-[#4a4a68] mt-1">{sublabel}</p>
              </div>
              <p className="text-xs font-semibold tracking-wide" style={{ color: accentColor }}>Drop file or click to browse</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
