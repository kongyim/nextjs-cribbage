"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type StarterScore = {
  card: Card;
  score: number;
};

type DiscardSuggestion = {
  keep: Card[];
  discards: Card[];
  handAverage: number;
  cribAverage: number;
  expectedValue: number;
  bestStarters: StarterScore[];
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
  return `./cards/${baseRank}_of_${suitSlug}${suffix}.svg`;
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

function chooseN<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const buffer: T[] = [];

  function helper(start: number, depth: number) {
    if (depth === size) {
      result.push([...buffer]);
      return;
    }
    for (let i = start; i < items.length; i += 1) {
      buffer.push(items[i]);
      helper(i + 1, depth + 1);
      buffer.pop();
    }
  }

  helper(0, 0);
  return result;
}

function averageHandScores(hand: Card[], starterPool: Card[]) {
  if (!starterPool.length) {
    return { average: 0, best: [] as StarterScore[] };
  }
  const scores = starterPool.map((starter) => ({
    card: starter,
    score: scoreHand(hand, starter).total,
  }));

  const total = scores.reduce((acc, entry) => acc + entry.score, 0);
  const best = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);

  return { average: total / scores.length, best };
}

function expectedCribValue(ourDiscards: Card[], starterPool: Card[], isDealer: boolean) {
  if (!starterPool.length) return 0;

  let total = 0;
  let count = 0;

  for (let i = 0; i < starterPool.length; i += 1) {
    const first = starterPool[i];
    for (let j = i + 1; j < starterPool.length; j += 1) {
      const second = starterPool[j];
      // If opponent owns the crib (you are non-dealer), assume you avoid tossing 5s or pairs.
      if (
        !isDealer &&
        (first.rank === "5" || second.rank === "5" || first.rank === second.rank)
      ) {
        continue;
      }

      for (let k = 0; k < starterPool.length; k += 1) {
        if (k === i || k === j) continue;
        const starter = starterPool[k];
        const cribScore = scoreHand([...ourDiscards, first, second], starter).total;
        total += cribScore;
        count += 1;
      }
    }
  }

  return count ? total / count : 0;
}

