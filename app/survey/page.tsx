"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { Header } from "@/components/layout/header";
import {
  FUTURE_PILLARS,
  loadSurveyTopics,
  saveSurveyTopics,
  type SurveySkillTopic,
} from "@/lib/future-curriculum-store";

const AFFILIATION_OPTIONS = [
  { id: "all", label: "ทุกกลุ่มหน่วยงาน", icon: "🌐" },
  { id: "sat_national", label: "สมาคมกีฬาแห่งประเทศไทย", icon: "🏛️" },
  { id: "sat_hq", label: "การกีฬาแห่งประเทศไทย (กกท.)", icon: "🏢" },
  { id: "sat_provincial", label: "สมาคมกีฬาแห่งจังหวัด", icon: "📍" },
  { id: "sat_fund", label: "กองทุนพัฒนาการกีฬาแห่งชาติ", icon: "💰" },
  { id: "external", label: "สโมสร / ภาคเอกชน / ทั่วไป", icon: "⚽" },
] as const;

export default function SurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-sm font-semibold text-gray-500">กำลังโหลดระบบสำรวจความคิดเห็น...</p>
        </div>
      }
    >
      <SurveyContent />
    </Suspense>
  );
}

function SurveyContent() {
  // State for survey topics
  const [topics, setTopics] = useState<SurveySkillTopic[]>([]);
  const [votedTopicIds, setVotedTopicIds] = useState<Record<string, boolean>>({});
  const [userAffiliation, setUserAffiliation] = useState<string>("all");

  // Filter & Search states
  const [selectedPillar, setSelectedPillar] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "latest">("votes");

  // Modals & Feedback states
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Suggest Form State
  const [suggestForm, setSuggestForm] = useState({
    title: "",
    category: "tech_ai" as SurveySkillTopic["category"],
    description: "",
    targetAudience: "",
    suggestedBy: "",
    suggestedOrg: "",
    keyProblemsSolved: "",
  });
  const [suggestFormSuccess, setSuggestFormSuccess] = useState(false);
  const [suggestFormError, setSuggestFormError] = useState("");

  // Load topics & user votes on mount
  useEffect(() => {
    const loaded = loadSurveyTopics();
    setTopics(loaded);

    try {
      const storedVotes = localStorage.getItem("sat_user_voted_topic_ids");
      if (storedVotes) {
        setVotedTopicIds(JSON.parse(storedVotes));
      }
      const storedAffil = localStorage.getItem("sat_user_survey_affil");
      if (storedAffil) {
        setUserAffiliation(storedAffil);
      }
    } catch {
      // ignore
    }
  }, []);

  // Generate QR code for the current survey URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const surveyUrl = `${origin}/survey`;

    QRCode.toDataURL(surveyUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#16265E",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrCodeUrl(url))
      .catch((e) => console.error("Error generating QR:", e));
  }, []);

  // Show auto-fading toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Handle Affiliation selection
  const handleSelectAffiliation = (affilId: string) => {
    setUserAffiliation(affilId);
    try {
      localStorage.setItem("sat_user_survey_affil", affilId);
    } catch {
      // ignore
    }
  };

  // Handle Vote (+1 or -1)
  const handleVote = (topicId: string, topicTitle: string) => {
    const isAlreadyVoted = Boolean(votedTopicIds[topicId]);
    const delta = isAlreadyVoted ? -1 : 1;

    const updated = topics.map((t) => {
      if (t.id === topicId) {
        return {
          ...t,
          votes: Math.max(0, t.votes + delta),
        };
      }
      return t;
    });

    const newVotedMap = {
      ...votedTopicIds,
      [topicId]: !isAlreadyVoted,
    };

    setTopics(updated);
    setVotedTopicIds(newVotedMap);
    saveSurveyTopics(updated);

    try {
      localStorage.setItem("sat_user_voted_topic_ids", JSON.stringify(newVotedMap));
    } catch {
      // ignore
    }

    if (!isAlreadyVoted) {
      showToast(`🎉 ขอบคุณที่ร่วมโหวต "${topicTitle.slice(0, 28)}..."`);
    } else {
      showToast(`ยกเลิกการโหวต "${topicTitle.slice(0, 28)}..."`);
    }
  };

  // Handle Submit New Topic
  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestForm.title.trim()) {
      setSuggestFormError("กรุณาระบุชื่อหัวข้อหลักสูตร");
      return;
    }
    if (!suggestForm.keyProblemsSolved.trim()) {
      setSuggestFormError("กรุณาระบุปัญหาที่พบในปัจจุบันหรือเหตุผลความจำเป็น");
      return;
    }

    const pillar = FUTURE_PILLARS.find((p) => p.key === suggestForm.category) || FUTURE_PILLARS[0];
    const affilLabel =
      AFFILIATION_OPTIONS.find((a) => a.id === userAffiliation && a.id !== "all")?.label ||
      suggestForm.suggestedOrg.trim() ||
      "บุคลากรกีฬา";

    const newTopic: SurveySkillTopic = {
      id: `custom-topic-${Date.now()}`,
      title: suggestForm.title.trim(),
      category: suggestForm.category,
      categoryLabel: pillar.label.split(" (")[0],
      categoryIcon: pillar.icon,
      description: suggestForm.description.trim() || suggestForm.title.trim(),
      targetAudience: suggestForm.targetAudience.trim() || "บุคลากรกีฬาและผู้เกี่ยวข้อง",
      votes: 1, // First vote by creator
      demandLevel: "emerging",
      suggestedBy: suggestForm.suggestedBy.trim() || "ผู้เสนอข้อคิดเห็น",
      suggestedOrg: affilLabel,
      createdAt: new Date().toISOString().split("T")[0],
      keyProblemsSolved: suggestForm.keyProblemsSolved.trim(),
    };

    const updated = [newTopic, ...topics];
    setTopics(updated);
    saveSurveyTopics(updated);

    const newVotedMap = { ...votedTopicIds, [newTopic.id]: true };
    setVotedTopicIds(newVotedMap);
    try {
      localStorage.setItem("sat_user_voted_topic_ids", JSON.stringify(newVotedMap));
    } catch {
      // ignore
    }

    setSuggestFormSuccess(true);
    setSuggestFormError("");
    setTimeout(() => {
      setSuggestFormSuccess(false);
      setIsSuggestModalOpen(false);
      setSuggestForm({
        title: "",
        category: "tech_ai",
        description: "",
        targetAudience: "",
        suggestedBy: "",
        suggestedOrg: "",
        keyProblemsSolved: "",
      });
      showToast("✨ บันทึกข้อเสนอของท่านเข้าสู่ระบบเรียบร้อยแล้ว!");
    }, 1000);
  };

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return topics
      .filter((t) => {
        const matchesPillar = selectedPillar === "all" || t.category === selectedPillar;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keyProblemsSolved.toLowerCase().includes(q) ||
          (t.suggestedOrg && t.suggestedOrg.toLowerCase().includes(q)) ||
          t.targetAudience.toLowerCase().includes(q);
        return matchesPillar && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "votes") return b.votes - a.votes;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [topics, selectedPillar, searchQuery, sortBy]);

  const totalVotesCount = useMemo(() => {
    return topics.reduce((acc, t) => acc + t.votes, 0);
  }, [topics]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/survey`);
    setCopiedLink(true);
    showToast("📋 คัดลอกลิงก์สำเร็จแล้ว!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#16265E] text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-blue-400 animate-in fade-in slide-in-from-top-4">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        rightSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              กลับสู่หน้าแรก
            </Link>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>📲</span>
              <span>แชร์ QR Code</span>
            </button>
          </div>
        }
      />

      {/* Main Container */}
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Hero Section */}
        <div className="rounded-3xl bg-gradient-to-br from-[#16265E] via-[#1e3a8a] to-[#0f172a] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden text-center sm:text-left">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>
          <div className="absolute right-1/4 -bottom-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-300/30 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-2xs">
                <span>🗳️</span>
                <span>ระบบสำรวจความต้องการบุคลากรกีฬา กกท. (SAT Voice Poll)</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                คุณอยากให้ กกท. เปิดสอนหลักสูตรใด?
              </h1>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                การกีฬาแห่งประเทศไทย (ฝ่ายพัฒนาบุคลากรกีฬา) ชวนคุณร่วมโหวตและเสนอทิศทางหลักสูตรยุคใหม่
                พ.ศ. 2570–2572 ทุกคะแนนเสียงมีผลโดยตรงต่อการจัดสรรงบประมาณและการออกแบบเนื้อหาอบรมจริง
              </p>

              {/* Quick live stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-blue-200">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>บันทึกเสียงสะท้อนแล้ว <strong>{totalVotesCount.toLocaleString()}</strong> โหวต</span>
                </span>
                <span>·</span>
                <span>เปิดให้โหวต <strong>{topics.length}</strong> หัวข้อ</span>
                <span>·</span>
                <span className="text-emerald-300 font-semibold">1 คน โหวตได้หลายหัวข้อ</span>
              </div>
            </div>

            {/* Suggest Topic CTA in Hero */}
            <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>✍️</span>
                <span>พิมพ์เสนอหัวข้อใหม่</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-xs"
              >
                <span>📲</span>
                <span>สแกน QR / แชร์แบบสำรวจ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 1: Affiliation Selector (Quick 1-Click Profile) */}
        <div className="rounded-2xl bg-white p-5 shadow-xs border border-gray-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏷️</span>
              <span>ขั้นที่ 1: โปรดเลือกกลุ่มสังกัดของคุณ (เพื่อช่วยให้ กกท. จัดสรรกลุ่มเป้าหมายได้ตรงจุด)</span>
            </h3>
            {userAffiliation !== "all" && (
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                ✓ บันทึกสังกัดของคุณแล้ว
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {AFFILIATION_OPTIONS.map((opt) => {
              const isSelected = userAffiliation === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectAffiliation(opt.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#16265E] bg-blue-50/80 text-[#16265E] shadow-2xs ring-2 ring-[#16265E]/20"
                      : "border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span className="text-xl mb-1">{opt.icon}</span>
                  <span className="text-[11px] font-bold leading-tight line-clamp-2">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Filters & Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>🎯</span>
              <span>ขั้นที่ 2: เลือกหัวข้อที่ท่านต้องการให้เปิดสอน แล้วกดปุ่ม &quot;โหวตหัวข้อนี้&quot;</span>
            </h3>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "votes" | "latest")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-hidden"
            >
              <option value="votes">เรียงตามคะแนนโหวต (สูงสุด)</option>
              <option value="latest">เรียงตามข้อเสนอล่าสุด</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 ค้นหาหัวข้อ, ทักษะที่สนใจ, หรือปัญหาที่อยากแก้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#16265E] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕ ล้างค้นหา
              </button>
            )}
          </div>

          {/* Pillar Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPillar("all")}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedPillar === "all"
                  ? "bg-[#16265E] text-white shadow-2xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              ทุกหมวด ({topics.length})
            </button>
            {FUTURE_PILLARS.map((p) => {
              const count = topics.filter((t) => t.category === p.key).length;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPillar(p.key)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedPillar === p.key
                      ? "bg-[#16265E] text-white shadow-2xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label.split(" (")[0]}</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Interactive Voting Cards Grid (Mobile-First) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredTopics.map((topic, idx) => {
            const hasVoted = Boolean(votedTopicIds[topic.id]);

            return (
              <div
                key={topic.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-md ${
                  hasVoted
                    ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/10"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="space-y-3">
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-[#16265E] flex items-center gap-1.5">
                      <span>{topic.categoryIcon}</span>
                      <span>{topic.categoryLabel}</span>
                    </span>

                    {hasVoted && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1 animate-in fade-in">
                        <span>✓</span>
                        <span>คุณร่วมโหวตแล้ว</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-extrabold text-gray-900 leading-snug">
                    {topic.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {topic.description}
                  </p>

                  {/* Key Problem Solved */}
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs space-y-1">
                    <p className="text-amber-950 font-medium leading-relaxed">
                      <strong className="text-amber-900 font-bold">ปัญหาที่พบในการทำงาน: </strong>
                      {topic.keyProblemsSolved}
                    </p>
                    <p className="text-[11px] text-amber-800/80">
                      <strong>กลุ่มเป้าหมาย:</strong> {topic.targetAudience}
                    </p>
                  </div>
                </div>

                {/* Submitter Info & Action Button */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500 min-w-0">
                    <p className="truncate font-semibold text-gray-700">
                      เสนอโดย: {topic.suggestedBy}
                    </p>
                    {topic.suggestedOrg && (
                      <p className="text-[10px] text-gray-400 truncate">
                        {topic.suggestedOrg}
                      </p>
                    )}
                  </div>

                  {/* Big Touch-friendly Vote Button */}
                  <button
                    type="button"
                    onClick={() => handleVote(topic.id, topic.title)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                      hasVoted
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                        : "bg-gradient-to-r from-[#16265E] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#2563eb] text-white"
                    }`}
                  >
                    <span>{hasVoted ? "✓ โหวตแล้ว" : "👍 โหวตหัวข้อนี้"}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        hasVoted ? "bg-white/20 text-white" : "bg-amber-400 text-slate-950"
                      }`}
                    >
                      {topic.votes}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 space-y-2">
            <p className="text-4xl">🔍</p>
            <p className="text-sm font-bold text-gray-700">ไม่พบหัวข้อที่ตรงกับการค้นหา</p>
            <p className="text-xs text-gray-500">
              ท่านสามารถเป็นผู้ริเริ่มเสนอหัวข้อนี้ได้ทันที โดยคลิกปุ่มด้านล่าง
            </p>
            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#16265E] text-white px-4 py-2 text-xs font-bold cursor-pointer"
            >
              <span>✍️</span>
              <span>เสนอหัวข้อใหม่</span>
            </button>
          </div>
        )}

        {/* Suggest Floating Action Banner for Mobile */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-[#16265E] text-sm">
              <span>💡</span>
              <span>ยังมีหัวข้ออื่นที่คุณอยากเรียนรู้แต่ยังไม่มีในรายการข้างต้น?</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              ร่วมส่งข้อเสนอแนะของคุณ เสียงของคุณจะถูกนำไปใช้วิเคราะห์และเป็นหลักฐานสำคัญในการเสนอของบประมาณจัดอบรม
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSuggestModalOpen(true)}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#16265E] hover:bg-[#1e3a8a] text-white px-5 py-3 text-xs sm:text-sm font-extrabold transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>✍️</span>
            <span>พิมพ์เสนอหัวข้อใหม่</span>
          </button>
        </div>
      </main>

      {/* Suggest Topic Modal */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#16265E] to-[#1e3a8a] text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="text-base font-bold">เสนอหัวข้อหลักสูตรที่อยากเรียนรู้</h3>
                  <p className="text-xs text-blue-200">
                    ร่วมกำหนดเนื้อหาหลักสูตร กกท. พ.ศ. 2570–2572
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSuggestSubmit} className="p-6 space-y-4 text-xs">
              {suggestFormSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <span className="text-4xl">🎉</span>
                  <h4 className="text-base font-bold text-emerald-700">
                    บันทึกข้อเสนอของท่านเรียบร้อยแล้ว!
                  </h4>
                  <p className="text-xs text-gray-600">
                    หัวข้อนี้ถูกเพิ่มเข้าสู่ระบบ และพร้อมให้บุคลากรท่านอื่นเข้ามาร่วมโหวต
                  </p>
                </div>
              ) : (
                <>
                  {suggestFormError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-medium">
                      ⚠️ {suggestFormError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold text-gray-800">
                      ชื่อหัวข้อหลักสูตรที่ต้องการเสนอ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น การใช้ AI วางแผนแท็กติก, กฎหมายสัญญานักกีฬา..."
                      value={suggestForm.title}
                      onChange={(e) => setSuggestForm({ ...suggestForm, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-gray-800">
                        หมวดหมู่ยุทธศาสตร์ <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={suggestForm.category}
                        onChange={(e) =>
                          setSuggestForm({
                            ...suggestForm,
                            category: e.target.value as SurveySkillTopic["category"],
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      >
                        {FUTURE_PILLARS.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.icon} {p.label.split(" (")[0]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-800">กลุ่มเป้าหมายผู้เข้ารับการอบรม</label>
                      <input
                        type="text"
                        placeholder="เช่น ผู้ฝึกสอน, กรรมการสมาคม, ผู้ตัดสิน..."
                        value={suggestForm.targetAudience}
                        onChange={(e) =>
                          setSuggestForm({ ...suggestForm, targetAudience: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-800">
                      ปัญหาที่พบในปัจจุบัน / เหตุผลที่ควรเปิดสอน <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="อธิบายปัญหาที่ท่านหรือองค์กรกำลังเผชิญอยู่ และหลักสูตรนี้จะช่วยแก้ปัญหาได้อย่างไร..."
                      value={suggestForm.keyProblemsSolved}
                      onChange={(e) =>
                        setSuggestForm({ ...suggestForm, keyProblemsSolved: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-gray-800">ชื่อผู้เสนอ / ตำแหน่ง</label>
                      <input
                        type="text"
                        placeholder="เช่น นายสมศักดิ์ (ผู้ฝึกสอน)"
                        value={suggestForm.suggestedBy}
                        onChange={(e) =>
                          setSuggestForm({ ...suggestForm, suggestedBy: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-800">หน่วยงานสังกัด</label>
                      <input
                        type="text"
                        placeholder="เช่น สมาคมกีฬาแห่งประเทศไทย, กกท. จ.เชียงใหม่..."
                        value={suggestForm.suggestedOrg}
                        onChange={(e) =>
                          setSuggestForm({ ...suggestForm, suggestedOrg: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-hidden focus:border-[#16265E]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsSuggestModalOpen(false)}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-[#16265E] hover:bg-[#1e3a8a] text-white px-5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      ✓ บันทึกข้อเสนอ
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Share / QR Code Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-center p-6 space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="inline-block p-2 rounded-2xl bg-blue-50 text-2xl">📲</span>
              <h3 className="text-base font-extrabold text-[#16265E]">
                สแกน QR Code ร่วมโหวตหลักสูตร
              </h3>
              <p className="text-xs text-gray-500">
                เปิดภาพนี้ให้เพื่อนบุคลากรหรือผู้เข้าอบรมสแกนจากโทรศัพท์มือถือ
              </p>
            </div>

            {/* QR Code image */}
            {qrCodeUrl && (
              <div className="flex justify-center p-3 bg-gray-50 rounded-2xl border border-gray-200">
                <Image
                  src={qrCodeUrl}
                  alt="QR Code สำหรับโหวตหลักสูตร กกท."
                  width={220}
                  height={220}
                  className="rounded-xl shadow-xs"
                  unoptimized
                />
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16265E] text-white py-2.5 text-xs font-bold hover:bg-[#1e3a8a] transition-colors cursor-pointer"
              >
                <span>{copiedLink ? "✓ คัดลอกแล้ว" : "📋 คัดลอกลิงก์แบบสำรวจ"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700">
          การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          ระบบสำรวจความคิดเห็นและยกระดับหลักสูตรบุคลากรกีฬาสมัยใหม่ พ.ศ. 2570–2572
        </p>
      </footer>
    </div>
  );
}
