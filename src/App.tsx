import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import qrcode from 'qrcode-generator'
import { ParseError, parseSchedule, type Lesson, type Schedule } from './lib/parseSchedule'
import { decodePage, decodeShare, encodeShare, shareUrl } from './lib/share'
import { drop, loadStored, store } from './lib/storage'
import { browserLang, STRINGS, type Strings } from './lib/strings'
import {
  clearAll,
  emptyDraft,
  isDirty,
  loadDraft,
  loadVersions,
  newId,
  nextVersionName,
  saveDraft,
  saveVersions,
  type Draft,
  type ScheduleVersion,
} from './lib/versions'
import './App.css'

const DATA_KEY = 'school-schedule:data'
const THEME_KEY = 'school-schedule:theme'

type Theme = 'system' | 'light' | 'dark'

const CONSOLE_SNIPPET = 'copy(document.documentElement.outerHTML)'
const bookmarklet = (appUrl: string) =>
  "javascript:(async()=>{try{const b=new Uint8Array(await new Response(new Blob([document.documentElement.outerHTML])" +
  ".stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let s='';for(const c of b)s+=String.fromCharCode(c);" +
  `location.href='${appUrl}#r='+btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')` +
  "}catch(e){alert(e)}})()"
/** Above this the QR gets too dense for a phone camera; the link still works. */
const QR_LIMIT = 2400

/**
 * Pastel palette, one hue per course. Hues are hand-picked to stay distinct
 * next to each other; the tint/shade for each theme is derived in CSS.
 */
const HUES = [206, 145, 32, 275, 340, 178, 50, 96, 240, 165, 300, 190]

/** Identifies one variant: UIS repeats the same slot in several rows. */
function variantKey(e: Lesson) {
  // week parity matters: the same slot often hosts an odd- and an even-week variant
  return [e.courseId, e.day, e.startIndex, e.room, e.group, e.week ?? 'weekly'].join('|')
}

/**
 * Variants compete within one course *and* one lesson type: a course can offer
 * several lectures (a lecture repeated on two days) as well as several seminars.
 */
const groupKey = (e: Lesson) => `${e.courseId}|${e.type}`

/**
 * Alternative timetable items overlap in the same day, so each day is split
 * into lanes: first-fit packing of lessons that do not collide in time.
 */
function lanesFor(lessons: Lesson[]) {
  const lanes: Lesson[][] = []
  for (const lesson of [...lessons].sort((a, b) => a.startIndex - b.startIndex)) {
    const lane = lanes.find((l) =>
      l.every(
        (o) =>
          lesson.startIndex >= o.startIndex + o.span || o.startIndex >= lesson.startIndex + lesson.span,
      ),
    )
    if (lane) lane.push(lesson)
    else lanes.push([lesson])
  }
  return lanes
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = loadStored<Theme>(THEME_KEY, 'system')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  })

  // an explicit choice wins over prefers-color-scheme; "system" removes the flag
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    store(THEME_KEY, theme)
  }, [theme])

  return [theme, setTheme] as const
}

function ThemeButton({ t, theme, setTheme }: { t: Strings; theme: Theme; setTheme: (v: Theme) => void }) {
  return (
    <button
      className="chip theme"
      onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')}
      title={t.themeHint}
    >
      {theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐'} {t.theme[theme]}
    </button>
  )
}

function CopyButton({ t, text }: { t: Strings; text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <button
      className={copied ? 'copy done' : 'copy'}
      title={t.copy}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true))
      }}
    >
      {copied ? (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 8.5 6.2 12 13 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="5.2" y="5.2" width="8.3" height="8.3" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.8 5.2V3.9c0-.8-.6-1.4-1.4-1.4H3.9c-.8 0-1.4.6-1.4 1.4v5.5c0 .8.6 1.4 1.4 1.4h1.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {copied ? t.copied : t.copy}
    </button>
  )
}

