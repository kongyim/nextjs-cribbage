"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerId = "p1" | "p2" | "p3";

type PlayerState = {
  id: PlayerId;
  name: string;
  score: number;
  backPegScore: number;
};

type HistoryEntry = {
  id: string;
  playerId: PlayerId;
  playerName: string;
  scoreToAdd: number;
  oldScore: number;
  oldBackPegScore: number;
  newScore: number;
  timestamp: number;
};

type Props = {
  onRegisterReset: (fn: () => void) => void;
};

type BoardSkin = "clear" | "classic" | "bar";

type StoredState = {
  players: PlayerState[];
  history: HistoryEntry[];
  currentIndex: number;
  boardSkin: BoardSkin;
  playerCount?: number;
};

const TOTAL_POINTS = 121;
const STORAGE_KEY = "cribbage-board-state";
const SCORE_BUTTONS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  20,
  21,
  22,
  23,
  24,
  28,
  29,
];
const BOARD_SKINS: BoardSkin[] = ["clear", "classic", "bar"];

const PLAYER_STYLES: Record<
  PlayerId,
  { peg: string; text: string; border: string; button: string; historyBg: string }
> = {
  p1: {
    peg: "bg-emerald-400",
    text: "text-emerald-200",
    border: "border-emerald-400/40",
    button: "bg-emerald-500/20 hover:bg-emerald-500/30",
    historyBg: "bg-emerald-500/10",
  },
  p2: {
    peg: "bg-sky-400",
    text: "text-sky-200",
    border: "border-sky-400/40",
    button: "bg-sky-500/20 hover:bg-sky-500/30",
    historyBg: "bg-sky-500/10",
  },
  p3: {
    peg: "bg-amber-400",
    text: "text-amber-200",
    border: "border-amber-400/40",
    button: "bg-amber-500/20 hover:bg-amber-500/30",
    historyBg: "bg-amber-500/10",
  },
};

const createInitialPlayers = (): PlayerState[] => [
  { id: "p1", name: "Player One", score: 0, backPegScore: -1 },
  { id: "p2", name: "Player Two", score: 0, backPegScore: -1 },
];

const createPlayersForCount = (count: number): PlayerState[] => {
  const base = createInitialPlayers();
  if (count === 3) {
    return [...base, { id: "p3", name: "Player Three", score: 0, backPegScore: -1 }];
  }
  return base;
};

const createInitialState = (count = 2): StoredState => ({
  players: createPlayersForCount(count),
  history: [],
  currentIndex: -1,
  boardSkin: "clear",
  playerCount: count,
});

const clampScore = (score: number) => Math.min(Math.max(score, -1), TOTAL_POINTS);
const BOARD_ROWS = 3;
const HOLES_PER_ROW = 40;
const BOARD_PADDING_X = 6;
const BOARD_PADDING_Y = 12;
const START_SLOT_X = 4;
const START_SLOT_OFFSETS = [-5, 5];
const PEG_OFFSET = 2.5;

const clampPercent = (value: number) => Math.min(Math.max(value, 2), 98);

const rowToPercent = (row: number) =>
  BOARD_PADDING_Y + (row * (100 - 2 * BOARD_PADDING_Y)) / (BOARD_ROWS - 1);

const colToPercent = (col: number) =>
  BOARD_PADDING_X + (col * (100 - 2 * BOARD_PADDING_X)) / (HOLES_PER_ROW - 1);

const getScorePosition = (score: number, offset = 0) => {
  if (score <= 0) {
    const offsetIndex = score <= -1 ? 0 : 1;
    const y = rowToPercent(0) + START_SLOT_OFFSETS[offsetIndex] + offset;
    return { left: START_SLOT_X, top: clampPercent(y) };
  }

  const bounded = Math.min(score, TOTAL_POINTS);
  if (bounded >= TOTAL_POINTS) {
    const x = colToPercent(HOLES_PER_ROW - 1) + 2;
    const y = rowToPercent(BOARD_ROWS - 1) + offset;
    return { left: clampPercent(x), top: clampPercent(y) };
  }

  const index = bounded - 1;
  const row = Math.floor(index / HOLES_PER_ROW);
  const baseCol = index % HOLES_PER_ROW;
  const col = row % 2 === 1 ? HOLES_PER_ROW - 1 - baseCol : baseCol;
  const x = colToPercent(col);
  const y = rowToPercent(row) + offset;
  return { left: clampPercent(x), top: clampPercent(y) };
};

