"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  WORKFLOW_PHASES,
  WORKFLOW_STATUS_META,
  countStepAttachments,
  formatThaiShortDate,
  isStepOverdue,
  type WorkflowChecklistItem,
  type WorkflowLiveMetricDisplay,
  type WorkflowPhaseMeta,
  type WorkflowStep,
  type WorkflowStepStatus,
} from "@/lib/workflow";

type DiagramOrientation = "horizontal" | "vertical";

interface WorkflowDiagramProps {
  steps: WorkflowStep[];
  fiscalYearBE: string;
  liveMetricMap: Map<string, WorkflowLiveMetricDisplay>;
  onSelectStep: (stepId: string) => void;
  onQuickStatusCycle: (e: React.MouseEvent, step: WorkflowStep) => Promise<void>;
  onToggleChecklistDone: (
    step: WorkflowStep,
    checkItemId: string
  ) => Promise<void>;
}

interface PositionedNode {
  step: WorkflowStep;
  x: number;
  y: number;
  w: number;
  h: number;
  phaseMeta: WorkflowPhaseMeta;
}

interface PositionedSubNode {
  parentStep: WorkflowStep;
  item: WorkflowChecklistItem;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PositionedPhaseBand {
  meta: WorkflowPhaseMeta;
  x: number;
  y: number;
  w: number;
  h: number;
  completedCount: number;
  totalCount: number;
}

interface EdgePath {
  id: string;
  d: string;
  stroke: string;
  dashed: boolean;
  animated: boolean;
  markerEnd: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  strokeWidth: number;
}

interface DiagramLayout {
  width: number;
  height: number;
  phases: PositionedPhaseBand[];
  nodes: PositionedNode[];
  subNodes: PositionedSubNode[];
  edges: EdgePath[];
}

const PHASE_ACCENT_HEX: Record<
  WorkflowPhaseMeta["id"],
  { bg: string; border: string; badge: string }
> = {
  prepare: { bg: "#f8fafc", border: "#cbd5e1", badge: "#16265E" },
  recruit: { bg: "#eff6ff", border: "#93c5fd", badge: "#2386D3" },
  execute: { bg: "#eef2ff", border: "#a5b4fc", badge: "#4f46e5" },
  closeout: { bg: "#ecfdf5", border: "#6ee7b7", badge: "#059669" },
};

const STATUS_HEX: Record<
  WorkflowStepStatus,
  { stroke: string; fill: string; badgeBg: string; badgeText: string; marker: string }
> = {
  completed: {
    stroke: "#10b981",
    fill: "#f0fdf4",
    badgeBg: "#dcfce7",
    badgeText: "#047857",
    marker: "url(#arrow-completed)",
  },
  in_progress: {
    stroke: "#2386D3",
    fill: "#eff6ff",
    badgeBg: "#dbeafe",
    badgeText: "#16265E",
    marker: "url(#arrow-active)",
  },
  blocked: {
    stroke: "#ef4444",
    fill: "#fef2f2",
    badgeBg: "#fee2e2",
    badgeText: "#b91c1c",
    marker: "url(#arrow-blocked)",
  },
  pending: {
    stroke: "#94a3b8",
    fill: "#ffffff",
    badgeBg: "#f1f5f9",
    badgeText: "#475569",
    marker: "url(#arrow-pending)",
  },
};

function estimateSubNodeHeight(item: WorkflowChecklistItem): number {
  const hasAttachments = Boolean(item.attachments && item.attachments.length > 0);
  const longText = item.text.length > 30;
  let h = 44;
  if (longText) h += 16;
  if (hasAttachments) h += 28;
  return h;
}

function computeDiagramLayout(
  steps: WorkflowStep[],
  orientation: DiagramOrientation,
  expandedStepIds: Set<string>
): DiagramLayout {
  if (steps.length === 0) {
    return {
      width: 640,
      height: 220,
      phases: [],
      nodes: [],
      subNodes: [],
      edges: [],
    };
  }

  const phaseGroups = WORKFLOW_PHASES.map((meta) => ({
    meta,
    steps: steps.filter((s) => s.phase === meta.id),
  })).filter((g) => g.steps.length > 0);

  const nodes: PositionedNode[] = [];
  const subNodes: PositionedSubNode[] = [];
  const phases: PositionedPhaseBand[] = [];
  const nodeById = new Map<string, PositionedNode>();

  let totalCustomArcsCount = 0;
  for (const s of steps) {
    for (const c of s.connections || []) {
      if (steps.some((t) => t.id === c.targetStepId)) {
        totalCustomArcsCount += 1;
      }
    }
  }

  if (orientation === "horizontal") {
    const NODE_W = 248;
    const NODE_H = 164;
    const STEP_GAP_X = 56;
    const PHASE_GAP_X = 64;
    const PHASE_PAD_X = 20;
    const PHASE_HEADER_H = 54;
    const ARC_LANE_H = totalCustomArcsCount > 0 ? Math.min(110, 44 + totalCustomArcsCount * 22) : 14;
    const PHASE_TOP = 16;
    const NODE_TOP_Y = PHASE_TOP + PHASE_HEADER_H + ARC_LANE_H;
    const SUB_W = 232;
    const SUB_GAP_Y = 12;

    let cursorX = 24;
    let maxBottomY = NODE_TOP_Y + NODE_H + 24;

    for (const group of phaseGroups) {
      const phaseStartX = cursorX;
      let innerX = phaseStartX + PHASE_PAD_X;
      let phaseMaxY = NODE_TOP_Y + NODE_H;

      for (let i = 0; i < group.steps.length; i++) {
        const step = group.steps[i];
        const node: PositionedNode = {
          step,
          x: innerX,
          y: NODE_TOP_Y,
          w: NODE_W,
          h: NODE_H,
          phaseMeta: group.meta,
        };
        nodes.push(node);
        nodeById.set(step.id, node);

        if (expandedStepIds.has(step.id) && step.checklist.length > 0) {
          let subY = NODE_TOP_Y + NODE_H + 24;
          const subX = innerX + 16;
          for (let ci = 0; ci < step.checklist.length; ci++) {
            const item = step.checklist[ci];
            const subH = estimateSubNodeHeight(item);
            subNodes.push({
              parentStep: step,
              item,
              index: ci,
              x: subX,
              y: subY,
              w: SUB_W,
              h: subH,
            });
            phaseMaxY = Math.max(phaseMaxY, subY + subH);
            subY += subH + SUB_GAP_Y;
          }
        }

        innerX += NODE_W;
        if (i < group.steps.length - 1) {
          innerX += STEP_GAP_X;
        }
      }

      const phaseWidth = innerX - phaseStartX + PHASE_PAD_X;
      maxBottomY = Math.max(maxBottomY, phaseMaxY + 24);
      const completedCount = group.steps.filter(
        (s) => s.status === "completed"
      ).length;

      phases.push({
        meta: group.meta,
        x: phaseStartX,
        y: PHASE_TOP,
        w: phaseWidth,
        h: 0, // updated once overall maxBottomY is known so phase swimlanes align evenly
        completedCount,
        totalCount: group.steps.length,
      });

      cursorX = phaseStartX + phaseWidth + PHASE_GAP_X;
    }

    const totalWidth = Math.max(760, cursorX - PHASE_GAP_X + 24);
    const totalHeight = maxBottomY + 12;
    for (const p of phases) {
      p.h = totalHeight - p.y - 16;
    }

    const edges: EdgePath[] = [];

    // 1. Sequential step-to-step Bezier flow arrows
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x - 4;
      const y2 = to.y + to.h / 2;
      const dx = Math.max(24, (x2 - x1) * 0.45);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const flowStatus: WorkflowStepStatus =
        from.step.status === "completed" && to.step.status === "in_progress"
          ? "in_progress"
          : from.step.status === "completed"
            ? "completed"
            : from.step.status === "in_progress"
              ? "in_progress"
              : from.step.status === "blocked"
                ? "blocked"
                : "pending";

      edges.push({
        id: `seq-${from.step.id}-${to.step.id}`,
        d,
        stroke: STATUS_HEX[flowStatus].stroke,
        dashed: false,
        animated: flowStatus === "in_progress",
        markerEnd: STATUS_HEX[flowStatus].marker,
        strokeWidth: flowStatus === "in_progress" ? 3 : 2.5,
      });
    }

    // 2. Checklist tree branch connectors (orthogonal rounded branches)
    const subByParent = new Map<string, PositionedSubNode[]>();
    for (const sn of subNodes) {
      const arr = subByParent.get(sn.parentStep.id) || [];
      arr.push(sn);
      subByParent.set(sn.parentStep.id, arr);
    }
    for (const [parentId, children] of subByParent.entries()) {
      const parent = nodeById.get(parentId);
      if (!parent || children.length === 0) continue;
      const spineX = parent.x + 8;
      const startY = parent.y + parent.h;
      const lastChild = children[children.length - 1];
      const endSpineY = lastChild.y + lastChild.h / 2;

      edges.push({
        id: `sub-spine-${parentId}`,
        d: `M ${spineX} ${startY} L ${spineX} ${endSpineY}`,
        stroke: "#94a3b8",
        dashed: false,
        animated: false,
        markerEnd: "",
        strokeWidth: 1.8,
      });

      for (const child of children) {
        const cy = child.y + child.h / 2;
        edges.push({
          id: `sub-arm-${parentId}-${child.item.id}`,
          d: `M ${spineX} ${cy} L ${child.x - 2} ${cy}`,
          stroke: child.item.done ? "#10b981" : "#94a3b8",
          dashed: false,
          animated: false,
          markerEnd: child.item.done ? "url(#arrow-completed-sm)" : "url(#arrow-pending-sm)",
          strokeWidth: 1.8,
        });
      }
    }

    // 3. Custom cross-step / loop arcs above the main node lane
    let arcIdx = 0;
    for (const from of nodes) {
      for (const conn of from.step.connections || []) {
        const to = nodeById.get(conn.targetStepId);
        if (!to) continue;
        const isBackward = to.step.order < from.step.order;
        const offset = 22 + (arcIdx % 4) * 20;
        arcIdx += 1;
        const x1 = from.x + from.w / 2;
        const y1 = from.y - 2;
        const x2 = to.x + to.w / 2;
        const y2 = to.y - 4;
        const ctrlY = Math.max(PHASE_TOP + PHASE_HEADER_H + 8, from.y - offset - 26);
        const d = `M ${x1} ${y1} C ${x1} ${ctrlY}, ${x2} ${ctrlY}, ${x2} ${y2}`;
        const midX = (x1 + x2) / 2;
        const midY = 0.125 * y1 + 0.75 * ctrlY + 0.125 * y2;

        edges.push({
          id: `custom-${from.step.id}-${conn.id}`,
          d,
          stroke: isBackward ? "#d97706" : "#4f46e5",
          dashed: conn.style !== "solid",
          animated: false,
          markerEnd: isBackward ? "url(#arrow-loop)" : "url(#arrow-custom)",
          label: conn.label,
          labelX: midX,
          labelY: midY,
          strokeWidth: 2,
        });
      }
    }

    return {
      width: totalWidth,
      height: totalHeight,
      phases,
      nodes,
      subNodes,
      edges,
    };
  }

