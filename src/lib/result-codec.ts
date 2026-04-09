/**
 * Encodes/decodes result data into a URL-safe compact string.
 * No database needed — data is self-contained in the URL.
 *
 * Format: base64url({ s: score, t: type, m: mode, i: insight })
 * Example URL: /result/eyJzIjo4MiwidCI6ImEiLCJtIjoiUGhvdG8ifQ
 */

export interface ResultData {
  score: number;   // 0-100
  type: string;    // archetype key (e.g. "architect")
  mode: string;    // analysis mode (e.g. "Photo")
  insight: string; // truncated insight text
}

// Short type keys to minimize URL length
const TYPE_SHORT: Record<string, string> = {
  empath: "e", catalyst: "c", architect: "a", closer: "cl",
  magnet: "m", oracle: "o", strategist: "s",
};
const TYPE_LONG: Record<string, string> = {
  e: "empath", c: "catalyst", a: "architect", cl: "closer",
  m: "magnet", o: "oracle", s: "strategist",
};

// Short mode keys
const MODE_SHORT: Record<string, string> = {
  "A/B Test": "ab", "Photo": "ph", "Music": "mu",
  "Browsing": "br", "Social": "so", "Text": "tx",
  "Screen Time": "st", "Analysis": "an",
};
const MODE_LONG: Record<string, string> = {
  ab: "A/B Test", ph: "Photo", mu: "Music",
  br: "Browsing", so: "Social", tx: "Text",
  st: "Screen Time", an: "Analysis",
};

function toBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url");
  }
  // Browser fallback
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64url").toString("utf-8");
  }
  // Browser fallback
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

export function encodeResult(data: ResultData): string {
  const compact = {
    s: Math.round(data.score),
    t: TYPE_SHORT[data.type.toLowerCase()] || "s",
    m: MODE_SHORT[data.mode] || data.mode.slice(0, 4).toLowerCase(),
    i: data.insight.slice(0, 100), // keep URL reasonable
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeResult(id: string): ResultData | null {
  try {
    const json = fromBase64Url(id);
    const compact = JSON.parse(json);
    return {
      score: Math.min(100, Math.max(0, Number(compact.s) || 50)),
      type: TYPE_LONG[compact.t] || "strategist",
      mode: MODE_LONG[compact.m] || compact.m || "Analysis",
      insight: String(compact.i || ""),
    };
  } catch {
    return null;
  }
}
