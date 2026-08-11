'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Pill, Shirt, Smartphone, MapPin, Search, ArrowRight, Zap, Truck,
  Sofa, Sparkles, Store, Sandwich, WifiOff, CheckCircle2, Star, Compass,
  ChevronDown, Laptop, Tablet, Globe, Boxes, ShieldCheck, X,
} from 'lucide-react';
import { InteractiveGrid } from '@/components/interactive-grid';

import MarketingHeader from '@/components/layout/marketing-header';
import MarketingFooter from '@/components/layout/marketing-footer';

/**
 * Industry taxonomy. These six sectors are the ones a business actually picks
 * from during onboarding (`industries` in src/app/(app)/onboarding/page.tsx), so
 * a visitor who recognises their shop here lands on the same label they will be
 * asked for on signup. The cards below are sub-verticals of those six.
 */
const SECTORS = [
  'Food & Beverage',
  'Health & Beauty',
  'Fashion & Apparel',
  'Electronics',
  'Home & Furniture',
  'Retail & E-commerce',
] as const;

type Sector = (typeof SECTORS)[number];

type UseCase = {
  slug: string;
  title: string;
  sector: Sector;
  icon: React.ReactNode;
  /** The operational bottleneck, in the shop owner's words. */
  pain: string;
  /** Three capabilities that address it. Every one of these is shipped today. */
  solves: { label: string; detail: string }[];
  /** What keeps working when the connection drops. */
  offline: string;
  /** Extra search terms so someone can find their trade by the word they use. */
  keywords: string[];
};

