"use client";

import { useSyncExternalStore } from "react";
import defaultSportsEventsData from "@/data/sports-events.json";

export type EventCategory =
  | "national"
  | "youth"
  | "para"
  | "championship"
  | "international";

export interface SportsEvent {
  id: string;
  title: string;
  english: string;
  dateRange: string;
  startDay: number;
  startMonth: number; // 1..12
  endDay: number;
  endMonth: number; // 1..12
  year?: number; // П.ศ. เช่น 2570, 2571
  endYear?: number; // พ.ศ. สิ้นสุด (กรณีข้ามปี)
  location: string;
  category: EventCategory;
  categoryLabel: string;
  left: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  colorTone: "purple" | "indigo" | "amber" | "teal";
}

export function getEventYear(
  event: Pick<SportsEvent, "year" | "dateRange">
): number {
  if (typeof event.year === "number" && event.year >= 2568 && event.year <= 2580) {
    return event.year;
  }
  const match = event.dateRange?.match(/(25\d{2})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 2570;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  national: "มหกรรมกีฬาแห่งชาติ",
  youth: "กีฬาเยาวชนแห่งชาติ",
  para: "กีฬาคนพิการแห่งชาติ",
  championship: "ชิงชนะเลิศแห่งประเทศไทย",
  international: "กีฬานานาชาติ / ซีเกมส์",
};

export interface TimelineMonthSlot {
  index: number;
  month: number; // 1..12
  year: number; // 2569, 2570, 2571
  shortLabel: string; // e.g. "ต.ค. 69"
  monthShort: string; // e.g. "ต.ค."
  fullLabel: string; // e.g. "ตุลาคม 2569"
  quarter: 1 | 2 | 3 | 4 | 5;
  quarterLabel: string;
  isPostFiscal: boolean;
}

/**
 * 16-month continuous timeline:
 * - ไตรมาส 1 (ต.ค. – ธ.ค. 2569): slots 0..2
 * - ไตรมาส 2 (ม.ค. – มี.ค. 2570): slots 3..5
 * - ไตรมาส 3 (เม.ย. – มิ.ย. 2570): slots 6..8
 * - ไตรมาส 4 (ก.ค. – ก.ย. 2570): slots 9..11
 * - ช่วงต่อเนื่องหลังปีงบฯ (ต.ค. 2570 – ม.ค. 2571): slots 12..15
 */
export const TIMELINE_SLOTS: readonly TimelineMonthSlot[] = [
  { index: 0, month: 10, year: 2569, shortLabel: "ต.ค. 69", monthShort: "ต.ค.", fullLabel: "ตุลาคม 2569", quarter: 1, quarterLabel: "ไตรมาส 1", isPostFiscal: false },
  { index: 1, month: 11, year: 2569, shortLabel: "พ.ย. 69", monthShort: "พ.ย.", fullLabel: "พฤศจิกายน 2569", quarter: 1, quarterLabel: "ไตรมาส 1", isPostFiscal: false },
  { index: 2, month: 12, year: 2569, shortLabel: "ธ.ค. 69", monthShort: "ธ.ค.", fullLabel: "ธันวาคม 2569", quarter: 1, quarterLabel: "ไตรมาส 1", isPostFiscal: false },
  { index: 3, month: 1, year: 2570, shortLabel: "ม.ค. 70", monthShort: "ม.ค.", fullLabel: "มกราคม 2570", quarter: 2, quarterLabel: "ไตรมาส 2", isPostFiscal: false },
  { index: 4, month: 2, year: 2570, shortLabel: "ก.พ. 70", monthShort: "ก.พ.", fullLabel: "กุมภาพันธ์ 2570", quarter: 2, quarterLabel: "ไตรมาส 2", isPostFiscal: false },
  { index: 5, month: 3, year: 2570, shortLabel: "มี.ค. 70", monthShort: "มี.ค.", fullLabel: "มีนาคม 2570", quarter: 2, quarterLabel: "ไตรมาส 2", isPostFiscal: false },
  { index: 6, month: 4, year: 2570, shortLabel: "เม.ย. 70", monthShort: "เม.ย.", fullLabel: "เมษายน 2570", quarter: 3, quarterLabel: "ไตรมาส 3", isPostFiscal: false },
  { index: 7, month: 5, year: 2570, shortLabel: "พ.ค. 70", monthShort: "พ.ค.", fullLabel: "พฤษภาคม 2570", quarter: 3, quarterLabel: "ไตรมาส 3", isPostFiscal: false },
  { index: 8, month: 6, year: 2570, shortLabel: "มิ.ย. 70", monthShort: "มิ.ย.", fullLabel: "มิถุนายน 2570", quarter: 3, quarterLabel: "ไตรมาส 3", isPostFiscal: false },
  { index: 9, month: 7, year: 2570, shortLabel: "ก.ค. 70", monthShort: "ก.ค.", fullLabel: "กรกฎาคม 2570", quarter: 4, quarterLabel: "ไตรมาส 4", isPostFiscal: false },
  { index: 10, month: 8, year: 2570, shortLabel: "ส.ค. 70", monthShort: "ส.ค.", fullLabel: "สิงหาคม 2570", quarter: 4, quarterLabel: "ไตรมาส 4", isPostFiscal: false },
  { index: 11, month: 9, year: 2570, shortLabel: "ก.ย. 70", monthShort: "ก.ย.", fullLabel: "กันยายน 2570", quarter: 4, quarterLabel: "ไตรมาส 4", isPostFiscal: false },
  { index: 12, month: 10, year: 2570, shortLabel: "ต.ค. 70", monthShort: "ต.ค.", fullLabel: "ตุลาคม 2570", quarter: 5, quarterLabel: "หลังปีงบฯ (ไตรมาส 1/71)", isPostFiscal: true },
  { index: 13, month: 11, year: 2570, shortLabel: "พ.ย. 70", monthShort: "พ.ย.", fullLabel: "พฤศจิกายน 2570", quarter: 5, quarterLabel: "หลังปีงบฯ (ไตรมาส 1/71)", isPostFiscal: true },
  { index: 14, month: 12, year: 2570, shortLabel: "ธ.ค. 70", monthShort: "ธ.ค.", fullLabel: "ธันวาคม 2570", quarter: 5, quarterLabel: "หลังปีงบฯ (ไตรมาส 1/71)", isPostFiscal: true },
  { index: 15, month: 1, year: 2571, shortLabel: "ม.ค. 71", monthShort: "ม.ค.", fullLabel: "มกราคม 2571", quarter: 5, quarterLabel: "หลังปีงบฯ (ไตรมาส 2/71)", isPostFiscal: true },
];

export const TOTAL_TIMELINE_SLOTS = TIMELINE_SLOTS.length; // 16

/**
 * Maps (month 1..12, yearBE) to slot index 0..15 on the continuous Oct 2569 – Jan 2571 timeline.
 */
export function yearMonthToSlotIndex(month: number, yearBE = 2570): number {
  const clampedMonth = Math.min(Math.max(month, 1), 12);
  const raw = (yearBE - 2569) * 12 + (clampedMonth - 10);
  return Math.min(Math.max(raw, 0), TOTAL_TIMELINE_SLOTS - 1);
}

export function monthToFiscalIndex(month: number): number {
  const clampedMonth = Math.min(Math.max(month, 1), 12);
  return clampedMonth >= 10 ? clampedMonth - 10 : clampedMonth + 2;
}

export function getFiscalQuarter(month: number): 1 | 2 | 3 | 4 {
  const idx = monthToFiscalIndex(month);
  return (Math.floor(idx / 3) + 1) as 1 | 2 | 3 | 4;
}

/**
 * Calculates timeline coordinates (0% - 100%) across the 16 continuous months (Oct 2569 .. Jan 2571).
 */
export function dateToTimelinePercent(
  day: number,
  month: number,
  yearBE = 2570
): number {
  const slotIdx = yearMonthToSlotIndex(month, yearBE); // 0..15
  const clampedDay = Math.min(Math.max(day, 1), 31); // 1..31
  const fraction = (slotIdx + (clampedDay - 1) / 31) / TOTAL_TIMELINE_SLOTS;
  return Math.min(Math.max(fraction * 100, 0.3), 98.8);
}

export function computeEventBounds(
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number,
  startYear = 2570,
  endYear = startYear
): { left: number; width: number } {
  const left =
    Math.round(dateToTimelinePercent(startDay, startMonth, startYear) * 10) / 10;
  const right =
    Math.round(dateToTimelinePercent(endDay + 1, endMonth, endYear) * 10) / 10;
  const rawWidth = right >= left ? right - left : 3.0;
  const width = Math.max(1.8, Math.round(rawWidth * 10) / 10);
  return { left: Math.min(left, 100 - width - 0.3), width };
}

function normalizeEvents(list: SportsEvent[]): SportsEvent[] {
  return list.map((evt) => {
    const year = getEventYear(evt);
    const endYear = evt.endYear ?? year;
    const { left, width } = computeEventBounds(
      evt.startDay,
      evt.startMonth,
      evt.endDay,
      evt.endMonth,
      year,
      endYear
    );
    return { ...evt, year, endYear, left, width };
  });
}

export const DEFAULT_SPORTS_EVENTS: SportsEvent[] = normalizeEvents(
  defaultSportsEventsData as SportsEvent[]
);

export function getSportsEventsSnapshot(): SportsEvent[] {
  return state.events;
}

const STORAGE_KEY = "sat-sports-events-v2";

interface SportsEventsState {
  events: SportsEvent[];
  revision: number;
}

const INITIAL_STATE: SportsEventsState = {
  events: DEFAULT_SPORTS_EVENTS,
  revision: 0,
};

let state: SportsEventsState = {
  events: [...DEFAULT_SPORTS_EVENTS],
  revision: 0,
};

let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  } catch {
    // LocalStorage fallback
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      state = {
        events: normalizeEvents(parsed),
        revision: state.revision + 1,
      };
      emit();
    }
  } catch {
    // fallback to defaults
  }
}

