import { NeuralAnalysis, ComparisonResult, generateActivationMap, getActivationColor } from "./neuro-engine";

// Analyze content features and map to brain activations
// This uses heuristic neuroscience mapping based on content characteristics
export function analyzeContentFeatures(features: ContentFeatures): Record<string, number> {
  const scores: Record<string, number> = {};

  // Prefrontal Cortex - activated by logical arguments, data, decisions
  scores.pfc = clamp(
    features.hasData * 0.3 +
    features.callToAction * 0.3 +
    features.logicalStructure * 0.2 +
    features.complexity * 0.2
  );

  // Amygdala - activated by emotional content, urgency, surprise
  scores.amygdala = clamp(
    features.emotionalIntensity * 0.35 +
    features.urgency * 0.25 +
    features.surprise * 0.25 +
    features.contrast * 0.15
  );

  // Hippocampus - activated by stories, repetition, novelty
  scores.hippocampus = clamp(
    features.storytelling * 0.3 +
    features.novelty * 0.25 +
    features.repetition * 0.2 +
    features.personalRelevance * 0.25
  );

  // Visual Cortex - activated by visual quality, movement, color
  scores.visual = clamp(
    features.visualQuality * 0.3 +
    features.movement * 0.25 +
    features.colorIntensity * 0.25 +
    features.facePresence * 0.2
  );

  // Auditory Cortex - activated by voice quality, music, sound effects
  scores.auditory = clamp(
    features.voiceClarity * 0.3 +
    features.musicPresence * 0.25 +
    features.audioVariety * 0.25 +
    features.pacing * 0.2
  );

  // Broca's Area - activated by clear speech, powerful words
  scores.broca = clamp(
    features.speechClarity * 0.35 +
    features.powerWords * 0.3 +
    features.simplicity * 0.2 +
    features.rhetoricalDevices * 0.15
  );

  // Wernicke's Area - language comprehension
  scores.wernicke = clamp(
    features.messageClarity * 0.35 +
    features.contextRelevance * 0.3 +
    features.coherence * 0.2 +
    features.simplicity * 0.15
  );

  // Nucleus Accumbens - reward, pleasure
  scores.nac = clamp(
    features.valueProposition * 0.3 +
    features.anticipation * 0.25 +
    features.socialProof * 0.2 +
    features.exclusivity * 0.25
  );

  // Insula - empathy, social connection
  scores.insula = clamp(
    features.empathy * 0.35 +
    features.authenticity * 0.25 +
    features.facePresence * 0.2 +
    features.vulnerability * 0.2
  );

  // Anterior Cingulate - attention
  scores.acc = clamp(
    features.hookStrength * 0.3 +
    features.contrast * 0.2 +
    features.pacing * 0.25 +
    features.novelty * 0.25
  );

  // Motor Cortex - urge to act
  scores.motor = clamp(
    features.callToAction * 0.35 +
    features.urgency * 0.3 +
    features.energyLevel * 0.2 +
    features.movement * 0.15
  );

  // Temporal Pole - narrative understanding
  scores.temporal = clamp(
    features.storytelling * 0.35 +
    features.socialContext * 0.25 +
    features.coherence * 0.2 +
    features.characterPresence * 0.2
  );

  return scores;
}

export interface ContentFeatures {
  // Emotional
  emotionalIntensity: number;
  urgency: number;
  surprise: number;
  empathy: number;
  vulnerability: number;
  anticipation: number;

  // Visual
  visualQuality: number;
  movement: number;
  colorIntensity: number;
  facePresence: number;
  contrast: number;

  // Audio
  voiceClarity: number;
  musicPresence: number;
  audioVariety: number;
  speechClarity: number;

  // Language
  powerWords: number;
  simplicity: number;
  rhetoricalDevices: number;
  messageClarity: number;
  coherence: number;

  // Structure
  pacing: number;
  hookStrength: number;
  storytelling: number;
  logicalStructure: number;
  complexity: number;
  repetition: number;

  // Persuasion
  callToAction: number;
  valueProposition: number;
  socialProof: number;
  exclusivity: number;
  hasData: number;