  // Vertical Orientation (Top -> Bottom main lane, checklist expands to the right)
  const NODE_W = 320;
  const NODE_H = 158;
  const STEP_GAP_Y = 46;
  const PHASE_GAP_Y = 56;
  const PHASE_PAD_Y = 18;
  const PHASE_HEADER_H = 50;
  const SUB_W = 290;
  const SUB_GAP_Y = 10;
  const PHASE_LEFT = 24;
  const NODE_X = PHASE_LEFT + 20;

  let cursorY = 20;
  let maxRightX = NODE_X + NODE_W + 24;

  for (const group of phaseGroups) {
    const phaseStartY = cursorY;
    let innerY = phaseStartY + PHASE_HEADER_H + PHASE_PAD_Y;

    for (let i = 0; i < group.steps.length; i++) {
      const step = group.steps[i];
      const node: PositionedNode = {
        step,
        x: NODE_X,
        y: innerY,
        w: NODE_W,
        h: NODE_H,
        phaseMeta: group.meta,
      };
      nodes.push(node);
      nodeById.set(step.id, node);

      let stepBlockBottom = innerY + NODE_H;

      if (expandedStepIds.has(step.id) && step.checklist.length > 0) {
        const subX = NODE_X + NODE_W + 48;
        let subY = innerY;
        for (let ci = 0; ci < step.checklist.length; ci++) {
          const item = step.checklist[ci];
          const subH = estimateSubNodeHeight(item);
          subNodes.push({
            parentStep: step,
            item,
            index: ci,
            x: subX,
            y: subY,
            w: SUB_W,
            h: subH,
          });
          maxRightX = Math.max(maxRightX, subX + SUB_W + 24);
          stepBlockBottom = Math.max(stepBlockBottom, subY + subH);
          subY += subH + SUB_GAP_Y;
        }
      }

      innerY = stepBlockBottom;
      if (i < group.steps.length - 1) {
        innerY += STEP_GAP_Y;
      }
    }

    const phaseHeight = innerY - phaseStartY + PHASE_PAD_Y;
    const completedCount = group.steps.filter(
      (s) => s.status === "completed"
    ).length;

    phases.push({
      meta: group.meta,
      x: PHASE_LEFT,
      y: phaseStartY,
      w: 0, // updated once maxRightX is known
      h: phaseHeight,
      completedCount,
      totalCount: group.steps.length,
    });

    cursorY = phaseStartY + phaseHeight + PHASE_GAP_Y;
  }

