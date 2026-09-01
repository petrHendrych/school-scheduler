// Saved versions of a week. One imported timetable is the shared source; on top
// of it the student keeps several complete, named pick sets and switches
// between them. What is on the grid right now is the draft — a version becomes
// the draft when it is loaded, and edits to it are unsaved until saved back.

import { drop, loadStored, store } from './storage'

export type ScheduleVersion = {
  id: string
  name: string
  picks: string[]
  savedAt: number
}

/** What is on the grid right now. `from` is the version it was loaded from. */
export type Draft = { picks: string[]; from: string | null }

const VERSIONS_KEY = 'school-schedule:versions:v1'
const DRAFT_KEY = 'school-schedule:draft:v1'
/** Pre-versions single pick list; read once, to migrate a selection in progress. */
const LEGACY_PICKS_KEY = 'school-schedule:selection:v2'

export const emptyDraft: Draft = { picks: [], from: null }

export const loadVersions = (): ScheduleVersion[] => loadStored<ScheduleVersion[]>(VERSIONS_KEY, [])

export function loadDraft(): Draft {
  const stored = loadStored<Draft | null>(DRAFT_KEY, null)
  if (stored) return { picks: stored.picks ?? [], from: stored.from ?? null }
  // upgrading from the single-selection build: keep what was already picked
  return { picks: loadStored<string[]>(LEGACY_PICKS_KEY, []), from: null }
}

export const saveVersions = (versions: ScheduleVersion[]) => store(VERSIONS_KEY, versions)
export const saveDraft = (draft: Draft) => store(DRAFT_KEY, draft)

/** Used by "Delete data": no version may survive wiping the timetable. */
export function clearAll() {
  drop(VERSIONS_KEY)
  drop(DRAFT_KEY)
  drop(LEGACY_PICKS_KEY)
}

function samePicks(a: string[], b: string[]) {
  const inB = new Set(b)
  return a.length === b.length && a.every((key) => inB.has(key))
}

/** Unsaved work: either picks with no version behind them, or an edited one. */
export function isDirty(draft: Draft, versions: ScheduleVersion[]) {
  if (draft.from === null) return draft.picks.length > 0
  const source = versions.find((v) => v.id === draft.from)
  return source ? !samePicks(draft.picks, source.picks) : draft.picks.length > 0
}

/** First `pattern(n)` no saved version is called yet. */
export function nextVersionName(versions: ScheduleVersion[], pattern: (n: number) => string) {
  const taken = new Set(versions.map((v) => v.name))
  let n = versions.length + 1
  while (taken.has(pattern(n))) n++
  return pattern(n)
}

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
