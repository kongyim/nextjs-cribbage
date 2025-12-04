"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Suit = "♠" | "♥" | "♦" | "♣";
type FaceStyle = "simple" | "original";

type Card = {
  rank: string;
  value: number; // value for fifteens (face cards = 10, Ace = 1)
  order: number; // 1-13 for runs
  suit: Suit;
  id: string;
};

type ScorePart = {
  label: string;
  points: number;
  detail: string[];
};

type ScoreBreakdown = {
  total: number;
  parts: ScorePart[];
};

const RANKS: Array<{ label: string; value: number; order: number }> = [
  { label: "A", value: 1, order: 1 },
  { label: "2", value: 2, order: 2 },
  { label: "3", value: 3, order: 3 },
  { label: "4", value: 4, order: 4 },
  { label: "5", value: 5, order: 5 },
  { label: "6", value: 6, order: 6 },
  { label: "7", value: 7, order: 7 },
  { label: "8", value: 8, order: 8 },
  { label: "9", value: 9, order: 9 },
  { label: "10", value: 10, order: 10 },
  { label: "J", value: 10, order: 11 },
  { label: "Q", value: 10, order: 12 },
  { label: "K", value: 10, order: 13 },
];

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

const SUIT_META: Record<
  Suit,
  { name: string; slug: "spades" | "hearts" | "diamonds" | "clubs"; color: string }
> = {
  "♠": { name: "Spades", slug: "spades", color: "text-slate-200" },
  "♥": { name: "Hearts", slug: "hearts", color: "text-red-200" },
  "♦": { name: "Diamonds", slug: "diamonds", color: "text-rose-200" },
  "♣": { name: "Clubs", slug: "clubs", color: "text-emerald-200" },
};

const DECK: Card[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    rank: rank.label,
    value: rank.value,
    order: rank.order,
    suit,
    id: `${rank.label}${suit}`,
  })),
);

const suitAccent: Record<Suit, string> = {
  "♠": "text-slate-200",
  "♣": "text-emerald-200",
  "♦": "text-rose-200",
  "♥": "text-red-200",
};

function cardLabel(card: Card) {
  return `${card.rank}${card.suit}`;
}

