/**
 * Zeneva campaign email design system.
 *
 * One renderer plus one draft per behavioural segment. Kept pure (no Firestore,
 * no React, no `window`) so the admin console can preview the exact bytes that
 * `sendEmail` will hand to Resend — a preview rendered by different code is a
 * preview that lies.
 *
 * ## Why the markup looks like 2004
 *
 * Mail clients are not browsers. Everything here is deliberate:
 *
 * - **Tables, not flex or grid.** Outlook renders through Word's HTML engine,
 *   which has no support for either.
 * - **Inline styles only.** Gmail strips `<style>` blocks in several contexts,
 *   including forwarded mail, so anything that matters has to sit on the element.
 * - **No `<img>` for the logo.** `AppConfig.logoUrl` is a base64 SVG, and Gmail
 *   blocks both `data:` URIs and SVG outright — the brand would simply be a
 *   broken-image icon. The wordmark is therefore live text and the brand bar is
 *   a background colour, which is also why they survive image-blocking, the
 *   default state for a first-time sender.
 * - **`color-scheme: light` + explicit `bgcolor`.** Left to itself, iOS Mail and
 *   Outlook dark mode invert light backgrounds and drag Zeneva's orange toward
 *   brown. Declaring the scheme opts out of the automatic inversion, and the
 *   attribute form of the background is what Outlook actually honours.
 * - **A bulletproof button** — a table cell with a background colour, not a
 *   styled `<a>` — because Outlook ignores padding on inline elements and would
 *   otherwise render a bare blue link.
 *
 * ## Tokens
 *
 * Draft copy is written with `{{token}}` placeholders and filled per recipient at
 * send time, so one campaign personalises every message from that recipient's own
 * behaviour. `%%UNSUBSCRIBE_URL%%` is different: it is filled by `sendEmail`,
 * which is the only place the tracking id exists. See `src/lib/server/resend.ts`.
 */

import {
  FAMILY_META,
  humanUsage,
  type BehaviorProfile,
  type BehaviorSegment,
} from '@/lib/behavior-segments';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://zeneva.space').replace(/\/+$/, '');

/** The signature every campaign goes out under. */
export const CAMPAIGN_FROM = 'Imam Shaffy <hello@zeneva.space>';
export const CAMPAIGN_REPLY_TO = 'hello@zeneva.space';

/**
 * Substituted by `sendEmail` once the tracking id exists.
 *
 * Deliberately not `{{...}}`: recipient tokens are filled on the client from data
 * the client has, and this one cannot be. Two different syntaxes make it
 * impossible to confuse the two passes.
 */
export const UNSUBSCRIBE_TOKEN = '%%UNSUBSCRIBE_URL%%';

/* ------------------------------------------------------------------ *
 * Escaping and the small markdown subset
 * ------------------------------------------------------------------ */

/**
 * HTML-escape a value.
 *
 * Names and business names come from self-registered `users` and
 * `businessInstances` documents — fields an account sets for itself. Unescaped, a
 * name like `<img src=x onerror=…>` goes out as live markup *and* is archived in
 * `follow_up_logs`, where the admin audit dialog renders it back on the
 * super-admin origin. Escaping at the source keeps the stored record clean too,
 * not just the outgoing mail.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape a URL for an `href`, refusing anything that is not http(s) or mailto. */
function safeUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return escapeHtml(trimmed);
  if (trimmed.startsWith('/')) return escapeHtml(`${BASE_URL}${trimmed}`);
  // `javascript:` and friends land here and become a harmless link home.
  return escapeHtml(BASE_URL);
}

/**
 * Render operator-authored plain text as email-safe HTML.
 *
 * The compose screen edits prose, not markup — handing an operator raw HTML is
 * how malformed campaigns get sent. A deliberately tiny markdown subset covers
 * what the copy actually needs: `**bold**` and `[label](url)`. Escaping runs
 * *first*, so the subset is applied to already-inert text and cannot be used to
 * smuggle a tag through.
 */
function renderProse(text: string, linkColor = '#c2410c'): string {
  const paragraphs = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  return paragraphs
    .map(paragraph => {
      const inline = escapeHtml(paragraph)
        .replace(/\n/g, '<br />')
        .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#18181b;font-weight:700;">$1</strong>')
        // The label is already escaped; the url is re-checked by safeUrl. Both
        // halves are matched narrowly so a stray bracket cannot open a tag.
        .replace(
          /\[([^\]]+)\]\(([^)\s]+)\)/g,
          (_m, label: string, url: string) =>
            `<a href="${safeUrl(url)}" style="color:${linkColor};font-weight:600;text-decoration:underline;">${label}</a>`,
        );
      return `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#3f3f46;">${inline}</p>`;
    })
    .join('');
}

