import { useSyncExternalStore } from "react";

// Tiny on-device collection store backed by localStorage.
// Module-level state + useSyncExternalStore means every component reading
// the same collection sees the same data, and other tabs stay in sync too.

export interface Collection<T extends { id: string }> {
  use(): T[];
  get(): T[];
  add(item: Omit<T, "id">): T;
  update(id: string, patch: Partial<Omit<T, "id">>): void;
  remove(id: string): void;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function createCollection<T extends { id: string }>(
  key: string,
  normalize: (items: T[]) => T[] = (items) => items,
): Collection<T> {
  const listeners = new Set<() => void>();

  const read = (): T[] => {
    if (!hasStorage()) return [];
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? normalize(parsed) : [];
    } catch {
      return [];
    }
  };

  let items = read();

  const set = (next: T[]) => {
    items = normalize(next);
    if (hasStorage()) {
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch {
        // Storage full or blocked (private mode); in-memory state still works.
      }
    }
    listeners.forEach((l) => l());
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        items = read();
        listeners.forEach((l) => l());
      }
    });
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const get = () => items;

  return {
    use: () => useSyncExternalStore(subscribe, get, get),
    get,
    add(item) {
      const created = { ...item, id: newId() } as T;
      set([created, ...items]);
      return created;
    },
    update(id, patch) {
      set(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    remove(id) {
      set(items.filter((i) => i.id !== id));
    },
  };
}