  const arcLaneRight =
    totalCustomArcsCount > 0 ? Math.min(130, 56 + totalCustomArcsCount * 22) : 20;
  const totalWidth = Math.max(760, maxRightX + arcLaneRight);
  const totalHeight = Math.max(360, cursorY - PHASE_GAP_Y + 24);

  for (const p of phases) {
    p.w = totalWidth - p.x - 24;
  }

  const edges: EdgePath[] = [];

  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i];
    const to = nodes[i + 1];
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h;
    const x2 = to.x + to.w / 2;
    const y2 = to.y - 4;
    const dy = Math.max(18, (y2 - y1) * 0.45);
    const d = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

    const flowStatus: WorkflowStepStatus =
      from.step.status === "completed" && to.step.status === "in_progress"
        ? "in_progress"
        : from.step.status === "completed"
          ? "completed"
          : from.step.status === "in_progress"
            ? "in_progress"
            : from.step.status === "blocked"
              ? "blocked"
              : "pending";

    edges.push({
      id: `vseq-${from.step.id}-${to.step.id}`,
      d,
      stroke: STATUS_HEX[flowStatus].stroke,
      dashed: false,
      animated: flowStatus === "in_progress",
      markerEnd: STATUS_HEX[flowStatus].marker,
      strokeWidth: flowStatus === "in_progress" ? 3 : 2.5,
    });
  }

  const vSubByParent = new Map<string, PositionedSubNode[]>();
  for (const sn of subNodes) {
    const arr = vSubByParent.get(sn.parentStep.id) || [];
    arr.push(sn);
    vSubByParent.set(sn.parentStep.id, arr);
  }
  for (const [parentId, children] of vSubByParent.entries()) {
    const parent = nodeById.get(parentId);
    if (!parent || children.length === 0) continue;
    const startX = parent.x + parent.w;
    const startY = parent.y + 42;
    const trunkX = startX + 24;

    for (const child of children) {
      const cy = child.y + child.h / 2;
      edges.push({
        id: `vsub-${parentId}-${child.item.id}`,
        d: `M ${startX} ${startY} C ${trunkX} ${startY}, ${trunkX} ${cy}, ${child.x - 2} ${cy}`,
        stroke: child.item.done ? "#10b981" : "#94a3b8",
        dashed: false,
        animated: false,
        markerEnd: child.item.done
          ? "url(#arrow-completed-sm)"
          : "url(#arrow-pending-sm)",
        strokeWidth: 1.8,
      });
    }
  }

  let vArcIdx = 0;
  for (const from of nodes) {
    for (const conn of from.step.connections || []) {
      const to = nodeById.get(conn.targetStepId);
      if (!to) continue;
      const isBackward = to.step.order < from.step.order;
      const arcX = maxRightX + 18 + (vArcIdx % 4) * 24;
      vArcIdx += 1;
      const x1 = from.x + from.w;
      const y1 = from.y + from.h * 0.35;
      const x2 = to.x + to.w + 4;
      const y2 = to.y + to.h * 0.35;
      const d = `M ${x1} ${y1} C ${arcX} ${y1}, ${arcX} ${y2}, ${x2} ${y2}`;
      const midX = 0.125 * x1 + 0.75 * arcX + 0.125 * x2;
      const midY = (y1 + y2) / 2;

      edges.push({
        id: `vcustom-${from.step.id}-${conn.id}`,
        d,
        stroke: isBackward ? "#d97706" : "#4f46e5",
        dashed: conn.style !== "solid",
        animated: false,
        markerEnd: isBackward ? "url(#arrow-loop)" : "url(#arrow-custom)",
        label: conn.label,
        labelX: midX,
        labelY: midY,
        strokeWidth: 2,
      });
    }
  }

  return {
    width: totalWidth,
    height: totalHeight,
    phases,
    nodes,
    subNodes,
    edges,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextLines(text: string, maxChars: number, maxLines: number): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const lines: string[] = [];
  let remaining = clean;
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxChars || lines.length === maxLines - 1) {
      lines.push(
        remaining.length > maxChars
          ? `${remaining.slice(0, maxChars - 1)}…`
          : remaining
      );
      break;
    }
    const slice = remaining.slice(0, maxChars);
    const spaceIdx = slice.lastIndexOf(" ");
    const cutAt = spaceIdx > maxChars * 0.5 ? spaceIdx : maxChars;
    lines.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  return lines;
}

