
'use server';

/**
 * @fileOverview Universal Stealth Gateway for AI Server Actions.
 * Uses dynamic evaluation to completely hide AI flows from the Next.js build-time scanner.
 * This is the only way to bypass the 'aj' ReferenceError in Next.js 15.
 */

async function stealthImport(path: string) {
  // We use a dynamic string to prevent Webpack from tracing this import
  try {
    const module = await import(/* webpackIgnore: true */ path);
    return module;
  } catch (e) {
    // Fallback if webpackIgnore isn't enough - use a more radical dynamic approach
    // This looks like a regular import to TS but is hidden from the Next.js tracer via variable indirection
    const flowModule = await import(`${path}`);
    return flowModule;
  }
}

export async function runBusinessAnalysis(input: any) {
  const { businessAnalysis } = await stealthImport('@/ai/flows/business-analysis-flow');
  return businessAnalysis(input);
}

export async function runCustomerInsights(input: any) {
  const { getCustomerInsights } = await stealthImport('@/ai/flows/customer-insights-flow');
  return getCustomerInsights(input);
}

export async function runProductTroubleshoot(input: any) {
  const { productTroubleshoot } = await stealthImport('@/ai/flows/product-troubleshoot-flow');
  return productTroubleshoot(input);
}

export async function runSupportChat(input: any) {
  const { zenevaSupportChat } = await stealthImport('@/ai/flows/support-chat-flow');
  return zenevaSupportChat(input);
}

export async function runVisualCount(input: any) {
  const { visualCount } = await stealthImport('@/ai/flows/visual-count-flow');
  return visualCount(input);
}
