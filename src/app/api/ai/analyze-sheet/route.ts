import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/firebase/admin';
import { buildProductIndex, matchDraft } from '@/lib/import/match';
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
    const { image, businessId: requestedBusinessId } = body;
    const businessId = authenticatedBusinessId || requestedBusinessId;

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400, headers: corsHeaders });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500, headers: corsHeaders });
    }

    // Prepare image data URL
    let imageUrl = image;
    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
      imageUrl = `data:image/png;base64,${image}`;
    }

    // Call OpenRouter with openai/gpt-4o (with fallback to openai/gpt-4o-mini)
    const promptText = `You are an expert AI retail inventory and handwriting OCR auditor.
Analyze this image carefully. It contains an inventory stock sheet, supplier invoice, waybill, handwritten stock count, or price list.

TASK:
Extract every product line visible. For each line, extract:
1. rawName: The exact product name/description as written on the paper/sheet.
2. quantity: Number of units, pieces, cartons, or bottles. If missing, default to 1.
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

    let parsedResult: { sheetTitle?: string; items?: ExtractedItem[] } | null = null;
    let modelUsed = 'openai/gpt-4o';

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
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: promptText },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
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
            max_tokens: 2500,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  {
                    type: 'image_url',
                    image_url: { url: imageUrl },
                  },
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
          matchedProduct = {
            id: verdict.match.product.id,
            name: verdict.match.product.name,
            price: verdict.match.product.price,
            stock: verdict.match.product.stock ?? 0,
            sku: verdict.match.product.sku || '',
            imageUrl: verdict.match.product.imageUrl || '',
            costPrice: verdict.match.product.costPrice ?? null,
          };
          matchConfidence = verdict.match.score || 1;
          matchStatus = 'matched';
        } else if (verdict.kind === 'possible' && verdict.candidates.length > 0) {
          const top = verdict.candidates[0];
          matchedProduct = {
            id: top.product.id,
            name: top.product.name,
            price: top.product.price,
            stock: top.product.stock ?? 0,
            sku: top.product.sku || '',
            imageUrl: top.product.imageUrl || '',
            costPrice: top.product.costPrice ?? null,
          };
          matchConfidence = top.score || 0.7;
          matchStatus = 'suggested';
          candidates = verdict.candidates.slice(0, 4).map((c) => ({
            id: c.product.id,
            name: c.product.name,
            price: c.product.price,
            stock: c.product.stock ?? 0,
            score: c.score,
          }));
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
