import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/firebase/admin';
import { buildProductIndex, matchDraft } from '@/lib/import/match';
import { effectivePlan, AI_IMAGE_DAILY_LIMITS } from '@/lib/plan';
import type { Product } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface ExtractedItem {
  rawName: string;
  quantity: number;
  price?: number | null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    let authenticatedBusinessId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1]?.trim();
        if (token) {
          const decoded = await adminAuth.verifyIdToken(token);
          if (decoded?.businessId) {
            authenticatedBusinessId = decoded.businessId;
          }
        }
      } catch (e) {
        console.warn('[analyze-sheet] Token verification warning:', e);
      }
    }

    const body = await req.json();
    const { image, images, businessId: requestedBusinessId, prompt: customPrompt } = body;
    const businessId = authenticatedBusinessId || requestedBusinessId;

    // Collect images into array (supports multiple images or single fallback)
    let rawImages: string[] = [];
    if (Array.isArray(images) && images.length > 0) {
      rawImages = images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof image === 'string' && image.trim().length > 0) {
      rawImages = [image.trim()];
    }

    if (rawImages.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400, headers: corsHeaders });
    }

    // Daily image upload limit check
    const todayStr = new Date().toISOString().slice(0, 10);
    let plan = 'starter';
    let dailyLimit = AI_IMAGE_DAILY_LIMITS.starter;
    let usedToday = 0;

    if (businessId) {
      try {
        const bizSnap = await adminFirestore.collection('businessInstances').doc(businessId).get();
        if (bizSnap.exists) {
          const bizData = bizSnap.data();
          plan = effectivePlan(bizData);
          dailyLimit = AI_IMAGE_DAILY_LIMITS[plan as keyof typeof AI_IMAGE_DAILY_LIMITS] ?? 5;
          usedToday = bizData?.aiImageUsageDate === todayStr ? (Number(bizData?.aiImageUsageCount) || 0) : 0;
        }
      } catch (err) {
        console.warn('[analyze-sheet] Error fetching business quota:', err);
      }
    }

    const remainingToday = Math.max(0, dailyLimit - usedToday);
    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily image limit reached. Your plan allows ${dailyLimit} images per day (${usedToday} used today). ${
            plan === 'business'
              ? 'Your allowance resets tomorrow.'
              : 'Upgrade to Business for 15 image scans per day.'
          }`,
          code: 'daily_image_limit_exceeded',
          dailyLimit,
          usedToday,
          remainingToday: 0,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    if (rawImages.length > remainingToday) {
      return NextResponse.json(
        {
          error: `You can only upload ${remainingToday} more image${
            remainingToday === 1 ? '' : 's'
          } today (${dailyLimit}/day limit). You provided ${rawImages.length}.`,
          code: 'daily_image_limit_exceeded',
          dailyLimit,
          usedToday,
          remainingToday,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500, headers: corsHeaders });
    }

    // Format all image URLs
    const formattedUrls = rawImages.map((img) => {
      if (img.startsWith('data:') || img.startsWith('http')) return img;
      return `data:image/png;base64,${img}`;
    });

    const userInstruction = customPrompt?.trim()
      ? `SPECIFIC USER INSTRUCTION:\n"${customPrompt.trim()}"\n\n`
      : '';

    const isMultiple = formattedUrls.length > 1;
    const promptText = `You are Zen Vision, an expert retail inventory, handwriting OCR, and visual auditor.
${userInstruction}Analyze the ${isMultiple ? `${formattedUrls.length} images` : 'image'} carefully. They may contain inventory stock sheets, supplier invoices, waybills, handwritten stock counts, shelf photos, or price lists across one or multiple pages/views.

TASK:
Extract every product line or item mentioned/visible in accordance with the user's instructions across ALL provided images into a single consolidated list.
- If the same item appears across multiple pages/sheets, sum the total quantity.
- For each item, extract:
1. rawName: The exact product name/description as written on the paper/sheet or identified in the image.
2. quantity: Number of units, pieces, cartons, or bottles. If missing or unclear, default to 1.
3. price: The price or cost written alongside the item (numeric only, strip any currency symbols), or null if not written.