/* ------------------------------------------------------------------ *
 * Merge tokens
 * ------------------------------------------------------------------ */

export type MergeTokens = Record<string, string>;

/**
 * Every token a draft may reference, resolved for one recipient.
 *
 * Values are raw here and escaped at render time — escaping twice would show
 * `&amp;amp;` in a business name containing an ampersand.
 *
 * Each token has a fallback that still reads as a sentence, because the operator
 * can put any token in any draft. `{{topFeature}}` in a template shown to a user
 * with no feature history must degrade to something sendable, never to a visible
 * `{{topFeature}}`.
 */
export function mergeTokensFor(profile: BehaviorProfile): MergeTokens {
  const top = profile.topFeature ? FAMILY_META[profile.topFeature] : null;
  const unused = profile.unusedHighValue[0] ? FAMILY_META[profile.unusedHighValue[0]] : null;

  return {
    firstName: profile.firstName,
    businessName: profile.businessName,
    plan: profile.plan === 'starter' ? 'free' : profile.plan,
    usage: humanUsage(profile.usageSeconds),
    pageViews: profile.pageViews.toLocaleString('en-US'),
    topFeature: top?.label ?? 'Zeneva',
    topFeatureWhere: top?.inSentence ?? 'in Zeneva',
    topFeatureShare: profile.topFeatureShare
      ? `${Math.round(profile.topFeatureShare * 100)}%`
      : 'most',
    unusedFeature: unused?.label ?? 'Zen AI',
    unusedPitch: unused?.pitch ?? FAMILY_META.ai.pitch,
    unusedHref: unused?.href ?? FAMILY_META.ai.href,
    daysSince: profile.daysSinceSeen === null ? 'a while' : String(profile.daysSinceSeen),
    lastPage: profile.lastPage ?? '/dashboard',
    featureCount: String(profile.familiesTouched),
  };
}

/**
 * Replace every `{{token}}` in `text`.
 *
 * An unrecognised token collapses to an empty string rather than being left in
 * place: a typo'd `{{firtName}}` should read as a slightly clumsy sentence, not
 * ship braces to a paying customer.
 */
export function fillTokens(text: string, tokens: MergeTokens): string {
  return String(text ?? '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) =>
    tokens[key] ?? '',
  );
}