function SharePanel({
  t,
  schedule,
  picks,
  onClose,
}: {
  t: Strings
  schedule: Schedule
  picks: string[]
  onClose: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    encodeShare({ schedule, picks })
      .then((token) => live && setUrl(shareUrl(token)))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [schedule, picks])

  const qr = useMemo(() => {
    if (!url || url.length > QR_LIMIT) return null
    const code = qrcode(0, 'L')
    code.addData(url)
    code.make()
    return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  }, [url])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <section className="share">
      <div className="share-head">
        <h2>{t.shareTitle}</h2>
        <button className="chip" onClick={onClose}>
          ✕ {t.close}
        </button>
      </div>
      <p className="picker-hint">{t.shareHelp}</p>
      {failed && <p className="error">{t.shareError}</p>}
      {qr ? (
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
      ) : (
        url && <p className="picker-hint">{t.shareTooBig}</p>
      )}
      {url && (
        <button
          className={copied ? 'copy done' : 'copy static'}
          onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))}
        >
          {copied ? t.copied : t.copyLink}
        </button>
      )}
    </section>
  )
}

function ImportScreen({
  t,
  theme,
  setTheme,
  onLoaded,
  onCancel,
  initialError,
}: {
  t: Strings
  theme: Theme
  setTheme: (v: Theme) => void
  onLoaded: (schedule: Schedule) => void
  onCancel?: () => void
  initialError?: string | null
}) {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [dragging, setDragging] = useState(false)

  function load(source: string) {
    if (!source.trim()) return setError(t.errEmpty)
    try {
      onLoaded(parseSchedule(source))
    } catch (e) {
      setError(e instanceof ParseError ? t.errNoTimetable : t.errGeneric)
    }
  }

  return (
    <main className="import">
      <header className="import-head">
        <h1>{t.importTitle}</h1>
        <div className="toggles">
          {onCancel && (
            <button className="chip" onClick={onCancel}>
              ✕
            </button>
          )}
          <ThemeButton t={t} theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <p className="privacy">{t.privacy}</p>

      <ol className="steps">
        <li>{t.step1}</li>
        <li>
          {t.step2}
          <div className="snippet">
            <pre>{CONSOLE_SNIPPET}</pre>
            <CopyButton t={t} text={CONSOLE_SNIPPET} />
          </div>
        </li>
        <li>{t.step3}</li>
      </ol>

      <details className="bookmarklet">
        <summary>{t.onPhone}</summary>
        <p className="picker-hint">{t.onPhoneHelp}</p>
        <div className="snippet">
          <pre>{bookmarklet(location.origin + location.pathname)}</pre>
          <CopyButton t={t} text={bookmarklet(location.origin + location.pathname)} />
        </div>
      </details>

      <div
        className={dragging ? 'dropzone over' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void file.text().then(load)
        }}
      >
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value)
            setError(null)
          }}
          placeholder={dragging ? t.dropHere : t.paste}
          spellCheck={false}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="primary" onClick={() => load(html)}>
        {t.load}
      </button>
    </main>
  )
}

/**
 * Saved weeks. A version is only savable once every choice is decided, so each
 * one is a full week the student could actually attend; loading one puts it
 * back on the grid, which is how two versions get compared.
 */
function VersionsBar({
  t,
  versions,
  loaded,
  dirty,
  complete,
  missing,
  onLoad,
  onNew,
  onSave,
  onSaveAsNew,
  onDiscard,
  onRename,
  onDelete,
}: {
  t: Strings
  versions: ScheduleVersion[]
  loaded: ScheduleVersion | null
  dirty: boolean
  complete: boolean
  missing: number
  onLoad: (v: ScheduleVersion) => void
  onNew: () => void
  onSave: () => void
  onSaveAsNew: () => void
  onDiscard: () => void
  onRename: (v: ScheduleVersion) => void
  onDelete: (v: ScheduleVersion) => void
}) {
  // nothing to offer when a loaded version is saved and unchanged
  const showActions = dirty || !loaded || !complete

  return (
    <section className="versions">
      <div className="versions-row">
        <span className="versions-label">{t.versionsLabel}</span>
        {versions.length === 0 ? (
          <span className="versions-empty">{t.noVersions}</span>
        ) : (
          versions.map((v) => {
            const active = v.id === loaded?.id
            return (
              <span className={active ? 'version-chip on' : 'version-chip'} key={v.id}>
                <button className="version-open" onClick={() => onLoad(v)} title={t.switchVersion}>
                  {v.name}
                  {active && dirty && <span className="version-dirty">•</span>}
                </button>
                {active && (
                  <>
                    <button className="version-act" onClick={() => onRename(v)} title={t.renameVersion}>
                      ✎
                    </button>
                    <button className="version-act" onClick={() => onDelete(v)} title={t.deleteVersion}>
                      ✕
                    </button>
                  </>
                )}
              </span>
            )
          })
        )}
        <button className="chip" onClick={onNew}>
          + {t.newVersion}
        </button>
      </div>

      {showActions && (
        <div className="versions-row">
          {loaded && dirty && <span className="badge no">{t.unsavedChanges}</span>}
          {loaded && dirty ? (
            <>
              <button className="chip save" onClick={onSave} disabled={!complete}>
                {t.saveChanges}
              </button>
              <button className="chip" onClick={onSaveAsNew} disabled={!complete}>
                {t.saveAsNew}
              </button>
              <button className="chip" onClick={onDiscard}>
                {t.discardChanges}
              </button>
            </>
          ) : (
            !loaded && (
              <button className="chip save" onClick={onSaveAsNew} disabled={!complete}>
                {t.saveVersion}
              </button>
            )
          )}
          {!complete && <span className="versions-hint">{t.saveIncomplete(missing)}</span>}
        </div>
      )}

      <p className="picker-hint">{t.versionsHint}</p>
    </section>
  )
}