const rankSlug: Record<string, string> = {
  A: "ace",
  J: "jack",
  Q: "queen",
  K: "king",
  "10": "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

function cardImagePath(card: Card, faceStyle: FaceStyle) {
  const suitSlug = SUIT_META[card.suit].slug;
  const baseRank = rankSlug[card.rank] ?? card.rank.toLowerCase();
  const needsAlt = ["J", "Q", "K"].includes(card.rank);
  const suffix = needsAlt && faceStyle === "original" ? "2" : "";
  return `/cards/${baseRank}_of_${suitSlug}${suffix}.svg`;
}

function generateCombos<T>(items: T[]): T[][] {
  const results: T[][] = [];
  const buffer: T[] = [];

  function helper(start: number) {
    if (buffer.length) {
      results.push([...buffer]);
    }
    for (let i = start; i < items.length; i += 1) {
      buffer.push(items[i]);
      helper(i + 1);
      buffer.pop();
    }
  }

  helper(0);
  return results;
}

function findFifteens(cards: Card[]): ScorePart {
  const combos = generateCombos(cards);
  const hits: string[] = [];

  combos.forEach((combo) => {
    const sum = combo.reduce((acc, card) => acc + card.value, 0);
    if (sum === 15 && combo.length >= 2) {
      hits.push(`${combo.map(cardLabel).join(" + ")} = 15`);
    }
  });

  return {
    label: "Fifteens",
    points: hits.length * 2,
    detail: hits.length
      ? hits.map((item) => `${item} (2 pts)`)
      : ["No combinations totaled 15."],
  };
}

function findPairs(cards: Card[]): ScorePart {
  const byRank = cards.reduce<Record<string, number>>((acc, card) => {
    acc[card.rank] = (acc[card.rank] ?? 0) + 1;
    return acc;
  }, {});

  const detail: string[] = [];
  let points = 0;

  Object.entries(byRank).forEach(([rank, count]) => {
    if (count >= 2) {
      const pairs = (count * (count - 1)) / 2;
      const cardWord = count === 2 ? "Pair" : `${count} of a kind`;
      detail.push(`${cardWord} of ${rank}s → ${pairs * 2} pts`);
      points += pairs * 2;
    }
  });

  if (!detail.length) {
    detail.push("No pairs.");
  }

  return { label: "Pairs", points, detail };
}

function findRuns(cards: Card[]): ScorePart {
  const counts = cards.reduce<Record<number, number>>((acc, card) => {
    acc[card.order] = (acc[card.order] ?? 0) + 1;
    return acc;
  }, {});

  let bestLength = 0;
  let points = 0;
  const detail: string[] = [];

  let i = 1;
  while (i <= 13) {
    if (!counts[i]) {
      i += 1;
      continue;
    }

    let j = i;
    let product = 1;
    while (counts[j]) {
      product *= counts[j];
      j += 1;
    }

    const length = j - i;
    if (length >= 3) {
      const runCards = Array.from({ length }, (_, idx) => i + idx)
        .map((order) => {
          const rank = RANKS.find((r) => r.order === order);
          return rank?.label ?? order.toString();
        })
        .join("-"); // keep short and readable
      const score = length * product;

      if (length > bestLength) {
        bestLength = length;
        points = score;
        detail.length = 0;
        detail.push(`Run of ${length} (${runCards}) ×${product} = ${score} pts`);
      } else if (length === bestLength) {
        points += score;
        detail.push(`Run of ${length} (${runCards}) ×${product} = ${score} pts`);
      }
    }

    i = j + 1;
  }

  if (!detail.length) {
    detail.push("No runs (need 3+ consecutive ranks).");
  }

  return { label: "Runs", points, detail };
}

function findFlush(hand: Card[], starter: Card): ScorePart {
  const allSameSuit = hand.every((card) => card.suit === hand[0].suit);
  if (!allSameSuit) {
    return {
      label: "Flush",
      points: 0,
      detail: ["No flush (all 4 hand cards must share a suit)."],
    };
  }

  const withStarter = starter.suit === hand[0].suit;
  return {
    label: "Flush",
    points: withStarter ? 5 : 4,
    detail: [
      withStarter
        ? "5-card flush (hand + starter) = 5 pts"
        : "4-card flush (hand only) = 4 pts",
    ],
  };
}

function findKnobs(hand: Card[], starter: Card): ScorePart {
  const jack = hand.find((card) => card.rank === "J" && card.suit === starter.suit);
  return {
    label: "His Nobs",
    points: jack ? 1 : 0,
    detail: jack
      ? [`Jack of ${starter.suit} in hand matches starter suit = 1 pt`]
      : ["No matching Jack for starter suit."],
  };
}

function scoreHand(hand: Card[], starter: Card): ScoreBreakdown {
  const cards = [...hand, starter];
  const parts = [
    findFifteens(cards),
    findPairs(cards),
    findRuns(cards),
    findFlush(hand, starter),
    findKnobs(hand, starter),
  ];

  const total = parts.reduce((acc, part) => acc + part.points, 0);
  return { total, parts };
}

export default function Home() {
  const [hand, setHand] = useState<Card[]>([]);
  const [starter, setStarter] = useState<Card | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [faceStyle, setFaceStyle] = useState<FaceStyle>("original");
  const picksRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolled = useRef(false);

  const selectedIds = useMemo(
    () => new Set([starter, ...hand].filter(Boolean).map((c) => c!.id)),
    [hand, starter],
  );

  const cardsBySuit = useMemo(
    () => SUITS.map((suit) => ({ suit, cards: DECK.filter((c) => c.suit === suit) })),
    [],
  );

  const breakdown = useMemo(
    () => (hand.length === 4 && starter ? scoreHand(hand, starter) : null),
    [hand, starter],
  );

  const slotsFilled = hand.length === 4 && starter;

  useEffect(() => {
    if (slotsFilled && !hasAutoScrolled.current) {
      picksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      hasAutoScrolled.current = true;
    }
    if (!slotsFilled) {
      hasAutoScrolled.current = false;
    }
  }, [slotsFilled]);

  const handleToggleCard = (card: Card) => {
    setNote(null);

    if (selectedIds.has(card.id)) {
      setHand((prev) => prev.filter((c) => c.id !== card.id));
      setStarter((prev) => (prev?.id === card.id ? null : prev));
      return;
    }

    if (hand.length < 4) {
      setHand((prev) => [...prev, card]);
      return;
    }

    if (!starter) {
      setStarter(card);
      return;
    }

    setNote("You already picked 4 hand cards and a starter. Remove one to change.");
  };

  const reset = () => {
    setHand([]);
    setStarter(null);
    setNote(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Cribbage helper
            </p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Count a hand fast
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Pick 4 hand cards plus a starter from the full deck. We will total every
              fifteen, pair, run, flush, and his nobs with the math shown.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/30 transition hover:-translate-y-[1px] hover:bg-white/20 hover:shadow-slate-900/50"
          >
            Reset selection
          </button>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/50 backdrop-blur">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Full deck</h2>
              <p className="text-xs text-slate-300">
                {selectedIds.size}/5 selected
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-300">Face style</span>
              <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/10">
                {(["simple", "original"] as FaceStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setFaceStyle(style)}
                    className={`px-3 py-1 font-semibold transition ${
                      faceStyle === style
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {style === "simple" ? "Simple" : "Original"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-1">
            {cardsBySuit.map(({ suit, cards }) => (
              <div
                key={suit}
                className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/40"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl ${suitAccent[suit]}`}>{suit}</span>
                    <span className="text-sm font-semibold text-white">
                      {SUIT_META[suit].name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-300">
                    A to K
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-13">
                  {cards.map((card) => {
                    const isHand = hand.some((c) => c.id === card.id);
                    const isStarter = starter?.id === card.id;
                    const selected = isHand || isStarter;
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleToggleCard(card)}
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
                    Click a card to add it. Click again to remove. The first 4 go to your
                    hand, then the starter.
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
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5"
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <button
                    key={`hand-${idx}`}
                    type="button"
                    onClick={() => hand[idx] && handleToggleCard(hand[idx]!)}
                    className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-4 text-center text-sm text-emerald-100 shadow-inner shadow-emerald-900/50 transition hover:border-emerald-200/60 hover:shadow-lg hover:shadow-emerald-900/40 disabled:cursor-default"
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
                  onClick={() => starter && handleToggleCard(starter)}
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
                </div>
              </div>
              {!slotsFilled && (
                <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  Pick 4 hand cards and 1 starter to see the breakdown.
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
      </div>
    </div>
  );
}