/** Tokens still unresolved in a draft — surfaced in the compose screen. */
export function unknownTokensIn(text: string, tokens: MergeTokens): string[] {
  const found = new Set<string>();
  for (const match of String(text ?? '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    if (!(match[1] in tokens)) found.add(match[1]);
  }
  return [...found];
}

/* ------------------------------------------------------------------ *
 * The draft
 * ------------------------------------------------------------------ */

export type EmailDraft = {
  subject: string;
  /** Inbox preview line. Invisible in the body; wasted if left empty. */
  preheader: string;
  /** Small uppercase kicker above the headline. Empty hides it. */
  eyebrow: string;
  heading: string;
  /** Prose, blank-line separated. Supports `**bold**` and `[label](url)`. */
  body: string;
  /**
   * The proof-you-looked panel: their real numbers, in a highlighted box.
   * Empty hides it entirely.
   */
  callout: string;
  ctaLabel: string;
  /** Absolute, or app-relative starting with `/`. */
  ctaPath: string;
  signOffName: string;
  signOffTitle: string;
};

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */

/**
 * Palette — neutral-dominant by design.
 *
 * The first version of this template was mostly orange: a full-width gradient
 * bar, a cream footer, orange headings. At that saturation the brand stops
 * reading as confident and starts reading as a promotion, and a promotion is the
 * thing an inbox filters.
 *
 * So roughly 80% of the surface is now warm neutral (the stone family, which sits
 * better against Zeneva's orange than a blue-grey would) and orange is reserved
 * for four things: the CTA button, the wordmark, the rule under the header, and
 * the accent edge of the callout. Everything else is ink on off-white.
 */
const BRAND = {
  orange: '#ea580c',
  orangeDeep: '#c2410c',
  orangeSoft: '#fff7ed',
  ink: '#1c1917',
  body: '#44403c',
  muted: '#78716c',
  faint: '#a8a29e',
  page: '#f5f5f4',
  card: '#ffffff',
  panel: '#fafaf9',
  line: '#e7e5e4',
};

/**
 * Type stacks.
 *
 * Bricolage Grotesque is the face the Zeneva logo is set in and DM Sans is the
 * app's body font, so the mail matches the product rather than approximating it.
 *
 * **These will not render everywhere, and that is not a bug to chase.** Gmail —
 * web and mobile — strips `<link>` and `@import` webfonts outright, so Gmail
 * readers get the system fallback. Apple Mail, iOS Mail and Outlook.com do load
 * them. That is why the fallback chain matters as much as the webfont: the mail
 * has to look deliberate in the fallback, which is the case most recipients see.
 */
const FONT_DISPLAY =
  "'Bricolage Grotesque','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const FONT_BODY =
  "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2'
  + '?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800'
  + '&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700'
  + '&display=swap';

/** Where the generated raster assets live. See scripts/generate-email-assets.mjs. */
const ASSETS = `${BASE_URL}/email`;

/**
 * Footer social row.
 *
 * Handles copied from the live marketing footer (`marketing-footer.tsx`) so the
 * two cannot drift. Rendered as **PNG images**, not inline SVG: Gmail strips SVG
 * entirely, so an `<svg>` icon set would simply be missing for most of the list.
 */
export const SOCIAL_LINKS = [
  { key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/zeneva_pos/' },
  { key: 'x', label: 'X', href: 'https://x.com/zeneva_retail' },
  { key: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@zeneva_retail' },
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@ZenevaPos' },
  { key: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/2349064233805' },
];

/**
 * Render a draft to a complete, standalone HTML document.
 *
 * `unsubscribeUrl` defaults to the `%%UNSUBSCRIBE_URL%%` token so the normal send
 * path leaves it for `sendEmail` to fill. The preview passes a real (or dummy)
 * URL, which is also what makes the preview show a clickable footer rather than
 * a literal token.
 */
export function renderCampaignEmail(
  draft: EmailDraft,
  tokens: MergeTokens,
  options: { unsubscribeUrl?: string } = {},
): string {
  const unsubscribeUrl = options.unsubscribeUrl ?? UNSUBSCRIBE_TOKEN;

  const fill = (value: string) => fillTokens(value, tokens);
  const heading = escapeHtml(fill(draft.heading));
  const eyebrow = escapeHtml(fill(draft.eyebrow));
  const preheader = escapeHtml(fill(draft.preheader));
  const ctaLabel = escapeHtml(fill(draft.ctaLabel));
  const ctaHref = safeUrl(fill(draft.ctaPath));
  const bodyHtml = renderProse(fill(draft.body), BRAND.orangeDeep);
  const calloutText = fill(draft.callout).trim();
  const calloutHtml = calloutText ? renderProse(calloutText, BRAND.orangeDeep) : '';
  const signName = escapeHtml(fill(draft.signOffName));
  const signTitle = escapeHtml(fill(draft.signOffTitle));
  const year = new Date().getFullYear();

  const socialRow = SOCIAL_LINKS.map(
    s => `<td style="padding:0 5px;">
                <a href="${s.href}" style="text-decoration:none;">
                  <img src="${ASSETS}/social-${s.key}.png" width="30" height="30" alt="${s.label}"
                       style="display:block;border:0;outline:none;text-decoration:none;border-radius:15px;" />
                </a>
              </td>`,
  ).join('');

  return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<!-- Opts out of automatic dark-mode inversion; without these the orange goes brown. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${heading}</title>
<!--
  Webfonts, three ways, because no single mechanism covers the field:
  the <link> is honoured by Apple Mail and iOS Mail, the @import by Outlook.com,
  and Gmail honours neither and falls back — which is why every element below
  also carries a full inline stack rather than relying on inheritance.
  The mso conditional keeps Word's engine on a real sans instead of Times.
-->
<!--[if !mso]><!-->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
<!--<![endif]-->
<style type="text/css">
  @import url('${GOOGLE_FONTS_HREF}');
  body, table, td, p, h1, a { -webkit-font-smoothing:antialiased; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .z-pad { padding-left:22px !important; padding-right:22px !important; }
    .z-h1 { font-size:23px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, h1, a { font-family:'Segoe UI',Arial,sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.page};font-family:${FONT_BODY};">

<!-- Preheader: the line the inbox shows next to the subject. Hidden in the body,
     and padded with zero-width spaces so the client does not pull body copy in
     after it. -->
<div style="display:none;font-size:1px;color:${BRAND.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.page}" style="background-color:${BRAND.page};margin:0;padding:0;">
<tr>
<td align="center" style="padding:36px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${BRAND.card};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;font-family:${FONT_BODY};">

    <!-- Header. Wordmark is live text so it survives image blocking, which is the
         default state for a domain that has not sent bulk mail before. The single
         orange rule underneath is the only brand colour above the fold. -->
    <tr>
      <td class="z-pad" style="padding:24px 32px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" style="font-family:${FONT_DISPLAY};font-size:21px;font-weight:800;letter-spacing:-0.5px;color:${BRAND.orange};line-height:1;">
              zeneva
            </td>
            <td align="right" style="font-family:${FONT_BODY};font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.faint};">
              POS &amp; Inventory
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td height="2" bgcolor="${BRAND.orange}" style="background-color:${BRAND.orange};height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>

    <!-- Hero -->
    <tr>
      <td class="z-pad" style="padding:32px 32px 0;">
        ${
          eyebrow
            ? `<p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.muted};">${eyebrow}</p>`
            : ''
        }
        <h1 class="z-h1" style="margin:0 0 20px;font-family:${FONT_DISPLAY};font-size:27px;line-height:1.24;font-weight:800;letter-spacing:-0.6px;color:${BRAND.ink};">
          ${heading}
        </h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td class="z-pad" style="padding:0 32px;font-family:${FONT_BODY};">
        ${bodyHtml}
      </td>
    </tr>

    ${
      calloutHtml
        ? `<!-- The proof-you-looked panel: this recipient's own numbers. Near-neutral
         fill with a single orange edge, so it reads as a quiet aside rather than
         a highlighted advert. -->
    <tr>
      <td class="z-pad" style="padding:4px 32px 2px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.panel}" style="background-color:${BRAND.panel};border:1px solid ${BRAND.line};border-left:3px solid ${BRAND.orange};border-radius:0 8px 8px 0;">
          <tr>
            <td style="padding:16px 18px 0;font-family:${FONT_BODY};">
              ${calloutHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
        : ''
    }

    <!-- Bulletproof CTA: a table cell with a background colour, because Outlook
         ignores padding on an inline element and would render a bare link. -->
    <tr>
      <td class="z-pad" style="padding:28px 32px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="${BRAND.orange}" style="background-color:${BRAND.orange};border-radius:8px;">
              <a href="${ctaHref}" style="display:inline-block;padding:13px 28px;font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Sign-off -->
    <tr>
      <td class="z-pad" style="padding:26px 32px 30px;">
        <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:15px;color:${BRAND.body};">Thanks for reading,</p>
        <p style="margin:0;font-family:${FONT_DISPLAY};font-size:16px;font-weight:700;color:${BRAND.ink};">${signName}</p>
        <p style="margin:2px 0 0;font-family:${FONT_BODY};font-size:13px;color:${BRAND.muted};">${signTitle}</p>
        <p style="margin:16px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${BRAND.muted};">
          Reply straight to this email &mdash; it comes to me, not a ticket queue.
        </p>
      </td>
    </tr>

    <!-- Footer. Neutral, not cream: the old orange footer plus the gradient bar
         above it were most of why this template read as a promotion. -->
    <tr>
      <td bgcolor="${BRAND.panel}" style="background-color:${BRAND.panel};border-top:1px solid ${BRAND.line};padding:24px 32px 26px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
          <tr>${socialRow}</tr>
        </table>
        <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${BRAND.muted};">
          You are receiving this because you created a Zeneva account.
        </p>
        <p style="margin:0 0 12px;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${BRAND.muted};">
          <a href="${BASE_URL}" style="color:${BRAND.orangeDeep};font-weight:600;text-decoration:none;">zeneva.space</a>
          &nbsp;&middot;&nbsp;
          <a href="${unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
        </p>
        <p style="margin:0;font-family:${FONT_BODY};font-size:11px;color:${BRAND.faint};">
          &copy; ${year} Zeneva POS &amp; Inventory
        </p>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * One draft per behavioural segment
 * ------------------------------------------------------------------ */

/**
 * Starting copy for each segment.
 *
 * Written to be *editable* — the operator picks a segment, reads the draft,
 * changes what they want and sends. Each one leans on the callout to show the
 * recipient their own numbers, because that is the whole difference between this
 * and a mail-merge blast: it is visibly not a template.
 *
 * The tone is one founder writing to one shop owner. No exclamation marks in the
 * subject lines, no "Dear valued customer", and every email asks for exactly one
 * thing.
 */
export const CAMPAIGN_DRAFTS: Record<BehaviorSegment, EmailDraft> = {
  never_activated: {
    subject: 'Want me to set Zeneva up for you?',
    preheader: 'It takes about fifteen minutes and I will do the typing.',
    eyebrow: 'A hand with setup',
    heading: 'Hi {{firstName}} — want me to set Zeneva up for you?',
    body: `I am Imam, the founder of Zeneva. I noticed you created an account for **{{businessName}}** but have not really had a chance to get into it yet.

That is almost always our fault rather than yours — getting your products into a new system is the boring part, and it is where most people stop.

So let me do it. Send me your product list in whatever shape it is in — a spreadsheet, a photo of a notebook, a WhatsApp message — and I will load it into your account myself and send it back ready to sell from.

If now is not the right time, that is completely fine. Just reply and tell me, and I will stop emailing you about it.`,
    callout: '',
    ctaLabel: 'Open Zeneva',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  onboarding_stalled: {
    subject: 'You are set up — but you have not rung up a sale yet',
    preheader: 'The point of sale is two taps away. Here is the shortcut.',
    eyebrow: 'One step left',
    heading: '{{firstName}}, you are one step from your first sale',
    body: `You have been in and out of Zeneva for a few days now, which tells me the setup is going fine. But you have not opened the point of sale yet, and that is the part that actually replaces your notebook.

It is genuinely two taps: pick a product, take the payment. It works with no internet, so a bad network day does not stop you trading, and every sale goes straight into your stock counts and your reports without you doing anything.

If something is in the way — a product that will not scan, a printer that will not connect, a price that looks wrong — reply and tell me what it is. I would rather fix it than have you work around it.`,
    callout:
      'What I can see on **{{businessName}}**: {{pageViews}} page views and {{usage}} in the app so far, mostly {{topFeatureWhere}} — but nothing through the point of sale yet.',
    ctaLabel: 'Ring up a sale',
    ctaPath: '/sales/pos',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  invested_then_left: {
    subject: 'You had {{businessName}} set up — then stopped. What happened?',
    preheader: 'You did the hard part already. A one-line reply tells me what broke.',
    eyebrow: 'You did the hard part',
    heading: '{{firstName}}, you got through setup — then stopped',
    body: `You did the part almost nobody finishes. You got **{{businessName}}** into Zeneva, put your stock in, and spent real time in it. And then, about {{daysSince}} days ago, you stopped.

That combination tells me something quite specific: this was not a case of never getting started. You wanted it to work, you invested to make it work, and then something got in the way.

I would genuinely like to know what. In my experience it is one of four things — a product or price that would not import cleanly, a printer or scanner that would not connect, a number in a report that looked wrong, or it was simply faster to go back to the old way for one busy week and you never came back.

Tell me which one and I will fix it or walk you through it myself. Everything is exactly as you left it, so there is nothing to redo.`,
    callout:
      'Why I am writing to you and not to a list: {{usage}} in the app across {{pageViews}} page views, mostly {{topFeatureWhere}}, and nothing since. That is someone who was using this properly.',
    ctaLabel: 'Pick up where you left off',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  champion: {
    subject: 'You are one of our heaviest users. Can I ask you something?',
    preheader: 'No pitch. I want to know what we should build next.',
    eyebrow: 'A favour',
    heading: '{{firstName}}, can I ask you one question?',
    body: `You are one of the handful of people who use Zeneva properly — not just opened it, but run **{{businessName}}** on it, day after day.

That makes your opinion worth more to me than any amount of guessing on our side. So, one question, and there is nothing to buy at the end of it:

**What is the one thing Zeneva still makes harder than it should be?**

Reply with a sentence. I read every one of these myself, and the last three features we shipped came out of emails exactly like this.`,
    callout:
      'For context on why I picked you: {{usage}} in Zeneva across {{featureCount}} different areas, {{pageViews}} page views. Most people never get close to that.',
    ctaLabel: 'Open Zeneva',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  feature_focused: {
    subject: 'Since you spend your time {{topFeatureWhere}} — one thing you are missing',
    preheader: 'You are paying for this either way. Might as well use it.',
    eyebrow: 'Worth two minutes',
    heading: '{{firstName}}, you are missing the half you are not using',
    body: `You clearly know your way around {{topFeature}} — that is where nearly all of your time in Zeneva goes.

Which is exactly why I am writing: the part you have never opened is **{{unusedFeature}}**, and for someone using Zeneva the way you do, it is the obvious next thing. It lets you {{unusedPitch}}.

It is already in your account. Nothing to install, nothing to pay, no setup — it reads the data you have been putting in all along.

Give it two minutes. If it is not useful to you, reply and tell me why not, and that is genuinely useful to me too.`,
    callout:
      'How I know: {{topFeatureShare}} of your page views in Zeneva are {{topFeatureWhere}}, out of {{pageViews}} in total — and none at all in {{unusedFeature}}.',
    ctaLabel: 'Open {{unusedFeature}}',
    ctaPath: '{{unusedHref}}',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  casual_active: {
    subject: 'The three things most people miss in Zeneva',
    preheader: 'Short list. All of them already in your account.',
    eyebrow: 'Getting more out of it',
    heading: 'Three things most people miss, {{firstName}}',
    body: `You have been dipping into Zeneva regularly, so rather than ask how it is going I thought I would just tell you the three things people most often never find.

**Low-stock alerts.** Zeneva already knows what is running out. Turn the alert on once and it tells you before a customer does.

**{{unusedFeature}}.** You have never opened this one, and it lets you {{unusedPitch}}.

**Offline mode.** It is already on. If the network drops mid-sale, keep selling — everything syncs when you are back.

Any of those sound useful? Reply and I will show you where it is.`,
    callout: 'You have put {{usage}} into Zeneva so far across {{pageViews}} page views.',
    ctaLabel: 'Open Zeneva',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  slipping: {
    subject: 'You stopped using Zeneva {{daysSince}} days ago — what happened?',
    preheader: 'Genuinely asking. A one-line reply helps me a lot.',
    eyebrow: 'Checking in',
    heading: '{{firstName}}, what made you stop?',
    body: `You were using Zeneva properly for a while, and then about {{daysSince}} days ago it stopped. That pattern usually means one of three things, and I would like to know which.

Either something broke and you did not have time to chase us about it. Or something you needed was missing and you went back to what you had before. Or things are just busy and Zeneva slipped down the list.

Whichever it is, I want to hear it — a single line is plenty. If it was a bug, I will fix it. If it was a missing feature, it goes on the list with your name on it. If it was neither, knowing that is still worth more to me than silence.

Your data is exactly where you left it, so nothing is lost either way.`,
    callout:
      'Before you went quiet you had put {{usage}} into Zeneva across {{pageViews}} page views, mostly {{topFeatureWhere}}. That is why I am writing rather than letting it go.',
    ctaLabel: 'Pick up where you left off',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },

  dormant: {
    subject: 'Should I keep your Zeneva account open?',
    preheader: 'One reply either way and I will stop emailing you.',
    eyebrow: 'Last one from me',
    heading: 'Should I keep your account open, {{firstName}}?',
    body: `It has been a long time since **{{businessName}}** used Zeneva, so this is the last email I will send about it.

Your data is all still there and the account still works. If you want to come back, everything is exactly where you left it — and Zeneva has moved on a lot since you last looked: it now runs fully offline, has a proper desktop and phone app, and answers questions about your own sales in plain language.

If you are done with us, reply with a single word and I will stop. No hard feelings — but if there was a specific reason you left, I would really like to know what it was.`,
    callout: '',
    ctaLabel: 'Take another look',
    ctaPath: '/dashboard',
    signOffName: 'Imam Shaffy',
    signOffTitle: 'Founder, Zeneva',
  },
};

/** Fresh copy of a segment's draft, so the compose screen can edit it freely. */
export function draftForSegment(segment: BehaviorSegment): EmailDraft {
  return { ...CAMPAIGN_DRAFTS[segment] };
}

/**
 * Render a draft for one recipient in a single call — what both the preview and
 * the send path use, so the two cannot drift.
 */
export function renderForProfile(
  draft: EmailDraft,
  profile: BehaviorProfile,
  options: { unsubscribeUrl?: string } = {},
): { subject: string; html: string } {
  const tokens = mergeTokensFor(profile);
  return {
    subject: fillTokens(draft.subject, tokens),
    html: renderCampaignEmail(draft, tokens, options),
  };
}
