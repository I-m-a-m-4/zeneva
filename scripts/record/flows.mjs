/**
 * Flow scripts: coded click paths for the POS, inventory and Zen AI demos.
 *
 * The scripts talk to `Page`, which resolves a spec to a rect in the live DOM and
 * then fires real CDP input events at it. Nothing here touches React or Firebase
 * — every step is something a person could do with a mouse and keyboard.
 *
 * Selectors are written against what the app actually renders. Where a control
 * has readable text ("Next: Customer", "Quick Edit") the text is the selector;
 * `css` is the escape hatch for icon-only buttons, and each one below is pinned
 * to a class combination that is unique on its page — see the notes inline,
 * because "looks unique" is how a flow silently clicks the wrong thing.
 *
 * `ctx.commit` decides whether a flow performs its write. It defaults to false,
 * so a take against the wrong account cannot ring up a sale or change a stock
 * count; `--commit` opts in for the real demo footage, and the captions change
 * to match so the video never claims something that did not happen.
 *
 * **Title cards are not here.** They live in `FLOW_CARDS` below and are played by
 * `record.mjs`, the same way a recipe's are — one path for both kinds, so the
 * studio can edit the opening and closing screen of any recording without a flow
 * having to opt in.
 */

/**
 * The opening and closing screen of each coded flow.
 *
 * These are the first and last thing a viewer sees, so they are written as ad
 * copy rather than as labels: a claim on the open, the product name and a way to
 * act on the close. `record.mjs` plays them, and anything passed to `--cards`
 * (or set in the studio) overrides them per run — the wording is a marketing
 * decision that should not need a code change.
 */
export const FLOW_CARDS = {
  pos: {
    open: { title: 'Sell anywhere.', subtitle: 'Even offline.', ms: 1900 },
    end: { title: 'Sell anywhere. Even offline.', subtitle: 'Zeneva POS', cta: 'Start free', ms: 2600 },
  },
  inventory: {
    open: { title: 'Know what you have.', subtitle: 'Down to the last unit.', ms: 1900 },
    end: {
      title: 'Counts you can trust, on every device.',
      subtitle: 'Zeneva Inventory',
      cta: 'Start free',
      ms: 2600,
    },
  },
  zen: {
    open: { title: '41 tools.', subtitle: 'Reads everything. Writes nothing without you.', ms: 2000 },
    end: {
      title: 'Zen AI',
      subtitle: 'Reads everything. Writes nothing without you.',
      cta: 'Try Zen AI',
      ms: 2600,
    },
  },
};


/**
 * POS: select products → customer → payment → review (→ complete, with --commit).
 *
 * The add-to-cart control is icon-only. On this page four buttons carry `h-11`
 * (search, scan, filter, sort) but only the two product-card buttons combine
 * `h-11 w-11 rounded-lg` — one plain, one a units dropdown trigger — so that
 * triple is the anchor. Both add to cart, so hitting either is correct.
 *
 * The cart is a genuinely different control below `md`. On desktop it is a
 * sidebar that is always on screen with "Next: Customer" at its foot; on mobile
 * that whole card is `hidden md:block` and the cart lives in a bottom sheet
 * behind a fixed "View Cart (n)" bar. Same button text at the end, one extra tap
 * to reach it — so the flow branches on `page.device.mobile` rather than
 * pretending the two layouts are one. Asking for "Next: Customer" on a phone
 * without opening the sheet first times out after 20s, which is how this was
 * found.
 */
