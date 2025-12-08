"use client";

import Image from "next/image";
import { ReactNode, RefObject } from "react";
import { Card, FaceStyle, ScoreBreakdown, Suit, cardImagePath, cardLabel } from "../lib/cards";

type CardsBySuit = { suit: Suit; cards: Card[] };

type Props = {
  cardsBySuit: CardsBySuit[];
  hand: Card[];
  starter: Card | null;
  note: string | null;
  faceStyle: FaceStyle;
  faceStyleToggle: ReactNode;
  selectedIds: Set<string>;
  handleToggleCountCard: (card: Card) => void;
  handOnlyBreakdown: ScoreBreakdown | null;
  breakdown: ScoreBreakdown | null;
  slotsFilled: boolean;
  picksRef: RefObject<HTMLDivElement | null>;
};

export function CountTab({
  cardsBySuit,
  hand,
  starter,
  note,
  faceStyle,
  faceStyleToggle,
  selectedIds,
  handleToggleCountCard,
  handOnlyBreakdown,
  breakdown,
  slotsFilled,
  picksRef,
}: Props) {
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50 backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Full deck</h2>
            <p className="text-xs text-slate-300">
              {selectedIds.size}/5 selected
            </p>
          </div>
          {faceStyleToggle}
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {cardsBySuit.map(({ suit, cards }) => (
            <div key={suit}>
              <div className="grid grid-cols-1 gap-1 lg:grid-cols-13">
                {cards.map((card) => {
                  const isHand = hand.some((c) => c.id === card.id);
                  const isStarter = starter?.id === card.id;
                  const selected = isHand || isStarter;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleToggleCountCard(card)}
                      className={`group relative overflow-hidden rounded-xl border bg-white/90 p-1 text-left shadow-sm shadow-black/25 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
                        selected
                          ? "border-lime-200 ring-2 ring-lime-300"
                          : "border-slate-200/70"
                      }`}
                    >
                      <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg bg-gradient-to-br from-white to-slate-50">
                        <Image
                          src={cardImagePath(card, faceStyle)}
                          alt={cardLabel(card)}
                          fill
                          sizes="(min-width:1024px) 90px, (min-width:640px) 16vw, 22vw"
                          className="object-contain drop-shadow-sm"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/50" />
                      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 text-[10px] font-semibold text-slate-800 drop-shadow">
                        {isHand && (
                          <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-white shadow">
                            Hand
                          </span>
                        )}
                        {isStarter && (
                          <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-amber-950 shadow">
                            Starter
                          </span>
                        )}
                        {!selected && (
                          <span className="rounded-full bg-slate-100/90 px-2 py-0.5 text-slate-700 shadow">
                            Add
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Your picks</h2>
                <p className="text-sm text-slate-300">
                  Click a card to add it. Click again to remove. The first 4 go to
                  your hand, then the starter.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Hand
                </div>
                <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Starter
                </div>
              </div>
            </div>

            <div
              ref={picksRef}
              className="mt-4 grid grid-cols-4 gap-1 sm:grid-cols-5"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <button
                  key={`hand-${idx}`}
                  type="button"
                  onClick={() => hand[idx] && handleToggleCountCard(hand[idx]!)}
                  className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-2 py-2 text-center text-sm text-emerald-100 shadow-inner shadow-emerald-900/50 transition hover:border-emerald-200/60 hover:shadow-lg hover:shadow-emerald-900/40 disabled:cursor-default"
                  disabled={!hand[idx]}
                >
                  <div className="text-xs uppercase tracking-wide text-emerald-200">
                    Hand {idx + 1}
                  </div>
                  <div className="mt-2">
                    <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg border border-emerald-200/40 bg-white/90 shadow">
                      {hand[idx] ? (
                        <Image
                          src={cardImagePath(hand[idx], faceStyle)}
                          alt={cardLabel(hand[idx])}
                          fill
                          sizes="120px"
                          className="object-contain p-1"
                          priority
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg font-semibold text-emerald-200">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => starter && handleToggleCountCard(starter)}
                className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-4 text-center text-sm text-amber-100 shadow-inner shadow-amber-900/40 transition hover:border-amber-200/60 hover:shadow-lg hover:shadow-amber-900/30 disabled:cursor-default"
                disabled={!starter}
              >
                <div className="text-xs uppercase tracking-wide text-amber-200">
                  Starter
                </div>
                <div className="mt-2">
                  <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg border border-amber-200/40 bg-white/90 shadow">
                    {starter ? (
                      <Image
                        src={cardImagePath(starter, faceStyle)}
                        alt={cardLabel(starter)}
                        fill
                        sizes="120px"
                        className="object-contain p-1"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg font-semibold text-amber-200">
                        —
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
            {note && (
              <p className="mt-3 text-sm text-amber-200">
                {note}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-lime-300/20 bg-lime-500/5 p-5 shadow-xl shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Score</h2>
                <p className="text-sm text-slate-300">
                  Totals refresh as soon as you finish the hand.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-lime-300">
                  Total
                </div>
                <div className="text-4xl font-black text-lime-200">
                  {breakdown ? breakdown.total : "—"}
                </div>
                {!slotsFilled && handOnlyBreakdown && (
                  <div className="mt-1 text-xs text-slate-200">
                    Hand only (no starter):{" "}
                    <span className="font-semibold text-lime-100">
                      {handOnlyBreakdown.total} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!slotsFilled && (
              <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                {handOnlyBreakdown
                  ? "Pick a starter to see the full breakdown. Hand-only score shown below."
                  : "Pick 4 hand cards and 1 starter to see the breakdown."}
              </p>
            )}
            {breakdown && (
              <div className="mt-4 space-y-3">
                {breakdown.parts.map((part) => (
                  <div
                    key={part.label}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {part.label}
                      </span>
                      <span className="text-sm font-semibold text-lime-200">
                        {part.points} pts
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-200">
                      {part.detail.map((line, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {!breakdown && handOnlyBreakdown && (
              <div className="mt-4 space-y-3">
                {handOnlyBreakdown.parts.map((part) => (
                  <div
                    key={`hand-only-${part.label}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {part.label}
                      </span>
                      <span className="text-sm font-semibold text-lime-200">
                        {part.points} pts
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-200">
                      {part.detail.map((line, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-lg shadow-black/40">
            <h3 className="text-base font-semibold text-white">How scoring works</h3>
            <ul className="mt-2 space-y-1">
              <li>• Fifteens: every unique combo totaling 15 is worth 2.</li>
              <li>• Pairs: each pair scores 2 (pairs of a kind stack).</li>
              <li>• Runs: longest run of 3+ in the hand; duplicates multiply runs.</li>
              <li>• Flush: 4 hand cards same suit = 4; starter match makes 5.</li>
              <li>• His Nobs: Jack in hand matching the starter suit = 1.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
