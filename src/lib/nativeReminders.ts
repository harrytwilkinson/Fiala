import { useSyncExternalStore } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { doses } from "./doseLog";
import { isNative } from "./platform";
import { planReminders } from "./reminders";
import { schedules } from "./schedules";

// Keeps the phone's pending notifications in step with the user's schedules.
// Only active in the native app; the web version offers calendar files instead.

export type ReminderPermission = "granted" | "denied" | "prompt" | "unavailable";

let permission: ReminderPermission = isNative ? "prompt" : "unavailable";
const listeners = new Set<() => void>();
const setPermission = (p: ReminderPermission) => {
  permission = p;
  listeners.forEach((l) => l());
};

export function useReminderPermission(): ReminderPermission {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => permission,
    () => permission,
  );
}

function normalise(display: string): ReminderPermission {
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "prompt";
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isNative) return "unavailable";
  const { display } = await LocalNotifications.requestPermissions();
  setPermission(normalise(display));
  await syncReminders();
  return permission;
}

let syncing: Promise<void> | null = null;
let again = false;

/** Replace all pending reminders with a fresh plan. Safe to call often. */
export async function syncReminders(): Promise<void> {
  if (!isNative) return;
  if (syncing) {
    again = true;
    return syncing;
  }
  syncing = (async () => {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      setPermission(normalise(display));
      if (display !== "granted") return;
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      }
      const plan = planReminders(schedules.get(), doses.get());
      if (plan.length) {
        await LocalNotifications.schedule({
          notifications: plan.map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: r.at }, extra: { scheduleId: r.scheduleId } })),
        });
      }
    } catch (e) {
      console.warn("Could not sync reminders", e);
    } finally {
      syncing = null;
      if (again) {
        again = false;
        void syncReminders();
      }
    }
  })();
  return syncing;
}

/** Call once at startup in the native app. */
export function startReminderSync() {
  if (!isNative) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncReminders(), 400);
  };
  schedules.subscribe(soon);
  doses.subscribe(soon);
  // Re-plan when the app comes back to the foreground so the 2-week window rolls forward.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") soon();
  });
  void syncReminders();
}
