export interface ExaSearchResult {
  id: string;
  url: string;
  title: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
}

export interface DiscoveredLead {
  id: string;
  title: string;
  url: string;
  domain: string;
  phone?: string;
  email?: string;
  address?: string;
  summary: string;
  highlights: string[];
  category: string;
  location: string;
  pitchAngle: string;
  whatsappMessage: string;
  emailDraft: {
    subject: string;
    body: string;
  };
  score: number;
}

export interface ExaSearchOptions {
  query: string;
  category?: string;
  location?: string;
  numResults?: number;
  persona?: string;
}

/**
 * Extracts Nigerian and international telephone numbers from unstructured text.
 */
function extractPhoneNumbers(text: string): string[] {
  const phones: Set<string> = new Set();
  
  // Match +234, 234, 080, 081, 090, 091, 070 followed by digits
  const nigerianRegex = /(?:\+?234|0)[789][01]\d{8}\b/g;
  let match: RegExpExecArray | null;
  while ((match = nigerianRegex.exec(text)) !== null) {
    let clean = match[0].replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '234' + clean.slice(1);
    }
    phones.add(clean);
  }

  // Match spaced or dashed numbers like 0814 604 9223 or +234 810 753 9353
  const spacedRegex = /(?:\+?234\s*|0)[789][01]\d(?:\s*|-)\d{3}(?:\s*|-)\d{4}/g;
  while ((match = spacedRegex.exec(text)) !== null) {
    let clean = match[0].replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '234' + clean.slice(1);
    }
    phones.add(clean);
  }

  return Array.from(phones);
}

/**
 * Extracts email addresses from text, filtering out common generic web assets.
 */
function extractEmails(text: string): string[] {
  const emails: Set<string> = new Set();
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  let match: RegExpExecArray | null;
  while ((match = emailRegex.exec(text)) !== null) {
    const email = match[0].toLowerCase();
    if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.includes('sentry') && !email.includes('example.com')) {
      emails.add(email);
    }
  }
  return Array.from(emails);
}

/**
 * Derives the clean domain from a URL.
 */
function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Synthesizes personalized outreach copy for a business based on its products and category.
 */
function generatePitchPlaybook(title: string, category: string, summary: string) {
  const bizName = title.split(/[-–|]/)[0].trim() || 'Retail Partner';

  let valueProp = "offline-first cashier checkout, live stock audit, and thermal receipt printing";
  if (category.toLowerCase().includes('electric') || category.toLowerCase().includes('gadget')) {
    valueProp = "tracking high-value SKU variants, warranty receipts, and preventing stock loss during multi-staff shifts";
  } else if (category.toLowerCase().includes('supermarket') || category.toLowerCase().includes('grocer')) {
    valueProp = "lightning-fast barcode scanning, offline cashier lanes that never freeze during network dips, and instant end-of-day sales reconciliation";
  } else if (category.toLowerCase().includes('pharmacy') || category.toLowerCase().includes('health')) {
    valueProp = "batch expiry alerts, supplier purchase tracking, and prescription debt ledgers";
  } else if (category.toLowerCase().includes('cosmetic') || category.toLowerCase().includes('skincare')) {
    valueProp = "customer purchase history, WhatsApp receipt dispatch, and multi-branch stock transfers";
  }

  const whatsappMessage = `Good day ${bizName}! 👋

I noticed your impressive retail setup and product catalog. 

We built Zeneva (zeneva.space) specifically for growing retail stores in Nigeria to eliminate checkout delays and inventory discrepancies. 

Unlike traditional cloud POS software that stops working when internet flickers, Zeneva runs 100% offline with instant thermal receipt printing, automated loss detection, and AI inventory stock-taking.

Would you be open to a quick 5-minute video walkthrough or a free trial for your cashier lanes this week?`;

  const emailSubject = `Quick question regarding checkout & inventory speed at ${bizName}`;
  const emailBody = `Hi ${bizName} Team,

I came across your retail operations and wanted to reach out.

High-volume storefronts often run into two major bottlenecks: cashiers getting delayed when network connection drops, and end-of-month stock discrepancies between physical shelves and recorded sales.

Zeneva POS & ERP solves this directly:
1. Ultra-fast offline cashier lanes that sync automatically when reconnected.
2. Direct connection to your ESC/POS thermal printers and barcode scanners.
3. Zen AI Visual Stock Take that lets you audit physical inventory shelves in minutes.
4. Loss prevention forensics that detect transaction anomalies before they impact net profit.

Stores running Zeneva have reduced cashier checkout times by over 60% while completely securing their daily cash drawer reconciliation.

You can explore our interactive demo at https://zeneva.space. Would you be open to a brief 5-minute chat to see how this fits your store?

Warm regards,
Zeneva Growth Team
support@zeneva.space | +234 800 ZENEVA`;

  return {
    pitchAngle: `High-fit prospect for ${valueProp}.`,
    whatsappMessage,
    emailDraft: {
      subject: emailSubject,
      body: emailBody,
    },
  };
}

/**
 * Executes a semantic lead discovery query against the Exa.ai Search API.
 */
export async function searchLeadsWithExa(options: ExaSearchOptions): Promise<DiscoveredLead[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY is not configured on the server. Please check your environment variables.');
  }

  const { query, category = 'General Retail', location = 'Nigeria', numResults = 10 } = options;

  // Enhance the query with intent hints for high-quality retail business leads
  const semanticQuery = `${query} retail shop store showroom wholesale branch location contact phone email address in ${location}`;

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: semanticQuery,
      type: 'neural',
      useAutoprompt: true,
      numResults: Math.min(Math.max(numResults, 3), 25),
      contents: {
        text: { maxCharacters: 1200 },
        highlights: true,
        summary: {
          query: 'retail business name, store locations, products sold, contact telephone numbers, email addresses, and branches',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Exa API Error]:', response.status, errorText);
    throw new Error(`Exa Search failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawResults: ExaSearchResult[] = data.results || [];

  return rawResults.map((item, idx) => {
    const combinedContent = `${item.title || ''} ${item.summary || ''} ${item.text || ''} ${(item.highlights || []).join(' ')}`;
    const phones = extractPhoneNumbers(combinedContent);
    const emails = extractEmails(combinedContent);
    const domain = getDomain(item.url);
    const summary = item.summary || item.text?.slice(0, 300) || 'Retail store discovered via semantic search.';
    const highlights = item.highlights || [];

    const playbook = generatePitchPlaybook(item.title, category, summary);

    // Score based on contact availability and content density
    let score = 70;
    if (phones.length > 0) score += 15;
    if (emails.length > 0) score += 10;
    if (highlights.length > 0) score += 5;

    return {
      id: item.id || `lead-${idx}-${Date.now()}`,
      title: item.title || domain,
      url: item.url,
      domain,
      phone: phones[0] || undefined,
      email: emails[0] || undefined,
      summary,
      highlights,
      category,
      location,
      pitchAngle: playbook.pitchAngle,
      whatsappMessage: playbook.whatsappMessage,
      emailDraft: playbook.emailDraft,
      score,
    };
  });
}

