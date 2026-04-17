
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
    // indirection to hide from tracer
    const flowModule = await import(`${path}`);
    return flowModule;
  }
}

export async function runBusinessAnalysis(input: any) {
  const { businessAnalysis } = await stealthImport('@/_ai/flows/business-analysis-flow');
  return businessAnalysis(input);
}

export async function runCustomerInsights(input: any) {
  const { getCustomerInsights } = await stealthImport('@/_ai/flows/customer-insights-flow');
  return getCustomerInsights(input);
}

export async function runProductTroubleshoot(input: any) {
  const { productTroubleshoot } = await stealthImport('@/_ai/flows/product-troubleshoot-flow');
  return productTroubleshoot(input);
}

export async function runSupportChat(input: any) {
  const { zenevaSupportChat } = await stealthImport('@/_ai/flows/support-chat-flow');
  return zenevaSupportChat(input);
}

export async function runVisualCount(input: any) {
  const { visualCount } = await stealthImport('@/_ai/flows/visual-count-flow');
  return visualCount(input);
}
