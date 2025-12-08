"use client";

import Image from "next/image";
import { ReactNode } from "react";
import {
  Card,
  DiscardSuggestion,
  FaceStyle,
  Suit,
  cardImagePath,
  cardLabel,
} from "../lib/cards";

type CardsBySuit = { suit: Suit; cards: Card[] };

type Props = {
  cardsBySuit: CardsBySuit[];
  discardPick: Card[];
  discardNote: string | null;
  discardSelectedIds: Set<string>;
  handleToggleDiscardCard: (card: Card) => void;
  faceStyle: FaceStyle;
  faceStyleToggle: ReactNode;
  isDealer: boolean;
  includeCrib: boolean;
  onDealerChange: (value: boolean) => void;
  onIncludeCribChange: (value: boolean) => void;
  discardSuggestions: DiscardSuggestion[];
};

export function DiscardTab({
  cardsBySuit,
  discardPick,
  discardNote,
  discardSelectedIds,
  handleToggleDiscardCard,
  faceStyle,
  faceStyleToggle,
  isDealer,
  includeCrib,
  onDealerChange,
  onIncludeCribChange,
  discardSuggestions,
}: Props) {
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50 backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Pick any 6 cards</h2>
            <p className="text-xs text-slate-300">
              {discardSelectedIds.size}/6 selected
            </p>
          </div>
          {faceStyleToggle}
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {cardsBySuit.map(({ suit, cards }) => (
            <div key={suit}>
              <div className="grid grid-cols-1 gap-1 lg:grid-cols-13">
                {cards.map((card) => {
                  const selected = discardSelectedIds.has(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleToggleDiscardCard(card)}
                      className={`group relative overflow-hidden rounded-xl border bg-white/90 p-1 text-left shadow-sm shadow-black/25 transition duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
                        selected
                          ? "border-sky-200 ring-2 ring-sky-300"
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
                        {selected ? (
                          <span className="rounded-full bg-sky-500/90 px-2 py-0.5 text-white shadow">
                            Picked
                          </span>
                        ) : (
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

      <section className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/50 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Your six-card hand</h2>
              <p className="text-sm text-slate-300">
                Click to add, click again to remove. We will try every possible
                discard to find the best expected value.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
                <button
                  onClick={() => onDealerChange(true)}
                  className={`px-3 py-1.5 transition ${
                    isDealer ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  You are dealer
                </button>
                <button
                  onClick={() => onDealerChange(false)}
                  className={`px-3 py-1.5 transition ${
                    !isDealer ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  Opponent is dealer
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeCrib}
                  onChange={(e) => onIncludeCribChange(e.target.checked)}
                  className="h-4 w-4 rounded border-white/40 bg-slate-900 text-sky-400"
                />
                Include crib impact
              </label>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <button
                key={`discard-${idx}`}
                type="button"
                onClick={() => discardPick[idx] && handleToggleDiscardCard(discardPick[idx]!)}
                className="rounded-xl border border-sky-300/30 bg-sky-500/10 px-2 py-2 text-center text-sm text-sky-100 shadow-inner shadow-sky-900/40 transition hover:border-sky-200/60 hover:shadow-lg hover:shadow-sky-900/40 disabled:cursor-default"
                disabled={!discardPick[idx]}
              >
                <div className="text-xs uppercase tracking-wide text-sky-200">
                  Card {idx + 1}
                </div>
                <div className="mt-2">
                  <div className="relative aspect-[63/88] w-full overflow-hidden rounded-lg border border-sky-200/40 bg-white/90 shadow">
                    {discardPick[idx] ? (
                      <Image
                        src={cardImagePath(discardPick[idx], faceStyle)}
                        alt={cardLabel(discardPick[idx])}
                        fill
                        sizes="120px"
                        className="object-contain p-1"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg font-semibold text-sky-200">
                        —
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {discardNote && (
            <p className="mt-3 text-sm text-amber-200">
              {discardNote}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Discard suggestions</h2>
              <p className="text-sm text-slate-300">
                We average every possible starter from the unseen cards.
                {includeCrib
                  ? isDealer
                    ? " Expected value = hand average + crib average."
                    : " Expected value = hand average - crib average."
                  : " Crib is ignored when computing the average."}
              </p>
            </div>
            <div className="text-xs text-slate-300">
              Crib assumption: when you are non-dealer, you avoid throwing 5s or pairs.
            </div>
          </div>
          {discardPick.length < 6 && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              Pick 6 cards to see the best discard lines.
            </p>
          )}
          {discardPick.length === 6 && (
            <div className="mt-4 space-y-4">
              {discardSuggestions.map((suggestion, idx) => (
                <div
                  key={suggestion.keep.map((c) => c.id).join("-")}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm text-slate-200">
                          Keep the four below, discard the two to the crib.
                        </p>
                        <p className="text-xs text-slate-400">
                          Best starters highlight spikes you can hope to cut.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-lime-200">
                        Expected value
                      </div>
                      <div className="text-3xl font-black text-lime-100">
                        {suggestion.expectedValue.toFixed(2)}
                      </div>
                      {includeCrib && (
                        <div className="mt-1 text-[11px] text-slate-300">
                          Hand {suggestion.handAverage.toFixed(2)} / Crib{" "}
                          {suggestion.cribAverage.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200">
                        Keep
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestion.keep.map((card) => (
                          <span
                            key={`keep-${card.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200/40 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-50"
                          >
                            {cardLabel(card)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-wide text-amber-200">
                        Discard to crib
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestion.discards.map((card) => (
                          <span
                            key={`discard-${card.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-50"
                          >
                            {cardLabel(card)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-100">
                      <div className="flex items-center justify-between">
                        <span>Hand average</span>
                        <span className="font-semibold text-lime-100">
                          {suggestion.handAverage.toFixed(2)} pts
                        </span>
                      </div>
                      {includeCrib && (
                        <div className="mt-2 flex items-center justify-between">
                          <span>Crib average</span>
                          <span className="font-semibold text-lime-100">
                            {suggestion.cribAverage.toFixed(2)} pts
                          </span>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-300">
                        Best starters for this keep:
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestion.bestStarters.map(({ card, score }) => (
                          <span
                            key={`starter-${card.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-50"
                          >
                            <span>{cardLabel(card)}</span>
                            <span className="text-slate-200">{score} pts</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
