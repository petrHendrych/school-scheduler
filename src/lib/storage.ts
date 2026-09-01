// localStorage wrappers used by every persisted bit of state. Both swallow
// failures: in a private window storage throws, and the app still works for
// the session — it just forgets everything on reload.

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private window) — everything still works this session
  }
}

export function drop(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // nothing to clean up when storage is unavailable
  }
}
