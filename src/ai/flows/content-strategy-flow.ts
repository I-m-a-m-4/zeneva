'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ContentStrategyInputSchema = z.object({
  theme: z.string().describe('The core theme of the content (e.g., Offline POS, Employee theft, USD payouts).'),
  platform: z.string().describe('Target marketing platform: Medium, Substack, LinkedIn, Twitter.'),
  persona: z.string().describe('Target reader persona (e.g., Pharmacy owners, Boutique retailers).'),
  seedKnowledge: z.string().optional().describe('Optional custom context or stories to inject.'),
});

const SectionOutlineSchema = z.object({
  heading: z.string().describe('The section heading or title.'),
  talkingPoints: z.array(z.string()).describe('Core talking points, stats, or arguments to cover in this section.'),
});

const ContentStrategyOutputSchema = z.object({
  title: z.string().describe('Recommended title, headline, or hook for the post.'),
  seoKeywords: z.array(z.string()).describe('Target SEO keywords to optimize for.'),
  introduction: z.string().describe('A compelling introduction and hook paragraph (at least 4-5 sentences).'),
  outline: z.array(SectionOutlineSchema).describe('Step-by-step section outline for the article.'),
  ctaText: z.string().describe('Recommended Call-to-Action text incorporating zeneva.space links.'),
  backlinkOpportunities: z.array(z.string()).describe('Recommended context or anchors for inserting backlinks.'),
  marketingPitch: z.string().describe('Strategic explanation of why this piece will resonate and convert readers.'),
});

export type ContentStrategyInput = z.infer<typeof ContentStrategyInputSchema>;
export type ContentStrategyOutput = z.infer<typeof ContentStrategyOutputSchema>;

export async function generateContentPlan(input: ContentStrategyInput): Promise<ContentStrategyOutput> {
  try {
    const result = await contentStrategyFlow(input);
    return result;
  } catch (error: any) {
    console.error("Content Strategy AI Flow failed:", error);
    throw new Error("Zen AI Content Director is busy or encountered an error. Please try again.");
  }
}

const prompt = ai.definePrompt({
  name: 'contentStrategyPrompt',
  input: { schema: ContentStrategyInputSchema },
  output: { schema: ContentStrategyOutputSchema },
  prompt: `You are Zen AI, a world-class growth marketing director and B2B SaaS strategist for Zeneva. Zeneva is an offline-first, borderless retail operating system for modern merchants (mini-marts, supermarkets, boutiques, pharmacies) in Nigeria and globally.

Your task is to take the provided theme, platform, persona, and custom seed knowledge, and generate a high-impact B2B marketing content blueprint.

**CONTEXT ABOUT ZENEVA:**
- **Core Value Proposition**: Unifies inventory management, multi-store POS, analytics, and local/global payments (USD and NGN) into one platform.
- **Killer Feature**: Hyper-Sync Offline POS. Works fully offline on desktop/mobile during blackouts, syncing automatically once internet returns.
- **Target Audience**: Retailers, boutique owners, pharmacy managers, and supermarket owners in emerging markets (primarily Nigeria/Lekki/Ikeja/Lagos) looking to prevent inventory theft, track expiry dates, manage multi-currency billing, and accept global payments.
- **Grants Feature**: A Business Grants Directory is built directly into Zeneva to help retailers discover equity-free funding opportunities.

**INPUTS:**
- **Core Theme**: {{theme}}
- **Platform**: {{platform}}
- **Target Persona**: {{persona}}
- **Additional Seed Context**: {{seedKnowledge}}

**OUTPUT INSTRUCTIONS:**
Generate a JSON response matching the output schema. Ensure the content plan is detailed, deeply practical, and tailored to the target platform (e.g., shorter and hook-heavy for LinkedIn; longer and keyword-rich for Medium/Substack). All CTA recommendations must guide the reader back to zeneva.space.`,
});

const contentStrategyFlow = ai.defineFlow(
  {
    name: 'contentStrategyFlow',
    inputSchema: ContentStrategyInputSchema,
    outputSchema: ContentStrategyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