function buildExportSvgString(
  layout: DiagramLayout,
  fiscalYearBE: string,
  liveMetricMap: Map<string, WorkflowLiveMetricDisplay>
): { svg: string; width: number; height: number } {
  const HEADER_H = 86;
  const FOOTER_H = 36;
  const totalW = Math.max(layout.width, 820);
  const totalH = layout.height + HEADER_H + FOOTER_H;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" font-family="'Noto Sans Thai','Sarabun','Segoe UI',sans-serif">`
  );
  parts.push(`<defs>
    <marker id="arrow-completed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981"/></marker>
    <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#2386D3"/></marker>
    <marker id="arrow-blocked" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444"/></marker>
    <marker id="arrow-pending" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8"/></marker>
    <marker id="arrow-loop" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706"/></marker>
    <marker id="arrow-custom" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5"/></marker>
    <marker id="arrow-completed-sm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981"/></marker>
    <marker id="arrow-pending-sm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8"/></marker>
  </defs>`);

  parts.push(`<rect width="${totalW}" height="${totalH}" fill="#ffffff"/>`);
  parts.push(`<rect x="0" y="0" width="${totalW}" height="${HEADER_H}" fill="#16265E"/>`);
  parts.push(
    `<text x="28" y="34" fill="#ffffff" font-size="16" font-weight="700">${escapeXml(
      "กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย"
    )}</text>`
  );
  parts.push(
    `<text x="28" y="60" fill="#cbd5e1" font-size="13" font-weight="600">${escapeXml(
      `แผนผังขั้นตอนการดำเนินงานโครงการ (Operational Flowchart) ประจำปีงบประมาณ พ.ศ. ${fiscalYearBE}`
    )}</text>`
  );

  parts.push(`<g transform="translate(0, ${HEADER_H})">`);

  // Phase swimlanes
  for (const p of layout.phases) {
    const accent = PHASE_ACCENT_HEX[p.meta.id];
    parts.push(
      `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="${accent.bg}" stroke="${accent.border}" stroke-width="1.5"/>`
    );
    parts.push(
      `<rect x="${p.x + 12}" y="${p.y + 12}" width="64" height="22" rx="6" fill="${accent.badge}"/>`
    );
    parts.push(
      `<text x="${p.x + 44}" y="${p.y + 27}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">${escapeXml(
        p.meta.shortTitle
      )}</text>`
    );
    parts.push(
      `<text x="${p.x + 86}" y="${p.y + 27}" fill="#0f172a" font-size="13" font-weight="700">${escapeXml(
        p.meta.title
      )} (${p.completedCount}/${p.totalCount})</text>`
    );
  }

  // Edges
  for (const edge of layout.edges) {
    parts.push(
      `<path d="${edge.d}" fill="none" stroke="${edge.stroke}" stroke-width="${edge.strokeWidth}"${
        edge.dashed ? ' stroke-dasharray="6 4"' : ""
      }${edge.markerEnd ? ` marker-end="${edge.markerEnd}"` : ""}/>`
    );
    if (edge.label && edge.labelX !== undefined && edge.labelY !== undefined) {
      const labelW = Math.min(180, Math.max(56, edge.label.length * 7 + 16));
      parts.push(
        `<rect x="${edge.labelX - labelW / 2}" y="${edge.labelY - 11}" width="${labelW}" height="20" rx="10" fill="#ffffff" stroke="${edge.stroke}" stroke-width="1.2"/>`
      );
      parts.push(
        `<text x="${edge.labelX}" y="${edge.labelY + 3}" text-anchor="middle" fill="${edge.stroke}" font-size="10" font-weight="700">${escapeXml(
          edge.label
        )}</text>`
      );
    }
  }

  // Step Nodes
  for (const node of layout.nodes) {
    const st = STATUS_HEX[node.step.status];
    const stMeta = WORKFLOW_STATUS_META[node.step.status];
    const metric = liveMetricMap.get(node.step.id);
    const doneChk = node.step.checklist.filter((c) => c.done).length;
    const attachCount = countStepAttachments(node.step);

    parts.push(
      `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="12" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"/>`
    );
    parts.push(
      `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="6" rx="3" fill="${st.stroke}"/>`
    );
    parts.push(
      `<rect x="${node.x + 12}" y="${node.y + 16}" width="32" height="20" rx="5" fill="#e2e8f0"/>`
    );
    parts.push(
      `<text x="${node.x + 28}" y="${node.y + 30}" text-anchor="middle" fill="#16265E" font-size="11" font-weight="700">#${node.step.order}</text>`
    );
    parts.push(
      `<rect x="${node.x + node.w - 88}" y="${node.y + 16}" width="76" height="20" rx="10" fill="${st.badgeBg}" stroke="${st.stroke}" stroke-width="1"/>`
    );
    parts.push(
      `<text x="${node.x + node.w - 50}" y="${node.y + 30}" text-anchor="middle" fill="${st.badgeText}" font-size="10" font-weight="700">${escapeXml(
        stMeta.shortLabel
      )}</text>`
    );

    const titleLines = wrapTextLines(node.step.title, 28, 2);
    titleLines.forEach((line, idx) => {
      parts.push(
        `<text x="${node.x + 12}" y="${node.y + 56 + idx * 17}" fill="#0f172a" font-size="12" font-weight="700">${escapeXml(
          line
        )}</text>`
      );
    });

    if (metric) {
      parts.push(
        `<rect x="${node.x + 12}" y="${node.y + 88}" width="${node.w - 24}" height="22" rx="6" fill="#eff6ff" stroke="#bfdbfe"/>`
      );
      parts.push(
        `<text x="${node.x + 20}" y="${node.y + 103}" fill="#16265E" font-size="10" font-weight="700">${escapeXml(
          metric.badge.slice(0, 36)
        )}</text>`
      );
    }

    parts.push(
      `<text x="${node.x + 12}" y="${node.y + node.h - 24}" fill="#475569" font-size="10">${escapeXml(
        (node.step.assignee || "ยังไม่ระบุผู้รับผิดชอบ").slice(0, 24)
      )}</text>`
    );
    const rightSummary = [
      attachCount > 0 ? `แนบ ${attachCount}` : "",
      node.step.checklist.length > 0
        ? `ย่อย ${doneChk}/${node.step.checklist.length}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (rightSummary) {
      parts.push(
        `<text x="${node.x + node.w - 12}" y="${node.y + node.h - 24}" text-anchor="end" fill="#0f172a" font-size="10" font-weight="700">${escapeXml(
          rightSummary
        )}</text>`
      );
    }
  }

  // Expanded Sub-Nodes
  for (const sub of layout.subNodes) {
    parts.push(
      `<rect x="${sub.x}" y="${sub.y}" width="${sub.w}" height="${sub.h}" rx="8" fill="${
        sub.item.done ? "#f0fdf4" : "#ffffff"
      }" stroke="${sub.item.done ? "#6ee7b7" : "#cbd5e1"}" stroke-width="1.2"/>`
    );
    const subLines = wrapTextLines(sub.item.text, 28, 2);
    subLines.forEach((line, idx) => {
      parts.push(
        `<text x="${sub.x + 12}" y="${sub.y + 18 + idx * 14}" fill="${
          sub.item.done ? "#64748b" : "#1e293b"
        }" font-size="10.5" font-weight="600">${escapeXml(
          `${sub.item.done ? "☑" : "☐"} ${line}`
        )}</text>`
      );
    });
  }

  parts.push("</g>");

  const dateText = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  parts.push(
    `<text x="28" y="${totalH - 12}" fill="#64748b" font-size="10.5">${escapeXml(
      `จัดพิมพ์จากระบบรับสมัครบุคลากรกีฬา เมื่อ ${dateText}`
    )}</text>`
  );
  parts.push("</svg>");

  return { svg: parts.join(""), width: totalW, height: totalH };
}

