"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountTab } from "./components/CountTab";
import { DiscardTab } from "./components/DiscardTab";
import { FaceStyleToggle } from "./components/FaceStyleToggle";
import { TestTab } from "./components/TestTab";
import {
  Card,
  DECK,
  FaceStyle,
  SUITS,
  averageHandScores,
  evaluateDiscards,
  expectedCribValue,
  scoreHand,
  scoreHandWithoutStarter,
  sortCards,
  DiscardSuggestion,
} from "./lib/cards";
const ACTIVE_TAB_STORAGE_KEY = "cribbage-active-tab";
const DEALER_STORAGE_KEY = "cribbage-is-dealer";
const INCLUDE_CRIB_STORAGE_KEY = "cribbage-include-crib";
const FACE_STYLE_STORAGE_KEY = "cribbage-face-style";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"count" | "discard" | "test">("test");
  const [hand, setHand] = useState<Card[]>([]);
  const [starter, setStarter] = useState<Card | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [discardPick, setDiscardPick] = useState<Card[]>([]);
  const [discardNote, setDiscardNote] = useState<string | null>(null);
  const [discardSuggestions, setDiscardSuggestions] = useState<DiscardSuggestion[]>([]);
  const [discardLoading, setDiscardLoading] = useState(false);
  const [isDealer, setIsDealer] = useState(true);
  const [includeCrib, setIncludeCrib] = useState(true);
  const [testCards, setTestCards] = useState<Card[]>([]);
  const [testDiscards, setTestDiscards] = useState<Card[]>([]);
  const [testNote, setTestNote] = useState<string | null>(null);
  const [bestTestSuggestion, setBestTestSuggestion] = useState<DiscardSuggestion | null>(null);
  const [userTestChoice, setUserTestChoice] = useState<DiscardSuggestion | null>(null);
  const [testLoading, setTestLoading] = useState(false);
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

  const handOnlyBreakdown = useMemo(
    () => (hand.length === 4 ? scoreHandWithoutStarter(hand) : null),
    [hand],
  );

  const breakdown = useMemo(
    () => (hand.length === 4 && starter ? scoreHand(hand, starter) : null),
    [hand, starter],
  );

  const slotsFilled = hand.length === 4 && !!starter;

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
      setDiscardPick((prev) => {
        const next = prev.filter((c) => c.id !== card.id);
        setDiscardLoading(false);
        return next;
      });
      return;
    }

    if (discardPick.length < 6) {
      setDiscardPick((prev) => {
        const next = [...prev, card];
        if (next.length === 6) {
          setDiscardLoading(true);
        }
        return next;
      });
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
    setDiscardLoading(false);
  };

  const sendTestToDiscard = () => {
    if (testCards.length !== 6) return;
    setDiscardPick(sortCards(testCards));
    setDiscardNote(null);
    setDiscardLoading(true);
    setActiveTab("discard");
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
        setTestLoading(true);
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
    setTestCards(sortCards(randomSix()));
    setTestDiscards([]);
    setTestNote(null);
    setShowBestSolution(false);
  }, [randomSix]);

  const jumpToCountWithKeep = useCallback(
    (keep: Card[], starterCard: Card) => {
      setNote(null);
      setHand(sortCards(keep));
      setStarter(starterCard);
      setActiveTab("count");
    },
    [],
  );

  useEffect(() => {
    const storedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (storedTab === "count" || storedTab === "discard" || storedTab === "test") {
      setActiveTab(storedTab);
    }
    const storedDealer = localStorage.getItem(DEALER_STORAGE_KEY);
    if (storedDealer === "true" || storedDealer === "false") {
      setIsDealer(storedDealer === "true");
    }
    const storedIncludeCrib = localStorage.getItem(INCLUDE_CRIB_STORAGE_KEY);
    if (storedIncludeCrib === "true" || storedIncludeCrib === "false") {
      setIncludeCrib(storedIncludeCrib === "true");
    }
    const storedFaceStyle = localStorage.getItem(FACE_STYLE_STORAGE_KEY);
    if (storedFaceStyle === "simple" || storedFaceStyle === "original") {
      setFaceStyle(storedFaceStyle);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(DEALER_STORAGE_KEY, String(isDealer));
  }, [isDealer]);

  useEffect(() => {
    localStorage.setItem(INCLUDE_CRIB_STORAGE_KEY, String(includeCrib));
  }, [includeCrib]);

  useEffect(() => {
    localStorage.setItem(FACE_STYLE_STORAGE_KEY, faceStyle);
  }, [faceStyle]);

  useEffect(() => {
    if (discardPick.length !== 6) {
      setDiscardSuggestions([]);
      setDiscardLoading(false);
      return;
    }
    setDiscardLoading(true);
    let timeout: NodeJS.Timeout | null = null;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        setDiscardSuggestions(evaluateDiscards(discardPick, isDealer, includeCrib));
        setDiscardLoading(false);
      }, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [discardPick, includeCrib, isDealer]);

  useEffect(() => {
    if (testCards.length !== 6) {
      setBestTestSuggestion(null);
      setUserTestChoice(null);
      setTestLoading(false);
      return;
    }
    if (testDiscards.length < 2) {
      setBestTestSuggestion(null);
      setUserTestChoice(null);
      setTestLoading(false);
      return;
    }
    setTestLoading(true);
    let timeout: NodeJS.Timeout | null = null;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        const best = evaluateDiscards(testCards, isDealer, includeCrib)[0] ?? null;
        setBestTestSuggestion(best);

        const keep = testCards.filter((card) => !testDiscards.some((d) => d.id === card.id));
        const starterPool = DECK.filter((card) => !testCards.some((picked) => picked.id === card.id));
        const { average: handAverage, best: bestStarters } = averageHandScores(keep, starterPool);
        const cribAverage = includeCrib
          ? expectedCribValue(testDiscards, starterPool, isDealer)
          : 0;
        const expectedValue = includeCrib
          ? isDealer
            ? handAverage + cribAverage
            : handAverage - cribAverage
          : handAverage;
        const minHandScore = starterPool.length
          ? Math.min(...starterPool.map((starter) => scoreHand(keep, starter).total))
          : 0;

        setUserTestChoice({
          keep,
          discards: testDiscards,
          handAverage,
          cribAverage,
          expectedValue,
          bestStarters,
          minHandScore,
        });
        setTestLoading(false);
      }, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [includeCrib, isDealer, testCards, testDiscards]);

  useEffect(() => {
    if (activeTab === "test" && testCards.length === 0) {
      refreshTestHand();
    }
  }, [activeTab, refreshTestHand, testCards.length]);

  const faceStyleToggle = <FaceStyleToggle faceStyle={faceStyle} onChange={setFaceStyle} />;

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
          <CountTab
            cardsBySuit={cardsBySuit}
            hand={hand}
            starter={starter}
            note={note}
            faceStyle={faceStyle}
            faceStyleToggle={faceStyleToggle}
            selectedIds={selectedIds}
            handleToggleCountCard={handleToggleCountCard}
            handOnlyBreakdown={handOnlyBreakdown}
            breakdown={breakdown}
            slotsFilled={slotsFilled}
            picksRef={picksRef}
          />
        )}

        {activeTab === "discard" && (
          <DiscardTab
            cardsBySuit={cardsBySuit}
            discardPick={discardPick}
            discardNote={discardNote}
            discardSelectedIds={discardSelectedIds}
            handleToggleDiscardCard={handleToggleDiscardCard}
            faceStyle={faceStyle}
            faceStyleToggle={faceStyleToggle}
            isDealer={isDealer}
            includeCrib={includeCrib}
            onDealerChange={setIsDealer}
            onIncludeCribChange={setIncludeCrib}
            discardSuggestions={discardSuggestions}
            discardLoading={discardLoading}
            onStarterPick={jumpToCountWithKeep}
          />
        )}

        {activeTab === "test" && (
          <TestTab
            faceStyle={faceStyle}
            faceStyleToggle={faceStyleToggle}
            testCards={testCards}
            testDiscards={testDiscards}
            testNote={testNote}
            testSelectedIds={testSelectedIds}
            testIncludeCrib={includeCrib}
            testIsDealer={isDealer}
            showBestSolution={showBestSolution}
            bestTestSuggestion={bestTestSuggestion}
            userTestChoice={userTestChoice}
            handleToggleTestDiscard={handleToggleTestDiscard}
            refreshTestHand={refreshTestHand}
            onSetTestDealer={setIsDealer}
            onSetTestIncludeCrib={setIncludeCrib}
            onToggleShowBest={() => bestTestSuggestion && setShowBestSolution((prev) => !prev)}
            onSendToDiscard={sendTestToDiscard}
            testLoading={testLoading}
          />
        )}
      </div>
    </div>
  );
}