  // Context
  novelty: number;
  personalRelevance: number;
  contextRelevance: number;
  socialContext: number;
  characterPresence: number;
  authenticity: number;
  energyLevel: number;
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// Parse Claude's analysis response into structured features
export function parseAnalysisToFeatures(analysis: string): ContentFeatures {
  const extractScore = (key: string): number => {
    const regex = new RegExp(`${key}[:\\s]*([0-9.]+)`, "i");
    const match = analysis.match(regex);
    return match ? parseFloat(match[1]) / 10 : 0.5;
  };

  return {
    emotionalIntensity: extractScore("emotional_intensity"),
    urgency: extractScore("urgency"),
    surprise: extractScore("surprise"),
    empathy: extractScore("empathy"),
    vulnerability: extractScore("vulnerability"),
    anticipation: extractScore("anticipation"),
    visualQuality: extractScore("visual_quality"),
    movement: extractScore("movement"),
    colorIntensity: extractScore("color_intensity"),
    facePresence: extractScore("face_presence"),
    contrast: extractScore("contrast"),
    voiceClarity: extractScore("voice_clarity"),
    musicPresence: extractScore("music_presence"),
    audioVariety: extractScore("audio_variety"),
    speechClarity: extractScore("speech_clarity"),
    powerWords: extractScore("power_words"),
    simplicity: extractScore("simplicity"),
    rhetoricalDevices: extractScore("rhetorical_devices"),
    messageClarity: extractScore("message_clarity"),
    coherence: extractScore("coherence"),
    pacing: extractScore("pacing"),
    hookStrength: extractScore("hook_strength"),
    storytelling: extractScore("storytelling"),
    logicalStructure: extractScore("logical_structure"),
    complexity: extractScore("complexity"),
    repetition: extractScore("repetition"),
    callToAction: extractScore("call_to_action"),
    valueProposition: extractScore("value_proposition"),
    socialProof: extractScore("social_proof"),
    exclusivity: extractScore("exclusivity"),
    hasData: extractScore("has_data"),
    novelty: extractScore("novelty"),
    personalRelevance: extractScore("personal_relevance"),
    contextRelevance: extractScore("context_relevance"),
    socialContext: extractScore("social_context"),
    characterPresence: extractScore("character_presence"),
    authenticity: extractScore("authenticity"),
    energyLevel: extractScore("energy_level"),
  };
}

export function buildNeuralAnalysis(
  contentId: string,
  label: string,
  features: ContentFeatures,
  transcript: string,
  visualDesc: string,
  audioDesc: string,
  pacingDesc: string,
  emotionBreakdown: NeuralAnalysis["emotionBreakdown"],
  recommendations: string[],
  detailedAnalysis: string,
  thumbnail?: string
): NeuralAnalysis {
  const regionScores = analyzeContentFeatures(features);
  const regions = generateActivationMap(regionScores);

  const overallScore = Object.values(regionScores).reduce((a, b) => a + b, 0) / Object.values(regionScores).length;

  return {
    contentId,
    label,
    thumbnail,
    overallScore: Math.round(overallScore * 100) / 10,
    emotionalImpact: Math.round(regionScores.amygdala * 100) / 10,
    memoryRetention: Math.round(regionScores.hippocampus * 100) / 10,
    decisionTrigger: Math.round(regionScores.pfc * 100) / 10,
    attentionCapture: Math.round(regionScores.acc * 100) / 10,
    trustBuilding: Math.round(regionScores.insula * 100) / 10,
    regions,
    transcript,
    visualAnalysis: visualDesc,
    audioAnalysis: audioDesc,
    pacingAnalysis: pacingDesc,
    emotionBreakdown,
    recommendations,
    detailedAnalysis,
  };
}

export function compareAnalyses(a: NeuralAnalysis, b: NeuralAnalysis): ComparisonResult {
  const winner = a.overallScore >= b.overallScore ? "A" as const : "B" as const;
  const winnerAnalysis = winner === "A" ? a : b;

  const regionComparison = a.regions.map((regionA, i) => {
    const regionB = b.regions[i];
    const diff = regionA.activation - regionB.activation;
    let insight = "";
    if (Math.abs(diff) < 0.1) {
      insight = "Both are about equal here";
    } else if (diff > 0) {
      insight = `Content A is ${Math.round(diff * 100)}% stronger at ${regionA.name}`;
    } else {
      insight = `Content B is ${Math.round(Math.abs(diff) * 100)}% stronger at ${regionB.name}`;
    }
    return {
      region: regionA.name,
      activationA: regionA.activation,
      activationB: regionB.activation,
      difference: diff,
      insight,
    };
  });

  return {
    contentA: a,
    contentB: b,
    winner,
    winnerReason: `${winnerAnalysis.label} is the stronger content overall, scoring ${winnerAnalysis.overallScore}/10 compared to ${winner === "A" ? b.overallScore : a.overallScore}/10. It's more likely to grab attention, create an emotional connection, and drive action from viewers.`,
    recommendations: [
      ...winnerAnalysis.recommendations.slice(0, 3),
    ],
    detailedComparison: `Content ${winner} is more engaging overall and is more likely to convert viewers into customers.`,
    regionComparison,
  };
}
