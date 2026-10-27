"use client";

import { useSyncExternalStore } from "react";

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
  startMonth: number; // 10, 11, 12
  endDay: number;
  endMonth: number; // 10, 11, 12
  location: string;
  category: EventCategory;
  categoryLabel: string;
  left: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  colorTone: "purple" | "indigo" | "amber" | "teal";
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  national: "มหกรรมกีฬาแห่งชาติ",
  youth: "กีฬาเยาวชนแห่งชาติ",
  para: "กีฬาคนพิการแห่งชาติ",
  championship: "ชิงชนะเลิศแห่งประเทศไทย",
  international: "กีฬานานาชาติ / ซีเกมส์",
};

/**
 * Calculates timeline coordinates (left% & width%)
 * Grid columns:
 * Col 1: ตุลาคม 2570 (0% - 25%)
 * Col 2: 1-10 พ.ย. 2570 (25% - 50%)
 * Col 3: 11-30 พ.ย. 2570 (50% - 75%)
 * Col 4: ธันวาคม 2570 (75% - 100%)
 */
export function dateToTimelinePercent(day: number, month: number): number {
  if (month === 10) {
    const clampedDay = Math.min(Math.max(day, 10), 31);
    return Math.max(0, 5 + ((clampedDay - 10) / 21) * 20);
  }
  if (month === 11) {
    if (day <= 10) {
      const clampedDay = Math.min(Math.max(day, 1), 10);
      return 25 + ((clampedDay - 1) / 9) * 25;
    } else {
      const clampedDay = Math.min(Math.max(day, 11), 30);
      return 50 + ((clampedDay - 11) / 19) * 25;
    }
  }
  if (month === 12) {
    const clampedDay = Math.min(Math.max(day, 1), 31);
    return 75 + ((clampedDay - 1) / 30) * 22;
  }
  return 0;
}

export function computeEventBounds(
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number
): { left: number; width: number } {
  const left = Math.round(dateToTimelinePercent(startDay, startMonth) * 10) / 10;
  const right = Math.round(dateToTimelinePercent(endDay, endMonth) * 10) / 10;
  const width = Math.max(5.5, Math.round(Math.max(4, right - left) * 10) / 10);
  return { left, width };
}

export const DEFAULT_SPORTS_EVENTS: SportsEvent[] = [
  {
    id: "evt-youth-2570",
    title: "กีฬาเยาวชนแห่งชาติ รอบคัดเลือกตัวแทนภาค",
    english: "(National Youth Games - Regional Qualifiers)",
    dateRange: "18 - 28 ต.ค. 2570",
    startDay: 18,
    startMonth: 10,
    endDay: 28,
    endMonth: 10,
    location: "สนามกีฬากลาง 5 ภาคทั่วประเทศ",
    category: "youth",
    categoryLabel: "กีฬาเยาวชนแห่งชาติ",
    left: 13.5,
    width: 14.5,
    colorTone: "purple",
  },
  {
    id: "evt-para-2570",
    title: "การแข่งขันกีฬาคนพิการแห่งชาติ",
    english: "(Thailand National Para Games)",
    dateRange: "7 - 14 พ.ย. 2570",
    startDay: 7,
    startMonth: 11,
    endDay: 14,
    endMonth: 11,
    location: "จ.สุพรรณบุรี",
    category: "para",
    categoryLabel: "กีฬาคนพิการแห่งชาติ",
    left: 42.5,
    width: 14.8,
    colorTone: "indigo",
  },
  {
    id: "evt-champ-2570",
    title: "การแข่งขันกีฬาชิงชนะเลิศแห่งประเทศไทย",
    english: "(Thailand National Championships 2027)",
    dateRange: "24 - 30 พ.ย. 2570",
    startDay: 24,
    startMonth: 11,
    endDay: 30,
    endMonth: 11,
    location: "ศูนย์กีฬาหัวหมาก กทม.",
    category: "championship",
    categoryLabel: "ชิงชนะเลิศแห่งประเทศไทย",
    left: 67.5,
    width: 9.5,
    colorTone: "amber",
  },
  {
    id: "evt-national-2570",
    title: "มหกรรมกีฬาแห่งชาติ ครั้งที่ 49",
    english: "(49th Thailand National Games)",
    dateRange: "9 - 19 ธ.ค. 2570",
    startDay: 9,
    startMonth: 12,
    endDay: 19,
    endMonth: 12,
    location: "จ.จันทบุรี (เจ้าภาพ)",
    category: "national",
    categoryLabel: "มหกรรมกีฬาแห่งชาติ",
    left: 81.0,
    width: 12.0,
    colorTone: "purple",
  },
];

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
        events: parsed,
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
  const { left, width } = computeEventBounds(
    input.startDay,
    input.startMonth,
    input.endDay,
    input.endMonth
  );

  const newEvent: SportsEvent = {
    ...input,
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

    const { left, width } = computeEventBounds(
      startDay,
      startMonth,
      endDay,
      endMonth
    );

    updated = {
      ...evt,
      ...patch,
      id: evt.id,
      startDay,
      startMonth,
      endDay,
      endMonth,
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