export function ScoreBoardTab({ onRegisterReset }: Props) {
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<PlayerState[]>(() => createInitialPlayers());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [boardSkin, setBoardSkin] = useState<BoardSkin>("clear");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [draggingPlayer, setDraggingPlayer] = useState<PlayerId | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(currentIndex);
  const hasHydrated = useRef(false);
  const historyRef = useRef(history);
  const playersRef = useRef(players);
  const lastActionRef = useRef<"add" | "remove" | null>(null);
  const removedEntriesRef = useRef<{ entry: HistoryEntry; index: number; prevIndex: number }[]>(
    [],
  );
  const [removedCount, setRemovedCount] = useState(0);

  const boardSlots = useMemo(
    () => [-1, ...Array.from({ length: TOTAL_POINTS + 1 }, (_, i) => i)],
    [],
  );
  const scorePositions = useMemo(
    () => boardSlots.map((score) => ({ score, pos: getScorePosition(score) })),
    [boardSlots],
  );

  const winner = players.find((player) => player.score >= TOTAL_POINTS) ?? null;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const buildPlayersFromHistory = useCallback(
    (entries: HistoryEntry[], index: number, basePlayers: PlayerState[]) => {
      const map = new Map<PlayerId, PlayerState>();
      basePlayers.forEach((player) => {
        map.set(player.id, { ...player, score: 0, backPegScore: -1 });
      });
      for (let i = 0; i <= index; i += 1) {
        const entry = entries[i];
        if (!entry) continue;
        const player = map.get(entry.playerId);
        if (!player) continue;
        player.backPegScore = entry.oldScore;
        player.score = entry.newScore;
      }
      return Array.from(map.values());
    },
    [],
  );

  const addScore = useCallback(
    (playerId: PlayerId, points: number) => {
      if (points <= 0) return;

      const prevPlayers = playersRef.current;
      const winnerNow = prevPlayers.find((player) => player.score >= TOTAL_POINTS);
      if (winnerNow) return;
      const target = prevPlayers.find((player) => player.id === playerId);
      if (!target) return;

      const rawScore = target.score + points;
      let newScore = Math.min(TOTAL_POINTS, rawScore);
      const otherHasWon = prevPlayers.some(
        (player) => player.id !== playerId && player.score === TOTAL_POINTS,
      );
      if (newScore === TOTAL_POINTS && otherHasWon) {
        newScore = TOTAL_POINTS - 1;
      }

      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        playerId,
        playerName: target.name,
        scoreToAdd: points,
        oldScore: target.score,
        oldBackPegScore: target.backPegScore,
        newScore,
        timestamp: Date.now(),
      };

      lastActionRef.current = "add";
      setHistory((prevHistory) => {
        const trimmed = prevHistory.slice(0, currentIndexRef.current + 1);
        return [...trimmed, entry];
      });
      setCurrentIndex((prev) => {
        const next = prev + 1;
        currentIndexRef.current = next;
        return next;
      });

      const nextPlayers = prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, score: newScore, backPegScore: player.score }
          : player,
      );
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);
    },
    [],
  );

  const undo = useCallback(() => {
    if (lastActionRef.current === "remove" && removedEntriesRef.current.length > 0) {
      const lastRemoved = removedEntriesRef.current.pop();
      if (!lastRemoved) return;
      const nextHistory = [...historyRef.current];
      const insertIndex = Math.min(Math.max(lastRemoved.index, 0), nextHistory.length);
      nextHistory.splice(insertIndex, 0, lastRemoved.entry);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      currentIndexRef.current = lastRemoved.prevIndex;
      setCurrentIndex(lastRemoved.prevIndex);
      const nextPlayers = buildPlayersFromHistory(
        nextHistory,
        lastRemoved.prevIndex,
        playersRef.current,
      );
      playersRef.current = nextPlayers;
      setPlayers(nextPlayers);
      setRemovedCount(removedEntriesRef.current.length);
      lastActionRef.current = null;
      return;
    }
    const index = currentIndexRef.current;
    if (index < 0) return;
    const entry = historyRef.current[index];
    if (!entry) return;

    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === entry.playerId
          ? {
              ...player,
              score: entry.oldScore,
              backPegScore: entry.oldBackPegScore,
            }
          : player,
      ),
    );
    const next = index - 1;
    currentIndexRef.current = next;
    setCurrentIndex(next);
  }, []);

  const redo = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    const entry = historyRef.current[nextIndex];
    if (!entry) return;

    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === entry.playerId
          ? {
              ...player,
              score: entry.newScore,
              backPegScore: entry.oldScore,
            }
          : player,
      ),
    );
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
  }, []);

  const resetGame = useCallback(
    (nextCount?: number) => {
      const count = nextCount ?? playerCount;
      const nextState = createInitialState(count);
      setPlayerCount(count);
      setPlayers(nextState.players);
      setHistory(nextState.history);
      setCurrentIndex(nextState.currentIndex);
      setBoardSkin(nextState.boardSkin);
      removedEntriesRef.current = [];
      setRemovedCount(0);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
    [playerCount],
  );

  const handleNameChange = useCallback((playerId: PlayerId, name: string) => {
    const fallbackName =
      playerId === "p1" ? "Player One" : playerId === "p2" ? "Player Two" : "Player Three";
    const cleaned = name.trim() || fallbackName;
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId ? { ...player, name: cleaned } : player,
      ),
    );
    setHistory((prevHistory) =>
      prevHistory.map((entry) =>
        entry.playerId === playerId ? { ...entry, playerName: cleaned } : entry,
      ),
    );
  }, []);

  const formatTime = (timestamp: number) =>
    new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
      timestamp,
    );

  const formatSecondsAgo = (timestamp: number) => {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    return `${seconds}s ago`;
  };

  const boardSkinClass =
    boardSkin === "classic"
      ? "bg-[linear-gradient(145deg,#4b2e1c,#1f1208)]"
      : boardSkin === "bar"
        ? "bg-[linear-gradient(145deg,#0b1220,#020617)]"
        : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";

  const handleSave = useCallback(() => {
    try {
      const payload: StoredState = {
        players,
        history,
        currentIndex,
        boardSkin,
        playerCount,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(Date.now());
    } catch {
      // ignore
    }
  }, [boardSkin, currentIndex, history, playerCount, players]);

  useEffect(() => {
    onRegisterReset(() => resetGame());
  }, [onRegisterReset, resetGame]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<StoredState> | null;
        if (parsed && parsed.players && parsed.history) {
          const count = parsed.playerCount === 3 ? 3 : 2;
          setPlayerCount(count);
          const initialPlayers = createPlayersForCount(count);
          const parsedIds = new Set(parsed.players.map((player) => player.id));
          const nextPlayers = initialPlayers.map((player) => {
            const storedPlayer = parsed.players?.find((entry) => entry.id === player.id);
            return storedPlayer ? { ...player, name: storedPlayer.name } : player;
          });
          const filteredHistory =
            parsed.history?.filter((entry) => parsedIds.has(entry.playerId)) ?? [];
          setPlayers(nextPlayers);
          setHistory(filteredHistory);
          setCurrentIndex(typeof parsed.currentIndex === "number" ? parsed.currentIndex : -1);
          if (parsed.boardSkin && BOARD_SKINS.includes(parsed.boardSkin)) {
            setBoardSkin(parsed.boardSkin);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    handleSave();
  }, [handleSave]);

  useEffect(() => {
    if (!draggingPlayer) return;
    const handleUp = (event: PointerEvent) => {
      setDraggingPlayer(null);
      const target = players.find((player) => player.id === draggingPlayer);
      if (!target || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let bestScore = target.score;
      let bestDist = Number.POSITIVE_INFINITY;
      scorePositions.forEach((entry) => {
        const px = (entry.pos.left / 100) * rect.width;
        const py = (entry.pos.top / 100) * rect.height;
        const dx = px - x;
        const dy = py - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestScore = entry.score;
        }
      });
      const clamped = clampScore(bestScore);
      if (clamped > target.score) {
        addScore(target.id, clamped - target.score);
      }
    };

    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [addScore, draggingPlayer, players, scorePositions]);

  const handlePegPointerDown = (playerId: PlayerId) => (event: React.PointerEvent) => {
    if (winner) return;
    if (event.button !== 0) return;
    setDraggingPlayer(playerId);
  };

  const handleRemoveHistory = (entryId: string) => {
    const prevHistory = historyRef.current;
    const index = prevHistory.findIndex((entry) => entry.id === entryId);
    if (index === -1) return;
    const entry = prevHistory[index];
    const nextHistory = prevHistory.filter((_, idx) => idx !== index);
    const prevIndex = currentIndexRef.current;
    let nextIndex = prevIndex;
    if (index <= prevIndex) {
      nextIndex = prevIndex - 1;
    }
    removedEntriesRef.current.push({ entry, index, prevIndex });
    lastActionRef.current = "remove";
    setRemovedCount(removedEntriesRef.current.length);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    const nextPlayers = buildPlayersFromHistory(nextHistory, nextIndex, playersRef.current);
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      boardRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const renderDots = (player: PlayerState) => {
    const frontPegPos = getScorePosition(player.score, -PEG_OFFSET);
    const backPegPos = getScorePosition(player.backPegScore, PEG_OFFSET);
    return (
      <div className="relative h-[220px] sm:h-[240px]">
        {boardSlots.map((score) => {
          const canMove = score > player.score && score <= TOTAL_POINTS;
          const isFinish = score === TOTAL_POINTS;
          const pos = getScorePosition(score);
          return (
            <button
              type="button"
              key={`${player.id}-dot-${score}`}
              className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                PLAYER_STYLES[player.id].border
              } ${isFinish ? "bg-lime-400/40" : "bg-white/5"} ${
                canMove ? "hover:bg-white/20" : "opacity-40"
              }`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              onClick={() => canMove && addScore(player.id, score - player.score)}
              title={`${player.name} ${score}`}
            />
          );
        })}
        <div
          className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${PLAYER_STYLES[player.id].peg}`}
          style={{ left: `${frontPegPos.left}%`, top: `${frontPegPos.top}%` }}
        />
        <button
          type="button"
          onPointerDown={handlePegPointerDown(player.id)}
          className={`absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow ${PLAYER_STYLES[player.id].peg} ${
            winner ? "cursor-not-allowed" : "cursor-grab"
          }`}
          style={{ left: `${backPegPos.left}%`, top: `${backPegPos.top}%` }}
          aria-label={`${player.name} trailing peg`}
        />
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/50 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Online Cribbage Board</h2>
          <p className="mt-2 text-sm text-slate-300">
            Move pegs by dragging the trailing peg or tapping a score button. Every move is logged
            for undo and redo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetGame}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20"
          >
            New game
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20"
          >
            Fullscreen
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
        <span className="font-semibold text-emerald-300">Move:</span> Drag a back peg or tap a score button.
        <br />
        <span className="font-semibold text-emerald-300">Undo/Redo:</span> Use the buttons in the history panel.
        <br />
        <span className="font-semibold text-emerald-300">Edit Names:</span> Click a name to rename.
        <br />
        <span className="font-semibold text-emerald-300">Save:</span> Save a snapshot to this browser.
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Board</p>
              <h3 className="text-xl font-semibold text-white">121-hole track</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                First to 121 wins
              </div>
              <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
                <button
                  type="button"
                  onClick={() => resetGame(2)}
                  className={`px-3 py-1.5 transition ${playerCount === 2 ? "bg-white/20" : "hover:bg-white/10"}`}
                >
                  2 players
                </button>
                <button
                  type="button"
                  onClick={() => resetGame(3)}
                  className={`px-3 py-1.5 transition ${playerCount === 3 ? "bg-white/20" : "hover:bg-white/10"}`}
                >
                  3 players
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 lg:order-1 w-full">
              {players.map((player) => (
                <div key={`bar-${player.id}`} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className={PLAYER_STYLES[player.id].text}>{player.name}</span>
                    <span>{player.score} pts</span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-white/10">
                    {[0, 61, 91, 121].map((mark) => (
                      <span
                        key={`${player.id}-mark-${mark}`}
                        className="absolute top-0 h-full w-px bg-white/15"
                        style={{ left: `${(mark / TOTAL_POINTS) * 100}%` }}
                        aria-hidden
                      />
                    ))}
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full ${PLAYER_STYLES[player.id].peg}`}
                      style={{ width: `${(player.score / TOTAL_POINTS) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner lg:order-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={currentIndex < 0 && removedCount === 0}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={currentIndex >= history.length - 1}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                >
                  Redo
                </button>
                <span className="text-xs text-slate-300 whitespace-nowrap">{history.length} moves</span>
              </div>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-slate-300">No moves yet.</p>
              ) : (
                <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {[...history].reverse().map((entry, idx) => {
                    const actualIndex = history.length - 1 - idx;
                    const isUndone = actualIndex > currentIndex;
                    const playerStyle = PLAYER_STYLES[entry.playerId];
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-center justify-between rounded-lg border border-white/10 ${playerStyle.historyBg} px-3 py-2 text-sm text-slate-100 ${
                          isUndone ? "opacity-50" : ""
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{entry.playerName}</div>
                          <div className="text-xs text-slate-300 whitespace-nowrap">
                            +{entry.scoreToAdd} • {entry.oldScore} → {entry.newScore} •{" "}
                            {formatSecondsAgo(entry.timestamp)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300">
                            {entry.newScore >= TOTAL_POINTS ? "🏆" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHistory(entry.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
                            aria-label="Remove history entry"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {players.map((player) => (
            <div
              key={`${player.id}-controls`}
              className={`rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner ${PLAYER_STYLES[player.id].border}`}
            >
              <div className="flex items-center justify-between">
                <input
                  value={player.name}
                  onChange={(event) => handleNameChange(player.id, event.target.value)}
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none"
                />
                <div className="ml-3 text-sm text-slate-300 whitespace-nowrap">{player.score} pts</div>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {SCORE_BUTTONS.map((value) => (
                  <button
                    type="button"
                    key={`${player.id}-score-${value}`}
                    onClick={() => addScore(player.id, value)}
                    disabled={!!winner}
                    className={`rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-white ${
                      PLAYER_STYLES[player.id].button
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    +{value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
            <h4 className="text-lg font-semibold text-white">Save for later</h4>
            <p className="mt-2 text-sm text-slate-300">
              Save the current board to your browser. This auto-saves after every move.
            </p>
            <button
              type="button"
              onClick={handleSave}
              className="mt-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/20"
            >
              Save game
            </button>
            <div className="mt-2 text-xs text-slate-300">
              {lastSavedAt ? `Last saved at ${formatTime(lastSavedAt)}.` : "No saves yet."}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
            <h4 className="text-lg font-semibold text-white">Board style</h4>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-white">
              {BOARD_SKINS.map((skin) => (
                <label
                  key={skin}
                  className={`flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 ${
                    boardSkin === skin ? "bg-white/20" : "bg-white/10"
                  }`}
                >
                  <input
                    type="radio"
                    name="board-skin"
                    value={skin}
                    checked={boardSkin === skin}
                    onChange={() => setBoardSkin(skin)}
                    className="accent-emerald-300"
                  />
                  {skin}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
