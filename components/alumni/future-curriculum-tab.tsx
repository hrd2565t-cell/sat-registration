"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  FUTURE_PILLARS,
  PROPOSED_FUTURE_COURSES,
  loadSurveyTopics,
  saveSurveyTopics,
  type SurveySkillTopic,
  type ProposedCourseBlueprint,
} from "@/lib/future-curriculum-store";
import { FutureCurriculumPrintModal } from "./future-curriculum-print-modal";

interface FutureCurriculumTabProps {
  trainees: HistoricalTrainee[];
}

export function FutureCurriculumTab({ trainees }: FutureCurriculumTabProps) {
  // State for survey topics (loaded from localStorage with pre-seeded fallback)
  const [topics, setTopics] = useState<SurveySkillTopic[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [votedTopicIds, setVotedTopicIds] = useState<Record<string, boolean>>({});

  // Filter & Search states
  const [selectedPillar, setSelectedPillar] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "latest">("votes");

  // Modal states
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [surveyQrDataUrl, setSurveyQrDataUrl] = useState<string>("");
  const [isCopiedSurveyLink, setIsCopiedSurveyLink] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>("course-future-1");

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

  // Load topics from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    const loaded = loadSurveyTopics();
    setTopics(loaded);

    // Read existing user votes from localStorage if present
    try {
      const storedVotes = localStorage.getItem("sat_user_voted_topic_ids");
      if (storedVotes) {
        setVotedTopicIds(JSON.parse(storedVotes));
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      QRCode.toDataURL(`${origin}/survey`, {
        width: 320,
        margin: 2,
        color: { dark: "#16265E", light: "#ffffff" },
      })
        .then((url) => setSurveyQrDataUrl(url))
        .catch((e) => console.error("Error generating QR:", e));
    }
  }, []);

  // Handle upvoting (+1 vote)
  const handleVote = (topicId: string) => {
    const isAlreadyVoted = votedTopicIds[topicId];
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
  };

  // Handle new topic suggestion submission
  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestForm.title.trim()) {
      setSuggestFormError("กรุณาระบุหัวข้อหลักสูตรที่ต้องการเสนอ");
      return;
    }
    if (!suggestForm.keyProblemsSolved.trim()) {
      setSuggestFormError("กรุณาระบุปัญหาที่พบในปัจจุบันหรือเหตุผลความจำเป็น");
      return;
    }

    const pillar = FUTURE_PILLARS.find((p) => p.key === suggestForm.category) || FUTURE_PILLARS[0];

    const newTopic: SurveySkillTopic = {
      id: `custom-topic-${Date.now()}`,
      title: suggestForm.title.trim(),
      category: suggestForm.category,
      categoryLabel: pillar.label.split(" (")[0],
      categoryIcon: pillar.icon,
      description: suggestForm.description.trim() || suggestForm.title.trim(),
      targetAudience: suggestForm.targetAudience.trim() || "บุคลากรกีฬาและผู้เกี่ยวข้อง",
      votes: 1, // Start with submitter's vote
      demandLevel: "emerging",
      suggestedBy: suggestForm.suggestedBy.trim() || "ผู้เสนอข้อคิดเห็น",
      suggestedOrg: suggestForm.suggestedOrg.trim() || "หน่วยงานกีฬา",
      createdAt: new Date().toISOString().split("T")[0],
      keyProblemsSolved: suggestForm.keyProblemsSolved.trim(),
    };

    const updated = [newTopic, ...topics];
    setTopics(updated);
    saveSurveyTopics(updated);

    // mark as voted by creator
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
    }, 1200);
  };

  // Filtered & sorted survey topics
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

  // Aggregate stats
  const totalVotesAcrossSurvey = useMemo(() => {
    return topics.reduce((sum, t) => sum + t.votes, 0);
  }, [topics]);

  // Distinct individuals count from current trainees
  const distinctTraineesCount = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach((t) => {
      if (t.idCard) set.add(t.idCard.trim());
      else if (t.name) set.add(t.name.trim());
    });
    return set.size;
  }, [trainees]);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* 1. Header Banner & Executive Summary */}
      <div className="rounded-3xl bg-gradient-to-br from-[#16265E] via-[#1e3a8a] to-[#0f172a] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background decorative shapes */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 -bottom-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-1 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                <span>💡</span>
                <span>ยุทธศาสตร์การพัฒนาทรัพยากรมนุษย์กีฬาแห่งชาติ</span>
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>ความรับผิดชอบฝ่ายพัฒนาบุคลากร กกท. (100% Non-Overlap)</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              ทิศทางการพัฒนาและยกระดับหลักสูตรบุคลากรกีฬาสมัยใหม่ (พ.ศ. 2570 – 2572)
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              การวิเคราะห์เชิงลึกจากฐานข้อมูลผู้ผ่านการอบรม 17 หลักสูตรเดิม สังเคราะห์ร่วมกับผลสำรวจเสียงสะท้อนจริงจากบุคลากร
              5 กลุ่มหน่วยงาน เพื่อตอบโจทย์ผู้บริหาร กกท. ว่าหลักสูตรใหม่มีที่มาที่ไปอย่างไร มีความจำเป็นเร่งด่วนเพียงใด
              และไม่ซ้ำซ้อนกับฝ่ายวิทยาศาสตร์การกีฬา
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="เปิด QR Code หน้าโหวตสำหรับฉายขึ้นจอโปรเจกเตอร์หรือให้ผู้เข้าอบรมสแกน"
            >
              <span>📲</span>
              <span>QR Code หน้าโหวต (/survey)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>✍️</span>
              <span>เสนอหัวข้อที่อยากเรียนรู้</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-xs cursor-pointer backdrop-blur-xs"
            >
              <span>🖨️</span>
              <span>พิมพ์เอกสารนำเสนอผู้บริหาร</span>
            </button>
          </div>
        </div>

        {/* Strategic Metric Highlights Strip */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-white/15">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-2xs">
            <p className="text-[11px] font-medium text-blue-200">หลักสูตรประวัติศาสตร์เดิม</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">17 หลักสูตร</p>
            <p className="text-[10px] text-blue-300/80 mt-0.5">พ.ศ. 2547 – 2569 (เริ่มล้าสมัย)</p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-2xs">
            <p className="text-[11px] font-medium text-blue-200">พิมพ์เขียวหลักสูตรใหม่</p>
            <p className="text-xl sm:text-2xl font-black text-amber-300 mt-1">5 พิมพ์เขียว</p>
            <p className="text-[10px] text-amber-200/80 mt-0.5">พ.ศ. 2570 – 2572 พร้อมเปิดสอน</p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-2xs">
            <p className="text-[11px] font-medium text-blue-200">เสียงสะท้อนความต้องการจริง</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {totalVotesAcrossSurvey.toLocaleString()} เสียง
            </p>
            <p className="text-[10px] text-emerald-200/80 mt-0.5">จาก {topics.length} หัวข้อสำรวจในสนาม</p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 backdrop-blur-2xs">
            <p className="text-[11px] font-medium text-blue-200">ความซ้ำซ้อนภารกิจฝ่ายวิทย์</p>
            <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-1">0% (ปลอดภัย)</p>
            <p className="text-[10px] text-cyan-200/80 mt-0.5">จัดสรรงบประมาณผ่าน 100%</p>
          </div>
        </div>
      </div>

      {/* 2. Strategic Diagnostic: Why Current 17 Courses Need Modernization */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-gray-200 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
              การวินิจฉัยเชิงโครงสร้าง (Structural Diagnostic)
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
              <span>🔍</span>
              <span>ทำไม 17 หลักสูตรเดิมจึงต้องยกระดับ และบุคลากรสนามจริงขาดทักษะด้านใด?</span>
            </h3>
          </div>
          <span className="text-xs text-gray-500 italic">
            วิเคราะห์เปรียบเทียบสถิติผู้เข้าอบรม 5 กลุ่มหน่วยงาน (สมาคมกีฬา, กกท., สมาคมจังหวัด, กองทุนฯ, ภายนอก)
          </span>
        </div>

        {/* 3 Core Transformation Need Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-200 text-rose-900 font-black">
                1
              </span>
              <span>ช่องว่างด้านเทคโนโลยีและ AI</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              หลักสูตรผู้ฝึกสอนเดิมเน้นการอบรมเชิงทฤษฎีในสนามและการสังเกตด้วยสายตา แต่คู่แข่งระดับนานาชาติใช้
              <strong> AI Video Tracking, Biomechanical Sensors และ Data Analytics</strong>
              ในการแก้เกมแบบ Real-time โค้ชไทยส่วนใหญ่ขาดทักษะการแปลงสถิติตัวเลขให้เป็นแท็กติกการเล่น
            </p>
            <div className="rounded-lg bg-white/80 p-2.5 text-[11px] text-rose-950 border border-rose-200">
              <strong>สถิติสะท้อน:</strong> ได้รับคะแนนโหวตสูงสุดในแบบสำรวจ (อันดับ 1) โดยกว่า 85% ของสมาคมกีฬาเรียกร้อง
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-amber-900 font-black">
                2
              </span>
              <span>ความยั่งยืนทางการเงิน & การหารายได้</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              สมาคมกีฬาแห่งประเทศไทยและสมาคมกีฬาจังหวัดพึ่งพางบประมาณจาก กกท. และกองทุนฯ สูงถึง 80–90%
              หลักสูตรผู้บริหารเดิมยังขาดเนื้อหาการเจรจาสปอนเซอร์ภาคเอกชน การคำนวณ ROI การตลาดดิจิทัล และสิทธิประโยชน์สากล
            </p>
            <div className="rounded-lg bg-white/80 p-2.5 text-[11px] text-amber-950 border border-amber-200">
              <strong>สถิติสะท้อน:</strong> 318 โหวตจากกลุ่มผู้บริหารสมาคมกีฬา ต้องการพึ่งพาตนเองและลดภาระงบประมาณรัฐ
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-200 text-indigo-900 font-black">
                3
              </span>
              <span>ธรรมาภิบาล กฎหมาย และ Safe Sport</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              คณะกรรมการโอลิมปิกสากล (IOC) และสหพันธ์นานาชาติเพิ่มข้อกำหนดเรื่อง <strong>Safeguarding</strong>
              และการคุ้มครองนักกีฬาเยาวชน หากไม่มีเจ้าหน้าที่ที่ผ่านการรับรองจะไม่สามารถส่งแข่งขันได้ รวมทั้งปัญหาการบริหารงบประมาณผิดระเบียบราชการ
            </p>
            <div className="rounded-lg bg-white/80 p-2.5 text-[11px] text-indigo-950 border border-indigo-200">
              <strong>สถิติสะท้อน:</strong> ป้องกันการสูญเสียงบประมาณและยกระดับเกียรติภูมิองค์กรกีฬาสู่ระดับสากล
            </div>
          </div>
        </div>

        {/* Critical Mandate Clarification Notice (For Executives) */}
        <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🛡️</span>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                ข้อชี้แจงการจัดสรรงบประมาณและการแบ่งขอบเขตภารกิจ (Mandate Boundary Assurance)
              </h4>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                หลักสูตรที่เสนอทั้งหมด <strong>ไม่มีการบรรจุเนื้อหาด้านการทดสอบสมรรถภาพในห้องปฏิบัติการ กายภาพบำบัด หรือการฟื้นฟูทางการแพทย์</strong>
                เพื่อมิให้ทับซ้อนกับภารกิจของ <em>ฝ่ายวิทยาศาสตร์การกีฬา กกท.</em> ซึ่งรับผิดชอบกลุ่มนักวิทยาศาสตร์การกีฬาโดยเฉพาะ
                โดยข้อเสนอนี้มุ่งเป้าพัฒนา <strong>ผู้บริหาร, ผู้ฝึกสอนเชิงกลยุทธ์, ผู้ตัดสิน, เจ้าหน้าที่จัดการแข่งขัน และสมาคมกีฬาแห่งจังหวัด</strong> ตามอำนาจหน้าที่ของกองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศโดยตรง
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs whitespace-nowrap">
            อนุมัติงบฯ ได้ไม่ซ้ำซ้อน
          </span>
        </div>
      </div>

      {/* 3. The 5 Proposed Future Course Blueprints (พ.ศ. 2570 – 2572) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                แผนยุทธศาสตร์ 3 ปี
              </span>
              <h3 className="text-xl font-black text-gray-900">
                พิมพ์เขียว 5 หลักสูตรใหม่ กกท. (พ.ศ. 2570 – 2572)
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              คลิกที่แต่ละหลักสูตรเพื่อดูรายละเอียดโครงสร้างวิชา (4 โมดูล), วัตถุประสงค์เชิงพฤติกรรม, และผลสัมฤทธิ์ที่จับต้องได้
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>มีผลสำรวจสนับสนุนทุกหลักสูตร</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {PROPOSED_FUTURE_COURSES.map((course, idx) => {
            const isExpanded = expandedCourseId === course.id;

            return (
              <div
                key={course.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "bg-white border-[#16265E] shadow-md ring-1 ring-[#16265E]/15"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-2xs"
                }`}
              >
                {/* Course Header Bar */}
                <div
                  onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16265E] to-[#1e3a8a] text-white font-black text-base shadow-xs">
                      #{idx + 1}
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {course.code}
                        </span>
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                          แผนเสนอปี พ.ศ. {course.proposedYearBE}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          ⏱️ {course.durationHours} ชั่วโมง
                        </span>
                        <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {course.category}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-gray-900 leading-snug">
                        {course.titleTh}
                      </h4>
                      <p className="text-xs text-gray-500 italic font-sans">{course.titleEn}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                        <span>👍</span>
                        <span>{course.evidenceVotes} โหวตสนับสนุน</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{course.evidenceStat}</p>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      aria-label="ดูรายละเอียดหลักสูตร"
                    >
                      <span className="text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/40 p-5 sm:p-6 space-y-6 animate-in fade-in">
                    {/* Problem Statement & Rationale */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-red-900 text-xs">
                          <span>⚠️</span>
                          <span>ปัญหาและข้อจำกัดที่พบในปัจจุบัน (Problem Statement)</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {course.problemStatement}
                        </p>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                          <span>💡</span>
                          <span>เหตุผลความจำเป็นและความคุ้มค่า (Rationale & Value)</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {course.rationale}
                        </p>
                      </div>
                    </div>

                    {/* Target Groups & Strategic Alignment */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-xs font-bold text-gray-800">กลุ่มเป้าหมายผู้เข้ารับการอบรม: </span>
                        <span className="text-xs text-gray-600">
                          {course.targetGroups.join(" · ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <span>✓</span>
                        <span>{course.strategicAlignment}</span>
                      </div>
                    </div>

                    {/* 4 Core Modules Breakdown */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📚</span>
                          <span>โครงสร้าง 4 โมดูลการเรียนรู้ (Curriculum Modules)</span>
                        </h5>
                        <span className="text-xs text-gray-500 font-medium">
                          รวมทั้งสิ้น {course.durationHours} ชั่วโมง
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {course.coreModules.map((module) => (
                          <div
                            key={module.moduleNo}
                            className="rounded-xl bg-white p-3.5 border border-gray-200 shadow-2xs space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-[#16265E] bg-blue-50 px-2 py-0.5 rounded">
                                  โมดูลที่ {module.moduleNo}
                                </span>
                                <span className="font-semibold text-gray-500">{module.hours} ชม.</span>
                              </div>
                              <h6 className="text-xs font-bold text-gray-900 leading-snug">
                                {module.title}
                              </h6>
                              <p className="text-[11px] text-gray-600 mt-1 leading-normal">
                                {module.desc}
                              </p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                              <div
                                className="bg-[#16265E] h-1 rounded-full"
                                style={{
                                  width: `${Math.round((module.hours / course.durationHours) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expected Tangible Outcomes */}
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 space-y-2">
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>ผลสัมฤทธิ์ที่เป็นรูปธรรมต่อการพัฒนาบุคลากร (Tangible KPIs & Outcomes)</span>
                      </h5>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                        {course.expectedOutcomes.map((outcome, oIdx) => (
                          <li key={oIdx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Interactive Voice-of-Trainees Poll & Demand Survey */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-gray-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                คลังเสียงสะท้อนจริงจากบุคลากร
              </span>
              <span className="text-xs text-gray-400">· Interactive Feedback & Demand Poll</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              บุคลากรกีฬาอยากเรียนรู้อะไร? (Voice of Sports Personnel)
            </h3>
            <p className="text-xs text-gray-500">
              ทุกคะแนนโหวตและทุกข้อเสนอจะถูกจัดเก็บเข้าสู่ระบบ เพื่อเป็นฐานข้อมูลหลักฐาน (Evidence Base) เสนอผู้บริหาร กกท. ในการเปิดหลักสูตรใหม่
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSuggestModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#16265E] hover:bg-[#1e3a8a] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>💡</span>
            <span>เสนอหัวข้อหลักสูตรใหม่</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Pillar Filters */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedPillar("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                selectedPillar === "all"
                  ? "bg-[#16265E] text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ทั้งหมด ({topics.length})
            </button>
            {FUTURE_PILLARS.map((p) => {
              const count = topics.filter((t) => t.category === p.key).length;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPillar(p.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedPillar === p.key
                      ? "bg-[#16265E] text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label.split(" (")[0]}</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาหัวข้อ / ปัญหาที่แก้..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-[#16265E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "votes" | "latest")}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-hidden"
            >
              <option value="votes">เรียงตามคะแนนโหวต (สูงสุด)</option>
              <option value="latest">เรียงตามข้อเสนอล่าสุด</option>
            </select>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => {
            const hasVoted = Boolean(votedTopicIds[topic.id]);

            return (
              <div
                key={topic.id}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-[#16265E] flex items-center gap-1">
                      <span>{topic.categoryIcon}</span>
                      <span>{topic.categoryLabel}</span>
                    </span>

                    <span className="text-[10px] text-gray-400 font-mono">
                      พ.ศ. {parseInt(topic.createdAt.split("-")[0], 10) > 2500 ? topic.createdAt.split("-")[0] : parseInt(topic.createdAt.split("-")[0], 10) + 543}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 leading-snug">
                    {topic.title}
                  </h4>

                  <p className="text-xs text-gray-600 leading-relaxed">
                    {topic.description}
                  </p>

                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-xs space-y-1">
                    <p className="text-gray-700">
                      <strong className="text-rose-700">ปัญหาที่พบ/ต้องการให้แก้:</strong>{" "}
                      {topic.keyProblemsSolved}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      <strong>กลุ่มเป้าหมาย:</strong> {topic.targetAudience}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div className="text-[11px] text-gray-500">
                    เสนอโดย: <span className="font-semibold text-gray-700">{topic.suggestedBy}</span>
                    {topic.suggestedOrg && (
                      <span className="block text-[10px] text-gray-400 truncate max-w-[200px]">
                        ({topic.suggestedOrg})
                      </span>
                    )}
                  </div>

                  {/* Interactive Vote Button */}
                  <button
                    type="button"
                    onClick={() => handleVote(topic.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hasVoted
                        ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                        : "bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-gray-200"
                    }`}
                    title={hasVoted ? "คลิกเพื่อยกเลิกการโหวต" : "คลิกเพื่อให้คะแนนสนับสนุนหลักสูตรนี้"}
                  >
                    <span>{hasVoted ? "✓ โหวตแล้ว" : "👍 โหวตหัวข้อนี้"}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        hasVoted ? "bg-white/20 text-white" : "bg-gray-200 text-gray-800"
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
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-semibold">ไม่พบหัวข้อที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหาหรือคลิกปุ่ม &quot;เสนอหัวข้อหลักสูตรใหม่&quot;</p>
          </div>
        )}
      </div>

      {/* 5. Suggest New Topic Modal */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#16265E] to-[#1e3a8a] text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="text-base font-bold">เสนอหัวข้อหลักสูตรที่อยากเรียนรู้</h3>
                  <p className="text-xs text-blue-200">
                    ร่วมเป็นส่วนหนึ่งในการพัฒนาหลักสูตร กกท. ยุคใหม่ (ข้อมูลจะถูกจัดเก็บลงระบบทันที)
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
                    หัวข้อนี้ถูกเพิ่มเข้าสู่ผลสำรวจความต้องการ และพร้อมให้เพื่อนบุคลากรเข้ามาร่วมโหวต
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
                      placeholder="เช่น การใช้โดรนและเซนเซอร์บันทึกการเล่น, การทำสัญญานักกีฬาสากล..."
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
                      <label className="font-bold text-gray-800">
                        กลุ่มเป้าหมายผู้เข้ารับการอบรม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ผู้ฝึกสอน, ผู้ตัดสิน, เจ้าหน้าที่สมาคม..."
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
                      ปัญหาที่พบในปัจจุบัน / เหตุผลที่ควรมีหลักสูตรนี้ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="อธิบายว่าปัจจุบันประสบปัญหาอะไรในการทำงาน และหากมีหลักสูตรนี้จะช่วยแก้ไขอย่างไร..."
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
                        placeholder="เช่น นายสมศักดิ์ (โค้ชกีฬาแห่งชาติ)"
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

      {/* 6. Executive Proposal Document Print Preview Modal */}
      {isPrintModalOpen && (
        <FutureCurriculumPrintModal
          onClose={() => setIsPrintModalOpen(false)}
          surveyTopics={topics}
          courses={PROPOSED_FUTURE_COURSES}
          traineesCount={distinctTraineesCount}
        />
      )}

      {/* 7. QR Code Projector & Share Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-center p-6 sm:p-8 space-y-5 animate-in fade-in">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <span className="inline-block p-3 rounded-2xl bg-emerald-50 text-3xl">📲</span>
              <h3 className="text-lg font-black text-[#16265E]">
                QR Code สำหรับฉายขึ้นจอหรือให้สแกน
              </h3>
              <p className="text-xs text-gray-500">
                เปิดภาพนี้ขึ้นจอโปรเจกเตอร์ในห้องอบรม เพื่อให้ผู้เข้ารับการอบรมสแกนร่วมโหวตจากสมาร์ตโฟนได้ทันที
              </p>
            </div>

            {/* Large QR Display */}
            {surveyQrDataUrl ? (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <Image
                  src={surveyQrDataUrl}
                  alt="QR Code สำหรับโหวตหลักสูตร กกท."
                  width={260}
                  height={260}
                  className="rounded-xl shadow-xs"
                  unoptimized
                />
                <p className="text-[11px] font-mono font-bold text-gray-600 mt-2 bg-white px-3 py-1 rounded-full border border-gray-200">
                  /survey
                </p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                กำลังสร้าง QR Code...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/survey`);
                    setIsCopiedSurveyLink(true);
                    setTimeout(() => setIsCopiedSurveyLink(false), 2000);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span>{isCopiedSurveyLink ? "✓ คัดลอกแล้ว" : "📋 คัดลอกลิงก์"}</span>
              </button>

              <a
                href="/survey"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#16265E] hover:bg-[#1e3a8a] text-white py-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>🌐 เปิดหน้าโหวตจริง</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
