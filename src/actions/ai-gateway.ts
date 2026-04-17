
'use server';

/**
 * @fileOverview Universal gateway for AI Server Actions.
 * This file acts as a protective shield, dynamically importing AI flows
 * only at runtime to prevent Next.js from evaluating Genkit during the build.
 */

export async function runBusinessAnalysis(input: any) {
  const { businessAnalysis } = await import('@/ai/flows/business-analysis-flow');
  return businessAnalysis(input);
}

export async function runCustomerInsights(input: any) {
  const { getCustomerInsights } = await import('@/ai/flows/customer-insights-flow');
  return getCustomerInsights(input);
}

export async function runProductTroubleshoot(input: any) {
  const { productTroubleshoot } = await import('@/ai/flows/product-troubleshoot-flow');
  return productTroubleshoot(input);
}

export async function runSupportChat(input: any) {
  const { zenevaSupportChat } = await import('@/ai/flows/support-chat-flow');
  return zenevaSupportChat(input);
}

export async function runVisualCount(input: any) {
  const { visualCount } = await import('@/ai/flows/visual-count-flow');
  return visualCount(input);
}
