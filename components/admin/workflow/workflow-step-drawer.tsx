"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { compressImageFile } from "@/lib/image-compression";
import {
  WORKFLOW_PHASES,
  WORKFLOW_STATUS_META,
  formatThaiShortDate,
  isSafeWorkflowAttachmentUrl,
  isStepOverdue,
  type WorkflowAttachment,
  type WorkflowChecklistItem,
  type WorkflowConnection,
  type WorkflowLiveMetricDisplay,
  type WorkflowPhaseId,
  type WorkflowStep,
  type WorkflowStepStatus,
} from "@/lib/workflow";

interface WorkflowStepDrawerProps {
  step: WorkflowStep;
  allSteps: WorkflowStep[];
  fiscalYearBE: string;
  liveMetric?: WorkflowLiveMetricDisplay | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onClose: () => void;
  onSaveStep: (updated: WorkflowStep) => Promise<void>;
  onMoveStep: (stepId: string, direction: "up" | "down") => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

function cleanupWorkflowFiles(paths: string[]) {
  if (paths.length === 0 || typeof window === "undefined") return;
  void fetch("/api/admin/workflow/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    keepalive: true,
    body: JSON.stringify({ storagePaths: paths }),
  }).catch(() => {
    // Best-effort orphan cleanup
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string, fallbackType: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header?.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackType;
  const binStr = window.atob(base64 || "");
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

const STATUS_OPTIONS: WorkflowStepStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "completed",
];

export function WorkflowStepDrawer({
  step,
  allSteps,
  fiscalYearBE,
  liveMetric,
  canMoveUp,
  canMoveDown,
  onClose,
  onSaveStep,
  onMoveStep,
  onDeleteStep,
}: WorkflowStepDrawerProps) {
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const [phase, setPhase] = useState<WorkflowPhaseId>(step.phase);
  const [status, setStatus] = useState<WorkflowStepStatus>(step.status);
  const [assignee, setAssignee] = useState(step.assignee);
  const [dueDate, setDueDate] = useState(step.dueDate);
  const [notes, setNotes] = useState(step.notes);
  const [checklist, setChecklist] = useState<WorkflowChecklistItem[]>(
    step.checklist
  );
  const [newCheckItem, setNewCheckItem] = useState("");
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [editingCheckText, setEditingCheckText] = useState("");
  const [draggedCheckIndex, setDraggedCheckIndex] = useState<number | null>(
    null
  );
  const [dragOverCheckIndex, setDragOverCheckIndex] = useState<number | null>(
    null
  );
  const [attachingCheckId, setAttachingCheckId] = useState<string | null>(null);
  const [attachTab, setAttachTab] = useState<"link" | "file">("link");
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [connections, setConnections] = useState<WorkflowConnection[]>(
    step.connections || []
  );
  const [newConnTargetId, setNewConnTargetId] = useState("");
  const [newConnLabel, setNewConnLabel] = useState("");
  const [newConnStyle, setNewConnStyle] = useState<"dashed" | "solid">("dashed");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveLockRef = useRef(false);
  const uploadLockRef = useRef(false);
  const editingCheckIdRef = useRef<string | null>(null);
  const newlyUploadedPathsRef = useRef<string[]>([]);
  const removedPathsRef = useRef<string[]>([]);

  const handleCloseWithoutSave = useCallback(() => {
    if (newlyUploadedPathsRef.current.length > 0) {
      cleanupWorkflowFiles(newlyUploadedPathsRef.current);
      newlyUploadedPathsRef.current = [];
    }
    removedPathsRef.current = [];
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingCheckIdRef.current) {
        editingCheckIdRef.current = null;
        setEditingCheckId(null);
        setEditingCheckText("");
        return;
      }
      if (!saveLockRef.current && !uploadLockRef.current) {
        handleCloseWithoutSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseWithoutSave]);

  const checklistDoneCount = checklist.filter((c) => c.done).length;
  const overdue = isStepOverdue({ dueDate, status });

  const handleAddChecklistItem = () => {
    const text = newCheckItem.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        done: false,
      },
    ]);
    setNewCheckItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      )
    );
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    const target = checklist.find((item) => item.id === itemId);
    if (target?.attachments) {
      for (const att of target.attachments) {
        if (att.kind === "file" && att.storagePath) {
          if (newlyUploadedPathsRef.current.includes(att.storagePath)) {
            newlyUploadedPathsRef.current = newlyUploadedPathsRef.current.filter(
              (p) => p !== att.storagePath
            );
            cleanupWorkflowFiles([att.storagePath]);
          } else {
            removedPathsRef.current.push(att.storagePath);
          }
        }
      }
    }
    if (editingCheckIdRef.current === itemId) {
      editingCheckIdRef.current = null;
      setEditingCheckId(null);
      setEditingCheckText("");
    }
    if (attachingCheckId === itemId) {
      setAttachingCheckId(null);
      setAttachError(null);
    }
    setChecklist((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleToggleAttachPanel = (itemId: string) => {
    if (attachingCheckId === itemId) {
      setAttachingCheckId(null);
      setAttachError(null);
      return;
    }
    setAttachingCheckId(itemId);
    setAttachTab("link");
    setLinkName("");
    setLinkUrl("");
    setUploadLabel("");
    setAttachError(null);
  };

  const appendAttachmentToItem = (
    itemId: string,
    attachment: WorkflowAttachment
  ) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = Array.isArray(item.attachments) ? item.attachments : [];
        return {
          ...item,
          attachments: [...current, attachment].slice(0, 10),
        };
      })
    );
  };

  const handleAddLinkAttachment = (itemId: string) => {
    setAttachError(null);
    const trimmedUrl = linkUrl.trim();
    if (!isSafeWorkflowAttachmentUrl(trimmedUrl)) {
      setAttachError(
        "กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https:// หรือ http:// (เช่น ลิงก์ Google Drive)"
      );
      return;
    }
    const displayName = linkName.trim() || "เอกสารประกอบ (ลิงก์ภายนอก)";
    const att: WorkflowAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: "link",
      name: displayName.slice(0, 140),
      url: trimmedUrl,
      uploadedAt: new Date().toISOString(),
    };
    appendAttachmentToItem(itemId, att);
    setLinkName("");
    setLinkUrl("");
    setAttachingCheckId(null);
  };

  const handleUploadFileAttachment = async (
    itemId: string,
    rawFile: File | null | undefined
  ) => {
    if (!rawFile || uploadLockRef.current) return;
    setAttachError(null);

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(rawFile.type)) {
      setAttachError(
        "อัปโหลดตรงรองรับเฉพาะ PDF หรือรูปภาพ (JPG/PNG) หากเป็น Word/Excel แนะนำฝากใน Google Drive แล้วแปะลิงก์ครับ"
      );
      return;
    }

    uploadLockRef.current = true;
    setIsUploadingFile(true);
    try {
      let fileToUpload = rawFile;
      if (rawFile.type.startsWith("image/")) {
        const dataUrl = await readFileAsDataUrl(rawFile);
        const compressed = await compressImageFile(
          {
            name: rawFile.name,
            size: "",
            dataUrl,
            type: rawFile.type,
          },
          "document"
        );
        if (compressed.dataUrl && compressed.dataUrl.startsWith("data:")) {
          const blob = dataUrlToBlob(compressed.dataUrl, rawFile.type);
          fileToUpload = new File([blob], compressed.name || rawFile.name, {
            type: compressed.type || rawFile.type,
          });
        }
      }

      if (fileToUpload.size > MAX_UPLOAD_BYTES) {
        setAttachError(
          "ขนาดไฟล์เกิน 4 MB แนะนำให้อัปโหลดลง Google Drive แล้วใช้แท็บ \"แปะลิงก์ Google Drive\" แทน (ไม่กินพื้นที่ระบบ)"
        );
        return;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("fiscalYearBE", fiscalYearBE);
      if (uploadLabel.trim()) {
        formData.append("label", uploadLabel.trim());
      }

      const res = await fetch("/api/admin/workflow/files", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        attachment?: WorkflowAttachment;
        error?: string;
      };

      if (!res.ok || !body.ok || !body.attachment) {
        setAttachError(body.error || "อัปโหลดไฟล์ไม่สำเร็จ");
        return;
      }

      if (body.attachment.storagePath) {
        newlyUploadedPathsRef.current.push(body.attachment.storagePath);
      }
      appendAttachmentToItem(itemId, body.attachment);
      setUploadLabel("");
      setAttachingCheckId(null);
    } catch (err) {
      setAttachError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างอัปโหลดไฟล์"
      );
    } finally {
      uploadLockRef.current = false;
      setIsUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (
    itemId: string,
    attachment: WorkflowAttachment
  ) => {
    if (attachment.kind === "file" && attachment.storagePath) {
      const pathToRemove = attachment.storagePath;
      if (newlyUploadedPathsRef.current.includes(pathToRemove)) {
        newlyUploadedPathsRef.current = newlyUploadedPathsRef.current.filter(
          (p) => p !== pathToRemove
        );
        cleanupWorkflowFiles([pathToRemove]);
      } else {
        removedPathsRef.current.push(pathToRemove);
      }
    }
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || !item.attachments) return item;
        const nextAtt = item.attachments.filter((a) => a.id !== attachment.id);
        return {
          ...item,
          attachments: nextAtt.length > 0 ? nextAtt : undefined,
        };
      })
    );
  };

  const handleStartEditChecklistItem = (item: WorkflowChecklistItem) => {
    editingCheckIdRef.current = item.id;
    setEditingCheckId(item.id);
    setEditingCheckText(item.text);
  };

  const handleCancelEditChecklistItem = () => {
    editingCheckIdRef.current = null;
    setEditingCheckId(null);
    setEditingCheckText("");
  };

  const handleCommitEditChecklistItem = () => {
    const targetId = editingCheckIdRef.current;
    if (!targetId) return;
    const trimmed = editingCheckText.trim();
    if (trimmed) {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === targetId ? { ...item, text: trimmed } : item
        )
      );
    }
    editingCheckIdRef.current = null;
    setEditingCheckId(null);
    setEditingCheckText("");
  };

  const handleMoveChecklistItem = (
    index: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setChecklist((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleReorderChecklist = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setChecklist((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    if (saveLockRef.current) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("กรุณาระบุชื่อขั้นตอน");
      return;
    }

    const pendingEditId = editingCheckIdRef.current;
    const pendingEditTrimmed = editingCheckText.trim();
    const finalChecklist =
      pendingEditId && pendingEditTrimmed
        ? checklist.map((item) =>
            item.id === pendingEditId
              ? { ...item, text: pendingEditTrimmed }
              : item
          )
        : checklist;

    saveLockRef.current = true;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const nextCompletedAt =
        status === "completed" ? step.completedAt || nowIso : "";
      await onSaveStep({
        ...step,
        phase,
        title: trimmedTitle,
        description: description.trim(),
        status,
        assignee: assignee.trim(),
        dueDate,
        completedAt: nextCompletedAt,
        notes: notes.trim(),
        checklist: finalChecklist,
        connections: connections.length > 0 ? connections : undefined,
        updatedAt: nowIso,
      });
      newlyUploadedPathsRef.current = [];
      if (removedPathsRef.current.length > 0) {
        cleanupWorkflowFiles(removedPathsRef.current);
        removedPathsRef.current = [];
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกข้อมูลขั้นตอนไม่สำเร็จ"
      );
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleMove = async (direction: "up" | "down") => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    try {
      await onMoveStep(step.id, direction);
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    setIsSaving(true);
    try {
      await onDeleteStep(step.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "ลบขั้นตอนไม่สำเร็จ");
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={() => {
        if (!saveLockRef.current && !uploadLockRef.current) {
          handleCloseWithoutSave();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`รายละเอียดขั้นตอน: ${step.title}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#16265E] px-5 py-4 text-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <span className="rounded bg-white/15 px-2 py-0.5 font-bold">
                ขั้นตอนที่ {step.order}
              </span>
              {step.completedAt && status === "completed" && (
                <span>เสร็จเมื่อ {formatThaiShortDate(step.completedAt)}</span>
              )}
              {overdue && (
                <span className="rounded bg-red-500 px-2 py-0.5 font-bold text-white">
                  เลยกำหนด
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-sm sm:text-base font-bold leading-snug">
              {title || step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseWithoutSave}
            disabled={isSaving || isUploadingFile}
            aria-label="ปิดแผงรายละเอียด"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quick Status Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const meta = WORKFLOW_STATUS_META[opt];
                const selected = status === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 font-bold transition-all cursor-pointer ${
                      selected
                        ? `${meta.badgeClass} ring-2 ring-[#16265E]/25 shadow-sm`
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${meta.dotClass}`}
                    />
                    <span>{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live System Metric Card (Read-only) */}
          {liveMetric && (
            <div
              className={`rounded-xl border p-3.5 ${
                liveMetric.tone === "success"
                  ? "border-emerald-200 bg-emerald-50/60"
                  : liveMetric.tone === "warning"
                    ? "border-amber-200 bg-amber-50/70"
                    : liveMetric.tone === "info"
                      ? "border-blue-200 bg-blue-50/60"
                      : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    ข้อมูลสดจากฐานข้อมูลระบบ (Read-only)
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {liveMetric.headline}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {liveMetric.detail}
                  </p>
                </div>
                {step.actionHref && (
                  <Link
                    href={step.actionHref}
                    className="shrink-0 rounded-lg bg-[#16265E] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1e347e] transition-colors"
                  >
                    {step.actionLabel || "ไปหน้าจัดการ"} →
                  </Link>
                )}
              </div>
            </div>
          )}

          {!liveMetric && step.actionHref && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <span className="text-slate-600 font-medium">
                เมนูลัดไปยังหน้างานที่เกี่ยวข้อง
              </span>
              <Link
                href={step.actionHref}
                className="rounded-md bg-[#2386D3] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1b73b8]"
              >
                {step.actionLabel || "ไปหน้าจัดการ"} →
              </Link>
            </div>
          )}

          {/* Checklist Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                รายการย่อย (Checklist)
              </h3>
              <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {checklistDoneCount}/{checklist.length} รายการ
              </span>
            </div>

            {checklist.length > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      checklist.length > 0
                        ? Math.round(
                            (checklistDoneCount / checklist.length) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {checklist.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-1">
                  ยังไม่มีรายการย่อย — สามารถเพิ่มด้านล่างได้
                </p>
              ) : (
                checklist.map((item, idx) => {
                  const isEditingThis = editingCheckId === item.id;
                  const isAttachingThis = attachingCheckId === item.id;
                  const attachments = item.attachments || [];
                  const isDropTarget =
                    dragOverCheckIndex === idx &&
                    draggedCheckIndex !== null &&
                    draggedCheckIndex !== idx;

                  return (
                    <div
                      key={item.id}
                      draggable={!isEditingThis}
                      onDragStart={(e) => {
                        setDraggedCheckIndex(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedCheckIndex !== null && dragOverCheckIndex !== idx) {
                          setDragOverCheckIndex(idx);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedCheckIndex !== null) {
                          handleReorderChecklist(draggedCheckIndex, idx);
                        }
                        setDraggedCheckIndex(null);
                        setDragOverCheckIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedCheckIndex(null);
                        setDragOverCheckIndex(null);
                      }}
                      className={`rounded-lg border px-2 py-1.5 transition-colors ${
                        isDropTarget
                          ? "border-[#2386D3] bg-blue-50/70 ring-1 ring-[#2386D3]"
                          : draggedCheckIndex === idx
                            ? "border-slate-300 bg-slate-100 opacity-60"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          title="ลากเพื่อสลับลำดับ"
                          aria-hidden="true"
                          className={`select-none px-0.5 text-slate-400 ${
                            isEditingThis
                              ? "opacity-30"
                              : "cursor-grab hover:text-slate-600"
                          }`}
                        >
                          ⋮⋮
                        </span>

                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(item.id)}
                          className="h-3.5 w-3.5 shrink-0 accent-emerald-600 cursor-pointer"
                        />

                        {isEditingThis ? (
                          <div className="flex flex-1 items-center gap-1">
                            <input
                              type="text"
                              value={editingCheckText}
                              onChange={(e) =>
                                setEditingCheckText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCommitEditChecklistItem();
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  handleCancelEditChecklistItem();
                                }
                              }}
                              maxLength={200}
                              autoFocus
                              className="flex-1 rounded border border-[#2386D3] bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleCommitEditChecklistItem}
                              title="บันทึกข้อความ"
                              aria-label="บันทึกข้อความรายการย่อย"
                              className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditChecklistItem}
                              title="ยกเลิกการแก้ไข"
                              aria-label="ยกเลิกการแก้ไขรายการย่อย"
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              onDoubleClick={() =>
                                handleStartEditChecklistItem(item)
                              }
                              title="ดับเบิลคลิกเพื่อแก้ไขข้อความ"
                              className={`flex-1 select-text ${
                                item.done
                                  ? "line-through text-slate-400"
                                  : "text-slate-800"
                              }`}
                            >
                              {item.text}
                            </span>

                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveChecklistItem(idx, "up")
                                }
                                disabled={idx === 0}
                                title="เลื่อนขึ้น"
                                aria-label={`เลื่อนรายการ ${item.text} ขึ้น`}
                                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveChecklistItem(idx, "down")
                                }
                                disabled={idx === checklist.length - 1}
                                title="เลื่อนลง"
                                aria-label={`เลื่อนรายการ ${item.text} ลง`}
                                className="rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleAttachPanel(item.id)}
                                title="แนบไฟล์หรือลิงก์ Google Drive"
                                aria-label={`แนบเอกสารรายการ ${item.text}`}
                                className={`rounded px-1.5 py-0.5 text-[11px] transition-colors cursor-pointer ${
                                  isAttachingThis || attachments.length > 0
                                    ? "bg-blue-50 text-[#2386D3] font-bold hover:bg-blue-100"
                                    : "text-slate-500 hover:bg-blue-50 hover:text-[#2386D3]"
                                }`}
                              >
                                📎{attachments.length > 0 ? attachments.length : ""}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartEditChecklistItem(item)
                                }
                                title="แก้ไขข้อความ"
                                aria-label={`แก้ไขรายการ ${item.text}`}
                                className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-blue-50 hover:text-[#2386D3] cursor-pointer"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveChecklistItem(item.id)
                                }
                                title="ลบรายการ"
                                aria-label={`ลบรายการ ${item.text}`}
                                className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Attachment Chips */}
                      {attachments.length > 0 && (
                        <div className="mt-1.5 ml-6 flex flex-wrap gap-1.5">
                          {attachments.map((att) => {
                            const href =
                              att.kind === "link"
                                ? att.url || "#"
                                : `/api/admin/workflow/files?path=${encodeURIComponent(
                                    att.storagePath || ""
                                  )}&name=${encodeURIComponent(att.name)}`;

                            return (
                              <span
                                key={att.id}
                                className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] text-slate-700"
                              >
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 font-semibold text-[#16265E] hover:text-[#2386D3] hover:underline truncate max-w-[240px]"
                                  title={`เปิดดู ${att.name}`}
                                >
                                  <span>{att.kind === "link" ? "🔗" : "📄"}</span>
                                  <span className="truncate">{att.name}</span>
                                </a>
                                {att.size && (
                                  <span className="text-[9.5px] text-slate-400">
                                    ({att.size})
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAttachment(item.id, att)
                                  }
                                  title="ลบเอกสารแนบ"
                                  aria-label={`ลบเอกสารแนบ ${att.name}`}
                                  className="ml-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Hybrid Attachment Panel */}
                      {isAttachingThis && (
                        <div className="mt-2 ml-6 rounded-lg border border-blue-200 bg-blue-50/40 p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[10.5px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachTab("link");
                                  setAttachError(null);
                                }}
                                className={`rounded px-2 py-1 font-bold cursor-pointer ${
                                  attachTab === "link"
                                    ? "bg-[#16265E] text-white"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                🔗 แปะลิงก์ Google Drive (แนะนำ)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachTab("file");
                                  setAttachError(null);
                                }}
                                className={`rounded px-2 py-1 font-bold cursor-pointer ${
                                  attachTab === "file"
                                    ? "bg-[#16265E] text-white"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                📄 อัปโหลดไฟล์ส่วนตัว (≤ 4 MB)
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachingCheckId(null)}
                              className="text-[10.5px] text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              ปิด
                            </button>
                          </div>

                          {attachError && (
                            <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10.5px] font-medium text-red-700">
                              {attachError}
                            </div>
                          )}

                          {attachTab === "link" ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={linkName}
                                onChange={(e) => setLinkName(e.target.value)}
                                maxLength={140}
                                placeholder="ชื่อเอกสาร (เช่น คำของบประมาณ 69 ฉบับอนุมัติ)"
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] focus:border-[#2386D3] focus:outline-none"
                              />
                              <div className="flex gap-1.5">
                                <input
                                  type="url"
                                  value={linkUrl}
                                  onChange={(e) => setLinkUrl(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddLinkAttachment(item.id);
                                    }
                                  }}
                                  placeholder="https://drive.google.com/..."
                                  className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] focus:border-[#2386D3] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddLinkAttachment(item.id)
                                  }
                                  className="rounded bg-[#2386D3] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#1b73b8] cursor-pointer"
                                >
                                  แนบลิงก์
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                ใช้พื้นที่ 0 KB เหมาะสำหรับไฟล์ Word, Excel หรือ PDF หลายหน้าบน Google Drive
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={uploadLabel}
                                onChange={(e) => setUploadLabel(e.target.value)}
                                maxLength={140}
                                placeholder="ชื่อเรียกเอกสาร (ถ้าไม่กรอกจะใช้ชื่อไฟล์เดิม)"
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] focus:border-[#2386D3] focus:outline-none"
                              />
                              <label
                                className={`flex items-center justify-center rounded border border-dashed border-[#2386D3] bg-white px-3 py-2 text-[11px] font-bold text-[#16265E] ${
                                  isUploadingFile
                                    ? "opacity-60 cursor-wait"
                                    : "hover:bg-blue-50 cursor-pointer"
                                }`}
                              >
                                <input
                                  type="file"
                                  accept="application/pdf,image/jpeg,image/png,image/webp"
                                  disabled={isUploadingFile}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    void handleUploadFileAttachment(item.id, f);
                                  }}
                                  className="hidden"
                                />
                                {isUploadingFile
                                  ? "กำลังบีบอัดและอัปโหลดขึ้น Cloud..."
                                  : "เลือกไฟล์ PDF หรือรูปภาพ (เปิดดูได้เฉพาะแอดมิน)"}
                              </label>
                              <p className="text-[10px] text-slate-500">
                                เก็บแบบส่วนตัวเปิดดูได้เฉพาะแอดมิน (รูปภาพจะถูกบีบอัดอัตโนมัติ)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                maxLength={200}
                placeholder="เพิ่มรายการย่อยใหม่..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#2386D3] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                + เพิ่ม
              </button>
            </div>
          </div>

          {/* Step Details Form */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <h3 className="font-bold text-slate-800">รายละเอียดขั้นตอน</h3>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อขั้นตอน *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ระยะในผังงาน
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as WorkflowPhaseId)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              >
                {WORKFLOW_PHASES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortTitle}: {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                คำอธิบายขั้นตอน
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  maxLength={100}
                  placeholder="ระบุชื่อฝ่ายหรือเจ้าหน้าที่"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  วันที่กำหนดเสร็จ
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หมายเหตุ / ปัญหาที่พบ / เลขที่หนังสืออ้างอิง
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1200}
                placeholder="บันทึกความคืบหน้า เลขที่หนังสือขออนุมัติ หรือสาเหตุที่ติดขัด..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#2386D3] focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Cross-Step Flow Connections */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">
                เส้นโยงข้ามขั้นตอน / ย้อนกลับ (แสดงบนแผนผัง)
              </h3>
              <span className="text-[10.5px] font-semibold text-indigo-700">
                {connections.length}/6 เส้น
              </span>
            </div>

            {connections.length > 0 && (
              <div className="space-y-1.5">
                {connections.map((conn) => {
                  const target = allSteps.find(
                    (s) => s.id === conn.targetStepId
                  );
                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-[#16265E]">
                          →{" "}
                          {target
                            ? `#${target.order} ${target.title}`
                            : "(ขั้นตอนที่ถูกลบ)"}
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                            {conn.style === "solid" ? "เส้นทึบ" : "เส้นประ"}
                          </span>
                          {conn.label && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700">
                              {conn.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConnections((prev) =>
                            prev.filter((c) => c.id !== conn.id)
                          )
                        }
                        aria-label="ลบเส้นโยง"
                        className="px-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-1">
              <select
                value={newConnTargetId}
                onChange={(e) => setNewConnTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#2386D3] focus:outline-none"
              >
                <option value="">-- เลือกขั้นตอนปลายทางที่จะโยงเส้นไป --</option>
                {allSteps
                  .filter(
                    (s) =>
                      s.id !== step.id &&
                      !connections.some((c) => c.targetStepId === s.id)
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.order} {s.title}
                    </option>
                  ))}
              </select>

              <div className="flex flex-wrap gap-1.5">
                <input
                  type="text"
                  value={newConnLabel}
                  onChange={(e) => setNewConnLabel(e.target.value)}
                  maxLength={60}
                  placeholder="ป้ายบนเส้น (เช่น ทำคู่ขนาน / ส่งกลับแก้ไข)"
                  className="flex-1 min-w-[160px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-[#2386D3] focus:outline-none"
                />
                <select
                  value={newConnStyle}
                  onChange={(e) =>
                    setNewConnStyle(e.target.value as "dashed" | "solid")
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="dashed">เส้นประ</option>
                  <option value="solid">เส้นทึบ</option>
                </select>
                <button
                  type="button"
                  disabled={!newConnTargetId || connections.length >= 6}
                  onClick={() => {
                    if (!newConnTargetId || connections.length >= 6) return;
                    const trimmedLabel = newConnLabel.trim();
                    setConnections((prev) => [
                      ...prev,
                      {
                        id: `conn-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 6)}`,
                        targetStepId: newConnTargetId,
                        ...(trimmedLabel ? { label: trimmedLabel } : {}),
                        style: newConnStyle,
                      },
                    ]);
                    setNewConnTargetId("");
                    setNewConnLabel("");
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
                >
                  + เพิ่มเส้นโยง
                </button>
              </div>
            </div>
          </div>

          {/* Reorder & Delete */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-600 mr-1">
                ลำดับในระยะ:
              </span>
              <button
                type="button"
                onClick={() => handleMove("up")}
                disabled={!canMoveUp || isSaving}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                ↑ เลื่อนขึ้น
              </button>
              <button
                type="button"
                onClick={() => handleMove("down")}
                disabled={!canMoveDown || isSaving}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                ↓ เลื่อนลง
              </button>
            </div>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
                className="rounded border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              >
                ลบขั้นตอนนี้
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                >
                  ยืนยันลบ
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isSaving}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={handleCloseWithoutSave}
            disabled={isSaving || isUploadingFile}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploadingFile}
            className="rounded-lg bg-[#16265E] px-5 py-2 text-xs font-bold text-white hover:bg-[#1e347e] disabled:opacity-60"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </div>
    </div>
  );
}