export async function posFlow(page, ctx = {}) {
  const ADD = 'button[class*="h-11"][class*="w-11"][class*="rounded-lg"]';
  const mobile = page.device.mobile;

  await page.goto('/sales/pos/select-products');
  await page.caption('Tap to add. Stock and totals update instantly.', 4200);

  // Punch in on the grid before the first tap, so the viewer sees *what* is
  // being added rather than a cursor crossing a wall of cards. 1.3 is the
  // ceiling worth using: the camera is an upscale of captured frames, not a
  // re-render, and past about 1.5 the text goes soft. See Page.punch.
  await page.punch({ css: ADD, nth: 0 }, { to: 1.3 });
  await page.click({ css: ADD, nth: 0 });
  await page.hold(200);
  await page.click({ css: ADD, nth: 1 });
  await page.hold(200);
  await page.click({ css: ADD, nth: 2 });
  await page.hold(500);

  if (mobile) {
    // The running total lives on the bar itself, so this is the mobile version
    // of the cart payoff — and the bar is the thing being tapped next.
    await page.punch({ text: 'View Cart', exact: false }, { to: 1.24, ms: 700 });
    await page.hold(600);
    await page.caption('');
    await page.click({ text: 'View Cart', exact: false }, { settle: 1100 });
    // The sheet animates up over 500ms and its footer button is the target, so
    // going wide here is both the right frame and the right pause.
    await page.wide({ ms: 620 });
    await page.hold(900);
  } else {
    // Out to the cart, which is the payoff of the three taps — the totals the
    // caption just promised would update.
    await page.punch({ text: 'Next: Customer', exact: true }, { to: 1.22, ms: 700 });
    await page.hold(700);
    await page.caption('');
  }

  await page.clickTo({ text: 'Next: Customer', exact: true }, '/sales/pos/customer', { settle: 1300 });

  await page.caption('Attach a customer, or keep the queue moving without one.', 3600);
  await page.hold(900);
  await page.caption('');
  await page.clickTo({ text: 'Next: Payment', exact: true }, '/sales/pos/payment', { settle: 1200 });

  await page.caption('Cash, card, transfer or invoice — all in one step.', 4000);
  // Each payment tile is <Label htmlFor="cash|card|bank|invoice"> wrapping a Card
  // whose RadioGroupItem is sr-only, so the label is the real click target.
  await page.punch({ css: 'label[for="cash"]' }, { to: 1.28, ms: 720 });
  await page.click({ css: 'label[for="cash"]' }, { settle: 500 });
  await page.hold(600);
  await page.caption('');
  // "Review & Complete" unless the business has autoPrint on, in which case the
  // same button reads "Finalize & Print".
  await page.clickAny(
    [
      { text: 'Review & Complete', exact: true },
      { text: 'Finalize & Print', exact: true },
    ],
    { settle: 0 },
  );
  await page.waitForPath('/sales/pos/review');
  await page.hold(1200);

  await page.caption('Every line, every total — checked before anything is saved.', 3800);
  // The totals block is what the caption is pointing at, so frame it. `punch`
  // silently does nothing if no total is on screen, which is the right failure:
  // the take continues wide rather than dying over a camera move.
  await page.punch({ text: 'Total', exact: false }, { to: 1.26, ms: 800 });
  await page.hold(1200);

  if (ctx.commit) {
    await page.caption('');
    // Cash/card/transfer finalise as "Complete Sale"; an Invoice sale renames the
    // same button to "Issue Professional Invoice".
    await page.clickAny(
      [
        { text: 'Complete Sale', exact: true },
        { text: 'Issue Professional Invoice', exact: true },
      ],
      { settle: 2600 },
    );
    await page.caption('Sale recorded. Receipt ready. Stock deducted. Books balanced.', 3800);
    await page.hold(1800);
  } else {
    await page.caption('One tap finalises it: receipt printed, stock deducted, books balanced.', 4200);
    await page.hold(1400);
  }
  await page.caption('');
}

/** Routes each flow visits, so they can be compiled before the camera rolls. */
export const FLOW_ROUTES = {
  pos: [
    '/sales/pos/select-products',
    '/sales/pos/customer',
    '/sales/pos/payment',
    '/sales/pos/review',
  ],
  inventory: ['/inventory'],
  zen: ['/ai-insights'],
};

/**
 * Inventory: search → Inventory Health tab → Low Stock filter → Quick Edit.
 *
 * There is no inline stock editor on this page. Stock is changed through the
 * row's ⋯ menu → Quick Edit → dialog, which is also the better shot: it ends on
 * the toast that explains the write is queued and will land when you are online.
 */