function ScheduleView({
  schedule,
  t,
  theme,
  setTheme,
  onReimport,
  onForget,
}: {
  schedule: Schedule
  t: Strings
  theme: Theme
  setTheme: (v: Theme) => void
  onReimport: () => void
  onForget: () => void
}) {
  const { hours, events, notes } = schedule

  const [versions, setVersions] = useState<ScheduleVersion[]>(loadVersions)
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [sharing, setSharing] = useState(false)
  const [pickedOnly, setPickedOnly] = useState(false)
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set())

  useEffect(() => saveVersions(versions), [versions])
  useEffect(() => saveDraft(draft), [draft])

  /** The picks on the grid are the draft's; a version is a saved copy of them. */
  const picked = draft.picks
  const loadedVersion = versions.find((v) => v.id === draft.from) ?? null
  const dirty = isDirty(draft, versions)

  const setPicks = (update: (prev: string[]) => string[]) =>
    setDraft((d) => ({ ...d, picks: update(d.picks) }))

  const pickedSet = useMemo(() => new Set(picked), [picked])

  /** courseId -> hue, assigned in alphabetical course order so it never shifts. */
  const courseHues = useMemo(
    () =>
      new Map(
        [...new Map(events.map((e) => [e.courseId, e.course]))]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id], i) => [id, HUES[i % HUES.length]]),
      ),
    [events],
  )
  const hue = (courseId: string) => courseHues.get(courseId) ?? 210

  /** How many distinct variants each (course, lesson type) group offers. */
  const groupVariants = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const e of events) {
      let seen = m.get(groupKey(e))
      if (!seen) m.set(groupKey(e), (seen = new Set()))
      seen.add(variantKey(e))
    }
    return m
  }, [events])

  /** A group with a single variant is fixed; with several, one must be picked. */
  const isChoosable = useMemo(
    () => (e: Lesson) => (groupVariants.get(groupKey(e))?.size ?? 0) > 1,
    [groupVariants],
  )

  /** One entry per course, with a status row per group that needs a choice. */
  const courses = useMemo(() => {
    type Group = { type: Lesson['type']; variants: number; picks: Lesson[] }
    type Entry = { id: string; name: string; groups: Map<string, Group> }
    const byCourse = new Map<string, Entry>()
    for (const e of events) {
      let course = byCourse.get(e.courseId)
      if (!course) {
        course = { id: e.courseId, name: e.course, groups: new Map() }
        byCourse.set(e.courseId, course)
      }
      if (!isChoosable(e)) continue
      let group = course.groups.get(e.type)
      if (!group) {
        course.groups.set(
          e.type,
          (group = { type: e.type, variants: groupVariants.get(groupKey(e))!.size, picks: [] }),
        )
      }
      const key = variantKey(e)
      if (pickedSet.has(key) && !group.picks.some((p) => variantKey(p) === key)) group.picks.push(e)
    }
    return [...byCourse.values()]
      .map(({ id, name, groups }) => ({
        id,
        name,
        groups: [...groups.values()]
          .map((g) => ({
            ...g,
            picks: [...g.picks].sort((a, b) => a.dayIndex - b.dayIndex || a.startIndex - b.startIndex),
          }))
          .sort((a, b) => a.type.localeCompare(b.type)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [events, pickedSet, isChoosable, groupVariants])

  /** Groups the student has already committed to one or more variants of. */
  const decidedGroups = useMemo(() => {
    const decided = new Set<string>()
    for (const e of events) if (pickedSet.has(variantKey(e))) decided.add(groupKey(e))
    return decided
  }, [events, pickedSet])

  const visible = useMemo(
    () =>
      events.filter((e) => {
        // a group with one variant is fixed: no filter may hide it
        if (!isChoosable(e)) return true
        // a pick is a commitment — it stays on the grid whatever else is filtered
        if (pickedSet.has(variantKey(e))) return true
        // ...and it replaces the other variants of its group
        if (decidedGroups.has(groupKey(e))) return false
        if (hiddenCourses.has(e.courseId)) return false
        return !pickedOnly
      }),
    [events, hiddenCourses, pickedOnly, pickedSet, decidedGroups, isChoosable],
  )

  const days = useMemo(() => {
    const byDay = new Map<string, Lesson[]>()
    for (const e of events) if (!byDay.has(e.day)) byDay.set(e.day, [])
    for (const e of visible) byDay.get(e.day)!.push(e)
    return [...byDay].map(([day, lessons]) => ({ day, lanes: lanesFor(lessons) }))
  }, [visible, events])

  const usedNotes = useMemo(
    () => [...new Set(visible.flatMap((e) => e.notes))].sort((a, b) => a - b),
    [visible],
  )

  const openChoices = courses.flatMap((c) => c.groups)
  const madeChoices = openChoices.filter((g) => g.picks.length > 0).length

  function togglePick(e: Lesson) {
    if (!isChoosable(e)) return
    const key = variantKey(e)
    setPicks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  /** Any move away from unsaved picks asks first — they cannot be recovered. */
  const mayLeaveDraft = () => !dirty || confirm(t.dirtyConfirm)

  function loadVersion(v: ScheduleVersion) {
    if (v.id === draft.from && !dirty) return
    if (!mayLeaveDraft()) return
    setDraft({ picks: [...v.picks], from: v.id })
  }

  function startNewVersion() {
    if (!mayLeaveDraft()) return
    setDraft(emptyDraft)
  }

  function saveOverLoaded() {
    if (!loadedVersion) return
    const id = loadedVersion.id
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, picks: [...draft.picks], savedAt: Date.now() } : v)),
    )
  }

  function saveAsNewVersion() {
    const name = prompt(t.namePrompt, nextVersionName(versions, t.versionName))?.trim()
    if (!name) return
    const created: ScheduleVersion = {
      id: newId(),
      name,
      picks: [...draft.picks],
      savedAt: Date.now(),
    }
    setVersions((prev) => [...prev, created])
    setDraft((d) => ({ ...d, from: created.id }))
  }

  function renameVersion(v: ScheduleVersion) {
    const name = prompt(t.namePrompt, v.name)?.trim()
    if (!name || name === v.name) return
    setVersions((prev) => prev.map((o) => (o.id === v.id ? { ...o, name } : o)))
  }

  /**
   * Deleting drops the version from the stored list for good; if it was the one
   * on the grid the picks stay, now unattached, so nothing vanishes on screen.
   */
  function deleteVersion(v: ScheduleVersion) {
    if (!confirm(t.deleteVersionConfirm(v.name))) return
    setVersions((prev) => prev.filter((o) => o.id !== v.id))
    if (draft.from === v.id) setDraft((d) => ({ ...d, from: null }))
  }

  function discardChanges() {
    if (!loadedVersion) return
    setDraft({ picks: [...loadedVersion.picks], from: loadedVersion.id })
  }

  function toggleCourse(courseId: string) {
    setHiddenCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  return (
    <div className="app">
      <header className="head">
        <div>
          <h1>{schedule.student}</h1>
          <p className="meta">
            {schedule.validity && (
              <span>
                {t.validity}: {schedule.validity}
              </span>
            )}
            {schedule.lastChange && (
              <span>
                {t.lastChange}: {schedule.lastChange}
              </span>
            )}
            <span>{t.lessons(visible.length, events.length)}</span>
            <span>{t.choicesPicked(madeChoices, openChoices.length)}</span>
          </p>
        </div>
        <div className="toggles">
          <button
            className={pickedOnly ? 'chip picked-only on' : 'chip picked-only'}
            onClick={() => setPickedOnly((v) => !v)}
          >
            {pickedOnly ? t.showingPicked : t.showPicked}
          </button>
          <button className="chip" onClick={() => setPicks(() => [])} disabled={picked.length === 0}>
            {t.clearPicks}
          </button>
          <button className={sharing ? 'chip on' : 'chip'} onClick={() => setSharing((v) => !v)}>
            {t.toPhone}
          </button>
          <button className="chip" onClick={onReimport}>
            {t.replace}
          </button>
          <button
            className="chip"
            onClick={() => {
              if (confirm(t.forgetConfirm)) onForget()
            }}
          >
            {t.forget}
          </button>
          <ThemeButton t={t} theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <VersionsBar
        t={t}
        versions={versions}
        loaded={loadedVersion}
        dirty={dirty}
        complete={madeChoices === openChoices.length}
        missing={openChoices.length - madeChoices}
        onLoad={loadVersion}
        onNew={startNewVersion}
        onSave={saveOverLoaded}
        onSaveAsNew={saveAsNewVersion}
        onDiscard={discardChanges}
        onRename={renameVersion}
        onDelete={deleteVersion}
      />

      {sharing && (
        <SharePanel t={t} schedule={schedule} picks={picked} onClose={() => setSharing(false)} />
      )}

      <section className="picker">
        <p className="picker-hint">{t.hint}</p>
        <ul className="course-list">
          {courses.map((course) => {
            const hidden = hiddenCourses.has(course.id)
            const nothingToPick = course.groups.length === 0
            return (
              <li
                className={hidden ? 'course-row off' : 'course-row'}
                key={course.id}
                style={{ '--h': hue(course.id) } as CSSProperties}
              >
                <button
                  className="course-name"
                  onClick={() => toggleCourse(course.id)}
                  disabled={nothingToPick}
                  title={nothingToPick ? t.nothingToPick : t.hideCourse}
                >
                  <span className="dot" />
                  {course.name}
                </button>
                {nothingToPick ? (
                  <span className="badge neutral">{t.lectureOnly}</span>
                ) : (
                  course.groups.map((group) => (
                    <span className="group-status" key={group.type}>
                      <span className={`kind ${group.type}`}>{t.kind[group.type]}</span>
                      {group.picks.length ? (
                        <>
                          <span className="badge yes">{t.picked}</span>
                          <span className="picks">
                            {group.picks.map((p) => (
                              <button
                                key={variantKey(p)}
                                className="pick-tag"
                                onClick={() => togglePick(p)}
                                title={t.unpickHint}
                              >
                                {p.day} {p.start} · {p.room}
                                {p.week && (
                                  <span className={`week ${p.week}`}>{t.weekShort[p.week]}</span>
                                )}
                                {p.group && <span className="pick-group">{p.group}</span>}
                              </button>
                            ))}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="badge no">{t.notPicked}</span>
                          <span className="picks muted">{t.variantsToPick(group.variants)}</span>
                        </>
                      )}
                    </span>
                  ))
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid-legend">
        <span className="sample lecture">
          <span className="kind lecture">{t.kind.lecture}</span> {t.legendLecture}
        </span>
        <span className="sample seminar">
          <span className="kind seminar">{t.kind.seminar}</span> {t.legendSeminar}
        </span>
        <span className="sample">
          <span className="week odd">{t.week.odd}</span>
          <span className="week even">{t.week.even}</span> {t.legendWeek}
        </span>
        <span className="sample picked-sample">{t.legendPicked}</span>
      </div>

      <div className="grid-scroll">
        <div className="grid" style={{ '--cols': hours.length } as CSSProperties}>
          <div className="corner" />
          {hours.map((h) => (
            <div key={h} className="hour">
              {h.replace('.', ':').replace('-', ' – ').replace('.', ':')}
            </div>
          ))}

          {days.map(({ day, lanes }) => (
            <div className="day-row" key={day}>
              <div className="day-name">{day}</div>
              <div className="day-body">
                {hours.map((_, i) => (
                  <div key={i} className="col-line" style={{ gridColumn: i + 1 }} />
                ))}
                {lanes.length === 0 && <div className="day-empty">—</div>}
                {lanes.flatMap((lane, laneIndex) =>
                  lane.map((e, i) => {
                    const choosable = isChoosable(e)
                    const isPicked = choosable && pickedSet.has(variantKey(e))
                    const action = choosable
                      ? `\n\n${isPicked ? t.clickUnpick : t.clickPick}`
                      : `\n\n${t.lectureFixed}`
                    return (
                      <article
                        key={`${day}-${laneIndex}-${i}`}
                        className={`lesson ${e.type}${choosable ? ' choosable' : ' fixed'}${
                          isPicked ? ' picked' : ''
                        }`}
                        style={
                          {
                            '--h': hue(e.courseId),
                            gridColumn: `${e.startIndex + 1} / span ${e.span}`,
                            gridRow: laneIndex + 1,
                          } as CSSProperties
                        }
                        onClick={() => togglePick(e)}
                        title={`${e.course} · ${e.start}–${e.end} · ${e.room}${
                          e.week ? ` · ${t.weeksOnly(t.week[e.week])}` : ''
                        }${e.group ? ` · ${e.group}` : ''}\n${e.teacher}${e.notes
                          .map((n) => `\n(${n}) ${notes[n] ?? ''}`)
                          .join('')}${action}`}
                      >
                        <div className="lesson-top">
                          <span className="room">{e.room}</span>
                          {e.week && <span className={`week ${e.week}`}>{t.week[e.week]}</span>}
                          <span className="time">
                            {e.start}–{e.end}
                          </span>
                        </div>
                        <div className="course">{e.course}</div>
                        <div className="lesson-bottom">
                          <span className={`kind ${e.type}`}>{t.kind[e.type]}</span>
                          <span className="teacher">{e.teacher}</span>
                          {e.notes.length > 0 && <span className="notes">({e.notes.join(',')})</span>}
                        </div>
                        {e.group && <div className="group">{e.group}</div>}
                      </article>
                    )
                  }),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {usedNotes.length > 0 && (
        <footer className="legend">
          <h2>{t.notesTitle}</h2>
          <dl>
            {usedNotes.map((n) => (
              <div key={n}>
                <dt>({n})</dt>
                <dd>{notes[n]}</dd>
              </div>
            ))}
          </dl>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  const [schedule, setSchedule] = useState<Schedule | null>(() =>
    loadStored<Schedule | null>(DATA_KEY, null),
  )
  const [importing, setImporting] = useState(false)
  const [version, setVersion] = useState(0)
  const [hashError, setHashError] = useState<'no-timetable' | 'generic' | null>(null)
  const [theme, setTheme] = useTheme()

  /**
   * Two handoffs arrive in the fragment: #s= from another device of ours,
   * #r= from the bookmarklet, which sends the gzipped UIS page itself.
   */
  useEffect(() => {
    const shared = location.hash.match(/^#s=(.+)$/)?.[1]
    const page = location.hash.match(/^#r=(.+)$/)?.[1]
    if (!shared && !page) return
    history.replaceState(null, '', location.pathname + location.search)

    const load = shared
      ? decodeShare(shared)
      : decodePage(page!).then((html) => ({ schedule: parseSchedule(html), picks: null }))

    void load
      .then(({ schedule: next, picks }) => {
        store(DATA_KEY, next)
        saveVersions([])
        saveDraft({ picks: picks ?? [], from: null })
        setSchedule(next)
        setImporting(false)
        setVersion((v) => v + 1)
      })
      .catch((e: unknown) => setHashError(e instanceof ParseError ? 'no-timetable' : 'generic'))
  }, [])

  const t = STRINGS[schedule?.lang ?? browserLang()]

  if (!schedule || importing) {
    return (
      <ImportScreen
        t={t}
        theme={theme}
        setTheme={setTheme}
        onCancel={schedule ? () => setImporting(false) : undefined}
        initialError={hashError && (hashError === 'no-timetable' ? t.errNoTimetable : t.errGeneric)}
        onLoaded={(next) => {
          store(DATA_KEY, next)
          setSchedule(next)
          setImporting(false)
          setVersion((v) => v + 1)
        }}
      />
    )
  }

  return (
    <ScheduleView
      key={version}
      schedule={schedule}
      t={t}
      theme={theme}
      setTheme={setTheme}
      onReimport={() => setImporting(true)}
      onForget={() => {
        drop(DATA_KEY)
        clearAll()
        setSchedule(null)
      }}
    />
  )
}