const USE_CASES: UseCase[] = [
  {
    slug: 'supermarkets',
    title: 'Supermarkets & Grocery',
    sector: 'Food & Beverage',
    icon: <ShoppingBag className="h-6 w-6" />,
    pain: 'Thousands of SKUs, short shelf lives, and a queue that cannot wait for a page to load.',
    solves: [
      { label: 'Expiry dates per product', detail: 'Set an expiry on any product and see what is about to turn before it becomes waste.' },
      { label: 'Data-health scanner', detail: 'Inventory > Troubleshoot sweeps the catalogue for missing prices, uncategorised products, probable duplicates and negative stock.' },
      { label: 'Bulk CSV import & export', detail: 'Load an existing spreadsheet catalogue in one pass instead of typing several thousand rows.' },
    ],
    offline: 'Full register and instant product search, read straight from the local mirror.',
    keywords: ['grocery', 'supermarket', 'mart', 'provisions', 'food', 'store'],
  },
  {
    slug: 'pharmacies',
    title: 'Pharmacies & Health Stores',
    sector: 'Health & Beauty',
    icon: <Pill className="h-6 w-6" />,
    pain: 'Expiry is a compliance matter, not a nuisance, and every price change needs to be attributable.',
    solves: [
      { label: 'Expiry tracking', detail: 'Products carry an expiry date, so short-dated stock surfaces while it can still be moved or returned.' },
      { label: 'Audit log', detail: 'Every change is recorded with who made it and when. Nothing is edited anonymously.' },
      { label: 'Locked-down pricing', detail: 'Override Prices and Apply Discounts are separate permissions you can withhold from counter staff.' },
    ],
    offline: 'Dispensing and receipt printing continue; the log syncs in order once you reconnect.',
    keywords: ['pharmacy', 'chemist', 'drugs', 'medication', 'health', 'clinic'],
  },
  {
    slug: 'fashion',
    title: 'Fashion & Boutiques',
    sector: 'Fashion & Apparel',
    icon: <Shirt className="h-6 w-6" />,
    pain: 'One style becomes twenty rows once you account for size and colour, and last season quietly eats your cash.',
    solves: [
      { label: 'Real variant products', detail: 'A parent style holds its variants, each with its own SKU, price and stock count, grouped under one name in the catalogue.' },
      { label: 'Trapped-cash analysis', detail: 'Ask Zen AI what is not moving and it reports the money sitting in slow stock, per product.' },
      { label: 'Category splits', detail: 'Reports break takings down by category so you can see which rail actually pays.' },
    ],
    offline: 'Sales, variant lookup and stock edits all work with no connection.',
    keywords: ['fashion', 'boutique', 'clothing', 'apparel', 'shoes', 'thrift', 'tailor'],
  },
  {
    slug: 'electronics',
    title: 'Phone & Electronics Shops',
    sector: 'Electronics',
    icon: <Smartphone className="h-6 w-6" />,
    pain: 'High-value units, customers who pay a deposit now and the balance later, and bundles priced as one item.',
    solves: [
      { label: 'Composite bundles', detail: 'A product can be a bundle, so a phone plus case plus screen guard sells as a single priced line.' },
      { label: 'Invoice ledger', detail: 'Outstanding balances live in their own ledger instead of a notebook under the counter.' },
      { label: 'Held sales', detail: 'Park a cart mid-transaction, serve the next customer, and recall it when they come back with the balance.' },
    ],
    offline: 'Deposits, held carts and receipts are all recorded locally first.',
    keywords: ['electronics', 'phones', 'gadgets', 'computers', 'accessories', 'repair'],
  },
  {
    slug: 'multi-branch',
    title: 'Multi-Branch Chains',
    sector: 'Retail & E-commerce',
    icon: <MapPin className="h-6 w-6" />,
    pain: 'Nobody can say which branch actually holds the stock, and a sale made offline lands against the wrong shop.',
    solves: [
      { label: 'Per-branch stock', detail: 'Every location keeps its own counts, with an active-branch switcher in the shell.' },
      { label: 'Correct offline attribution', detail: 'The active branch is attached to a sale at the moment it is queued, not when it uploads, so offline takings land on the right branch.' },
      { label: 'Consolidated reporting', detail: 'Takings, profit and best sellers roll up across every location in one view.' },
    ],
    offline: 'Each branch keeps selling independently and reconciles in order on reconnect.',
    keywords: ['chain', 'branches', 'locations', 'multi-store', 'franchise', 'outlets'],
  },
  {
    slug: 'wholesale',
    title: 'Wholesale & Distribution',
    sector: 'Retail & E-commerce',
    icon: <Truck className="h-6 w-6" />,
    pain: 'Everybody pays later. Money is owed to you and by you, and both sides need to be visible at once.',
    solves: [
      { label: 'Customer invoice ledger', detail: 'Track what each buyer still owes, separately from completed receipts.' },
      { label: 'Supplier debts', detail: 'Inventory > Debts records what you owe upstream, so cash planning uses both directions.' },
      { label: 'Bulk price updates', detail: 'Export the catalogue, reprice in a spreadsheet, import it back.' },
    ],
    offline: 'Order taking and invoice creation do not need a connection.',
    keywords: ['wholesale', 'distribution', 'bulk', 'supplier', 'trade', 'depot', 'b2b'],
  },
  {
    slug: 'furniture',
    title: 'Home & Furniture',
    sector: 'Home & Furniture',
    icon: <Sofa className="h-6 w-6" />,
    pain: 'Few sales, large tickets, part-payment, and weeks between the order and the delivery.',
    solves: [
      { label: 'Part-payment on invoice', detail: 'An invoice carries its outstanding balance until it is settled, however many instalments that takes.' },
      { label: 'Held sales', detail: 'A quote can sit parked while the customer measures the room.' },
      { label: 'Customer history', detail: 'Spend history and last-seen on every customer, so a follow-up call has context.' },
    ],
    offline: 'Quotes, invoices and payments are all recorded locally first.',
    keywords: ['furniture', 'home', 'interior', 'appliances', 'decor', 'mattress'],
  },
  {
    slug: 'beauty',
    title: 'Beauty & Cosmetics Counters',
    sector: 'Health & Beauty',
    icon: <Sparkles className="h-6 w-6" />,
    pain: 'Small baskets, the same faces every month, and promotions that need to stay controlled.',
    solves: [
      { label: 'Loyalty points', detail: 'Customers accrue points against a reward threshold you set yourself.' },
      { label: 'Discounts and coupons', detail: 'Apply either at checkout, gated behind a permission so not every till can do it.' },
      { label: 'Spend history', detail: 'See what a regular actually buys before you recommend anything.' },
    ],
    offline: 'Points and discounts are calculated locally, so the queue never stalls.',
    keywords: ['beauty', 'cosmetics', 'salon', 'skincare', 'perfume', 'hair'],
  },
  {
    slug: 'mini-marts',
    title: 'Neighbourhood Shops & Mini-marts',
    sector: 'Retail & E-commerce',
    icon: <Store className="h-6 w-6" />,
    pain: 'One person runs the whole shop, the power and the data are both unreliable, and there is no software budget.',
    solves: [
      { label: 'Free forever on Starter', detail: 'Up to 50 products, one staff account and 20 Zen AI messages a day at no cost. No trial, no card.' },
      { label: 'Runs on what you own', detail: 'Windows and macOS desktop, Android, iOS, or just the browser.' },
      { label: 'A lapsed plan never locks the till', detail: 'If a paid plan expires you drop back to Starter. The register does not stop mid-sale.' },
    ],
    offline: 'Everything a single-till shop does day to day works with no internet at all.',
    keywords: ['kiosk', 'mini-mart', 'corner shop', 'small business', 'free', 'single till'],
  },
  {
    slug: 'food-counters',
    title: 'Food Counters & Takeaways',
    sector: 'Food & Beverage',
    icon: <Sandwich className="h-6 w-6" />,
    pain: 'A rush that lasts ninety minutes, then a stock-take on what did not sell before close.',
    solves: [
      { label: 'Four-step checkout', detail: 'Products, customer, payment, review. Nothing to hunt for during a rush.' },
      { label: 'Peak-hours report', detail: 'See exactly when your rush starts so you can staff for it rather than guess.' },
      { label: 'Daily report', detail: 'One end-of-day summary of takings, profit and what moved.' },
    ],
    offline: 'The whole rush can be served offline and uploaded afterwards.',
    keywords: ['restaurant', 'takeaway', 'cafe', 'fast food', 'bakery', 'drinks', 'bar'],
  },
];

