"use client";

import Image from "next/image";
import { ReactNode } from "react";
import {
  Card,
  DiscardSuggestion,
  FaceStyle,
  cardImagePath,
  cardLabel,
  sortCards,
} from "../lib/cards";

type Props = {
  faceStyle: FaceStyle;
  faceStyleToggle: ReactNode;
  testCards: Card[];
  testDiscards: Card[];
  testNote: string | null;
  testSelectedIds: Set<string>;
  testIncludeCrib: boolean;
  testIsDealer: boolean;
  showBestSolution: boolean;
  bestTestSuggestion: DiscardSuggestion | null;
  userTestChoice: DiscardSuggestion | null;
  handleToggleTestDiscard: (card: Card) => void;
  refreshTestHand: () => void;
  onSetTestDealer: (value: boolean) => void;
  onSetTestIncludeCrib: (value: boolean) => void;
  onToggleShowBest: () => void;
  onSendToDiscard: () => void;
  testLoading: boolean;
};

export function TestTab({
  faceStyle,
  faceStyleToggle,
  testCards,
  testDiscards,
  testNote,
  testSelectedIds,
  testIncludeCrib,
  testIsDealer,
  showBestSolution,
  bestTestSuggestion,
  userTestChoice,
  handleToggleTestDiscard,
  refreshTestHand,
  onSetTestDealer,
  onSetTestIncludeCrib,
  onToggleShowBest,
  onSendToDiscard,
  testLoading,
}: Props) {
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/50 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Test yourself</h2>
            <p className="text-sm text-slate-300">
              We deal 6 random cards. Pick two to throw to the crib and see how your
              line compares to the solver.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
              <button
                onClick={() => onSetTestDealer(true)}
                className={`px-3 py-1.5 transition ${
                  testIsDealer ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                You are dealer
              </button>
              <button
                onClick={() => onSetTestDealer(false)}
                className={`px-3 py-1.5 transition ${
                  !testIsDealer ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Opponent is dealer
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={testIncludeCrib}
                onChange={(e) => onSetTestIncludeCrib(e.target.checked)}
                className="h-4 w-4 rounded border-white/40 bg-slate-900 text-sky-400"
              />
              Include crib impact
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={refreshTestHand}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow hover:-translate-y-[1px] hover:bg-white/20"
              >
                Reload
              </button>
            <button
              onClick={onSendToDiscard}
              disabled={testCards.length !== 6}
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold shadow transition ${
                testCards.length === 6
                  ? "border-lime-200/60 bg-lime-500/20 text-lime-50 hover:-translate-y-[1px] hover:bg-lime-500/30"
                  : "cursor-not-allowed border-white/20 bg-white/5 text-white/60"
              }`}
            >
              View in discard tab
            </button>
            {faceStyleToggle}
          </div>
        </div>
      </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {testCards.map((card) => {
            const selected = testSelectedIds.has(card.id);
            return (
              <button
                key={card.id}
                onClick={() => handleToggleTestDiscard(card)}
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
                    sizes="120px"
                    className="object-contain drop-shadow-sm"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/50" />
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 text-[10px] font-semibold text-slate-800 drop-shadow">
                  {selected ? (
                    <span className="rounded-full bg-sky-500/90 px-2 py-0.5 text-white shadow">
                      Discard
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100/90 px-2 py-0.5 text-slate-700 shadow">
                      Keep
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {testNote && (
          <p className="mt-3 text-sm text-amber-200">
            {testNote}
          </p>
        )}
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Your discard line</h3>
              <p className="text-sm text-slate-300">
                Pick exactly two discards to see the expected value.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-lime-200">
                Expected value
              </div>
              <div className="text-3xl font-black text-lime-100">
                {userTestChoice ? userTestChoice.expectedValue.toFixed(2) : "—"}
              </div>
              {userTestChoice && testIncludeCrib && (
                <div className="mt-1 text-[11px] text-slate-300">
                  Hand {userTestChoice.handAverage.toFixed(2)} / Crib{" "}
                  {userTestChoice.cribAverage.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          {!userTestChoice && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              Select two cards to discard.
            </p>
          )}
          {testLoading && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-lime-300" />
                Calculating expected value...
              </div>
            </div>
          )}
          {userTestChoice && (
            <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-wide text-emerald-200">
                  Keep
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sortCards(userTestChoice.keep).map((card) => (
                    <span
                      key={`test-keep-${card.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200/40 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-50"
                    >
                      {cardLabel(card)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs uppercase tracking-wide text-amber-200">
                  Discard
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sortCards(userTestChoice.discards).map((card) => (
                    <span
                      key={`test-discard-${card.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-50"
                    >
                      {cardLabel(card)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-100">
                <div className="flex items-center justify-between">
                  <span>Min hand score (worst starter)</span>
                  <span className="font-semibold text-lime-100">
                    {userTestChoice.minHandScore.toFixed(0)} pts
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hand average</span>
                  <span className="font-semibold text-lime-100">
                    {userTestChoice.handAverage.toFixed(2)} pts
                  </span>
                </div>
                {testIncludeCrib && (
                  <div className="mt-2 flex items-center justify-between">
                    <span>Crib average</span>
                    <span className="font-semibold text-lime-100">
                      {userTestChoice.cribAverage.toFixed(2)} pts
                    </span>
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-300">
                  Best starters for your keep:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userTestChoice.bestStarters.map(({ card, score }) => (
                    <span
                      key={`user-starter-${card.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-50"
                    >
                      <span>{cardLabel(card)}</span>
                      <span className="text-slate-200">{score} pts</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Best solution</h3>
              <p className="text-sm text-slate-300">
                Solver tries every discard; crib math matches your settings.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-lime-200">
                Expected value
              </div>
              <div className="text-3xl font-black text-lime-100">
                {showBestSolution && bestTestSuggestion
                  ? bestTestSuggestion.expectedValue.toFixed(2)
                  : "—"}
              </div>
              {showBestSolution && bestTestSuggestion && testIncludeCrib && (
                <div className="mt-1 text-[11px] text-slate-300">
                  Hand {bestTestSuggestion.handAverage.toFixed(2)} / Crib{" "}
                  {bestTestSuggestion.cribAverage.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          {!bestTestSuggestion && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              Waiting for a full 6-card deal.
            </p>
          )}
          {bestTestSuggestion && !showBestSolution && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              Best line is hidden. Select two discards, then tap “Show best”.
            </p>
          )}
          {testLoading && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-lime-300" />
                Calculating best line...
              </div>
            </div>
          )}
          {bestTestSuggestion && showBestSolution && (
            <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-wide text-emerald-200">
                  Keep
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sortCards(bestTestSuggestion.keep).map((card) => (
                    <span
                      key={`best-keep-${card.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200/40 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-50"
                    >
                      {cardLabel(card)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs uppercase tracking-wide text-amber-200">
                  Discard
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sortCards(bestTestSuggestion.discards).map((card) => (
                    <span
                      key={`best-discard-${card.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-50"
                    >
                      {cardLabel(card)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-sm text-slate-100">
                <div className="flex items-center justify-between">
                  <span>Min hand score (worst starter)</span>
                  <span className="font-semibold text-lime-100">
                    {bestTestSuggestion.minHandScore.toFixed(0)} pts
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hand average</span>
                  <span className="font-semibold text-lime-100">
                    {bestTestSuggestion.handAverage.toFixed(2)} pts
                  </span>
                </div>
                {testIncludeCrib && (
                  <div className="mt-2 flex items-center justify-between">
                    <span>Crib average</span>
                    <span className="font-semibold text-lime-100">
                      {bestTestSuggestion.cribAverage.toFixed(2)} pts
                    </span>
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-300">
                  Best starters:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bestTestSuggestion.bestStarters.map(({ card, score }) => (
                    <span
                      key={`best-starter-${card.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-50"
                    >
                      <span>{cardLabel(card)}</span>
                      <span className="text-slate-200">{score} pts</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {userTestChoice && bestTestSuggestion && showBestSolution && (
            <div className="mt-4 rounded-xl border border-lime-200/20 bg-lime-500/5 p-3 text-xs text-slate-200">
              <div className="font-semibold text-white">Comparison</div>
              <p className="mt-1">
                Your line: {userTestChoice.expectedValue.toFixed(2)} vs best:{" "}
                {bestTestSuggestion.expectedValue.toFixed(2)} (
                {(bestTestSuggestion.expectedValue - userTestChoice.expectedValue).toFixed(2)}{" "}
                diff).
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onToggleShowBest}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                showBestSolution
                  ? "border-lime-200/60 bg-lime-500/20 text-lime-50"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
              } ${!bestTestSuggestion ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={!bestTestSuggestion}
            >
              {showBestSolution ? "Hide best" : "Show best"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
