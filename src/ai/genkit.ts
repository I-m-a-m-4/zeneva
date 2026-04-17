import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

let instance: any = null;

export const getAI = () => {
  if (!instance) {
    instance = genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-1.5-flash',
    });
  }
  return instance;
};

// Legacy export for compatibility, but now uses the lazy internal instance
export const ai = new Proxy({} as any, {
  get: (_, prop) => {
    const aiInstance = getAI();
    return (aiInstance as any)[prop];
  }
});

