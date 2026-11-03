import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/actions/admin-guard';
import { searchLeadsWithExa, DiscoveredLead } from '@/lib/server/exa-client';
import { searchLeadsWithTavily } from '@/lib/server/tavily-client';
import { enrichLeadWithProspeo } from '@/lib/server/prospeo-client';

export const dynamic = 'force-dynamic';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function extractToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) return tokenParam.trim();
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    try {
      await requireSuperAdmin(token);
    } catch (authErr: any) {
      return NextResponse.json(
        { ok: false, error: authErr.message || 'Unauthorized access. Super admin required.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { 
      query, 
      category = 'General Retail', 
      location = 'Nigeria', 
      numResults = 10, 
      persona,
      provider = 'hybrid', // 'tavily' | 'exa' | 'hybrid'
      autoWaterfall = false,
    } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { ok: false, error: 'A search query is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const searchOptions = {
      query: query.trim(),
      category,
      location,
      numResults: Number(numResults) || 10,
      persona,
    };

    let leads: DiscoveredLead[] = [];
    let activeProvider = provider;

    if (provider === 'tavily') {
      leads = await searchLeadsWithTavily(searchOptions);
    } else if (provider === 'exa') {
      try {
        leads = await searchLeadsWithExa(searchOptions);
      } catch (exaErr) {
        console.warn('[Leads Search] Exa failed or unconfigured, falling back to Tavily:', exaErr);
        leads = await searchLeadsWithTavily(searchOptions);
        activeProvider = 'tavily (fallback)';
      }
    } else {
      // Hybrid mode: Run Tavily and Exa in parallel, merge and deduplicate
      const [tavilyResult, exaResult] = await Promise.allSettled([
        searchLeadsWithTavily(searchOptions),
        searchLeadsWithExa(searchOptions),
      ]);

      const mergedMap = new Map<string, DiscoveredLead>();

      if (tavilyResult.status === 'fulfilled' && Array.isArray(tavilyResult.value)) {
        tavilyResult.value.forEach(l => {
          const key = (l.domain || l.title).toLowerCase().trim();
          mergedMap.set(key, l);
        });
      }

      if (exaResult.status === 'fulfilled' && Array.isArray(exaResult.value)) {
        exaResult.value.forEach(l => {
          const key = (l.domain || l.title).toLowerCase().trim();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, l);
          } else {
            // Merge contact details if missing
            const existing = mergedMap.get(key)!;
            if (!existing.phone && l.phone) existing.phone = l.phone;
            if (!existing.email && l.email) existing.email = l.email;
            if (l.highlights?.length) existing.highlights = Array.from(new Set([...existing.highlights, ...l.highlights]));
          }
        });
      }

      leads = Array.from(mergedMap.values());
      activeProvider = 'hybrid (Tavily + Exa)';
    }

    // Auto Waterfall Enrichment with Prospeo if requested
    if (autoWaterfall && leads.length > 0) {
      const topLeadsToEnrich = leads.slice(0, 5); // Enrich first 5 immediately
      await Promise.all(
        topLeadsToEnrich.map(async (lead) => {
          if (!lead.email && lead.domain) {
            try {
              const enriched = await enrichLeadWithProspeo({
                domain: lead.domain,
                companyName: lead.title,
              });
              if (enriched.email) {
                lead.email = enriched.email;
                (lead as any).emailStatus = enriched.emailStatus;
                (lead as any).decisionMaker = enriched.fullName;
                (lead as any).jobTitle = enriched.jobTitle;
                if (!lead.phone && enriched.phone) lead.phone = enriched.phone;
                lead.score += 15;
              }
            } catch (_) {}
          }
        })
      );
    }

    return NextResponse.json(
      {
        ok: true,
        leads,
        count: leads.length,
        provider: activeProvider,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('[api/admin/leads/search] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to search leads.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
