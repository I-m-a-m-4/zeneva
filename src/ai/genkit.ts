import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

let _instance: any = null;

const getAI = () => {
  if (!_instance) {
    _instance = genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-1.5-flash',
      telemetry: {
        disable: true
      }
    });
  }
  return _instance;
};

// Use a property-based export to avoid TDZ issues in minified code
export const ai = {} as any;

Object.defineProperty(ai, 'defineFlow', {
  get: () => getAI().defineFlow,
  enumerable: true
});

Object.defineProperty(ai, 'definePrompt', {
  get: () => getAI().definePrompt,
  enumerable: true
});

Object.defineProperty(ai, 'run', {
  get: () => getAI().run,
  enumerable: true
});