function evaluateDiscards(
  sixCards: Card[],
  isDealer: boolean,
  includeCrib: boolean,
): DiscardSuggestion[] {
  if (sixCards.length !== 6) return [];

  const starterPool = DECK.filter((card) => !sixCards.some((picked) => picked.id === card.id));
  const keepCombos = chooseN(sixCards, 4);

  const results: DiscardSuggestion[] = keepCombos.map((keep) => {
    const discards = sixCards.filter((card) => !keep.some((k) => k.id === card.id));
    const { average: handAverage, best } = averageHandScores(keep, starterPool);
    const cribAverage = includeCrib ? expectedCribValue(discards, starterPool, isDealer) : 0;
    const expectedValue = includeCrib
      ? isDealer
        ? handAverage + cribAverage
        : handAverage - cribAverage
      : handAverage;

    return {
      keep,
      discards,
      handAverage,
      cribAverage,
      expectedValue,
      bestStarters: best,
    };
  });

  return results.sort((a, b) => b.expectedValue - a.expectedValue).slice(0, 3);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"count" | "discard" | "test">("count");
  const [hand, setHand] = useState<Card[]>([]);
  const [starter, setStarter] = useState<Card | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [discardPick, setDiscardPick] = useState<Card[]>([]);
  const [discardNote, setDiscardNote] = useState<string | null>(null);
  const [isDealer, setIsDealer] = useState(true);
  const [includeCrib, setIncludeCrib] = useState(true);
  const [testCards, setTestCards] = useState<Card[]>([]);
  const [testDiscards, setTestDiscards] = useState<Card[]>([]);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [testIsDealer, setTestIsDealer] = useState(true);
  const [testIncludeCrib, setTestIncludeCrib] = useState(true);
  const [showBestSolution, setShowBestSolution] = useState(false);
  const [faceStyle, setFaceStyle] = useState<FaceStyle>("original");
  const picksRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolled = useRef(false);

  const selectedIds = useMemo(
    () => new Set([starter, ...hand].filter(Boolean).map((c) => c!.id)),
    [hand, starter],
  );

  const testSelectedIds = useMemo(
    () => new Set(testDiscards.map((c) => c.id)),
    [testDiscards],
  );

  const discardSelectedIds = useMemo(
    () => new Set(discardPick.map((c) => c.id)),
    [discardPick],
  );

  const cardsBySuit = useMemo(
    () => SUITS.map((suit) => ({ suit, cards: DECK.filter((c) => c.suit === suit) })),
    [],
  );

  const breakdown = useMemo(
    () => (hand.length === 4 && starter ? scoreHand(hand, starter) : null),
    [hand, starter],
  );

  const discardSuggestions = useMemo(
    () => evaluateDiscards(discardPick, isDealer, includeCrib),
    [discardPick, includeCrib, isDealer],
  );

  const bestTestSuggestion = useMemo(
    () => (testCards.length === 6 ? evaluateDiscards(testCards, testIsDealer, testIncludeCrib)[0] : null),
    [testCards, testIncludeCrib, testIsDealer],
  );

  const userTestChoice = useMemo(() => {
    if (testCards.length !== 6 || testDiscards.length !== 2) return null;
    const keep = testCards.filter((card) => !testDiscards.some((d) => d.id === card.id));
    const starterPool = DECK.filter((card) => !testCards.some((picked) => picked.id === card.id));
    const { average: handAverage, best } = averageHandScores(keep, starterPool);
    const cribAverage = testIncludeCrib
      ? expectedCribValue(testDiscards, starterPool, testIsDealer)
      : 0;
    const expectedValue = testIncludeCrib
      ? testIsDealer
        ? handAverage + cribAverage
        : handAverage - cribAverage
      : handAverage;

    return {
      keep,
      discards: testDiscards,
      handAverage,
      cribAverage,
      expectedValue,
      bestStarters: best,
    };
  }, [testCards, testDiscards, testIncludeCrib, testIsDealer]);

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

  const handleToggleCountCard = (card: Card) => {
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

  const handleToggleDiscardCard = (card: Card) => {
    setDiscardNote(null);

    if (discardSelectedIds.has(card.id)) {
      setDiscardPick((prev) => prev.filter((c) => c.id !== card.id));
      return;
    }

    if (discardPick.length < 6) {
      setDiscardPick((prev) => [...prev, card]);
      return;
    }

    setDiscardNote("You already picked 6 cards. Remove one to change the set.");
  };

  const resetCount = () => {
    setHand([]);
    setStarter(null);
    setNote(null);
  };

  const resetDiscard = () => {
    setDiscardPick([]);
    setDiscardNote(null);
  };

  const handleToggleTestDiscard = (card: Card) => {
    setTestNote(null);
    if (testDiscards.some((c) => c.id === card.id)) {
      const next = testDiscards.filter((c) => c.id !== card.id);
      setTestDiscards(next);
      if (next.length !== 2) setShowBestSolution(false);
      return;
    }
    if (testDiscards.length < 2) {
      const next = [...testDiscards, card];
      setTestDiscards(next);
      if (next.length === 2) {
        setShowBestSolution(true);
      } else {
        setShowBestSolution(false);
      }
      return;
    }
    setTestNote("You already picked 2 discards. Tap again to deselect.");
  };

  const randomSix = useCallback(() => {
    const pool = [...DECK];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6);
  }, []);

  const refreshTestHand = useCallback(() => {
    setTestCards(randomSix());
    setTestDiscards([]);
    setTestNote(null);
    setShowBestSolution(false);
  }, [randomSix]);

  const faceStyleToggle = (
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              Cribbage helper
            </p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Play faster, score smarter
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Flip between counting a finished hand or plotting the best discard. Every
              result shows the math so you can trust the suggestion.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white shadow-lg shadow-slate-950/30">
              <button
                onClick={() => setActiveTab("count")}
                className={`px-3 py-2 transition ${
                  activeTab === "count" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Count a hand
              </button>
              <button
                onClick={() => setActiveTab("discard")}
                className={`px-3 py-2 transition ${
                  activeTab === "discard" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Discard to crib
              </button>
              <button
                onClick={() => {
                  setActiveTab("test");
                  if (!testCards.length) {
                    refreshTestHand();
                  }
                }}
                className={`px-3 py-2 transition ${
                  activeTab === "test" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                Test yourself
              </button>
            </div>
            <button
              onClick={
                activeTab === "count"
                  ? resetCount
                  : activeTab === "discard"
                    ? resetDiscard
                    : refreshTestHand
              }
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-950/30 transition hover:-translate-y-[1px] hover:bg-white/20 hover:shadow-slate-900/50"
            >
              Reset selection
            </button>
          </div>
        </header>

        {activeTab === "count" && (
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
          </>
        )}

        {activeTab === "discard" && (
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
                        onClick={() => setIsDealer(true)}
                        className={`px-3 py-1.5 transition ${
                          isDealer ? "bg-white/20" : "hover:bg-white/10"
                        }`}
                      >
                        You are dealer
                      </button>
                      <button
                        onClick={() => setIsDealer(false)}
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
                        onChange={(e) => setIncludeCrib(e.target.checked)}
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
        )}

        {activeTab === "test" && (
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
                      onClick={() => setTestIsDealer(true)}
                      className={`px-3 py-1.5 transition ${
                        testIsDealer ? "bg-white/20" : "hover:bg-white/10"
                      }`}
                    >
                      You are dealer
                    </button>
                    <button
                      onClick={() => setTestIsDealer(false)}
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
                      onChange={(e) => setTestIncludeCrib(e.target.checked)}
                      className="h-4 w-4 rounded border-white/40 bg-slate-900 text-sky-400"
                    />
                    Include crib impact
                  </label>
                  <button
                    onClick={refreshTestHand}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow hover:-translate-y-[1px] hover:bg-white/20"
                  >
                    New random 6
                  </button>
                  {faceStyleToggle}
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
                {userTestChoice && (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200">
                        Keep
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {userTestChoice.keep.map((card) => (
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
                        {userTestChoice.discards.map((card) => (
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
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBestSolution((prev) => !prev)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        showBestSolution
                          ? "border-lime-200/60 bg-lime-500/20 text-lime-50"
                          : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                      } ${!bestTestSuggestion ? "opacity-50" : ""}`}
                    >
                      {showBestSolution ? "Hide best" : "Show best"}
                    </button>
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
                {bestTestSuggestion && showBestSolution && (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.9fr]">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-wide text-emerald-200">
                        Keep
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {bestTestSuggestion.keep.map((card) => (
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
                        {bestTestSuggestion.discards.map((card) => (
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
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