Return strictly a valid JSON object with NO markdown formatting, NO backticks, and NO extra text:
{
  "sheetTitle": "Inventory Stock Count",
  "items": [
    {
      "rawName": "viju milk drink",
      "quantity": 10,
      "price": 900
    }
  ]
}`;

    const imageContentParts = formattedUrls.map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));

    let parsedResult: { sheetTitle?: string; items?: ExtractedItem[] } | null = null;
    let modelUsed = 'Zen Vision';

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://zeneva.space',
          'X-Title': 'Zeneva POS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o',
          max_tokens: 3500,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                ...imageContentParts,
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[analyze-sheet] gpt-4o returned ${response.status}: ${errText}. Retrying with gpt-4o-mini...`);
        // Fallback to gpt-4o-mini
        modelUsed = 'openai/gpt-4o-mini';
        const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': 'https://zeneva.space',
            'X-Title': 'Zeneva POS',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            max_tokens: 3000,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  ...imageContentParts,
                ],
              },
            ],
          }),
        });

        if (!fallbackRes.ok) {
          const fbErr = await fallbackRes.text();
          throw new Error(`OpenRouter vision request failed: ${fbErr}`);
        }

        const data = await fallbackRes.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        parsedResult = JSON.parse(content);
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        parsedResult = JSON.parse(content);
      }
    } catch (e: any) {
      console.error('[analyze-sheet] Error calling OpenRouter:', e);
      return NextResponse.json(
        { error: e.message || 'Failed to extract items from image' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Atomically increment daily usage counter in Firestore
    const newUsed = usedToday + rawImages.length;
    if (businessId) {
      try {
        await adminFirestore.collection('businessInstances').doc(businessId).set(
          {
            aiImageUsageDate: todayStr,
            aiImageUsageCount: newUsed,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('[analyze-sheet] Error updating daily usage:', err);
      }
    }

    const rawItems = Array.isArray(parsedResult?.items) ? parsedResult!.items : [];
    if (rawItems.length === 0) {
      return NextResponse.json(
        {
          success: true,
          model: modelUsed,
          sheetTitle: parsedResult?.sheetTitle || 'Inventory Sheet',
          items: [],
          message: 'No readable items were detected in the image. Please try a clearer or closer photo.',
        },
        { headers: corsHeaders }
      );
    }

    // Now match the extracted items with the business catalog
    let catalogProducts: Product[] = [];
    if (businessId) {
      try {
        const snap = await adminFirestore
          .collection('products')
          .where('businessId', '==', businessId)
          .get();

        catalogProducts = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Product))
          .filter((p) => !p.deleted);
      } catch (err) {
        console.warn('[analyze-sheet] Error fetching products for matching:', err);
      }
    }

    const productMap = new Map<string, Product>(catalogProducts.map((p) => [p.id, p]));
    const productIndex = catalogProducts.length > 0 ? buildProductIndex(catalogProducts) : null;

    const analyzedItems = rawItems.map((item, idx) => {
      const cleanQty = Number(item.quantity) || 1;
      const cleanPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : null;

      let matchedProduct: any = null;
      let candidates: any[] = [];
      let matchConfidence = 0;
      let matchStatus: 'matched' | 'suggested' | 'unmatched' = 'unmatched';

      if (productIndex && item.rawName) {
        const verdict = matchDraft(
          {
            name: item.rawName,
            price: cleanPrice ?? 0,
            stock: cleanQty,
          },
          productIndex
        );

        if (verdict.kind === 'certain') {
          const p = productMap.get(verdict.match.productId);
          matchedProduct = {
            id: verdict.match.productId,
            name: verdict.match.productName,
            price: verdict.match.productPrice ?? p?.price ?? 0,
            stock: verdict.match.productStock ?? p?.stock ?? 0,
            sku: verdict.match.productSku || p?.sku || '',
            imageUrl: p?.imageUrl || '',
            costPrice: verdict.match.productCostPrice ?? p?.costPrice ?? null,
          };
          matchConfidence = verdict.match.score || 1;
          matchStatus = 'matched';
        } else if (verdict.kind === 'possible' && verdict.candidates.length > 0) {
          const top = verdict.candidates[0];
          const topP = productMap.get(top.productId);
          matchedProduct = {
            id: top.productId,
            name: top.productName,
            price: top.productPrice ?? topP?.price ?? 0,
            stock: top.productStock ?? topP?.stock ?? 0,
            sku: top.productSku || topP?.sku || '',
            imageUrl: topP?.imageUrl || '',
            costPrice: top.productCostPrice ?? topP?.costPrice ?? null,
          };
          matchConfidence = top.score || 0.7;
          matchStatus = 'suggested';
          candidates = verdict.candidates.slice(0, 4).map((c) => {
            const cP = productMap.get(c.productId);
            return {
              id: c.productId,
              name: c.productName,
              price: c.productPrice ?? cP?.price ?? 0,
              stock: c.productStock ?? cP?.stock ?? 0,
              score: c.score,
            };
          });
        }
      }

      return {
        id: `row-${idx + 1}-${Date.now()}`,
        rawName: item.rawName || `Item #${idx + 1}`,
        quantity: cleanQty,
        price: cleanPrice,
        matchedProduct,
        candidates,
        matchConfidence,
        matchStatus,
        mode: 'restock' as const, // default: add to stock (+)
      };
    });

    return NextResponse.json(
      {
        success: true,
        model: modelUsed,
        sheetTitle: parsedResult?.sheetTitle || 'Inventory Restock Sheet',
        items: analyzedItems,
        totalDetected: analyzedItems.length,
        imagesProcessed: rawImages.length,
        dailyLimitInfo: {
          dailyLimit,
          usedToday: newUsed,
          remainingToday: Math.max(0, dailyLimit - newUsed),
        },
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('[analyze-sheet] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while analyzing sheet' },
      { status: 500, headers: corsHeaders }
    );
  }
}
