/**
 * Centralized AI Provider Wrapper for Zeneva
 * 
 * Supports both Groq AI (default for fast, cost-effective inference) and
 * Google Gemini (fully preserved for optional switching or fallback).
 * 
 * Switch between providers at any time using the `AI_PROVIDER` environment variable:
 * - `AI_PROVIDER=groq` (default when GROQ_API_KEY is present)
 * - `AI_PROVIDER=gemini` (restores Google Gemini)
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';

export type AIProvider = 'groq' | 'gemini';

export const AI_CONFIG = {
  groq: {
    name: 'Groq',
    defaultChatModel: 'openai/gpt-oss-120b',
    defaultVisionModel: 'openai/gpt-oss-20b',
    pricingUrl: 'https://groq.com/pricing',
  },
  gemini: {
    name: 'Google Gemini',
    defaultChatModel: 'gemini-3.6-flash',
    defaultVisionModel: 'gemini-1.5-flash-latest',
    pricingUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
  },
} as const;

/**
 * Determine the active AI provider.
 * Priority:
 * 1. AI_PROVIDER env var ('groq' | 'gemini')
 * 2. If GROQ_API_KEY is present, defaults to 'groq'
 * 3. Fallback: if GEMINI_API_KEY is present and GROQ_API_KEY is not, uses 'gemini'
 * 4. Default: 'groq'
 */
export function getActiveAIProvider(): AIProvider {
  const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (envProvider === 'gemini') return 'gemini';
  if (envProvider === 'groq') return 'groq';

  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '') {
    return 'groq';
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // If only Gemini key is currently set and no explicit Groq key, fallback to Gemini
    return 'gemini';
  }

  // Default to groq
  return 'groq';
}

/**
 * Preserved Google Generative AI instance
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

/**
 * Groq Provider instance
 */
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

/**
 * Return the active chat model (for streaming chat, structured output, and tools).
 */
export function getChatModel(): any {
  const provider = getActiveAIProvider();
  if (provider === 'gemini') {
    const modelName = process.env.GEMINI_MODEL || AI_CONFIG.gemini.defaultChatModel;
    return google(modelName) as any;
  }
  const modelName = process.env.GROQ_MODEL || AI_CONFIG.groq.defaultChatModel;
  return groq(modelName) as any;
}

/**
 * Return the active vision model (for image counting, shelf audits).
 */
export function getVisionModel(): any {
  const provider = getActiveAIProvider();
  if (provider === 'gemini') {
    const modelName = process.env.GEMINI_VISION_MODEL || AI_CONFIG.gemini.defaultVisionModel;
    return google(modelName) as any;
  }
  const modelName = process.env.GROQ_VISION_MODEL || AI_CONFIG.groq.defaultVisionModel;
  return groq(modelName) as any;
}

/**
 * Checks if the active provider has an API key configured.
 */
export function isAIConfigured(): boolean {
  const provider = getActiveAIProvider();
  if (provider === 'groq') {
    return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '');
  }
  return Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') ||
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.trim() !== '')
  );
}

/**
 * Get the API key for the active provider.
 */
export function getActiveApiKey(): string | undefined {
  const provider = getActiveAIProvider();
  if (provider === 'groq') {
    return process.env.GROQ_API_KEY;
  }
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/**
 * Helper to get active model name (for logging / metadata).
 */
export function getActiveModelName(): string {
  const provider = getActiveAIProvider();
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || AI_CONFIG.gemini.defaultChatModel;
  }
  return process.env.GROQ_MODEL || AI_CONFIG.groq.defaultChatModel;
}