export async function inventoryFlow(page, ctx = {}) {
  await page.goto('/inventory');
  await page.caption('Search your whole catalogue — instantly, and offline.', 3800);

  // The search box is at the top of a long page, so a punch here both makes the
  // typing legible and keeps the results list in shot as it filters.
  await page.punch({ placeholder: 'Search products' }, { to: 1.2, ms: 680 });
  await page.fill({ placeholder: 'Search products' }, 'sh', { clear: true, settle: 1400 });
  await page.hold(900);
  await page.press('Backspace');
  await page.press('Backspace');
  await page.hold(900);
  await page.wide({ ms: 640 });

  await page.caption('Inventory Health finds the problems before a customer does.', 4000);
  await page.click({ text: 'Inventory Health', exact: false, tag: 'button' }, { settle: 1100 });
  await page.hold(700);

  // The four health tiles are Cards with no button role; their text comes from
  // i18n (`inventory.healthLowStock` = "Low Stock (≤5)"), so match the stable
  // English prefix rather than the parenthetical.
  //
  // Frame the tiles before the click. They are the whole point of the tab and
  // they are small — at 1080p a health tile's number is barely legible on a
  // phone, which is where most of this footage gets watched.
  await page.punch({ text: 'Low Stock', exact: false }, { to: 1.32, ms: 780 });
  await page.click({ text: 'Low Stock', exact: false }, { settle: 1200 });
  await page.caption('');
  await page.hold(500);
  await page.wide({ ms: 700 });
  await page.hold(500);

  await page.caption('Fix a count in two taps. No forms, no page reload.', 4000);
  // Radix sets aria-haspopup="menu" on the row's ⋯ trigger — stable across
  // icon renames, unlike the lucide class on the glyph inside it.
  await page.punch({ css: 'tbody [aria-haspopup="menu"]', nth: 0 }, { to: 1.3, ms: 720 });
  await page.click({ css: 'tbody [aria-haspopup="menu"]', nth: 0 }, { settle: 700 });
  await page.click({ text: 'Quick Edit', exact: true }, { settle: 1100 });
  // The dialog is centred and modal; a camera still parked on the row it came
  // from would frame the overlay's blur instead of the fields being typed into.
  await page.wide({ ms: 520 });

  // Dialog fields in order: Price, Cost Price, Stock. Scoped to the dialog so a
  // number input on the page behind it can never be picked up instead.
  await page.punch({ css: '[role="dialog"] input[type="number"]', nth: 2 }, { to: 1.34, ms: 700 });
  await page.fill(
    { css: '[role="dialog"] input[type="number"]', nth: 2 },
    '46',
    { clear: true, delay: 150, settle: 700 },
  );
  await page.hold(600);
  await page.wide({ ms: 640 });

  if (ctx.commit) {
    await page.click({ text: 'Save Changes', exact: true }, { settle: 2200 });
    await page.caption('Saved offline, synced the moment you reconnect.', 3800);
  } else {
    await page.caption('Saved offline, synced the moment you reconnect.', 3800);
    await page.hold(1500);
    await page.click({ text: 'Cancel', exact: true }, { settle: 1200 });
  }
  await page.hold(1600);
  await page.caption('');
}

/**
 * Zen AI: ask a real question, watch real tools run against real data.
 *
 * The composer swaps placeholder once the thread opens ("Ask anything about your
 * business..." → "Ask Zen AI..."), which is the one reliable signal that the
 * message was actually sent — the status line cycles through generic copy until
 * a tool starts, so waiting on any particular status text is a coin flip.
 */
export async function zenFlow(page) {
  await page.goto('/ai-insights');
  await page.caption('Ask anything about your business.', 3400);

  // In on the composer while the question is typed — this is the one moment in
  // the take where the words on screen are the whole content of the shot.
  await page.punch({ placeholder: 'Ask anything about your business' }, { to: 1.26, ms: 700 });
  await page.fill(
    { placeholder: 'Ask anything about your business' },
    'Which products are about to run out?',
    { enter: true, delay: 62, settle: 900 },
  );

  await page.caption('It reads your live data — never a guess, never a generic answer.', 5200);
  await page.find({ placeholder: 'Ask Zen AI' }, { timeoutMs: 30_000 });
  // Back out for the answer. The reply streams top-down and the tool-status line
  // runs above it, so anything tighter than the full frame loses half of what
  // makes this shot worth having.
  await page.wide({ ms: 760 });
  await page.hold(10_500);

  await page.caption('Zen AI proposes. Nothing is written until you approve it.', 4200);
  await page.hold(2200);
  await page.caption('');
}

export const FLOWS = { pos: posFlow, inventory: inventoryFlow, zen: zenFlow };
