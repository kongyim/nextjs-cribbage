"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerCount = 2 | 3;

type PlayerPreset = {
  id: string;
  defaultName: string;
  pegClass: string;
  trailClass: string;
  badgeClass: string;
  glowClass: string;
  textClass: string;
  ringClass: string;
};

type PlayerBase = {
  id: string;
  name: string;
  preset: PlayerPreset;
};

type PlayerState = PlayerBase & {
  current: number;
  previous: number;
  moves: number;
  maxJump: number;
  totalAdded: number;
  trail: number;
  pegA: number;
  pegB: number;
};

type HistoryEntry = {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  before: number;
  after: number;
  timestamp: number;
};

type Props = {
  onRegisterReset: (fn: () => void) => void;
};

const STORAGE_KEY = "cribbage-board-state";

const PLAYER_PRESETS: PlayerPreset[] = [
  {
    id: "p1",
    defaultName: "Player 1",
    pegClass: "bg-rose-300 border-rose-100",
    trailClass: "bg-rose-700 border-rose-500",
    badgeClass: "bg-rose-500/15 border-rose-400/30 text-rose-50",
    glowClass: "shadow-rose-500/40",
    textClass: "text-rose-100",
    ringClass: "ring-rose-300/60",
  },
  {
    id: "p2",
    defaultName: "Player 2",
    pegClass: "bg-sky-300 border-sky-100",
    trailClass: "bg-sky-700 border-sky-500",
    badgeClass: "bg-sky-500/15 border-sky-400/30 text-sky-50",
    glowClass: "shadow-sky-500/40",
    textClass: "text-sky-100",
    ringClass: "ring-sky-300/60",
  },
  {
    id: "p3",
    defaultName: "Player 3",
    pegClass: "bg-emerald-300 border-emerald-100",
    trailClass: "bg-emerald-700 border-emerald-500",
    badgeClass: "bg-emerald-500/15 border-emerald-400/40 text-emerald-50",
    glowClass: "shadow-emerald-500/40",
    textClass: "text-emerald-100",
    ringClass: "ring-emerald-300/60",
  },
];

const TOTAL_POINTS = 121;
const SCORE_CHOICES = Array.from({ length: 29 }, (_, idx) => idx + 1);
const LANE_COLUMNS = 40;
const SEGMENT_SIZE = 40;
const SEGMENT_COUNT = 3;
const START_SLOT_OFFSETS = [-8, 8];
const LEFT_PADDING = 4;
const RIGHT_PADDING = 4;
const TOP_PADDING = 6;
const BOTTOM_PADDING = 6;

function buildPlayers(count: PlayerCount): PlayerBase[] {
  return PLAYER_PRESETS.slice(0, count).map((preset, idx) => ({
    id: preset.id,
    name: preset.defaultName.replace(/\d/, `${idx + 1}`),
    preset,
  }));
}

function computePlayerStates(players: PlayerBase[], history: HistoryEntry[]): PlayerState[] {
  return players.map((player) => {
    const entries = history.filter((entry) => entry.playerId === player.id);
    const lastEntry = entries[entries.length - 1];
    const moves = entries.length;
    const maxJump = entries.length ? Math.max(...entries.map((e) => e.amount)) : 0;
    const totalAdded = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const previousAfter =
      entries.length >= 2 ? entries[entries.length - 2].after : 0;
    const leadIsPegA = moves % 2 === 0;
    const leadScore = lastEntry ? lastEntry.after : 0;
    const trailScore = lastEntry ? previousAfter : 0;
    const pegA = leadIsPegA ? leadScore : trailScore;
    const pegB = leadIsPegA ? trailScore : leadScore;

    return {
      ...player,
      current: lastEntry ? lastEntry.after : 0,
      previous: previousAfter,
      trail: trailScore,
      pegA,
      pegB,
      moves,
      maxJump,
      totalAdded,
    };
  });
}

const columnLeftPercent = (colIndex: number) => {
  const clamped = Math.min(Math.max(colIndex, 0), LANE_COLUMNS - 1);
  const usable = 100 - LEFT_PADDING - RIGHT_PADDING;
  return LEFT_PADDING + (usable / Math.max(1, LANE_COLUMNS - 1)) * clamped;
};

