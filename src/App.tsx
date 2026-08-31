import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ParseError, parseSchedule, type Lesson, type Schedule } from './lib/parseSchedule'
import './App.css'

const DATA_KEY = 'school-schedule:data'
const PICKS_KEY = 'school-schedule:selection:v2'
const THEME_KEY = 'school-schedule:theme'

type Theme = 'system' | 'light' | 'dark'

/** UI labels follow the language of the imported timetable. */
const STRINGS = {
  cs: {
    kind: { lecture: 'přednáška', seminar: 'cvičení' },
    week: { odd: 'lichý týden', even: 'sudý týden' },
    weekShort: { odd: 'lichý', even: 'sudý' },
    validity: 'Platnost',
    lastChange: 'Poslední změna',
    lessons: (shown: number, total: number) => `${shown} ze ${total} hodin`,
    choicesPicked: (done: number, total: number) => `vybráno ${done} z ${total} voleb`,
    showPicked: 'Zobrazit jen vybrané',
    showingPicked: 'Zobrazeny jen vybrané',
    clearPicks: 'zrušit výběr',
    hint: (
      <>
        Kliknutím na hodinu v&nbsp;rozvrhu ji vyberete — dostane červený rám a&nbsp;ostatní varianty
        téže volby z&nbsp;rozvrhu zmizí. Vybrané hodiny a&nbsp;hodiny bez alternativy se nikdy
        neskrývají. <b>Zobrazit jen vybrané</b> navíc skryje varianty, které jste zatím nerozhodli;
        kliknutí na název předmětu skryje jen jeho nerozhodnuté varianty.
      </>
    ),
    picked: 'vybráno',
    notPicked: 'nevybráno',
    lectureOnly: 'není z čeho vybírat',
    variantsToPick: (n: number) => `${n} variant na výběr`,
    unpickHint: 'Kliknutím zrušíte výběr',
    hideCourse: 'Skrýt nerozhodnuté varianty tohoto předmětu',
    nothingToPick: 'Tento předmět nemá co vybírat',
    legendLecture: 'pevná — pokud předmět nemá víc variant',
    legendSeminar: 'varianta — klikněte pro výběr',
    legendWeek: 'probíhá každý druhý týden',
    legendPicked: 'červený rám = váš výběr',
    notesTitle: 'Poznámky',
    clickPick: 'Kliknutím vyberete',
    clickUnpick: 'Kliknutím zrušíte výběr',
    lectureFixed: 'Bez alternativy — vždy zobrazeno',
    weeksOnly: (w: string) => `pouze ${w}`,
    theme: { system: 'Podle systému', light: 'Světlý režim', dark: 'Tmavý režim' },
    themeHint: 'Přepnout světlý/tmavý režim',
    replace: 'Nahradit rozvrh',
    forget: 'Smazat data',
    forgetConfirm: 'Opravdu smazat uložený rozvrh z tohoto prohlížeče?',
    importTitle: 'Načtěte svůj rozvrh',
    privacy:
      'Rozvrh se zpracuje přímo ve vašem prohlížeči a uloží se jen do něj (localStorage). Nikam se neodesílá a nikam se neukládá na server.',
    steps: 'Postup',
    step1: 'V UIS otevřete Zobrazení a tisk rozvrhů (formát HTML).',
    step2: 'Otevřete konzoli prohlížeče (⌥⌘J / F12) a spusťte:',
    copy: 'Kopírovat příkaz',
    copied: 'Zkopírováno',
    step3: 'Vložte zkopírovaný obsah níže, nebo sem přetáhněte uloženou stránku (.html).',
    paste: 'Sem vložte HTML stránky rozvrhu…',
    load: 'Načíst rozvrh',
    dropHere: 'Pusťte soubor .html',
    errNoTimetable: 'V vloženém obsahu není rozvrhová tabulka. Zkopírovali jste celou stránku rozvrhu?',
    errEmpty: 'Nejdřív vložte obsah stránky.',
    errGeneric: 'Obsah se nepodařilo zpracovat.',
    loaded: (n: number) => `Načteno ${n} hodin.`,
  },
  en: {
    kind: { lecture: 'lecture', seminar: 'seminar' },
    week: { odd: 'odd week', even: 'even week' },
    weekShort: { odd: 'odd', even: 'even' },
    validity: 'Validity',
    lastChange: 'Last change',
    lessons: (shown: number, total: number) => `${shown} of ${total} lessons`,
    choicesPicked: (done: number, total: number) => `${done} of ${total} choices picked`,
    showPicked: 'Show picked only',
    showingPicked: 'Showing picked only',
    clearPicks: 'clear picks',
    hint: (
      <>
        Click any lesson in the grid to pick it — it gets a red outline and the other variants of the
        same choice drop off the grid. Picks and lessons without alternatives are never filtered out.{' '}
        <b>Show picked only</b> additionally hides the variants you have not decided yet; clicking a
        course name hides that one course&rsquo;s undecided variants.
      </>
    ),
    picked: 'picked',
    notPicked: 'not picked',
    lectureOnly: 'nothing to choose',
    variantsToPick: (n: number) => `${n} variants to choose from`,
    unpickHint: 'Click to unpick',
    hideCourse: 'Hide this course’s undecided variants',
    nothingToPick: 'Nothing to choose for this course',
    legendLecture: 'fixed — unless the course offers several',
    legendSeminar: 'variant — click to pick',
    legendWeek: 'run every other week',
    legendPicked: 'red outline = picked by you',
    notesTitle: 'Notes',
    clickPick: 'Click to pick',
    clickUnpick: 'Click to unpick',
    lectureFixed: 'No alternatives — always shown',
    weeksOnly: (w: string) => `${w} only`,
    theme: { system: 'System theme', light: 'Light mode', dark: 'Dark mode' },
    themeHint: 'Switch light/dark mode',
    replace: 'Replace timetable',
    forget: 'Delete data',
    forgetConfirm: 'Delete the stored timetable from this browser?',
    importTitle: 'Load your timetable',
    privacy:
      'The timetable is parsed in your browser and stored only there (localStorage). Nothing is uploaded and nothing is kept on a server.',
    steps: 'Steps',
    step1: 'In UIS open Display and print the course weekly plan (HTML format).',
    step2: 'Open the browser console (⌥⌘J / F12) and run:',
    copy: 'Copy command',
    copied: 'Copied',
    step3: 'Paste what you copied below, or drop the saved page (.html) here.',
    paste: 'Paste the timetable page HTML here…',
    load: 'Load timetable',
    dropHere: 'Drop the .html file',
    errNoTimetable: 'No timetable table in the pasted content. Did you copy the whole timetable page?',
    errEmpty: 'Paste the page content first.',
    errGeneric: 'Could not parse the content.',
    loaded: (n: number) => `Loaded ${n} lessons.`,
  },
}

