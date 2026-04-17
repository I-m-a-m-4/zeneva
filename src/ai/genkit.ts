
let instance: any = null;

export const getAI = async () => {
  if (!instance) {
    const { genkit } = await import('genkit');
    const { googleAI } = await import('@genkit-ai/google-genai');
    
    instance = genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-1.5-flash',
    });
  }
  return instance;
};

// Legacy export proxy now await-wraps internally
export const ai = new Proxy({} as any, {
  get: (_, prop) => {
    return async (...args: any[]) => {
      const aiInstance = await getAI();
      return (aiInstance as any)[prop](...args);
    };
  }
});


