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

/**
 * Calculates timeline coordinates (0% - 100%) across 12 months (Jan = Col 1 .. Dec = Col 12).
 * Each month occupies exactly 100 / 12 = 8.3333% of the row width.
 */
export function dateToTimelinePercent(day: number, month: number): number {
  const clampedMonth = Math.min(Math.max(month, 1), 12); // 1..12
  const clampedDay = Math.min(Math.max(day, 1), 31); // 1..31
  const fraction = (clampedMonth - 1 + (clampedDay - 1) / 31) / 12;
  return Math.min(Math.max(fraction * 100, 0.4), 98.5);
}

export function computeEventBounds(
  startDay: number,
  startMonth: number,
  endDay: number,
  endMonth: number
): { left: number; width: number } {
  const left = Math.round(dateToTimelinePercent(startDay, startMonth) * 10) / 10;
  const right = Math.round(dateToTimelinePercent(endDay + 1, endMonth) * 10) / 10;
  const rawWidth = right >= left ? right - left : 8.3 - (left % 8.33);
  const width = Math.max(2.2, Math.round(rawWidth * 10) / 10);
  return { left: Math.min(left, 100 - width - 0.4), width };
}

function normalizeEvents(list: SportsEvent[]): SportsEvent[] {
  return list.map((evt) => {
    const year = getEventYear(evt);
    const { left, width } = computeEventBounds(
      evt.startDay,
      evt.startMonth,
      evt.endDay,
      evt.endMonth
    );
    return { ...evt, year, endYear: evt.endYear ?? year, left, width };
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