type Strings = (typeof STRINGS)['cs']

const CONSOLE_SNIPPET = 'copy(document.documentElement.outerHTML)'

const browserLang = (): 'cs' | 'en' =>
  typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en'

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

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private window) — everything still works this session
  }
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

function ImportScreen({
  t,
  theme,
  setTheme,
  onLoaded,
  onCancel,
}: {
  t: Strings
  theme: Theme
  setTheme: (v: Theme) => void
  onLoaded: (schedule: Schedule) => void
  onCancel?: () => void
}) {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
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

  const [picked, setPicked] = useState<string[]>(() => loadStored<string[]>(PICKS_KEY, []))
  const [pickedOnly, setPickedOnly] = useState(false)
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set())

  useEffect(() => store(PICKS_KEY, picked), [picked])

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
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
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
          <button className="chip" onClick={() => setPicked([])} disabled={picked.length === 0}>
            {t.clearPicks}
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
  const [theme, setTheme] = useTheme()

  const t = STRINGS[schedule?.lang ?? browserLang()]

  if (!schedule || importing) {
    return (
      <ImportScreen
        t={t}
        theme={theme}
        setTheme={setTheme}
        onCancel={schedule ? () => setImporting(false) : undefined}
        onLoaded={(next) => {
          store(DATA_KEY, next)
          setSchedule(next)
          setImporting(false)
        }}
      />
    )
  }

  return (
    <ScheduleView
      schedule={schedule}
      t={t}
      theme={theme}
      setTheme={setTheme}
      onReimport={() => setImporting(true)}
      onForget={() => {
        try {
          localStorage.removeItem(DATA_KEY)
          localStorage.removeItem(PICKS_KEY)
        } catch {
          // nothing to clean up when storage is unavailable
        }
        setSchedule(null)
      }}
    />
  )
}
