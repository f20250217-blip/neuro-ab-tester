// Brain regions and their roles in content processing
export interface BrainRegion {
  name: string;
  id: string;
  role: string;
  position: [number, number, number]; // 3D position on brain model
  activation: number; // 0-1
  color: string;
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
  { name: "Prefrontal Cortex", id: "pfc", role: "Decision making, planning, rational thought", position: [0, 0.8, 1.2] },
  { name: "Amygdala", id: "amygdala", role: "Emotional processing, fear, excitement", position: [0.4, -0.2, 0.3] },
  { name: "Hippocampus", id: "hippocampus", role: "Memory formation, recall, learning", position: [0.5, -0.3, 0] },
  { name: "Visual Cortex", id: "visual", role: "Visual processing, imagery, pattern recognition", position: [0, -0.5, -1.2] },
  { name: "Auditory Cortex", id: "auditory", role: "Sound processing, speech comprehension", position: [1.2, 0, 0] },
  { name: "Broca's Area", id: "broca", role: "Language production, speech processing", position: [-0.8, 0.5, 0.8] },
  { name: "Wernicke's Area", id: "wernicke", role: "Language comprehension, meaning extraction", position: [-1.1, 0.2, -0.2] },
  { name: "Nucleus Accumbens", id: "nac", role: "Reward, pleasure, motivation, desire", position: [0, 0.1, 0.6] },
  { name: "Insula", id: "insula", role: "Empathy, social awareness, gut feelings", position: [0.8, 0.2, 0.2] },
  { name: "Anterior Cingulate", id: "acc", role: "Attention, conflict monitoring, focus", position: [0, 0.6, 0.5] },
  { name: "Motor Cortex", id: "motor", role: "Action impulse, physical response urge", position: [0, 1.0, 0.3] },
  { name: "Temporal Pole", id: "temporal", role: "Narrative comprehension, social context", position: [1.0, -0.3, 0.8] },
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
