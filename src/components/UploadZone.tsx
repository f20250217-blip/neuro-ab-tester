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
}

export default function UploadZone({ label, sublabel, onFileSelected, onUrlProvided, file, url, accept = "video/*,image/*,audio/*" }: UploadZoneProps) {
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

  const hasContent = file || (urlInput && url);

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      <div className="flex bg-[#0a0a0f] rounded-lg p-0.5 border border-[#2a2a4a]">
        <button
          onClick={() => setMode("url")}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${mode === "url" ? "bg-[#1a1a2e] text-[#e8e8f0]" : "text-[#555] hover:text-[#888]"}`}
        >
          Paste URL
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${mode === "upload" ? "bg-[#1a1a2e] text-[#e8e8f0]" : "text-[#555] hover:text-[#888]"}`}
        >
          Upload File
        </button>
      </div>

      {/* URL Input Mode */}
      {mode === "url" && (
        <div className={`rounded-xl border-2 p-4 transition-all ${urlInput ? "border-[#00d2a0]/40 bg-[#00d2a0]/5" : "border-[#2a2a4a] bg-[#12121a]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-xs text-[#8888a8]">YouTube, TikTok, Instagram, or direct video URL</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              placeholder="https://youtube.com/watch?v=... or any video URL"
              className="flex-1 bg-[#0a0a0f] border border-[#2a2a4a] rounded-lg px-3 py-2.5 text-sm text-[#e8e8f0] placeholder:text-[#444] focus:outline-none focus:border-[#6c5ce7] transition-colors"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${urlInput.trim() ? "bg-[#6c5ce7] text-white hover:bg-[#5a4bd4]" : "bg-[#1a1a2e] text-[#555] cursor-not-allowed"}`}
            >
              Set
            </button>
          </div>
          {url && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00d2a0] animate-pulse" />
              <span className="text-xs text-[#00d2a0]">URL ready for analysis</span>
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
          className={`relative border-2 border-dashed rounded-xl p-5 transition-all cursor-pointer group
            ${isDragging ? "border-[#6c5ce7] bg-[#6c5ce7]/10" : "border-[#2a2a4a] hover:border-[#6c5ce7]/50 bg-[#12121a]"}
            ${file ? "border-[#00d2a0]/50 bg-[#00d2a0]/5" : ""}`}
        >
          <input
            type="file"
            accept={accept}
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {preview ? (
            <div className="space-y-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black max-h-32">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2 bg-[#00d2a0] text-black text-[10px] font-bold px-2 py-0.5 rounded">
                  {label}
                </div>
              </div>
              <p className="text-xs text-[#8888a8] truncate">{file?.name}</p>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1a2e] flex items-center justify-center group-hover:bg-[#222240] transition-colors">
                <svg className="w-6 h-6 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-[#e8e8f0] font-medium">{label}</p>
              <p className="text-xs text-[#8888a8]">{sublabel}</p>
              <p className="text-[10px] text-[#6c5ce7]">Drop file or click to upload</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