function getServerSnapshot(): SportsEventsState {
  return INITIAL_STATE;
}

export function useSportsEvents() {
  hydrate();
  const snapshot = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => state,
    getServerSnapshot
  );

  return {
    events: snapshot.events,
    addSportsEvent,
    updateSportsEvent,
    deleteSportsEvent,
    resetSportsEvents,
  };
}

export function addSportsEvent(
  input: Omit<SportsEvent, "id" | "left" | "width">
) {
  const startYear = input.year ?? 2570;
  const endYear = input.endYear ?? startYear;
  const { left, width } = computeEventBounds(
    input.startDay,
    input.startMonth,
    input.endDay,
    input.endMonth,
    startYear,
    endYear
  );

  const newEvent: SportsEvent = {
    ...input,
    year: startYear,
    endYear,
    id: `evt-custom-${Date.now()}`,
    left,
    width,
  };

  state = {
    events: [...state.events, newEvent],
    revision: state.revision + 1,
  };
  persist();
  emit();
  return newEvent;
}

export function updateSportsEvent(
  id: string,
  patch: Partial<Omit<SportsEvent, "id">>
): SportsEvent | undefined {
  let updated: SportsEvent | undefined;

  const nextEvents = state.events.map((evt) => {
    if (evt.id !== id) return evt;

    const startDay = patch.startDay ?? evt.startDay;
    const startMonth = patch.startMonth ?? evt.startMonth;
    const endDay = patch.endDay ?? evt.endDay;
    const endMonth = patch.endMonth ?? evt.endMonth;
    const year = patch.year ?? getEventYear(evt);
    const endYear = patch.endYear ?? evt.endYear ?? year;

    const { left, width } = computeEventBounds(
      startDay,
      startMonth,
      endDay,
      endMonth,
      year,
      endYear
    );

    updated = {
      ...evt,
      ...patch,
      id: evt.id,
      startDay,
      startMonth,
      endDay,
      endMonth,
      year,
      endYear,
      left,
      width,
    };
    return updated;
  });

  if (!updated) return undefined;

  state = {
    events: nextEvents,
    revision: state.revision + 1,
  };
  persist();
  emit();
  return updated;
}

export function deleteSportsEvent(id: string) {
  state = {
    events: state.events.filter((e) => e.id !== id),
    revision: state.revision + 1,
  };
  persist();
  emit();
}

export function resetSportsEvents() {
  state = {
    events: [...DEFAULT_SPORTS_EVENTS],
    revision: state.revision + 1,
  };
  persist();
  emit();
}
