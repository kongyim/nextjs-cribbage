"use client";

export type Suit = "♠" | "♥" | "♦" | "♣";
export type FaceStyle = "simple" | "original";

export type Card = {
  rank: string;
  value: number; // value for fifteens (face cards = 10, Ace = 1)
  order: number; // 1-13 for runs
  suit: Suit;
  id: string;
};

export type ScorePart = {
  label: string;
  points: number;
  detail: string[];
};

export type ScoreBreakdown = {
  total: number;
  parts: ScorePart[];
};

export type StarterScore = {
  card: Card;
  score: number;
};

export type DiscardSuggestion = {
  keep: Card[];
  discards: Card[];
  handAverage: number;
  cribAverage: number;
  expectedValue: number;
  bestStarters: StarterScore[];
};

export const RANKS: Array<{ label: string; value: number; order: number }> = [
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

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

export const SUIT_META: Record<
  Suit,
  { name: string; slug: "spades" | "hearts" | "diamonds" | "clubs"; color: string }
> = {
  "♠": { name: "Spades", slug: "spades", color: "text-slate-200" },
  "♥": { name: "Hearts", slug: "hearts", color: "text-red-200" },
  "♦": { name: "Diamonds", slug: "diamonds", color: "text-rose-200" },
  "♣": { name: "Clubs", slug: "clubs", color: "text-emerald-200" },
};

export const SUIT_ORDER: Record<Suit, number> = {
  "♠": 0,
  "♥": 1,
  "♦": 2,
  "♣": 3,
};

export const DECK: Card[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    rank: rank.label,
    value: rank.value,
    order: rank.order,
    suit,
    id: `${rank.label}${suit}`,
  })),
);

export function cardLabel(card: Card) {
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

export function cardImagePath(card: Card, faceStyle: FaceStyle) {
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
        .join("-");
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

function findFlushHandOnly(hand: Card[]): ScorePart {
  if (hand.length !== 4) {
    return {
      label: "Flush",
      points: 0,
      detail: ["Need exactly 4 hand cards to check for a flush."],
    };
  }

  const allSameSuit = hand.every((card) => card.suit === hand[0].suit);
  if (!allSameSuit) {
    return {
      label: "Flush",
      points: 0,
      detail: ["No flush (all 4 hand cards must share a suit)."],
    };
  }

  return {
    label: "Flush",
    points: 4,
    detail: ["4-card flush (no starter) = 4 pts"],
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

export function scoreHand(hand: Card[], starter: Card): ScoreBreakdown {
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

export function scoreHandWithoutStarter(hand: Card[]): ScoreBreakdown {
  const parts = [findFifteens(hand), findPairs(hand), findRuns(hand), findFlushHandOnly(hand)];
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

export function averageHandScores(hand: Card[], starterPool: Card[]) {
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

export function expectedCribValue(ourDiscards: Card[], starterPool: Card[], isDealer: boolean) {
  if (!starterPool.length) return 0;

  let total = 0;
  let count = 0;

  for (let i = 0; i < starterPool.length; i += 1) {
    const first = starterPool[i];
    for (let j = i + 1; j < starterPool.length; j += 1) {
      const second = starterPool[j];
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

export function evaluateDiscards(
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

export function sortCards(cards: Card[]) {
  return [...cards].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  });
}
