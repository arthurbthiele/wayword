import React from "react";
import { Modal } from "./ui/Modal";
import {
  computeStats,
  computeStreak,
  type DailyHistory,
} from "../utilities/dailyStats";

type StatsModalProps = {
  open: boolean;
  onClose: () => void;
  history: DailyHistory;
};

export const StatsModal = ({ open, onClose, history }: StatsModalProps) => {
  const streak = computeStreak(history);
  const stats = computeStats(history);
  const recent = Object.entries(history)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Daily statistics">
      <div className="wj-stats">
        <h2>Daily stats</h2>

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
            <div className="wj-stats__bignum-value">
              {stats.optimalOrBetter}
            </div>
            <div className="wj-stats__bignum-label">
              optimal or better
            </div>
          </div>
        </div>

        {stats.averageOverOptimal !== null && (
          <p className="wj-stats__summary">
            {(() => {
              const avg = stats.averageOverOptimal;
              const abs = Math.abs(avg);
              const rounded = abs.toFixed(1);
              const movesWord = Math.abs(abs - 1) < 0.05 ? "move" : "moves";
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
                      {rounded} {movesWord} under
                    </strong>{" "}
                    common-word optimal.
                  </>
                );
              }
              return (
                <>
                  On average,{" "}
                  <strong>
                    {rounded} more {movesWord}
                  </strong>{" "}
                  than common-word optimal.
                </>
              );
            })()}
          </p>
        )}

        {recent.length === 0 ? (
          <p className="wj-stats__empty">
            Nothing recorded yet. Solve a daily and it shows up here.
          </p>
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
                        <span>{entry.start}</span>
                        <span className="wj-stats__arrow">→</span>
                        <span>{entry.target}</span>
                      </td>
                      <td className="wj-stats__td-moves">
                        {entry.userMoves} moves
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
      </div>
    </Modal>
  );
};