export function WorkflowDiagram({
  steps,
  fiscalYearBE,
  liveMetricMap,
  onSelectStep,
  onQuickStatusCycle,
  onToggleChecklistDone,
}: WorkflowDiagramProps) {
  const [orientation, setOrientation] =
    useState<DiagramOrientation>("horizontal");
  const [zoom, setZoom] = useState(0.95);
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(() => {
    const active = steps.find(
      (s) =>
        (s.status === "in_progress" || s.status === "blocked") &&
        s.checklist.length > 0
    );
    return active ? new Set([active.id]) : new Set();
  });
  const [isExportingPng, setIsExportingPng] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const layout = useMemo(
    () => computeDiagramLayout(steps, orientation, expandedStepIds),
    [steps, orientation, expandedStepIds]
  );

  const stepsWithChecklist = useMemo(
    () => steps.filter((s) => s.checklist.length > 0),
    [steps]
  );

  const allExpanded =
    stepsWithChecklist.length > 0 &&
    stepsWithChecklist.every((s) => expandedStepIds.has(s.id));

  const toggleExpandStep = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedStepIds(new Set());
    } else {
      setExpandedStepIds(new Set(stepsWithChecklist.map((s) => s.id)));
    }
  };

  const handleFitToView = () => {
    const el = containerRef.current;
    if (!el || layout.width <= 0) {
      setZoom(1);
      return;
    }
    const availableW = Math.max(320, el.clientWidth - 24);
    const ratio = Math.min(1.1, Math.max(0.5, availableW / layout.width));
    setZoom(Math.round(ratio * 100) / 100);
  };

  const handleDownloadPng = async () => {
    if (isExportingPng || typeof window === "undefined") return;
    setIsExportingPng(true);
    try {
      const { svg, width, height } = buildExportSvgString(
        layout,
        fiscalYearBE,
        liveMetricMap
      );
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const scale = 2;
            const canvas = document.createElement("canvas");
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(url);
              reject(new Error("Canvas not available"));
              return;
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);

            canvas.toBlob((pngBlob) => {
              if (!pngBlob) {
                reject(new Error("PNG conversion failed"));
                return;
              }
              const pngUrl = URL.createObjectURL(pngBlob);
              const link = document.createElement("a");
              link.href = pngUrl;
              link.download = `SAT-Flowchart-${fiscalYearBE}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
              resolve();
            }, "image/png");
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to render SVG image"));
        };
        img.src = url;
      });
    } finally {
      setIsExportingPng(false);
    }
  };

  const subNodesByParent = useMemo(() => {
    const map = new Map<string, PositionedSubNode[]>();
    for (const sn of layout.subNodes) {
      const list = map.get(sn.parentStep.id) || [];
      list.push(sn);
      map.set(sn.parentStep.id, list);
    }
    return map;
  }, [layout.subNodes]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden print:hidden">
      {/* Diagram Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setOrientation("horizontal")}
              className={`rounded-md px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                orientation === "horizontal"
                  ? "bg-[#16265E] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แนวนอน (ซ้าย → ขวา)
            </button>
            <button
              type="button"
              onClick={() => setOrientation("vertical")}
              className={`rounded-md px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                orientation === "vertical"
                  ? "bg-[#16265E] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แนวตั้ง (บน → ล่าง)
            </button>
          </div>

          {stepsWithChecklist.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              {allExpanded
                ? "ย่อกิ่งรายการย่อยทั้งหมด"
                : "ขยายกิ่งรายการย่อยทั้งหมด"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white text-xs">
            <button
              type="button"
              onClick={() =>
                setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100))
              }
              title="ย่อผัง"
              aria-label="ย่อผัง"
              className="px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              −
            </button>
            <span className="border-x border-slate-200 px-2.5 py-1 font-bold text-[#16265E] min-w-[52px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  Math.min(1.35, Math.round((z + 0.1) * 100) / 100)
                )
              }
              title="ขยายผัง"
              aria-label="ขยายผัง"
              className="px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleFitToView}
              className="border-l border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              พอดีจอ
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={isExportingPng || steps.length === 0}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            {isExportingPng ? "กำลังสร้างภาพ..." : "ดาวน์โหลดภาพ PNG"}
          </button>
        </div>
      </div>

      {/* Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            เสร็จสิ้น
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2386D3] animate-pulse" />
            กำลังดำเนินการ (เส้นเคลื่อนไหว)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            ติดปัญหา/ล่าช้า
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            รอดำเนินการ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-amber-600" />
            เส้นโยงย้อนกลับ /
            <span className="inline-block w-4 border-t-2 border-dashed border-indigo-600" />
            เส้นโยงข้ามขั้น
          </span>
        </div>
        <span className="text-[10.5px] text-slate-400">
          คลิกที่กล่องเพื่อแก้ไขหรือโยงเส้นข้ามขั้นตอน · กดปุ่ม &quot;รายการย่อย&quot; เพื่อแตกแผนผังย่อยและเปิดเอกสารแนบ
        </span>
      </div>

      {/* Scrollable Interactive Canvas */}
      <div
        ref={containerRef}
        className="overflow-auto bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] bg-slate-50/60 p-3"
      >
        <div
          style={{
            width: `${Math.round(layout.width * zoom)}px`,
            height: `${Math.round(layout.height * zoom)}px`,
          }}
          className="relative mx-auto"
        >
          <div
            style={{
              width: `${layout.width}px`,
              height: `${layout.height}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
            className="relative"
          >
            {/* Layer 1: Phase Swimlane Backgrounds */}
            {layout.phases.map((p) => (
              <div
                key={p.meta.id}
                style={{
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                  width: `${p.w}px`,
                  height: `${p.h}px`,
                }}
                className={`absolute rounded-2xl border ${p.meta.headerBorder} bg-white/80 shadow-xs`}
              >
                <div
                  className={`flex items-center justify-between gap-2 rounded-t-[15px] border-b ${p.meta.headerBorder} ${p.meta.headerBg} px-3.5 py-2`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10.5px] font-extrabold ${p.meta.badgeBg} ${p.meta.badgeText}`}
                    >
                      {p.meta.shortTitle}
                    </span>
                    <span className="truncate text-xs font-extrabold text-slate-900">
                      {p.meta.title}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-slate-700">
                    {p.completedCount}/{p.totalCount} ขั้น
                  </span>
                </div>
              </div>
            ))}

            {/* Layer 2: SVG Bezier Arrows & Custom Arcs */}
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow-completed"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#2386D3" />
                </marker>
                <marker
                  id="arrow-blocked"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
                <marker
                  id="arrow-pending"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="arrow-loop"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
                </marker>
                <marker
                  id="arrow-custom"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5" />
                </marker>
                <marker
                  id="arrow-completed-sm"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-pending-sm"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
                </marker>
              </defs>

              {layout.edges.map((edge) => (
                <g key={edge.id}>
                  <path
                    d={edge.d}
                    fill="none"
                    stroke={edge.stroke}
                    strokeWidth={edge.strokeWidth}
                    strokeDasharray={
                      edge.animated ? "7 5" : edge.dashed ? "6 4" : undefined
                    }
                    markerEnd={edge.markerEnd || undefined}
                    strokeLinecap="round"
                  >
                    {edge.animated && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="1.1s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                  {edge.label &&
                    edge.labelX !== undefined &&
                    edge.labelY !== undefined && (
                      <g>
                        <rect
                          x={
                            edge.labelX -
                            Math.min(180, Math.max(56, edge.label.length * 7 + 16)) /
                              2
                          }
                          y={edge.labelY - 11}
                          width={Math.min(
                            180,
                            Math.max(56, edge.label.length * 7 + 16)
                          )}
                          height={20}
                          rx={10}
                          fill="#ffffff"
                          stroke={edge.stroke}
                          strokeWidth={1.3}
                        />
                        <text
                          x={edge.labelX}
                          y={edge.labelY + 3}
                          textAnchor="middle"
                          fill={edge.stroke}
                          fontSize="10"
                          fontWeight="700"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                </g>
              ))}
            </svg>

            {/* Layer 3: Step Node Cards */}
            {layout.nodes.map((node) => {
              const { step } = node;
              const statusMeta = WORKFLOW_STATUS_META[step.status];
              const metric = liveMetricMap.get(step.id);
              const overdue = isStepOverdue(step);
              const doneChecklist = step.checklist.filter((c) => c.done).length;
              const attachCount = countStepAttachments(step);
              const isExpanded = expandedStepIds.has(step.id);
              const hasChecklist = step.checklist.length > 0;

              return (
                <div
                  key={step.id}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.w}px`,
                    height: `${node.h}px`,
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectStep(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectStep(step.id);
                    }
                  }}
                  className={`group absolute flex flex-col justify-between rounded-xl border-2 p-3 text-left shadow-sm transition-all cursor-pointer ${statusMeta.nodeClass}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 rounded-t-[10px] ${statusMeta.accentBarClass}`}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="inline-flex h-5 min-w-6 items-center justify-center rounded bg-slate-100 px-1.5 text-[10.5px] font-extrabold text-[#16265E]">
                        #{step.order}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => void onQuickStatusCycle(e, step)}
                        title="คลิกเพื่อสลับสถานะด่วน"
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 cursor-pointer ${statusMeta.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass} ${
                            step.status === "in_progress" ? "animate-pulse" : ""
                          }`}
                        />
                        {statusMeta.shortLabel}
                      </button>
                    </div>

                    <h4 className="mt-1.5 line-clamp-2 text-xs font-extrabold leading-snug text-slate-900 group-hover:text-[#16265E]">
                      {step.title}
                    </h4>

                    {metric && (
                      <div
                        className={`mt-1.5 truncate rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                          metric.tone === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : metric.tone === "warning"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : metric.tone === "info"
                                ? "border-blue-200 bg-blue-50 text-[#16265E]"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {metric.badge}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate font-medium">
                        {step.assignee || "ยังไม่ระบุผู้รับผิดชอบ"}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5 font-bold">
                        {attachCount > 0 && (
                          <span className="text-[#2386D3]">
                            📎 {attachCount}
                          </span>
                        )}
                        {hasChecklist && (
                          <span className="text-slate-700">
                            ✓ {doneChecklist}/{step.checklist.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      {hasChecklist ? (
                        <button
                          type="button"
                          onClick={(e) => toggleExpandStep(e, step.id)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                            isExpanded
                              ? "bg-[#16265E] text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {isExpanded
                            ? "ย่อรายการย่อย ▴"
                            : `ขยายรายการย่อย (${step.checklist.length}) ▾`}
                        </button>
                      ) : step.dueDate ? (
                        <span
                          className={
                            overdue ? "font-bold text-red-600" : "text-slate-500"
                          }
                        >
                          กำหนด: {formatThaiShortDate(step.dueDate)}
                        </span>
                      ) : (
                        <span />
                      )}

                      {step.actionHref && (
                        <Link
                          href={step.actionHref}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-[#2386D3] hover:underline"
                        >
                          เปิดหน้างาน →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Layer 4: Expanded Checklist Sub-Flow Cards */}
            {Array.from(subNodesByParent.values())
              .flat()
              .map((sub) => {
                const atts = sub.item.attachments || [];
                return (
                  <div
                    key={`${sub.parentStep.id}-${sub.item.id}`}
                    style={{
                      left: `${sub.x}px`,
                      top: `${sub.y}px`,
                      width: `${sub.w}px`,
                      height: `${sub.h}px`,
                    }}
                    className={`absolute flex flex-col justify-center rounded-lg border px-2.5 py-1.5 shadow-xs ${
                      sub.item.done
                        ? "border-emerald-300 bg-emerald-50/70"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-1.5 text-[11px]">
                      <input
                        type="checkbox"
                        checked={sub.item.done}
                        onChange={() =>
                          void onToggleChecklistDone(
                            sub.parentStep,
                            sub.item.id
                          )
                        }
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600 cursor-pointer"
                      />
                      <span
                        className={`line-clamp-2 font-semibold leading-snug ${
                          sub.item.done
                            ? "line-through text-slate-400"
                            : "text-slate-800"
                        }`}
                      >
                        {sub.index + 1}. {sub.item.text}
                      </span>
                    </div>

                    {atts.length > 0 && (
                      <div className="mt-1 ml-5 flex items-center gap-1 overflow-hidden">
                        {atts.slice(0, 2).map((att) => {
                          const href =
                            att.kind === "link"
                              ? att.url || "#"
                              : `/api/admin/workflow/files?path=${encodeURIComponent(
                                  att.storagePath || ""
                                )}&name=${encodeURIComponent(att.name)}`;
                          return (
                            <a
                              key={att.id}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`เปิดดู ${att.name}`}
                              className="inline-flex max-w-[100px] items-center gap-0.5 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9.5px] font-bold text-[#16265E] hover:bg-blue-100 truncate"
                            >
                              <span>{att.kind === "link" ? "🔗" : "📄"}</span>
                              <span className="truncate">{att.name}</span>
                            </a>
                          );
                        })}
                        {atts.length > 2 && (
                          <span className="text-[9.5px] font-bold text-slate-500">
                            +{atts.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