const startSlotLeftPercent = (pegIdx: number) => 50 + (START_SLOT_OFFSETS[pegIdx] ?? 0);

export function ScoreBoardTab({ onRegisterReset }: Props) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [players, setPlayers] = useState<PlayerBase[]>(() => buildPlayers(2));
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const hasHydrated = useRef(false);

  const playerStates = useMemo(
    () => computePlayerStates(players, history),
    [players, history],
  );

  const totalLaneRows = useMemo(
    () => playerStates.length * (SEGMENT_COUNT + 1) + 1,
    [playerStates.length],
  );

  const rowTopPercent = useCallback(
    (rowIndex: number) => {
      const usable = 100 - TOP_PADDING - BOTTOM_PADDING;
      const top = TOP_PADDING + (rowIndex / Math.max(1, totalLaneRows - 1)) * usable;
      return Math.min(98, Math.max(2, top));
    },
    [totalLaneRows],
  );

  const laneRows = useMemo(() => {
    const rows: { type: "start" | "segment" | "finish"; playerIndex?: number; segment?: number }[] = [];
    for (let pIdx = 0; pIdx < playerStates.length; pIdx += 1) {
      rows.push({ type: "start", playerIndex: pIdx });
    }
    for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
      for (let pIdx = 0; pIdx < playerStates.length; pIdx += 1) {
        rows.push({ type: "segment", playerIndex: pIdx, segment });
      }
    }
    rows.push({ type: "finish" });
    return rows;
  }, [playerStates.length]);

  const presetLookup = useMemo(
    () =>
      players.reduce<Record<string, PlayerPreset>>((acc, player) => {
        acc[player.id] = player.preset;
        return acc;
      }, {}),
    [players],
  );

  const winningEntry = useMemo(
    () => history.find((entry) => entry.after >= TOTAL_POINTS) ?? null,
    [history],
  );

  const playerGridCols =
    playerStates.length === 2 ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  const resetGame = useCallback(
    (count?: PlayerCount) => {
      const nextCount = count ?? playerCount;
      const nextPlayers = buildPlayers(nextCount);
      setPlayerCount(nextCount);
      setPlayers(nextPlayers);
      setHistory([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
    [playerCount],
  );

  useEffect(() => {
    onRegisterReset(() => resetGame());
  }, [onRegisterReset, resetGame]);

  useEffect(() => {
    if (hasHydrated.current) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          playerCount?: number;
          players?: { id: string; name: string }[];
          history?: HistoryEntry[];
        } | null;
        if (parsed && parsed.playerCount && [2, 3].includes(parsed.playerCount)) {
          const basePlayers = buildPlayers(parsed.playerCount as PlayerCount);
          const hydratedPlayers = basePlayers.map((p) => {
            const storedPlayer = parsed.players?.find((sp) => sp.id === p.id);
            return storedPlayer ? { ...p, name: storedPlayer.name || p.name } : p;
          });
          const allowedIds = new Set(hydratedPlayers.map((p) => p.id));
          const hydratedHistory =
            parsed.history?.filter(
              (h) =>
                h &&
                typeof h.playerId === "string" &&
                allowedIds.has(h.playerId) &&
                typeof h.before === "number" &&
                typeof h.after === "number" &&
                typeof h.amount === "number",
            ) ?? [];
          setPlayerCount(parsed.playerCount as PlayerCount);
          setPlayers(hydratedPlayers);
          setHistory(hydratedHistory);
        }
      }
    } catch {
      // ignore hydration errors
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      const payload = JSON.stringify({
        playerCount,
        players: players.map(({ id, name }) => ({ id, name })),
        history,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // ignore write errors
    }
  }, [history, playerCount, players]);

  const handlePlayerCountChange = (count: PlayerCount) => {
    if (count === playerCount) return;
    resetGame(count);
  };

  const handleNameChange = (id: string, name: string) => {
    const cleaned = name.trim() || players.find((p) => p.id === id)?.preset.defaultName || "Player";
    setPlayers((prev) => prev.map((player) => (player.id === id ? { ...player, name: cleaned } : player)));
    setHistory((prev) =>
      prev.map((entry) => (entry.playerId === id ? { ...entry, playerName: cleaned } : entry)),
    );
  };

  const formatTime = (timestamp: number) =>
    new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(timestamp);

  const addScore = (playerId: string, amount: number) => {
    if (winningEntry) return;
    const player = playerStates.find((p) => p.id === playerId);
    if (!player) return;
    const before = player.current;
    const after = Math.min(TOTAL_POINTS, before + amount);
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      playerId: player.id,
      playerName: player.name,
      amount,
      before,
      after,
      timestamp: Date.now(),
    };
    setHistory((prev) => [...prev, entry]);
  };

  const undoLast = () => {
    if (!history.length) return;
    setHistory((prev) => prev.slice(0, -1));
  };

  const laneRowIndex = (playerIdx: number, score: number) => {
    if (score <= 0) return playerIdx;
    if (score >= TOTAL_POINTS) return totalLaneRows - 1;
    const segment = Math.floor((score - 1) / SEGMENT_SIZE);
    return playerStates.length + segment * playerStates.length + playerIdx;
  };

  const percentPosition = (score: number, playerIdx: number, peg: "A" | "B") => {
    if (score >= TOTAL_POINTS) {
      return { left: 50, top: rowTopPercent(totalLaneRows - 1) };
    }
    const top = rowTopPercent(laneRowIndex(playerIdx, score));
    if (score <= 0) {
      const pegIdx = peg === "A" ? 0 : 1;
      return { left: startSlotLeftPercent(pegIdx), top };
    }
    const withinSegment = (score - 1) % SEGMENT_SIZE;
    const left = columnLeftPercent(withinSegment);
    return { left, top };
  };

  const totalTurns = history.length;
  const biggestSwing = history.length ? Math.max(...history.map((entry) => entry.amount)) : 0;
  const totalPoints = history.reduce((sum, entry) => sum + entry.amount, 0);
  const averageTurn = totalTurns ? (totalPoints / totalTurns).toFixed(1) : "0";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/50 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Keep score on a board</h2>
          <p className="text-sm text-slate-300">
            Each player gets their own strip of +1 to +29 buttons. Tap to drop pegs down the classic
            121 track—every move is logged so you can undo mistakes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
            <button
              onClick={() => handlePlayerCountChange(2)}
              className={`px-3 py-1.5 transition ${playerCount === 2 ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              2 players
            </button>
            <button
              onClick={() => handlePlayerCountChange(3)}
              className={`px-3 py-1.5 transition ${playerCount === 3 ? "bg-white/20" : "hover:bg-white/10"}`}
            >
              3 players
            </button>
          </div>
          <button
            onClick={() => resetGame()}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-slate-950/40 transition hover:-translate-y-[1px] hover:bg-white/20"
          >
            Reset game
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-xl shadow-black/50">
            <div className="absolute inset-0 opacity-30" aria-hidden>
              <div className="absolute inset-10 rounded-[28px] border border-white/5 bg-gradient-to-br from-emerald-500/5 via-sky-500/5 to-indigo-500/5 blur-3xl" />
              <div className="absolute inset-4 rounded-[32px] border border-white/5" />
            </div>
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Board</p>
                  <h3 className="text-2xl font-bold text-white">121-hole track</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  First to 121 wins
                </div>
              </div>

              <div className="relative mx-auto h-[320px] w-full max-w-5xl overflow-hidden rounded-2xl border border-emerald-200/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-inner shadow-black/60">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 1px, transparent 1px, transparent 16px)",
                  }}
                  aria-hidden
                />
                <div className="absolute inset-0">
                  {laneRows.map((row, rowIdx) => {
                    const top = rowTopPercent(rowIdx);
                    if (row.type === "finish") {
                      return (
                        <div
                          key={`row-${rowIdx}`}
                          className="absolute left-0 right-0"
                          style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                        >
                          <div className="relative mx-auto h-12 w-12 rounded-full border border-lime-300/50 bg-lime-300/20">
                            <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-300/70 bg-lime-300/40" />
                          </div>
                        </div>
                      );
                    }

                    const player = row.playerIndex != null ? playerStates[row.playerIndex] : null;
                    const preset = player?.preset;
                    if (row.type === "start" && player) {
                      return (
                        <div
                          key={`row-${rowIdx}`}
                          className="absolute left-0 right-0"
                          style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                        >
                          <div className="relative mx-auto h-12 w-full max-w-3xl">
                            {START_SLOT_OFFSETS.map((_, pegIdx) => (
                              <span
                                key={`start-${rowIdx}-${pegIdx}`}
                                className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${preset?.pegClass ?? "border-white/20 bg-white/10"}`}
                                style={{ left: `${startSlotLeftPercent(pegIdx)}%` }}
                                aria-hidden
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (row.type === "segment" && player && row.segment !== undefined) {
                      const dividers = Array.from(
                        { length: LANE_COLUMNS / 5 - 1 },
                        (_, groupIdx) => (groupIdx + 1) * 5,
                      );
                      const scoreRangeStart = row.segment * SEGMENT_SIZE + 1;
                      const scoreRangeEnd = scoreRangeStart + SEGMENT_SIZE - 1;

                      return (
                        <div
                          key={`row-${rowIdx}`}
                          className="absolute left-0 right-0"
                          style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                        >
                          <div className="relative mx-auto h-12 w-full max-w-5xl">
                            {dividers.map((divider) => (
                              <span
                                key={`divider-${rowIdx}-${divider}`}
                                className="absolute top-1 bottom-1 w-px bg-white/15"
                                style={{ left: `${columnLeftPercent(divider - 0.5)}%` }}
                                aria-hidden
                              />
                            ))}
                            {Array.from({ length: LANE_COLUMNS }, (_, colIdx) => {
                              const left = columnLeftPercent(colIdx);
                              const scoreLabel = scoreRangeStart + colIdx;
                              return (
                                <span
                                  key={`hole-${rowIdx}-${colIdx}`}
                                  title={`${player.name} score ${scoreLabel}`}
                                  className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-sm ${preset?.trailClass ?? "border-white/20 bg-white/10"}`}
                                  style={{ left: `${left}%` }}
                                  aria-hidden
                                />
                              );
                            })}
                            <div className="absolute left-0 top-0 text-[11px] uppercase tracking-wide text-slate-300">
                              {player.name} • {scoreRangeStart}–{scoreRangeEnd}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                <div
                  className="absolute rounded-full bg-slate-800/80 px-2 py-1 text-[11px] font-semibold text-slate-200"
                  style={{
                    left: "50%",
                    top: `${Math.max(2, rowTopPercent(0) - 5)}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  Start
                </div>
                <div
                  className="absolute rounded-full bg-lime-400/20 px-2 py-1 text-[11px] font-semibold text-lime-100 ring-1 ring-lime-200/50"
                  style={{
                    left: "50%",
                    top: `${Math.min(98, rowTopPercent(totalLaneRows - 1) + 4)}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  Finish
                </div>

                {playerStates.map((player, idx) => {
                  const pegAPos = percentPosition(player.pegA, idx, "A");
                  const pegBPos = percentPosition(player.pegB, idx, "B");
                  const finishPeg = player.current >= TOTAL_POINTS;
                  const pegAOffset = finishPeg ? { x: 0, y: 0 } : { x: 0, y: 0 };
                  const pegBOffset = finishPeg ? { x: 0, y: 0 } : { x: 0, y: 0 };
                  return (
                    <div key={player.id}>
                      <div
                        className="absolute z-20"
                        style={{
                          left: `${pegAPos.left}%`,
                          top: `${pegAPos.top}%`,
                          transition: "left 0.35s ease, top 0.35s ease",
                        }}
                      >
                        <div
                          className={`h-4 w-4 rounded-full border-2 ${player.preset.pegClass} ${player.preset.glowClass}`}
                          style={{
                            transform: `translate(-50%, -50%) translateX(${pegAOffset.x}px) translateY(${pegAOffset.y}px)`,
                          }}
                          title={`${player.name} peg A`}
                        />
                      </div>
                      <div
                        className="absolute z-10"
                        style={{
                          left: `${pegBPos.left}%`,
                          top: `${pegBPos.top}%`,
                          transition: "left 0.35s ease, top 0.35s ease",
                        }}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded-full border-2 opacity-80 ${player.preset.trailClass}`}
                          style={{
                            transform: `translate(-50%, -50%) translateX(${pegBOffset.x - 4}px) translateY(${pegBOffset.y + 3}px)`,
                          }}
                          title={`${player.name} peg B`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className={`grid gap-3 ${playerGridCols}`}>
                  {playerStates.map((player) => (
                    <div
                      key={player.id}
                      className={`h-full rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30 ring-1 ${player.preset.ringClass}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-full border ${player.preset.pegClass}`}
                            aria-hidden
                          />
                          <input
                            value={player.name}
                            onChange={(e) => handleNameChange(player.id, e.target.value)}
                            className="bg-transparent text-sm font-semibold text-white outline-none"
                          />
                        </div>
                        <div className="text-right text-xs text-slate-200">
                          <div className="font-semibold text-white">
                            {player.current} / {TOTAL_POINTS}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Last peg at {player.previous}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {SCORE_CHOICES.map((value) => (
                          <button
                            key={`${player.id}-${value}`}
                            onClick={() => addScore(player.id, value)}
                            disabled={!!winningEntry}
                            className="rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-center text-sm font-semibold text-white shadow-sm shadow-black/40 transition hover:-translate-y-[1px] hover:bg-white/20 hover:shadow-black/60 disabled:cursor-not-allowed disabled:opacity-50"
                            title={`Add +${value} to ${player.name}`}
                          >
                            +{value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200 shadow-inner shadow-black/30">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-lime-300" />
                    <span>
                      {winningEntry
                        ? `${winningEntry.playerName} sealed it with +${winningEntry.amount}.`
                        : "Tap a button under a player to add that many points."}
                    </span>
                  </div>
                  <button
                    onClick={undoLast}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm shadow-black/50 transition hover:bg-white/20"
                  >
                    Undo last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Score history</h4>
              <span className="text-xs text-slate-300">{history.length} records</span>
            </div>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-300">
                Every tap is logged here. Add a score to see the trail.
              </p>
            ) : (
              <ul className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {[...history].reverse().map((entry) => {
                  const preset = presetLookup[entry.playerId];
                  return (
                    <li
                      key={entry.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 ring-1 ${preset?.ringClass ?? "ring-white/5"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full border ${preset?.pegClass ?? "border-white/20 bg-white/20"}`}
                          aria-hidden
                        />
                        <div>
                          <div className={`font-semibold ${preset?.textClass ?? ""}`}>
                            {entry.playerName}
                          </div>
                          <div className="text-xs text-slate-300">
                            {entry.before} → {entry.after} • {formatTime(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${preset?.badgeClass ?? "border-white/10 bg-white/10 text-white"}`}
                        >
                          +{entry.amount}
                        </span>
                        <div className="text-xs font-semibold text-lime-200">
                          {entry.after >= TOTAL_POINTS ? "🏆" : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-slate-900 p-4 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">
                {winningEntry ? "Game over" : "Game stats"}
              </h4>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-200">
                {totalTurns} turns
              </span>
            </div>
            {winningEntry ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-lime-100">
                  Congratulations, {winningEntry.playerName}! You hit 121 with a +{winningEntry.amount} move.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-100">
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-300">Last step</div>
                    <div className="text-base font-semibold text-white">
                      {winningEntry.before} → {winningEntry.after}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-300">Timeline</div>
                    <div className="text-base font-semibold text-white">{totalTurns} logged moves</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-200">
                Track every peg leap. First to 121 wins—no need to count holes, the board will do it.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-100">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-300">Biggest jump</div>
                <div className="text-base font-semibold text-white">+{biggestSwing || 0}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-slate-300">Average turn</div>
                <div className="text-base font-semibold text-white">+{averageTurn}</div>
              </div>
              {playerStates.map((player) => (
                <div
                  key={`stat-${player.id}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full border ${player.preset.pegClass}`} />
                    <div className="text-[11px] uppercase tracking-wide text-slate-300">
                      {player.name}
                    </div>
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {player.current} pts • {player.moves || 0} moves
                  </div>
                  <div className="text-xs text-slate-300">
                    Longest leap +{player.maxJump || 0} • Total +{player.totalAdded}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