/** Shipped in every plan, including the free one. */
const UNIVERSAL = [
  { icon: <WifiOff className="h-5 w-5" />, title: 'Offline-first register', detail: 'Sales queue locally in order and upload when the connection returns. The till never waits for the internet.' },
  { icon: <Boxes className="h-5 w-5" />, title: 'One write path', detail: 'Every sale, stock change and customer edit goes through the same queue, which is why offline survival and branch attribution are consistent.' },
  { icon: <Zap className="h-5 w-5" />, title: 'Zen AI over your own data', detail: '41 typed tools covering sales velocity, margins, replenishment and slow stock. It proposes; you approve.' },
  { icon: <ShieldCheck className="h-5 w-5" />, title: 'Roles and granular permissions', detail: 'Three roles plus eight individual permissions, re-verified server-side rather than hidden in the UI.' },
  { icon: <CheckCircle2 className="h-5 w-5" />, title: 'Audit log', detail: 'Every change, by whom, when.' },
  { icon: <Star className="h-5 w-5" />, title: 'Receipts and invoices', detail: 'Print to a thermal printer, export a PDF, email a digital copy, or track an unpaid balance in the ledger.' },
];

const PLATFORMS = [
  { icon: <Laptop className="h-5 w-5" />, label: 'Windows & macOS', detail: 'Native desktop app' },
  { icon: <Tablet className="h-5 w-5" />, label: 'Android & iOS', detail: 'On the shop floor' },
  { icon: <Globe className="h-5 w-5" />, label: 'Web', detail: 'Any browser' },
];

/**
 * Plan limits, kept identical to `src/lib/plan.ts`. That file's comment is
 * explicit that the marketing pages carry the same numbers rather than an
 * approximation of them, so change both together or neither.
 */
const PLANS = [
  { name: 'Starter', price: 'Free', products: '50 products', staff: '1 staff account', ai: '20 Zen AI messages a day' },
  { name: 'Pro', price: 'NGN 10,000 / $10 a month', products: '1,500 products', staff: '5 staff accounts', ai: '100 Zen AI messages a day', featured: true },
  { name: 'Business', price: 'NGN 30,000 / $30 a month', products: 'Unlimited products', staff: 'Unlimited staff', ai: '500 Zen AI messages a day' },
];

