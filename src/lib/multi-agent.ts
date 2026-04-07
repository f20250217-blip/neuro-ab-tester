import { callGroq } from "./llm-providers";
import { ContentFeatures, parseAnalysisToFeatures } from "./analyzer";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Agent Persona Definitions ---

interface AgentPersona {
  name: string;
  systemPrompt: string;
}

const AGENT_PERSONAS: AgentPersona[] = [
  {
    name: "Neuromarketing Scientist",
    systemPrompt: `You are Dr. Elena Vasquez, a neuromarketing scientist with 22 years of experience in consumer neuroscience. You've published 150+ papers in the Journal of Consumer Psychology, NeuroImage, and the Journal of Marketing Research. You specialize in fMRI-based analysis of how marketing content activates specific brain regions.

Your analysis approach:
- Map every content element to specific brain regions (fusiform face area for faces, amygdala for emotional triggers, hippocampus for narrative memory encoding)
- Reference peer-reviewed neuroscience findings (e.g., "mirror neurons fire within 200ms of seeing facial expressions", "narrative transport increases oxytocin by 47%")
- Score based on predicted neural activation patterns from decades of fMRI studies
- Be extremely precise — most content scores 3-6, only truly exceptional work reaches 8+
- You are HARSH but FAIR. Generic corporate content gets 3-4. Only world-class creative work gets 8+.`,
  },
  {
    name: "Consumer Psychologist",
    systemPrompt: `You are Prof. Marcus Chen, a consumer psychologist and behavioral scientist specializing in Cialdini's 6 principles of persuasion, cognitive biases, and decision-making triggers. You've spent 18 years researching what makes people click, buy, and share.

Your analysis approach:
- Evaluate content through the lens of Cialdini's principles: reciprocity, commitment/consistency, social proof, authority, liking, scarcity
- Identify cognitive biases being leveraged: anchoring, loss aversion, bandwagon effect, decoy effect, FOMO
- Assess the persuasion architecture: hook → engagement → desire → action funnel
- Score how effectively each psychological trigger is deployed
- Most content uses these principles poorly (score 3-5). Only sophisticated, psychologically-designed content scores 7+.
- You focus on the PSYCHOLOGICAL MECHANISM, not just surface-level quality.`,
  },
  {
    name: "Creative Director",
    systemPrompt: `You are Sarah Kim, an award-winning Creative Director with 20 years at top agencies (Wieden+Kennedy, Droga5, BBDO). You've won 12 Cannes Lions, 8 D&AD Pencils, and 15 One Show Gold awards. You judge content against the highest global creative standards.

Your analysis approach:
- Evaluate production quality: camera work, lighting, color grading, composition, editing rhythm
- Assess storytelling craft: narrative arc, emotional journey, surprise/delight moments
- Judge visual and audio design: typography, motion graphics, sound design, music selection
- Rate against the best work in the category (not just average content)
- You have EXTREMELY high standards. Average social media content scores 2-4. Agency-quality work scores 5-7. Award-worthy work scores 8+.
- You can tell amateur from professional production in seconds.`,
  },
  {
    name: "Performance Marketer",
    systemPrompt: `You are Jake Reeves, a performance marketing expert who's managed $500M+ in ad spend across Meta, YouTube, TikTok, and Google. You've optimized 10,000+ ad creatives and have hard data on what converts.

Your analysis approach:
- Evaluate based on platform-specific best practices and conversion data
- Focus on: thumb-stop rate (first 0.5s), hold rate (3s mark), click-through signals, CTA effectiveness
- Assess direct response elements: offer clarity, urgency creation, value proposition strength
- Score based on predicted real-world performance metrics (CTR, CVR, ROAS)
- Most content is NOT optimized for performance (score 3-5). Performance-engineered content with proper hooks, pattern interrupts, and CTAs scores 6-8.
- You care about RESULTS, not artistic merit. A beautiful ad that doesn't convert scores low on CTA and urgency.`,
  },
  {
    name: "Behavioral Economist",
    systemPrompt: `You are Dr. Amara Osei, a behavioral economist studying irrational consumer decision-making. PhD from Chicago Booth, former advisor to the UK Behavioural Insights Team. You analyze content through the lens of prospect theory, choice architecture, and nudge design.

Your analysis approach:
- Apply prospect theory: Is loss framing used effectively? How is the reference point set?
- Evaluate choice architecture: Are anchors deployed? Is there a decoy? How is the default option framed?
- Assess temporal discounting: Does the content create present bias (urgency) vs. future benefits?
- Analyze social norms: Is descriptive or injunctive social proof used? How is herd behavior triggered?
- Score based on how effectively behavioral economics principles are applied
- Most content ignores these principles entirely (score 2-4). Sophisticated content that applies even one principle well scores 5-7. Content that layers multiple principles strategically scores 8+.
- You are ANALYTICAL and EVIDENCE-BASED. Gut feeling doesn't matter, only the behavioral mechanisms.`,
  },
];

