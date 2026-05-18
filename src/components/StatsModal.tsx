import React, { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import {
  computeStats,
  computeStreak,
  type DailyHistory,
  type TripleHistory,
} from "../utilities/dailyStats";

type StatsTab = "daily" | "triple";

type StatsModalProps = {
  open: boolean;
  onClose: () => void;
  dailyHistory: DailyHistory;
  tripleHistory: TripleHistory;
  initialTab: StatsTab;
};

export const StatsModal = ({
  open,
  onClose,
  dailyHistory,
  tripleHistory,
  initialTab,
}: StatsModalProps) => {
  const [tab, setTab] = useState<StatsTab>(initialTab);
  // When the modal is re-opened, snap to whatever mode the user is in.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Statistics">
      <div className="wj-stats">
        <h2>Stats</h2>
        <div
          className="wj-stats__tabs"
          role="tablist"
          aria-label="Stats mode"
        >
          <button
            type="button"
            role="tab"
            aria-pressed={tab === "daily"}
            onClick={() => setTab("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            role="tab"
            aria-pressed={tab === "triple"}
            onClick={() => setTab("triple")}
          >
            Triple
          </button>
        </div>
        {tab === "daily" ? (
          <StatsPanel
            history={dailyHistory}
            unitLabel="moves"
            emptyText="Nothing recorded yet. Solve a daily and it shows up here."
            renderRecentSubject={(entry) => (
              <>
                <span>{entry.start}</span>
                <span className="wj-stats__arrow">→</span>
                <span>{entry.target}</span>
              </>
            )}
          />
        ) : (
          <StatsPanel
            history={tripleHistory}
            unitLabel="words"
            emptyText="Nothing recorded yet. Solve a triple and it shows up here."
            renderRecentSubject={(entry) => (
              <>
                <span>{entry.start}</span>
                <span className="wj-stats__arrow">→</span>
                <span>{entry.t1}</span>
                <span className="wj-stats__arrow-sep">·</span>
                <span>{entry.t2}</span>
              </>
            )}
          />
        )}
      </div>
    </Modal>
  );
};

type StatsPanelProps<T extends { userMoves: number; optimalMoves: number | null }> = {
  history: Record<string, T>;
  unitLabel: "moves" | "words";
  emptyText: string;
  renderRecentSubject: (entry: T) => React.ReactNode;
};

const StatsPanel = <T extends { userMoves: number; optimalMoves: number | null }>(
  { history, unitLabel, emptyText, renderRecentSubject }: StatsPanelProps<T>
) => {
  const streak = computeStreak(history);
  const stats = computeStats(history);
  const recent = Object.entries(history)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10);

  return (
    <>
      <div className="wj-stats__bignums">
        <div className="wj-stats__bignum">
          <div className="wj-stats__bignum-value">{streak}</div>
          <div className="wj-stats__bignum-label">day streak</div>
        </div>
        <div className="wj-stats__bignum">
          <div className="wj-stats__bignum-value">{stats.totalSolved}</div>
          <div className="wj-stats__bignum-label">total solved</div>
        </div>
        <div className="wj-stats__bignum">
          <div className="wj-stats__bignum-value">{stats.optimalOrBetter}</div>
          <div className="wj-stats__bignum-label">optimal or better</div>
        </div>
      </div>

      {stats.averageOverOptimal !== null && (
        <p className="wj-stats__summary">
          {(() => {
            const avg = stats.averageOverOptimal;
            const abs = Math.abs(avg);
            const rounded = abs.toFixed(1);
            const word =
              Math.abs(abs - 1) < 0.05
                ? unitLabel === "moves" ? "move" : "word"
                : unitLabel;
            if (abs < 0.05) {
              return (
                <>
                  On average, you hit{" "}
                  <strong>common-word optimal</strong> exactly.
                </>
              );
            }
            if (avg < 0) {
              return (
                <>
                  On average,{" "}
                  <strong>
                    {rounded} {word} under
                  </strong>{" "}
                  common-word optimal.
                </>
              );
            }
            return (
              <>
                On average,{" "}
                <strong>
                  {rounded} more {word}
                </strong>{" "}
                than common-word optimal.
              </>
            );
          })()}
        </p>
      )}

      {recent.length === 0 ? (
        <p className="wj-stats__empty">{emptyText}</p>
      ) : (
        <>
          <h3>Recent solves</h3>
          <table className="wj-stats__table">
            <tbody>
              {recent.map(([date, entry]) => {
                const diff =
                  entry.optimalMoves !== null
                    ? entry.userMoves - entry.optimalMoves
                    : null;
                return (
                  <tr key={date}>
                    <td className="wj-stats__td-date">{date}</td>
                    <td className="wj-stats__td-pair">
                      {renderRecentSubject(entry)}
                    </td>
                    <td className="wj-stats__td-moves">
                      {entry.userMoves} {unitLabel}
                      {diff !== null &&
                        (diff === 0 ? (
                          <span className="wj-stats__badge wj-stats__badge--good">
                            optimal
                          </span>
                        ) : diff < 0 ? (
                          <span className="wj-stats__badge wj-stats__badge--good">
                            −{-diff} under
                          </span>
                        ) : (
                          <span className="wj-stats__badge">+{diff}</span>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};
