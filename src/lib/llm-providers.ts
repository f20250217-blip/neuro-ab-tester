import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// --- Provider Clients ---

function createGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1",
  });
}

function createCerebrasClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY || "",
    baseURL: "https://api.cerebras.ai/v1",
  });
}

// --- Model Definitions ---

const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_TEXT_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen-qwq-32b",
  "llama-3.3-70b-versatile",
];

const CEREBRAS_TEXT_MODELS = [
  "llama-3.3-70b",
];

// --- Fallback Call Logic ---

export interface LLMCallOptions {
  messages: ChatCompletionMessageParam[];
  requiresVision: boolean;
  temperature?: number;
  maxTokens?: number;
}

async function tryModel(
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty response from ${model}`);
  return content;
}

function stripVisionContent(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    if (msg.role === "user" && Array.isArray(msg.content)) {
      const textParts = msg.content.filter(
        (part: any) => part.type === "text"
      );
      return {
        ...msg,
        content: textParts.length > 0 ? textParts : [{ type: "text" as const, text: "(Visual content not available for text-only model)" }],
      };
    }
    return msg;
  }) as ChatCompletionMessageParam[];
}

export async function callWithFallback(opts: LLMCallOptions): Promise<string> {
  const { messages, requiresVision, temperature = 0.3, maxTokens = 4096 } = opts;
  const errors: string[] = [];

  // Tier 1: Groq
  const groq = createGroqClient();
  if (requiresVision) {
    // Vision model first
    try {
      return await tryModel(groq, GROQ_VISION_MODEL, messages, temperature, maxTokens);
    } catch (err: any) {
      errors.push(`Groq vision (${GROQ_VISION_MODEL}): ${err.message?.slice(0, 100)}`);
      if (!err.message?.includes("429") && !err.message?.includes("rate") && !err.message?.includes("quota")) {
        // Non-rate-limit error with vision — try text fallback
      }
    }
  }

  // Groq text models
  const textMessages = requiresVision ? stripVisionContent(messages) : messages;
  for (const model of GROQ_TEXT_MODELS) {
    try {
      return await tryModel(groq, model, textMessages, temperature, maxTokens);
    } catch (err: any) {
      errors.push(`Groq text (${model}): ${err.message?.slice(0, 100)}`);
      if (!err.message?.includes("429") && !err.message?.includes("rate") && !err.message?.includes("quota")) {
        continue; // Try next model on any error
      }
    }
  }

  // Tier 2: Cerebras (text-only)
  const cerebras = createCerebrasClient();
  for (const model of CEREBRAS_TEXT_MODELS) {
    try {
      return await tryModel(cerebras, model, textMessages, temperature, maxTokens);
    } catch (err: any) {
      errors.push(`Cerebras (${model}): ${err.message?.slice(0, 100)}`);
    }
  }

  throw new Error(
    `All LLM providers failed.\n${errors.join("\n")}\nPlease check your API keys and try again.`
  );
}

// For multi-agent: call a specific provider quickly, no full fallback chain
export async function callGroq(
  messages: ChatCompletionMessageParam[],
  temperature = 0.4,
  maxTokens = 4096
): Promise<string> {
  const groq = createGroqClient();
  // Try text models in order
  for (const model of GROQ_TEXT_MODELS) {
    try {
      return await tryModel(groq, model, messages, temperature, maxTokens);
    } catch (err: any) {
      if (!err.message?.includes("429") && !err.message?.includes("rate")) {
        throw err;
      }
    }
  }
  // Fall back to Cerebras
  const cerebras = createCerebrasClient();
  return await tryModel(cerebras, CEREBRAS_TEXT_MODELS[0], messages, temperature, maxTokens);
}
