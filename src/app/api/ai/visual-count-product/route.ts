import { NextResponse } from 'next/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getVisionModel, isAIConfigured, getActiveAIProvider } from '@/ai/provider';
import { generateObject } from 'ai';
import { z } from 'zod';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function fail(status: number, error: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, productName, productImage } = body;

    if (!image || !productName) {
      return fail(400, "Missing image or productName");
    }

    if (!isAIConfigured()) {
      const provider = getActiveAIProvider();
      return fail(500, `AI is not configured (missing ${provider === 'groq' ? 'GROQ_API_KEY' : 'GOOGLE_GENERATIVE_AI_API_KEY'})`);
    }

    // Preserved Gemini direct instance:
    // const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
    const model = getVisionModel();

    const contentItems: any[] = [
      {
        type: 'text',
        text: `You are an expert computer vision inventory counter. Look at the provided photo to accurately count how many units of the product "${productName}" are present.` +
              (productImage ? ` I have also provided a reference image of the product to help you identify it.` : ``) +
              `\nGroup similar items that match this product and ignore background fixtures, price tags, or unrelated items. If items are stacked or in rows, count all visible individual units.`
      }
    ];

    if (productImage) {
      try {
        const isDataUrl = productImage.startsWith('data:');
        contentItems.push({
          type: 'text',
          text: 'Reference image of the product:'
        });
        contentItems.push({
          type: 'image',
          image: isDataUrl ? productImage.replace(/^data:image\/\w+;base64,/, '') : new URL(productImage.startsWith('http') ? productImage : `https://zeneva.space${productImage}`)
        });
      } catch (e) {
        console.error("Failed to attach reference image", e);
      }
    }

    contentItems.push({
      type: 'text',
      text: 'Photo to count items from:'
    });
    contentItems.push({
      type: 'image',
      image: image.replace(/^data:image\/\w+;base64,/, '')
    });

    const { object } = await generateObject({
      // Uses Groq vision (llama-3.2-11b-vision-preview) by default, preserving google('gemini-1.5-flash-latest')
      model,
      schema: z.object({
        count: z.number().int().nonnegative().describe("The exact number of units of this specific product visible in the image"),
        confidence: z.number().min(0).max(100).describe("Confidence score of this count (0 to 100)"),
        explanation: z.string().describe("Short 1-sentence note explaining what was counted or any obscured/stacked items"),
        boxes: z.array(z.object({
          x: z.number().min(0).max(1).describe("Left edge 0 to 1"),
          y: z.number().min(0).max(1).describe("Top edge 0 to 1"),
          width: z.number().min(0).max(1).describe("Width 0 to 1"),
          height: z.number().min(0).max(1).describe("Height 0 to 1")
        })).optional().describe("Optional approximate bounding boxes for detected units")
      }),
      messages: [
        {
          role: 'user',
          content: contentItems,
        },
      ],
    });

    return NextResponse.json({ result: object }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in product visual count:", error);
    return fail(500, error.message || "Failed to count product visually");
  }
}