export default function UseCasesPage() {
  const [query, setQuery] = React.useState('');
  const [sector, setSector] = React.useState<Sector | null>(null);
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return USE_CASES.filter((uc) => {
      if (sector && uc.sector !== sector) return false;
      if (!q) return true;
      const haystack = [uc.title, uc.sector, uc.pain, ...uc.keywords, ...uc.solves.map((s) => s.label)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, sector]);

  const filtered = Boolean(query.trim() || sector);

  return (
    <main className="min-h-screen bg-background">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative flex items-center justify-center overflow-hidden bg-transparent px-6 pb-16 pt-28 md:py-32">
        <div className="absolute inset-0 z-0">
          <InteractiveGrid />
          <div className="aura-background" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Star className="h-4 w-4" />
            <span>Who is Zeneva for?</span>
          </div>
          <h1 className="mb-6 font-headline text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Built for shops that cannot stop selling
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            Ten trades, one register. Find the way your shop actually works below, and see
            which parts of Zeneva were built for it.
          </p>
        </div>
      </section>

      {/* Search and sector filter */}
      <section className="bg-primary/5 px-6 py-12">
        <div className="mx-auto -mt-20 max-w-3xl">
          <div className="flex items-center rounded-xl border border-border/60 bg-card p-2 shadow-lg transition-all focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="mx-3 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your trade — pharmacy, boutique, wholesale, kiosk..."
              aria-label="Search industries"
              className="flex-1 border-none bg-transparent py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="mr-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSector(null)}
              aria-pressed={sector === null}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                sector === null
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
            >
              All sectors
            </button>
            {SECTORS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSector(sector === s ? null : s)}
                aria-pressed={sector === s}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  sector === s
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Use-case cards */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-headline text-3xl font-bold">Explore use cases</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Each card names the bottleneck first, then the specific features that deal with
              it. Open one to see the detail.
            </p>
            <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
              {filtered
                ? `Showing ${results.length} of ${USE_CASES.length} use cases`
                : `${USE_CASES.length} use cases`}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card p-10 text-center">
              <Compass className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-2 font-headline text-lg font-semibold">
                No match for that trade
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Zeneva is not limited to the ten below — these are just the ones we have
                written up. Tell us what you sell and we will walk you through the fit.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSector(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Clear filters
                </button>
                <Link
                  href="/contact"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Ask us
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {results.map((uc) => {
                const isOpen = openSlug === uc.slug;
                return (
                  <article
                    key={uc.slug}
                    className="group flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                        {uc.icon}
                      </div>
                      <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {uc.sector}
                      </span>
                    </div>

                    <h3 className="mb-2 font-headline text-xl font-semibold transition-colors group-hover:text-primary">
                      {uc.title}
                    </h3>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                      {uc.pain}
                    </p>

                    <ul className="mb-5 space-y-2">
                      {uc.solves.map((s) => (
                        <li key={s.label} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="font-medium">{s.label}</span>
                        </li>
                      ))}
                    </ul>

                    {isOpen && (
                      <div className="mb-5 space-y-4 rounded-xl border border-primary/15 bg-primary/5 p-4">
                        {uc.solves.map((s) => (
                          <div key={s.label}>
                            <p className="text-xs font-bold uppercase tracking-wide text-primary">
                              {s.label}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {s.detail}
                            </p>
                          </div>
                        ))}
                        <div className="flex items-start gap-2.5 border-t border-primary/15 pt-3">
                          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-primary">
                              With no internet
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              {uc.offline}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                      <button
                        type="button"
                        onClick={() => setOpenSlug(isOpen ? null : uc.slug)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {isOpen ? 'Show less' : 'How it works'}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <Link
                        href="/signup"
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                      >
                        Start free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Universal capabilities */}
          <div className="mt-24 rounded-3xl border border-border/60 bg-secondary p-8 md:p-12">
            <div className="mb-10 max-w-2xl">
              <h2 className="mb-4 font-headline text-3xl font-bold">
                In every plan, including the free one
              </h2>
              <p className="text-muted-foreground">
                Whatever you sell, these are the parts that do not vary by industry. Setup for
                each is covered in the{' '}
                <Link href="/help-center" className="text-primary hover:underline">
                  Help Center
                </Link>
                .
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {UNIVERSAL.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-border/60 bg-background p-5 transition-colors hover:border-primary/30"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {c.icon}
                  </div>
                  <h3 className="mb-1.5 font-semibold">{c.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Where it runs */}
          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
              <div
                key={p.label}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {p.icon}
                </div>
                <div>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-sm text-muted-foreground">{p.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plan fit */}
          <div className="mt-24">
            <div className="mb-10 text-center">
              <h2 className="mb-4 font-headline text-3xl font-bold">Which plan fits</h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Every feature above is on every plan. What changes is scale, not capability.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-2xl border bg-card p-6 transition-all hover:shadow-md ${
                    p.featured ? 'border-primary shadow-md' : 'border-border/60 shadow-sm'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-headline text-lg font-semibold">{p.name}</h3>
                    {p.featured && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                        Most shops
                      </span>
                    )}
                  </div>
                  <p className="mb-5 text-sm font-medium text-muted-foreground">{p.price}</p>
                  <ul className="space-y-2.5 text-sm">
                    {[p.products, p.staff, p.ai].map((line) => (
                      <li key={line} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              A paid plan that lapses downgrades to Starter. It never locks you out of your own
              register.{' '}
              <Link href="/pricing" className="text-primary hover:underline">
                Full pricing
              </Link>
            </p>
          </div>

          {/* CTA */}
          <div className="mx-auto mt-24 max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-4 font-headline text-2xl font-bold">
              Start on the plan that costs nothing
            </h2>
            <p className="mb-8 text-muted-foreground">
              Starter is free forever — no trial, no card. Add products, ring up a sale, and
              pull the plug to see what still works.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              >
                Get started for free
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
