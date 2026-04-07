// Brain regions and their roles in content processing
export interface BrainRegion {
  name: string;
  id: string;
  role: string;
  position: [number, number, number]; // 3D position on brain model
  activation: number; // 0-1
  color: string;
}

export interface PerformancePrediction {
  overallScore: number; // 1-100
  estimatedCTR: string; // e.g., "1.2% - 2.4%"
  engagementRate: string;
  conversionPotential: string; // "Low" | "Medium" | "High" | "Very High"
  viewThroughRate: string;
  shareability: string;
}

export interface PlatformScore {
  platform: string; // Meta, TikTok, YouTube, LinkedIn, Google Display
  score: number; // 0-10
  fit: string; // "Poor" | "Average" | "Good" | "Excellent"
  tip: string; // one-liner optimization tip
}

export interface AttentionFlow {
  firstSecond: string; // what's noticed first
  threeSeconds: string; // what registers by 3s
  fiveSeconds: string; // full comprehension by 5s
  attentionHotspots: string[]; // top 3 visual elements that draw attention
  attentionWeaknesses: string[]; // what gets missed
}

export interface CreativeHealth {
  fatigueLifespanDays: number; // estimated days before fatigue
  fatigueReason: string;
  brandSafetyScore: number; // 0-10
  brandSafetyFlags: string[];
  accessibilityScore: number; // 0-10
  accessibilityIssues: string[];
}

export interface AudiencePersona {
  name: string; // e.g., "Gen Z (18-24)"
  reaction: string; // 2-3 sentence reaction
  resonanceScore: number; // 0-10
  keyDrivers: string[]; // top 2 things that resonate
  turnoffs: string[]; // top 2 things that don't work
}

export interface NeuralAnalysis {
  contentId: string;
  label: string;
  thumbnail?: string;
  overallScore: number;
  emotionalImpact: number;
  memoryRetention: number;
  decisionTrigger: number;
  attentionCapture: number;
  trustBuilding: number;
  regions: BrainRegion[];
  transcript?: string;
  visualAnalysis: string;
  audioAnalysis: string;
  pacingAnalysis: string;
  emotionBreakdown: {
    joy: number;
    surprise: number;
    fear: number;
    trust: number;
    anticipation: number;
    sadness: number;
  };
  recommendations: string[];
  detailedAnalysis: string;
  // New premium features
  performancePrediction: PerformancePrediction;
  platformScores: PlatformScore[];
  attentionFlow: AttentionFlow;
  creativeHealth: CreativeHealth;
  audiencePersonas: AudiencePersona[];
}

export interface ComparisonResult {
  contentA: NeuralAnalysis;
  contentB: NeuralAnalysis;
  winner: "A" | "B";
  winnerReason: string;
  recommendations: string[];
  detailedComparison: string;
  regionComparison: {
    region: string;
    activationA: number;
    activationB: number;
    difference: number;
    insight: string;
  }[];
}

// Default brain regions for neural mapping
export const BRAIN_REGIONS: Omit<BrainRegion, "activation" | "color">[] = [
  { name: "Decision Making", id: "pfc", role: "Helps viewers decide to take action", position: [0, 0.8, 1.2] },
  { name: "Emotions", id: "amygdala", role: "Creates feelings like excitement or urgency", position: [0.4, -0.2, 0.3] },
  { name: "Memory", id: "hippocampus", role: "Makes content stick in people's minds", position: [0.5, -0.3, 0] },
  { name: "Visual Appeal", id: "visual", role: "How eye-catching the visuals are", position: [0, -0.5, -1.2] },
  { name: "Sound Quality", id: "auditory", role: "How well audio and voice work", position: [1.2, 0, 0] },
  { name: "Word Power", id: "broca", role: "Strength of the words and phrases used", position: [-0.8, 0.5, 0.8] },
  { name: "Clarity", id: "wernicke", role: "How easy the message is to understand", position: [-1.1, 0.2, -0.2] },
  { name: "Desire", id: "nac", role: "Makes viewers want the product or outcome", position: [0, 0.1, 0.6] },
  { name: "Trust", id: "insula", role: "Builds credibility and authenticity", position: [0.8, 0.2, 0.2] },
  { name: "Attention", id: "acc", role: "Keeps people watching and focused", position: [0, 0.6, 0.5] },
  { name: "Urge to Act", id: "motor", role: "Drives clicks, signups, and purchases", position: [0, 1.0, 0.3] },
  { name: "Storytelling", id: "temporal", role: "How well the narrative connects", position: [1.0, -0.3, 0.8] },
];

export function getActivationColor(activation: number): string {
  if (activation > 0.8) return "#ff4500"; // Red-orange = very high
  if (activation > 0.6) return "#ffaa00"; // Orange-yellow = high
  if (activation > 0.4) return "#aaff00"; // Yellow-green = moderate
  if (activation > 0.2) return "#00cc88"; // Green = low-moderate
  return "#0088aa"; // Blue-green = low
}

export function generateActivationMap(scores: Record<string, number>): BrainRegion[] {
  return BRAIN_REGIONS.map((region) => {
    const activation = scores[region.id] ?? Math.random() * 0.5 + 0.2;
    return {
      ...region,
      activation: Math.min(1, Math.max(0, activation)),
      color: getActivationColor(activation),
    };
  });
}
