import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Instantiates a Google Generative AI provider dynamically, rotating between
 * the primary key, fallback key, and standard Google AI env keys to maximize
 * quota thresholds and avoid rate limits.
 */
export function getGoogleModel(modelName: string = 'gemini-2.5-flash') {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error('No Gemini API Key configured in server environment.');
  }

  // Load balance requests randomly between configured keys
  const apiKey = keys[Math.floor(Math.random() * keys.length)];
  const provider = createGoogleGenerativeAI({ apiKey });
  return provider(modelName);
}
