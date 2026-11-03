import { DiscoveredLead, ExaSearchOptions } from './exa-client';

const DEFAULT_TAVILY_KEY = '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';

function extractPhoneNumbers(text: string): string[] {
  const phones: Set<string> = new Set();
  const nigerianRegex = /(?:\+?234|0)[789][01]\d{8}\b/g;
  let match: RegExpExecArray | null;
  while ((match = nigerianRegex.exec(text)) !== null) {
    let clean = match[0].replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '234' + clean.slice(1);
    phones.add(clean);
  }

  const spacedRegex = /(?:\+?234\s*|0)[789][01]\d(?:\s*|-)\d{3}(?:\s*|-)\d{4}/g;
  while ((match = spacedRegex.exec(text)) !== null) {
    let clean = match[0].replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '234' + clean.slice(1);
    phones.add(clean);
  }

  return Array.from(phones);
}

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

function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

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

I noticed your retail presence and products.

We built Zeneva (zeneva.space) specifically for growing retail stores in Nigeria to eliminate checkout delays and inventory discrepancies.

Unlike traditional cloud POS software that stops working when the internet flickers, Zeneva runs 100% offline with instant thermal receipt printing, automated cashier loss detection, and AI inventory stock-taking.

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

export async function searchLeadsWithTavily(options: ExaSearchOptions): Promise<DiscoveredLead[]> {
  const apiKey = process.env.TAVILY_API_KEY || DEFAULT_TAVILY_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured on the server.');
  }

  const { query, category = 'General Retail', location = 'Nigeria', numResults = 10 } = options;
  const targetedQuery = `${query} retail store shop contact phone email address in ${location}`;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: targetedQuery,
      search_depth: 'advanced',
      include_answer: true,
      max_results: Math.min(Math.max(numResults, 3), 25),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Tavily API Error]:', response.status, errorText);
    throw new Error(`Tavily Search failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawResults: any[] = data.results || [];

  return rawResults.map((item, idx) => {
    const combinedContent = `${item.title || ''} ${item.content || ''} ${data.answer || ''}`;
    const phones = extractPhoneNumbers(combinedContent);
    const emails = extractEmails(combinedContent);
    const domain = getDomain(item.url);
    const summary = item.content || data.answer || 'Retail store discovered via Tavily deep search.';
    const highlights = [summary.slice(0, 140)];

    const playbook = generatePitchPlaybook(item.title, category, summary);

    let score = 70;
    if (phones.length > 0) score += 15;
    if (emails.length > 0) score += 10;
    if (item.score && typeof item.score === 'number') score += Math.round(item.score * 5);

    return {
      id: `tavily-${idx}-${Date.now()}`,
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
      source: 'tavily',
    } as DiscoveredLead & { source?: string };
  });
}

