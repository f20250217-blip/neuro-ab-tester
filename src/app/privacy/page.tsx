export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-[#f0f0f8]">
      <header className="border-b border-[#1e1e30]/60 bg-[#050508]/95 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c6cf0] to-[#00e8b0] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.5 2 5 4.5 5 8c0 1.5.5 3 1.5 4C5.5 13 5 14.5 5 16c0 3.5 3.5 6 7 6s7-2.5 7-6c0-1.5-.5-3-1.5-4 1-1 1.5-2.5 1.5-4 0-3.5-3.5-6-7-6z" />
                <path d="M12 2v20" />
                <path d="M5 8h14" />
                <path d="M5 16h14" />
              </svg>
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-[#9d8ff8] to-[#00e8b0] bg-clip-text text-transparent">NeuroTest AI</span>
          </a>
          <a href="/" className="px-4 py-2 text-xs bg-[#111119] border border-[#1e1e30] rounded-xl text-[#7a7a98] hover:text-[#f0f0f8] transition-colors font-medium">Back to App</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#4a4a68] mb-10">Last updated: April 8, 2026</p>

        <div className="space-y-8 text-sm text-[#7a7a98] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Overview</h2>
            <p>NeuroTest AI (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains how our browser extension and web application handle your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Browser Extension — Data Collection</h2>
            <p className="mb-3">The NeuroTest AI browser extension collects the following data <strong className="text-[#f0f0f8]">locally on your device only</strong>:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Website hostnames you visit (e.g., &quot;youtube.com&quot; — not full URLs or page content)</li>
              <li>Time spent on each website</li>
              <li>Number of visits per website</li>
              <li>Session duration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">When Data Leaves Your Device</h2>
            <p className="mb-3">Your browsing data is sent to our servers <strong className="text-[#f0f0f8]">only when you explicitly click &quot;Analyze Brain Effects&quot;</strong> in the extension popup. When this happens:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>A summary of website hostnames and time spent is sent to our API</li>
              <li>The data is processed by AI to generate your neural analysis</li>
              <li>The analysis result is returned to your browser</li>
              <li><strong className="text-[#f0f0f8]">No browsing data is stored on our servers</strong> — it is processed in memory and immediately discarded</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Web Application — Data Collection</h2>
            <p>When you use the NeuroTest AI web application (neurotest.live), files you upload for analysis (images, audio, video, text) are:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li>Sent to our AI providers (Groq, Cerebras) for analysis</li>
              <li>Processed in memory only — <strong className="text-[#f0f0f8]">never stored on our servers or any third-party servers</strong></li>
              <li>Not used for AI model training</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">What We Do NOT Collect</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Full page URLs or URL parameters</li>
              <li>Page content, form data, or passwords</li>
              <li>Personal identification information</li>
              <li>Cookies or authentication tokens</li>
              <li>Keystrokes or screen captures</li>
              <li>Browsing history beyond the current session</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Data Storage</h2>
            <p>All browsing tracking data is stored locally using Chrome&apos;s <code className="px-1.5 py-0.5 bg-[#111119] rounded text-[#9d8ff8] text-xs">chrome.storage.local</code> API. This data never leaves your device unless you explicitly request an analysis. You can reset all stored data at any time using the &quot;Reset Session&quot; button in the extension.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Third-Party Services</h2>
            <p>When you request an analysis, your data is processed by:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 mt-3">
              <li><strong className="text-[#f0f0f8]">Groq</strong> — AI inference provider (processes analysis prompts)</li>
              <li><strong className="text-[#f0f0f8]">Cerebras</strong> — AI inference provider (fallback)</li>
            </ul>
            <p className="mt-3">These providers process data in memory for inference only and do not store your data.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Permissions Explained</h2>
            <div className="space-y-3">
              {[
                { perm: "history", why: "Categorize browsing patterns (social media, news, productivity, etc.) for neural analysis." },
                { perm: "tabs", why: "Track which site is currently active to measure time spent per site." },
                { perm: "storage", why: "Store browsing session data locally on your device." },
                { perm: "alarms", why: "Periodically save time tracking data (every 1 minute) to prevent data loss." },
                { perm: "activeTab", why: "Read the current tab URL when you interact with the extension." },
              ].map(p => (
                <div key={p.perm} className="bg-[#111119] border border-[#1e1e30] rounded-xl p-4">
                  <code className="text-xs font-bold text-[#7c6cf0]">{p.perm}</code>
                  <p className="text-xs text-[#7a7a98] mt-1">{p.why}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Your Rights</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>You can reset all tracked data at any time via the extension</li>
              <li>You can uninstall the extension at any time to stop all tracking</li>
              <li>You can use the web app without installing the extension</li>
              <li>No account or sign-up is required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#f0f0f8] mb-3">Contact</h2>
            <p>For privacy questions, contact us at <a href="mailto:tanwarparshant42@gmail.com" className="text-[#7c6cf0] hover:underline">tanwarparshant42@gmail.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
