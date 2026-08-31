// Parses a UIS (is.mendelu.cz) weekly timetable page into structured data.
//
// The page lives behind a login, so it cannot be fetched: the student pastes
// the rendered HTML instead and this runs in their browser. Nothing is sent
// anywhere — the result is kept in localStorage only.
//
// The UIS table is a fixed-width grid: one leading "day" cell, then each hour
// block occupies 10 column units followed by a 2-unit gap. A lesson cell with
// colspan=22 therefore covers two consecutive hours. Empty cells are 1 unit
// each, so the running sum of colspans gives the position of every lesson.

export type Lesson = {
  day: string
  dayIndex: number
  startIndex: number
  span: number
  start: string
  end: string
  type: 'lecture' | 'seminar'
  room: string
  group: string
  course: string
  courseId: string
  teacher: string
  notes: number[]
  week: 'even' | 'odd' | null
}

export type Schedule = {
  lang: 'cs' | 'en'
  student: string
  validity: string
  lastChange: string
  hours: string[]
  notes: Record<string, string>
  events: Lesson[]
}

export class ParseError extends Error {}

function decode(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const colspanOf = (attrs: string) => parseInt(attrs.match(/colspan="(\d+)"/)?.[1] ?? '1', 10)
const cellRe = /<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/g

export function parseSchedule(html: string): Schedule {
  const anchor = html.indexOf('zahlavi zahlavi-int')
  if (anchor === -1) {
    throw new ParseError('no-timetable')
  }
  const table = html.slice(html.lastIndexOf('<table', anchor), html.indexOf('</table>', anchor))

  // --- header: map every column unit to an hour index ----------------------

  const headMatch = table.match(/<tr[^>]*class="[^"]*zahlavi-int[^"]*"[^>]*>([\s\S]*?)<\/tr>/)
  if (!headMatch) throw new ParseError('no-header')

  const hours: string[] = []
  const unitHour: number[] = [] // column unit -> hour index (-1 for the gaps)
  {
    let offset = 0
    let first = true
    for (const [, attrs, body] of headMatch[1].matchAll(cellRe)) {
      const span = colspanOf(attrs)
      const label = decode(body)
      if (first) {
        first = false // the "Day" column
        continue
      }
      const hour = label ? hours.push(label) - 1 : -1
      for (let i = 0; i < span; i++) unitHour[offset + i] = hour
      offset += span
    }
  }

  const hourAt = (unit: number) => {
    for (let u = unit; u >= 0; u--) if (unitHour[u] >= 0) return unitHour[u]
    return 0
  }
  const startTime = (i: number) => hours[i].split('-')[0].replace('.', ':')
  const endTime = (i: number) => hours[i].split('-')[1].replace('.', ':')

  // --- body rows -----------------------------------------------------------

  const events: Lesson[] = []
  let day: string | null = null
  let dayIndex = -1

  for (const [, rowAttrs, rowBody] of [...table.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)].slice(1)) {
    if (/rozvrh-sep/.test(rowAttrs)) continue

    let offset = 0
    let first = true

    for (const [, attrs, body] of rowBody.matchAll(cellRe)) {
      const span = colspanOf(attrs)

      if (first) {
        first = false
        const label = decode(body)
        if (label) {
          day = label
          dayIndex += 1
        }
        continue
      }

      const type = /rozvrh-pred/.test(attrs)
        ? ('lecture' as const)
        : /rozvrh-cvic/.test(attrs)
          ? ('seminar' as const)
          : null

      if (type && day) {
        const from = hourAt(offset)
        const to = hourAt(offset + span - 1)

        const room = body.match(/<a href="\.\.\/mistnosti\/[^"]*">([\s\S]*?)<\/a>/)?.[1] ?? ''
        const course = body.match(
          /<a href="\.\.\/katalog\/syllabus\.pl\?predmet=(\d+)[^"]*">([\s\S]*?)<\/a>/,
        )
        const teacher = body.match(/<i>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/i>/)?.[1] ?? ''
        const notes = body.match(/<sup>\(([\d,\s]+)\)<\/sup>/)?.[1] ?? ''

        // the group restriction sits between the room link and the first <br>
        const afterRoom = body.slice(body.indexOf('</a>') + 4)
        const group = decode(afterRoom.slice(0, afterRoom.search(/<br\s*\/?>/i)))
          .replace(/^\/\s*/, '')
          .trim()

        events.push({
          day,
          dayIndex,
          startIndex: from,
          span: to - from + 1,
          start: startTime(from),
          end: endTime(to),
          type,
          room: decode(room),
          group,
          course: decode(course?.[2] ?? ''),
          courseId: course?.[1] ?? '',
          teacher: decode(teacher),
          notes: notes ? notes.split(',').map((n) => parseInt(n.trim(), 10)) : [],
          week: null,
        })
      }

      offset += span
    }
  }

  if (events.length === 0) throw new ParseError('no-lessons')

  // --- notes, validity, student -------------------------------------------

  const notes: Record<string, string> = {}
  const notesAnchor = html.search(/(Notes|Poznámky):/)
  if (notesAnchor !== -1) {
    const start = html.indexOf('<table', notesAnchor)
    const notesTable = html.slice(start, html.indexOf('</table>', start))
    for (const [, n, text] of notesTable.matchAll(
      /<td[^>]*>\((\d+)\)<\/td><td[^>]*>([\s\S]*?)<\/td>/g,
    )) {
      notes[n] = decode(text)
    }
  }

  // Lessons that run every other week carry a footnote saying so; resolve each
  // lesson's footnote numbers to a week parity, since numbering is per-page.
  for (const lesson of events) {
    const text = lesson.notes.map((n) => notes[n] ?? '').join(' ')
    lesson.week = /odd week|lich(ý|y) t(ý|y)den/i.test(text)
      ? 'odd'
      : /even week|sud(ý|y) t(ý|y)den/i.test(text)
        ? 'even'
        : null
  }

  return {
    lang: /name="lang" content="cs"/.test(html) ? 'cs' : 'en',
    student: decode(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ''),
    validity: decode(html.match(/(?:Validity|Platnost):\s*([^<]*)/)?.[1] ?? ''),
    lastChange: decode(html.match(/(?:Last change|Poslední změna):\s*([^<]*)/)?.[1] ?? ''),
    hours,
    notes,
    events,
  }
}
