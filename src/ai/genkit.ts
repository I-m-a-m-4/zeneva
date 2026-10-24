import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { groq as groqPlugin } from 'genkitx-groq';
import { getActiveAIProvider } from './provider';

let _instance: any = null;

const getAI = () => {
  if (!_instance) {
    const provider = getActiveAIProvider();
    const plugins: any[] = [];

    // Preserved Google GenAI plugin
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiKey) {
      plugins.push(googleAI({ apiKey: geminiKey }));
    }

    // Groq plugin
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      plugins.push(groqPlugin({ apiKey: groqKey }));
    }

    // Fallback if neither key is set yet to allow server startup without throw
    if (plugins.length === 0) {
      plugins.push(googleAI({ apiKey: 'unconfigured' }));
    }

    const defaultModel = provider === 'groq' && groqKey
      ? 'groq/openai/gpt-oss-120b'
      : 'googleai/gemini-3.6-flash';

    _instance = genkit({
      plugins,
      model: defaultModel,
      telemetry: {
        disable: true
      }
    } as any);
  }
  return _instance;
};

// High-durability factory functions to ensure 'this' binding and lazy-init safety
export const ai = {
  defineFlow: (...args: any[]) => getAI().defineFlow(...args),
  definePrompt: (...args: any[]) => getAI().definePrompt(...args),
  defineTool: (...args: any[]) => getAI().defineTool(...args),
  run: (...args: any[]) => getAI().run(...args),
} as any;
