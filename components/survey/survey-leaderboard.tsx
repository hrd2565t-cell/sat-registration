"use client";

import { useMemo, useState } from "react";
import type { SurveySkillTopic } from "@/lib/future-curriculum-store";

interface SurveyLeaderboardProps {
  topics: SurveySkillTopic[];
  votedTopicIds: Record<string, boolean>;
  onVote: (id: string, title: string) => void;
}

export function SurveyLeaderboard({
  topics,
  votedTopicIds,
  onVote,
}: SurveyLeaderboardProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const topTopics = useMemo(() => {
    return [...topics].sort((a, b) => b.votes - a.votes).slice(0, 5);
  }, [topics]);

  const maxVotes = useMemo(() => {
    return Math.max(...topics.map((t) => t.votes), 1);
  }, [topics]);

  if (topics.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs text-lg">
            🏆
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5 flex-wrap">
              <span>กระดานจัดอันดับหลักสูตรยอดนิยม (Live Leaderboard)</span>
              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 text-[10px] font-extrabold animate-pulse">
                🔥 กำลังมาแรง
              </span>
            </h3>
            <p className="text-[11px] text-gray-500">
              5 ทักษะและหลักสูตรที่ได้รับคะแนนโหวตสูงสุดจากบุคลากรกีฬาทั่วประเทศในขณะนี้
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLeaderboard((prev) => !prev)}
          className="text-xs font-semibold text-[#16265E] hover:underline cursor-pointer shrink-0"
        >
          {showLeaderboard ? "ย่อกระดาน ▴" : "ขยายดูอันดับ ▾"}
        </button>
      </div>

      {/* Leaderboard Items */}
      {showLeaderboard && (
        <div className="space-y-2.5">
          {topTopics.map((item, index) => {
            const rankIcons = ["🥇", "🥈", "🥉", "4", "5"];
            const rankStyles = [
              "bg-amber-400 text-slate-950 font-black",
              "bg-slate-300 text-slate-900 font-bold",
              "bg-amber-600 text-white font-bold",
              "bg-gray-100 text-gray-700 font-bold",
              "bg-gray-100 text-gray-700 font-bold",
            ];
            const votePercentage = Math.round((item.votes / maxVotes) * 100);
            const hasVoted = Boolean(votedTopicIds[item.id]);

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-white p-3 border border-amber-100/90 shadow-2xs hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs shadow-2xs ${rankStyles[index]}`}
                  >
                    {rankIcons[index]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {item.title}
                      </p>
                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-[#16265E] border border-blue-100">
                        {item.categoryLabel}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#16265E] transition-all duration-500"
                          style={{ width: `${votePercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">
                        {votePercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#16265E] font-mono">
                      {item.votes.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-1">โหวต</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onVote(item.id, item.title)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                      hasVoted
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-[#16265E] text-white hover:bg-[#111e4a]"
                    }`}
                  >
                    <span>{hasVoted ? "✓ โหวตแล้ว" : "โหวต +1"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
