'use client';

/**
 * The opening and closing screen editor, shared by recipes and coded flows.
 *
 * These two cards are the first and last thing a viewer sees, and they are the
 * part of a recording most likely to be rewritten: the click path through the POS
 * encodes real knowledge about the app, but "Sell anywhere. Even offline." is ad
 * copy and changes with the campaign. Both kinds of recording now play their
 * cards from the same table on the recorder's side, so both get the same editor
 * here rather than one having fields and the other requiring a code change.
 *
 * A card can be switched off entirely. That is a real editorial choice — a demo
 * embedded in a landing page usually wants to start on the product, not on a
 * title — so "off" is stored as an explicit `null` rather than as a missing
 * value, and survives all the way to the CLI, which distinguishes the two.
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FLOWS, FLOW_IDS, FLOW_CARD_DEFAULTS,
  type FlowId, type RecorderRequest, type TitleCard,
} from '@/lib/marketing/recorder';

export type CardSlot = 'open' | 'end';

const COPY: Record<CardSlot, { label: string; off: string }> = {
  open: { label: 'Opening card', off: 'Straight into the app, no cold open.' },
  end: { label: 'Closing card', off: 'Ends on the last frame of the page.' },
};

/** The card used when an operator switches a slot back on. */
export const FALLBACK_CARD: Record<CardSlot, TitleCard> = {
  open: { title: 'Zeneva', subtitle: 'Retail, handled.', ms: 2200 },
  end: { title: 'Zeneva', subtitle: 'Retail, handled.', cta: 'Start free', ms: 2600 },
};

export function TitleCardEditor({
  slot, card, disabled, onChange, onReset, dirty, fallback,
}: {
  slot: CardSlot;
  /** The card as it will be played, or null for none. */
  card: TitleCard | null;
  disabled?: boolean;
  onChange: (next: TitleCard | null) => void;
  /** Shown as a Reset control when present and `dirty`. */
  onReset?: () => void;
  dirty?: boolean;
  /** What switching the slot back on restores. Defaults to a generic card. */
  fallback?: TitleCard;
}) {
  const copy = COPY[slot];
  const set = (patch: Partial<TitleCard>) => onChange({ ...(card ?? FALLBACK_CARD[slot]), ...patch });

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 transition-colors',
        dirty ? 'border-primary/40' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold">{copy.label}</Label>
        <div className="flex items-center gap-1">
          {onReset && dirty && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={onReset}
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] hover:bg-muted/60"
            disabled={disabled}
            onClick={() => onChange(card ? null : (fallback ?? FALLBACK_CARD[slot]))}
          >
            {card ? 'Off' : 'On'}
          </Button>
        </div>
      </div>

      {card ? (
        <div className="space-y-2">
          <Input
            value={card.title}
            disabled={disabled}
            placeholder="Headline"
            className="h-8 text-xs"
            onChange={(e) => set({ title: e.target.value })}
          />
          <Input
            value={card.subtitle ?? ''}
            disabled={disabled}
            placeholder="Sub-line"
            className="h-8 text-xs"
            onChange={(e) => set({ subtitle: e.target.value })}
          />
          {/* Only the closing card gets a call to action: a button drawn on the
              opening card would be asking for the click before anything has been
              shown, which is the wrong order for an advert. */}
          {slot === 'end' && (
            <Input
              value={card.cta ?? ''}
              disabled={disabled}
              placeholder="Button text, e.g. Start free"
              className="h-8 text-xs"
              onChange={(e) => set({ cta: e.target.value })}
            />
          )}
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{copy.off}</p>
      )}
    </div>
  );
}

/**
 * The title screens of the coded flows.
 *
 * A coded flow's click path is code because it encodes real knowledge about the
 * app — which button is conditional, how long a write takes. The cards are the
 * opposite: ad copy, rewritten with every campaign, and they must not need a
 * deploy. The defaults come from the same table the recorder ships, so the
 * editor shows the wording that will actually be played; nothing is sent unless
 * it differs.
 */
export function FlowTitleCards({
  cards, disabled, onChange,
}: {
  /** Current overrides, keyed by flow id. */
  cards: RecorderRequest['cards'];
  disabled?: boolean;
  onChange: (next: RecorderRequest['cards']) => void;
}) {
  const [open, setOpen] = React.useState<FlowId | null>(null);

  /**
   * Write one slot, or drop the override when `next` is undefined.
   *
   * `undefined` (reset), `null` (no card) and a card are three distinct outcomes
   * and all three have to survive to the CLI — reset restores the authored copy,
   * null ships a video with no title screen.
   */
  const set = (id: FlowId, slot: CardSlot, next: TitleCard | null | undefined) => {
    const base = FLOW_CARD_DEFAULTS[id][slot];
    // An override that re-states the default is not an override. Only real edits
    // are sent, so a run that leaves the copy alone carries nothing at all.
    const same = next != null && next.title === base.title && next.subtitle === base.subtitle
      && next.cta === base.cta && (next.ms ?? 2200) === (base.ms ?? 2200);

    const flow = { ...(cards[id] ?? {}) };
    if (next === undefined || same) delete flow[slot];
    else flow[slot] = next;

    const rest = { ...cards };
    if (Object.keys(flow).length) rest[id] = flow;
    else delete rest[id];
    onChange(rest);
  };

  return (
    <div className="space-y-2">
      {FLOW_IDS.map((id) => {
        const flow = cards[id];
        // "Edited" includes switching a card off — an explicit null is an
        // override, and the one most worth offering a Reset for.
        const edited = (slot: CardSlot) => (slot in (flow ?? {}) ? flow![slot] : undefined);
        const dirty = (slot: CardSlot) => edited(slot) !== undefined;
        const openCard = edited('open') === undefined ? FLOW_CARD_DEFAULTS[id].open : edited('open') ?? null;
        const endCard = edited('end') === undefined ? FLOW_CARD_DEFAULTS[id].end : edited('end') ?? null;
        const isOpen = open === id;
        return (
          <div key={id} className="overflow-hidden rounded-lg border border-border bg-card">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(isOpen ? null : id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-xs font-semibold">{FLOWS[id].title}</span>
              <span className="flex items-center gap-2">
                {(edited('open') !== undefined || edited('end') !== undefined) && (
                  <Badge variant="secondary" className="font-mono text-[10px]">edited</Badge>
                )}                <ChevronDown
                  className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                />
              </span>
            </button>
            {isOpen && (
              <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                {(['open', 'end'] as const).map((slot) => (
                  <TitleCardEditor
                    key={slot}
                    slot={slot}
                    card={slot === 'open' ? openCard : endCard}
                    disabled={disabled}
                    dirty={dirty(slot)}
                    fallback={FLOW_CARD_DEFAULTS[id][slot]}
                    onReset={() => set(id, slot, undefined)}
                    onChange={(next) => set(id, slot, next)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