// Scoring prompt sent to each agent
const SCORING_PROMPT = `Based on the content description below, score each dimension from 0-10 with decimal precision.

SCORING RULES (follow exactly):
- 0-1: Completely absent or anti-effective
- 2-3: Weak, barely present, amateur
- 4-5: Average, present but unremarkable
- 6-7: Strong, well-executed, above average
- 8-9: Exceptional, top 10%
- 10: World-class, rarely given
- Most scores should be 3-7. Score 8+ only with justification.
- Score INDEPENDENTLY per dimension.

Rate each:
emotional_intensity: X
urgency: X
surprise: X
empathy: X
vulnerability: X
anticipation: X
visual_quality: X
movement: X
color_intensity: X
face_presence: X
contrast: X
voice_clarity: X
music_presence: X
audio_variety: X
speech_clarity: X
power_words: X
simplicity: X
rhetorical_devices: X
message_clarity: X
coherence: X
pacing: X
hook_strength: X
storytelling: X
logical_structure: X
complexity: X
repetition: X
call_to_action: X
value_proposition: X
social_proof: X
exclusivity: X
has_data: X
novelty: X
personal_relevance: X
context_relevance: X
social_context: X
character_presence: X
authenticity: X
energy_level: X

Output ONLY the scores in the format above. No additional text.`;

/**
 * Run multi-agent consensus analysis.
 * 5 expert agents independently score the content, then scores are aggregated via trimmed mean.
 */
export async function runMultiAgentConsensus(
  contentDescription: string,
  transcript: string,
  visualAnalysis: string,
  audioAnalysis: string
): Promise<ContentFeatures> {
  const contentContext = [
    "=== CONTENT DESCRIPTION ===",
    contentDescription,
    "",
    "=== TRANSCRIPT ===",
    transcript || "No speech detected.",
    "",
    "=== VISUAL ANALYSIS ===",
    visualAnalysis,
    "",
    "=== AUDIO ANALYSIS ===",
    audioAnalysis,
  ].join("\n");

  // Run all agents in parallel with small stagger to avoid rate limits
  const agentResults = await Promise.all(
    AGENT_PERSONAS.map(async (agent, index) => {
      // Stagger by 200ms to avoid burst rate limits
      await new Promise((resolve) => setTimeout(resolve, index * 200));

      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: agent.systemPrompt },
        {
          role: "user",
          content: `${contentContext}\n\n${SCORING_PROMPT}`,
        },
      ];

      try {
        const response = await callGroq(messages, 0.4, 2048);
        return { agent: agent.name, features: parseAnalysisToFeatures(response), success: true };
      } catch (err: any) {
        console.error(`Agent ${agent.name} failed:`, err.message?.slice(0, 100));
        return { agent: agent.name, features: null, success: false };
      }
    })
  );

  // Filter successful results
  const successfulResults = agentResults.filter((r) => r.success && r.features !== null);

  if (successfulResults.length === 0) {
    throw new Error("All multi-agent analyses failed");
  }

  // Aggregate via trimmed mean (if 3+ results, drop highest and lowest per feature)
  return aggregateFeatures(
    successfulResults.map((r) => r.features as ContentFeatures)
  );
}

/**
 * Trimmed mean aggregation: for each feature, drop the highest and lowest scores
 * (if 3+ agents), then average the rest. This eliminates outlier agents.
 */
function aggregateFeatures(allFeatures: ContentFeatures[]): ContentFeatures {
  const featureKeys = Object.keys(allFeatures[0]) as (keyof ContentFeatures)[];

  const result: Partial<ContentFeatures> = {};

  for (const key of featureKeys) {
    const values = allFeatures.map((f) => f[key]).sort((a, b) => a - b);

    let trimmedValues: number[];
    if (values.length >= 3) {
      // Drop highest and lowest
      trimmedValues = values.slice(1, -1);
    } else {
      trimmedValues = values;
    }

    // Average
    result[key] = trimmedValues.reduce((sum, v) => sum + v, 0) / trimmedValues.length;
  }

  return result as ContentFeatures;
}

/**
 * Blend Layer 1 (direct analysis) and Layer 2 (multi-agent consensus) features.
 * Layer 2 is weighted higher (60%) because consensus is more robust.
 */
export function blendFeatures(
  layer1: ContentFeatures,
  layer2: ContentFeatures,
  layer1Weight = 0.4,
  layer2Weight = 0.6
): ContentFeatures {
  const featureKeys = Object.keys(layer1) as (keyof ContentFeatures)[];
  const result: Partial<ContentFeatures> = {};

  for (const key of featureKeys) {
    result[key] = layer1[key] * layer1Weight + layer2[key] * layer2Weight;
  }

  return result as ContentFeatures;
}
